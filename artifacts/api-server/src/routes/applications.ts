import { Router, type IRouter } from "express";
import { db, applicationsTable, jobsTable, usersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router: IRouter = Router();

const REVEAL_COST = 1;

async function formatApplication(app: any, revealPhone = false) {
  const worker = await db.select({ id: usersTable.id, name: usersTable.name, trustScore: usersTable.trustScore, city: usersTable.city, phone: usersTable.phone })
    .from(usersTable).where(eq(usersTable.id, app.workerId)).limit(1);
  const w = worker[0];
  return {
    id: app.id,
    jobId: app.jobId,
    worker: { id: w.id, name: w.name, trustScore: w.trustScore ?? null, city: w.city ?? null },
    status: app.status,
    contactRevealed: app.contactRevealed,
    phone: (app.contactRevealed || revealPhone) ? w.phone : null,
    appliedAt: app.appliedAt,
  };
}

router.post("/:jobId/applications", requireAuth, requireRole("worker"), async (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const user = (req as any).user;

  const existing = await db.select().from(applicationsTable)
    .where(and(eq(applicationsTable.jobId, jobId), eq(applicationsTable.workerId, user.id))).limit(1);
  if (existing.length) {
    res.status(409).json({ error: "Conflict", message: "Already applied to this job" });
    return;
  }

  const [app] = await db.insert(applicationsTable).values({
    jobId,
    workerId: user.id,
  }).returning();

  res.status(201).json(await formatApplication(app));
});

router.get("/:jobId/applications", requireAuth, requireRole("employer"), async (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const user = (req as any).user;

  const job = await db.select().from(jobsTable).where(and(eq(jobsTable.id, jobId), eq(jobsTable.employerId, user.id))).limit(1);
  if (!job.length) {
    res.status(404).json({ error: "NotFound", message: "Job not found" });
    return;
  }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.jobId, jobId));
  const formatted = await Promise.all(apps.map(a => formatApplication(a)));
  res.json({ applications: formatted, total: apps.length });
});

router.get("/my", requireAuth, requireRole("worker"), async (req, res) => {
  const user = (req as any).user;
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.workerId, user.id));
  const formatted = await Promise.all(apps.map(a => formatApplication(a)));
  res.json({ applications: formatted, total: apps.length });
});

router.post("/:applicationId/reveal-contact", requireAuth, requireRole("employer"), async (req, res) => {
  const applicationId = parseInt(req.params.applicationId);
  const user = (req as any).user;

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.id, applicationId)).limit(1);
  if (!apps.length) {
    res.status(404).json({ error: "NotFound", message: "Application not found" });
    return;
  }
  const app = apps[0];

  if (app.contactRevealed) {
    const worker = await db.select({ phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, app.workerId)).limit(1);
    res.json({ phone: worker[0]?.phone ?? "", creditBalance: user.creditBalance });
    return;
  }

  if (user.creditBalance < REVEAL_COST) {
    res.status(402).json({ error: "InsufficientCredits", message: `You need ${REVEAL_COST} credit to reveal contact` });
    return;
  }

  await db.update(usersTable).set({ creditBalance: user.creditBalance - REVEAL_COST }).where(eq(usersTable.id, user.id));
  await db.update(applicationsTable).set({ contactRevealed: true }).where(eq(applicationsTable.id, applicationId));

  const worker = await db.select({ phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, app.workerId)).limit(1);
  res.json({ phone: worker[0]?.phone ?? "", creditBalance: user.creditBalance - REVEAL_COST });
});

export default router;
