import { pgTable, text, serial, integer, real, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const salaryTypeEnum = pgEnum("salary_type", ["hourly", "daily", "fixed"]);
export const jobStatusEnum = pgEnum("job_status", ["open", "closed", "filled"]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  city: text("city").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  salary: real("salary").notNull(),
  salaryType: salaryTypeEnum("salary_type").notNull(),
  jobDate: text("job_date"),
  status: jobStatusEnum("status").notNull().default("open"),
  isBoosted: boolean("is_boosted").notNull().default(false),
  boostedUntil: timestamp("boosted_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, isBoosted: true, boostedUntil: true, status: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
