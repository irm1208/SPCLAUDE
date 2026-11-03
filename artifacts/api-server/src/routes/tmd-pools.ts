import { Router, type Request, type Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  db, tmdPoolsTable, tmdPoolItemsTable, tmdPoolMembersTable, tmdResultsTable, tmdMessagesTable, tmdPhotosTable, tmdBatchesTable, tmdVendorsTable, tmdUsersTable,
  TMD_POOL_VISIBILITY, TMD_RESULTS_VISIBILITY, type TmdPool, type TmdPoolMember,
} from "@workspace/db";
import { requireTmdUser, optionalTmdUser } from "../middleware/tmd-auth";
import {
  handled, TmdError, str, optStr, bool, money, int, slugify, shortId, token, normalisePaymentMethods, hasPaymentMethod,
  publicPool, publicMember, privateMember, publicUser, publicBatch, publicVendor, EMAIL_RE,
} from "../lib/tmd-model";
import { mirrorMessageToGroup } from "../lib/tmd-telegram";
import { isStablecoin, usdToCrypto, fetchUsdPerCoin, roundCrypto } from "../lib/crypto-pricing";
import { poolBreakdown, memberShare, fundingProgress } from "../lib/tmd-pricing";
import { poolTotals, recomputeTarget, refreshFunding, markMemberPayment, pushTmdNotification, systemMessage } from "../lib/tmd-pools-service";
import { storeTmdImage, storeTmdPdf, deleteTmdFile } from "../lib/tmd-files";
import { ANONPAY_PREFIX } from "../lib/tmd-payment-auto-verify";
import { isValidTxHash } from "../lib/payment-verify";
import { uploadOne } from "./tmd-vendors";

/**
 * Pools: hosting, sharing, joining, paying, verifying, results and messages.
 *
 * Access model
 * - View: public and unlisted pools are viewable by anyone with the link; invite pools need
 *   the access code (header `x-tmd-access-code` or `?code=`), unless you are the organiser or
 *   already a member.
 * - Act as a member: signed-in owner of the member row, or the guest claim token
 *   (`?claim=` / body.claim) handed out at join time.
 * - Results: public → every viewer; members → verified members and organiser;
 *   password → those plus anyone who unlocks with the password.
 */
const router = Router();
const noStore = (res: Response) => res.set("Cache-Control", "no-store");
const EDITABLE_STATUSES = new Set(["draft", "open"]);
const TRANSITIONS: Record<string, string[]> = {
  draft: ["open", "cancelled"], open: ["funded", "cancelled"], funded: ["at_lab", "open", "cancelled"], at_lab: ["results", "cancelled"], results: ["closed"], closed: [], cancelled: [],
};
const ANONPAY_MIN_USD = 4.55;

/* ---- Loading and access --------------------------------------------------------- */
async function poolBySlug(slug: string): Promise<TmdPool> {
  const [pool] = await db.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.slug, slug));
  if (!pool) throw new TmdError("Pool not found.", 404);
  return pool;
}
export async function ownPool(req: Request, id: string, lock = false): Promise<TmdPool> {
  const q = db.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.id, id));
  const [pool] = lock ? await q.for("update") : await q;
  if (!pool) throw new TmdError("Pool not found.", 404);
  if (pool.organiserId !== req.tmdUser!.id && req.tmdUser!.role !== "admin") throw new TmdError("Only the organiser can do that.", 403);
  return pool;
}
const safeEqual = (a: string, b: string) => a.length === b.length && a.length > 0 && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const claimFrom = (req: Request) => str(req.query.claim ?? req.body?.claim, 128);

async function viewerMembership(req: Request, poolId: string): Promise<TmdPoolMember | null> {
  const claim = claimFrom(req);
  if (claim) {
    const [m] = await db.select().from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.poolId, poolId), eq(tmdPoolMembersTable.claimToken, claim)));
    if (m && safeEqual(m.claimToken, claim)) return m;
  }
  if (req.tmdUser) {
    const [m] = await db.select().from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.poolId, poolId), eq(tmdPoolMembersTable.userId, req.tmdUser.id)));
    if (m) return m;
  }
  return null;
}
/** Throws 404 (never 403, to avoid confirming an invite pool exists) when the viewer may not see the pool. */
async function assertCanView(req: Request, pool: TmdPool, membership: TmdPoolMember | null) {
  const isOrganiser = !!req.tmdUser && (req.tmdUser.id === pool.organiserId || req.tmdUser.role === "admin");
  if (isOrganiser || membership) return { isOrganiser };
  if (pool.status === "draft") throw new TmdError("Pool not found.", 404);
  if (pool.visibility !== "invite") return { isOrganiser };
  const code = str(req.get("x-tmd-access-code") ?? req.query.code, 64);
  if (!code || !pool.accessCodeHash || !(await bcrypt.compare(code, pool.accessCodeHash))) throw new TmdError("This pool is invite-only. Ask the organiser for the access code.", 401);
  return { isOrganiser };
}
function resultsVisibleTo(pool: TmdPool, isOrganiser: boolean, membership: TmdPoolMember | null): boolean {
  // The organiser always sees their draft results; everyone else waits for publication.
  if (isOrganiser) return true;
  if (!pool.resultsPublishedAt) return false;
  if (pool.resultsVisibility === "public") return true;
  if (pool.resultsVisibility === "members") return membership?.paymentStatus === "verified";
  return membership?.paymentStatus === "verified";
}

