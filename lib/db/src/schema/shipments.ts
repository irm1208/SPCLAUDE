import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

export type MaskedEvent = {
  date: string;
  status: string;
  location: string;
};

export const shipmentsTable = pgTable("shipments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  label: text("label").notNull(),
  carrier: text("carrier").notNull().default("Auto"),
  trackingNumber: text("tracking_number").notNull(),
  status: text("status").notNull().default("pending"),
  statusCode: integer("status_code").default(0),
  origin: text("origin").notNull().default("China"),
  estimatedDelivery: text("estimated_delivery"),
  cachedEvents: text("cached_events").default("[]"),
  lastChecked: timestamp("last_checked"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Shipment = typeof shipmentsTable.$inferSelect;
export type NewShipment = typeof shipmentsTable.$inferInsert;
