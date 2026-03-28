import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const bansTable = pgTable("bans", {
  id: serial("id").primaryKey(),
  phone: text("phone"),
  israeliId: text("israeli_id"),
  userId: integer("user_id"),
  reason: text("reason").notNull(),
  bannedBy: integer("banned_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Ban = typeof bansTable.$inferSelect;