/* ---- Composition -------------------------------------------------------------- */
async function itemsWithBatches(poolIds: string[]) {
  if (!poolIds.length) return [];
  return db.select({ item: tmdPoolItemsTable, batch: tmdBatchesTable, vendor: tmdVendorsTable }).from(tmdPoolItemsTable)
    .leftJoin(tmdBatchesTable, eq(tmdBatchesTable.id, tmdPoolItemsTable.batchId)).leftJoin(tmdVendorsTable, eq(tmdVendorsTable.id, tmdBatchesTable.vendorId))
    .where(inArray(tmdPoolItemsTable.poolId, poolIds)).orderBy(tmdPoolItemsTable.position, tmdPoolItemsTable.createdAt);
}
const shapeItem = (row: { item: any; batch: any; vendor: any }) => ({
  id: row.item.id, poolId: row.item.poolId, batchId: row.item.batchId, testType: row.item.testType, lab: row.item.lab, priceUsd: row.item.priceUsd, quantity: row.item.quantity, labOrderUrl: row.item.labOrderUrl, position: row.item.position,
  batch: row.batch ? publicBatch(row.batch) : null, vendor: row.vendor ? publicVendor(row.vendor) : null,
});
const shapeResult = (r: any) => ({ id: r.id, poolItemId: r.poolItemId, summary: r.summary, purityPct: r.purityPct, quantityMg: r.quantityMg, endotoxin: r.endotoxin, sterility: r.sterility, heavyMetals: r.heavyMetals, passed: r.passed, reportKey: r.reportKey, labVerifyUrl: r.labVerifyUrl, updatedAt: r.updatedAt });
const shapePhoto = (p: any) => ({ id: p.id, key: p.storageKey, kind: p.kind, caption: p.caption, batchId: p.batchId, createdAt: p.createdAt });
const shapeMessage = (m: any) => ({ id: m.id, userId: m.userId, authorName: m.authorName, kind: m.kind, body: m.body, createdAt: m.createdAt });

async function poolCard(pool: TmdPool, organiser: any, items: ReturnType<typeof shapeItem>[]) {
  const totals = await poolTotals(db, pool.id);
  return { ...publicPool(pool), organiser: publicUser(organiser), items, totals, progress: fundingProgress(pool.targetUsd, totals.verifiedUsd), shareUsd: memberShare(pool), breakdown: poolBreakdown(items, pool) };
}

async function fullPool(req: Request, pool: TmdPool, membership: TmdPoolMember | null, isOrganiser: boolean) {
  const [[organiser], itemRows, members, photos, results, broadcasts] = await Promise.all([
    db.select().from(tmdUsersTable).where(eq(tmdUsersTable.id, pool.organiserId)),
    itemsWithBatches([pool.id]),
    db.select().from(tmdPoolMembersTable).where(eq(tmdPoolMembersTable.poolId, pool.id)).orderBy(tmdPoolMembersTable.joinedAt),
    db.select().from(tmdPhotosTable).where(eq(tmdPhotosTable.poolId, pool.id)).orderBy(desc(tmdPhotosTable.createdAt)),
    db.select().from(tmdResultsTable).where(eq(tmdResultsTable.poolId, pool.id)).orderBy(tmdResultsTable.createdAt),
    db.select().from(tmdMessagesTable).where(and(eq(tmdMessagesTable.poolId, pool.id), inArray(tmdMessagesTable.kind, ["broadcast", "system"]))).orderBy(desc(tmdMessagesTable.createdAt)).limit(20),
  ]);
  const items = itemRows.map(shapeItem);
  const card = await poolCard(pool, organiser, items);
  const canSeeResults = resultsVisibleTo(pool, isOrganiser, membership);
  const visibleMembers = members.filter(m => ["pending", "submitted", "verified"].includes(m.paymentStatus));
  return {
    pool: card,
    members: isOrganiser ? members.map(privateMember) : visibleMembers.map(publicMember),
    photos: photos.map(shapePhoto),
    results: canSeeResults ? { notes: pool.resultNotes, publishedAt: pool.resultsPublishedAt, items: results.map(shapeResult) } : null,
    resultsLocked: !!pool.resultsPublishedAt && !canSeeResults,
    announcements: broadcasts.map(shapeMessage).reverse(),
    viewer: { isOrganiser, membership: membership ? privateMember(membership) : null, signedIn: !!req.tmdUser },
  };
}

