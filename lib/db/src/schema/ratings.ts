import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  raterId: integer("rater_id").notNull().references(() => usersTable.id),
  rateeId: integer("ratee_id").notNull().references(() => usersTable.id),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// إنشاء مخطط الإدخال
export const insertRatingSchema = createInsertSchema(ratingsTable).omit({ 
  id: true, 
  createdAt: true 
});

// الإصلاح النهائي لتعارض الأنواع (Type Inference)
export type Rating = typeof ratingsTable.$inferSelect;

export type InsertRating = z.infer<
  typeof insertRatingSchema extends z.ZodType<any, any, any> 
  ? typeof insertRatingSchema 
  : any
>;