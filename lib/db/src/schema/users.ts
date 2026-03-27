import { pgTable, text, serial, integer, real, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["worker", "employer"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  bio: text("bio"),
  city: text("city"),
  israeliId: text("israeli_id"),
  businessId: text("business_id"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  phoneOtp: text("phone_otp"),
  phoneOtpExpiry: timestamp("phone_otp_expiry"),
  trustScore: real("trust_score"),
  creditBalance: integer("credit_balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, trustScore: true, phoneVerified: true, phoneOtp: true, phoneOtpExpiry: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
