import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  testingPoolsTable,
  poolTestsTable,
  poolParticipantsTable,
  poolTestResultsTable,
  poolMessagesTable,
  testCatalogTable,
  accountsTable,
  supplierTestingGroupsTable,
  supplierTestingInterestsTable,
  supplierTestingMembershipsTable,
  type PoolPaymentMethod,
} from "@workspace/db";
import { and, desc, eq, inArray, not, sql } from "drizzle-orm";
import { requireAccount, getOptionalAccountSession } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { writeLog } from "../lib/audit-log";
import { sendAdminFromTemplate, notifyUserFromTemplate, notifyUser } from "../lib/telegram";
import { isEthErc20StableRail, ERC20_STABLE_CURRENCIES } from "../lib/payment-verify";
import { computeTestingPoolTarget, DEFAULT_MAX_VIAL_COUNT, fitsTestingPoolTarget, parsePoolVialCount, validatePoolVialQuantities, parsePoolTestPriceUsd, parseStrictPoolMoney } from "../lib/testing-pool-pricing";
import { supplierTestingIdentity, testingUsername } from "../lib/supplier-testing";
import { loadSupplierTestingItems } from "../lib/supplier-testing-service";
import { getVendors } from "./config";

const router: IRouter = Router();

// Optional account: only grant owner privileges to an unrestricted live session.
async function loadOptionalAccount(req: any): Promise<void> {
  req.account = await getOptionalAccountSession(req);
}

function nanoid(n = 14): string {
  return randomBytes(n).toString("base64url").slice(0, n);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "pool";
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? root : `${root}-${nanoid(4).toLowerCase()}`;
    const [hit] = await db.select({ id: testingPoolsTable.id }).from(testingPoolsTable).where(eq(testingPoolsTable.slug, candidate));
    if (!hit) return candidate;
  }
  return `${root}-${nanoid(6).toLowerCase()}`;
}

function num(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

async function recomputeTarget(poolId: string): Promise<number> {
  return recomputeTargetUsing(db, poolId);
}

function projectedPoolTarget(
  tests: Array<{ unitPriceUsd: string | number; quantity?: unknown; selected?: unknown }>,
  costs: { extraVialPriceUsd: number; vialCostUsd: number; shippingCostUsd: number; organiserTipUsd: number },
): number {
  const selected = tests.filter(test => test.selected !== false);
  return computeTestingPoolTarget(selected, Number(selected[0]?.quantity ?? 1), costs);
}

function poolCostsWithUpdates(pool: typeof testingPoolsTable.$inferSelect, updates: Partial<typeof testingPoolsTable.$inferInsert> = {}) {
  return {
    extraVialPriceUsd: num(updates.extraVialPriceUsd ?? pool.extraVialPriceUsd),
    vialCostUsd: num(updates.vialCostUsd ?? pool.vialCostUsd),
    shippingCostUsd: num(updates.shippingCostUsd ?? pool.shippingCostUsd),
    organiserTipUsd: num(updates.organiserTipUsd ?? pool.organiserTipUsd),
  };
}

async function recomputeTargetUsing(database: any, poolId: string): Promise<number> {
  const tests = await database.select().from(poolTestsTable).where(and(eq(poolTestsTable.poolId, poolId), eq(poolTestsTable.selected, true)));
  const [pool] = await database.select({
    extraVialPriceUsd: testingPoolsTable.extraVialPriceUsd,
    vialCostUsd: testingPoolsTable.vialCostUsd,
    shippingCostUsd: testingPoolsTable.shippingCostUsd,
    organiserTipUsd: testingPoolsTable.organiserTipUsd,
  }).from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
  const qty = tests.length > 0 ? (tests[0].quantity || 1) : 1;
  const total = computeTestingPoolTarget(tests, qty, {
    extraVialPriceUsd: num(pool?.extraVialPriceUsd),
    vialCostUsd: num(pool?.vialCostUsd),
    shippingCostUsd: num(pool?.shippingCostUsd),
    organiserTipUsd: num(pool?.organiserTipUsd),
  });
  if (!fitsTestingPoolTarget(total)) throw new Error("Testing pool target exceeds the supported USD limit");
  await database.update(testingPoolsTable).set({ targetAmountUsd: total.toFixed(2) }).where(eq(testingPoolsTable.id, poolId));
  return total;
}

function poolMoneyInput(body: Record<string, unknown>, key: string, fallback: number): number | null {
  if (!(key in body)) return fallback;
  return parseStrictPoolMoney(body[key]);
}

function maxVialCountInput(body: Record<string, unknown>): number | null {
  return "maxVialCount" in body ? parsePoolVialCount(body.maxVialCount) : DEFAULT_MAX_VIAL_COUNT;
}

async function exceedsPoolVialMaximum(poolId: string, maximum: number): Promise<boolean> {
  const tests = await db.select({ quantity: poolTestsTable.quantity }).from(poolTestsTable).where(eq(poolTestsTable.poolId, poolId));
  return tests.some(test => test.quantity > maximum);
}

function failInvalidPoolMoney(res: any, field: string): void {
  res.status(400).json({ error: `${field} must be a non-negative amount with at most two decimal places` });
}

function parseFixedOptInFee(value: unknown): { valid: boolean; amount: number | null } {
  if (value === null) return { valid: true, amount: null };
  const amount = parseStrictPoolMoney(value);
  if (amount == null || amount < 1) return { valid: false, amount: null };
  return { valid: true, amount };
}

function failInvalidFixedOptInFee(res: any): void {
  res.status(400).json({ error: "fixedOptInFeeUsd must be null or a USD amount of at least $1 with at most two decimal places" });
}

type PoolTestReplacement = {
  id?: unknown;
  catalogId?: unknown;
  code?: unknown;
  name?: unknown;
  unitPriceUsd?: unknown;
  quantity?: unknown;
  selected?: unknown;
  janoshikUrl?: unknown;
};

type ValidatedPoolTest = PoolTestReplacement & {
  id?: string;
  code: string;
  name: string;
  unitPriceUsd: number;
  quantity?: unknown;
  selected?: unknown;
  catalogId?: unknown;
};

function validatePoolTestsInput(input: unknown): { tests: ValidatedPoolTest[] | null; error?: string } {
  if (!Array.isArray(input)) return { tests: null, error: "tests array required" };
  if (input.length > 500) return { tests: null, error: "tests may contain at most 500 entries" };
  const tests: ValidatedPoolTest[] = [];
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { tests: null, error: "Each test must be an object" };
    }
    const test = value as PoolTestReplacement;
    if (typeof test.code !== "string" || !test.code.trim() || typeof test.name !== "string" || !test.name.trim()) {
      return { tests: null, error: "Each test requires a code and name" };
    }
    const unitPriceUsd = parsePoolTestPriceUsd(test.unitPriceUsd);
    if (unitPriceUsd == null) {
      return { tests: null, error: "Each test unitPriceUsd must be a finite non-negative USD amount with at most two decimal places (maximum $99,999,999.99)" };
    }
    if (Object.prototype.hasOwnProperty.call(test, "id") && (typeof test.id !== "string" || !test.id.trim())) {
      return { tests: null, error: "Each provided test ID must be a nonempty string" };
    }
    tests.push({
      ...(typeof test.id === "string" ? { id: test.id } : {}),
      catalogId: test.catalogId,
      code: test.code,
      name: test.name,
      unitPriceUsd,
      quantity: test.quantity,
      selected: test.selected,
      janoshikUrl: test.janoshikUrl,
    });
  }
  return { tests };
}

type ReplacePoolTestsOptions = {
  poolUpdates?: { kind: "admin" | "leader"; values: Record<string, unknown> };
};

type PoolSettingsBuild =
  | {
      ok: true;
      updates: Partial<typeof testingPoolsTable.$inferInsert>;
      pricingChanged: boolean;
      moneyChanged: boolean;
      wasResultsReceived: boolean;
    }
  | { ok: false; status: number; message: string };

async function supplierPoolIdentityChanged(pool: typeof testingPoolsTable.$inferSelect, body: Record<string, unknown>) {
  const changed = (["compoundName", "manufacturer", "batchNumber", "mgSize"] as const)
    .some(key => Object.hasOwn(body, key) && (body[key] || null) !== (pool[key] || null));
  if (!changed) return false;
  const [group] = await db.select({ id: supplierTestingGroupsTable.id }).from(supplierTestingGroupsTable)
    .where(eq(supplierTestingGroupsTable.poolId, pool.id));
  return !!group;
}

async function replacePoolTests(
  poolId: string,
  input: ValidatedPoolTest[],
  options: ReplacePoolTestsOptions = {},
): Promise<{ blocked: boolean; targetAmountUsd?: number; error?: { status: number; message: string }; wasResultsReceived?: boolean }> {
  return db.transaction(async (tx) => {
    let settingsUpdate: PoolSettingsBuild | null = null;
    const [pool] = await tx.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
    if (!pool) return { blocked: false, error: { status: 404, message: "Pool not found" } };
    if (options.poolUpdates !== undefined) {
      settingsUpdate = options.poolUpdates.kind === "admin"
        ? await buildAdminPoolUpdates(pool, options.poolUpdates.values)
        : await buildLeaderPoolUpdates(pool, options.poolUpdates.values);
      if (!settingsUpdate.ok) {
        return { blocked: false, error: { status: settingsUpdate.status, message: settingsUpdate.message } };
      }
    }
    const maxVialCount = settingsUpdate?.ok && settingsUpdate.updates.maxVialCount != null
      ? settingsUpdate.updates.maxVialCount : pool.maxVialCount;
    if (validatePoolVialQuantities(input, maxVialCount) == null) {
      return { blocked: false, error: { status: 400, message: "All tests must use the same whole vial count, between 1 and the pool maximum" } };
    }
    if (!fitsTestingPoolTarget(projectedPoolTarget(input, poolCostsWithUpdates(pool, settingsUpdate?.ok ? settingsUpdate.updates : {})))) {
      return { blocked: false, error: { status: 400, message: "Pool funding goal exceeds $99,999,999.99" } };
    }

    const [payments] = await tx.select({
      count: sql<string>`count(*) filter (where ${poolParticipantsTable.paymentStatus} in ('submitted','verified'))`,
    }).from(poolParticipantsTable).where(eq(poolParticipantsTable.poolId, poolId));
    if (Number(payments?.count ?? 0) > 0) return { blocked: true };

    const existing = await tx.select().from(poolTestsTable).where(eq(poolTestsTable.poolId, poolId));
    const unused = new Set(existing.map((test: any) => test.id));
    const seenIds = new Set<string>();
    for (const test of input) {
      if (!Object.prototype.hasOwnProperty.call(test, "id")) continue;
      if (typeof test.id !== "string" || !test.id.trim() || seenIds.has(test.id)) {
        return { blocked: false, error: { status: 400, message: "Each provided test ID must be unique and belong to this pool" } };
      }
      if (!existing.some((row: any) => row.id === test.id)) {
        return { blocked: false, error: { status: 400, message: "A provided test ID does not belong to this pool" } };
      }
      seenIds.add(test.id);
    }
    seenIds.clear();
    for (const test of input) {
      const hasId = Object.prototype.hasOwnProperty.call(test, "id");
      const requestedId = hasId ? test.id as string : null;
      let match = requestedId ? existing.find((row: any) => row.id === requestedId && unused.has(row.id)) : undefined;
      if (requestedId) seenIds.add(requestedId);
      const catalogId = test.catalogId ? String(test.catalogId).slice(0, 64) : null;
      if (!requestedId && catalogId) {
        match = existing.find((row: any) => unused.has(row.id) && row.catalogId === catalogId);
      }
      if (!requestedId && !match) {
        match = existing.find((row: any) => unused.has(row.id) && !row.catalogId && row.code === String(test.code).slice(0, 60));
      }

      const next: {
        poolId: string;
        catalogId: string | null;
        code: string;
        name: string;
        unitPriceUsd: string;
        quantity: number;
        selected: boolean;
        janoshikUrl?: string | null;
      } = {
        poolId,
        catalogId,
        code: String(test.code).slice(0, 60),
        name: String(test.name).slice(0, 200),
        unitPriceUsd: test.unitPriceUsd.toFixed(2),
        quantity: Math.max(1, parseInt(String(test.quantity ?? 1), 10) || 1),
        selected: test.selected !== false,
      };
      if (Object.prototype.hasOwnProperty.call(test, "janoshikUrl")) {
        next.janoshikUrl = test.janoshikUrl ? String(test.janoshikUrl).slice(0, 500) : null;
      }

      if (match) {
        unused.delete(match.id);
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(next)) {
          if (key === "poolId") continue;
          if (key === "janoshikUrl" && !Object.prototype.hasOwnProperty.call(test, "janoshikUrl")) continue;
          if (String((match as any)[key] ?? "") !== String(value ?? "")) changes[key] = value;
        }
        if (Object.keys(changes).length > 0) {
          await tx.update(poolTestsTable).set(changes).where(and(
            eq(poolTestsTable.id, match.id),
            eq(poolTestsTable.poolId, poolId),
          ));
        }
      } else {
        await tx.insert(poolTestsTable).values({ id: nanoid(12), ...next });
      }
    }

    for (const removedId of unused) {
      await tx.delete(poolTestsTable).where(and(
        eq(poolTestsTable.id, removedId),
        eq(poolTestsTable.poolId, poolId),
      ));
    }
    if (settingsUpdate?.ok && Object.keys(settingsUpdate.updates).length > 0) {
      await tx.update(testingPoolsTable).set(settingsUpdate.updates).where(eq(testingPoolsTable.id, poolId));
    }
    const targetAmountUsd = await recomputeTargetUsing(tx, poolId);
    return { blocked: false, targetAmountUsd, wasResultsReceived: settingsUpdate?.ok ? settingsUpdate.wasResultsReceived : false };
  });
}

async function hasSubmittedOrVerifiedContributions(poolId: string): Promise<boolean> {
  const [row] = await db.select({
    count: sql<string>`count(*)`,
  }).from(poolParticipantsTable).where(and(
    eq(poolParticipantsTable.poolId, poolId),
    inArray(poolParticipantsTable.paymentStatus, ["submitted", "verified"]),
  ));
  return Number(row?.count ?? 0) > 0;
}

