import { Router, type IRouter } from "express";
import { db, applicationsTable, jobsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { createNotification } from "../lib/notifications.js";

const router: IRouter = Router();

const REVEAL_COST = 1;

async function formatApplication(app: any, revealPhone = false) {
  const worker = await db
    .select({ id: usersTable.id, name: usersTable.name, trustScore: usersTable.trustScore, city: usersTable.city, phone: usersTable.phone })
    .from(usersTable)
    .where(eq(usersTable.id, app.workerId))
    .limit(1);
  const job = await db
    .select({ id: jobsTable.id, title: jobsTable.title, city: jobsTable.city, salary: jobsTable.salary, salaryType: jobsTable.salaryType })
    .from(jobsTable)
    .where(eq(jobsTable.id, app.jobId))
    .limit(1);
  const w = worker[0];
  return {
    id: app.id,
    jobId: app.jobId,
    jobTitle: job[0]?.title ?? `وظيفة #${app.jobId}`,
    jobCity: job[0]?.city ?? "",
    jobSalary: job[0]?.salary ?? 0,
    jobSalaryType: job[0]?.salaryType ?? "daily",
    worker: { id: w.id, name: w.name, trustScore: w.trustScore ?? null, city: w.city ?? null },
    status: app.status,
    contactRevealed: app.contactRevealed,
    phone: app.contactRevealed || revealPhone ? w.phone : null,
    appliedAt: app.appliedAt,
  };
}

// Worker applies to a job
router.post("/:jobId/applications", requireAuth, requireRole("worker"), async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const user = (req as any).user;

  const existing = await db
    .select()
    .from(applicationsTable)
    .where(and(eq(applicationsTable.jobId, jobId), eq(applicationsTable.workerId, user.id)))
    .limit(1);
  if (existing.length) {
    res.status(409).json({ error: "Conflict", message: "لقد تقدمت لهذه الوظيفة مسبقاً" });
    return;
  }

  const job = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job.length) {
    res.status(404).json({ error: "NotFound", message: "الوظيفة غير موجودة" });
    return;
  }

  const [app] = await db.insert(applicationsTable).values({ jobId, workerId: user.id }).returning();

  // Notify employer
  await createNotification(
    job[0].employerId,
    "application_received",
    "طلب توظيف جديد",
    `${user.name} تقدّم لوظيفة "${job[0].title}"`,
    { jobId, applicationId: app.id }
  );

  res.status(201).json(await formatApplication(app));
});

// Employer views job applicants
router.get("/:jobId/applications", requireAuth, requireRole("employer"), async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const user = (req as any).user;

  const job = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.employerId, user.id)))
    .limit(1);
  if (!job.length) {
    res.status(404).json({ error: "NotFound", message: "الوظيفة غير موجودة" });
    return;
  }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.jobId, jobId));
  const formatted = await Promise.all(apps.map((a) => formatApplication(a)));
  res.json({ applications: formatted, total: apps.length });
});

// Worker views own applications
router.get("/my", requireAuth, requireRole("worker"), async (req, res) => {
  const user = (req as any).user;
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.workerId, user.id));
  const formatted = await Promise.all(apps.map((a) => formatApplication(a)));
  res.json({ applications: formatted, total: apps.length });
});

// Employer accepts or rejects an application
router.patch("/:applicationId/status", requireAuth, requireRole("employer"), async (req, res) => {
  const applicationId = parseInt(String(req.params.applicationId));
  const user = (req as any).user;
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "ValidationError", message: "الحالة يجب أن تكون accepted أو rejected" });
    return;
  }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.id, applicationId)).limit(1);
  if (!apps.length) {
    res.status(404).json({ error: "NotFound", message: "الطلب غير موجود" });
    return;
  }
  const app = apps[0];

  // Ensure employer owns the job
  const job = await db.select().from(jobsTable).where(and(eq(jobsTable.id, app.jobId), eq(jobsTable.employerId, user.id))).limit(1);
  if (!job.length) {
    res.status(403).json({ error: "Forbidden", message: "ليس لديك صلاحية" });
    return;
  }

  const [updated] = await db.update(applicationsTable).set({ status }).where(eq(applicationsTable.id, applicationId)).returning();

  // Notify worker
  const notifTitle = status === "accepted" ? "تم قبول طلبك! 🎉" : "تم رفض طلبك";
  const notifBody =
    status === "accepted"
      ? `تم قبولك في وظيفة "${job[0].title}" من قِبل ${user.name}`
      : `تم رفض طلبك في وظيفة "${job[0].title}"`;
  await createNotification(app.workerId, status === "accepted" ? "application_accepted" : "application_rejected", notifTitle, notifBody, {
    jobId: app.jobId,
    applicationId: app.id,
  });

  res.json(await formatApplication(updated));
});

// Employer reveals worker contact (costs 1 credit)
router.post("/:applicationId/reveal-contact", requireAuth, requireRole("employer"), async (req, res) => {
  const applicationId = parseInt(String(req.params.applicationId));
  const user = (req as any).user;

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.id, applicationId)).limit(1);
  if (!apps.length) {
    res.status(404).json({ error: "NotFound", message: "الطلب غير موجود" });
    return;
  }
  const app = apps[0];

  if (app.contactRevealed) {
    const worker = await db.select({ phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, app.workerId)).limit(1);
    res.json({ phone: worker[0]?.phone ?? "", creditBalance: user.creditBalance });
    return;
  }

  if (user.creditBalance < REVEAL_COST) {
    res.status(402).json({ error: "InsufficientCredits", message: `تحتاج ${REVEAL_COST} رصيد لكشف رقم الهاتف` });
    return;
  }

  await db.update(usersTable).set({ creditBalance: user.creditBalance - REVEAL_COST }).where(eq(usersTable.id, user.id));
  await db.update(applicationsTable).set({ contactRevealed: true }).where(eq(applicationsTable.id, applicationId));

  const worker = await db.select({ phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, app.workerId)).limit(1);
  const job = await db.select({ title: jobsTable.title }).from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);

  // Notify worker
  await createNotification(app.workerId, "contact_revealed", "اهتمام بطلبك", `${user.name} اطّلع على رقم هاتفك لوظيفة "${job[0]?.title}"`, {
    jobId: app.jobId,
    applicationId: app.id,
  });

  res.json({ phone: worker[0]?.phone ?? "", creditBalance: user.creditBalance - REVEAL_COST });
});

export default router;
