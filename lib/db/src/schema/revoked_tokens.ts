import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const revokedTokensTable = pgTable("revoked_tokens", {
  jti: text("jti").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("revoked_tokens_expires_at_idx").on(t.expiresAt),
]);

export type RevokedToken = typeof revokedTokensTable.$inferSelect;
