import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

export type TrackingPackage = {
  id: string;
  label: string;
  carrier: string;
  carrierCode: number;
  trackingNumber: string;
  customTrackingUrl?: string;
  notes?: string;
  status: string;
  statusCode: number;
  items: string[];
  cachedEvents: TrackingEvent[];
  lastChecked: string | null;
};

export type TrackingEvent = {
  date: string;
  status: string;
  location: string;
};

export const trackingLinksTable = pgTable("tracking_links", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  packages: jsonb("packages").notNull().$type<TrackingPackage[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TrackingLink = typeof trackingLinksTable.$inferSelect;
export type NewTrackingLink = typeof trackingLinksTable.$inferInsert;