/* ---- Input ----------------------------------------------------------------------- */
type ItemInput = { id?: string; batchId: string | null; testType: string; lab: string | null; priceUsd: number; quantity: number; labOrderUrl: string | null };
function parseItems(input: unknown): ItemInput[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 30).map((raw: any) => ({
    id: typeof raw?.id === "string" ? raw.id : undefined, batchId: optStr(raw?.batchId, 64), testType: str(raw?.testType, 80), lab: optStr(raw?.lab, 80),
    priceUsd: money(raw?.priceUsd), quantity: int(raw?.quantity, 1, 1, 100), labOrderUrl: optStr(raw?.labOrderUrl, 300),
  })).filter(i => i.testType);
}
async function parsePoolBody(req: Request, existing?: TmdPool) {
  const b = req.body ?? {};
  const out: Record<string, unknown> = {};
  if (b.title !== undefined || !existing) { const title = str(b.title, 120); if (title.length < 4) throw new TmdError("Give the pool a title of at least 4 characters."); out.title = title; }
  if (b.description !== undefined) out.description = optStr(b.description, 4000);
  if (b.labName !== undefined) out.labName = optStr(b.labName, 80);
  if (b.visibility !== undefined) { if (!(TMD_POOL_VISIBILITY as readonly string[]).includes(b.visibility)) throw new TmdError("Unknown visibility."); out.visibility = b.visibility; }
  if (b.accessCode !== undefined) { const code = str(b.accessCode, 64); out.accessCodeHash = code ? await bcrypt.hash(code, 10) : null; }
  if (b.resultsVisibility !== undefined) { if (!(TMD_RESULTS_VISIBILITY as readonly string[]).includes(b.resultsVisibility)) throw new TmdError("Unknown results visibility."); out.resultsVisibility = b.resultsVisibility; }
  if (b.resultsPassword !== undefined) { const pw = str(b.resultsPassword, 64); out.resultsPasswordHash = pw ? await bcrypt.hash(pw, 10) : null; }
  if (b.splitMode !== undefined) { if (!["even", "fixed"].includes(b.splitMode)) throw new TmdError("Split mode must be even or fixed."); out.splitMode = b.splitMode; }
  if (b.fixedShareUsd !== undefined) out.fixedShareUsd = b.fixedShareUsd === null || b.fixedShareUsd === "" ? null : money(b.fixedShareUsd).toFixed(2);
  if (b.shippingUsd !== undefined) out.shippingUsd = money(b.shippingUsd).toFixed(2);
  if (b.organiserTipUsd !== undefined) out.organiserTipUsd = money(b.organiserTipUsd).toFixed(2);
  if (b.minMembers !== undefined) out.minMembers = int(b.minMembers, 1, 1, 10_000);
  if (b.maxMembers !== undefined) out.maxMembers = b.maxMembers === null || b.maxMembers === "" ? null : int(b.maxMembers, 0, 1, 10_000) || null;
  if (b.deadlineAt !== undefined) { if (!b.deadlineAt) out.deadlineAt = null; else { const d = new Date(b.deadlineAt); if (Number.isNaN(d.getTime())) throw new TmdError("Deadline is not a valid date."); out.deadlineAt = d; } }
  if (b.paymentMethods !== undefined) out.paymentMethods = normalisePaymentMethods(b.paymentMethods);
  return out;
}
async function replaceItems(tx: any, pool: TmdPool, items: ItemInput[]) {
  const [{ count }] = await tx.select({ count: sql<number>`count(*)` }).from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.poolId, pool.id), inArray(tmdPoolMembersTable.paymentStatus, ["submitted", "verified"])));
  if (Number(count) > 0) throw new TmdError("Tests cannot change once someone has paid. Cancel the pool and start a new one if the plan changed.", 409);
  if (items.some(i => i.batchId)) {
    const ids = [...new Set(items.map(i => i.batchId).filter(Boolean))] as string[];
    const found = await tx.select({ id: tmdBatchesTable.id }).from(tmdBatchesTable).where(inArray(tmdBatchesTable.id, ids));
    if (found.length !== ids.length) throw new TmdError("One of the batches no longer exists.");
  }
  await tx.delete(tmdPoolItemsTable).where(eq(tmdPoolItemsTable.poolId, pool.id));
  if (items.length) await tx.insert(tmdPoolItemsTable).values(items.map((i, position) => ({ id: randomUUID(), poolId: pool.id, batchId: i.batchId, testType: i.testType, lab: i.lab, priceUsd: i.priceUsd.toFixed(2), quantity: i.quantity, labOrderUrl: i.labOrderUrl, position })));
}

/* ---- Public listing and detail -------------------------------------------------- */
router.get("/tmd/pools", handled(async (req, res) => {
  const q = str(req.query.q, 80).replace(/[%_]/g, "");
  const status = str(req.query.status, 20);
  const where = [eq(tmdPoolsTable.visibility, "public"), sql`${tmdPoolsTable.status} not in ('draft','cancelled')`];
  if (status && status !== "all") where.push(eq(tmdPoolsTable.status, status));
  if (q) where.push(or(ilike(tmdPoolsTable.title, `%${q}%`), ilike(tmdPoolsTable.description, `%${q}%`))!);
  const rows = await db.select({ pool: tmdPoolsTable, organiser: tmdUsersTable }).from(tmdPoolsTable).innerJoin(tmdUsersTable, eq(tmdUsersTable.id, tmdPoolsTable.organiserId)).where(and(...where)).orderBy(desc(tmdPoolsTable.createdAt)).limit(100);
  const itemRows = await itemsWithBatches(rows.map(r => r.pool.id));
  const pools = await Promise.all(rows.map(r => poolCard(r.pool, r.organiser, itemRows.filter(i => i.item.poolId === r.pool.id).map(shapeItem))));
  res.json({ pools });
}));

router.get("/tmd/pools/:slug", optionalTmdUser, handled(async (req, res) => {
  const pool = await poolBySlug(String(req.params.slug));
  const membership = await viewerMembership(req, pool.id);
  const { isOrganiser } = await assertCanView(req, pool, membership);
  noStore(res).json(await fullPool(req, pool, membership, isOrganiser));
}));

router.post("/tmd/pools/:slug/results/unlock", optionalTmdUser, handled(async (req, res) => {
  const pool = await poolBySlug(String(req.params.slug));
  const membership = await viewerMembership(req, pool.id);
  const { isOrganiser } = await assertCanView(req, pool, membership);
  if (!pool.resultsPublishedAt) throw new TmdError("Results have not been published yet.", 404);
  if (!resultsVisibleTo(pool, isOrganiser, membership)) {
    if (pool.resultsVisibility !== "password") throw new TmdError("Results are only available to verified members of this pool.", 403);
    const password = str(req.body?.password, 64);
    if (!password || !pool.resultsPasswordHash || !(await bcrypt.compare(password, pool.resultsPasswordHash))) throw new TmdError("That password is not right.", 401);
  }
  const results = await db.select().from(tmdResultsTable).where(eq(tmdResultsTable.poolId, pool.id)).orderBy(tmdResultsTable.createdAt);
  noStore(res).json({ results: { notes: pool.resultNotes, publishedAt: pool.resultsPublishedAt, items: results.map(shapeResult) } });
}));

