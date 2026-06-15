import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const qiyunleMappingsTable = pgTable("qiyunle_mappings", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  qiyunleCode: text("qiyunle_code").notNull().unique(),
  qiyunleGoodsId: integer("qiyunle_goods_id"),
  qiyunleName: text("qiyunle_name"),
  manufacturer: text("manufacturer").notNull().default("Uther"),
  batchStock: integer("batch_stock"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QiyunleMapping = typeof qiyunleMappingsTable.$inferSelect;
export type InsertQiyunleMapping = typeof qiyunleMappingsTable.$inferInsert;