async function requirePoolAccess(req: any, res: any, pool: typeof testingPoolsTable.$inferSelect): Promise<boolean> {
  const [supplierGroup] = await db.select().from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.poolId, pool.id));
  if (supplierGroup) {
    await loadOptionalAccount(req);
    if (!req.account) { res.status(401).json({ error: "Sign in to view your supplier testing group." }); return false; }
    const [interest] = await db.select({ id: supplierTestingInterestsTable.id }).from(supplierTestingInterestsTable).where(and(
      eq(supplierTestingInterestsTable.groupId, supplierGroup.id),
      sql`lower(ltrim(${supplierTestingInterestsTable.accountUsername}, '@')) = ${testingUsername(req.account.telegramUsername)}`,
    ));
    if (!interest) { res.status(403).json({ error: "This testing group is for members assigned to this exact supplier product batch." }); return false; }
  }
  if (!pool.inviteOnly) return true;
  await loadOptionalAccount(req);
  if (req.account?.telegramUsername === pool.leaderUsername) return true;
  const code = req.get?.("x-pool-access-code") ?? req.headers?.["x-pool-access-code"];
  if (typeof code === "string" && code.trim() && pool.accessCodeHash && await bcrypt.compare(code.trim(), pool.accessCodeHash)) return true;
  res.status(403).json({ error: "access_code_required", code: "access_code_required" });
  return false;
}

async function requireParticipantPoolAccess(req: any, res: any, poolId: string, participantId?: string): Promise<boolean> {
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
  if (!pool) {
    res.status(404).json({ error: "Pool not found" });
    return false;
  }
  if (!await requirePoolAccess(req, res, pool)) return false;
  if (participantId) {
    const [group] = await db.select({ id: supplierTestingGroupsTable.id }).from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.poolId, poolId));
    if (group) {
      const [participant] = await db.select({ username: poolParticipantsTable.accountUsername }).from(poolParticipantsTable).where(eq(poolParticipantsTable.id, participantId));
      if (!participant?.username || !req.account || testingUsername(participant.username) !== testingUsername(req.account.telegramUsername)) {
        res.status(403).json({ error: "This contribution belongs to another account." }); return false;
      }
    }
  }
  return true;
}

async function computePoolTotals(poolId: string) {
  const [row] = await db
    .select({
      contributors: sql<string>`count(*) filter (where ${poolParticipantsTable.paymentStatus} = 'verified')`,
      raised: sql<string>`coalesce(sum(${poolParticipantsTable.amountUsd}) filter (where ${poolParticipantsTable.paymentStatus} = 'verified'), 0)`,
      pending: sql<string>`count(*) filter (where ${poolParticipantsTable.paymentStatus} in ('pending','submitted'))`,
    })
    .from(poolParticipantsTable)
    .where(eq(poolParticipantsTable.poolId, poolId));
  return {
    contributorCount: parseInt(row?.contributors ?? "0", 10) || 0,
    pendingCount: parseInt(row?.pending ?? "0", 10) || 0,
    raisedUsd: num(row?.raised ?? "0"),
  };
}

// Crypto tokens a pool participant may pay in. When the pool's payout wallet is a
// valid Ethereum ERC-20 address we offer USDC alongside USDT (same wallet, same
// network); otherwise the only option is the pool's single configured currency.
function poolCryptoOptions(payoutCurrency: string | null, payoutNetwork: string | null, payoutWalletAddress: string | null) {
  return isEthErc20StableRail(payoutCurrency, payoutNetwork, payoutWalletAddress)
    ? ERC20_STABLE_CURRENCIES.map(c => ({ currency: c, network: payoutNetwork as string }))
    : (payoutCurrency ? [{ currency: payoutCurrency, network: payoutNetwork ?? "" }] : []);
}

function poolPublicShape(pool: typeof testingPoolsTable.$inferSelect) {
  return {
    id: pool.id,
    slug: pool.slug,
    title: pool.title,
    description: pool.description,
    compoundName: pool.compoundName,
    labName: pool.labName,
    manufacturer: pool.manufacturer,
    leaderUsername: pool.leaderUsername,
    status: pool.status,
    votingMode: pool.votingMode,
    targetAmountUsd: num(pool.targetAmountUsd),
    namedReportPriceUsd: num(pool.namedReportPriceUsd),
    extraVialPriceUsd: num(pool.extraVialPriceUsd),
    maxVialCount: pool.maxVialCount,
    vialCostUsd: num(pool.vialCostUsd),
    shippingCostUsd: num(pool.shippingCostUsd),
    organiserTipUsd: num(pool.organiserTipUsd),
    inviteOnly: pool.inviteOnly ?? false,
    payoutWalletAddress: pool.payoutWalletAddress,
    payoutCurrency: pool.payoutCurrency,
    payoutNetwork: pool.payoutNetwork,
    availableCryptoOptions: poolCryptoOptions(pool.payoutCurrency, pool.payoutNetwork, pool.payoutWalletAddress),
    paymentMethods: normalizePoolPMs((pool.paymentMethods as unknown[] | null) ?? []),
    contributorNamedReportEnabled: pool.contributorNamedReportEnabled ?? false,
    namedReportCap: pool.namedReportCap ?? null,
    allowVialContribution: pool.allowVialContribution ?? false,
    stopOnFunded: pool.stopOnFunded ?? false,
    fixedOptInFeeUsd: pool.fixedOptInFeeUsd != null ? num(pool.fixedOptInFeeUsd) : null,
    batchNumber: pool.batchNumber,
    capColor: pool.capColor,
    mgSize: pool.mgSize,
    manufacturingDate: pool.manufacturingDate,
    imageUrl: pool.imageUrl,
    resultPostedAt: pool.resultPostedAt,
    hasResults: !!pool.resultPostedAt,
    groupBuyId: pool.groupBuyId,
    createdAt: pool.createdAt,
  };
}

// ── Public: GET /api/testing-pools — list approved, visible pools ──────────────
router.get("/testing-pools", async (_req, res): Promise<void> => {
  const pools = await db
    .select()
    .from(testingPoolsTable)
    .where(and(eq(testingPoolsTable.approvalStatus, "approved"), eq(testingPoolsTable.hiddenFromList, false)))
    .orderBy(desc(testingPoolsTable.createdAt));

  const supplierGroups = await db.select({ poolId: supplierTestingGroupsTable.poolId }).from(supplierTestingGroupsTable);
  const supplierPoolIds = new Set(supplierGroups.map(g => g.poolId));
  const out = await Promise.all(
    pools
      .filter(p => p.status !== "draft" && !p.inviteOnly && !supplierPoolIds.has(p.id))
      .map(async p => ({ ...poolPublicShape(p), ...(await computePoolTotals(p.id)) })),
  );
  res.json(out);
});

// ── Public: GET /api/testing-pools/participants/:id/status ────────────────────
// Guest share link endpoint — returns contribution status + pool mini-stats.
// MUST be declared before /testing-pools/:slug to avoid slug catching "participants".
router.get("/testing-pools/participants/:id/status", async (req, res): Promise<void> => {
  try {
    const [participant] = await db
      .select({
        id: poolParticipantsTable.id,
        poolId: poolParticipantsTable.poolId,
        paymentStatus: poolParticipantsTable.paymentStatus,
        amountUsd: poolParticipantsTable.amountUsd,
        createdAt: poolParticipantsTable.createdAt,
        isPublic: poolParticipantsTable.isPublic,
        displayName: poolParticipantsTable.displayName,
      })
      .from(poolParticipantsTable)
      .where(eq(poolParticipantsTable.id, req.params.id));

    if (!participant) { res.status(404).json({ error: "Contribution not found" }); return; }
    if (!await requireParticipantPoolAccess(req, res, participant.poolId, participant.id)) return;

    const [pool] = await db
      .select({
        id: testingPoolsTable.id,
        slug: testingPoolsTable.slug,
        title: testingPoolsTable.title,
        status: testingPoolsTable.status,
        targetAmountUsd: testingPoolsTable.targetAmountUsd,
        resultPostedAt: testingPoolsTable.resultPostedAt,
        resultNotes: testingPoolsTable.resultNotes,
        resultPdfUrl: testingPoolsTable.resultPdfUrl,
      })
      .from(testingPoolsTable)
      .where(eq(testingPoolsTable.id, participant.poolId));

    if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }

    const totals = await computePoolTotals(participant.poolId);
    const [supplierGroup] = await db.select({ id: supplierTestingGroupsTable.id }).from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.poolId, participant.poolId));

    res.json({
      id: participant.id,
      paymentStatus: participant.paymentStatus,
      amountUsd: num(participant.amountUsd),
      isPublic: participant.isPublic ?? false,
      displayName: participant.displayName ?? null,
      createdAt: participant.createdAt,
      pool: {
        id: pool.id,
        slug: pool.slug,
        title: pool.title,
        status: pool.status,
        goalUsd: num(pool.targetAmountUsd),
        hasResults: pool.resultPostedAt != null,
        resultNotes: supplierGroup ? null : pool.resultNotes ?? null,
        resultPdfUrl: supplierGroup ? null : pool.resultPdfUrl ?? null,
      },
      poolTotals: totals,
    });
  } catch (err: any) {
    console.error("[participants/status] error", err?.message ?? err);
    if (!res.headersSent) res.status(500).json({ error: "Internal error" });
  }
});

// ── Public: GET /api/testing-pools/:slug ──────────────────────────────────────
router.get("/testing-pools/:slug", async (req, res): Promise<void> => {
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.slug, req.params.slug));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  await loadOptionalAccount(req);
  const isOwner = req.account?.telegramUsername === pool.leaderUsername && !await isSupplierTestingPool(pool.id);
  if (!isOwner && (pool.approvalStatus !== "approved" || pool.status === "draft")) {
    res.status(404).json({ error: "Pool not found" });
    return;
  }
  if (!await requirePoolAccess(req, res, pool)) return;

  const allTests = await db.select().from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
  // Non-owners never see rejected tests
  const tests = isOwner ? allTests : allTests.filter(t => (t.contributionStatus ?? "active") !== "rejected");
  const totals = await computePoolTotals(pool.id);
  const [supplierGroup] = await db.select({ id: supplierTestingGroupsTable.id }).from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.poolId, pool.id));
  const [myContribution] = supplierGroup && req.account ? await db.select({
    id: poolParticipantsTable.id, amountUsd: poolParticipantsTable.amountUsd,
    paymentStatus: poolParticipantsTable.paymentStatus, paymentMethod: poolParticipantsTable.paymentMethod,
    paymentCurrency: poolParticipantsTable.paymentCurrency, namedReportOptIn: poolParticipantsTable.namedReportOptIn,
    namedReportName: poolParticipantsTable.namedReportName, paymentSubmittedAt: poolParticipantsTable.paymentSubmittedAt,
    paymentTxHash: poolParticipantsTable.paymentTxHash,
  }).from(poolParticipantsTable).where(and(eq(poolParticipantsTable.poolId, pool.id),
    sql`lower(ltrim(${poolParticipantsTable.accountUsername}, '@')) = ${testingUsername(req.account.telegramUsername)}`)).orderBy(poolParticipantsTable.createdAt) : [];

  const voteCounts: Record<string, number> = {};
  if (pool.votingMode === "vote") {
    const parts = await db
      .select({ voteTestIds: poolParticipantsTable.voteTestIds })
      .from(poolParticipantsTable)
      .where(and(eq(poolParticipantsTable.poolId, pool.id), eq(poolParticipantsTable.paymentStatus, "verified")));
    for (const p of parts) {
      const ids = (p.voteTestIds as string[] | null) ?? [];
      for (const id of ids) voteCounts[id] = (voteCounts[id] ?? 0) + 1;
    }
  }

  // Count named report opt-ins (pending + verified, to enforce cap in real time)
  const namedReportRow = await db
    .select({ count: sql<string>`count(*)` })
    .from(poolParticipantsTable)
    .where(and(
      eq(poolParticipantsTable.poolId, pool.id),
      eq(poolParticipantsTable.namedReportOptIn, true),
      not(inArray(poolParticipantsTable.paymentStatus, ["rejected", "refunded"])),
    ));
  const namedReportCount = parseInt(namedReportRow[0]?.count ?? "0", 10);

  // Build public contributor list (verified participants only)
  const verifiedParticipants = await db
    .select({
      id: poolParticipantsTable.id,
      displayName: poolParticipantsTable.displayName,
      isPublic: poolParticipantsTable.isPublic,
      createdAt: poolParticipantsTable.createdAt,
    })
    .from(poolParticipantsTable)
    .where(and(
      eq(poolParticipantsTable.poolId, pool.id),
      eq(poolParticipantsTable.paymentStatus, "verified"),
    ))
    .orderBy(desc(poolParticipantsTable.createdAt));

  const contributors = verifiedParticipants.map(p => ({
    id: p.id,
    name: p.isPublic && p.displayName ? p.displayName : "Anonymous",
    isPublic: p.isPublic ?? false,
  }));

  res.json({
    pool: { ...poolPublicShape(pool), supplierTesting: !!supplierGroup },
    myContribution: myContribution ? { ...myContribution, amountUsd: num(myContribution.amountUsd) } : null,
    tests: tests.map(t => ({
      id: t.id,
      catalogId: t.catalogId,
      code: t.code,
      name: t.name,
      unitPriceUsd: num(t.unitPriceUsd),
      quantity: t.quantity,
      votes: voteCounts[t.id] ?? t.votes ?? 0,
      selected: t.selected,
      contributionStatus: t.contributionStatus ?? "active",
      janoshikUrl: t.janoshikUrl ?? null,
    })),
    contributors,
    namedReportCount,
    ...totals,
  });
});

