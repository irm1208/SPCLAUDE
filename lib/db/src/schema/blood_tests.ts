import { pgTable, text, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const bloodTestSessionsTable = pgTable("blood_test_sessions", {
  id: text("id").primaryKey(),
  telegramUsername: text("telegram_username")
    .notNull()
    .references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  testDate: date("test_date").notNull(),
  labName: text("lab_name"),
  testName: text("test_name"),
  measurementType: text("measurement_type"),
  medicationNotes: text("medication_notes"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bloodTestValuesTable = pgTable("blood_test_values", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => bloodTestSessionsTable.id, { onDelete: "cascade" }),
  biomarkerName: text("biomarker_name").notNull(),
  biomarkerCategory: text("biomarker_category").notNull(),
  value: numeric("value", { precision: 12, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  refRangeLow: numeric("ref_range_low", { precision: 12, scale: 4 }),
  refRangeHigh: numeric("ref_range_high", { precision: 12, scale: 4 }),
});

export type BloodTestSession = typeof bloodTestSessionsTable.$inferSelect;
export type BloodTestValue = typeof bloodTestValuesTable.$inferSelect;
