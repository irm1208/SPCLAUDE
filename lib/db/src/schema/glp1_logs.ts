import { pgTable, text, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const glp1LogsTable = pgTable("glp1_logs", {
  id: text("id").primaryKey(),
  telegramUsername: text("telegram_username")
    .notNull()
    .references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  loggedDate: date("logged_date").notNull(),
  compoundName: text("compound_name").notNull(),
  doseMg: numeric("dose_mg", { precision: 8, scale: 3 }).notNull(),
  // Canonical storage: always in kg. weightUnit records the user's display preference at time of entry.
  weightKg: numeric("weight_kg", { precision: 8, scale: 3 }),
  weightUnit: text("weight_unit").notNull().default("kg"), // "kg" | "lbs" — display preference only
  notes: text("notes"),
  // Shotsy-inspired fields
  injectionSite: text("injection_site"), // e.g. "abdomen-left", "thigh-right"
  sideEffects: text("side_effects"), // JSON array string: ["nausea","fatigue"]
  calories: numeric("calories", { precision: 7, scale: 1 }),
  proteinG: numeric("protein_g", { precision: 6, scale: 1 }),
  waterMl: numeric("water_ml", { precision: 7, scale: 0 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Glp1Log = typeof glp1LogsTable.$inferSelect;
export type NewGlp1Log = typeof glp1LogsTable.$inferInsert;