/* ---- Messages ------------------------------------------------------------------- */
router.get("/tmd/pools/:slug/messages", optionalTmdUser, handled(async (req, res) => {
  const pool = await poolBySlug(String(req.params.slug));
  const membership = await viewerMembership(req, pool.id);
  const { isOrganiser } = await assertCanView(req, pool, membership);
  const kinds = isOrganiser || membership ? ["broadcast", "system", "chat"] : ["broadcast", "system"];
  const rows = await db.select().from(tmdMessagesTable).where(and(eq(tmdMessagesTable.poolId, pool.id), inArray(tmdMessagesTable.kind, kinds))).orderBy(desc(tmdMessagesTable.createdAt)).limit(200);
  noStore(res).json({ messages: rows.map(shapeMessage).reverse(), canChat: isOrganiser || !!membership, canBroadcast: isOrganiser });
}));
router.post("/tmd/pools/:slug/messages", optionalTmdUser, handled(async (req, res) => {
  const pool = await poolBySlug(String(req.params.slug));
  const membership = await viewerMembership(req, pool.id);
  const { isOrganiser } = await assertCanView(req, pool, membership);
  if (!isOrganiser && !membership) throw new TmdError("Join the pool to take part in the chat.", 403);
  const body = str(req.body?.body, 2000);
  if (!body) throw new TmdError("Write a message first.");
  const kind = isOrganiser && req.body?.kind === "broadcast" ? "broadcast" : "chat";
  const authorName = isOrganiser ? `${req.tmdUser!.displayName} (organiser)` : membership!.anonymous ? "Anonymous member" : membership!.displayName;
  const [message] = await db.insert(tmdMessagesTable).values({ id: randomUUID(), poolId: pool.id, userId: req.tmdUser?.id ?? null, authorName, kind, body }).returning();
  if (pool.telegramChatId) mirrorMessageToGroup(db, pool, message).catch(() => null);
  if (kind === "broadcast") {
    const members = await db.select().from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.poolId, pool.id), inArray(tmdPoolMembersTable.paymentStatus, ["pending", "submitted", "verified"])));
    await db.transaction(async tx => { for (const m of members) if (m.userId) await pushTmdNotification(tx, { userId: m.userId, kind: "broadcast", title: `Update on "${pool.title}"`, body: body.slice(0, 300), link: `/p/${pool.slug}`, dedupeKey: `broadcast:${message.id}:${m.userId}` }); });
  } else if (!isOrganiser) {
    await db.transaction(tx => pushTmdNotification(tx, { userId: pool.organiserId, kind: "chat", title: `New message in "${pool.title}"`, body: `${authorName}: ${body.slice(0, 200)}`, link: `/p/${pool.slug}#chat`, dedupeKey: `chat:${message.id}` }));
  }
  res.status(201).json({ message: shapeMessage(message) });
}));

/* ---- Crypto quotes ---------------------------------------------------------------- */
/** USD share → coin amount at the live price, or at a rate the member was already shown when it is still close to live. */
async function cryptoQuote(amountUsd: number, currency: string, shownUsdPerCoin: number | null) {
  const live = await fetchUsdPerCoin(currency);
  if (!live) throw new TmdError(`Could not fetch the ${currency} price right now. Try again in a moment or pay with a stablecoin.`, 502);
  const rate = shownUsdPerCoin && Math.abs(shownUsdPerCoin / live - 1) <= 0.1 ? shownUsdPerCoin : live;
  const quote = await usdToCrypto(amountUsd, currency, rate);
  if (!quote) throw new TmdError(`Could not price ${currency} right now.`, 502);
  return { cryptoAmount: roundCrypto(quote.cryptoAmount, currency), usdPerCoin: quote.usdPerCoin, currency: currency.toUpperCase() };
}
router.get("/tmd/pools/:slug/quote", optionalTmdUser, handled(async (req, res) => {
  const pool = await poolBySlug(String(req.params.slug));
  const membership = await viewerMembership(req, pool.id);
  await assertCanView(req, pool, membership);
  const currency = str(req.query.currency, 12).toUpperCase();
  if (!(pool.paymentMethods?.crypto ?? []).some(r => r.currency === currency)) throw new TmdError("The organiser does not accept that coin.");
  const amountUsd = money(req.query.amountUsd, 0) || (membership ? Number(membership.amountUsd) : memberShare(pool));
  if (isStablecoin(currency)) { noStore(res).json({ currency, cryptoAmount: amountUsd, usdPerCoin: 1, stable: true }); return; }
  noStore(res).json({ ...(await cryptoQuote(amountUsd, currency, null)), amountUsd, stable: false });
}));