// ── Public: POST /api/testing-pools/:slug/opt-in ──────────────────────────────
router.post("/testing-pools/:slug/opt-in", async (req, res): Promise<void> => {
  await loadOptionalAccount(req);
  const { contactEmail, contactTelegram, displayName, amountUsd, voteTestIds, paymentMethod, namedReportOptIn, namedReportName, isPublic, canProvideVial, cryptoCurrency } = req.body ?? {};

  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.slug, req.params.slug));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  if (pool.approvalStatus !== "approved") {
    res.status(404).json({ error: "Pool not found" });
    return;
  }
  if (!await requirePoolAccess(req, res, pool)) return;
  if (!["open", "funded"].includes(pool.status)) {
    res.status(400).json({ error: "This pool is not currently accepting contributions" });
    return;
  }
  let supplierContributionKey: string | null = null;
  const [supplierGroup] = await db.select().from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.poolId, pool.id));
  if (supplierGroup) {
    if (!req.account) { res.status(401).json({ error: "Sign in with the account that placed the JBG order." }); return; }
    const username = req.account.telegramUsername;
    const assigned = await db.select().from(supplierTestingInterestsTable).where(and(
      eq(supplierTestingInterestsTable.groupId, supplierGroup.id),
      sql`lower(ltrim(${supplierTestingInterestsTable.accountUsername}, '@')) = ${testingUsername(username)}`,
    )).orderBy(supplierTestingInterestsTable.createdAt, supplierTestingInterestsTable.id);
    const items = await loadSupplierTestingItems(db, await getVendors(), username);
    if (!assigned.length || !assigned.some(i => items.some(item => item.orderId === i.orderId &&
      item.productId === i.productId && item.supplierId === supplierGroup.supplierId && item.eligible))) {
      res.status(403).json({ error: "Join Supplier Testing and wait for staff to confirm your product batch before contributing." }); return;
    }
    const [membership] = await db.select({ id: supplierTestingMembershipsTable.id }).from(supplierTestingMembershipsTable).where(and(
      eq(supplierTestingMembershipsTable.groupId, supplierGroup.id),
      sql`lower(ltrim(${supplierTestingMembershipsTable.accountUsername}, '@')) = ${testingUsername(username)}`,
    ));
    if (!membership) { res.status(403).json({ error: "Your testing membership has not been assigned yet." }); return; }
    supplierContributionKey = supplierTestingIdentity(supplierGroup.id, membership.id);
  }
  if (pool.stopOnFunded && pool.status === "funded") {
    res.status(400).json({ error: "This pool has reached its funding goal and is no longer accepting new contributions" });
    return;
  }

  // Determine amount — fixed fee overrides the provided amount
  let amount: number;
  if (pool.fixedOptInFeeUsd != null) {
    amount = num(pool.fixedOptInFeeUsd);
  } else {
    amount = num(amountUsd);
    if (!(amount >= 1)) { res.status(400).json({ error: "amountUsd must be at least $1" }); return; }
  }

  if (!req.account && !contactTelegram) {
    res.status(400).json({ error: "Telegram or Discord handle is required" });
    return;
  }

  // Validate payment method
  const poolMethods = normalizePoolPMs((pool.paymentMethods as unknown[] | null) ?? []);
  const validMethodTypes = poolMethods.map(m => m.type);
  let chosenMethod: string | null = null;
  if (paymentMethod && typeof paymentMethod === "string") {
    if (!validMethodTypes.includes(paymentMethod as any) && validMethodTypes.length > 0) {
      res.status(400).json({ error: "Invalid payment method for this pool" });
      return;
    }
    chosenMethod = paymentMethod;
  } else if (validMethodTypes.length === 1) {
    chosenMethod = validMethodTypes[0];
  }

  // Named report
  const namedOptIn = pool.contributorNamedReportEnabled && namedReportOptIn === true;
  const namedName = namedOptIn && namedReportName ? String(namedReportName).slice(0, 100) : null;

  // Enforce named report cap if set
  if (namedOptIn && pool.namedReportCap != null) {
    const capRow = await db
      .select({ count: sql<string>`count(*)` })
      .from(poolParticipantsTable)
      .where(and(
        eq(poolParticipantsTable.poolId, pool.id),
        eq(poolParticipantsTable.namedReportOptIn, true),
        not(inArray(poolParticipantsTable.paymentStatus, ["rejected", "refunded"])),
      ));
    const taken = parseInt(capRow[0]?.count ?? "0", 10);
    if (taken >= pool.namedReportCap) {
      res.status(400).json({ error: "Named report slots are full for this pool" });
      return;
    }
  }

  // Note: the $30 named report fee is collected separately by the pool leader / Janoshik
  // and is NOT added to the pool contribution amount.

  const id = nanoid(16);
  const accountUsername = req.account?.telegramUsername ?? null;
  const accountId = accountUsername; // accountId = telegramUsername (the account PK in this codebase)

  let validVoteIds: string[] | null = null;
  if (Array.isArray(voteTestIds) && voteTestIds.length > 0 && pool.votingMode === "vote") {
    const tests = await db.select({ id: poolTestsTable.id }).from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
    const allowed = new Set(tests.map(t => t.id));
    validVoteIds = voteTestIds.filter((x: unknown) => typeof x === "string" && allowed.has(x));
  }

  const isPublicFlag = isPublic === true;

  // Crypto rail: offer USDC alongside USDT when the pool's payout wallet is a
  // valid Ethereum ERC-20 address. Validate the buyer's choice server-side and
  // persist it so the auto-verifier checks the same token the buyer paid in.
  const cryptoOptions = poolCryptoOptions(pool.payoutCurrency, pool.payoutNetwork, pool.payoutWalletAddress);
  const requestedCrypto = typeof cryptoCurrency === "string" ? cryptoCurrency.toUpperCase().trim() : "";
  const chosenCrypto = cryptoOptions.find(o => o.currency.toUpperCase() === requestedCrypto) ?? cryptoOptions[0] ?? null;
  const storeCrypto = chosenMethod === "crypto" && chosenCrypto != null;

  const insert = db.insert(poolParticipantsTable).values({
    supplierContributionKey,
    id,
    poolId: pool.id,
    accountUsername,
    accountId,
    contactEmail: contactEmail ? String(contactEmail).slice(0, 200) : null,
    contactTelegram: contactTelegram ? String(contactTelegram).slice(0, 64) : null,
    displayName: displayName ? String(displayName).slice(0, 80) : null,
    amountUsd: amount.toFixed(2),
    paymentStatus: "pending",
    paymentMethod: chosenMethod,
    paymentCurrency: storeCrypto ? chosenCrypto!.currency : null,
    paymentNetwork: storeCrypto ? chosenCrypto!.network : null,
    namedReportOptIn: namedOptIn,
    namedReportName: namedName,
    isPublic: isPublicFlag,
    voteTestIds: validVoteIds,
    canProvideVial: canProvideVial === true,
  });
  if (supplierContributionKey) {
    const inserted = await insert.onConflictDoNothing({ target: poolParticipantsTable.supplierContributionKey }).returning({ id: poolParticipantsTable.id });
    if (!inserted.length) {
      res.status(409).json({ error: "You already have a contribution for this batch. Open it from Supplier Testing to continue." }); return;
    }
  } else await insert;

  // Find the chosen payment method details
  const methodDetails = chosenMethod
    ? poolMethods.find(m => m.type === chosenMethod)
    : poolMethods[0] ?? null;

  res.status(201).json({
    participantId: id,
    amount,
    paymentMethod: chosenMethod,
    methodDetails,
    payment: {
      walletAddress: pool.payoutWalletAddress,
      currency: storeCrypto ? chosenCrypto!.currency : pool.payoutCurrency,
      network: storeCrypto ? chosenCrypto!.network : pool.payoutNetwork,
      amountUsd: amount,
      availableCryptoOptions: cryptoOptions,
    },
  });
});

// ── Public: POST /api/testing-pools/participants/:id/submit-tx ───────────────
router.post("/testing-pools/participants/:id/submit-tx", async (req, res): Promise<void> => {
  const { txHash } = req.body ?? {};
  if (!txHash || typeof txHash !== "string" || txHash.length < 8 || txHash.length > 200) {
    res.status(400).json({ error: "Provide a valid transaction hash" });
    return;
  }
  const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id));
  if (!participant) { res.status(404).json({ error: "Contribution not found" }); return; }
  if (!await requireParticipantPoolAccess(req, res, participant.poolId, participant.id)) return;
  if (participant.paymentStatus === "verified") {
    res.json({ ok: true, status: "verified" });
    return;
  }
  await db.update(poolParticipantsTable).set({
    paymentTxHash: txHash.trim(),
    paymentStatus: "submitted",
    paymentSubmittedAt: new Date(),
  }).where(eq(poolParticipantsTable.id, req.params.id));
  res.json({ ok: true, status: "submitted" });
});

// ── Public: POST /api/testing-pools/participants/:id/submit-screenshot ────────
router.post("/testing-pools/participants/:id/submit-screenshot", async (req, res): Promise<void> => {
  const { screenshot, paymentRef } = req.body ?? {};
  if (!screenshot) { res.status(400).json({ error: "screenshot required" }); return; }
  const s = String(screenshot);
  if (!/^data:image\/(jpeg|jpg|png);base64,/.test(s)) {
    res.status(400).json({ error: "screenshot must be a JPEG or PNG data URL" });
    return;
  }
  const base64Part = s.split(",")[1] ?? "";
  const byteLength = Math.ceil((base64Part.length * 3) / 4);
  if (byteLength > 15 * 1024 * 1024) {
    res.status(400).json({ error: "screenshot must be under 15 MB" });
    return;
  }
  const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id));
  if (!participant) { res.status(404).json({ error: "Contribution not found" }); return; }
  if (!await requireParticipantPoolAccess(req, res, participant.poolId, participant.id)) return;
  if (participant.paymentStatus === "verified") {
    res.json({ ok: true, status: "verified" });
    return;
  }
  const updateFields: Record<string, unknown> = {
    paymentScreenshotUrl: s,
    paymentStatus: "submitted",
    paymentSubmittedAt: new Date(),
  };
  if (paymentRef && typeof paymentRef === "string" && paymentRef.trim()) {
    updateFields.paymentTxHash = paymentRef.trim();
  }
  await db.update(poolParticipantsTable).set(updateFields).where(eq(poolParticipantsTable.id, req.params.id));
  res.json({ ok: true, status: "submitted" });
});

// ── Public: POST /api/testing-pools/participants/:id/init-anonpay ─────────────
// Creates a Trocador AnonPay session for a pool contribution. Returns { iframeUrl, paymentId }.
router.post("/testing-pools/participants/:id/init-anonpay", async (req, res): Promise<void> => {
  try {
    console.log("[pool/init-anonpay] start", req.params.id);
    const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id));
    if (!participant) { res.status(404).json({ error: "Contribution not found" }); return; }
    if (!await requireParticipantPoolAccess(req, res, participant.poolId, participant.id)) return;
    if (participant.paymentStatus === "verified") { res.status(400).json({ error: "Payment already verified" }); return; }

    // If already submitted with an existing AnonPay session, return existing session
    const ANON_PREFIX = "anonpay:";
    if (participant.paymentTxHash?.startsWith(ANON_PREFIX)) {
      const existingId = participant.paymentTxHash.slice(ANON_PREFIX.length);
      console.log("[pool/init-anonpay] returning existing session", existingId);
      res.json({ iframeUrl: `https://trocador.app/en/anonpay/${encodeURIComponent(existingId)}?embed=1`, paymentId: existingId, existing: true });
      return;
    }

    // Get pool to find AnonPay config
    const [pool] = await db.select({ paymentMethods: testingPoolsTable.paymentMethods }).from(testingPoolsTable).where(eq(testingPoolsTable.id, participant.poolId));
    if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }

    const methods = (pool.paymentMethods ?? []) as Array<{ type: string; wallet?: string; ticker?: string; network?: string }>;
    console.log("[pool/init-anonpay] payment methods", JSON.stringify(methods));
    const ap = methods.find(m => m.type === "anonpay");
    if (!ap?.wallet || !ap?.ticker || !ap?.network) {
      console.error("[pool/init-anonpay] anonpay not configured", ap);
      res.status(400).json({ error: "AnonPay is not configured for this pool. Please contact the pool leader." }); return;
    }

    const amountUsd = parseFloat(String(participant.amountUsd ?? "0")) || 1;
    const ANONPAY_MIN_USD = 4.55; // Trocador's actual minimum is $4.53
    if (amountUsd < ANONPAY_MIN_USD) {
      res.status(400).json({ error: `AnonPay requires a minimum contribution of $${ANONPAY_MIN_USD.toFixed(2)}. Your current amount is $${amountUsd.toFixed(2)}. Please use a different payment method or increase your contribution.` });
      return;
    }
    const description = encodeURIComponent(`pool-${participant.poolId.slice(0, 8)}-${req.params.id.slice(0, 6)}`);
    // Normalize common network name variants Trocador doesn't accept with hyphens
    const normalizeNetwork = (n: string) => n.replace(/^ERC-20$/i,"ERC20").replace(/^BEP-20$/i,"BEP20").replace(/^TRC-20$/i,"TRC20").replace(/^POL-\d+$/i, s => s.replace("-",""));
    const trocNetwork = normalizeNetwork(ap.network);
    // format=json returns payment ID as JSON; amount is in ticker units (USDC = stablecoin so ≈ USD)
    const trocadorUrl = `https://trocador.app/anonpay/?ticker_to=${encodeURIComponent(ap.ticker)}&network_to=${encodeURIComponent(trocNetwork)}&address=${encodeURIComponent(ap.wallet)}&amount=${amountUsd.toFixed(2)}&description=${description}&direct=False&format=json`;
    console.log("[pool/init-anonpay] calling trocador", trocadorUrl);

    let iframeUrl: string;
    let paymentId: string;
    const trocRes = await fetch(trocadorUrl, { redirect: "follow", headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(20000) });
    const rawText = await trocRes.text();
    console.log("[pool/init-anonpay] trocador status", trocRes.status, "body:", rawText.slice(0, 200));

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawText); } catch { /* not JSON — fall through, paymentId stays "" */ }

    paymentId = String(data["ID"] ?? data["id"] ?? data["payment_id"] ?? "").trim();
    if (!paymentId) {
      console.error("[pool/init-anonpay] no payment ID in response", rawText.slice(0, 200));
      // Map common Trocador error patterns to user-friendly messages
      const raw = rawText.toLowerCase();
      let friendlyError: string;
      if (!rawText.trim()) {
        friendlyError = "The payment gateway did not respond. Please try again in a moment.";
      } else if (raw.includes("minimum") || raw.includes("below") || raw.includes("too low") || raw.includes("amount")) {
        const minMatch = rawText.match(/bigger than ([\d.]+)/i) ?? rawText.match(/minimum.*?([\d.]+)/i) ?? rawText.match(/([\d.]+)\s*(?:usd|minimum)/i);
        const minStr = minMatch ? `$${minMatch[1]} USD` : "the minimum";
        friendlyError = `Your contribution amount ($${amountUsd.toFixed(2)} USD) is below ${minStr} required by the payment gateway. The pool leader may need to raise the minimum contribution, or try adding a larger amount.`;
      } else if (raw.includes("address") || raw.includes("invalid") || raw.includes("validat")) {
        friendlyError = "The pool's payment address could not be validated. Please contact the pool leader.";
      } else if (raw.includes("ticker") || raw.includes("coin") || raw.includes("currency") || raw.includes("network")) {
        friendlyError = "The pool's currency or network settings are not supported. Please contact the pool leader.";
      } else {
        friendlyError = "The payment gateway returned an error. Please try again or contact the pool leader if this keeps happening.";
      }
      res.status(502).json({ error: friendlyError, trocadorRaw: rawText.slice(0, 120) }); return;
    }
    iframeUrl = `https://trocador.app/en/anonpay/${paymentId}?embed=1`;
    console.log("[pool/init-anonpay] got paymentId", paymentId);

    const storedId = `${ANON_PREFIX}${paymentId}`;
    await db.update(poolParticipantsTable).set({ paymentTxHash: storedId, paymentMethod: "anonpay" }).where(eq(poolParticipantsTable.id, req.params.id));
    res.json({ iframeUrl, paymentId });
  } catch (err: any) {
    console.error("[pool/init-anonpay] unhandled error", err?.message ?? err);
    if (!res.headersSent) res.status(500).json({ error: "Internal error initialising AnonPay. Please try again." });
  }
});

