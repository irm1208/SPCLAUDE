import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { plotterCyclesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAccount } from "../middleware/account-auth";

const router: IRouter = Router();

// GET /api/plotter — load current cycle for authenticated user
router.get("/plotter", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const [row] = await db
    .select()
    .from(plotterCyclesTable)
    .where(eq(plotterCyclesTable.telegramUsername, tg));

  if (!row) {
    res.json({ entries: [], totalWeeks: 16 });
    return;
  }

  try {
    const entries = JSON.parse(row.entriesJson);
    res.json({ entries, totalWeeks: row.totalWeeks });
  } catch {
    res.json({ entries: [], totalWeeks: 16 });
  }
});

interface PlotEntryPayload {
  id: string;
  name: string;
  dose: number;
  freqH: number;
  startWeek: number;
  endWeek: number;
  color: string;
  halfLifeDays: number;
}

function isValidEntry(e: unknown): e is PlotEntryPayload {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" && o.name.length > 0 &&
    typeof o.dose === "number" && o.dose > 0 &&
    typeof o.freqH === "number" && o.freqH > 0 &&
    typeof o.startWeek === "number" && o.startWeek >= 0 &&
    typeof o.endWeek === "number" && o.endWeek > o.startWeek &&
    typeof o.color === "string" &&
    typeof o.halfLifeDays === "number" && o.halfLifeDays > 0
  );
}

// PUT /api/plotter — upsert cycle (single active cycle per account)
router.put("/plotter", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const body = req.body as { entries?: unknown; totalWeeks?: unknown };

  if (!Array.isArray(body.entries)) {
    res.status(400).json({ error: "entries must be an array" });
    return;
  }

  const invalidIdx = body.entries.findIndex(e => !isValidEntry(e));
  if (invalidIdx !== -1) {
    res.status(400).json({ error: `entries[${invalidIdx}] has invalid or missing fields` });
    return;
  }

  const weeks =
    typeof body.totalWeeks === "number" && body.totalWeeks > 0
      ? Math.round(body.totalWeeks)
      : 16;

  const entriesJson = JSON.stringify(body.entries as PlotEntryPayload[]);

  await db
    .insert(plotterCyclesTable)
    .values({ telegramUsername: tg, entriesJson, totalWeeks: weeks })
    .onConflictDoUpdate({
      target: plotterCyclesTable.telegramUsername,
      set: {
        entriesJson,
        totalWeeks: weeks,
        updatedAt: sql`now()`,
      },
    });

  res.json({ ok: true });
});

// DELETE /api/plotter — clear cycle
router.delete("/plotter", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  await db
    .delete(plotterCyclesTable)
    .where(eq(plotterCyclesTable.telegramUsername, tg));
  res.json({ ok: true });
});

export default router;