/* ---- Joining and paying ---------------------------------------------------------- */
router.post("/tmd/pools/:slug/join", optionalTmdUser, handled(async (req, res) => {
  const pool = await poolBySlug(String(req.params.slug));
  const existing = await viewerMembership(req, pool.id);
  await assertCanView(req, pool, existing);
  if (existing) { res.json({ member: privateMember(existing), existing: true }); return; }
  if (pool.status !== "open") throw new TmdError("This pool is not taking new members right now.", 409);
  if (pool.deadlineAt && pool.deadlineAt.getTime() < Date.now()) throw new TmdError("The deadline for joining this pool has passed.", 409);
  if (req.tmdUser?.id === pool.organiserId) throw new TmdError("You are the organiser of this pool.", 409);
  const totals = await poolTotals(db, pool.id);
  if (pool.maxMembers && totals.memberCount >= pool.maxMembers) throw new TmdError("This pool is full.", 409);
  const anonymous = bool(req.body?.anonymous);
  let displayName = str(req.body?.displayName, 60), guestContact: string | null = null;
  if (!req.tmdUser) {
    guestContact = str(req.body?.guestContact, 120);
    if (!guestContact || !(EMAIL_RE.test(guestContact) || /^@?[a-zA-Z0-9_]{4,32}$/.test(guestContact))) throw new TmdError("Leave an email or Telegram handle so the organiser can reach you.");
    if (!displayName) displayName = guestContact.includes("@") && !guestContact.startsWith("@") ? guestContact.split("@")[0] : guestContact.replace(/^@/, "");
  } else if (!displayName) displayName = req.tmdUser.displayName;
  const member = await db.transaction(async tx => {
    const [created] = await tx.insert(tmdPoolMembersTable).values({
      id: randomUUID(), poolId: pool.id, userId: req.tmdUser?.id ?? null, guestContact, displayName, anonymous, amountUsd: memberShare(pool).toFixed(2), paymentStatus: "pending", claimToken: token(24), note: optStr(req.body?.note, 400),
    }).returning();
    await pushTmdNotification(tx, { userId: pool.organiserId, kind: "member_joined", title: `${anonymous ? "Someone" : displayName} joined "${pool.title}"`, body: "They can now pay their share.", link: `/p/${pool.slug}`, dedupeKey: `joined:${created.id}` });
    return created;
  });
  res.status(201).json({ member: privateMember(member) });
}));

export async function actingMember(req: Request, memberId: string): Promise<{ member: TmdPoolMember; pool: TmdPool }> {
  const [row] = await db.select({ member: tmdPoolMembersTable, pool: tmdPoolsTable }).from(tmdPoolMembersTable).innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdPoolMembersTable.poolId)).where(eq(tmdPoolMembersTable.id, memberId));
  if (!row) throw new TmdError("Membership not found.", 404);
  const claim = claimFrom(req);
  const ok = (claim && safeEqual(claim, row.member.claimToken)) || (!!req.tmdUser && (req.tmdUser.id === row.member.userId || req.tmdUser.id === row.pool.organiserId || req.tmdUser.role === "admin"));
  if (!ok) throw new TmdError("Membership not found.", 404);
  return row;
}

router.get("/tmd/members/:id", optionalTmdUser, handled(async (req, res) => {
  const { member, pool } = await actingMember(req, String(req.params.id));
  const totals = await poolTotals(db, pool.id);
  noStore(res).json({ member: privateMember(member), pool: { ...publicPool(pool), totals, progress: fundingProgress(pool.targetUsd, totals.verifiedUsd) } });
}));

/** Member records how they paid. Crypto needs a tx hash; manual methods (Revolut, PayPal) need a screenshot or at least a reference. */
router.post("/tmd/members/:id/pay", optionalTmdUser, handled(async (req, res) => {
  const { member, pool } = await actingMember(req, String(req.params.id));
  if (member.paymentStatus === "verified") { res.json({ member: privateMember(member) }); return; }
  if (!["open", "funded"].includes(pool.status)) throw new TmdError("This pool is no longer collecting payments.", 409);
  const method = str(req.body?.method, 20);
  const methods = pool.paymentMethods ?? {};
  const changes: Partial<TmdPoolMember> = { paymentMethod: method, paymentStatus: "submitted", submittedAt: new Date(), updatedAt: new Date() };
  if (method === "crypto") {
    const rail = (methods.crypto ?? []).find(r => r.currency === str(req.body?.currency, 12).toUpperCase() && r.network === str(req.body?.network, 24).toLowerCase());
    if (!rail) throw new TmdError("Pick one of the payment options the organiser offers.");
    const txHash = str(req.body?.txHash, 200);
    if (!isValidTxHash(txHash) && txHash.length < 16) throw new TmdError("Paste the full transaction hash from your wallet.");
    Object.assign(changes, { paymentCurrency: rail.currency, paymentNetwork: rail.network, paymentAddress: rail.address, paymentRef: txHash, paymentAmountCrypto: null, paymentUsdPerCoin: null });
    if (!isStablecoin(rail.currency)) {
      // Lock the coin amount the member was shown, so verification does not drift with the price.
      const quote = await cryptoQuote(Number(member.amountUsd), rail.currency, money(req.body?.usdPerCoin, 0) || null);
      Object.assign(changes, { paymentAmountCrypto: quote.cryptoAmount.toFixed(8), paymentUsdPerCoin: quote.usdPerCoin.toFixed(6) });
    }
  } else if (method === "revolut" || method === "paypal") {
    if (!methods[method]) throw new TmdError("The organiser does not accept that method.");
    const ref = optStr(req.body?.reference, 120);
    if (!ref && !member.screenshotKey) throw new TmdError("Add the payment reference, or upload a screenshot of the payment.");
    if (ref) changes.paymentRef = ref;
  } else throw new TmdError("Unknown payment method.");
  const [updated] = await db.update(tmdPoolMembersTable).set(changes).where(eq(tmdPoolMembersTable.id, member.id)).returning();
  await db.transaction(tx => pushTmdNotification(tx, { userId: pool.organiserId, kind: "payment_submitted", title: `${member.anonymous ? "A member" : member.displayName} sent a payment for "${pool.title}"`, body: `${method} · $${member.amountUsd}`, link: `/p/${pool.slug}`, dedupeKey: `submitted:${member.id}:${updated.submittedAt?.getTime()}` }));
  res.json({ member: privateMember(updated) });
}));

