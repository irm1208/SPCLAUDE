import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),    // "error" | "login" | "order" | "change"
  level: text("level").notNull().default("info"), // "info" | "warn" | "error"
  action: text("action").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
