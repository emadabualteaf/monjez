import { boolean, integer, pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const applicationStatusEnum = pgEnum("application_status", ["pending", "accepted", "rejected"]);

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  workerId: integer("worker_id").notNull().references(() => usersTable.id),
  status: applicationStatusEnum("status").notNull().default("pending"),
  contactRevealed: boolean("contact_revealed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({
  id: true,
  createdAt: true,
});

export type Application = typeof applicationsTable.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema extends z.ZodType<any, any, any> ? typeof insertApplicationSchema : any>;
