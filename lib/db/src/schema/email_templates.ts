import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailTemplatesTable = pgTable("email_templates", {
  eventKey:     text("event_key").primaryKey(),
  name:         text("name").notNull(),
  subject:      text("subject").notNull(),
  bodyHtml:     text("body_html").notNull(),
  fromName:     text("from_name").notNull().default("Salt & Peps"),
  primaryColor: text("primary_color").notNull().default("#1B3A7A"),
  logoUrl:      text("logo_url"),
  footerText:   text("footer_text"),
  availableVars: text("available_vars").notNull().default("[]"), // JSON: [{key,description}]
  isActive:     boolean("is_active").notNull().default(true),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
                  .$onUpdate(() => new Date()),
});
