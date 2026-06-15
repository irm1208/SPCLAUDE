import { pgTable, text, timestamp, boolean, real, index } from "drizzle-orm/pg-core";

export const geoIpCacheTable = pgTable("geo_ip_cache", {
  ip: text("ip").primaryKey(),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  isp: text("isp"),
  org: text("org"),
  lat: real("lat"),
  lon: real("lon"),
  isProxy: boolean("is_proxy"),
  isHosting: boolean("is_hosting"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("geo_ip_cache_expires_at_idx").on(t.expiresAt),
]);

export type GeoIpCache = typeof geoIpCacheTable.$inferSelect;
