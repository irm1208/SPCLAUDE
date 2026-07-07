import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const dnaProfilesTable = pgTable("dna_profiles", {
  accountId: text("account_id").primaryKey().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  fileFormat: text("file_format").notNull().default("23andme"),
  snpCount: text("snp_count"),
  findings: jsonb("findings").$type<Record<string, unknown>[]>().notNull().default([]),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DnaProfile = typeof dnaProfilesTable.$inferSelect;
export type NewDnaProfile = typeof dnaProfilesTable.$inferInsert;
