import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, bansTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";
import {
  RegisterUserBody as RegisterUserBodySchema,
  LoginUserBody as LoginUserBodySchema,
  UpdateMeBody as UpdateProfileBodySchema,
  VerifyOtpBody as VerifyOtpBodySchema,
} from "@workspace/api-zod";

const router: IRouter = Router();

function validateIsraeliId(id: string): boolean {
  const padded = id.padStart(9, "0");
  if (padded.length !== 9 || !/^\d+$/.test(padded)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(padded[i]) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

function validateBusinessId(id: string): boolean {
  return validateIsraeliId(id);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Twilio
async function sendSmsOtp(phone: string, otp: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(`[OTP] Twilio not configured — OTP for ${phone}: ${otp}`);
    return false; // demo mode
  }

  // Normalize Israeli number to E.164 format
  let normalizedPhone = phone.replace(/\s+/g, "");
  if (normalizedPhone.startsWith("0")) {
    normalizedPhone = "+972" + normalizedPhone.slice(1);
  } else if (!normalizedPhone.startsWith("+")) {
    normalizedPhone = "+972" + normalizedPhone;
  }

  try {
    const body = new URLSearchParams({
      To: normalizedPhone,
      From: fromNumber,
      Body: `منجز - رمز التحقق الخاص بك: ${otp}\nالرمز صالح لمدة 5 دقائق.\nموقعنا: monjez.app`,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[Twilio]", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Twilio]", e);
    return false;
  }
}

router.post("/register", async (req, res) => {
  try {
    const parsed = RegisterUserBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ValidationError", message: parsed.error.message });
      return;
    }
    const { name, phone, password, role, city, bio, israeliId, businessId } = parsed.data;

    if (israeliId && !validateIsraeliId(israeliId)) {
      res.status(400).json({ error: "ValidationError", message: "رقم الهوية الإسرائيلية غير صحيح / מספר תעודת זהות שגוי" });
      return;
    }

    if (role === "employer" && businessId && !validateBusinessId(businessId)) {
      res.status(400).json({ error: "ValidationError", message: "رقم سجل الأعمال غير صحيح / מספר עוסק שגוי" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Conflict", message: "رقم الهاتف مسجل مسبقاً / מספר טלפון כבר רשום" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        phone,
        passwordHash,
        role,
        city: city ?? null,
        bio: bio ?? null,
        israeliId: israeliId ?? null,
        businessId: businessId ?? null,
        creditBalance: role === "employer" ? 10 : 0,
        phoneVerified: false,
      })
      .returning();

    const { passwordHash: _, phoneOtp: __, phoneOtpExpiry: ___, ...safeUser } = user;
    res.status(201).json({ ...safeUser, trustScore: null });
  } catch (err: any) {
    console.error("[Register Error]", err);
    res.status(500).json({ error: "InternalServerError", message: err.message || "Failed to register user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = LoginUserBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ValidationError", message: parsed.error.message });
      return;
    }
    const { phone, password } = parsed.data;

    const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (!users.length) {
      res.status(401).json({ error: "Unauthorized", message: "رقم الهاتف أو كلمة المرور غير صحيحة / שם משתמש או סיסמה שגויים" });
      return;
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "رقم الهاتف أو كلمة المرور غير صحيحة / שם משתמש או סיסמה שגויים" });
      return;
    }

    // Check if user is banned
    const bans = await db
      .select()
      .from(bansTable)
      .where(or(eq(bansTable.phone, user.phone), eq(bansTable.userId, user.id)))
      .limit(1);
    if (bans.length > 0) {
      res.status(403).json({ error: "Banned", message: `تم حظر هذا الحساب: ${bans[0].reason} / חשבון זה חסום: ${bans[0].reason}` });
      return;
    }

    const token = signToken(user.id);
    const { passwordHash: _, phoneOtp: __, phoneOtpExpiry: ___, ...safeUser } = user;
    res.json({ user: { ...safeUser, trustScore: user.trustScore ?? null }, token });
  } catch (err: any) {
    console.error("[Login Error]", err);
    res.status(500).json({ error: "InternalServerError", message: err.message || "Failed to login" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { passwordHash: _, phoneOtp: __, phoneOtpExpiry: ___, ...safeUser } = user;
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
  if (parsed.data.israeliId !== undefined) {
    if (parsed.data.israeliId && !validateIsraeliId(parsed.data.israeliId)) {
      res.status(400).json({ error: "ValidationError", message: "رقم الهوية الإسرائيلية غير صحيح" });
      return;
    }
    updates.israeliId = parsed.data.israeliId;
  }
  if (parsed.data.businessId !== undefined) {
    if (parsed.data.businessId && !validateBusinessId(parsed.data.businessId)) {
      res.status(400).json({ error: "ValidationError", message: "رقم سجل الأعمال غير صحيح" });
      return;
    }
    updates.businessId = parsed.data.businessId;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  const { passwordHash: _, phoneOtp: __, phoneOtpExpiry: ___, ...safeUser } = updated;
  res.json({ ...safeUser, trustScore: updated.trustScore ?? null });
});

router.post("/send-otp", requireAuth, async (req, res) => {
  const user = (req as any).user;

  if (user.phoneVerified) {
    res.status(400).json({ error: "AlreadyVerified", message: "رقم الهاتف مُحقَّق مسبقاً / מספר הטלפון כבר מאומת" });
    return;
  }

  // Cooldown: 60 seconds between OTP requests
  if (user.phoneOtpExpiry) {
    const expiry = new Date(user.phoneOtpExpiry);
    const generatedAt = new Date(expiry.getTime() - 5 * 60 * 1000);
    const secondsSinceGenerated = (Date.now() - generatedAt.getTime()) / 1000;
    if (secondsSinceGenerated < 60) {
      const cooldownLeft = Math.ceil(60 - secondsSinceGenerated);
      res
        .status(429)
        .json({ error: "TooManyRequests", message: `يرجى الانتظار ${cooldownLeft} ثانية / אנא המתן ${cooldownLeft} שניות`, cooldownSeconds: cooldownLeft });
      return;
    }
  }

  const otp = generateOtp();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.update(usersTable).set({ phoneOtp: otp, phoneOtpExpiry: expiry }).where(eq(usersTable.id, user.id));

  const sent = await sendSmsOtp(user.phone, otp);

  const responsePayload: Record<string, any> = {
    message: "تم إرسال رمز التحقق / קוד אימות נשלח",
    cooldownSeconds: 60,
  };

  // Return OTP in response ONLY if Twilio is not configured (demo mode)
  if (!sent) {
    responsePayload.otpCode = otp;
    responsePayload.demo = true;
  }

  res.json(responsePayload);
});

router.post("/verify-otp", requireAuth, async (req, res) => {
  const parsed = VerifyOtpBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  const user = (req as any).user;
  const { code } = parsed.data;

  if (user.phoneVerified) {
    res.status(400).json({ error: "AlreadyVerified", message: "رقم الهاتف مُحقَّق مسبقاً" });
    return;
  }

  if (!user.phoneOtp || !user.phoneOtpExpiry) {
    res.status(400).json({ error: "NoOtp", message: "لم يتم إرسال رمز تحقق. أرسل أولاً / לא נשלח קוד אימות" });
    return;
  }

  if (new Date() > new Date(user.phoneOtpExpiry)) {
    res.status(400).json({ error: "OtpExpired", message: "انتهت صلاحية رمز التحقق / קוד האימות פג תוקפו" });
    return;
  }

  if (user.phoneOtp !== code) {
    res.status(400).json({ error: "InvalidOtp", message: "رمز التحقق غير صحيح / קוד אימות שגוי" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ phoneVerified: true, phoneOtp: null, phoneOtpExpiry: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  const { passwordHash: _, phoneOtp: __, phoneOtpExpiry: ___, ...safeUser } = updated;
  res.json({ ...safeUser, trustScore: updated.trustScore ?? null });
});

export default router;
