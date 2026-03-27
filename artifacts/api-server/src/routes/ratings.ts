import { Router, type IRouter } from "express";
import { db, ratingsTable, usersTable, jobsTable } from "@workspace/db";
import { eq, and, avg } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { SubmitRatingBody as SubmitRatingBodySchema } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/", requireAuth, async (req, res) => {
  const parsed = SubmitRatingBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const user = (req as any).user;
  const { jobId, rateeId, score, comment } = parsed.data;

  const existing = await db.select().from(ratingsTable)
    .where(and(eq(ratingsTable.jobId, jobId), eq(ratingsTable.raterId, user.id), eq(ratingsTable.rateeId, rateeId))).limit(1);
  if (existing.length) {
    res.status(409).json({ error: "Conflict", message: "Already rated this user for this job" });
    return;
  }

  const [rating] = await db.insert(ratingsTable).values({
    jobId,
    raterId: user.id,
    rateeId,
    score,
    comment: comment ?? null,
  }).returning();

  const avgResult = await db.select({ avg: avg(ratingsTable.score) }).from(ratingsTable).where(eq(ratingsTable.rateeId, rateeId));
  const newTrust = avgResult[0]?.avg ? parseFloat(String(avgResult[0].avg)) : null;
  if (newTrust !== null) {
    await db.update(usersTable).set({ trustScore: newTrust }).where(eq(usersTable.id, rateeId));
  }

  res.status(201).json(rating);
});

export default router;
