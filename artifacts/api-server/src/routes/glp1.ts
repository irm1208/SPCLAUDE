import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { glp1LogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { logCustomerActivity } from "../lib/activity-log";

const router: IRouter = Router();

const VALID_WEIGHT_UNITS = ["kg", "lbs"] as const;
type WeightUnit = typeof VALID_WEIGHT_UNITS[number];

// GET /api/glp1 — list all entries for authenticated user (newest first)
router.get("/glp1", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const logs = await db
    .select()
    .from(glp1LogsTable)
    .where(eq(glp1LogsTable.telegramUsername, tg))
    .orderBy(desc(glp1LogsTable.loggedDate));
  res.json(logs);
});

// POST /api/glp1 — create a log entry
router.post("/glp1", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const {
    loggedDate, compoundName, doseMg, weightKg, weightUnit, notes,
    injectionSite, sideEffects, calories, proteinG, waterMl,
  } = req.body as {
    loggedDate: string;
    compoundName: string;
    doseMg: number;
    weightKg?: number | null;
    weightUnit?: string;
    notes?: string | null;
    injectionSite?: string | null;
    sideEffects?: string[] | null;
    calories?: number | null;
    proteinG?: number | null;
    waterMl?: number | null;
  };

  if (!loggedDate || !compoundName || doseMg == null) {
    res.status(400).json({ error: "Missing required fields: loggedDate, compoundName, doseMg" });
    return;
  }

  const resolvedUnit: WeightUnit =
    weightUnit && (VALID_WEIGHT_UNITS as readonly string[]).includes(weightUnit)
      ? (weightUnit as WeightUnit)
      : "kg";

  const id = randomUUID();
  const [inserted] = await db.insert(glp1LogsTable).values({
    id,
    telegramUsername: tg,
    loggedDate: String(loggedDate),
    compoundName: String(compoundName),
    doseMg: String(doseMg),
    weightKg: weightKg != null ? String(weightKg) : null,
    weightUnit: resolvedUnit,
    notes: notes ? String(notes) : null,
    injectionSite: injectionSite ?? null,
    sideEffects: sideEffects && sideEffects.length > 0 ? JSON.stringify(sideEffects) : null,
    calories: calories != null ? String(calories) : null,
    proteinG: proteinG != null ? String(proteinG) : null,
    waterMl: waterMl != null ? String(waterMl) : null,
  }).returning();

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "glp1",
    eventType: "glp1.shot_logged",
    entityId: id,
    actorType: "customer",
    metadata: {
      date: loggedDate,
      compoundName,
      doseMg,
      injectionSite: injectionSite ?? null,
      weightKg: weightKg ?? null,
      weightUnit: resolvedUnit,
      sideEffects: sideEffects ?? null,
      calories: calories ?? null,
      proteinG: proteinG ?? null,
      waterMl: waterMl ?? null,
      notes: notes ?? null,
    },
  }).catch(() => {});

  res.status(201).json(inserted);
});

// PATCH /api/glp1/:id — update a log entry
router.patch("/glp1/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select()
    .from(glp1LogsTable)
    .where(and(eq(glp1LogsTable.id, id), eq(glp1LogsTable.telegramUsername, tg)));

  if (!existing) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  type Glp1Update = Partial<{
    loggedDate: string;
    compoundName: string;
    doseMg: string;
    weightKg: string | null;
    weightUnit: string;
    notes: string | null;
    injectionSite: string | null;
    sideEffects: string | null;
    calories: string | null;
    proteinG: string | null;
    waterMl: string | null;
  }>;

  const updates: Glp1Update = {};
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  const trackField = (key: keyof Glp1Update, oldVal: unknown, newVal: unknown) => {
    if (oldVal !== newVal) {
      before[key] = oldVal;
      after[key] = newVal;
    }
  };

  if (body.loggedDate != null) { updates.loggedDate = String(body.loggedDate); trackField("loggedDate", existing.loggedDate, updates.loggedDate); }
  if (body.compoundName != null) { updates.compoundName = String(body.compoundName); trackField("compoundName", existing.compoundName, updates.compoundName); }
  if (body.doseMg != null) { updates.doseMg = String(body.doseMg); trackField("doseMg", existing.doseMg, updates.doseMg); }
  if ("weightKg" in body) { updates.weightKg = body.weightKg != null ? String(body.weightKg) : null; trackField("weightKg", existing.weightKg, updates.weightKg); }
  if (body.weightUnit != null) { updates.weightUnit = String(body.weightUnit); trackField("weightUnit", existing.weightUnit, updates.weightUnit); }
  if ("notes" in body) { updates.notes = body.notes ? String(body.notes) : null; trackField("notes", existing.notes, updates.notes); }
  if ("injectionSite" in body) { updates.injectionSite = body.injectionSite ? String(body.injectionSite) : null; trackField("injectionSite", existing.injectionSite, updates.injectionSite); }
  if ("sideEffects" in body) {
    const se = Array.isArray(body.sideEffects) ? JSON.stringify(body.sideEffects) : null;
    updates.sideEffects = se;
    trackField("sideEffects", existing.sideEffects, updates.sideEffects);
  }
  if ("calories" in body) { updates.calories = body.calories != null ? String(body.calories) : null; trackField("calories", existing.calories, updates.calories); }
  if ("proteinG" in body) { updates.proteinG = body.proteinG != null ? String(body.proteinG) : null; trackField("proteinG", existing.proteinG, updates.proteinG); }
  if ("waterMl" in body) { updates.waterMl = body.waterMl != null ? String(body.waterMl) : null; trackField("waterMl", existing.waterMl, updates.waterMl); }

  const [updated] = await db
    .update(glp1LogsTable)
    .set(updates)
    .where(eq(glp1LogsTable.id, id))
    .returning();

  if (Object.keys(before).length > 0) {
    logCustomerActivity({
      telegramUsername: tg,
      eventCategory: "glp1",
      eventType: "glp1.shot_updated",
      entityId: id,
      actorType: "customer",
      metadata: { before, after },
    }).catch(() => {});
  }

  res.json(updated);
});

// DELETE /api/glp1/:id — account-scoped delete
router.delete("/glp1/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select()
    .from(glp1LogsTable)
    .where(and(eq(glp1LogsTable.id, id), eq(glp1LogsTable.telegramUsername, tg)));

  if (!existing) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  await db.delete(glp1LogsTable)
    .where(and(eq(glp1LogsTable.id, id), eq(glp1LogsTable.telegramUsername, tg)));

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "glp1",
    eventType: "glp1.shot_deleted",
    entityId: id,
    actorType: "customer",
    metadata: { snapshot: existing },
  }).catch(() => {});

  res.json({ ok: true });
});

export default router;
