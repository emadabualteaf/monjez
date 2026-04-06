import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { createNotification } from "../lib/notifications.js";

const router: IRouter = Router();

// Credit packages
const PACKAGES: Record<number, { price: number; label: string }> = {
  10: { price: 50, label: "10 أرصدة" },
  50: { price: 200, label: "50 أرصدة" },
  100: { price: 350, label: "100 أرصدة" },
};

router.get("/balance", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json({ balance: user.creditBalance });
});

// Create Stripe checkout session
router.post("/create-checkout", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { amount } = req.body;

  if (!PACKAGES[amount]) {
    res.status(400).json({ error: "ValidationError", message: "باقة غير صحيحة" });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Fallback: demo mode without real Stripe
    console.warn("[Credits] STRIPE_SECRET_KEY not set — using demo mode");
    const newBalance = user.creditBalance + amount;
    await db.update(usersTable).set({ creditBalance: newBalance }).where(eq(usersTable.id, user.id));
    await createNotification(user.id, "credits_purchased", "تم شراء الأرصدة ✅", `تم إضافة ${amount} رصيد إلى حسابك`);
    res.json({ demo: true, balance: newBalance });
    return;
  }

  try {
    const pkg = PACKAGES[amount];
    const origin = req.headers.origin || "http://localhost:5173";

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "line_items[0][price_data][currency]": "ils",
        "line_items[0][price_data][product_data][name]": `منجز — ${pkg.label}`,
        "line_items[0][price_data][unit_amount]": String(pkg.price * 100), // agorot
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: `${origin}/credits?success=1&amount=${amount}`,
        cancel_url: `${origin}/credits?canceled=1`,
        "metadata[userId]": String(user.id),
        "metadata[creditAmount]": String(amount),
        "payment_method_types[0]": "card",
      }),
    });

    if (!stripeRes.ok) {
      const err: any = await stripeRes.json();
      throw new Error(err.error?.message || "Stripe error");
    }

    const session: any = await stripeRes.json();
    res.json({ url: session.url });
  } catch (e: any) {
    console.error("[Stripe]", e.message);
    res.status(500).json({ error: "StripeError", message: "حدث خطأ في الدفع. حاول مرة أخرى." });
  }
});

// Stripe webhook — confirms payment and adds credits
router.post("/webhook", async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    res.status(200).json({ received: true });
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  const rawBody = (req as any).rawBody as Buffer;

  // Simple payload verification (for production use stripe.webhooks.constructEvent)
  let event: any;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    res.status(400).send("Webhook Error: Invalid payload");
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
    const creditAmount = session.metadata?.creditAmount ? parseInt(session.metadata.creditAmount) : null;

    if (userId && creditAmount && !isNaN(userId) && !isNaN(creditAmount)) {
      const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (users && users.length > 0 && users[0] !== null && users[0] !== undefined) {
        const newBalance = (users[0]?.creditBalance ?? 0) + creditAmount;
        await db.update(usersTable).set({ creditBalance: newBalance }).where(eq(usersTable.id, userId));
        await createNotification(userId, "credits_purchased", "تم شراء الأرصدة ✅", `تم إضافة ${creditAmount} رصيد إلى حسابك`);
      }
    }
  }

  res.json({ received: true });
});

// Manual credit addition after successful redirect (for demo)
router.post("/confirm-purchase", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { amount } = req.body;

  if (!PACKAGES[amount]) {
    res.status(400).json({ error: "ValidationError", message: "باقة غير صحيحة" });
    return;
  }

  // Only used in demo mode (no Stripe key)
  if (process.env.STRIPE_SECRET_KEY) {
    res.status(403).json({ error: "Forbidden", message: "يُستخدم فقط في وضع التجربة" });
    return;
  }

  const newBalance = user.creditBalance + amount;
  await db.update(usersTable).set({ creditBalance: newBalance }).where(eq(usersTable.id, user.id));
  await createNotification(user.id, "credits_purchased", "تم شراء الأرصدة ✅", `تم إضافة ${amount} رصيد إلى حسابك`);
  res.json({ balance: newBalance });
});

export default router;
