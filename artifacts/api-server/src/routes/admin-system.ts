import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { siteConfigTable, customerActivityLogsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, sql, or, ilike, type SQL } from "drizzle-orm";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import {
  SITE_CONFIG_REGISTRY,
  describeKey,
  validateValue,
  maskSecret,
  type ConfigType,
} from "../lib/site-config-schema";
import {
  listSchedulers,
  runSchedulerNow,
  setSchedulerInterval,
  setSchedulerEnabled,
} from "../lib/scheduler-registry";
import { writeLog } from "../lib/audit-log";

const router: IRouter = Router();

// ─── Site config (generic editor) ──────────────────────────────────────────────

router.get("/admin/site-config-all", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(siteConfigTable);
  const stored = new Map(rows.map(r => [r.key, r]));
  const seen = new Set<string>();

  const items = SITE_CONFIG_REGISTRY.map(d => {
    seen.add(d.key);
    const row = stored.get(d.key);
    const rawValue = row?.value ?? null;
    return {
      key: d.key,
      group: d.group,
      label: d.label,
      description: d.description,
      type: d.type,
      defaultValue: d.defaultValue,
      isRegistered: true,
      publicallyExposed: !!d.publicallyExposed,
      value: d.type === "secret" ? maskSecret(rawValue) : rawValue,
      hasValue: rawValue !== null,
      updatedAt: row?.updatedAt ?? null,
    };
  });

  for (const r of rows) {
    if (seen.has(r.key)) continue;
    items.push({
      key: r.key,
      group: "Other",
      label: r.key,
      description: "Ad-hoc key (not in registry).",
      type: "string" as ConfigType,
      defaultValue: null,
      isRegistered: false,
      publicallyExposed: false,
      value: r.value,
      hasValue: r.value !== null,
      updatedAt: r.updatedAt,
    });
  }

  items.sort((a, b) => (a.group + a.label).localeCompare(b.group + b.label));
  res.json({ items });
});

router.put("/admin/site-config-all/:key", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const key = String(req.params["key"] ?? "").trim();
  const value = req.body?.value;
  if (!key) { res.status(400).json({ error: "key is required" }); return; }
  if (typeof value !== "string") { res.status(400).json({ error: "value must be a string" }); return; }

  const desc = describeKey(key);
  if (desc) {
    const v = validateValue(desc.type, value);
    if (!v.ok) { res.status(400).json({ error: v.error }); return; }
  }

  // Read prior value for audit (skip masking — just record that it changed)
  const [prior] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, key));

  await db.insert(siteConfigTable).values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });

  await writeLog("change", "info", "site_config_update",
    `Updated site_config key: ${key} (by ${getAdminUsername(res)})`,
    { key, hadPriorValue: !!prior, actor: getAdminUsername(res) });

  res.json({ ok: true, key });
});

router.delete("/admin/site-config-all/:key", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const key = String(req.params["key"] ?? "").trim();
  if (!key) { res.status(400).json({ error: "key is required" }); return; }
  await db.delete(siteConfigTable).where(eq(siteConfigTable.key, key));
  await writeLog("change", "info", "site_config_delete",
    `Deleted site_config key: ${key} (by ${getAdminUsername(res)})`,
    { key, actor: getAdminUsername(res) });
  res.json({ ok: true });
});

// ─── Schedulers ────────────────────────────────────────────────────────────────

router.get("/admin/schedulers", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  res.json({ items: listSchedulers() });
});

router.post("/admin/schedulers/:name/run", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const name = String(req.params["name"] ?? "");
  const result = await runSchedulerNow(name);
  if (!result.ok) { res.status(400).json(result); return; }
  await writeLog("change", "info", "scheduler_run_now",
    `Manually ran scheduler: ${name} (by ${getAdminUsername(res)})`,
    { scheduler: name, actor: getAdminUsername(res) });
  res.json({ ok: true });
});