// ── Public: POST /api/testing-pools/participants/:id/confirm-anonpay-initiation ─
// Customer confirms they've initiated payment; sets status = "submitted".
router.post("/testing-pools/participants/:id/confirm-anonpay-initiation", async (req, res): Promise<void> => {
  try {
    const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id));
    if (!participant) { res.status(404).json({ error: "Contribution not found" }); return; }
    if (!await requireParticipantPoolAccess(req, res, participant.poolId, participant.id)) return;
    if (participant.paymentStatus === "verified") { res.json({ ok: true, paymentStatus: "verified" }); return; }
    const ANON_PREFIX = "anonpay:";
    if (!participant.paymentTxHash?.startsWith(ANON_PREFIX)) {
      res.status(400).json({ error: "No AnonPay session found. Please initialise first." }); return;
    }
    await db.update(poolParticipantsTable).set({ paymentStatus: "submitted", paymentSubmittedAt: new Date() }).where(eq(poolParticipantsTable.id, req.params.id));
    res.json({ ok: true, paymentStatus: "submitted" });
  } catch (err: any) {
    console.error("[pool/confirm-anonpay] error", err?.message ?? err);
    if (!res.headersSent) res.status(500).json({ error: "Internal error. Please try again." });
  }
});

// ── Public: GET /api/testing-pools/participants/:id/anonpay-status ────────────
// Polls Trocador for this participant's AnonPay status; auto-verifies if finished.
router.get("/testing-pools/participants/:id/anonpay-status", async (req, res): Promise<void> => {
  try {
    const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id));
    if (!participant) { res.status(404).json({ error: "Contribution not found" }); return; }
    if (!await requireParticipantPoolAccess(req, res, participant.poolId, participant.id)) return;
    if (participant.paymentStatus === "verified") { res.json({ status: "verified", paymentStatus: "verified" }); return; }
    if (participant.paymentStatus !== "submitted") { res.status(400).json({ error: "Payment has not been submitted yet." }); return; }
    const ANON_PREFIX = "anonpay:";
    if (!participant.paymentTxHash?.startsWith(ANON_PREFIX)) { res.status(409).json({ error: "Not an AnonPay payment." }); return; }
    const paymentId = participant.paymentTxHash.slice(ANON_PREFIX.length);
    if (!paymentId) { res.status(400).json({ error: "No AnonPay payment ID." }); return; }

    const statusUrl = `https://trocador.app/anonpay/status/${encodeURIComponent(paymentId)}`;
    let trocStatus = "";
    try {
      const trocRes = await fetch(statusUrl, { signal: AbortSignal.timeout(12000) });
      const rawText = await trocRes.text();
      console.log("[pool/anonpay-status] raw:", rawText.slice(0, 200));
      try {
        const data = JSON.parse(rawText) as Record<string, unknown>;
        trocStatus = String(data["Status"] ?? data["status"] ?? data["payment_status"] ?? "").toLowerCase();
      } catch { trocStatus = rawText.trim().toLowerCase(); }
    } catch (err: any) { console.warn("[pool/anonpay-status] fetch error", err?.message); }

    let paymentStatus = participant.paymentStatus as string;
    if (trocStatus === "anonpayfinished" || trocStatus === "finished" || trocStatus === "complete" || trocStatus === "completed") {
      if (paymentStatus !== "verified") {
        await db.update(poolParticipantsTable).set({ paymentStatus: "verified", paymentVerifiedAt: new Date() }).where(eq(poolParticipantsTable.id, req.params.id));
        paymentStatus = "verified";
      }
    }
    res.json({ status: trocStatus, paymentStatus });
  } catch (err: any) {
    console.error("[pool/anonpay-status] unhandled error", err?.message ?? err);
    if (!res.headersSent) res.status(500).json({ error: "Internal error. Please try again." });
  }
});

// ── Public: POST /api/testing-pools/:slug/results-unlock ──────────────────────
router.post("/testing-pools/:slug/results-unlock", async (req, res): Promise<void> => {
  const { password } = req.body ?? {};
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.slug, req.params.slug));
  if (!pool) { res.status(404).json({ error: "Results not available" }); return; }
  await loadOptionalAccount(req);
  const isOwner = req.account?.telegramUsername === pool.leaderUsername && !await isSupplierTestingPool(pool.id);
  if (!isOwner && (pool.approvalStatus !== "approved" || pool.status === "draft")) {
    res.status(404).json({ error: "Results not available" });
    return;
  }
  if (!await requirePoolAccess(req, res, pool)) return;
  if (!pool.resultPostedAt) { res.status(404).json({ error: "Results not available" }); return; }
  if (pool.resultsPasswordHash) {
    if (!password || typeof password !== "string") { res.status(400).json({ error: "Password required" }); return; }
    const ok = await bcrypt.compare(password, pool.resultsPasswordHash);
    if (!ok) { res.status(403).json({ error: "Incorrect password" }); return; }
  }
  const results = await db
    .select({
      poolTestId: poolTestResultsTable.poolTestId,
      result: poolTestResultsTable.resultText,
      passed: poolTestResultsTable.passed,
      resultPdfUrl: poolTestResultsTable.resultPdfUrl,
      testName: poolTestsTable.name,
      testCode: poolTestsTable.code,
    })
    .from(poolTestResultsTable)
    .leftJoin(poolTestsTable, eq(poolTestResultsTable.poolTestId, poolTestsTable.id))
    .where(eq(poolTestResultsTable.poolId, pool.id));
  res.json({
    ok: true,
    resultNotes: pool.resultNotes,
    resultPdfUrl: pool.resultPdfUrl,
    perTest: results.map(r => ({ ...r, notes: null })),
  });
});

// PUT /api/account/pool-leader/pools/:id/results — upsert per-test results
router.put("/account/pool-leader/pools/:id/results", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const { results } = req.body ?? {};
  if (!Array.isArray(results)) { res.status(400).json({ error: "results array required" }); return; }
  const tests = await db.select({ id: poolTestsTable.id }).from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
  const allowed = new Set(tests.map(t => t.id));
  await db.delete(poolTestResultsTable).where(eq(poolTestResultsTable.poolId, pool.id));
  for (const r of results) {
    if (!r?.poolTestId || !allowed.has(String(r.poolTestId))) continue;
    await db.insert(poolTestResultsTable).values({
      poolId: pool.id,
      poolTestId: String(r.poolTestId),
      resultText: r.result ? String(r.result).slice(0, 4000) : null,
      passed: typeof r.passed === "boolean" ? r.passed : null,
      resultPdfUrl: r.resultPdfUrl ? String(r.resultPdfUrl).slice(0, 500) : null,
    });
  }
  res.json({ ok: true });
});

// ── Public: GET /api/test-catalog — list active test types ────────────────────
router.get("/test-catalog", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(testCatalogTable)
    .where(eq(testCatalogTable.active, true))
    .orderBy(testCatalogTable.sortOrder);
  // Prices change in the admin catalog and must never be served stale from a
  // browser/proxy/edge (e.g. Cloudflare) cache — always revalidate.
  res.set("Cache-Control", "no-store");
  res.json(rows.map(r => ({ ...r, defaultPriceUsd: num(r.defaultPriceUsd) })));
});

// ─── LEADER (account) endpoints ────────────────────────────────────────────────

// POST /api/account/pool-leader/apply
router.post("/account/pool-leader/apply", requireAccount, async (req, res): Promise<void> => {
  const { bio, walletAddress, walletCurrency, walletNetwork, cryptoOptions, anonpayWallet, anonpayTicker, anonpayNetwork, revolutHandle, paypalEmail } = req.body ?? {};
  const tg = req.account!.telegramUsername;

  const normalizedCryptoOptions: Array<{ currency: string; network: string; walletAddress: string }> | null =
    Array.isArray(cryptoOptions)
      ? cryptoOptions
          .filter((o: unknown) => o && typeof o === "object")
          .map((o: { currency?: string; network?: string; walletAddress?: string }) => ({
            currency: String(o.currency ?? "").trim(),
            network: String(o.network ?? "").trim(),
            walletAddress: String(o.walletAddress ?? "").trim(),
          }))
          .filter(o => o.currency && o.network && o.walletAddress)
      : null;

  const firstCrypto = normalizedCryptoOptions?.[0];

  await db.update(accountsTable).set({
    poolLeaderStatus: "applied",
    poolLeaderAppliedAt: new Date(),
    poolLeaderBio: bio ? String(bio).slice(0, 1000) : null,
    poolLeaderWallet: (firstCrypto?.walletAddress ?? (walletAddress ? String(walletAddress) : null))?.slice(0, 200) ?? null,
    poolLeaderWalletCurrency: (firstCrypto?.currency ?? (walletCurrency ? String(walletCurrency) : "USDT")).slice(0, 20),
    poolLeaderWalletNetwork: (firstCrypto?.network ?? (walletNetwork ? String(walletNetwork) : "ERC-20")).slice(0, 30),
    poolLeaderCryptoOptions: normalizedCryptoOptions ?? undefined,
    poolLeaderAnonpayWallet: anonpayWallet ? String(anonpayWallet).slice(0, 200) : null,
    poolLeaderAnonpayTicker: anonpayTicker ? String(anonpayTicker).slice(0, 20) : null,
    poolLeaderAnonpayNetwork: anonpayNetwork ? String(anonpayNetwork).slice(0, 30) : null,
    poolLeaderRevolutHandle: revolutHandle ? String(revolutHandle).slice(0, 100) : null,
    poolLeaderPaypalEmail: paypalEmail ? String(paypalEmail).slice(0, 200) : null,
  }).where(eq(accountsTable.telegramUsername, tg));
  await writeLog("change", "info", "pool_leader_applied", `${tg} applied to be a testing pool leader`, { username: tg }, req.ip);
  sendAdminFromTemplate("admin_role_application_pool_leader", { username: tg }).catch(() => {});
  res.json({ ok: true, status: "applied" });
});

// GET /api/account/pool-leader/status
router.get("/account/pool-leader/status", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const [acc] = await db.select({
    status: accountsTable.poolLeaderStatus,
    bio: accountsTable.poolLeaderBio,
    wallet: accountsTable.poolLeaderWallet,
    walletCurrency: accountsTable.poolLeaderWalletCurrency,
    walletNetwork: accountsTable.poolLeaderWalletNetwork,
    cryptoOptions: accountsTable.poolLeaderCryptoOptions,
    anonpayWallet: accountsTable.poolLeaderAnonpayWallet,
    anonpayTicker: accountsTable.poolLeaderAnonpayTicker,
    anonpayNetwork: accountsTable.poolLeaderAnonpayNetwork,
    revolutHandle: accountsTable.poolLeaderRevolutHandle,
    paypalEmail: accountsTable.poolLeaderPaypalEmail,
  }).from(accountsTable).where(eq(accountsTable.telegramUsername, tg));
  res.json(acc ?? null);
});

// PATCH /api/account/pool-leader/profile — update payment method settings
router.patch("/account/pool-leader/profile", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const [acc] = await db.select({ status: accountsTable.poolLeaderStatus })
    .from(accountsTable).where(eq(accountsTable.telegramUsername, tg));
  if (!acc || acc.status !== "approved") {
    res.status(403).json({ error: "Pool leader not approved" }); return;
  }
  const { walletAddress, walletCurrency, walletNetwork, cryptoOptions, anonpayWallet, anonpayTicker, anonpayNetwork, revolutHandle, paypalEmail } = req.body ?? {};

  const normalizedCryptoOptions: Array<{ currency: string; network: string; walletAddress: string }> | null =
    Array.isArray(cryptoOptions)
      ? cryptoOptions
          .filter((o: unknown) => o && typeof o === "object")
          .map((o: { currency?: string; network?: string; walletAddress?: string }) => ({
            currency: String(o.currency ?? "").trim(),
            network: String(o.network ?? "").trim(),
            walletAddress: String(o.walletAddress ?? "").trim(),
          }))
          .filter(o => o.currency && o.network && o.walletAddress)
      : null;

  const firstCrypto = normalizedCryptoOptions?.[0];

  const hasAtLeastOne = (normalizedCryptoOptions?.length ?? 0) > 0 || walletAddress || anonpayWallet || revolutHandle || paypalEmail;
  if (!hasAtLeastOne) { res.status(400).json({ error: "At least one payment method is required" }); return; }

  await db.update(accountsTable).set({
    poolLeaderCryptoOptions: normalizedCryptoOptions ?? undefined,
    poolLeaderWallet: normalizedCryptoOptions !== null
      ? (firstCrypto?.walletAddress?.slice(0, 200) ?? null)
      : (walletAddress !== undefined ? (walletAddress ? String(walletAddress).slice(0, 200) : null) : undefined),
    poolLeaderWalletCurrency: normalizedCryptoOptions !== null
      ? (firstCrypto?.currency?.slice(0, 20) ?? undefined)
      : (walletCurrency ? String(walletCurrency).slice(0, 20) : undefined),
    poolLeaderWalletNetwork: normalizedCryptoOptions !== null
      ? (firstCrypto?.network?.slice(0, 30) ?? undefined)
      : (walletNetwork ? String(walletNetwork).slice(0, 30) : undefined),
    poolLeaderAnonpayWallet: anonpayWallet !== undefined ? (anonpayWallet ? String(anonpayWallet).slice(0, 200) : null) : undefined,
    poolLeaderAnonpayTicker: anonpayTicker !== undefined ? (anonpayTicker ? String(anonpayTicker).slice(0, 20) : null) : undefined,
    poolLeaderAnonpayNetwork: anonpayNetwork !== undefined ? (anonpayNetwork ? String(anonpayNetwork).slice(0, 30) : null) : undefined,
    poolLeaderRevolutHandle: revolutHandle !== undefined ? (revolutHandle ? String(revolutHandle).slice(0, 100) : null) : undefined,
    poolLeaderPaypalEmail: paypalEmail !== undefined ? (paypalEmail ? String(paypalEmail).slice(0, 200) : null) : undefined,
  }).where(eq(accountsTable.telegramUsername, tg));
  await writeLog("change", "info", "pool_leader_profile_update", `${tg} updated payment settings`, { username: tg }, req.ip);
  res.json({ ok: true });
});

function normalizePoolPMs(raw: unknown[]): PoolPaymentMethod[] {
  return raw.map(m => {
    const pm = m as Record<string, unknown>;
    if (pm.type === "anonpay" && !pm.wallet && pm.email) {
      return { type: "anonpay", wallet: pm.email as string, ticker: (pm.ticker as string) ?? "XMR", network: (pm.network as string) ?? "Monero" };
    }
    return pm as unknown as PoolPaymentMethod;
  });
}

