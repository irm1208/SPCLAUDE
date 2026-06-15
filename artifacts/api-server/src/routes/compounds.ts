import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { compoundLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { logCustomerActivity } from "../lib/activity-log";

const router: IRouter = Router();

// GET /api/compounds — list all for authenticated user (newest first)
router.get("/compounds", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const compounds = await db
    .select()
    .from(compoundLogsTable)
    .where(eq(compoundLogsTable.telegramUsername, tg))
    .orderBy(desc(compoundLogsTable.startDate));
  res.json(compounds);
});

// POST /api/compounds — create a compound log
router.post("/compounds", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { compoundName, compoundType, doseAmount, doseUnit, frequency, route, startDate, endDate, notes } = req.body as {
    compoundName: string;
    compoundType: string;
    doseAmount: number;
    doseUnit: string;
    frequency: string;
    route: string;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
  };

  if (!compoundName || !compoundType || doseAmount == null || !doseUnit || !frequency || !route || !startDate) {
    res.status(400).json({ error: "Missing required fields: compoundName, compoundType, doseAmount, doseUnit, frequency, route, startDate" });
    return;
  }

  const id = randomUUID();
  const [inserted] = await db.insert(compoundLogsTable).values({
    id,
    telegramUsername: tg,
    compoundName: String(compoundName),
    compoundType: String(compoundType),
    doseAmount: String(doseAmount),
    doseUnit: String(doseUnit),
    frequency: String(frequency),
    route: String(route),
    startDate: String(startDate),
    endDate: endDate ? String(endDate) : null,
    notes: notes ? String(notes) : null,
  }).returning();

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "compound",
    eventType: "compound.log_created",
    entityId: id,
    actorType: "customer",
    metadata: {
      compoundName,
      compoundType,
      doseAmount,
      doseUnit,
      frequency,
      route,
      startDate,
      endDate: endDate ?? null,
      notes: notes ?? null,
    },
  }).catch(() => {});

  res.status(201).json(inserted);
});

// PATCH /api/compounds/:id — update (e.g. set endDate to close a protocol)
router.patch("/compounds/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select()
    .from(compoundLogsTable)
    .where(and(eq(compoundLogsTable.id, id), eq(compoundLogsTable.telegramUsername, tg)));

  if (!existing) {
    res.status(404).json({ error: "Compound not found" });
    return;
  }

  type CompoundUpdate = Partial<{
    compoundName: string;
    compoundType: string;
    doseAmount: string;
    doseUnit: string;
    frequency: string;
    route: string;
    startDate: string;
    endDate: string | null;
    notes: string | null;
  }>;

  const updates: CompoundUpdate = {};
  const body = req.body as Record<string, unknown>;
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  const track = (key: string, oldVal: unknown, newVal: unknown) => {
    if (oldVal !== newVal) { before[key] = oldVal; after[key] = newVal; }
  };

  if (body.compoundName != null) { updates.compoundName = String(body.compoundName); track("compoundName", existing.compoundName, updates.compoundName); }
  if (body.compoundType != null) { updates.compoundType = String(body.compoundType); track("compoundType", existing.compoundType, updates.compoundType); }
  if (body.doseAmount != null) { updates.doseAmount = String(body.doseAmount); track("doseAmount", existing.doseAmount, updates.doseAmount); }
  if (body.doseUnit != null) { updates.doseUnit = String(body.doseUnit); track("doseUnit", existing.doseUnit, updates.doseUnit); }
  if (body.frequency != null) { updates.frequency = String(body.frequency); track("frequency", existing.frequency, updates.frequency); }
  if (body.route != null) { updates.route = String(body.route); track("route", existing.route, updates.route); }
  if (body.startDate != null) { updates.startDate = String(body.startDate); track("startDate", existing.startDate, updates.startDate); }
  if ("endDate" in body) { updates.endDate = body.endDate ? String(body.endDate) : null; track("endDate", existing.endDate, updates.endDate); }
  if ("notes" in body) { updates.notes = body.notes ? String(body.notes) : null; track("notes", existing.notes, updates.notes); }

  const [updated] = await db
    .update(compoundLogsTable)
    .set(updates)
    .where(eq(compoundLogsTable.id, id))
    .returning();

  if (Object.keys(before).length > 0) {
    const isEnded = !existing.endDate && updates.endDate;
    if (isEnded) {
      const startDate = existing.startDate;
      const endDateStr = updates.endDate!;
      const start = new Date(startDate);
      const end = new Date(endDateStr);
      const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      logCustomerActivity({
        telegramUsername: tg,
        eventCategory: "compound",
        eventType: "compound.log_ended",
        entityId: id,
        actorType: "customer",
        metadata: { compoundName: existing.compoundName, endDate: endDateStr, durationDays },
      }).catch(() => {});
    } else {
      logCustomerActivity({
        telegramUsername: tg,
        eventCategory: "compound",
        eventType: "compound.log_updated",
        entityId: id,
        actorType: "customer",
        metadata: { before, after },
      }).catch(() => {});
    }
  }

  res.json(updated);
});

// DELETE /api/compounds/:id
router.delete("/compounds/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select()
    .from(compoundLogsTable)
    .where(and(eq(compoundLogsTable.id, id), eq(compoundLogsTable.telegramUsername, tg)));

  if (!existing) {
    res.status(404).json({ error: "Compound not found" });
    return;
  }

  await db.delete(compoundLogsTable).where(eq(compoundLogsTable.id, id));

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "compound",
    eventType: "compound.log_deleted",
    entityId: id,
    actorType: "customer",
    metadata: { snapshot: existing },
  }).catch(() => {});

  res.json({ ok: true });
});

export default router;
