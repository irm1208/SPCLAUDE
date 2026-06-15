import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const btKnowledgeCacheTable = pgTable("bt_knowledge_cache", {
  topic:        text("topic").primaryKey(),
  summary:      text("summary").notNull(),
  sourceUrls:   text("source_urls").notNull().default("[]"),
  createdAt:    timestamp("created_at",  { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at",  { withTimezone: true }).notNull().default(sql`now()`),
  hits:         integer("hits").notNull().default(0),
}, (t) => [
  index("idx_bt_kc_updated").on(t.updatedAt),
]);