function buildPaymentMethods(acc: {
  wallet: string | null;
  currency: string | null;
  network: string | null;
  anonpayWallet: string | null;
  anonpayTicker: string | null;
  anonpayNetwork: string | null;
  revolutHandle: string | null;
  paypalEmail: string | null;
  janoshikUrl?: string | null;
}): PoolPaymentMethod[] {
  const methods: PoolPaymentMethod[] = [];
  if (acc.wallet) methods.push({ type: "crypto", currency: acc.currency || "USDT", network: acc.network || "ERC-20", address: acc.wallet });
  if (acc.anonpayWallet) methods.push({ type: "anonpay", wallet: acc.anonpayWallet, ticker: acc.anonpayTicker || "XMR", network: acc.anonpayNetwork || "Monero" });
  if (acc.revolutHandle) methods.push({ type: "revolut", handle: acc.revolutHandle });
  if (acc.paypalEmail) methods.push({ type: "paypal", email: acc.paypalEmail });
  if (acc.janoshikUrl) (methods as any[]).push({ type: "janoshik", url: acc.janoshikUrl });
  return methods;
}

async function ensureApprovedLeader(req: any, res: any): Promise<{ tg: string } | null> {
  const tg = req.account!.telegramUsername;
  const [acc] = await db.select({ status: accountsTable.poolLeaderStatus })
    .from(accountsTable).where(eq(accountsTable.telegramUsername, tg));
  if (!acc || acc.status !== "approved") {
    res.status(403).json({ error: "Pool leader application not approved" });
    return null;
  }
  return { tg };
}

// GET /api/account/pool-leader/pools — pools owned by current account
router.get("/account/pool-leader/pools", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const pools = await db
    .select()
    .from(testingPoolsTable)
    .where(eq(testingPoolsTable.leaderUsername, tg))
    .orderBy(desc(testingPoolsTable.createdAt));
  const groups = await db.select({ poolId: supplierTestingGroupsTable.poolId }).from(supplierTestingGroupsTable);
  const supplierIds = new Set(groups.map(g => g.poolId));
  const out = await Promise.all(pools.filter(p => !supplierIds.has(p.id)).map(async p => ({ ...poolPublicShape(p), ...(await computePoolTotals(p.id)) })));
  res.json(out);
});

// POST /api/account/pool-leader/pools
router.post("/account/pool-leader/pools", requireAccount, async (req, res): Promise<void> => {
  const leader = await ensureApprovedLeader(req, res);
  if (!leader) return;

  const {
    title, description, compoundName, manufacturer, batchNumber, votingMode, tests,
    resultsPassword, groupBuyId, contributorNamedReportEnabled, stopOnFunded, fixedOptInFeeUsd,
    walletAddress, walletCurrency, walletNetwork,
    cryptoOptions: bodyCryptoOptions,
    anonpayWallet, anonpayTicker, anonpayNetwork,
    revolutHandle, paypalEmail, janoshikUrl,
    allowVialContribution, pageMessage, labName,
    namedReportPriceUsd, vialCostUsd, shippingCostUsd, organiserTipUsd,
    inviteOnly, accessCode,
  } = req.body ?? {};
  if (!title || typeof title !== "string") { res.status(400).json({ error: "Title required" }); return; }
  if (!Array.isArray(tests) || tests.length === 0) { res.status(400).json({ error: "Add at least one test" }); return; }
  const testValidation = validatePoolTestsInput(tests);
  if (!testValidation.tests) { res.status(400).json({ error: testValidation.error }); return; }
  const validatedTests = testValidation.tests;
  const costs = {
    namedReportPriceUsd: poolMoneyInput(req.body ?? {}, "namedReportPriceUsd", 30),
    extraVialPriceUsd: poolMoneyInput(req.body ?? {}, "extraVialPriceUsd", 60),
    vialCostUsd: poolMoneyInput(req.body ?? {}, "vialCostUsd", 0),
    shippingCostUsd: poolMoneyInput(req.body ?? {}, "shippingCostUsd", 0),
    organiserTipUsd: poolMoneyInput(req.body ?? {}, "organiserTipUsd", 0),
  };
  for (const [field, value] of Object.entries(costs)) {
    if (value == null) { failInvalidPoolMoney(res, field); return; }
  }
  const maxVialCount = maxVialCountInput(req.body ?? {});
  if (maxVialCount == null) { res.status(400).json({ error: "maxVialCount must be a whole number between 1 and 20" }); return; }
  if (validatePoolVialQuantities(validatedTests, maxVialCount) == null) {
    res.status(400).json({ error: "All tests must use the same whole vial count, between 1 and the pool maximum" }); return;
  }
  if (!fitsTestingPoolTarget(projectedPoolTarget(validatedTests, {
    extraVialPriceUsd: costs.extraVialPriceUsd!,
    vialCostUsd: costs.vialCostUsd!,
    shippingCostUsd: costs.shippingCostUsd!,
    organiserTipUsd: costs.organiserTipUsd!,
  }))) {
    res.status(400).json({ error: "Pool funding goal exceeds $99,999,999.99" }); return;
  }
  if (inviteOnly !== undefined && typeof inviteOnly !== "boolean") {
    res.status(400).json({ error: "inviteOnly must be a boolean" }); return;
  }
  if (inviteOnly === true && (typeof accessCode !== "string" || !accessCode.trim())) {
    res.status(400).json({ error: "A nonempty accessCode is required for invite-only pools" }); return;
  }
  const fixedFeeInput = fixedOptInFeeUsd == null ? { valid: true, amount: null } : parseFixedOptInFee(fixedOptInFeeUsd);
  if (!fixedFeeInput.valid) { failInvalidFixedOptInFee(res); return; }
  const fixedFee = fixedFeeInput.amount;

  const id = nanoid(16);
  const slug = await uniqueSlug(title);
  const passwordHash = resultsPassword ? await bcrypt.hash(String(resultsPassword), 10) : null;

  // Validate multi-chain crypto options if provided
  const normalizedCryptoOptions: Array<{ currency: string; network: string; walletAddress: string }> | null =
    Array.isArray(bodyCryptoOptions) && bodyCryptoOptions.length > 0
      ? bodyCryptoOptions
          .filter((o: unknown) => o && typeof o === "object")
          .map((o: { currency?: string; network?: string; walletAddress?: string }) => ({
            currency: String(o.currency ?? "").trim(),
            network: String(o.network ?? "").trim(),
            walletAddress: String(o.walletAddress ?? "").trim(),
          }))
          .filter(o => o.currency && o.network && o.walletAddress)
      : null;

  // Build payment methods — multi-chain or legacy single wallet
  let poolPaymentMethods: PoolPaymentMethod[];
  if (normalizedCryptoOptions?.length) {
    poolPaymentMethods = [
      ...normalizedCryptoOptions.map(o => ({ type: "crypto" as const, currency: o.currency, network: o.network, address: o.walletAddress })),
      ...(anonpayWallet ? [{ type: "anonpay" as const, wallet: String(anonpayWallet), ticker: String(anonpayTicker || "XMR"), network: String(anonpayNetwork || "Monero") }] : []),
      ...(revolutHandle ? [{ type: "revolut" as const, handle: String(revolutHandle) }] : []),
      ...(paypalEmail ? [{ type: "paypal" as const, email: String(paypalEmail) }] : []),
      ...(janoshikUrl ? [{ type: "janoshik", url: String(janoshikUrl) } as unknown as PoolPaymentMethod] : []),
    ];
  } else {
    poolPaymentMethods = buildPaymentMethods({
      wallet: walletAddress || null,
      currency: walletCurrency || "USDT",
      network: walletNetwork || "ERC-20",
      anonpayWallet: anonpayWallet || null,
      anonpayTicker: anonpayTicker || "XMR",
      anonpayNetwork: anonpayNetwork || "Monero",
      revolutHandle: revolutHandle || null,
      paypalEmail: paypalEmail || null,
      janoshikUrl: janoshikUrl || null,
    });
  }
  if (poolPaymentMethods.length === 0) {
    res.status(400).json({ error: "Add at least one payment method for this pool" }); return;
  }

  const cryptoMethod = poolPaymentMethods.find(m => m.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;

  await db.transaction(async tx => {
  await tx.insert(testingPoolsTable).values({
    id,
    slug,
    leaderUsername: leader.tg,
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 4000) : null,
    compoundName: compoundName ? String(compoundName).slice(0, 100) : null,
    labName: typeof labName === "string" && labName.trim() ? labName.trim().slice(0, 200) : null,
    manufacturer: manufacturer ? String(manufacturer).slice(0, 100) : null,
    batchNumber: batchNumber ? String(batchNumber).slice(0, 100) : null,
    status: "draft",
    votingMode: votingMode === "vote" ? "vote" : "leader_decides",
    namedReportPriceUsd: costs.namedReportPriceUsd!.toFixed(2),
    extraVialPriceUsd: costs.extraVialPriceUsd!.toFixed(2),
    maxVialCount,
    vialCostUsd: costs.vialCostUsd!.toFixed(2),
    shippingCostUsd: costs.shippingCostUsd!.toFixed(2),
    organiserTipUsd: costs.organiserTipUsd!.toFixed(2),
    inviteOnly: inviteOnly === true,
    accessCodeHash: inviteOnly === true ? await bcrypt.hash(accessCode.trim(), 10) : null,
    payoutWalletAddress: cryptoMethod?.address ?? null,
    payoutCurrency: cryptoMethod?.currency ?? null,
    payoutNetwork: cryptoMethod?.network ?? null,
    paymentMethods: poolPaymentMethods,
    contributorNamedReportEnabled: contributorNamedReportEnabled === true,
    stopOnFunded: stopOnFunded === true,
    allowVialContribution: allowVialContribution === true,
    pageMessage: pageMessage ? String(pageMessage).slice(0, 2000) : null,
    fixedOptInFeeUsd: fixedFee != null ? fixedFee.toFixed(2) : null,
    resultsPasswordHash: passwordHash,
    groupBuyId: groupBuyId ? String(groupBuyId).slice(0, 64) : null,
  });

  for (const t of validatedTests) {
    await tx.insert(poolTestsTable).values({
      id: nanoid(12),
      poolId: id,
      catalogId: t.catalogId ? String(t.catalogId).slice(0, 64) : null,
      code: String(t.code).slice(0, 60),
      name: String(t.name).slice(0, 200),
      unitPriceUsd: t.unitPriceUsd.toFixed(2),
      quantity: Math.max(1, parseInt(String(t.quantity ?? 1), 10) || 1),
      selected: t.selected !== false,
    });
  }
  await recomputeTargetUsing(tx, id);
  });

  res.status(201).json({ id, slug });
});

async function isSupplierTestingPool(poolId: string) {
  const [group] = await db.select({ id: supplierTestingGroupsTable.id }).from(supplierTestingGroupsTable)
    .where(eq(supplierTestingGroupsTable.poolId, poolId));
  return !!group;
}

async function getOwnedPool(req: any, res: any, poolId: string) {
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return null; }
  if (await isSupplierTestingPool(pool.id)) {
    res.status(403).json({ error: "Supplier testing batches are managed through Admin, not member pool-leader access." });
    return null;
  }
  if (pool.leaderUsername !== req.account!.telegramUsername) {
    res.status(403).json({ error: "Not your pool" });
    return null;
  }
  return pool;
}

