import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const labTestsTable = pgTable("lab_tests", {
  id: serial("id").primaryKey(),
  janoshikId: text("janoshik_id").unique(),
  url: text("url"),
  peptideName: text("peptide_name").notNull(),
  mgAmount: real("mg_amount"),
  nominalDose: text("nominal_dose"),
  massUnit: text("mass_unit").default("mg"),
  supplier: text("supplier").notNull().default("Uther"),
  batchCode: text("batch_code"),
  // Lab metadata
  labName: text("lab_name").notNull().default("Janoshik"),
  testType: text("test_type"),
  productCategory: text("product_category"),
  // Admin-entered numeric values from reading the CoA image
  purityPct: real("purity_pct"),
  endotoxinEuMg: real("endotoxin_eu_mg"),
  sterilityPass: boolean("sterility_pass"),
  testDate: text("test_date"),
  notes: text("notes"),
  // Heavy metals (text: "not detected", "<0.1 ppm", numeric values, etc.)
  heavyMetalAs: text("heavy_metal_as"),
  heavyMetalCd: text("heavy_metal_cd"),
  heavyMetalPb: text("heavy_metal_pb"),
  heavyMetalHg: text("heavy_metal_hg"),
  // Community submission fields
  isThirdPartyTest: boolean("is_third_party_test").default(false).notNull(),
  pending: boolean("pending").default(false).notNull(),
  submittedBy: text("submitted_by"),
  organiserId: text("organiser_id"), // set when submitted by a GB organiser; null = admin entry
  groupBuyId: text("group_buy_id"), // which GB this lab test belongs to (organiser submissions)
  // Blend component breakdown (JSON: [{name, mg, unit?}])
  blendComponents: text("blend_components"),
  // Uploaded PDF blob (base64) — used when no external URL is available (e.g. Uzorak PDF upload)
  pdfBlob: text("pdf_blob"),
  // AI extraction metadata
  aiExtracted: boolean("ai_extracted").default(false).notNull(),
  aiExtractedAt: timestamp("ai_extracted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LabTest = typeof labTestsTable.$inferSelect;
export type NewLabTest = typeof labTestsTable.$inferInsert;
