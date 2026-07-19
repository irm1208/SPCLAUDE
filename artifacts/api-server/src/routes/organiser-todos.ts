import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, groupBuysTable, organiserTodosTable } from "@workspace/db";
import { requireOrganiser } from "../middleware/require-organiser";

const router: IRouter = Router();
const VALID_STATUSES = new Set(["todo", "in-progress", "done"]);
const VALID_PRIORITIES = new Set(["high", "medium", "low"]);

async function canAccessGroupBuy(req: Request, groupBuyId: string): Promise<boolean> {
  if (req.organiser?.isAdmin) return req.organiser.adminGbId === groupBuyId;
  const [groupBuy] = await db
    .select({ organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId))
    .limit(1);
  return Boolean(groupBuy && groupBuy.organiserId === req.organiser?.telegramUsername);
}

function cleanSubtasks(value: unknown): Array<{ id: string; text: string; completed: boolean }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim().slice(0, 500) : "";
    if (!text) return [];
    return [{
      id: typeof record.id === "string" && record.id ? record.id : randomUUID(),
      text,
      completed: Boolean(record.completed),
    }];
  });
}

function cleanLinkedOrderIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(item => typeof item === "string").map(item => item.trim()).filter(Boolean))].slice(0, 100)
    : [];
}

function formatTodo(todo: typeof organiserTodosTable.$inferSelect) {
  return {
    ...todo,
    linkedOrderId: todo.linkedOrderIds[0],
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

router.get("/organiser/group-buys/:gbId/todos", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  const todos = await db
    .select()
    .from(organiserTodosTable)
    .where(eq(organiserTodosTable.groupBuyId, groupBuyId))
    .orderBy(desc(organiserTodosTable.createdAt));
  res.json(todos.map(formatTodo));
});

router.post("/organiser/group-buys/:gbId/todos", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  const body = req.body as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const status = VALID_STATUSES.has(String(body.status)) ? String(body.status) : "todo";
  const priority = VALID_PRIORITIES.has(String(body.priority)) ? String(body.priority) : null;
  const [created] = await db.insert(organiserTodosTable).values({
    id: typeof body.id === "string" && body.id ? body.id : randomUUID(),
    groupBuyId,
    organiserId: req.organiser!.telegramUsername,
    title,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 5000) || null : null,
    status,
    priority,
    dueDate: typeof body.dueDate === "string" ? body.dueDate || null : null,
    dueTime: typeof body.dueTime === "string" ? body.dueTime || null : null,
    durationMin: Number.isFinite(Number(body.durationMin)) ? Math.max(0, Number(body.durationMin)) : null,
    linkedOrderIds: cleanLinkedOrderIds(body.linkedOrderIds ?? (body.linkedOrderId ? [body.linkedOrderId] : [])),
    category: typeof body.category === "string" ? body.category.trim().slice(0, 120) || null : null,
    subtasks: cleanSubtasks(body.subtasks),
    archived: Boolean(body.archived),
  }).returning();
  res.status(201).json(formatTodo(created));
});

router.patch("/organiser/group-buys/:gbId/todos/:todoId", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  const todoId = String(req.params.todoId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim().slice(0, 500);
  if (body.description === null || typeof body.description === "string") updates.description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) || null : null;
  if (VALID_STATUSES.has(String(body.status))) updates.status = String(body.status);
  if (body.priority === null || VALID_PRIORITIES.has(String(body.priority))) updates.priority = body.priority;
  if (body.dueDate === null || typeof body.dueDate === "string") updates.dueDate = body.dueDate || null;
  if (body.dueTime === null || typeof body.dueTime === "string") updates.dueTime = body.dueTime || null;
  if (body.durationMin === null || Number.isFinite(Number(body.durationMin))) updates.durationMin = body.durationMin === null ? null : Math.max(0, Number(body.durationMin));
  if (body.linkedOrderIds !== undefined || body.linkedOrderId !== undefined) updates.linkedOrderIds = cleanLinkedOrderIds(body.linkedOrderIds ?? (body.linkedOrderId ? [body.linkedOrderId] : []));
  if (body.category === null || typeof body.category === "string") updates.category = typeof body.category === "string" ? body.category.trim().slice(0, 120) || null : null;
  if (body.subtasks !== undefined) updates.subtasks = cleanSubtasks(body.subtasks);
  if (body.archived !== undefined) updates.archived = Boolean(body.archived);

  const [updated] = await db
    .update(organiserTodosTable)
    .set(updates)
    .where(and(eq(organiserTodosTable.id, todoId), eq(organiserTodosTable.groupBuyId, groupBuyId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Todo not found" }); return; }
  res.json(formatTodo(updated));
});

router.delete("/organiser/group-buys/:gbId/todos/:todoId", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  const todoId = String(req.params.todoId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  const [deleted] = await db
    .delete(organiserTodosTable)
    .where(and(eq(organiserTodosTable.id, todoId), eq(organiserTodosTable.groupBuyId, groupBuyId)))
    .returning({ id: organiserTodosTable.id });
  if (!deleted) { res.status(404).json({ error: "Todo not found" }); return; }
  res.json({ ok: true, id: deleted.id });
});

export default router;