async function buildLeaderPoolUpdates(
  pool: typeof testingPoolsTable.$inferSelect,
  b: Record<string, unknown>,
): Promise<PoolSettingsBuild> {
  if (await supplierPoolIdentityChanged(pool, b)) return { ok: false, status: 409, message: "Supplier, product strength and physical batch identity are fixed for supplier testing groups. Create a new batch group instead." };
  const updates: Partial<typeof testingPoolsTable.$inferInsert> = {};
  if (typeof b.title === "string") updates.title = b.title.slice(0, 200);
  if (typeof b.description === "string") updates.description = b.description.slice(0, 4000);
  if (typeof b.compoundName === "string") updates.compoundName = b.compoundName.slice(0, 100);
  if (typeof b.labName === "string" || b.labName === null) updates.labName = b.labName ? String(b.labName).trim().slice(0, 200) || null : null;
  if (typeof b.manufacturer === "string") updates.manufacturer = b.manufacturer.slice(0, 100);
  if (typeof b.batchNumber === "string") updates.batchNumber = b.batchNumber.slice(0, 100);
  if (typeof b.status === "string" && ["draft", "open", "funded", "sent_to_lab", "results_received", "closed", "cancelled"].includes(b.status)) {
    updates.status = b.status;
  }
  if (typeof b.votingMode === "string" && ["leader_decides", "vote"].includes(b.votingMode)) updates.votingMode = b.votingMode;
  if (typeof b.resultNotes === "string") updates.resultNotes = b.resultNotes.slice(0, 10000);
  if (typeof b.resultPdfUrl === "string") updates.resultPdfUrl = b.resultPdfUrl.slice(0, 500);
  if (b.resultsPassword) updates.resultsPasswordHash = await bcrypt.hash(String(b.resultsPassword), 10);
  if (typeof b.contributorNamedReportEnabled === "boolean") updates.contributorNamedReportEnabled = b.contributorNamedReportEnabled;
  if (typeof b.stopOnFunded === "boolean") updates.stopOnFunded = b.stopOnFunded;
  if (typeof b.allowVialContribution === "boolean") updates.allowVialContribution = b.allowVialContribution;
  if (typeof b.namedReportCap === "number" && b.namedReportCap > 0) updates.namedReportCap = Math.floor(b.namedReportCap);
  if (b.namedReportCap === null || b.namedReportCap === 0) updates.namedReportCap = null;
  if ("pageMessage" in b) updates.pageMessage = b.pageMessage ? String(b.pageMessage).slice(0, 2000) : null;

  let fixedFeeChanged = false;
  if ("fixedOptInFeeUsd" in b) {
    const parsedFee = parseFixedOptInFee(b.fixedOptInFeeUsd);
    if (!parsedFee.valid) {
      return { ok: false, status: 400, message: "fixedOptInFeeUsd must be null or a USD amount of at least $1 with at most two decimal places" };
    }
    fixedFeeChanged = (pool.fixedOptInFeeUsd == null ? null : num(pool.fixedOptInFeeUsd)) !== parsedFee.amount;
    updates.fixedOptInFeeUsd = parsedFee.amount == null ? null : parsedFee.amount.toFixed(2);
  }

  const pricingFields = ["vialCostUsd", "shippingCostUsd", "organiserTipUsd"] as const;
  let pricingChanged = false;
  let moneyChanged = fixedFeeChanged;
  for (const field of pricingFields) {
    if (!(field in b)) continue;
    const amount = parseStrictPoolMoney(b[field]);
    if (amount == null) {
      return { ok: false, status: 400, message: `${field} must be a non-negative amount with at most two decimal places` };
    }
    if (amount !== num(pool[field])) { pricingChanged = true; moneyChanged = true; }
    updates[field] = amount.toFixed(2);
  }
  if ("extraVialPriceUsd" in b) {
    const amount = parseStrictPoolMoney(b.extraVialPriceUsd);
    if (amount == null) return { ok: false, status: 400, message: "extraVialPriceUsd must be a non-negative amount with at most two decimal places" };
    if (amount !== num(pool.extraVialPriceUsd)) { pricingChanged = true; moneyChanged = true; }
    updates.extraVialPriceUsd = amount.toFixed(2);
  }
  if ("maxVialCount" in b) {
    const max = parsePoolVialCount(b.maxVialCount);
    if (max == null) return { ok: false, status: 400, message: "maxVialCount must be a whole number between 1 and 20" };
    if (max !== pool.maxVialCount) moneyChanged = true;
    updates.maxVialCount = max;
  }
  if ("namedReportPriceUsd" in b) {
    const amount = parseStrictPoolMoney(b.namedReportPriceUsd);
    if (amount == null) {
      return { ok: false, status: 400, message: "namedReportPriceUsd must be a non-negative amount with at most two decimal places" };
    }
    if (amount !== num(pool.namedReportPriceUsd)) moneyChanged = true;
    updates.namedReportPriceUsd = amount.toFixed(2);
  }

  if ("inviteOnly" in b && typeof b.inviteOnly !== "boolean") {
    return { ok: false, status: 400, message: "inviteOnly must be a boolean" };
  }
  const hasNewAccessCode = typeof b.accessCode === "string" && !!b.accessCode.trim();
  if (b.inviteOnly === true && !pool.inviteOnly && !pool.accessCodeHash && !hasNewAccessCode) {
    return { ok: false, status: 400, message: "A nonempty accessCode is required for invite-only pools" };
  }
  if (typeof b.inviteOnly === "boolean") updates.inviteOnly = b.inviteOnly;
  if (b.inviteOnly === false) updates.accessCodeHash = null;
  else if (hasNewAccessCode) updates.accessCodeHash = await bcrypt.hash(String(b.accessCode).trim(), 10);

  if (Array.isArray(b.paymentMethods)) {
    updates.paymentMethods = b.paymentMethods as PoolPaymentMethod[];
    const crypto = (b.paymentMethods as PoolPaymentMethod[]).find((method: PoolPaymentMethod) => method.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;
    updates.payoutWalletAddress = crypto?.address ?? null;
    updates.payoutCurrency = crypto?.currency ?? null;
    updates.payoutNetwork = crypto?.network ?? null;
  }

  const wasResultsReceived = updates.status === "results_received" && !pool.resultPostedAt;
  if (wasResultsReceived) updates.resultPostedAt = new Date();
  return { ok: true, updates, pricingChanged, moneyChanged, wasResultsReceived };
}

// PATCH /api/account/pool-leader/pools/:id — update pool fields / status / results
router.patch("/account/pool-leader/pools/:id", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const build = await buildLeaderPoolUpdates(pool, req.body ?? {});
  if (!build.ok) { res.status(build.status).json({ error: build.message }); return; }
  if (build.updates.maxVialCount != null && await exceedsPoolVialMaximum(pool.id, build.updates.maxVialCount)) {
    res.status(400).json({ error: "Lower the planned vial count before reducing the pool maximum" }); return;
  }
  if (build.pricingChanged) {
    const tests = await db.select().from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
    if (!fitsTestingPoolTarget(projectedPoolTarget(tests, poolCostsWithUpdates(pool, build.updates)))) {
      res.status(400).json({ error: "Pool funding goal exceeds $99,999,999.99" }); return;
    }
  }
  if (build.moneyChanged && await hasSubmittedOrVerifiedContributions(pool.id)) {
    res.status(409).json({ error: "Cannot change pool pricing after contributions have been submitted or verified" }); return;
  }
  if (Object.keys(build.updates).length > 0) {
    await db.update(testingPoolsTable).set(build.updates).where(eq(testingPoolsTable.id, pool.id));
  }
  if (build.pricingChanged) await recomputeTarget(pool.id);

  // Notify verified participants with accounts when results are first posted
  if (build.wasResultsReceived) {
    const participants = await db
      .select({ accountUsername: poolParticipantsTable.accountUsername })
      .from(poolParticipantsTable)
      .where(and(
        eq(poolParticipantsTable.poolId, pool.id),
        eq(poolParticipantsTable.paymentStatus, "verified"),
        not(eq(poolParticipantsTable.accountUsername, "")),
      ));
    const appUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://pepsanonymous.com";
    const poolUrl = `${appUrl}/pool/${pool.slug}`;
    for (const p of participants) {
      if (!p.accountUsername) continue;
      const msg = `🔬 <b>Results are in!</b>\n\nThe testing pool <b>${pool.title}</b> has posted results.\n\n<a href="${poolUrl}">View results →</a>`;
      notifyUser(p.accountUsername, "status", msg).catch(() => {});
    }
  }

  res.json({ ok: true });
});

// PUT /api/account/pool-leader/pools/:id/tests — replace tests (only when draft/open with no contributors)
router.put("/account/pool-leader/pools/:id/tests", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const { tests, poolUpdates } = req.body ?? {};
  if (poolUpdates !== undefined && (!poolUpdates || typeof poolUpdates !== "object" || Array.isArray(poolUpdates))) {
    res.status(400).json({ error: "poolUpdates must be an object" }); return;
  }
  const testValidation = validatePoolTestsInput(tests);
  if (!testValidation.tests) { res.status(400).json({ error: testValidation.error }); return; }
  const result = await replacePoolTests(pool.id, testValidation.tests, poolUpdates === undefined
    ? {}
    : { poolUpdates: { kind: "leader", values: poolUpdates } });
  if (result.error) {
    res.status(result.error.status).json({ error: result.error.message });
    return;
  }
  if (result.blocked) {
    res.status(409).json({ error: "Cannot replace tests after contributions have been received" });
    return;
  }
  if (result.wasResultsReceived) {
    const participants = await db.select({ accountUsername: poolParticipantsTable.accountUsername })
      .from(poolParticipantsTable)
      .where(and(
        eq(poolParticipantsTable.poolId, pool.id),
        eq(poolParticipantsTable.paymentStatus, "verified"),
        not(eq(poolParticipantsTable.accountUsername, "")),
      ));
    const appUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://pepsanonymous.com";
    const poolUrl = `${appUrl}/pool/${pool.slug}`;
    for (const participant of participants) {
      if (participant.accountUsername) {
        notifyUser(participant.accountUsername, "status", `🔬 <b>Results are in!</b>\n\nThe testing pool <b>${pool.title}</b> has posted results.\n\n<a href="${poolUrl}">View results →</a>`).catch(() => {});
      }
    }
  }
  res.json({ ok: true, targetAmountUsd: result.targetAmountUsd });
});

// GET /api/account/pool-leader/pools/:id/participants
router.get("/account/pool-leader/pools/:id/participants", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const rows = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.poolId, pool.id)).orderBy(desc(poolParticipantsTable.createdAt));
  res.json(rows.map(r => ({
    ...r,
    amountUsd: num(r.amountUsd),
    // Omit paymentScreenshotUrl from list (load separately to avoid huge response)
    paymentScreenshotUrl: r.paymentScreenshotUrl ? "present" : null,
  })));
});

// GET /api/account/pool-leader/participants/:id/screenshot
router.get("/account/pool-leader/participants/:id/screenshot", requireAccount, async (req, res): Promise<void> => {
  const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id as string));
  if (!participant) { res.status(404).json({ error: "Not found" }); return; }
  if (!await getOwnedPool(req, res, participant.poolId)) return;
  const [pool] = await db.select({ leader: testingPoolsTable.leaderUsername }).from(testingPoolsTable).where(eq(testingPoolsTable.id, participant.poolId));
  if (!pool || pool.leader !== req.account!.telegramUsername) { res.status(403).json({ error: "Not your pool" }); return; }
  if (!participant.paymentScreenshotUrl) { res.status(404).json({ error: "No screenshot" }); return; }
  res.json({ screenshotUrl: participant.paymentScreenshotUrl });
});

// POST /api/account/pool-leader/pools/:id/message — leader broadcasts message to all participants
router.post("/account/pool-leader/pools/:id/message", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }
  const id = nanoid(16);
  await db.insert(poolMessagesTable).values({
    id,
    poolId: pool.id,
    leaderUsername: req.account!.telegramUsername,
    message: message.trim().slice(0, 4000),
  });
  res.status(201).json({ id, ok: true });
});

// GET /api/account/pool-leader/pools/:id/messages — leader reads sent messages
router.get("/account/pool-leader/pools/:id/messages", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const rows = await db.select().from(poolMessagesTable).where(eq(poolMessagesTable.poolId, pool.id)).orderBy(desc(poolMessagesTable.createdAt));
  res.json(rows);
});

// PATCH /api/account/pool-leader/participants/:id — leader can mark verified/rejected
router.patch("/account/pool-leader/participants/:id", requireAccount, async (req, res): Promise<void> => {
  const [participant] = await db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id as string));
  if (!participant) { res.status(404).json({ error: "Not found" }); return; }
  const [pool] = await db.select({ leader: testingPoolsTable.leaderUsername }).from(testingPoolsTable).where(eq(testingPoolsTable.id, participant.poolId));
  if (!pool || pool.leader !== req.account!.telegramUsername) { res.status(403).json({ error: "Not your pool" }); return; }
  const { paymentStatus } = req.body ?? {};
  if (!["pending", "submitted", "verified", "rejected", "refunded"].includes(paymentStatus)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updates: Partial<typeof poolParticipantsTable.$inferInsert> = { paymentStatus };
  if (paymentStatus === "verified") updates.paymentVerifiedAt = new Date();
  await db.update(poolParticipantsTable).set(updates).where(eq(poolParticipantsTable.id, participant.id));
  res.json({ ok: true });
});

// ─── ADMIN endpoints ───────────────────────────────────────────────────────────

// GET /api/admin/test-catalog
router.get("/admin/test-catalog", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(testCatalogTable).orderBy(testCatalogTable.sortOrder);
  res.set("Cache-Control", "no-store");
  res.json(rows.map(r => ({ ...r, defaultPriceUsd: num(r.defaultPriceUsd) })));
});

// POST /api/admin/test-catalog
router.post("/admin/test-catalog", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { code, name, labName, description, defaultPriceUsd, unitLabel, sortOrder, active, category, analysisSection } = req.body ?? {};
  if (!code || !name) { res.status(400).json({ error: "code and name required" }); return; }
  const validCategories = ["analysis", "single", "addon"];
  const validSections = ["compound", "extra", "variance"];
  const id = nanoid(12);
  await db.insert(testCatalogTable).values({
    id,
    code: String(code).slice(0, 60),
    name: String(name).slice(0, 200),
    labName: labName ? String(labName).slice(0, 100) : null,
    description: description ? String(description).slice(0, 1000) : null,
    defaultPriceUsd: num(defaultPriceUsd).toFixed(2),
    unitLabel: unitLabel ? String(unitLabel).slice(0, 30) : "test",
    sortOrder: parseInt(String(sortOrder ?? 0), 10) || 0,
    active: active !== false,
    category: validCategories.includes(String(category)) ? String(category) : "analysis",
    analysisSection: (category === "analysis" && validSections.includes(String(analysisSection))) ? String(analysisSection) : null,
  }).onConflictDoNothing({ target: testCatalogTable.code });
  res.status(201).json({ id });
});

// PATCH /api/admin/test-catalog/:id
router.patch("/admin/test-catalog/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const updates: Partial<typeof testCatalogTable.$inferInsert> = {};
  const b = req.body ?? {};
  if (typeof b.name === "string") updates.name = b.name.slice(0, 200);
  if (typeof b.labName === "string") updates.labName = b.labName.slice(0, 100);
  if (typeof b.description === "string") updates.description = b.description.slice(0, 1000);
  if (b.defaultPriceUsd != null) updates.defaultPriceUsd = num(b.defaultPriceUsd).toFixed(2);
  if (typeof b.unitLabel === "string") updates.unitLabel = b.unitLabel.slice(0, 30);
  if (b.sortOrder != null) updates.sortOrder = parseInt(String(b.sortOrder), 10) || 0;
  if (typeof b.active === "boolean") updates.active = b.active;
  if (["analysis", "single", "addon"].includes(String(b.category))) updates.category = String(b.category);
  if (["compound", "extra", "variance"].includes(String(b.analysisSection))) updates.analysisSection = String(b.analysisSection);
  else if (b.analysisSection === null) updates.analysisSection = null;
  await db.update(testCatalogTable).set(updates).where(eq(testCatalogTable.id, req.params.id));
  res.json({ ok: true });
});

// DELETE /api/admin/test-catalog/:id
router.delete("/admin/test-catalog/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(testCatalogTable).where(eq(testCatalogTable.id, req.params.id));
  res.json({ ok: true });
});

// GET /api/admin/pool-leader-applications
router.get("/admin/pool-leader-applications", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const status = (req.query["status"] as string) || "applied";
  const rows = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      status: accountsTable.poolLeaderStatus,
      bio: accountsTable.poolLeaderBio,
      wallet: accountsTable.poolLeaderWallet,
      walletCurrency: accountsTable.poolLeaderWalletCurrency,
      walletNetwork: accountsTable.poolLeaderWalletNetwork,
      appliedAt: accountsTable.poolLeaderAppliedAt,
      approvedAt: accountsTable.poolLeaderApprovedAt,
    })
    .from(accountsTable)
    .where(eq(accountsTable.poolLeaderStatus, status));
  res.json(rows);
});

