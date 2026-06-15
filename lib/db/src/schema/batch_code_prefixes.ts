import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const batchCodePrefixesTable = pgTable("batch_code_prefixes", {
  id: serial("id").primaryKey(),
  prefix: varchar("prefix", { length: 50 }).notNull().unique(),
  compoundName: varchar("compound_name", { length: 200 }).notNull(),
  nominalDose: varchar("nominal_dose", { length: 50 }).notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
