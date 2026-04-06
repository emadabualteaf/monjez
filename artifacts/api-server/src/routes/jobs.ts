import { Router, type IRouter } from "express";
import { db, jobsTable, usersTable, applicationsTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { CreateJobBody as CreateJobBodySchema, UpdateJobBody as UpdateJobBodySchema } from "@workspace/api-zod";

const router: IRouter = Router();

const BOOST_COST = 3;

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function formatJob(job: any, lat?: number, lng?: number) {
  const employer = await db.select({ id: usersTable.id, name: usersTable.name, trustScore: usersTable.trustScore, city: usersTable.city })
    .from(usersTable).where(eq(usersTable.id, job.employerId)).limit(1);
  const appCount = await db.select({ count: count() }).from(applicationsTable).where(eq(applicationsTable.jobId, job.id));
  const distance = (lat && lng && job.lat && job.lng)
    ? calcDistance(lat, lng, job.lat, job.lng)
    : null;
  return {
    ...job,
    employer: employer[0] ?? { id: job.employerId, name: "Unknown", trustScore: null, city: null },
    applicantCount: appCount[0]?.count ?? 0,
    distance,
  };
}

router.get("/", async (req, res) => {
  const lat = req.query.lat && typeof req.query.lat === 'string' ? parseFloat(req.query.lat) : undefined;
  const lng = req.query.lng && typeof req.query.lng === 'string' ? parseFloat(req.query.lng) : undefined;
  const limit = parseInt(typeof req.query.limit === 'string' ? req.query.limit : "20");
  const offset = parseInt(typeof req.query.offset === 'string' ? req.query.offset : "0");

  const jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.status, "open"))
    .orderBy(desc(jobsTable.isBoosted), desc(jobsTable.createdAt))
    .limit(limit).offset(offset);

  const total = await db.select({ count: count() }).from(jobsTable).where(eq(jobsTable.status, "open"));

  const formatted = await Promise.all(jobs.map(j => formatJob(j, lat, lng)));

  if (lat && lng) {
    formatted.sort((a, b) => {
      if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return 0;
    });
  }

  res.json({ jobs: formatted, total: total[0]?.count ?? 0 });
});

router.post("/", requireAuth, requireRole("employer"), async (req, res) => {
  const parsed = CreateJobBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const user = (req as any).user;
  if (!user.phoneVerified) {
    res.status(403).json({ error: "PhoneNotVerified", message: "يجب التحقق من رقم الهاتف أولاً / יש לאמת את מספר הטלפון תחילה" });
    return;
  }
  const [job] = await db.insert(jobsTable).values({
    ...parsed.data,
    employerId: user.id,
    lat: parsed.data.lat ?? null,
    lng: parsed.data.lng ?? null,
    description: parsed.data.description ?? null,
    jobDate: parsed.data.jobDate ?? null,
  }).returning();

  res.status(201).json(await formatJob(job));
});

router.get("/:jobId", async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!jobs.length) {
    res.status(404).json({ error: "NotFound", message: "Job not found" });
    return;
  }
  res.json(await formatJob(jobs[0]));
});

router.patch("/:jobId", requireAuth, requireRole("employer"), async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const user = (req as any).user;
  const parsed = UpdateJobBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const jobs = await db.select().from(jobsTable).where(and(eq(jobsTable.id, jobId), eq(jobsTable.employerId, user.id))).limit(1);
  if (!jobs.length) {
    res.status(404).json({ error: "NotFound", message: "Job not found" });
    return;
  }
  const updates: Record<string, any> = {};
  const d = parsed.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.location !== undefined) updates.location = d.location;
  if (d.city !== undefined) updates.city = d.city;
  if (d.salary !== undefined) updates.salary = d.salary;
  if (d.salaryType !== undefined) updates.salaryType = d.salaryType;
  if (d.jobDate !== undefined) updates.jobDate = d.jobDate;
  if (d.status !== undefined) updates.status = d.status;

  const [updated] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, jobId)).returning();
  res.json(await formatJob(updated));
});

router.post("/:jobId/boost", requireAuth, requireRole("employer"), async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const user = (req as any).user;

  if (user.creditBalance < BOOST_COST) {
    res.status(402).json({ error: "InsufficientCredits", message: `You need ${BOOST_COST} credits to boost a job` });
    return;
  }

  const jobs = await db.select().from(jobsTable).where(and(eq(jobsTable.id, jobId), eq(jobsTable.employerId, user.id))).limit(1);
  if (!jobs.length) {
    res.status(404).json({ error: "NotFound", message: "Job not found" });
    return;
  }

  await db.update(usersTable).set({ creditBalance: user.creditBalance - BOOST_COST }).where(eq(usersTable.id, user.id));
  const boostedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const [updated] = await db.update(jobsTable).set({ isBoosted: true, boostedUntil }).where(eq(jobsTable.id, jobId)).returning();
  res.json(await formatJob(updated));
});

export default router;