// PATCH /api/admin/pool-leader-applications/:username
router.patch("/admin/pool-leader-applications/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { status } = req.body ?? {};
  if (!["approved", "rejected", "suspended"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updates: Partial<typeof accountsTable.$inferInsert> = { poolLeaderStatus: status };
  if (status === "approved") updates.poolLeaderApprovedAt = new Date();
  await db.update(accountsTable).set(updates).where(eq(accountsTable.telegramUsername, req.params.username));
  await writeLog("change", "info", "pool_leader_review", `Admin set ${req.params.username} pool-leader status to ${status}`, { username: req.params.username, status }, req.ip);

  if (status === "approved" || status === "rejected") {
    const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
    const eventKey = status === "approved" ? "applicant_pool_leader_approved" : "applicant_pool_leader_rejected";
    notifyUserFromTemplate(req.params.username, "role_application", eventKey, {
      username: req.params.username.replace(/^@/, ""),
      app_url: appUrl,
    }).catch(() => {});
  }

  res.json({ ok: true });
});

// POST /api/admin/testing-pools — create a pool directly from admin
router.post("/admin/testing-pools", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const {
    title, description, compoundName, manufacturer, batchNumber,
    votingMode, tests,
    walletAddress, walletCurrency, walletNetwork,
    anonpayWallet, anonpayTicker, anonpayNetwork,
    revolutHandle, paypalEmail, janoshikUrl,
    contributorNamedReportEnabled, stopOnFunded, fixedOptInFeeUsd,
    allowVialContribution, pageMessage,
    resultsPassword, groupBuyId, status, approvalStatus,
    labName, namedReportPriceUsd, vialCostUsd, shippingCostUsd, organiserTipUsd,
    inviteOnly, accessCode,
  } = req.body ?? {};
  if (!title || typeof title !== "string") { res.status(400).json({ error: "Title required" }); return; }
  let validatedTests: ValidatedPoolTest[] | null = null;
  if (tests !== undefined) {
    const testValidation = validatePoolTestsInput(tests);
    if (!testValidation.tests) { res.status(400).json({ error: testValidation.error }); return; }
    validatedTests = testValidation.tests;
  }
  const costs = {
    namedReportPriceUsd: poolMoneyInput(req.body ?? {}, "namedReportPriceUsd", 30),
    extraVialPriceUsd: poolMoneyInput(req.body ?? {}, "extraVialPriceUsd", 60),
    vialCostUsd: poolMoneyInput(req.body ?? {}, "vialCostUsd", 0),
    shippingCostUsd: poolMoneyInput(req.body ?? {}, "shippingCostUsd", 0),
    organiserTipUsd: poolMoneyInput(req.body ?? {}, "organiserTipUsd", 0),
  };
  for (const [field, value] of Object.entries(costs)) {
    if (value == null) { failInvalidPoolMoney(res, field); return; }
  }
  const maxVialCount = maxVialCountInput(req.body ?? {});
  if (maxVialCount == null) { res.status(400).json({ error: "maxVialCount must be a whole number between 1 and 20" }); return; }
  if (validatedTests && validatePoolVialQuantities(validatedTests, maxVialCount) == null) {
    res.status(400).json({ error: "All tests must use the same whole vial count, between 1 and the pool maximum" }); return;
  }
  if (validatedTests && !fitsTestingPoolTarget(projectedPoolTarget(validatedTests, {
    extraVialPriceUsd: costs.extraVialPriceUsd!,
    vialCostUsd: costs.vialCostUsd!,
    shippingCostUsd: costs.shippingCostUsd!,
    organiserTipUsd: costs.organiserTipUsd!,
  }))) {
    res.status(400).json({ error: "Pool funding goal exceeds $99,999,999.99" }); return;
  }
  if (inviteOnly !== undefined && typeof inviteOnly !== "boolean") {
    res.status(400).json({ error: "inviteOnly must be a boolean" }); return;
  }
  if (inviteOnly === true && (typeof accessCode !== "string" || !accessCode.trim())) {
    res.status(400).json({ error: "A nonempty accessCode is required for invite-only pools" }); return;
  }
  const fixedFeeInput = fixedOptInFeeUsd == null ? { valid: true, amount: null } : parseFixedOptInFee(fixedOptInFeeUsd);
  if (!fixedFeeInput.valid) { failInvalidFixedOptInFee(res); return; }
  const fixedFee = fixedFeeInput.amount;

  const id = nanoid(16);
  const slug = await uniqueSlug(title);
  const passwordHash = resultsPassword ? await bcrypt.hash(String(resultsPassword), 10) : null;

  const poolPaymentMethods = buildPaymentMethods({
    wallet: walletAddress || null,
    currency: walletCurrency || "USDT",
    network: walletNetwork || "ERC-20",
    anonpayWallet: anonpayWallet || null,
    anonpayTicker: anonpayTicker || "XMR",
    anonpayNetwork: anonpayNetwork || "Monero",
    revolutHandle: revolutHandle || null,
    paypalEmail: paypalEmail || null,
    janoshikUrl: janoshikUrl || null,
  });

  const cryptoMethod = poolPaymentMethods.find(m => m.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;
  await db.transaction(async tx => {
  await tx.insert(testingPoolsTable).values({
    id,
    slug,
    leaderUsername: "__admin__",
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 4000) : null,
    compoundName: compoundName ? String(compoundName).slice(0, 100) : null,
    labName: typeof labName === "string" && labName.trim() ? labName.trim().slice(0, 200) : null,
    manufacturer: manufacturer ? String(manufacturer).slice(0, 100) : null,
    batchNumber: batchNumber ? String(batchNumber).slice(0, 100) : null,
    status: (typeof status === "string" && ["draft","open","funded","sent_to_lab","results_received","closed","cancelled"].includes(status)) ? status : "draft",
    votingMode: votingMode === "vote" ? "vote" : "leader_decides",
    namedReportPriceUsd: costs.namedReportPriceUsd!.toFixed(2),
    extraVialPriceUsd: costs.extraVialPriceUsd!.toFixed(2),
    maxVialCount,
    vialCostUsd: costs.vialCostUsd!.toFixed(2),
    shippingCostUsd: costs.shippingCostUsd!.toFixed(2),
    organiserTipUsd: costs.organiserTipUsd!.toFixed(2),
    inviteOnly: inviteOnly === true,
    accessCodeHash: inviteOnly === true ? await bcrypt.hash(accessCode.trim(), 10) : null,
    approvalStatus: (typeof approvalStatus === "string" && ["pending","approved","rejected"].includes(approvalStatus)) ? approvalStatus : "approved",
    payoutWalletAddress: cryptoMethod?.address ?? null,
    payoutCurrency: cryptoMethod?.currency ?? null,
    payoutNetwork: cryptoMethod?.network ?? null,
    paymentMethods: poolPaymentMethods,
    contributorNamedReportEnabled: contributorNamedReportEnabled === true,
    stopOnFunded: stopOnFunded === true,
    allowVialContribution: allowVialContribution === true,
    pageMessage: pageMessage ? String(pageMessage).slice(0, 2000) : null,
    fixedOptInFeeUsd: fixedFee != null ? fixedFee.toFixed(2) : null,
    resultsPasswordHash: passwordHash,
    groupBuyId: groupBuyId ? String(groupBuyId).slice(0, 64) : null,
  });

  if (validatedTests) {
    for (const t of validatedTests) {
      await tx.insert(poolTestsTable).values({
        id: nanoid(12),
        poolId: id,
        catalogId: t.catalogId ? String(t.catalogId).slice(0, 64) : null,
        code: String(t.code).slice(0, 60),
        name: String(t.name).slice(0, 200),
        unitPriceUsd: t.unitPriceUsd.toFixed(2),
        quantity: Math.max(1, parseInt(String(t.quantity ?? 1), 10) || 1),
        selected: t.selected !== false,
      });
    }
    await recomputeTargetUsing(tx, id);
  }
  });

  res.status(201).json({ id, slug });
});

// GET /api/admin/testing-pools
router.get("/admin/testing-pools", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(testingPoolsTable).orderBy(desc(testingPoolsTable.createdAt));
  const out = await Promise.all(rows.map(async p => ({
    ...poolPublicShape(p),
    approvalStatus: p.approvalStatus,
    hiddenFromList: p.hiddenFromList,
    rejectionReason: p.rejectionReason,
    ...(await computePoolTotals(p.id)),
  })));
  res.json(out);
});

// GET /api/admin/testing-pools/:id/detail — full pool view (bypasses password)
router.get("/admin/testing-pools/:id/detail", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, req.params.id));
  if (!pool) { res.status(404).json({ error: "Not found" }); return; }

  const [tests, participants, results, messages] = await Promise.all([
    db.select().from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id)).orderBy(poolTestsTable.id),
    db.select().from(poolParticipantsTable).where(eq(poolParticipantsTable.poolId, pool.id)).orderBy(desc(poolParticipantsTable.createdAt)),
    db.select().from(poolTestResultsTable).where(eq(poolTestResultsTable.poolId, pool.id)),
    db.select().from(poolMessagesTable).where(eq(poolMessagesTable.poolId, pool.id)).orderBy(desc(poolMessagesTable.createdAt)),
  ]);

  const { accessCodeHash: _accessCodeHash, resultsPasswordHash: _resultsPasswordHash, ...safePool } = pool;
  res.json({
    ...safePool,
    paymentMethods: normalizePoolPMs((pool.paymentMethods as unknown[] | null) ?? []),
    targetAmountUsd: num(pool.targetAmountUsd),
    namedReportPriceUsd: num(pool.namedReportPriceUsd),
    vialCostUsd: num(pool.vialCostUsd),
    shippingCostUsd: num(pool.shippingCostUsd),
    organiserTipUsd: num(pool.organiserTipUsd),
    tests: tests.map(t => ({ ...t, unitPriceUsd: num(t.unitPriceUsd) })),
    participants: participants.map(p => ({ ...p, amountUsd: num(p.amountUsd) })),
    results,
    messages,
  });
});

type AdminPoolUpdatesResult =
  | {
      ok: true;
      updates: Partial<typeof testingPoolsTable.$inferInsert>;
      pricingChanged: boolean;
      moneyChanged: boolean;
      wasResultsReceived: boolean;
    }
  | { ok: false; status: number; message: string };

async function buildAdminPoolUpdates(
  existingPool: typeof testingPoolsTable.$inferSelect,
  b: Record<string, unknown>,
): Promise<AdminPoolUpdatesResult> {
  if (await supplierPoolIdentityChanged(existingPool, b)) return { ok: false, status: 409, message: "Supplier, product strength and physical batch identity are fixed for supplier testing groups. Create a new batch group instead." };
  const updates: Partial<typeof testingPoolsTable.$inferInsert> = {};

  if (typeof b.approvalStatus === "string" && ["pending", "approved", "rejected"].includes(b.approvalStatus)) updates.approvalStatus = b.approvalStatus;
  if (typeof b.rejectionReason === "string") updates.rejectionReason = b.rejectionReason.slice(0, 500);
  if (typeof b.hiddenFromList === "boolean") updates.hiddenFromList = b.hiddenFromList;
  if (typeof b.status === "string") updates.status = b.status;

  if (typeof b.capColor === "string") updates.capColor = b.capColor.slice(0, 100) || null;
  if (b.capColor === null) updates.capColor = null;
  if (typeof b.mgSize === "string") updates.mgSize = b.mgSize.slice(0, 100) || null;
  if (b.mgSize === null) updates.mgSize = null;
  if (typeof b.imageUrl === "string") updates.imageUrl = b.imageUrl || null;
  if (b.imageUrl === null) updates.imageUrl = null;
  if (typeof b.namedReportCap === "number" && b.namedReportCap > 0) updates.namedReportCap = Math.floor(b.namedReportCap);
  if (b.namedReportCap === null || b.namedReportCap === 0) updates.namedReportCap = null;
  if (typeof b.manufacturingDate === "string") {
    const date = b.manufacturingDate.trim();
    updates.manufacturingDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }
  if (b.manufacturingDate === null) updates.manufacturingDate = null;

  if (typeof b.title === "string") updates.title = b.title.slice(0, 200);
  if (typeof b.description === "string" || b.description === null) updates.description = b.description ? String(b.description).slice(0, 4000) : null;
  if (typeof b.compoundName === "string" || b.compoundName === null) updates.compoundName = b.compoundName ? String(b.compoundName).slice(0, 100) : null;
  if (typeof b.labName === "string" || b.labName === null) updates.labName = b.labName ? String(b.labName).trim().slice(0, 200) || null : null;
  if (typeof b.manufacturer === "string" || b.manufacturer === null) updates.manufacturer = b.manufacturer ? String(b.manufacturer).slice(0, 100) : null;
  if (typeof b.batchNumber === "string" || b.batchNumber === null) updates.batchNumber = b.batchNumber ? String(b.batchNumber).slice(0, 100) : null;
  if (typeof b.votingMode === "string" && ["leader_decides", "vote"].includes(b.votingMode)) updates.votingMode = b.votingMode;
  if (typeof b.resultNotes === "string" || b.resultNotes === null) updates.resultNotes = b.resultNotes ? String(b.resultNotes).slice(0, 10000) : null;
  if (typeof b.resultPdfUrl === "string" || b.resultPdfUrl === null) updates.resultPdfUrl = b.resultPdfUrl ? String(b.resultPdfUrl).slice(0, 500) : null;
  if (typeof b.contributorNamedReportEnabled === "boolean") updates.contributorNamedReportEnabled = b.contributorNamedReportEnabled;
  if (typeof b.stopOnFunded === "boolean") updates.stopOnFunded = b.stopOnFunded;
  if (typeof b.allowVialContribution === "boolean") updates.allowVialContribution = b.allowVialContribution;
  if ("pageMessage" in b) updates.pageMessage = b.pageMessage ? String(b.pageMessage).slice(0, 2000) : null;

  let fixedFeeChanged = false;
  if ("fixedOptInFeeUsd" in b) {
    const parsedFee = parseFixedOptInFee(b.fixedOptInFeeUsd);
    if (!parsedFee.valid) {
      return { ok: false, status: 400, message: "fixedOptInFeeUsd must be null or a USD amount of at least $1 with at most two decimal places" };
    }
    fixedFeeChanged = (existingPool.fixedOptInFeeUsd == null ? null : num(existingPool.fixedOptInFeeUsd)) !== parsedFee.amount;
    updates.fixedOptInFeeUsd = parsedFee.amount == null ? null : parsedFee.amount.toFixed(2);
  }
  if (b.resultsPassword) updates.resultsPasswordHash = await bcrypt.hash(String(b.resultsPassword), 10);

  const pricingFields = ["vialCostUsd", "shippingCostUsd", "organiserTipUsd"] as const;
  let pricingChanged = false;
  let moneyChanged = fixedFeeChanged;
  for (const field of pricingFields) {
    if (!(field in b)) continue;
    const amount = parseStrictPoolMoney(b[field]);
    if (amount == null) {
      return { ok: false, status: 400, message: `${field} must be a non-negative amount with at most two decimal places` };
    }
    if (amount !== num(existingPool[field])) { pricingChanged = true; moneyChanged = true; }
    updates[field] = amount.toFixed(2);
  }
  if ("extraVialPriceUsd" in b) {
    const amount = parseStrictPoolMoney(b.extraVialPriceUsd);
    if (amount == null) return { ok: false, status: 400, message: "extraVialPriceUsd must be a non-negative amount with at most two decimal places" };
    if (amount !== num(existingPool.extraVialPriceUsd)) { pricingChanged = true; moneyChanged = true; }
    updates.extraVialPriceUsd = amount.toFixed(2);
  }
  if ("maxVialCount" in b) {
    const max = parsePoolVialCount(b.maxVialCount);
    if (max == null) return { ok: false, status: 400, message: "maxVialCount must be a whole number between 1 and 20" };
    if (max !== existingPool.maxVialCount) moneyChanged = true;
    updates.maxVialCount = max;
  }
  if ("namedReportPriceUsd" in b) {
    const amount = parseStrictPoolMoney(b.namedReportPriceUsd);
    if (amount == null) {
      return { ok: false, status: 400, message: "namedReportPriceUsd must be a non-negative amount with at most two decimal places" };
    }
    if (amount !== num(existingPool.namedReportPriceUsd)) moneyChanged = true;
    updates.namedReportPriceUsd = amount.toFixed(2);
  }

  if ("inviteOnly" in b && typeof b.inviteOnly !== "boolean") {
    return { ok: false, status: 400, message: "inviteOnly must be a boolean" };
  }
  const hasNewAccessCode = typeof b.accessCode === "string" && !!b.accessCode.trim();
  if (b.inviteOnly === true && !existingPool.inviteOnly && !existingPool.accessCodeHash && !hasNewAccessCode) {
    return { ok: false, status: 400, message: "A nonempty accessCode is required for invite-only pools" };
  }
  if (typeof b.inviteOnly === "boolean") updates.inviteOnly = b.inviteOnly;
  if (b.inviteOnly === false) updates.accessCodeHash = null;
  else if (hasNewAccessCode) updates.accessCodeHash = await bcrypt.hash(String(b.accessCode).trim(), 10);

  if (Array.isArray(b.paymentMethods)) {
    updates.paymentMethods = b.paymentMethods as PoolPaymentMethod[];
    const crypto = (b.paymentMethods as PoolPaymentMethod[]).find(method => method.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;
    updates.payoutWalletAddress = crypto?.address ?? null;
    updates.payoutCurrency = crypto?.currency ?? null;
    updates.payoutNetwork = crypto?.network ?? null;
  }

  const wasResultsReceived = updates.status === "results_received" && !existingPool.resultPostedAt;
  if (wasResultsReceived) updates.resultPostedAt = new Date();
  return { ok: true, updates, pricingChanged, moneyChanged, wasResultsReceived };
}

// PATCH /api/admin/testing-pools/:id — approve/reject/hide + full edit
router.patch("/admin/testing-pools/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [existingPool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, req.params.id));
  if (!existingPool) { res.status(404).json({ error: "Pool not found" }); return; }
  const build = await buildAdminPoolUpdates(existingPool, req.body ?? {});
  if (!build.ok) { res.status(build.status).json({ error: build.message }); return; }
  if (build.updates.maxVialCount != null && await exceedsPoolVialMaximum(existingPool.id, build.updates.maxVialCount)) {
    res.status(400).json({ error: "Lower the planned vial count before reducing the pool maximum" }); return;
  }
  if (build.pricingChanged) {
    const tests = await db.select().from(poolTestsTable).where(eq(poolTestsTable.poolId, existingPool.id));
    if (!fitsTestingPoolTarget(projectedPoolTarget(tests, poolCostsWithUpdates(existingPool, build.updates)))) {
      res.status(400).json({ error: "Pool funding goal exceeds $99,999,999.99" }); return;
    }
  }
  if (build.moneyChanged && await hasSubmittedOrVerifiedContributions(existingPool.id)) {
    res.status(409).json({ error: "Cannot change pool pricing after contributions have been submitted or verified" }); return;
  }
  if (Object.keys(build.updates).length > 0) {
    await db.update(testingPoolsTable).set(build.updates).where(eq(testingPoolsTable.id, req.params.id));
  }
  if (build.pricingChanged) await recomputeTarget(existingPool.id);

  // Notify verified participants with accounts when results are first posted
  if (build.wasResultsReceived) {
    const participants = await db
      .select({ accountUsername: poolParticipantsTable.accountUsername })
      .from(poolParticipantsTable)
      .where(and(
        eq(poolParticipantsTable.poolId, existingPool.id),
        eq(poolParticipantsTable.paymentStatus, "verified"),
        not(eq(poolParticipantsTable.accountUsername, "")),
      ));
    const appUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://pepsanonymous.com";
    const poolUrl = `${appUrl}/pool/${existingPool.slug}`;
    for (const p of participants) {
      if (!p.accountUsername) continue;
      const msg = `🔬 <b>Results are in!</b>\n\nThe testing pool <b>${existingPool.title}</b> has posted results.\n\n<a href="${poolUrl}">View results →</a>`;
      notifyUser(p.accountUsername, "status", msg).catch(() => {});
    }
  }

  res.json({ ok: true });
});

