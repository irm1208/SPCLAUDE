import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export interface DnaVariantResult {
  rsid: string;
  gene: string;
  genotype: string;
  riskLevel: string;
  category: string;
  name: string;
}

export const dnaProfilesTable = pgTable("dna_profiles", {
  accountId: text("account_id").primaryKey(),
  fileFormat: text("file_format").notNull().default("23andme"),
  snpCount: text("snp_count"),
  findings: jsonb("findings").$type<DnaVariantResult[]>().notNull().default([]),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
