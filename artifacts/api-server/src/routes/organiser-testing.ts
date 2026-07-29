import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  db,
  gbTestingContributionsTable,
  gbTestingRoundsTable,
  groupBuyProductsTable,
  groupBuysTable,
  labTestsTable,
  productsTable,
} from "@workspace/db";
import { requireOrganiser } from "../middleware/require-organiser";

const router: IRouter = Router();
const ROUND_STATUSES = new Set(["active", "closed", "sent_to_lab", "results_received"]);

async function canAccessGroupBuy(req: Request, groupBuyId: string): Promise<boolean> {
  if (req.organiser?.isAdmin) return req.organiser.adminGbId === groupBuyId;
  const [groupBuy] = await db
    .select({ organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId))
    .limit(1);
  return Boolean(groupBuy && groupBuy.organiserId === req.organiser?.telegramUsername);
}

function formatRound(round: typeof gbTestingRoundsTable.$inferSelect) {
  return {
    ...round,
    contributionAmount: Number(round.contributionAmount),
    labShippingCost: round.labShippingCost == null ? null : Number(round.labShippingCost),
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
    resultPostedAt: round.resultPostedAt?.toISOString() ?? null,
  };
}

async function loadTestingPool(groupBuyId: string) {
  const [rounds, productRows, labTests, contributionRows] = await Promise.all([
    db.select().from(gbTestingRoundsTable)
      .where(eq(gbTestingRoundsTable.groupBuyId, groupBuyId))
      .orderBy(desc(gbTestingRoundsTable.createdAt))
      .limit(1),
    db.select({
      id: productsTable.id,
      name: productsTable.name,
      vendor: productsTable.vendor,
      category: productsTable.category,
      price: productsTable.price,
      stock: productsTable.stock,
    })
      .from(groupBuyProductsTable)
      .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
      .where(and(eq(groupBuyProductsTable.groupBuyId, groupBuyId), eq(groupBuyProductsTable.active, true))),
    db.select().from(labTestsTable)
      .where(eq(labTestsTable.groupBuyId, groupBuyId))
      .orderBy(desc(labTestsTable.createdAt)),
    db.select({ status: gbTestingContributionsTable.status })
      .from(gbTestingContributionsTable)
      .where(eq(gbTestingContributionsTable.gbId, groupBuyId)),
  ]);

  const contributions = contributionRows.reduce((counts, contribution) => {
    if (contribution.status === "pending") counts.pending += 1;
    else if (contribution.status === "confirmed") counts.confirmed += 1;
    else if (contribution.status === "rejected") counts.rejected += 1;
    counts.total += 1;
    return counts;
  }, { pending: 0, confirmed: 0, rejected: 0, total: 0 });

  return {
    round: rounds[0] ? formatRound(rounds[0]) : null,
    products: productRows.map(product => ({ ...product, price: Number(product.price) })),
    labTests,
    contributions,
  };
}

router.get("/organiser/group-buys/:gbId/testing", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  res.json(await loadTestingPool(groupBuyId));
});

router.post("/organiser/group-buys/:gbId/testing", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  const [existing] = await db.select({ id: gbTestingRoundsTable.id })
    .from(gbTestingRoundsTable)
    .where(and(eq(gbTestingRoundsTable.groupBuyId, groupBuyId), ne(gbTestingRoundsTable.status, "results_received")))
    .limit(1);
  if (existing) { res.status(409).json({ error: "A testing round is already active for this group buy" }); return; }

  const body = req.body as Record<string, unknown>;
  const anyContribution = Boolean(body.anyContribution);
  const amount = Number(body.contributionAmount ?? 15);
  if (!anyContribution && (!Number.isFinite(amount) || amount <= 0)) {
    res.status(400).json({ error: "contributionAmount must be a positive number" });
    return;
  }
  await db.insert(gbTestingRoundsTable).values({
    id: randomUUID(),
    groupBuyId,
    contributionAmount: anyContribution ? "0.00" : amount.toFixed(2),
    anyContribution,
    voteOptions: Array.isArray(body.voteOptions) ? body.voteOptions.map(String).filter(Boolean) : null,
    testOptions: Array.isArray(body.testOptions) ? body.testOptions.map(String).filter(Boolean) : null,
  });
  await db.update(groupBuysTable).set({ testingEnabled: true }).where(eq(groupBuysTable.id, groupBuyId));
  res.status(201).json(await loadTestingPool(groupBuyId));
});

router.patch("/organiser/group-buys/:gbId/testing", requireOrganiser, async (req, res): Promise<void> => {
  const groupBuyId = String(req.params.gbId);
  if (!await canAccessGroupBuy(req, groupBuyId)) { res.status(403).json({ error: "Not your Group Buy" }); return; }
  const [round] = await db.select().from(gbTestingRoundsTable)
    .where(eq(gbTestingRoundsTable.groupBuyId, groupBuyId))
    .orderBy(desc(gbTestingRoundsTable.createdAt))
    .limit(1);
  if (!round) { res.status(404).json({ error: "No testing round found" }); return; }

  const body = req.body as Record<string, unknown>;
  const updates: Partial<typeof gbTestingRoundsTable.$inferInsert> = {};
  if (ROUND_STATUSES.has(String(body.status))) updates.status = String(body.status);
  if (body.contributionAmount !== undefined) {
    const amount = Number(body.contributionAmount);
    if (!Number.isFinite(amount) || amount <= 0) { res.status(400).json({ error: "contributionAmount must be a positive number" }); return; }
    updates.contributionAmount = amount.toFixed(2);
  }
  if (body.anyContribution !== undefined) updates.anyContribution = Boolean(body.anyContribution);
  if (body.fundingNote === null || typeof body.fundingNote === "string") updates.fundingNote = body.fundingNote ? String(body.fundingNote).trim() : null;
  if (body.resultNotes === null || typeof body.resultNotes === "string") updates.resultNotes = body.resultNotes ? String(body.resultNotes).trim() : null;
  if (body.resultPdfUrl === null || typeof body.resultPdfUrl === "string") updates.resultPdfUrl = body.resultPdfUrl ? String(body.resultPdfUrl).trim() : null;
  if (body.voteOptions === null || Array.isArray(body.voteOptions)) updates.voteOptions = Array.isArray(body.voteOptions) ? body.voteOptions.map(String).filter(Boolean) : null;
  if (body.testOptions === null || Array.isArray(body.testOptions)) updates.testOptions = Array.isArray(body.testOptions) ? body.testOptions.map(String).filter(Boolean) : null;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  await db.update(gbTestingRoundsTable).set(updates).where(eq(gbTestingRoundsTable.id, round.id));
  res.json(await loadTestingPool(groupBuyId));
});

export default router;