// DELETE /api/admin/testing-pools/tests/:testId — hard-delete a single test (admin)
router.delete("/admin/testing-pools/tests/:testId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [test] = await db.select({ id: poolTestsTable.id, poolId: poolTestsTable.poolId })
    .from(poolTestsTable).where(eq(poolTestsTable.id, req.params.testId));
  if (!test) { res.status(404).json({ error: "Test not found" }); return; }
  if (await hasSubmittedOrVerifiedContributions(test.poolId)) {
    res.status(409).json({ error: "Cannot change pool tests after contributions have been submitted or verified" }); return;
  }
  await db.delete(poolTestsTable).where(eq(poolTestsTable.id, req.params.testId));
  await recomputeTarget(test.poolId);
  res.json({ ok: true });
});

// PATCH /api/admin/testing-pools/tests/:testId/status — set contribution status (admin)
router.patch("/admin/testing-pools/tests/:testId/status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { status } = req.body ?? {};
  if (!["active", "rejected", "closed", "delete_requested"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  const [test] = await db.select({ id: poolTestsTable.id, poolId: poolTestsTable.poolId })
    .from(poolTestsTable).where(eq(poolTestsTable.id, req.params.testId));
  if (!test) { res.status(404).json({ error: "Test not found" }); return; }
  await db.update(poolTestsTable).set({ contributionStatus: status }).where(eq(poolTestsTable.id, req.params.testId));
  await recomputeTarget(test.poolId);
  res.json({ ok: true });
});

// POST /api/testing-pools/:slug/tests/:testId/request-delete — leader requests deletion
router.post("/testing-pools/:slug/tests/:testId/request-delete", async (req, res): Promise<void> => {
  await loadOptionalAccount(req);
  if (!req.account) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.slug, req.params.slug));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  if (pool.leaderUsername !== req.account.telegramUsername) {
    res.status(403).json({ error: "Only the pool leader can request test removal" }); return;
  }
  if (!await requirePoolAccess(req, res, pool)) return;
  if (pool.status !== "open") {
    res.status(400).json({ error: "Test removal requests are only allowed while the pool is open" }); return;
  }
  const [test] = await db.select().from(poolTestsTable)
    .where(and(eq(poolTestsTable.id, req.params.testId), eq(poolTestsTable.poolId, pool.id)));
  if (!test) { res.status(404).json({ error: "Test not found" }); return; }
  if ((test.contributionStatus ?? "active") !== "active") {
    res.status(400).json({ error: "Test is not in active state" }); return;
  }
  await db.update(poolTestsTable).set({ contributionStatus: "delete_requested" })
    .where(eq(poolTestsTable.id, req.params.testId));
  res.json({ ok: true });
});

// PUT /api/admin/testing-pools/:id/tests — update the test set without discarding surviving IDs/results
router.put("/admin/testing-pools/:id/tests", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { tests, poolUpdates } = req.body ?? {};
  if (poolUpdates !== undefined && (!poolUpdates || typeof poolUpdates !== "object" || Array.isArray(poolUpdates))) {
    res.status(400).json({ error: "poolUpdates must be an object" }); return;
  }
  const testValidation = validatePoolTestsInput(tests);
  if (!testValidation.tests) { res.status(400).json({ error: testValidation.error }); return; }
  const [pool] = await db.select({ id: testingPoolsTable.id }).from(testingPoolsTable).where(eq(testingPoolsTable.id, req.params.id));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  const result = await replacePoolTests(pool.id, testValidation.tests, poolUpdates === undefined
    ? {}
    : { poolUpdates: { kind: "admin", values: poolUpdates } });
  if (result.error) {
    res.status(result.error.status).json({ error: result.error.message });
    return;
  }
  if (result.blocked) {
    res.status(409).json({ error: "Cannot change pool tests after contributions have been submitted or verified" }); return;
  }
  if (result.wasResultsReceived) {
    const [updatedPool] = await db.select({ slug: testingPoolsTable.slug, title: testingPoolsTable.title })
      .from(testingPoolsTable).where(eq(testingPoolsTable.id, pool.id));
    if (updatedPool) {
      const participants = await db.select({ accountUsername: poolParticipantsTable.accountUsername })
        .from(poolParticipantsTable)
        .where(and(
          eq(poolParticipantsTable.poolId, pool.id),
          eq(poolParticipantsTable.paymentStatus, "verified"),
          not(eq(poolParticipantsTable.accountUsername, "")),
        ));
      const appUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://pepsanonymous.com";
      const poolUrl = `${appUrl}/pool/${updatedPool.slug}`;
      for (const participant of participants) {
        if (participant.accountUsername) {
          notifyUser(participant.accountUsername, "status", `🔬 <b>Results are in!</b>\n\nThe testing pool <b>${updatedPool.title}</b> has posted results.\n\n<a href="${poolUrl}">View results →</a>`).catch(() => {});
        }
      }
    }
  }
  res.json({ ok: true, targetAmountUsd: result.targetAmountUsd });
});

// PATCH /api/admin/testing-pools/:id/test-janoshik — update per-test janoshik URLs (non-destructive)
router.patch("/admin/testing-pools/:id/test-janoshik", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { janoshikUrls } = req.body ?? {};
  if (!janoshikUrls || typeof janoshikUrls !== "object") { res.status(400).json({ error: "janoshikUrls object required" }); return; }
  const tests = await db.select({ id: poolTestsTable.id }).from(poolTestsTable).where(eq(poolTestsTable.poolId, req.params.id));
  const allowed = new Set(tests.map(t => t.id));
  for (const [testId, url] of Object.entries(janoshikUrls)) {
    if (!allowed.has(testId)) continue;
    const cleanUrl = url ? String(url).slice(0, 500) : null;
    await db.update(poolTestsTable).set({ janoshikUrl: cleanUrl }).where(eq(poolTestsTable.id, testId));
  }
  res.json({ ok: true });
});

// PATCH /api/account/pool-leader/pools/:id/test-janoshik — update per-test janoshik URLs (non-destructive)
router.patch("/account/pool-leader/pools/:id/test-janoshik", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const { janoshikUrls } = req.body ?? {};
  if (!janoshikUrls || typeof janoshikUrls !== "object") { res.status(400).json({ error: "janoshikUrls object required" }); return; }
  const tests = await db.select({ id: poolTestsTable.id }).from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
  const allowed = new Set(tests.map(t => t.id));
  for (const [testId, url] of Object.entries(janoshikUrls)) {
    if (!allowed.has(testId)) continue;
    const cleanUrl = url ? String(url).slice(0, 500) : null;
    await db.update(poolTestsTable).set({ janoshikUrl: cleanUrl }).where(eq(poolTestsTable.id, testId));
  }
  res.json({ ok: true });
});

// PUT /api/admin/testing-pools/:id/results — upsert per-test result URLs (admin, non-destructive)
router.put("/admin/testing-pools/:id/results", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { results } = req.body ?? {};
  if (!Array.isArray(results)) { res.status(400).json({ error: "results array required" }); return; }
  const [pool] = await db.select({ id: testingPoolsTable.id }).from(testingPoolsTable).where(eq(testingPoolsTable.id, req.params.id));
  if (!pool) { res.status(404).json({ error: "Not found" }); return; }
  const tests = await db.select({ id: poolTestsTable.id }).from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
  const allowed = new Set(tests.map(t => t.id));
  const existing = await db.select({ id: poolTestResultsTable.id, poolTestId: poolTestResultsTable.poolTestId })
    .from(poolTestResultsTable).where(eq(poolTestResultsTable.poolId, pool.id));
  const existingByTestId: Record<string, number> = Object.fromEntries(existing.map(r => [r.poolTestId, r.id]));
  for (const r of results) {
    if (!r?.poolTestId || !allowed.has(String(r.poolTestId))) continue;
    const url = r.resultPdfUrl ? String(r.resultPdfUrl).slice(0, 500) : null;
    const existingId = existingByTestId[String(r.poolTestId)];
    if (existingId != null) {
      await db.update(poolTestResultsTable).set({ resultPdfUrl: url }).where(eq(poolTestResultsTable.id, existingId));
    } else if (url) {
      await db.insert(poolTestResultsTable).values({ poolId: pool.id, poolTestId: String(r.poolTestId), resultPdfUrl: url });
    }
  }
  res.json({ ok: true });
});

// DELETE /api/admin/testing-pools/:id — hard-delete a pool and all related data
router.delete("/admin/testing-pools/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const poolId = req.params.id;
  const [pool] = await db.select({ id: testingPoolsTable.id, title: testingPoolsTable.title }).from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  const [supplierGroup] = await db.select({ id: supplierTestingGroupsTable.id }).from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.poolId, pool.id));
  if (supplierGroup) { res.status(409).json({ error: "Supplier testing history must be retained. Close or hide this batch group instead of deleting it." }); return; }
  // Delete in FK order: results → participants → messages → tests → pool
  await db.delete(poolTestResultsTable).where(eq(poolTestResultsTable.poolId, poolId));
  await db.delete(poolParticipantsTable).where(eq(poolParticipantsTable.poolId, poolId));
  await db.delete(poolMessagesTable).where(eq(poolMessagesTable.poolId, poolId));
  await db.delete(poolTestsTable).where(eq(poolTestsTable.poolId, poolId));
  await db.delete(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
  await writeLog("change", "info", "pool_deleted", `Admin deleted testing pool "${pool.title}" (${poolId})`, { poolId, title: pool.title }, req.ip);
  res.json({ ok: true });
});

// PATCH /api/admin/testing-pools/participants/:id/payment-status
router.patch("/admin/testing-pools/participants/:id/payment-status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { paymentStatus } = req.body ?? {};
  const valid = ["pending", "submitted", "verified", "rejected", "refunded"];
  if (!valid.includes(paymentStatus)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [participant] = await db.select({ id: poolParticipantsTable.id }).from(poolParticipantsTable).where(eq(poolParticipantsTable.id, req.params.id));
  if (!participant) { res.status(404).json({ error: "Not found" }); return; }
  const updates: Partial<typeof poolParticipantsTable.$inferInsert> = { paymentStatus };
  if (paymentStatus === "verified") updates.paymentVerifiedAt = new Date();
  await db.update(poolParticipantsTable).set(updates).where(eq(poolParticipantsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
