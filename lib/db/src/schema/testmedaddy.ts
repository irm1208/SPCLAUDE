import { pgTable, text, timestamp, jsonb, numeric, boolean, foreignKey, unique, index } from "drizzle-orm/pg-core";

// Independent product identities: never reference Salt & Peps accounts/orders.
export const tmdUsersTable = pgTable("tmd_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  handle: text("handle").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tmdSessionsTable = pgTable("tmd_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  csrfToken: text("csrf_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  foreignKey({ name: "tmd_sessions_user_id_fkey", columns: [table.userId], foreignColumns: [tmdUsersTable.id] }).onDelete("cascade"),
  index("tmd_sessions_user_idx").on(table.userId),
]);

export const tmdPoolsTable = pgTable("tmd_pools", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  organiserId: text("organiser_id").notNull(),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("public"),
  accessCodeHash: text("access_code_hash"),
  document: jsonb("document").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  foreignKey({ name: "tmd_pools_organiser_id_fkey", columns: [table.organiserId], foreignColumns: [tmdUsersTable.id] }),
  index("tmd_pools_organiser_idx").on(table.organiserId),
]);

export const tmdMembersTable = pgTable("tmd_members", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull(),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  anonymous: boolean("anonymous").notNull().default(false),
  // Estimate only in the core release. No payment/verification fields are accepted.
  amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  foreignKey({ name: "tmd_members_pool_id_fkey", columns: [table.poolId], foreignColumns: [tmdPoolsTable.id] }).onDelete("cascade"),
  foreignKey({ name: "tmd_members_user_id_fkey", columns: [table.userId], foreignColumns: [tmdUsersTable.id] }),
  unique("tmd_members_pool_user_unique").on(table.poolId, table.userId),
  index("tmd_members_user_idx").on(table.userId),
]);
