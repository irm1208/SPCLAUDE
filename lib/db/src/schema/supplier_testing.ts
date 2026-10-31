import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { testingPoolsTable } from "./testing_pools";

// Batch identity is immutable; funding and protected results remain in testing_pools.
export const supplierTestingGroupsTable = pgTable("supplier_testing_groups", {
  id: text("id").primaryKey(),
  identityKey: text("identity_key").notNull().unique(),
  poolId: text("pool_id").notNull().unique().references(() => testingPoolsTable.id, { onDelete: "restrict" }),
  supplierId: text("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  batchNumber: text("batch_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplierTestingInterestsTable = pgTable("supplier_testing_interests", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull().unique(),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onUpdate: "cascade", onDelete: "cascade" }),
  orderId: text("order_id").notNull(),
  orderCode: text("order_code").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  supplierId: text("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  groupId: text("group_id").references(() => supplierTestingGroupsTable.id, { onDelete: "restrict" }),
  assignmentNote: text("assignment_note"),
  assignedBy: text("assigned_by"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplierTestingMembershipsTable = pgTable("supplier_testing_memberships", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => supplierTestingGroupsTable.id, { onDelete: "restrict" }),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onUpdate: "cascade", onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("supplier_testing_memberships_group_account_unique").on(t.groupId, t.accountUsername)]);
