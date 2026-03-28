import { Router, type IRouter } from "express";
import { db, usersTable, jobsTable, applicationsTable, reportsTable, bansTable } from "@workspace/db";
import { eq, desc, count, sum, and, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

const ADMIN_PHONES = (process.env.ADMIN_PHONES ?? "").split(",").map(p => p.trim()).filter(Boolean);

function requireAdmin(req: any, res: any, next: any) {
  const user = req.user;
  if (!user || !ADMIN_PHONES.includes(user.phone)) {
    res.status(403).json({ error: "Forbidden", message: "ليس لديك صلاحيات الوصول / אין לך הרשאות גישה" });
    return;
  }
  next();
}

// Stats / Revenue Dashboard
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  const totalUsers = await db.select({ count: count() }).from(usersTable);
  const totalJobs = await db.select({ count: count() }).from(jobsTable);
  const totalApps = await db.select({ count: count() }).from(applicationsTable);
  const boostedJobs = await db.select({ count: count() }).from(jobsTable).where(eq(jobsTable.isBoosted, true));
  const pendingReports = await db.select({ count: count() }).from(reportsTable).where(eq(reportsTable.status, "pending"));
  const totalBans = await db.select({ count: count() }).from(bansTable);
  const workers = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "worker"));
  const employers = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "employer"));

  res.json({
    totalUsers: totalUsers[0]?.count ?? 0,
    totalWorkers: workers[0]?.count ?? 0,
    totalEmployers: employers[0]?.count ?? 0,
    totalJobs: totalJobs[0]?.count ?? 0,
    totalApplications: totalApps[0]?.count ?? 0,
    boostedJobs: boostedJobs[0]?.count ?? 0,
    pendingReports: pendingReports[0]?.count ?? 0,
    totalBans: totalBans[0]?.count ?? 0,
    estimatedRevenue: (boostedJobs[0]?.count ?? 0) * 3 * 5,
  });
});

// User Management
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const search = req.query.search as string | undefined;
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    phone: usersTable.phone,
    role: usersTable.role,
    city: usersTable.city,
    israeliId: usersTable.israeliId,
    businessId: usersTable.businessId,
    phoneVerified: usersTable.phoneVerified,
    creditBalance: usersTable.creditBalance,
    trustScore: usersTable.trustScore,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100);

  const filtered = search
    ? users.filter(u =>
      u.name.includes(search) ||
      u.phone.includes(search) ||
      u.city?.includes(search) ||
      (u.israeliId ?? '').includes(search)
    )
    : users;

  res.json({ users: filtered, total: filtered.length });
});

router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    phone: usersTable.phone,
    role: usersTable.role,
    city: usersTable.city,
    israeliId: usersTable.israeliId,
    businessId: usersTable.businessId,
    phoneVerified: usersTable.phoneVerified,
    creditBalance: usersTable.creditBalance,
    trustScore: usersTable.trustScore,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!users.length) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const userJobs = await db.select().from(jobsTable).where(eq(jobsTable.employerId, userId));
  const userApps = await db.select({ count: count() }).from(applicationsTable).where(eq(applicationsTable.workerId, userId));
  res.json({ user: users[0], jobs: userJobs, applicationCount: userApps[0]?.count ?? 0 });
});

router.patch("/users/:id/verify", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const [updated] = await db.update(usersTable)
    .set({ phoneVerified: true })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, phoneVerified: usersTable.phoneVerified });
  res.json(updated);
});

// Ban System
router.post("/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
  const admin = (req as any).user;
  const userId = parseInt(req.params.id);
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: "ValidationError", message: "Reason required" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users.length) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const user = users[0];
  await db.insert(bansTable).values({
    phone: user.phone,
    israeliId: user.israeliId ?? null,
    userId: user.id,
    reason,
    bannedBy: admin.id,
  });

  res.json({ success: true, message: "User banned" });
});

router.get("/bans", requireAuth, requireAdmin, async (req, res) => {
  const bans = await db.select().from(bansTable).orderBy(desc(bansTable.createdAt));
  res.json({ bans, total: bans.length });
});

router.delete("/bans/:id", requireAuth, requireAdmin, async (req, res) => {
  const banId = parseInt(req.params.id);
  await db.delete(bansTable).where(eq(bansTable.id, banId));
  res.json({ success: true });
});

// Job Moderation
router.get("/jobs", requireAuth, requireAdmin, async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt)).limit(100);
  res.json({ jobs, total: jobs.length });
});

router.delete("/jobs/:id", requireAuth, requireAdmin, async (req, res) => {
  const jobId = parseInt(req.params.id);
  await db.delete(applicationsTable).where(eq(applicationsTable.jobId, jobId));
  await db.delete(jobsTable).where(eq(jobsTable.id, jobId));
  res.json({ success: true });
});

router.patch("/jobs/:id", requireAuth, requireAdmin, async (req, res) => {
  const jobId = parseInt(req.params.id);
  const { title, description, status } = req.body;
  const updates: Record<string, any> = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (status) updates.status = status;
  const [updated] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, jobId)).returning();
  res.json(updated);
});

// Reports
router.get("/reports", requireAuth, requireAdmin, async (req, res) => {
  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt)).limit(100);
  res.json({ reports, total: reports.length });
});

router.patch("/reports/:id/resolve", requireAuth, requireAdmin, async (req, res) => {
  const reportId = parseInt(req.params.id);
  const [updated] = await db.update(reportsTable)
    .set({ status: "resolved" })
    .where(eq(reportsTable.id, reportId))
    .returning();
  res.json(updated);
});

export default router;
