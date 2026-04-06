import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["worker", "employer"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(), 
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  bio: text("bio"),
  city: text("city"),
  israeliId: varchar("israeli_id", { length: 9 }),
  businessId: varchar("business_id", { length: 9 }),
  creditBalance: integer("credit_balance").default(0),
  
  // الحقول التي كانت مفقودة وتسببت في أخطاء الـ API
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  trustScore: integer("trust_score").default(0).notNull(),
  phoneOtp: text("phone_otp"),
  phoneOtpExpiry: timestamp("phone_otp_expiry"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);

export type User = z.infer<typeof selectUserSchema extends z.ZodType<any, any, any> ? typeof selectUserSchema : any>;
export type InsertUser = z.infer<typeof insertUserSchema extends z.ZodType<any, any, any> ? typeof insertUserSchema : any>;