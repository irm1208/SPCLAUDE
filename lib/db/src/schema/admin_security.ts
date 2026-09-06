import { sql } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, bigint, integer, index, unique, uniqueIndex, check } from "drizzle-orm/pg-core";

export const adminSecuritySettingsTable = pgTable("admin_security_settings", {
  id: integer("id").primaryKey().default(1),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("admin_security_settings_id_check", sql`${t.id} = 1`)]);

export const adminUsersTable = pgTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  totpSecretEncrypted: text("totp_secret_encrypted"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  active: boolean("active").notNull().default(true),
  lastTotpStep: bigint("last_totp_step", { mode: "number" }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).notNull().defaultNow(),
  twoFactorChangedAt: timestamp("two_factor_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("admin_users_username_unique").on(t.username)]);

export const adminRecoveryCodesTable = pgTable("admin_recovery_codes", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id").notNull().references(() => adminUsersTable.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("admin_recovery_codes_user_idx").on(t.adminUserId)]);

export const adminSessionsTable = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id").notNull().references(() => adminUsersTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  csrfTokenHash: text("csrf_token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  stepUpAt: timestamp("step_up_at", { withTimezone: true }),
}, (t) => [
  index("admin_sessions_token_hash_idx").on(t.tokenHash),
  uniqueIndex("admin_sessions_token_hash_unique_idx").on(t.tokenHash),
  index("admin_sessions_user_idx").on(t.adminUserId),
]);

export const adminPendingChallengesTable = pgTable("admin_pending_challenges", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id").notNull().references(() => adminUsersTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("admin_pending_challenges_token_hash_idx").on(t.tokenHash),
  uniqueIndex("admin_pending_challenges_token_hash_unique_idx").on(t.tokenHash),
  index("admin_pending_challenges_user_idx").on(t.adminUserId),
]);

export const adminStepUpAssertionsTable = pgTable("admin_step_up_assertions", {
  id: text("id").primaryKey(),
  adminSessionId: text("admin_session_id").notNull().references(() => adminSessionsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  payloadHash: text("payload_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("admin_step_up_assertions_token_hash_unique").on(t.tokenHash), index("admin_step_up_assertions_session_idx").on(t.adminSessionId)]);