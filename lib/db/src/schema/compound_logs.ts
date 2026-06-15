import { pgTable, text, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const compoundLogsTable = pgTable("compound_logs", {
  id: text("id").primaryKey(),
  telegramUsername: text("telegram_username")
    .notNull()
    .references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  compoundName: text("compound_name").notNull(),
  compoundType: text("compound_type").notNull(), // "AAS" | "TRT" | "Peptide" | "Supplement" | "Other"
  doseAmount: numeric("dose_amount", { precision: 10, scale: 3 }).notNull(),
  doseUnit: text("dose_unit").notNull(), // "mg" | "mcg" | "IU" | "ml"
  frequency: text("frequency").notNull(), // "Daily" | "EOD" | "E3D" | "2x/week" | "Weekly" | "Other"
  route: text("route").notNull(), // "SubQ" | "IM" | "Oral" | "Nasal" | "Other"
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CompoundLog = typeof compoundLogsTable.$inferSelect;
export type NewCompoundLog = typeof compoundLogsTable.$inferInsert;
