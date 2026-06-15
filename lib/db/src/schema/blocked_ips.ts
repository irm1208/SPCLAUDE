import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const blockedIpsTable = pgTable("blocked_ips", {
  id: text("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason"),
  blockedBy: text("blocked_by").notNull().default("system"),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export type BlockedIp = typeof blockedIpsTable.$inferSelect;
