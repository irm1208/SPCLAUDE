import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { groupBuysTable } from "./group_buys";

export interface OrganiserTodoSubtask {
  id: string;
  text: string;
  completed: boolean;
}

export const organiserTodosTable = pgTable("organiser_todos", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id),
  organiserId: text("organiser_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority"),
  dueDate: text("due_date"),
  dueTime: text("due_time"),
  durationMin: integer("duration_min"),
  linkedOrderIds: jsonb("linked_order_ids").$type<string[]>().notNull().default([]),
  category: text("category"),
  subtasks: jsonb("subtasks").$type<OrganiserTodoSubtask[]>().notNull().default([]),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index("organiser_todos_group_buy_idx").on(table.groupBuyId),
  index("organiser_todos_due_date_idx").on(table.dueDate),
]);

export type OrganiserTodo = typeof organiserTodosTable.$inferSelect;
export type NewOrganiserTodo = typeof organiserTodosTable.$inferInsert;
