import { Router, type IRouter } from "express";
import { db, reportsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { targetType, targetId, reason } = req.body;

  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: "ValidationError", message: "targetType, targetId and reason are required" });
    return;
  }
  if (!["job", "user"].includes(targetType)) {
    res.status(400).json({ error: "ValidationError", message: "targetType must be 'job' or 'user'" });
    return;
  }

  const [report] = await db.insert(reportsTable).values({
    reporterId: user.id,
    targetType,
    targetId: parseInt(targetId),
    reason,
  }).returning();

  res.status(201).json(report);
});

export default router;
