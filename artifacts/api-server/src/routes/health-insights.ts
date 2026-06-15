import { Router } from "express";
import { db } from "@workspace/db";
import { healthInsightLogsTable, customerActivityLogsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, notInArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { logCustomerActivity } from "../lib/activity-log";
import { ADMIN_ONLY_EVENT_TYPES as ADMIN_ONLY_EVENT_TYPES_LIST } from "../lib/activity-events";

const router = Router();

const VALID_LOG_TYPES = ["weight", "waist", "bmi", "body_fat", "blood_pressure", "resting_hr", "fasting_glucose", "mood", "energy", "sleep_hours", "water_intake", "steps", "note", "other"];

// ─── GET /api/account/health-insights ─────────────────────────
router.get("/account/health-insights", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { logType, limit: qLimit, offset: qOffset } = req.query;

  const limit = Math.min(200, Math.max(1, parseInt(String(qLimit ?? "50"))));
  const offset = Math.max(0, parseInt(String(qOffset ?? "0")));

  const conditions = [eq(healthInsightLogsTable.telegramUsername, tg)];
  if (logType && typeof logType === "string") {
    conditions.push(eq(healthInsightLogsTable.logType, logType));
  }

  const rows = await db
    .select()
    .from(healthInsightLogsTable)
    .where(and(...conditions))
    .orderBy(desc(healthInsightLogsTable.loggedDate), desc(healthInsightLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

// ─── POST /api/account/health-insights ────────────────────────
router.post("/account/health-insights", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { logType, loggedDate, value, unit, metadata } = req.body;

  if (!logType || typeof logType !== "string") {
    res.status(400).json({ error: "logType is required" });
    return;
  }

  const id = randomUUID();
  const [row] = await db.insert(healthInsightLogsTable).values({
    id,
    telegramUsername: tg,
    logType: String(logType).trim().slice(0, 50),
    loggedDate: loggedDate ? String(loggedDate).slice(0, 20) : null,
    value: value !== undefined && value !== null ? String(value).slice(0, 100) : null,
    unit: unit ? String(unit).trim().slice(0, 30) : null,
    metadata: (metadata && typeof metadata === "object") ? metadata : null,
  }).returning();

  const cleanLogType = String(logType).trim().toLowerCase().replace(/\s+/g, "_");
  const eventTypeMapped = `health.${cleanLogType}_logged`;
  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "health",
    eventType: eventTypeMapped,
    entityId: id,
    actorType: "customer",
    metadata: { logType, loggedDate, value, unit },
  }).catch(() => {});

  res.status(201).json(row);
});

// ─── PATCH /api/account/health-insights/:id ───────────────────
router.patch("/account/health-insights/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = req.params.id as string;

  const [existing] = await db
    .select()
    .from(healthInsightLogsTable)
    .where(and(eq(healthInsightLogsTable.id, id), eq(healthInsightLogsTable.telegramUsername, tg)));

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { loggedDate, value, unit, metadata } = req.body;
  const updates: Record<string, unknown> = {};
  if (loggedDate !== undefined) updates.loggedDate = loggedDate ? String(loggedDate).slice(0, 20) : null;
  if (value !== undefined) updates.value = value !== null ? String(value).slice(0, 100) : null;
  if (unit !== undefined) updates.unit = unit ? String(unit).trim().slice(0, 30) : null;
  if (metadata !== undefined) updates.metadata = (metadata && typeof metadata === "object") ? metadata : null;

  const [updated] = await db
    .update(healthInsightLogsTable)
    .set(updates)
    .where(eq(healthInsightLogsTable.id, id))
    .returning();

  const updateEventType = `health.${existing.logType.replace(/\s+/g, "_")}_updated`;
  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "health",
    eventType: updateEventType,
    entityId: id,
    actorType: "customer",
    metadata: {
      logType: existing.logType,
      loggedDate: updates.loggedDate ?? existing.loggedDate,
      value: updates.value ?? existing.value,
      unit: updates.unit ?? existing.unit,
    },
  }).catch(() => {});

  res.json(updated);
});

// ─── DELETE /api/account/health-insights/:id ──────────────────
router.delete("/account/health-insights/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = req.params.id as string;

  const [existing] = await db
    .select()
    .from(healthInsightLogsTable)
    .where(and(eq(healthInsightLogsTable.id, id), eq(healthInsightLogsTable.telegramUsername, tg)));

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(healthInsightLogsTable).where(eq(healthInsightLogsTable.id, id));

  const deleteEventType = `health.${existing.logType.replace(/\s+/g, "_")}_deleted`;
  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "health",
    eventType: deleteEventType,
    entityId: id,
    actorType: "customer",
    metadata: {
      logType: existing.logType,
      loggedDate: existing.loggedDate,
      value: existing.value,
      unit: existing.unit,
    },
  }).catch(() => {});

  res.json({ ok: true });
});

