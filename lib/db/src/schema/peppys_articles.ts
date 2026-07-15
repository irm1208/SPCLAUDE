import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const peppysArticlesTable = pgTable("peppys_articles", {
  id:           text("id").primaryKey(),
  title:        text("title").notNull(),
  url:          text("url").notNull(),
  content:      text("content").notNull(),
  categoryName: text("category_name"),
  tags:         text("tags").notNull().default("[]"),
  postCount:    integer("post_count").notNull().default(1),
  importedAt:   timestamp("imported_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:    timestamp("updated_at",  { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => [
  index("idx_peppys_imported").on(t.importedAt),
]);