router.post("/tmd/members/:id/screenshot", optionalTmdUser, uploadOne, handled(async (req, res) => {
  const { member, pool } = await actingMember(req, String(req.params.id));
  if (member.paymentStatus === "verified") { res.json({ member: privateMember(member) }); return; }
  if (!req.file) throw new TmdError("Choose a screenshot of the payment.");
  const method = ["revolut", "paypal", "crypto"].includes(req.body?.method) ? req.body.method : member.paymentMethod ?? "revolut";
  const key = await storeTmdImage(req.file.buffer, "screenshot", { maxEdge: 1600 });
  const [updated] = await db.update(tmdPoolMembersTable).set({ screenshotKey: key, paymentMethod: method, paymentStatus: "submitted", submittedAt: member.submittedAt ?? new Date(), paymentRef: optStr(req.body?.reference, 120) ?? member.paymentRef, updatedAt: new Date() }).where(eq(tmdPoolMembersTable.id, member.id)).returning();
  await deleteTmdFile(member.screenshotKey);
  await db.transaction(tx => pushTmdNotification(tx, { userId: pool.organiserId, kind: "payment_submitted", title: `${member.anonymous ? "A member" : member.displayName} uploaded a payment screenshot for "${pool.title}"`, body: `${method} · $${member.amountUsd}`, link: `/p/${pool.slug}`, dedupeKey: `screenshot:${member.id}:${Date.now()}` }));
  res.json({ member: privateMember(updated) });
}));

/** Starts a Trocador AnonPay session for the member's share and records it for the auto-verifier. */
router.post("/tmd/members/:id/anonpay", optionalTmdUser, handled(async (req, res) => {
  const { member, pool } = await actingMember(req, String(req.params.id));
  if (member.paymentStatus === "verified") throw new TmdError("This payment is already confirmed.", 409);
  if (member.paymentRef?.startsWith(ANONPAY_PREFIX)) {
    const id = member.paymentRef.slice(ANONPAY_PREFIX.length);
    res.json({ iframeUrl: `https://trocador.app/en/anonpay/${encodeURIComponent(id)}?embed=1`, paymentId: id, existing: true }); return;
  }
  const ap = pool.paymentMethods?.anonpay;
  if (!ap) throw new TmdError("The organiser has not enabled AnonPay for this pool.");
  const amount = Number(member.amountUsd);
  if (amount < ANONPAY_MIN_USD) throw new TmdError(`AnonPay needs at least $${ANONPAY_MIN_USD.toFixed(2)}. Choose another method for this share.`);
  const network = ap.network.replace(/^erc-?20$/i, "ERC20").replace(/^bep-?20$/i, "BEP20").replace(/^trc-?20$/i, "TRC20");
  const url = `https://trocador.app/anonpay/?ticker_to=${encodeURIComponent(ap.ticker)}&network_to=${encodeURIComponent(network)}&address=${encodeURIComponent(ap.wallet)}&amount=${amount.toFixed(2)}&description=${encodeURIComponent(`tmd-${pool.slug.slice(0, 20)}-${member.id.slice(0, 6)}`)}&direct=False&format=json`;
  let paymentId = "";
  try {
    const r = await fetch(url, { redirect: "follow", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    const text = await r.text();
    try { const data = JSON.parse(text); paymentId = String(data.ID ?? data.id ?? data.payment_id ?? "").trim(); } catch { /* not JSON */ }
  } catch { throw new TmdError("The payment gateway did not respond. Try again in a moment.", 502); }
  if (!paymentId) throw new TmdError("The payment gateway rejected the request. Check the organiser's AnonPay settings or use another method.", 502);
  await db.update(tmdPoolMembersTable).set({ paymentMethod: "anonpay", paymentRef: `${ANONPAY_PREFIX}${paymentId}`, paymentStatus: "submitted", submittedAt: new Date(), updatedAt: new Date() }).where(eq(tmdPoolMembersTable.id, member.id));
  res.json({ iframeUrl: `https://trocador.app/en/anonpay/${encodeURIComponent(paymentId)}?embed=1`, paymentId });
}));

router.post("/tmd/members/:id/leave", optionalTmdUser, handled(async (req, res) => {
  const { member } = await actingMember(req, String(req.params.id));
  if (member.paymentStatus !== "pending") throw new TmdError("Ask the organiser to remove you once a payment has been submitted.", 409);
  await db.delete(tmdPoolMembersTable).where(eq(tmdPoolMembersTable.id, member.id));
  res.json({ ok: true });
}));

/* ---- Organiser ------------------------------------------------------------------- */
router.post("/tmd/pools", requireTmdUser, handled(async (req, res) => {
  const user = req.tmdUser!;
  if (process.env.TMD_REQUIRE_EMAIL_VERIFICATION === "1" && !user.emailVerifiedAt) throw new TmdError("Confirm your email before hosting a pool.", 403);
  const fields = await parsePoolBody(req);
  const items = parseItems(req.body?.items);
  const paymentMethods = fields.paymentMethods ?? user.payoutMethods ?? {};
  const base = slugify(String(fields.title));
  const pool = await db.transaction(async tx => {
    let created: TmdPool | undefined;
    for (const slug of [`${base}-${shortId(2)}`, `${base}-${shortId(3)}`, `${base}-${shortId(4)}`]) {
      [created] = await tx.insert(tmdPoolsTable).values({ id: randomUUID(), slug, organiserId: user.id, status: "draft", ...fields, paymentMethods } as any).onConflictDoNothing().returning();
      if (created) break;
    }
    if (!created) throw new TmdError("Could not create the pool. Try again.", 409);
    await replaceItems(tx, created, items);
    return recomputeTarget(tx, created);
  });
  res.status(201).json(await fullPool(req, pool, null, true));
}));

router.get("/tmd/pools/manage/:id", requireTmdUser, handled(async (req, res) => {
  const pool = await ownPool(req, String(req.params.id));
  noStore(res).json(await fullPool(req, pool, null, true));
}));

router.patch("/tmd/pools/:id", requireTmdUser, handled(async (req, res) => {
  const updated = await db.transaction(async tx => {
    const pool = await ownPool(req, String(req.params.id), true);
    if (!EDITABLE_STATUSES.has(pool.status) && req.body?.items !== undefined) throw new TmdError("Tests can only change while the pool is a draft or open with no payments.", 409);
    const fields = await parsePoolBody(req, pool);
    const [saved] = await tx.update(tmdPoolsTable).set({ ...fields, updatedAt: new Date() } as any).where(eq(tmdPoolsTable.id, pool.id)).returning();
    if (req.body?.items !== undefined) await replaceItems(tx, saved, parseItems(req.body.items));
    return recomputeTarget(tx, saved);
  });
  noStore(res).json(await fullPool(req, updated, null, true));
}));

router.post("/tmd/pools/:id/status", requireTmdUser, handled(async (req, res) => {
  const next = str(req.body?.status, 20);
  const updated = await db.transaction(async tx => {
    const pool = await ownPool(req, String(req.params.id), true);
    if (!TRANSITIONS[pool.status]?.includes(next)) throw new TmdError(`A ${pool.status.replace("_", " ")} pool cannot move to ${next.replace("_", " ")}.`, 409);
    if (next === "open") {
      const items = await tx.select().from(tmdPoolItemsTable).where(eq(tmdPoolItemsTable.poolId, pool.id));
      if (!items.length) throw new TmdError("Add at least one test before opening the pool.");
      if (Number(pool.targetUsd) <= 0) throw new TmdError("The pool needs a target above $0. Add prices to the tests.");
      if (!hasPaymentMethod(pool.paymentMethods ?? {})) throw new TmdError("Add at least one way for members to pay you before opening the pool.");
      if (pool.visibility === "invite" && !pool.accessCodeHash) throw new TmdError("Invite-only pools need an access code.");
      if (pool.resultsVisibility === "password" && !pool.resultsPasswordHash) throw new TmdError("Password-protected results need a password.");
    }
    if (next === "results") {
      const [{ count }] = await tx.select({ count: sql<number>`count(*)` }).from(tmdResultsTable).where(eq(tmdResultsTable.poolId, pool.id));
      if (!Number(count)) throw new TmdError("Post at least one result before marking results received.");
    }
    const changes: Record<string, unknown> = { status: next, updatedAt: new Date() };
    if (next === "funded" && !pool.fundedAt) changes.fundedAt = new Date();
    if (next === "results" && !pool.resultsPublishedAt) changes.resultsPublishedAt = new Date();
    const [saved] = await tx.update(tmdPoolsTable).set(changes).where(eq(tmdPoolsTable.id, pool.id)).returning();
    const labels: Record<string, string> = { open: "The pool is open. Share the link to start collecting members.", funded: "The organiser marked the pool as funded.", at_lab: "Samples are on their way to the lab.", results: "Results are in.", closed: "The pool is closed.", cancelled: "The organiser cancelled this pool." };
    await systemMessage(tx, pool.id, labels[next] ?? `Status changed to ${next}.`);
    if (["at_lab", "results", "cancelled"].includes(next)) {
      const members = await tx.select().from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.poolId, pool.id), inArray(tmdPoolMembersTable.paymentStatus, ["submitted", "verified", "pending"])));
      for (const m of members) if (m.userId) await pushTmdNotification(tx, {
        userId: m.userId, kind: `pool_${next}`, link: `/p/${pool.slug}`, dedupeKey: `status:${pool.id}:${next}:${m.userId}`,
        title: next === "results" ? `Results are in for "${pool.title}"` : next === "at_lab" ? `"${pool.title}" has been sent to the lab` : `"${pool.title}" was cancelled`,
        body: next === "cancelled" && m.paymentStatus === "verified" ? "The organiser will refund you. Message them in the pool chat if you do not hear back." : null,
      });
    }
    return saved;
  });
  noStore(res).json(await fullPool(req, updated, null, true));
}));

