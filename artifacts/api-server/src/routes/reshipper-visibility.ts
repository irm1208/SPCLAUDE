import { Router, type IRouter } from "express";
import { db, gbReshippersTable, siteConfigTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireReshipper } from "../middleware/require-reshipper";

const router: IRouter = Router();
// Assignment IDs are stable across username changes, and private to each reshipper.
const keyFor = (id: string) => `reshipper_hidden_assignment:${id}`;

router.get("/reshipper/hidden-group-buys", requireReshipper, async (req, res) => {
  try {
    const assignments = await db.select().from(gbReshippersTable)
      .where(eq(gbReshippersTable.reshipperUsername, req.reshipper!.telegramUsername));
    const saved = assignments.length ? await db.select().from(siteConfigTable)
      .where(inArray(siteConfigTable.key, assignments.map(a => keyFor(a.id)))) : [];
    const hidden = new Set(saved.filter(row => row.value === "true").map(row => row.key));
    res.json({ hiddenGroupBuyIds: [...new Set(assignments.filter(a => hidden.has(keyFor(a.id))).map(a => a.gbId))] });
  } catch (error) {
    console.error("[reshipper-visibility] Read failed", error);
    res.status(500).json({ error: "Could not load hidden group buys. Please retry." });
  }
});

router.patch("/reshipper/gb/:gbId/visibility", requireReshipper, async (req, res) => {
  if (typeof req.body?.hidden !== "boolean") {
    res.status(400).json({ error: "hidden must be true or false" });
    return;
  }
  try {
    const assignments = await db.select().from(gbReshippersTable).where(and(
      eq(gbReshippersTable.reshipperUsername, req.reshipper!.telegramUsername),
      eq(gbReshippersTable.gbId, String(req.params.gbId)),
    ));
    if (!assignments.length) {
      res.status(403).json({ error: "You are not assigned to this group buy as a reshipper." });
      return;
    }
    const value = String(req.body.hidden);
    // One atomic upsert also covers reshippers with multiple country assignments.
    await db.insert(siteConfigTable).values(assignments.map(a => ({ key: keyFor(a.id), value })))
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
    res.json({ gbId: String(req.params.gbId), hidden: req.body.hidden });
  } catch (error) {
    console.error("[reshipper-visibility] Save failed", error);
    res.status(500).json({ error: "Could not save this choice. Please retry." });
  }
});

export default router;
