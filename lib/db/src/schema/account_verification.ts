import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const accountVerificationChallengesTable = pgTable("account_verification_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("account_verification_challenges_account_idx").on(t.accountUsername),
  index("account_verification_challenges_active_idx").on(t.accountUsername, t.consumedAt, t.createdAt.desc()),
]);

export type AccountVerificationChallenge = typeof accountVerificationChallengesTable.$inferSelect;