router.patch("/tmd/pools/:id/members/:memberId", requireTmdUser, handled(async (req, res) => {
  const status = str(req.body?.paymentStatus, 20);
  if (!["verified", "rejected", "refunded", "pending"].includes(status)) throw new TmdError("Status must be verified, rejected, refunded or pending.");
  const member = await db.transaction(async tx => {
    const pool = await ownPool(req, String(req.params.id), true);
    const [m] = await tx.select().from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.id, String(req.params.memberId)), eq(tmdPoolMembersTable.poolId, pool.id))).for("update");
    if (!m) throw new TmdError("Member not found.", 404);
    return markMemberPayment(tx, m, status as any, req.tmdUser!.displayName, req.body?.note !== undefined ? optStr(req.body.note, 400) : undefined);
  });
  res.json({ member: privateMember(member) });
}));

router.delete("/tmd/pools/:id/members/:memberId", requireTmdUser, handled(async (req, res) => {
  await db.transaction(async tx => {
    const pool = await ownPool(req, String(req.params.id), true);
    const [m] = await tx.select().from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.id, String(req.params.memberId)), eq(tmdPoolMembersTable.poolId, pool.id)));
    if (!m) throw new TmdError("Member not found.", 404);
    if (m.paymentStatus === "verified") throw new TmdError("Refund the member first, then remove them.", 409);
    await tx.delete(tmdPoolMembersTable).where(eq(tmdPoolMembersTable.id, m.id));
    await deleteTmdFile(m.screenshotKey);
    await refreshFunding(tx, pool.id);
  });
  res.json({ ok: true });
}));

