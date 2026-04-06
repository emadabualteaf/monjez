import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// Get notifications for current user
router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  res.json({ notifications, unreadCount });
});

// Mark one notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ ok: true });
});

// Mark all notifications as read
router.patch("/read-all", requireAuth, async (req, res) => {
  const user = (req as any).user;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));
  res.json({ ok: true });
});

export default router;