// ─── GET /api/admin/health-insights/:username ─────────────────
router.get("/admin/health-insights/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = req.params.username.startsWith("@") ? req.params.username : `@${req.params.username}`;
  const { logType, limit: qLimit, offset: qOffset } = req.query;

  const limit = Math.min(200, Math.max(1, parseInt(String(qLimit ?? "50"))));
  const offset = Math.max(0, parseInt(String(qOffset ?? "0")));

  const conditions = [eq(healthInsightLogsTable.telegramUsername, username)];
  if (logType && typeof logType === "string") {
    conditions.push(eq(healthInsightLogsTable.logType, logType));
  }

  const rows = await db
    .select()
    .from(healthInsightLogsTable)
    .where(and(...conditions))
    .orderBy(desc(healthInsightLogsTable.loggedDate), desc(healthInsightLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

// Admin-only event types — completely hidden from customer /account/activity endpoint
// Source of truth is ADMIN_ONLY_EVENT_TYPES_LIST in lib/activity-events.ts
const ADMIN_ONLY_EVENT_TYPES = new Set(ADMIN_ONLY_EVENT_TYPES_LIST);

// Metadata keys that contain admin-only content and must always be stripped from customer responses
// Note: 'before'/'after'/'snapshot' are NOT stripped - customers can see what changed on their own events
const ADMIN_ONLY_META_KEYS = new Set(["adminNotes"]);

function sanitizeMetadataForCustomer(
  meta: Record<string, unknown> | null,
  actorType: string,
): Record<string, unknown> | null {
  if (!meta) return null;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    // Always remove admin-only content fields
    if (ADMIN_ONLY_META_KEYS.has(k)) continue;
    // For admin-actor events, also strip internal diff fields that expose admin workflow details
    if (actorType === "admin" && (k === "before" || k === "after" || k === "changedFields")) continue;
    safe[k] = v;
  }
  return Object.keys(safe).length > 0 ? safe : null;
}

// ─── GET /api/account/activity ────────────────────────────────
// Customer's own activity timeline — no admin-only metadata
router.get("/account/activity", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { category, eventType: qEventType, from: qFrom, to: qTo, limit: qLimit, offset: qOffset } = req.query;

  const limit = Math.min(100, Math.max(1, parseInt(String(qLimit ?? "50"))));
  const offset = Math.max(0, parseInt(String(qOffset ?? "0")));

  const conditions = [
    eq(customerActivityLogsTable.telegramUsername, tg),
    // Exclude events that are admin-only internal records (never shown to customers)
    notInArray(customerActivityLogsTable.eventType, [...ADMIN_ONLY_EVENT_TYPES]),
  ];
  if (category && typeof category === "string") {
    conditions.push(eq(customerActivityLogsTable.eventCategory, category));
  }
  if (qEventType && typeof qEventType === "string") {
    conditions.push(eq(customerActivityLogsTable.eventType, qEventType));
  }
  if (qFrom && typeof qFrom === "string") {
    conditions.push(gte(customerActivityLogsTable.createdAt, new Date(qFrom)));
  }
  if (qTo && typeof qTo === "string") {
    conditions.push(lte(customerActivityLogsTable.createdAt, new Date(qTo)));
  }

  const rows = await db
    .select()
    .from(customerActivityLogsTable)
    .where(and(...conditions))
    .orderBy(desc(customerActivityLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const sanitized = rows.map(r => ({
    id: r.id,
    eventCategory: r.eventCategory,
    eventType: r.eventType,
    entityId: r.entityId,
    actorType: r.actorType,
    metadata: sanitizeMetadataForCustomer(r.metadata as Record<string, unknown> | null, r.actorType),
    createdAt: r.createdAt,
  }));

  res.json({ rows: sanitized, limit, offset });
});

// ─── GET /api/admin/customers/:username/activity ──────────────
// Admin view: full activity timeline for a customer (unredacted)
router.get("/admin/customers/:username/activity", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rawUsername = req.params.username;
  const username = rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`;

  const { category, eventType: qEventType, actorType: qActorType, from: qFrom, to: qTo, limit: qLimit, offset: qOffset } = req.query;

  const limit = Math.min(200, Math.max(1, parseInt(String(qLimit ?? "50"))));
  const offset = Math.max(0, parseInt(String(qOffset ?? "0")));

  const conditions = [eq(customerActivityLogsTable.telegramUsername, username)];
  if (category && typeof category === "string") {
    conditions.push(eq(customerActivityLogsTable.eventCategory, category));
  }
  if (qEventType && typeof qEventType === "string") {
    conditions.push(eq(customerActivityLogsTable.eventType, qEventType));
  }
  if (qActorType && typeof qActorType === "string") {
    conditions.push(eq(customerActivityLogsTable.actorType, qActorType));
  }
  if (qFrom && typeof qFrom === "string") {
    conditions.push(gte(customerActivityLogsTable.createdAt, new Date(qFrom)));
  }
  if (qTo && typeof qTo === "string") {
    conditions.push(lte(customerActivityLogsTable.createdAt, new Date(qTo)));
  }

  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(customerActivityLogsTable)
    .where(and(...conditions));

  const rows = await db
    .select()
    .from(customerActivityLogsTable)
    .where(and(...conditions))
    .orderBy(desc(customerActivityLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    telegramUsername: username,
    total: totalCount,
    limit,
    offset,
    rows,
  });
});

export default router;
