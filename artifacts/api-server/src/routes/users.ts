import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";
import { RegisterUserBody as RegisterUserBodySchema, LoginUserBody as LoginUserBodySchema, UpdateMeBody as UpdateProfileBodySchema } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  const parsed = RegisterUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const { name, phone, password, role, city, bio } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Conflict", message: "Phone already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name, phone, passwordHash, role,
    city: city ?? null,
    bio: bio ?? null,
    creditBalance: role === "employer" ? 10 : 0,
  }).returning();

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ ...safeUser, trustScore: null });
});

router.post("/login", async (req, res) => {
  const parsed = LoginUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const { phone, password } = parsed.data;

  const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (!users.length) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const user = users[0];
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: { ...safeUser, trustScore: user.trustScore ?? null }, token });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, trustScore: user.trustScore ?? null });
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const user = (req as any).user;
  const updates: Record<string, any> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.city !== undefined) updates.city = parsed.data.city;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  const { passwordHash: _, ...safeUser } = updated;
  res.json({ ...safeUser, trustScore: updated.trustScore ?? null });
});

export default router;