router.patch("/admin/schedulers/:name", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const name = String(req.params["name"] ?? "");
  const body = (req.body ?? {}) as { intervalMs?: unknown; enabled?: unknown };
  const changes: Record<string, unknown> = {};

  if (body.intervalMs !== undefined) {
    const n = Number(body.intervalMs);
    if (!Number.isFinite(n)) { res.status(400).json({ ok: false, error: "intervalMs must be a finite number" }); return; }
    const r = await setSchedulerInterval(name, n);
    if (!r.ok) { res.status(400).json(r); return; }
    changes["intervalMs"] = n;
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") { res.status(400).json({ ok: false, error: "enabled must be a boolean" }); return; }
    const r = await setSchedulerEnabled(name, body.enabled);
    if (!r.ok) { res.status(400).json(r); return; }
    changes["enabled"] = body.enabled;
  }

  if (Object.keys(changes).length > 0) {
    await writeLog("change", "info", "scheduler_update",
      `Updated scheduler: ${name} (by ${getAdminUsername(res)})`,
      { scheduler: name, changes, actor: getAdminUsername(res) });
  }
  res.json({ ok: true, items: listSchedulers().filter(s => s.name === name) });
});

// ─── Audit feed (customer activity log search) ─────────────────────────────────

router.get("/admin/audit-feed", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const q = String(req.query["q"] ?? "").trim();
  const category = String(req.query["category"] ?? "").trim();
  const eventType = String(req.query["eventType"] ?? "").trim();
  const actorType = String(req.query["actorType"] ?? "").trim();
  const username = String(req.query["username"] ?? "").trim();
  const since = String(req.query["since"] ?? "").trim();
  const until = String(req.query["until"] ?? "").trim();
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query["limit"] ?? "100"), 10) || 100));
  const offset = Math.max(0, parseInt(String(req.query["offset"] ?? "0"), 10) || 0);

  const filters: SQL[] = [];
  if (category) filters.push(eq(customerActivityLogsTable.eventCategory, category));
  if (eventType) filters.push(eq(customerActivityLogsTable.eventType, eventType));
  if (actorType) filters.push(eq(customerActivityLogsTable.actorType, actorType));
  if (username) filters.push(eq(customerActivityLogsTable.telegramUsername, username));
  if (since) {
    const d = new Date(since);
    if (!isNaN(d.getTime())) filters.push(gte(customerActivityLogsTable.createdAt, d));
  }
  if (until) {
    const d = new Date(until);
    if (!isNaN(d.getTime())) filters.push(lte(customerActivityLogsTable.createdAt, d));
  }
  if (q) {
    const like = `%${q}%`;
    filters.push(or(
      ilike(customerActivityLogsTable.telegramUsername, like),
      ilike(customerActivityLogsTable.eventType, like),
      ilike(customerActivityLogsTable.entityId, like),
      ilike(customerActivityLogsTable.actorUsername, like),
    ));
  }

  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(customerActivityLogsTable)
      .where(where)
      .orderBy(desc(customerActivityLogsTable.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(customerActivityLogsTable).where(where),
  ]);

  // Distinct facets for the filter dropdowns (cheap on small tables, capped)
  const [categories, eventTypes, actorTypes] = await Promise.all([
    db.selectDistinct({ v: customerActivityLogsTable.eventCategory }).from(customerActivityLogsTable).limit(50),
    db.selectDistinct({ v: customerActivityLogsTable.eventType }).from(customerActivityLogsTable).limit(200),
    db.selectDistinct({ v: customerActivityLogsTable.actorType }).from(customerActivityLogsTable).limit(20),
  ]);

  res.json({
    items,
    total,
    limit,
    offset,
    facets: {
      categories: categories.map(r => r.v).filter(Boolean).sort(),
      eventTypes: eventTypes.map(r => r.v).filter(Boolean).sort(),
      actorTypes: actorTypes.map(r => r.v).filter(Boolean).sort(),
    },
  });
});

export default router;
