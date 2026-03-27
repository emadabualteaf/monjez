import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { PurchaseCreditsBody as PurchaseCreditsBodySchema } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/balance", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json({ balance: user.creditBalance });
});

router.post("/purchase", requireAuth, async (req, res) => {
  const parsed = PurchaseCreditsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const user = (req as any).user;
  const { amount } = parsed.data;
  const newBalance = user.creditBalance + amount;
  await db.update(usersTable).set({ creditBalance: newBalance }).where(eq(usersTable.id, user.id));
  res.json({ balance: newBalance });
});

export default router;
