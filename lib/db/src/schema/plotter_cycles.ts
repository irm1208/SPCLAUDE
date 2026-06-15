import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accountsTable } from "./accounts";

export const plotterCyclesTable = pgTable("plotter_cycles", {
  id: serial("id").primaryKey(),
  telegramUsername: text("telegram_username")
    .notNull()
    .unique()
    .references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  entriesJson: text("entries_json").notNull().default("[]"),
  totalWeeks: integer("total_weeks").notNull().default(16),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