/** Organiser posts or edits results. Publishing (status → results) is a separate step so drafts can be reviewed first. */
router.put("/tmd/pools/:id/results", requireTmdUser, handled(async (req, res) => {
  const updated = await db.transaction(async tx => {
    const pool = await ownPool(req, String(req.params.id), true);
    const items = await tx.select({ id: tmdPoolItemsTable.id }).from(tmdPoolItemsTable).where(eq(tmdPoolItemsTable.poolId, pool.id));
    const itemIds = new Set(items.map(i => i.id));
    const incoming: any[] = Array.isArray(req.body?.results) ? req.body.results.slice(0, 50) : [];
    const existing = await tx.select().from(tmdResultsTable).where(eq(tmdResultsTable.poolId, pool.id));
    const keep = new Set<string>();
    for (const raw of incoming) {
      const values = {
        poolItemId: typeof raw?.poolItemId === "string" && itemIds.has(raw.poolItemId) ? raw.poolItemId : null,
        summary: optStr(raw?.summary, 2000), purityPct: raw?.purityPct === "" || raw?.purityPct == null ? null : String(Math.min(100, Math.max(0, Number(raw.purityPct) || 0)).toFixed(3)),
        quantityMg: raw?.quantityMg === "" || raw?.quantityMg == null ? null : String(Math.max(0, Number(raw.quantityMg) || 0).toFixed(3)),
        endotoxin: optStr(raw?.endotoxin, 120), sterility: optStr(raw?.sterility, 120), heavyMetals: optStr(raw?.heavyMetals, 120),
        passed: typeof raw?.passed === "boolean" ? raw.passed : null, labVerifyUrl: optStr(raw?.labVerifyUrl, 300), postedBy: req.tmdUser!.id, updatedAt: new Date(),
      };
      const current = typeof raw?.id === "string" ? existing.find(r => r.id === raw.id) : undefined;
      if (current) { await tx.update(tmdResultsTable).set(values).where(eq(tmdResultsTable.id, current.id)); keep.add(current.id); }
      else { const [row] = await tx.insert(tmdResultsTable).values({ id: randomUUID(), poolId: pool.id, ...values }).returning(); keep.add(row.id); }
    }
    for (const r of existing) if (!keep.has(r.id)) { await tx.delete(tmdResultsTable).where(eq(tmdResultsTable.id, r.id)); await deleteTmdFile(r.reportKey); }
    const [saved] = await tx.update(tmdPoolsTable).set({ resultNotes: req.body?.notes !== undefined ? optStr(req.body.notes, 6000) : pool.resultNotes, updatedAt: new Date() }).where(eq(tmdPoolsTable.id, pool.id)).returning();
    return saved;
  });
  noStore(res).json(await fullPool(req, updated, null, true));
}));

router.post("/tmd/pools/:id/results/:resultId/report", requireTmdUser, uploadOne, handled(async (req, res) => {
  const pool = await ownPool(req, String(req.params.id));
  const [result] = await db.select().from(tmdResultsTable).where(and(eq(tmdResultsTable.id, String(req.params.resultId)), eq(tmdResultsTable.poolId, pool.id)));
  if (!result) throw new TmdError("Result not found.", 404);
  if (!req.file) throw new TmdError("Choose the lab report PDF.");
  const key = await storeTmdPdf(req.file.buffer);
  const [saved] = await db.update(tmdResultsTable).set({ reportKey: key, updatedAt: new Date() }).where(eq(tmdResultsTable.id, result.id)).returning();
  await deleteTmdFile(result.reportKey);
  res.json({ result: shapeResult(saved) });
}));

router.post("/tmd/pools/:id/cover", requireTmdUser, uploadOne, handled(async (req, res) => {
  const pool = await ownPool(req, String(req.params.id));
  if (!req.file) throw new TmdError("Choose an image.");
  const key = await storeTmdImage(req.file.buffer, "pool");
  const [saved] = await db.update(tmdPoolsTable).set({ coverPhotoKey: key, updatedAt: new Date() }).where(eq(tmdPoolsTable.id, pool.id)).returning();
  await deleteTmdFile(pool.coverPhotoKey);
  res.json({ pool: publicPool(saved) });
}));

/** Pool photos: the vials being tested, packaging, shipping labels, lab intake — the chain of custody. */
router.post("/tmd/pools/:id/photos", requireTmdUser, uploadOne, handled(async (req, res) => {
  const pool = await ownPool(req, String(req.params.id));
  if (!req.file) throw new TmdError("Choose an image.");
  const kind = ["batch", "vial", "packaging", "lab", "custody"].includes(req.body?.kind) ? req.body.kind : "custody";
  const batchId = optStr(req.body?.batchId, 64);
  const key = await storeTmdImage(req.file.buffer, "custody");
  const [photo] = await db.insert(tmdPhotosTable).values({ id: randomUUID(), storageKey: key, poolId: pool.id, batchId, kind, caption: optStr(req.body?.caption, 200), uploadedBy: req.tmdUser!.id }).returning();
  res.status(201).json({ photo: shapePhoto(photo) });
}));

router.delete("/tmd/pools/:id", requireTmdUser, handled(async (req, res) => {
  await db.transaction(async tx => {
    const pool = await ownPool(req, String(req.params.id), true);
    const [{ count }] = await tx.select({ count: sql<number>`count(*)` }).from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.poolId, pool.id), inArray(tmdPoolMembersTable.paymentStatus, ["submitted", "verified"])));
    if (Number(count) > 0) throw new TmdError("Pools with payments cannot be deleted. Cancel it instead so members keep their records.", 409);
    const photos = await tx.select().from(tmdPhotosTable).where(eq(tmdPhotosTable.poolId, pool.id));
    await tx.delete(tmdPoolsTable).where(eq(tmdPoolsTable.id, pool.id));
    for (const p of photos) await deleteTmdFile(p.storageKey);
    await deleteTmdFile(pool.coverPhotoKey);
  });
  res.json({ ok: true });
}));

export default router;
