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
  type PoolPaymentMethod,
} from "@workspace/db";
import { and, desc, eq, inArray, not, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { requireAccount, getJwtSecret, type AccountJwtPayload } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { writeLog } from "../lib/audit-log";
import { sendAdminFromTemplate, notifyUserFromTemplate, notifyUser } from "../lib/telegram";

const router: IRouter = Router();

// Optional account: decode the cookie if present, but don't 401 if missing.
function loadOptionalAccount(req: any): void {
  if (req.account) return;
  const token = req.cookies?.account_session as string | undefined;
  if (!token) return;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AccountJwtPayload;
    req.account = { telegramUsername: payload.telegramUsername, jti: payload.jti };
  } catch { /* ignore */ }
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

const EXTRA_VIAL_COST = 60;
async function recomputeTarget(poolId: string): Promise<number> {
  const tests = await db.select().from(poolTestsTable).where(and(eq(poolTestsTable.poolId, poolId), eq(poolTestsTable.selected, true)));
  // Price model: sum of base prices + $60 per EXTRA vial charged ONCE for the whole pool.
  // The extra-vial surcharge is pool-level, not per-test.
  const baseTotal = tests.reduce((s, t) => s + num(t.unitPriceUsd), 0);
  const qty = tests.length > 0 ? (tests[0].quantity || 1) : 1;
  const total = baseTotal + Math.max(0, qty - 1) * EXTRA_VIAL_COST;
  await db.update(testingPoolsTable).set({ targetAmountUsd: total.toFixed(2) }).where(eq(testingPoolsTable.id, poolId));
  return Number(total.toFixed(2));
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

function poolPublicShape(pool: typeof testingPoolsTable.$inferSelect) {
  return {
    id: pool.id,
    slug: pool.slug,
    title: pool.title,
    description: pool.description,
    compoundName: pool.compoundName,
    manufacturer: pool.manufacturer,
    leaderUsername: pool.leaderUsername,
    status: pool.status,
    votingMode: pool.votingMode,
    targetAmountUsd: num(pool.targetAmountUsd),
    payoutWalletAddress: pool.payoutWalletAddress,
    payoutCurrency: pool.payoutCurrency,
    payoutNetwork: pool.payoutNetwork,
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

  const out = await Promise.all(
    pools
      .filter(p => p.status !== "draft")
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
        resultNotes: pool.resultNotes ?? null,
        resultPdfUrl: pool.resultPdfUrl ?? null,
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
  loadOptionalAccount(req);
  const isOwner = req.account?.telegramUsername === pool.leaderUsername;
  if (!isOwner && (pool.approvalStatus !== "approved" || pool.status === "draft")) {
    res.status(404).json({ error: "Pool not found" });
    return;
  }

  const allTests = await db.select().from(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
  // Non-owners never see rejected tests
  const tests = isOwner ? allTests : allTests.filter(t => (t.contributionStatus ?? "active") !== "rejected");
  const totals = await computePoolTotals(pool.id);

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
    pool: poolPublicShape(pool),
    tests: tests.map(t => ({
      id: t.id,
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
  loadOptionalAccount(req);
  const { contactEmail, contactTelegram, displayName, amountUsd, voteTestIds, paymentMethod, namedReportOptIn, namedReportName, isPublic, canProvideVial } = req.body ?? {};

  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.slug, req.params.slug));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  if (!["open", "funded"].includes(pool.status)) {
    res.status(400).json({ error: "This pool is not currently accepting contributions" });
    return;
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

  await db.insert(poolParticipantsTable).values({
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
    namedReportOptIn: namedOptIn,
    namedReportName: namedName,
    isPublic: isPublicFlag,
    voteTestIds: validVoteIds,
    canProvideVial: canProvideVial === true,
  });

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
      currency: pool.payoutCurrency,
      network: pool.payoutNetwork,
      amountUsd: amount,
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
  if (!pool || !pool.resultPostedAt) { res.status(404).json({ error: "Results not available" }); return; }
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
  res.json(rows.map(r => ({ ...r, defaultPriceUsd: num(r.defaultPriceUsd) })));
});

// ─── LEADER (account) endpoints ────────────────────────────────────────────────

// POST /api/account/pool-leader/apply
router.post("/account/pool-leader/apply", requireAccount, async (req, res): Promise<void> => {
  const { bio, walletAddress, walletCurrency, walletNetwork, anonpayWallet, anonpayTicker, anonpayNetwork, revolutHandle, paypalEmail } = req.body ?? {};
  const tg = req.account!.telegramUsername;
  await db.update(accountsTable).set({
    poolLeaderStatus: "applied",
    poolLeaderAppliedAt: new Date(),
    poolLeaderBio: bio ? String(bio).slice(0, 1000) : null,
    poolLeaderWallet: walletAddress ? String(walletAddress).slice(0, 200) : null,
    poolLeaderWalletCurrency: walletCurrency ? String(walletCurrency).slice(0, 20) : "USDT",
    poolLeaderWalletNetwork: walletNetwork ? String(walletNetwork).slice(0, 30) : "ERC-20",
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
  const { walletAddress, walletCurrency, walletNetwork, anonpayWallet, anonpayTicker, anonpayNetwork, revolutHandle, paypalEmail } = req.body ?? {};
  const hasAtLeastOne = walletAddress || anonpayWallet || revolutHandle || paypalEmail;
  if (!hasAtLeastOne) { res.status(400).json({ error: "At least one payment method is required" }); return; }
  await db.update(accountsTable).set({
    poolLeaderWallet: walletAddress !== undefined ? (walletAddress ? String(walletAddress).slice(0, 200) : null) : undefined,
    poolLeaderWalletCurrency: walletCurrency ? String(walletCurrency).slice(0, 20) : undefined,
    poolLeaderWalletNetwork: walletNetwork ? String(walletNetwork).slice(0, 30) : undefined,
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
  const out = await Promise.all(pools.map(async p => ({ ...poolPublicShape(p), ...(await computePoolTotals(p.id)) })));
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
    anonpayWallet, anonpayTicker, anonpayNetwork,
    revolutHandle, paypalEmail, janoshikUrl,
    allowVialContribution, pageMessage,
  } = req.body ?? {};
  if (!title || typeof title !== "string") { res.status(400).json({ error: "Title required" }); return; }
  if (!Array.isArray(tests) || tests.length === 0) { res.status(400).json({ error: "Add at least one test" }); return; }

  const id = nanoid(16);
  const slug = await uniqueSlug(title);
  const passwordHash = resultsPassword ? await bcrypt.hash(String(resultsPassword), 10) : null;

  // Build payment methods from the details supplied at pool-creation time
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
  if (poolPaymentMethods.length === 0) {
    res.status(400).json({ error: "Add at least one payment method for this pool" }); return;
  }

  const cryptoMethod = poolPaymentMethods.find(m => m.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;

  const fixedFee = fixedOptInFeeUsd != null ? num(fixedOptInFeeUsd) : null;

  await db.insert(testingPoolsTable).values({
    id,
    slug,
    leaderUsername: leader.tg,
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 4000) : null,
    compoundName: compoundName ? String(compoundName).slice(0, 100) : null,
    manufacturer: manufacturer ? String(manufacturer).slice(0, 100) : null,
    batchNumber: batchNumber ? String(batchNumber).slice(0, 100) : null,
    status: "draft",
    votingMode: votingMode === "vote" ? "vote" : "leader_decides",
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

  for (const t of tests) {
    if (!t?.code || !t?.name) continue;
    await db.insert(poolTestsTable).values({
      id: nanoid(12),
      poolId: id,
      catalogId: t.catalogId ? String(t.catalogId).slice(0, 64) : null,
      code: String(t.code).slice(0, 60),
      name: String(t.name).slice(0, 200),
      unitPriceUsd: num(t.unitPriceUsd).toFixed(2),
      quantity: Math.max(1, parseInt(String(t.quantity ?? 1), 10) || 1),
      selected: t.selected !== false,
    });
  }
  await recomputeTarget(id);

  res.status(201).json({ id, slug });
});

async function getOwnedPool(req: any, res: any, poolId: string) {
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return null; }
  if (pool.leaderUsername !== req.account!.telegramUsername) {
    res.status(403).json({ error: "Not your pool" });
    return null;
  }
  return pool;
}

// PATCH /api/account/pool-leader/pools/:id — update pool fields / status / results
router.patch("/account/pool-leader/pools/:id", requireAccount, async (req, res): Promise<void> => {
  const pool = await getOwnedPool(req, res, req.params.id as string);
  if (!pool) return;
  const updates: Partial<typeof testingPoolsTable.$inferInsert> = {};
  const b = req.body ?? {};
  if (typeof b.title === "string") updates.title = b.title.slice(0, 200);
  if (typeof b.description === "string") updates.description = b.description.slice(0, 4000);
  if (typeof b.compoundName === "string") updates.compoundName = b.compoundName.slice(0, 100);
  if (typeof b.manufacturer === "string") updates.manufacturer = b.manufacturer.slice(0, 100);
  if (typeof b.batchNumber === "string") updates.batchNumber = b.batchNumber.slice(0, 100);
  if (typeof b.status === "string" && ["draft", "open", "funded", "sent_to_lab", "results_received", "closed", "cancelled"].includes(b.status)) {
    updates.status = b.status;
  }
  if (typeof b.votingMode === "string" && ["leader_decides", "vote"].includes(b.votingMode)) updates.votingMode = b.votingMode;
  if (typeof b.resultNotes === "string") updates.resultNotes = b.resultNotes.slice(0, 10000);
  if (typeof b.resultPdfUrl === "string") updates.resultPdfUrl = b.resultPdfUrl.slice(0, 500);
  if (b.resultsPassword) updates.resultsPasswordHash = await bcrypt.hash(String(b.resultsPassword), 10);
  if (updates.status === "results_received" && !pool.resultPostedAt) updates.resultPostedAt = new Date();
  if (typeof b.contributorNamedReportEnabled === "boolean") updates.contributorNamedReportEnabled = b.contributorNamedReportEnabled;
  if (typeof b.stopOnFunded === "boolean") updates.stopOnFunded = b.stopOnFunded;
  if (typeof b.allowVialContribution === "boolean") updates.allowVialContribution = b.allowVialContribution;
  if (typeof b.namedReportCap === "number" && b.namedReportCap > 0) updates.namedReportCap = Math.floor(b.namedReportCap);
  if (b.namedReportCap === null || b.namedReportCap === 0) updates.namedReportCap = null;
  if ("pageMessage" in b) updates.pageMessage = b.pageMessage ? String(b.pageMessage).slice(0, 2000) : null;
  if (b.fixedOptInFeeUsd != null) {
    updates.fixedOptInFeeUsd = b.fixedOptInFeeUsd === "" || b.fixedOptInFeeUsd === null ? null : num(b.fixedOptInFeeUsd).toFixed(2);
  }
  if (b.fixedOptInFeeUsd === null || b.fixedOptInFeeUsd === "") {
    updates.fixedOptInFeeUsd = null;
  }
  // Allow updating payment methods
  if (Array.isArray(b.paymentMethods)) {
    updates.paymentMethods = b.paymentMethods as PoolPaymentMethod[];
    const crypto = (b.paymentMethods as PoolPaymentMethod[]).find((m: PoolPaymentMethod) => m.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;
    updates.payoutWalletAddress = crypto?.address ?? null;
    updates.payoutCurrency = crypto?.currency ?? null;
    updates.payoutNetwork = crypto?.network ?? null;
  }
  const wasResultsReceived = updates.status === "results_received" && !pool.resultPostedAt;
  await db.update(testingPoolsTable).set(updates).where(eq(testingPoolsTable.id, pool.id));

  // Notify verified participants with accounts when results are first posted
  if (wasResultsReceived) {
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
  const { tests } = req.body ?? {};
  if (!Array.isArray(tests)) { res.status(400).json({ error: "tests array required" }); return; }
  const [{ count }] = await db
    .select({ count: sql<string>`count(*) filter (where ${poolParticipantsTable.paymentStatus} in ('submitted','verified'))` })
    .from(poolParticipantsTable)
    .where(eq(poolParticipantsTable.poolId, pool.id));
  if (parseInt(count ?? "0", 10) > 0) {
    res.status(409).json({ error: "Cannot replace tests after contributions have been received" });
    return;
  }
  await db.delete(poolTestsTable).where(eq(poolTestsTable.poolId, pool.id));
  for (const t of tests) {
    if (!t?.code || !t?.name) continue;
    await db.insert(poolTestsTable).values({
      id: nanoid(12),
      poolId: pool.id,
      catalogId: t.catalogId ? String(t.catalogId).slice(0, 64) : null,
      code: String(t.code).slice(0, 60),
      name: String(t.name).slice(0, 200),
      unitPriceUsd: num(t.unitPriceUsd).toFixed(2),
      quantity: Math.max(1, parseInt(String(t.quantity ?? 1), 10) || 1),
      selected: t.selected !== false,
      janoshikUrl: t.janoshikUrl ? String(t.janoshikUrl).slice(0, 500) : null,
    });
  }
  const target = await recomputeTarget(pool.id);
  res.json({ ok: true, targetAmountUsd: target });
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
  } = req.body ?? {};
  if (!title || typeof title !== "string") { res.status(400).json({ error: "Title required" }); return; }

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
  const fixedFee = fixedOptInFeeUsd != null ? num(fixedOptInFeeUsd) : null;

  await db.insert(testingPoolsTable).values({
    id,
    slug,
    leaderUsername: "__admin__",
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 4000) : null,
    compoundName: compoundName ? String(compoundName).slice(0, 100) : null,
    manufacturer: manufacturer ? String(manufacturer).slice(0, 100) : null,
    batchNumber: batchNumber ? String(batchNumber).slice(0, 100) : null,
    status: (typeof status === "string" && ["draft","open","funded","sent_to_lab","results_received","closed","cancelled"].includes(status)) ? status : "draft",
    votingMode: votingMode === "vote" ? "vote" : "leader_decides",
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

  if (Array.isArray(tests)) {
    for (const t of tests) {
      if (!t?.code || !t?.name) continue;
      await db.insert(poolTestsTable).values({
        id: nanoid(12),
        poolId: id,
        catalogId: t.catalogId ? String(t.catalogId).slice(0, 64) : null,
        code: String(t.code).slice(0, 60),
        name: String(t.name).slice(0, 200),
        unitPriceUsd: num(t.unitPriceUsd).toFixed(2),
        quantity: Math.max(1, parseInt(String(t.quantity ?? 1), 10) || 1),
        selected: t.selected !== false,
      });
    }
    await recomputeTarget(id);
  }

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

  res.json({
    ...pool,
    paymentMethods: normalizePoolPMs((pool.paymentMethods as unknown[] | null) ?? []),
    targetAmountUsd: num(pool.targetAmountUsd),
    tests: tests.map(t => ({ ...t, unitPriceUsd: num(t.unitPriceUsd) })),
    participants: participants.map(p => ({ ...p, amountUsd: num(p.amountUsd) })),
    results,
    messages,
  });
});

// PATCH /api/admin/testing-pools/:id — approve/reject/hide + full edit
router.patch("/admin/testing-pools/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const updates: Partial<typeof testingPoolsTable.$inferInsert> = {};
  const b = req.body ?? {};

  // Approval / visibility
  if (typeof b.approvalStatus === "string" && ["pending", "approved", "rejected"].includes(b.approvalStatus)) updates.approvalStatus = b.approvalStatus;
  if (typeof b.rejectionReason === "string") updates.rejectionReason = b.rejectionReason.slice(0, 500);
  if (typeof b.hiddenFromList === "boolean") updates.hiddenFromList = b.hiddenFromList;
  if (typeof b.status === "string") updates.status = b.status;

  // Product metadata
  if (typeof b.capColor === "string") updates.capColor = b.capColor.slice(0, 100) || null;
  if (b.capColor === null) updates.capColor = null;
  if (typeof b.mgSize === "string") updates.mgSize = b.mgSize.slice(0, 100) || null;
  if (b.mgSize === null) updates.mgSize = null;
  if (typeof b.imageUrl === "string") updates.imageUrl = b.imageUrl || null;
  if (b.imageUrl === null) updates.imageUrl = null;
  if (typeof b.namedReportCap === "number" && b.namedReportCap > 0) updates.namedReportCap = Math.floor(b.namedReportCap);
  if (b.namedReportCap === null || b.namedReportCap === 0) updates.namedReportCap = null;
  if (typeof b.manufacturingDate === "string") {
    const d = b.manufacturingDate.trim();
    updates.manufacturingDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  if (b.manufacturingDate === null) updates.manufacturingDate = null;

  // Core pool details
  if (typeof b.title === "string") updates.title = b.title.slice(0, 200);
  if (typeof b.description === "string" || b.description === null) updates.description = b.description ? String(b.description).slice(0, 4000) : null;
  if (typeof b.compoundName === "string" || b.compoundName === null) updates.compoundName = b.compoundName ? String(b.compoundName).slice(0, 100) : null;
  if (typeof b.manufacturer === "string" || b.manufacturer === null) updates.manufacturer = b.manufacturer ? String(b.manufacturer).slice(0, 100) : null;
  if (typeof b.batchNumber === "string" || b.batchNumber === null) updates.batchNumber = b.batchNumber ? String(b.batchNumber).slice(0, 100) : null;
  if (typeof b.votingMode === "string" && ["leader_decides", "vote"].includes(b.votingMode)) updates.votingMode = b.votingMode;
  if (typeof b.resultNotes === "string" || b.resultNotes === null) updates.resultNotes = b.resultNotes ? String(b.resultNotes).slice(0, 10000) : null;
  if (typeof b.resultPdfUrl === "string" || b.resultPdfUrl === null) updates.resultPdfUrl = b.resultPdfUrl ? String(b.resultPdfUrl).slice(0, 500) : null;
  if (typeof b.contributorNamedReportEnabled === "boolean") updates.contributorNamedReportEnabled = b.contributorNamedReportEnabled;
  if (typeof b.stopOnFunded === "boolean") updates.stopOnFunded = b.stopOnFunded;
  if (typeof b.allowVialContribution === "boolean") updates.allowVialContribution = b.allowVialContribution;
  if ("pageMessage" in b) updates.pageMessage = b.pageMessage ? String(b.pageMessage).slice(0, 2000) : null;
  if ("fixedOptInFeeUsd" in b) updates.fixedOptInFeeUsd = (b.fixedOptInFeeUsd == null || b.fixedOptInFeeUsd === "") ? null : num(b.fixedOptInFeeUsd).toFixed(2);
  if (b.resultsPassword) updates.resultsPasswordHash = await bcrypt.hash(String(b.resultsPassword), 10);

  // Payment methods
  if (Array.isArray(b.paymentMethods)) {
    updates.paymentMethods = b.paymentMethods as PoolPaymentMethod[];
    const crypto = (b.paymentMethods as PoolPaymentMethod[]).find((m) => m.type === "crypto") as { type: "crypto"; currency: string; network: string; address: string } | undefined;
    updates.payoutWalletAddress = crypto?.address ?? null;
    updates.payoutCurrency = crypto?.currency ?? null;
    updates.payoutNetwork = crypto?.network ?? null;
  }

  // Fetch current pool state to determine whether this is the first time results are posted
  const [currentPool] = await db.select({ resultPostedAt: testingPoolsTable.resultPostedAt, slug: testingPoolsTable.slug, title: testingPoolsTable.title })
    .from(testingPoolsTable).where(eq(testingPoolsTable.id, req.params.id));
  const wasResultsReceived = updates.status === "results_received" && (!currentPool || !currentPool.resultPostedAt);
  if (wasResultsReceived) updates.resultPostedAt = new Date();

  if (Object.keys(updates).length > 0) {
    await db.update(testingPoolsTable).set(updates).where(eq(testingPoolsTable.id, req.params.id));
  }

  // Notify verified participants with accounts when results are first posted
  if (wasResultsReceived && currentPool) {
    const participants = await db
      .select({ accountUsername: poolParticipantsTable.accountUsername })
      .from(poolParticipantsTable)
      .where(and(
        eq(poolParticipantsTable.poolId, req.params.id),
        eq(poolParticipantsTable.paymentStatus, "verified"),
        not(eq(poolParticipantsTable.accountUsername, "")),
      ));
    const appUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://pepsanonymous.com";
    const poolUrl = `${appUrl}/pool/${currentPool.slug}`;
    for (const p of participants) {
      if (!p.accountUsername) continue;
      const msg = `🔬 <b>Results are in!</b>\n\nThe testing pool <b>${currentPool.title}</b> has posted results.\n\n<a href="${poolUrl}">View results →</a>`;
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
  loadOptionalAccount(req);
  if (!req.account) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [pool] = await db.select().from(testingPoolsTable).where(eq(testingPoolsTable.slug, req.params.slug));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
  if (pool.leaderUsername !== req.account.telegramUsername) {
    res.status(403).json({ error: "Only the pool leader can request test removal" }); return;
  }
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

// PUT /api/admin/testing-pools/:id/tests — replace all tests (admin, no contributor restriction)
router.put("/admin/testing-pools/:id/tests", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { tests } = req.body ?? {};
  if (!Array.isArray(tests)) { res.status(400).json({ error: "tests array required" }); return; }
  await db.delete(poolTestsTable).where(eq(poolTestsTable.poolId, req.params.id));
  for (const t of tests) {
    if (!t?.code || !t?.name) continue;
    await db.insert(poolTestsTable).values({
      id: nanoid(12),
      poolId: req.params.id,
      catalogId: t.catalogId ? String(t.catalogId).slice(0, 64) : null,
      code: String(t.code).slice(0, 60),
      name: String(t.name).slice(0, 200),
      unitPriceUsd: num(t.unitPriceUsd).toFixed(2),
      quantity: Math.max(1, parseInt(String(t.quantity ?? 1), 10) || 1),
      selected: t.selected !== false,
      janoshikUrl: t.janoshikUrl ? String(t.janoshikUrl).slice(0, 500) : null,
    });
  }
  const target = await recomputeTarget(req.params.id);
  res.json({ ok: true, targetAmountUsd: target });
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
