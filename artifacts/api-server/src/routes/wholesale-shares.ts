import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  wholesaleSharesTable,
  wholesaleShareMembersTable,
  wholesaleShareMessagesTable,
  ordersTable,
  orderLineItemsTable,
  productsTable,
  accountsTable,
  WHOLESALE_SHARE_SPLIT_MODES,
  type WholesaleShareItem,
  type WholesaleShareSplitMode,
} from "@workspace/db";
import { eq, and, isNull, sql, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireWholesale } from "../middleware/require-wholesale";
import { requireAdmin } from "../middleware/require-admin";
import { getActiveWholesaleVendor } from "./config";
import {
  calcTotalShipping,
  pickRegionForCountry,
  splitShipping,
  type ShippingVendor,
} from "../lib/wholesale-shipping";
import { writeLog } from "../lib/audit-log";
import { postWholesaleChatMessage } from "../lib/wholesale-share-chat";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const SHARE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomShareCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += SHARE_ID_ALPHABET[Math.floor(Math.random() * SHARE_ID_ALPHABET.length)];
  }
  return s;
}

async function generateUniqueShareId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = randomShareCode();
    const [existing] = await db
      .select({ id: wholesaleSharesTable.id })
      .from(wholesaleSharesTable)
      .where(eq(wholesaleSharesTable.id, id));
    if (!existing) return id;
  }
  // Extremely unlikely fallback
  return randomShareCode(8);
}

// Next numeric order code (mirrors generateCode in routes/orders.ts). Returns the
// integer so the lock loop can assign sequential codes without re-querying.
async function nextOrderCodeBase(): Promise<number> {
  const [row] = await db
    .select({ maxCode: sql<string>`max(cast(code as integer)) filter (where code ~ '^[0-9]+$')` })
    .from(ordersTable);
  return Math.max(1000, (parseInt(row?.maxCode ?? "999", 10) || 999) + 1);
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Sentinel thrown inside the cancel transaction when the conditional parent
// update matches no row (the share was concurrently submitted or cancelled),
// so the route can roll back and respond 409.
const NOT_CANCELLABLE = Symbol("share_not_cancellable");

// Sentinel thrown inside the lock transaction when the parent is no longer "open"
// (a concurrent cancel/lock won the race), so the materialised orders roll back
// and the route can respond 409 instead of overwriting the new status.
const LOCK_CONFLICT = Symbol("share_lock_conflict");

// Thrown inside the fee-update transaction when the share is no longer "open"
// (a concurrent lock/cancel won the race), so fee writes roll back and we 409.
const FEES_CONFLICT = Symbol("share_fees_conflict");

// Thrown inside the unlock transaction when a concurrent cancel/submit already
// moved the share off "locked", so we abort with 409 instead of reopening it.
const UNLOCK_CONFLICT = Symbol("share_unlock_conflict");
// Thrown when unlock is attempted but a member has already started/finished paying
// — the organiser should cancel (which flags refunds) instead of dropping the order.
const UNLOCK_HAS_PAID = Symbol("share_unlock_has_paid");

// Server-authoritative delivery address. The organiser only chooses WHICH member
// receives the parcel — the address itself is read from that member's own saved
// account profile, never trusted from the organiser's request body. Returns null
// when the member hasn't saved a usable address (needs at least line 1 + country).
async function deliveryAddressFor(username: string): Promise<{
  name: string; phone: string | null; email: string | null; address: string; country: string;
} | null> {
  const [acct] = await db
    .select({
      email: accountsTable.email,
      country: accountsTable.country,
      addressLine1: accountsTable.addressLine1,
      addressLine2: accountsTable.addressLine2,
      addressCity: accountsTable.addressCity,
      addressPostcode: accountsTable.addressPostcode,
      addressPhone: accountsTable.addressPhone,
      addressPhonePrefix: accountsTable.addressPhonePrefix,
    })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${username.toLowerCase()}`);
  if (!acct || !acct.addressLine1 || !acct.country) return null;
  const cityLine = [acct.addressCity, acct.addressPostcode].filter(Boolean).join(" ").trim();
  const address = [acct.addressLine1, acct.addressLine2, cityLine].filter(Boolean).join("\n");
  const phone = [acct.addressPhonePrefix, acct.addressPhone].filter(Boolean).join(" ").trim() || null;
  return { name: username, phone, email: acct.email ?? null, address, country: acct.country };
}

// Which member usernames have a usable saved delivery address (line 1 + country).
async function membersWithAddress(usernames: string[]): Promise<Set<string>> {
  const lc = usernames.map(u => u.toLowerCase());
  if (lc.length === 0) return new Set();
  const rows = await db
    .select({
      username: accountsTable.telegramUsername,
      addressLine1: accountsTable.addressLine1,
      country: accountsTable.country,
    })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) IN (${sql.join(lc.map(u => sql`${u}`), sql`, `)})`);
  return new Set(rows.filter(r => r.addressLine1 && r.country).map(r => r.username.toLowerCase()));
}

// Sum of kit quantities across a member's draft items.
function memberKits(items: WholesaleShareItem[]): number {
  return items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
}

function memberSubtotal(items: WholesaleShareItem[]): number {
  return Number(
    items.reduce((s, i) => s + Number(((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)).toFixed(2)), 0).toFixed(2),
  );
}

type ShareRow = typeof wholesaleSharesTable.$inferSelect;
type MemberRow = typeof wholesaleShareMembersTable.$inferSelect;

// Build the full client-facing share payload, computing a live shipping estimate
// and split preview while the share is open, and reading snapshots once locked.
async function buildShareResponse(share: ShareRow, currentUsername: string) {
  const members = await db
    .select()
    .from(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.shareId, share.id))
    .orderBy(wholesaleShareMembersTable.joinedAt);

  // Pull materialised orders (if locked) so we can surface real payment status.
  const orderIds = members.map(m => m.orderId).filter((x): x is string => !!x);
  const orderById = new Map<string, typeof ordersTable.$inferSelect>();
  if (orderIds.length > 0) {
    const orders = await db.select().from(ordersTable).where(sql`${ordersTable.id} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
    for (const o of orders) orderById.set(o.id, o);
  }

  // Which members can be chosen for delivery (have a saved account address).
  const addressOk = await membersWithAddress(members.map(m => m.username));

  const isLocked = share.status !== "open";
  const splitMode = (share.splitMode as WholesaleShareSplitMode) ?? "even";

  const combinedKits = members.reduce((s, m) => s + memberKits(m.items ?? []), 0);
  const combinedSubtotal = Number(members.reduce((s, m) => s + memberSubtotal(m.items ?? []), 0).toFixed(2));

  // Resolve vendor + delivery region for a live shipping estimate.
  const vendor = await getActiveWholesaleVendor();
  let shippingEstimate: number | null = null;
  let shippingRegion: string | null = null;
  let estimateCalculable = false;

  if (vendor && share.shippingCountry) {
    const picked = pickRegionForCountry(vendor as unknown as ShippingVendor, share.shippingCountry);
    if (picked) {
      shippingRegion = picked.region.name;
      if (combinedKits > 0) {
        const est = calcTotalShipping(vendor as unknown as ShippingVendor, picked.region, combinedKits);
        if (est !== null) {
          shippingEstimate = est;
          estimateCalculable = true;
        }
      } else {
        estimateCalculable = !picked.region.customNote && !picked.region.priceNote && !!picked.region.prices;
      }
    }
  }

  // Per-member shipping shares: snapshot when locked, live preview while open.
  let liveShares: number[] = members.map(() => 0);
  if (!isLocked && shippingEstimate !== null) {
    const weights = members.map(m => memberKits(m.items ?? []));
    liveShares = splitShipping(shippingEstimate, weights, splitMode);
  }

  // The parcel recipient (delivery member) is exempt from the organiser fee. Treat
  // their effective fee as 0 here so a post-set recipient change can never leave a
  // stale fee on the new recipient.
  const recipientLower = share.deliveryUsername?.toLowerCase() ?? null;
  const currentLower = currentUsername.toLowerCase();

  const memberPayloads = members.map((m, idx) => {
    const items = m.items ?? [];
    const order = m.orderId ? orderById.get(m.orderId) : undefined;
    const shippingShare = isLocked
      ? (m.shippingShare != null ? Number(m.shippingShare) : 0)
      : (shippingEstimate !== null ? liveShares[idx] : null);
    const mLower = m.username.toLowerCase();
    const isRecipient = recipientLower != null && mLower === recipientLower;
    const organiserFee = isRecipient ? 0 : Number(m.organiserFee ?? 0);
    // Onward shipping address privacy: each member enters their OWN onward address
    // (where the recipient should forward their items). It is visible ONLY to the
    // chosen parcel recipient and to the member themselves — never the organiser or
    // other members. The mere existence flag is safe to expose so the UI can show
    // who still needs to add one without leaking the address itself.
    const isOwn = mLower === currentLower;
    const isRecipientViewer = recipientLower != null && recipientLower === currentLower;
    const canSeeOnward = isRecipientViewer || isOwn;
    const hasOnwardAddress = !!(m.onwardAddress && m.onwardCountry);
    return {
      username: m.username,
      isCreator: m.isCreator,
      isYou: m.username.toLowerCase() === currentUsername.toLowerCase(),
      isRecipient,
      items: items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
      kits: memberKits(items),
      subtotal: memberSubtotal(items),
      tip: Number(m.tip ?? 0),
      shippingShare,
      // Optional organiser fee (paid separately, NOT to admin/vendor).
      organiserFee,
      organiserFeePaid: organiserFee > 0 ? (m.organiserFeePaid ?? false) : false,
      orderId: m.orderId ?? null,
      orderCode: order?.code ?? null,
      orderStatus: order?.status ?? null,
      paymentStatus: order?.paymentStatus ?? null,
      hasDeliveryAddress: addressOk.has(m.username.toLowerCase()),
      // The organiser may remove any non-creator member while the order is open.
      canRemove: share.status === "open" && share.creatorUsername.toLowerCase() === currentLower && !m.isCreator,
      // Onward shipping address — exists flag for everyone; full address only for
      // the recipient or the member themselves. The recipient (not the parcel
      // receiver) never needs an onward address, so only non-recipients may edit one.
      hasOnwardAddress,
      onward: canSeeOnward ? {
        name: m.onwardName ?? null,
        phone: m.onwardPhone ?? null,
        email: m.onwardEmail ?? null,
        address: m.onwardAddress ?? null,
        country: m.onwardCountry ?? null,
      } : null,
      canEditOnward: isOwn && !isRecipient && share.status !== "cancelled",
    };
  });

  const organiserFeeTotal = Number(memberPayloads.reduce((s, m) => s + m.organiserFee, 0).toFixed(2));
  const isCreatorViewer = share.creatorUsername.toLowerCase() === currentLower;

  const allPaid = isLocked
    && memberPayloads.length > 0
    && memberPayloads.every(m => m.paymentStatus === "confirmed");

  const me = members.find(m => m.username.toLowerCase() === currentUsername.toLowerCase());

  return {
    id: share.id,
    status: share.status,
    splitMode,
    maxMembers: share.maxMembers,
    vendorId: share.vendorId ?? null,
    creatorUsername: share.creatorUsername,
    isCreator: share.creatorUsername.toLowerCase() === currentUsername.toLowerCase(),
    currentUsername,
    isMember: !!me,
    delivery: (() => {
      // Only the organiser and the designated recipient see the full address.
      // All other participants see only who is receiving and the country (for context).
      const isRecipientViewer = !!share.deliveryUsername
        && share.deliveryUsername.toLowerCase() === currentLower;
      const canSeeAddress = isCreatorViewer || isRecipientViewer;
      return {
        username: share.deliveryUsername ?? null,
        name: canSeeAddress ? (share.shippingName ?? null) : null,
        phone: canSeeAddress ? (share.shippingPhone ?? null) : null,
        email: canSeeAddress ? (share.shippingEmail ?? null) : null,
        address: canSeeAddress ? (share.shippingAddress ?? null) : null,
        country: share.shippingCountry ?? null,
        // The designated recipient (and only they) may set a one-off address while open.
        canEditAddress: share.status === "open"
          && !!share.deliveryUsername
          && isRecipientViewer,
      };
    })(),
    vendor: vendor ? {
      id: vendor.id,
      name: vendor.name,
      tiers: vendor.tiers,
      tierBounds: vendor.tierBounds,
      maxKitsPerPackage: vendor.maxKitsPerPackage,
      regions: vendor.regions,
    } : null,
    shippingEstimate,
    shippingRegion,
    estimateCalculable,
    combinedKits,
    combinedSubtotal,
    totalVendorShipping: share.totalVendorShipping != null ? Number(share.totalVendorShipping) : null,
    totalKits: share.totalKits != null ? Number(share.totalKits) : null,
    // True once a set deadline has passed (UI shows "deadline passed, waiting on…").
    deadlinePassed: share.lockDeadline ? (share.lockDeadline as Date).getTime() <= Date.now() : false,
    // ── Organiser-set order rules (limits, deadline, allowed countries) ────────
    settings: {
      maxMembers: share.maxMembers ?? null,
      minKitsPerMember: share.minKitsPerMember ?? null,
      maxKitsPerMember: share.maxKitsPerMember ?? null,
      maxTotalKits: share.maxTotalKits ?? null,
      lockDeadline: share.lockDeadline ? (share.lockDeadline as Date).toISOString() : null,
      allowedCountries: share.allowedCountries ?? null,
      canManage: share.status === "open" && isCreatorViewer,
    },
    // ── Optional organiser fee (paid directly to the organiser/creator) ────────
    fees: {
      organiserPaymentInfo: share.organiserPaymentInfo ?? null,
      organiserFeeTotal,
      active: organiserFeeTotal > 0,
      recipientUsername: share.deliveryUsername ?? null,
      organiserUsername: share.creatorUsername,
      canManage: share.status === "open" && isCreatorViewer,
      canConfirmOrganiserFees: isCreatorViewer,
    },
    members: memberPayloads,
    memberCount: members.length,
    allPaid,
    createdAt: (share.createdAt as Date).toISOString(),
    lockedAt: share.lockedAt ? (share.lockedAt as Date).toISOString() : null,
    submittedAt: share.submittedAt ? (share.submittedAt as Date).toISOString() : null,
    cancelledAt: share.cancelledAt ? (share.cancelledAt as Date).toISOString() : null,
  };
}

async function loadShare(id: string): Promise<ShareRow | null> {
  const [share] = await db.select().from(wholesaleSharesTable).where(eq(wholesaleSharesTable.id, id));
  return share ?? null;
}

async function loadMember(shareId: string, username: string): Promise<MemberRow | null> {
  const [m] = await db
    .select()
    .from(wholesaleShareMembersTable)
    .where(and(
      eq(wholesaleShareMembersTable.shareId, shareId),
      sql`lower(${wholesaleShareMembersTable.username}) = ${username.toLowerCase()}`,
    ));
  return m ?? null;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/wholesale-shares — list shares the current member belongs to
router.get("/wholesale-shares", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const myMemberships = await db
    .select({ shareId: wholesaleShareMembersTable.shareId })
    .from(wholesaleShareMembersTable)
    .where(sql`lower(${wholesaleShareMembersTable.username}) = ${me.toLowerCase()}`);

  const shareIds = myMemberships.map(m => m.shareId);
  if (shareIds.length === 0) { res.json([]); return; }

  const shares = await db
    .select()
    .from(wholesaleSharesTable)
    .where(sql`${wholesaleSharesTable.id} IN (${sql.join(shareIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(wholesaleSharesTable.createdAt));

  // Member counts per share (single grouped query)
  const counts = await db
    .select({ shareId: wholesaleShareMembersTable.shareId, c: sql<number>`count(*)::int` })
    .from(wholesaleShareMembersTable)
    .where(sql`${wholesaleShareMembersTable.shareId} IN (${sql.join(shareIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(wholesaleShareMembersTable.shareId);
  const countMap = new Map(counts.map(c => [c.shareId, c.c]));

  res.json(shares.map(s => ({
    id: s.id,
    status: s.status,
    splitMode: s.splitMode,
    isCreator: s.creatorUsername.toLowerCase() === me.toLowerCase(),
    memberCount: countMap.get(s.id) ?? 0,
    maxMembers: s.maxMembers,
    createdAt: (s.createdAt as Date).toISOString(),
  })));
});

// POST /api/wholesale-shares — create a new shared order; creator becomes first member
router.post("/wholesale-shares", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const body = (req.body ?? {}) as { splitMode?: string };
  const splitMode: WholesaleShareSplitMode =
    body.splitMode && (WHOLESALE_SHARE_SPLIT_MODES as readonly string[]).includes(body.splitMode)
      ? (body.splitMode as WholesaleShareSplitMode)
      : "even";

  const vendor = await getActiveWholesaleVendor();
  const id = await generateUniqueShareId();

  await db.insert(wholesaleSharesTable).values({
    id,
    creatorUsername: me,
    status: "open",
    splitMode,
    vendorId: vendor?.id ?? null,
  });

  await db.insert(wholesaleShareMembersTable).values({
    id: randomUUID(),
    shareId: id,
    username: me,
    isCreator: true,
    items: [],
    tip: "0",
  });

  await writeLog("order", "info", "wholesale_share_created",
    `Wholesale share ${id} created by ${me}`, { shareId: id, creator: me }, req.ip);

  const share = await loadShare(id);
  res.status(201).json(await buildShareResponse(share!, me));
});

// GET /api/wholesale-shares/:id — full detail (members only)
router.get("/wholesale-shares/:id", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  const member = await loadMember(share.id, me);
  if (!member) {
    // Non-members can still see WHO invited them (the order lead) on the join
    // screen — the share id is an invite code, so this isn't a leak.
    res.status(403).json({ error: "You are not a member of this shared order.", creatorUsername: share.creatorUsername });
    return;
  }
  // Lazy deadline lock: if the organiser set a deadline that has passed, attempt an
  // auto-lock now as a best-effort backup to the scheduler. Failures (e.g. a member
  // still has no items) leave the order open; the conditional update guards races.
  let current = share;
  if (current.status === "open" && current.lockDeadline && (current.lockDeadline as Date).getTime() <= Date.now()) {
    await attemptLockShare(current, current.creatorUsername, "auto");
    current = (await loadShare(current.id)) ?? current;
  }
  res.json(await buildShareResponse(current, me));
});

// GET /api/wholesale-shares/:id/messages — chat thread (members only)
router.get("/wholesale-shares/:id/messages", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  const member = await loadMember(share.id, me);
  if (!member) { res.status(403).json({ error: "You are not a member of this shared order." }); return; }

  const rows = await db
    .select()
    .from(wholesaleShareMessagesTable)
    .where(eq(wholesaleShareMessagesTable.shareId, share.id))
    .orderBy(desc(wholesaleShareMessagesTable.createdAt))
    .limit(200);

  const meLower = me.toLowerCase();
  const messages = rows.reverse().map(m => ({
    id: m.id,
    username: m.username,
    body: m.body,
    createdAt: (m.createdAt as Date).toISOString(),
    isYou: m.username.toLowerCase() === meLower,
  }));
  res.json(messages);
});

// POST /api/wholesale-shares/:id/messages — post a chat message (members only)
router.post("/wholesale-shares/:id/messages", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const raw = (req.body ?? {}) as { body?: unknown };
  const result = await postWholesaleChatMessage({
    shareId: String(req.params.id),
    senderUsername: me,
    body: typeof raw.body === "string" ? raw.body : "",
  });
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.status(201).json({
    id: result.message.id,
    username: result.message.username,
    body: result.message.body,
    createdAt: result.message.createdAt.toISOString(),
    isYou: true,
  });
});

// POST /api/wholesale-shares/:id/join — join an open shared order (wholesale members only)
router.post("/wholesale-shares/:id/join", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is no longer open to join." }); return; }

  const existing = await loadMember(share.id, me);
  if (existing) { res.json(await buildShareResponse(share, me)); return; }

  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.shareId, share.id));
  if (share.maxMembers != null && c >= share.maxMembers) {
    res.status(409).json({ error: `This shared order is full (max ${share.maxMembers} members).` });
    return;
  }

  try {
    await db.insert(wholesaleShareMembersTable).values({
      id: randomUUID(),
      shareId: share.id,
      username: me,
      isCreator: false,
      items: [],
      tip: "0",
    });
  } catch {
    // Unique (shareId, username) — already joined via a race; fall through to response.
  }

  await writeLog("order", "info", "wholesale_share_joined",
    `${me} joined wholesale share ${share.id}`, { shareId: share.id, username: me }, req.ip);

  res.json(await buildShareResponse(share, me));
});

// POST /api/wholesale-shares/:id/leave — non-creator member leaves an open share
router.post("/wholesale-shares/:id/leave", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.status !== "open") {
    res.status(409).json({ error: "This shared order is locked — you can no longer leave. Contact the organiser." });
    return;
  }
  if (share.creatorUsername.toLowerCase() === me.toLowerCase()) {
    res.status(400).json({ error: "As the organiser, you cannot leave — use Cancel instead." });
    return;
  }
  const member = await loadMember(share.id, me);
  if (!member) { res.status(404).json({ error: "You are not a member of this shared order." }); return; }

  // If the leaving member is the designated delivery recipient, clear the delivery
  // snapshot so the organiser must choose a new recipient before locking.
  const isDelivery = share.deliveryUsername && share.deliveryUsername.toLowerCase() === me.toLowerCase();
  if (isDelivery) {
    await db.update(wholesaleSharesTable)
      .set({
        deliveryUsername: null,
        shippingName: null,
        shippingPhone: null,
        shippingEmail: null,
        shippingAddress: null,
        shippingCountry: null,
      })
      .where(and(
        eq(wholesaleSharesTable.id, share.id),
        eq(wholesaleSharesTable.status, "open"),
      ));
  }

  await db.delete(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.id, member.id));

  await writeLog("order", "info", "wholesale_share_left",
    `${me} left wholesale share ${share.id}`, { shareId: share.id, username: me }, req.ip);

  res.json({ ok: true });
});

// PUT /api/wholesale-shares/:id/items — set the current member's items + tip
router.put("/wholesale-shares/:id/items", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is locked — items can no longer be changed." }); return; }
  const member = await loadMember(share.id, me);
  if (!member) { res.status(403).json({ error: "You are not a member of this shared order." }); return; }

  const body = (req.body ?? {}) as { items?: Array<{ productId?: unknown; quantity?: unknown }>; tip?: unknown };
  if (!Array.isArray(body.items)) { res.status(400).json({ error: "items must be an array" }); return; }

  // Server-authoritative product lookup: only active, wholesale-enabled global products.
  const wholesaleProducts = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      wholesalePrice: productsTable.wholesalePrice,
    })
    .from(productsTable)
    .where(and(
      eq(productsTable.active, true),
      eq(productsTable.wholesaleEnabled, true),
      isNull(productsTable.sourceGroupBuyId),
    ));
  const productMap = new Map(wholesaleProducts.map(p => [p.id, p]));

  const cleanItems: WholesaleShareItem[] = [];
  for (const raw of body.items) {
    const productId = typeof raw.productId === "string" ? raw.productId : null;
    const quantity = Math.round(Number(raw.quantity));
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
    if (quantity > 1000) { res.status(400).json({ error: "Quantity too large." }); return; }
    const product = productMap.get(productId);
    if (!product) { res.status(400).json({ error: `Product ${productId} is not available for wholesale.` }); return; }
    const unitPrice = product.wholesalePrice != null ? parseFloat(product.wholesalePrice) : parseFloat(product.price);
    cleanItems.push({ productId, productName: product.name, quantity, unitPrice });
  }

  let tip = 0;
  if (body.tip != null) {
    tip = Number(body.tip);
    if (!Number.isFinite(tip) || tip < 0) tip = 0;
    if (tip > 100000) { res.status(400).json({ error: "Tip too large." }); return; }
  }

  // ── Organiser-set kit caps ──
  const newMemberKits = memberKits(cleanItems);
  if (share.maxKitsPerMember && share.maxKitsPerMember > 0 && newMemberKits > share.maxKitsPerMember) {
    res.status(400).json({ error: `This shared order allows at most ${share.maxKitsPerMember} kits per person.` });
    return;
  }
  if (share.maxTotalKits && share.maxTotalKits > 0) {
    const allMembers = await db
      .select({ id: wholesaleShareMembersTable.id, items: wholesaleShareMembersTable.items })
      .from(wholesaleShareMembersTable)
      .where(eq(wholesaleShareMembersTable.shareId, share.id));
    const othersKits = allMembers
      .filter(m => m.id !== member.id)
      .reduce((s, m) => s + memberKits(m.items ?? []), 0);
    if (othersKits + newMemberKits > share.maxTotalKits) {
      const remaining = Math.max(0, share.maxTotalKits - othersKits);
      res.status(400).json({ error: `This shared order is limited to ${share.maxTotalKits} kits total — only ${remaining} kit(s) left for you.` });
      return;
    }
  }

  // Gate the write on the parent share STILL being open in the same statement, so a
  // concurrent lock/cancel can't slip items in after the order is materialised.
  const itemsUpdated = await db.update(wholesaleShareMembersTable)
    .set({ items: cleanItems, tip: tip.toFixed(2) })
    .where(and(
      eq(wholesaleShareMembersTable.id, member.id),
      sql`EXISTS (SELECT 1 FROM ${wholesaleSharesTable} WHERE ${wholesaleSharesTable.id} = ${share.id} AND ${wholesaleSharesTable.status} = 'open')`,
    ))
    .returning({ id: wholesaleShareMembersTable.id });
  if (itemsUpdated.length === 0) {
    res.status(409).json({ error: "This shared order is locked — items can no longer be changed." });
    return;
  }

  res.json(await buildShareResponse(share, me));
});

// PUT /api/wholesale-shares/:id/delivery — creator sets the delivery member + address
router.put("/wholesale-shares/:id/delivery", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can set the delivery member." });
    return;
  }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is locked." }); return; }

  const body = (req.body ?? {}) as { deliveryUsername?: unknown };
  const deliveryUsername = typeof body.deliveryUsername === "string" ? body.deliveryUsername.trim() : "";
  if (!deliveryUsername) { res.status(400).json({ error: "deliveryUsername is required" }); return; }

  const deliveryMember = await loadMember(share.id, deliveryUsername);
  if (!deliveryMember) { res.status(400).json({ error: "The delivery member must be a member of this shared order." }); return; }

  // The organiser only chooses WHO receives the parcel — any member can be picked.
  // When the receiver changes, seed the shipping snapshot from that member's saved
  // account address if they have one; otherwise leave it blank so the recipient can
  // add a one-off address themselves (PUT .../delivery-address). The address is
  // never trusted from THIS request body — the organiser can't type it for someone.
  const changingReceiver = (share.deliveryUsername ?? "").toLowerCase() !== deliveryMember.username.toLowerCase();
  if (changingReceiver) {
    const addr = await deliveryAddressFor(deliveryMember.username);
    // CONDITIONAL update gated on status='open' — if a concurrent lock/cancel won
    // the race after our precheck, no row updates and we respond 409 rather than
    // mutating the shipping snapshot of an already-locked share.
    const changed = await db.update(wholesaleSharesTable)
      .set({
        deliveryUsername: deliveryMember.username,
        shippingName: addr?.name ?? null,
        shippingPhone: addr?.phone ?? null,
        shippingEmail: addr?.email ?? null,
        shippingAddress: addr?.address ?? null,
        shippingCountry: addr?.country ?? null,
      })
      .where(and(
        eq(wholesaleSharesTable.id, share.id),
        eq(wholesaleSharesTable.status, "open"),
      ))
      .returning({ id: wholesaleSharesTable.id });
    if (changed.length === 0) {
      res.status(409).json({ error: "This shared order is no longer open." });
      return;
    }
  }

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// PUT /api/wholesale-shares/:id/delivery-address — the DESIGNATED delivery member
// sets a one-off shipping address for this parcel only. This overrides their saved
// account address for this share without changing their account. Receiver-only:
// the organiser picks WHO receives the parcel but can never type an address for
// someone else (the original anti-spoofing rule still holds for everyone but the
// recipient themselves).
router.put("/wholesale-shares/:id/delivery-address", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is locked." }); return; }
  if (!share.deliveryUsername) {
    res.status(400).json({ error: "The organiser needs to choose the delivery member first." });
    return;
  }
  if (share.deliveryUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the chosen delivery recipient can set the shipping address." });
    return;
  }
  // The recipient must still be a member of this shared order.
  const member = await loadMember(share.id, me);
  if (!member) { res.status(403).json({ error: "You are not a member of this shared order." }); return; }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(body.name, 120);
  const line1 = str(body.addressLine1);
  const line2 = str(body.addressLine2);
  const city = str(body.city, 120);
  const postcode = str(body.postcode, 40);
  const country = str(body.country, 80);
  const phone = str(body.phone, 60);
  const email = str(body.email, 160);

  if (!name) { res.status(400).json({ error: "Enter the recipient's name." }); return; }
  if (!line1) { res.status(400).json({ error: "Enter the first line of the address." }); return; }
  if (!country) { res.status(400).json({ error: "Choose the destination country." }); return; }
  if (!phone) { res.status(400).json({ error: "Enter a contact phone number for delivery." }); return; }

  // The country must map to a shippable vendor region or the parcel can never be
  // priced or locked — reject early so the recipient gets immediate feedback.
  const vendor = await getActiveWholesaleVendor();
  if (!vendor) { res.status(400).json({ error: "No active wholesale vendor is configured. Please contact an admin." }); return; }
  if (!pickRegionForCountry(vendor as unknown as ShippingVendor, country)) {
    res.status(400).json({ error: `The current vendor doesn't ship to "${country}". Please choose a different destination.` });
    return;
  }
  // Organiser country allow-list (if set) — the parcel may only go to listed countries.
  if (!countryAllowed(share.allowedCountries, country)) {
    res.status(400).json({ error: `This shared order can only ship to: ${(share.allowedCountries ?? []).join(", ")}.` });
    return;
  }

  const cityLine = [city, postcode].filter(Boolean).join(" ").trim();
  const address = [line1, line2, cityLine].filter(Boolean).join("\n");

  // CONDITIONAL update gated on BOTH status='open' AND the recipient still being the
  // designated delivery member. If a concurrent lock/cancel won the race, or the
  // organiser reassigned delivery to someone else after our precheck, no row updates
  // and we respond 409 rather than overwriting the wrong recipient's snapshot.
  const changed = await db.update(wholesaleSharesTable)
    .set({
      shippingName: name,
      shippingPhone: phone || null,
      shippingEmail: email || null,
      shippingAddress: address,
      shippingCountry: country,
    })
    .where(and(
      eq(wholesaleSharesTable.id, share.id),
      eq(wholesaleSharesTable.status, "open"),
      sql`lower(${wholesaleSharesTable.deliveryUsername}) = ${me.toLowerCase()}`,
    ))
    .returning({ id: wholesaleSharesTable.id });
  if (changed.length === 0) {
    res.status(409).json({ error: "This shared order is no longer open or you're no longer the chosen recipient." });
    return;
  }

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// PUT /api/wholesale-shares/:id/my-onward-address — any member sets THEIR OWN
// onward shipping address (where the chosen recipient should forward their items
// after the combined parcel arrives). Self-service only: a member can only set
// their own address, and it is readable only by the recipient and themselves
// (enforced in buildShareResponse). Editable until the share is cancelled — the
// recipient still needs it to forward items after the order is locked/submitted.
// Unlike the parcel delivery address, the onward destination is NOT vendor-priced
// (the recipient forwards it themselves), so we don't validate against vendor
// regions or the organiser country allow-list.
router.put("/wholesale-shares/:id/my-onward-address", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.status === "cancelled") { res.status(409).json({ error: "This shared order has been cancelled." }); return; }

  const member = await loadMember(share.id, me);
  if (!member) { res.status(403).json({ error: "You are not a member of this shared order." }); return; }
  // The chosen parcel recipient receives the whole parcel directly — they have no
  // onward leg, so they can't set an onward address for themselves.
  if (share.deliveryUsername && share.deliveryUsername.toLowerCase() === me.toLowerCase()) {
    res.status(400).json({ error: "You're the parcel recipient — you don't need an onward address." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(body.name, 120);
  const line1 = str(body.addressLine1);
  const line2 = str(body.addressLine2);
  const city = str(body.city, 120);
  const postcode = str(body.postcode, 40);
  const country = str(body.country, 80);
  const phone = str(body.phone, 60);
  const email = str(body.email, 160);

  if (!name) { res.status(400).json({ error: "Enter the recipient's name." }); return; }
  if (!line1) { res.status(400).json({ error: "Enter the first line of the address." }); return; }
  if (!country) { res.status(400).json({ error: "Choose the destination country." }); return; }
  if (!phone) { res.status(400).json({ error: "Enter a contact phone number for delivery." }); return; }

  const cityLine = [city, postcode].filter(Boolean).join(" ").trim();
  const address = [line1, line2, cityLine].filter(Boolean).join("\n");

  // CONDITIONAL update — re-checks at write time that the share isn't cancelled and
  // that I'm still NOT the chosen recipient (the recipient has no onward leg). If a
  // concurrent cancel, or the organiser making me the recipient, won the race after
  // our precheck, no row updates and we respond 409 rather than persisting a stale
  // onward address. Mirrors the delivery-address handler's race-safe pattern.
  const changed = await db.update(wholesaleShareMembersTable)
    .set({
      onwardName: name,
      onwardPhone: phone || null,
      onwardEmail: email || null,
      onwardAddress: address,
      onwardCountry: country,
    })
    .where(and(
      eq(wholesaleShareMembersTable.shareId, share.id),
      sql`lower(${wholesaleShareMembersTable.username}) = ${me.toLowerCase()}`,
      sql`EXISTS (SELECT 1 FROM ${wholesaleSharesTable} s WHERE s.id = ${share.id} AND s.status <> 'cancelled' AND (s.delivery_username IS NULL OR lower(s.delivery_username) <> ${me.toLowerCase()}))`,
    ))
    .returning({ id: wholesaleShareMembersTable.id });
  if (changed.length === 0) {
    res.status(409).json({ error: "This shared order is no longer open to onward changes, or you're now the parcel recipient." });
    return;
  }

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// PUT /api/wholesale-shares/:id/split — creator sets the shipping split mode
router.put("/wholesale-shares/:id/split", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can change the split mode." });
    return;
  }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is locked." }); return; }

  const body = (req.body ?? {}) as { splitMode?: string };
  if (!body.splitMode || !(WHOLESALE_SHARE_SPLIT_MODES as readonly string[]).includes(body.splitMode)) {
    res.status(400).json({ error: `splitMode must be one of: ${WHOLESALE_SHARE_SPLIT_MODES.join(", ")}` });
    return;
  }

  await db.update(wholesaleSharesTable)
    .set({ splitMode: body.splitMode })
    .where(eq(wholesaleSharesTable.id, share.id));

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// PUT /api/wholesale-shares/:id/settings — organiser sets order limits & rules
// (max people, min/max kits per person, max total kits, a lock deadline, and an
// allowed-country list). All fields are optional; null/empty clears that rule.
router.put("/wholesale-shares/:id/settings", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can change the order rules." });
    return;
  }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is locked." }); return; }

  const body = (req.body ?? {}) as Record<string, unknown>;

  // Optional non-negative integer limit. null/"" clears it.
  const parseLimit = (v: unknown, label: string, max = 100000):
    | { ok: true; value: number | null }
    | { ok: false; error: string } => {
    if (v == null || v === "") return { ok: true, value: null };
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return { ok: false, error: `${label} must be a whole number of 0 or more.` };
    }
    if (n > max) return { ok: false, error: `${label} is too large.` };
    return { ok: true, value: n };
  };

  const minR = parseLimit(body.minKitsPerMember, "Minimum kits per person");
  if (!minR.ok) { res.status(400).json({ error: minR.error }); return; }
  const maxR = parseLimit(body.maxKitsPerMember, "Maximum kits per person");
  if (!maxR.ok) { res.status(400).json({ error: maxR.error }); return; }
  const totalR = parseLimit(body.maxTotalKits, "Maximum total kits");
  if (!totalR.ok) { res.status(400).json({ error: totalR.error }); return; }
  const minVal = minR.value;
  const maxVal = maxR.value;
  const totalVal = totalR.value;

  if (minVal != null && maxVal != null && minVal > maxVal) {
    res.status(400).json({ error: "Minimum kits per person can't be more than the maximum." });
    return;
  }
  if (maxVal != null && totalVal != null && maxVal > totalVal) {
    res.status(400).json({ error: "Maximum kits per person can't be more than the total kit limit." });
    return;
  }

  // Deadline: null/"" clears it. Must parse; a slightly past time is allowed (means
  // "lock as soon as it's ready"), but reject the distant past as a likely mistake.
  let deadline: Date | null = null;
  if (body.lockDeadline != null && body.lockDeadline !== "") {
    const d = new Date(String(body.lockDeadline));
    if (isNaN(d.getTime())) { res.status(400).json({ error: "The deadline isn't a valid date/time." }); return; }
    if (d.getTime() < Date.now() - 365 * 24 * 60 * 60 * 1000) {
      res.status(400).json({ error: "The deadline is too far in the past." });
      return;
    }
    deadline = d;
  }

  // Allowed countries: optional list; null/empty = ship anywhere the vendor serves.
  let allowedCountries: string[] | null = null;
  if (Array.isArray(body.allowedCountries)) {
    const cleaned = Array.from(new Set(
      body.allowedCountries
        .filter((c): c is string => typeof c === "string")
        .map(c => c.trim().slice(0, 80))
        .filter(Boolean),
    )).slice(0, 100);
    allowedCountries = cleaned.length > 0 ? cleaned : null;
  }

  // Max people: null/"" = no limit. A whole number >= 2, never below the count of
  // members already in the order (so an existing member is never orphaned).
  let maxMembers: number | null = null;
  if (body.maxMembers != null && body.maxMembers !== "") {
    const m = Number(body.maxMembers);
    if (!Number.isFinite(m) || !Number.isInteger(m) || m < 2) {
      res.status(400).json({ error: "Max people must be a whole number of 2 or more (or blank for no limit)." });
      return;
    }
    if (m > 1000) { res.status(400).json({ error: "Max people is too large." }); return; }
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(wholesaleShareMembersTable)
      .where(eq(wholesaleShareMembersTable.shareId, share.id));
    if (m < c) {
      res.status(400).json({ error: `Max people can't be below the ${c} member${c === 1 ? "" : "s"} already in this order.` });
      return;
    }
    maxMembers = m;
  }

  // CONDITIONAL update gated on status='open' so a concurrent lock/cancel wins.
  const changed = await db.update(wholesaleSharesTable)
    .set({
      maxMembers,
      minKitsPerMember: minVal,
      maxKitsPerMember: maxVal,
      maxTotalKits: totalVal,
      lockDeadline: deadline,
      allowedCountries,
    })
    .where(and(
      eq(wholesaleSharesTable.id, share.id),
      eq(wholesaleSharesTable.status, "open"),
    ))
    .returning({ id: wholesaleSharesTable.id });
  if (changed.length === 0) {
    res.status(409).json({ error: "This shared order is no longer open." });
    return;
  }

  await writeLog("order", "info", "wholesale_share_settings_updated",
    `Wholesale share ${share.id} rules updated by ${me}`,
    { shareId: share.id, maxMembers, minKitsPerMember: minVal, maxKitsPerMember: maxVal, maxTotalKits: totalVal, lockDeadline: deadline?.toISOString() ?? null, allowedCountries }, req.ip);

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// POST /api/wholesale-shares/:id/remove-member — organiser removes a member from an
// open shared order. The organiser/creator can't be removed (use Cancel instead).
router.post("/wholesale-shares/:id/remove-member", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can remove members." });
    return;
  }
  if (share.status !== "open") { res.status(409).json({ error: "This shared order is locked — members can no longer be removed." }); return; }

  const body = (req.body ?? {}) as { username?: unknown };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username) { res.status(400).json({ error: "username is required" }); return; }
  if (username.toLowerCase() === share.creatorUsername.toLowerCase()) {
    res.status(400).json({ error: "The organiser can't be removed. Use Cancel to end the order." });
    return;
  }
  const member = await loadMember(share.id, username);
  if (!member) { res.status(404).json({ error: "That member isn't part of this shared order." }); return; }

  // If the removed member was the chosen delivery recipient, clear the delivery
  // snapshot — otherwise the parcel would route to someone no longer in the order.
  // This mirrors the /leave handler and the receiver-change path in PUT /delivery.
  const wasDelivery = !!share.deliveryUsername
    && share.deliveryUsername.toLowerCase() === member.username.toLowerCase();

  // All writes run in one transaction, gated on the parent share STILL being open, so
  // a concurrent lock/cancel can't leave a half-removed member or a recipient cleared
  // on an already-locked order.
  let conflict = false;
  await db.transaction(async (tx) => {
    const guard = await tx.update(wholesaleSharesTable)
      .set(wasDelivery
        ? {
            deliveryUsername: null,
            shippingName: null,
            shippingPhone: null,
            shippingEmail: null,
            shippingAddress: null,
            shippingCountry: null,
          }
        : { updatedAt: new Date() })
      .where(and(
        eq(wholesaleSharesTable.id, share.id),
        eq(wholesaleSharesTable.status, "open"),
      ))
      .returning({ id: wholesaleSharesTable.id });
    if (guard.length === 0) { conflict = true; return; }

    await tx.delete(wholesaleShareMembersTable)
      .where(eq(wholesaleShareMembersTable.id, member.id));
  });
  if (conflict) {
    res.status(409).json({ error: "This shared order is no longer open." });
    return;
  }

  await writeLog("order", "info", "wholesale_share_member_removed",
    `${me} removed ${member.username} from wholesale share ${share.id}`,
    { shareId: share.id, removed: member.username, by: me }, req.ip);

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// ── Shared lock service ────────────────────────────────────────────────────────
// Validates an open share and materialises per-member orders. Used by the manual
// POST /lock endpoint AND the deadline auto-lock scheduler / lazy GET trigger. It
// returns a discriminated result instead of writing an Express response so both
// callers can map it as they need; on success it writes the audit log itself.
type LockResult = { ok: true } | { ok: false; status: number; error: string };

// Case-insensitive country allow-list check. Empty/absent list = all countries.
function countryAllowed(allowed: string[] | null | undefined, country: string | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!country) return false;
  const n = country.trim().toLowerCase();
  return allowed.some(a => a.trim().toLowerCase() === n);
}

export async function attemptLockShare(share: ShareRow, actor: string, mode: "manual" | "auto"): Promise<LockResult> {
  if (share.status !== "open") {
    return { ok: false, status: 409, error: "This shared order is already locked." };
  }

  const members = await db
    .select()
    .from(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.shareId, share.id))
    .orderBy(wholesaleShareMembersTable.joinedAt);

  // ── Validation ──
  if (members.length < 2) {
    return { ok: false, status: 400, error: "A shared order needs at least 2 members before it can be locked." };
  }
  if (!share.deliveryUsername || !share.shippingAddress || !share.shippingCountry || !share.shippingName || !share.shippingPhone) {
    return { ok: false, status: 400, error: "Set the delivery member and their full shipping address (including a contact phone) before locking." };
  }
  const deliveryIsMember = members.some(m => m.username.toLowerCase() === share.deliveryUsername!.toLowerCase());
  if (!deliveryIsMember) {
    return { ok: false, status: 400, error: "The chosen delivery member is no longer part of this shared order." };
  }
  // Per-person minimum (defaults to "at least one item"; honour an explicit higher min).
  const minPer = share.minKitsPerMember && share.minKitsPerMember > 0 ? share.minKitsPerMember : 1;
  const underMin = members.find(m => memberKits(m.items ?? []) < minPer);
  if (underMin) {
    return {
      ok: false, status: 400,
      error: minPer === 1
        ? `Every member must add at least one item before locking (waiting on ${underMin.username}).`
        : `Every member must have at least ${minPer} kits before locking (waiting on ${underMin.username}).`,
    };
  }
  // Per-person maximum.
  if (share.maxKitsPerMember && share.maxKitsPerMember > 0) {
    const overMax = members.find(m => memberKits(m.items ?? []) > share.maxKitsPerMember!);
    if (overMax) {
      return { ok: false, status: 400, error: `${overMax.username} is over the ${share.maxKitsPerMember}-kit per-person limit — ask them to reduce before locking.` };
    }
  }
  // Allowed-country restriction on the parcel's shipping country.
  if (!countryAllowed(share.allowedCountries, share.shippingCountry)) {
    return { ok: false, status: 400, error: `The parcel ships to "${share.shippingCountry}", which isn't in this order's allowed countries.` };
  }

  // ── Shipping ──
  const vendor = await getActiveWholesaleVendor();
  if (!vendor) {
    return { ok: false, status: 400, error: "No active wholesale vendor is configured. Please contact an admin." };
  }
  const picked = pickRegionForCountry(vendor as unknown as ShippingVendor, share.shippingCountry);
  if (!picked) {
    return { ok: false, status: 400, error: `No shipping region matches "${share.shippingCountry}" for the current vendor.` };
  }
  const combinedKits = members.reduce((s, m) => s + memberKits(m.items ?? []), 0);
  // Total kit cap (also enforced as members add items, re-checked here for safety).
  if (share.maxTotalKits && share.maxTotalKits > 0 && combinedKits > share.maxTotalKits) {
    return { ok: false, status: 400, error: `The combined order (${combinedKits} kits) is over the ${share.maxTotalKits}-kit total limit — reduce items before locking.` };
  }
  const totalShipping = calcTotalShipping(vendor as unknown as ShippingVendor, picked.region, combinedKits);
  if (totalShipping === null) {
    return { ok: false, status: 400, error: "Shipping for this region uses custom pricing and can't be auto-calculated. Please contact an admin." };
  }

  const weights = members.map(m => memberKits(m.items ?? []));
  const shares = splitShipping(totalShipping, weights, (share.splitMode as WholesaleShareSplitMode) ?? "even");

  // ── Materialise orders atomically ──
  const codeBase = await nextOrderCodeBase();
  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const items = m.items ?? [];
        const shippingShare = shares[i] ?? 0;
        const tip = Number(m.tip ?? 0);
        const subtotal = memberSubtotal(items);
        const grandTotal = Number((subtotal + shippingShare + tip).toFixed(2));
        const orderId = randomUUID();
        const code = String(codeBase + i);
        const memberTg = m.username.startsWith("@") ? m.username.toLowerCase() : `@${m.username.toLowerCase()}`;

        await tx.insert(ordersTable).values({
          id: orderId,
          code,
          telegramUsername: memberTg,
          deliveryMethod: "Vendor Shipping",
          deliveryPrice: "0",
          vendorShipping: shippingShare.toFixed(2),
          productSubtotal: subtotal.toFixed(2),
          tip: tip.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          status: "Submitted",
          paymentStatus: "unpaid",
          pin: randomPin(),
          orderType: "wholesale_shared",
          sharedOrderId: share.id,
          // Whole parcel ships to the chosen delivery member — every member order
          // carries that same shipping address snapshot.
          shippingName: share.shippingName,
          shippingPhone: share.shippingPhone,
          shippingEmail: share.shippingEmail,
          shippingAddress: share.shippingAddress,
          shippingCountry: share.shippingCountry,
          notes: `Shared wholesale order ${share.id} — delivery to ${share.deliveryUsername} (${picked.region.name})`,
        });

        if (items.length > 0) {
          await tx.insert(orderLineItemsTable).values(items.map(it => ({
            id: randomUUID(),
            orderId,
            productId: it.productId,
            productName: it.productName,
            quantity: Number(it.quantity).toFixed(2),
            unitPrice: Number(it.unitPrice).toFixed(2),
            lineTotal: (Number(it.quantity) * Number(it.unitPrice)).toFixed(2),
          })));
        }

        await tx.update(wholesaleShareMembersTable)
          .set({ orderId, shippingShare: shippingShare.toFixed(2) })
          .where(eq(wholesaleShareMembersTable.id, m.id));
      }

      // CONDITIONAL parent transition: only lock if still "open". If a concurrent
      // cancel won the race, no row updates and we roll back the whole batch.
      const lockedParent = await tx.update(wholesaleSharesTable)
        .set({
          status: "locked",
          lockedAt: new Date(),
          totalVendorShipping: totalShipping.toFixed(2),
          totalKits: combinedKits.toFixed(2),
        })
        .where(and(
          eq(wholesaleSharesTable.id, share.id),
          eq(wholesaleSharesTable.status, "open"),
        ))
        .returning({ id: wholesaleSharesTable.id });
      if (lockedParent.length === 0) throw LOCK_CONFLICT;
    });
  } catch (e) {
    if (e === LOCK_CONFLICT) {
      return { ok: false, status: 409, error: "This shared order is no longer open and can't be locked." };
    }
    throw e;
  }

  await writeLog("order", "info", "wholesale_share_locked",
    `Wholesale share ${share.id} locked by ${actor} (${mode}) — ${members.length} member orders, ${combinedKits} kits, shipping ${totalShipping.toFixed(2)}`,
    { shareId: share.id, members: members.length, combinedKits, totalShipping, mode }, undefined);

  return { ok: true };
}

router.post("/wholesale-shares/:id/lock", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can lock the shared order." });
    return;
  }
  const result = await attemptLockShare(share, me, "manual");
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// POST /api/wholesale-shares/:id/unlock — creator reverts a locked share back to
// "open" so items/delivery can be edited again, then re-locked. Only allowed while
// nobody has paid: the materialised member orders are deleted (their draft items
// live on the member rows, so editing simply resumes). If anyone has already paid,
// unlocking is blocked — cancel (which flags refunds) is the right tool then.
router.post("/wholesale-shares/:id/unlock", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can unlock the shared order." });
    return;
  }
  if (share.status !== "locked") {
    res.status(409).json({ error: "Only a locked shared order can be unlocked." });
    return;
  }

  let removedOrders = 0;
  try {
    removedOrders = await db.transaction(async (tx) => {
      const members = await tx
        .select()
        .from(wholesaleShareMembersTable)
        .where(eq(wholesaleShareMembersTable.shareId, share.id));
      const orderIds = members.map(m => m.orderId).filter((x): x is string => !!x);

      // CONDITIONAL parent transition gated on status='locked' so a concurrent
      // cancel/auto-submit can't be clobbered — if it already moved on, abort 409.
      const reopened = await tx.update(wholesaleSharesTable)
        .set({ status: "open", lockedAt: null, totalVendorShipping: null, totalKits: null })
        .where(and(
          eq(wholesaleSharesTable.id, share.id),
          eq(wholesaleSharesTable.status, "locked"),
        ))
        .returning({ id: wholesaleSharesTable.id });
      if (reopened.length === 0) throw UNLOCK_CONFLICT;

      // Atomically delete ONLY the still-pristine ("unpaid") member orders. Gating
      // the DELETE on payment_status closes the check-then-delete race: if a member
      // started or finished paying — even concurrently (pending_confirmation,
      // confirmed, test_ready, test_confirmed, …) — that row won't match, the deleted
      // count falls short, and we throw to roll the whole unlock back (reopen too).
      // Dependent line items / messages / dispatch images cascade on delete. Member
      // draft items live on the member rows (untouched by lock), so editing resumes.
      if (orderIds.length > 0) {
        const deleted = await tx.delete(ordersTable)
          .where(and(
            inArray(ordersTable.id, orderIds),
            eq(ordersTable.paymentStatus, "unpaid"),
          ))
          .returning({ id: ordersTable.id });
        if (deleted.length !== orderIds.length) throw UNLOCK_HAS_PAID;
      }
      await tx.update(wholesaleShareMembersTable)
        .set({ orderId: null, shippingShare: null })
        .where(eq(wholesaleShareMembersTable.shareId, share.id));

      return orderIds.length;
    });
  } catch (e) {
    if (e === UNLOCK_HAS_PAID) {
      res.status(409).json({ error: "A member has already started paying, so this order can't be unlocked. Cancel it instead if changes are needed." });
      return;
    }
    if (e === UNLOCK_CONFLICT) {
      res.status(409).json({ error: "This shared order can no longer be unlocked." });
      return;
    }
    throw e;
  }

  await writeLog("order", "info", "wholesale_share_unlocked",
    `Wholesale share ${share.id} unlocked by ${me} — ${removedOrders} member orders removed, reopened for edits`,
    { shareId: share.id, removedOrders }, req.ip);

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// POST /api/wholesale-shares/:id/cancel — creator cancels an open OR locked share
// (e.g. a member never pays after locking), releasing everyone. A share that has
// already been submitted to the vendor can no longer be cancelled here.
router.post("/wholesale-shares/:id/cancel", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can cancel the shared order." });
    return;
  }
  if (share.status !== "open" && share.status !== "locked") {
    res.status(409).json({ error: "This shared order can no longer be cancelled." });
    return;
  }

  // Everything below runs in one transaction. The parent status transition is
  // CONDITIONAL ("only if still open or locked") so it can't race with the final
  // payment auto-submitting the order — if another request already flipped it to
  // "submitted"/"cancelled", no row updates and we abort with 409.
  let outcome: { wasLocked: boolean; cancelledOrders: number; paidMembersNeedingRefund: string[] } | null = null;
  try {
    outcome = await db.transaction(async (tx) => {
      const updatedParent = await tx.update(wholesaleSharesTable)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(and(
          eq(wholesaleSharesTable.id, share.id),
          sql`${wholesaleSharesTable.status} IN ('open', 'locked')`,
        ))
        .returning({ id: wholesaleSharesTable.id });
      if (updatedParent.length === 0) throw NOT_CANCELLABLE;

      // Release the group: cancel every materialised member order so nobody is left
      // holding a live order for a combined parcel that will never ship. Flag any
      // already-paid members for a manual refund follow-up.
      const members = await tx
        .select()
        .from(wholesaleShareMembersTable)
        .where(eq(wholesaleShareMembersTable.shareId, share.id));
      const orderIds = members.map(m => m.orderId).filter((x): x is string => !!x);
      let paidMembersNeedingRefund: string[] = [];
      if (orderIds.length > 0) {
        const orders = await tx.select().from(ordersTable)
          .where(sql`${ordersTable.id} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
        paidMembersNeedingRefund = orders.filter(o => o.paymentStatus === "confirmed").map(o => o.telegramUsername);
        await tx.update(ordersTable)
          .set({ status: "Cancelled" })
          .where(sql`${ordersTable.id} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
      }
      return { wasLocked: share.status === "locked", cancelledOrders: orderIds.length, paidMembersNeedingRefund };
    });
  } catch (e) {
    if (e === NOT_CANCELLABLE) {
      res.status(409).json({ error: "This shared order can no longer be cancelled." });
      return;
    }
    throw e;
  }

  await writeLog("order", "warn", "wholesale_share_cancelled",
    `Wholesale share ${share.id} cancelled by ${me}${outcome.wasLocked ? ` (was locked; ${outcome.cancelledOrders} member orders cancelled)` : ""}${outcome.paidMembersNeedingRefund.length ? ` — refund needed for: ${outcome.paidMembersNeedingRefund.join(", ")}` : ""}`,
    { shareId: share.id, wasLocked: outcome.wasLocked, cancelledOrders: outcome.cancelledOrders, paidMembersNeedingRefund: outcome.paidMembersNeedingRefund }, req.ip);

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// PUT /api/wholesale-shares/:id/fees — organiser sets the optional organiser fee.
// Custom per-participant organiser fee (paid directly to the organiser). Editable
// only while the share is open. The current recipient is always exempt (forced to
// 0). Paid SEPARATELY, never in the order total.
router.put("/wholesale-shares/:id/fees", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.creatorUsername.toLowerCase() !== me.toLowerCase()) {
    res.status(403).json({ error: "Only the organiser can set fees." });
    return;
  }
  if (share.status !== "open") {
    res.status(409).json({ error: "Fees can only be changed while the shared order is open." });
    return;
  }

  const body = (req.body ?? {}) as {
    organiserPaymentInfo?: unknown;
    fees?: Array<{ username?: unknown; organiserFee?: unknown }>;
  };

  const clampFee = (v: unknown): number => {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return 0;
    return Number(Math.min(n, 100000).toFixed(2));
  };
  const cleanInfo = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, 500);
    return t.length > 0 ? t : null;
  };

  const shareUpdates: Partial<typeof wholesaleSharesTable.$inferInsert> = {};
  if (body.organiserPaymentInfo !== undefined) shareUpdates.organiserPaymentInfo = cleanInfo(body.organiserPaymentInfo);

  const recipientLower = share.deliveryUsername?.toLowerCase() ?? null;
  const fees = Array.isArray(body.fees) ? body.fees : [];

  // All fee writes happen inside one transaction that first row-locks the share
  // and re-asserts "open". A concurrent lock/cancel either lost the race (we win
  // and it 409s on its own conditional update) or won it (we see the new status
  // here and roll everything back), so fees can never be written to a non-open
  // share. When a fee amount changes we also clear the matching paid flag, so a
  // previously-confirmed fee can't stay "paid" after the organiser edits it.
  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ status: wholesaleSharesTable.status })
        .from(wholesaleSharesTable)
        .where(eq(wholesaleSharesTable.id, share.id))
        .for("update");
      if (!locked || locked.status !== "open") throw FEES_CONFLICT;

      if (Object.keys(shareUpdates).length > 0) {
        await tx.update(wholesaleSharesTable).set(shareUpdates).where(eq(wholesaleSharesTable.id, share.id));
      }

      const members = await tx
        .select()
        .from(wholesaleShareMembersTable)
        .where(eq(wholesaleShareMembersTable.shareId, share.id));
      const memberByLower = new Map(members.map(m => [m.username.toLowerCase(), m]));

      for (const f of fees) {
        const uname = String(f.username ?? "").toLowerCase();
        const member = memberByLower.get(uname);
        if (!member) continue;
        const isRecipient = recipientLower != null && uname === recipientLower;
        const prevOrganiserFee = Number(member.organiserFee ?? 0);
        const organiserFee = isRecipient ? 0 : (f.organiserFee !== undefined ? clampFee(f.organiserFee) : prevOrganiserFee);
        const set: Partial<typeof wholesaleShareMembersTable.$inferInsert> = {
          organiserFee: organiserFee.toFixed(2),
        };
        if (organiserFee !== prevOrganiserFee) set.organiserFeePaid = false;
        await tx.update(wholesaleShareMembersTable)
          .set(set)
          .where(eq(wholesaleShareMembersTable.id, member.id));
      }
    });
  } catch (e) {
    if (e === FEES_CONFLICT) {
      res.status(409).json({ error: "Fees can only be changed while the shared order is open." });
      return;
    }
    throw e;
  }

  await writeLog("order", "info", "wholesale_share_fees_updated",
    `Wholesale share ${share.id} fees updated by ${me}`, { shareId: share.id }, req.ip);

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// POST /api/wholesale-shares/:id/fees/confirm — the organiser marks a participant's
// organiser fee as received (or unpaid again). Allowed any time except after
// cancellation.
router.post("/wholesale-shares/:id/fees/confirm", requireWholesale, async (req, res): Promise<void> => {
  const me = req.wholesale!.telegramUsername;
  const share = await loadShare(String(req.params.id));
  if (!share) { res.status(404).json({ error: "Shared order not found" }); return; }
  if (share.status === "cancelled") {
    res.status(409).json({ error: "This shared order has been cancelled." });
    return;
  }

  const body = (req.body ?? {}) as { username?: unknown; feeType?: unknown; paid?: unknown };
  const username = String(body.username ?? "");
  const feeType = String(body.feeType ?? "");
  const paid = Boolean(body.paid);
  if (feeType !== "organiser") {
    res.status(400).json({ error: "feeType must be 'organiser'." });
    return;
  }

  const meLower = me.toLowerCase();
  const isCreator = share.creatorUsername.toLowerCase() === meLower;
  if (!isCreator) {
    res.status(403).json({ error: "Only the organiser can confirm organiser fees." });
    return;
  }

  const member = await loadMember(share.id, username);
  if (!member) { res.status(404).json({ error: "That member is not part of this shared order." }); return; }

  await db.update(wholesaleShareMembersTable)
    .set({ organiserFeePaid: paid })
    .where(eq(wholesaleShareMembersTable.id, member.id));

  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, me));
});

// ── Admin: grouped view of wholesale shared orders ───────────────────────────
// One row per shared order so admins see the whole combined parcel as a single
// order: every member's individual order stacked together, each with its paid
// status, the organiser (creator) highlighted, and the delivery address.
// Guarded by the admin secret (X-Admin-Secret header). "made" = locked or
// submitted (member orders have been materialised).
const isOrderPaid = (ps: string | null | undefined): boolean =>
  ps === "confirmed" || ps === "test_confirmed";

router.get("/admin/wholesale-shares", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const statusQ = String((req.query as Record<string, string | undefined>).status ?? "made").toLowerCase();
  let statusFilter: string[] | null;
  if (statusQ === "open") statusFilter = ["open"];
  else if (statusQ === "cancelled") statusFilter = ["cancelled"];
  else if (statusQ === "all") statusFilter = null;
  else statusFilter = ["locked", "submitted"]; // "made" (default)

  const shares = await db
    .select()
    .from(wholesaleSharesTable)
    .where(statusFilter ? inArray(wholesaleSharesTable.status, statusFilter) : undefined)
    .orderBy(desc(wholesaleSharesTable.createdAt));

  if (shares.length === 0) {
    res.json({ shares: [] });
    return;
  }

  const shareIds = shares.map(s => s.id);
  const members = await db
    .select()
    .from(wholesaleShareMembersTable)
    .where(inArray(wholesaleShareMembersTable.shareId, shareIds));

  const orderIds = members.map(m => m.orderId).filter((x): x is string => !!x);
  const orderById = new Map<string, typeof ordersTable.$inferSelect>();
  if (orderIds.length > 0) {
    const orders = await db.select().from(ordersTable).where(inArray(ordersTable.id, orderIds));
    for (const o of orders) orderById.set(o.id, o);
  }

  const membersByShare = new Map<string, typeof members>();
  for (const m of members) {
    const arr = membersByShare.get(m.shareId) ?? [];
    arr.push(m);
    membersByShare.set(m.shareId, arr);
  }

  const rows = shares.map(s => {
    const ms = membersByShare.get(s.id) ?? [];
    const isLocked = s.status !== "open";
    const paidCount = ms.filter(m => isOrderPaid(m.orderId ? orderById.get(m.orderId)?.paymentStatus : null)).length;
    const combinedKits = ms.reduce((acc, m) => acc + memberKits(m.items ?? []), 0);
    const combinedSubtotal = Number(ms.reduce((acc, m) => acc + memberSubtotal(m.items ?? []), 0).toFixed(2));
    return {
      id: s.id,
      status: s.status,
      creatorUsername: s.creatorUsername,
      deliveryUsername: s.deliveryUsername ?? null,
      deliveryName: s.shippingName ?? null,
      deliveryCountry: s.shippingCountry ?? null,
      memberCount: ms.length,
      paidCount,
      allPaid: isLocked && ms.length > 0 && paidCount === ms.length,
      combinedKits,
      combinedSubtotal,
      totalVendorShipping: s.totalVendorShipping != null ? Number(s.totalVendorShipping) : null,
      totalKits: s.totalKits != null ? Number(s.totalKits) : null,
      createdAt: (s.createdAt as Date).toISOString(),
      lockedAt: s.lockedAt ? (s.lockedAt as Date).toISOString() : null,
      submittedAt: s.submittedAt ? (s.submittedAt as Date).toISOString() : null,
      cancelledAt: s.cancelledAt ? (s.cancelledAt as Date).toISOString() : null,
    };
  });

  res.json({ shares: rows });
});

router.get("/admin/wholesale-shares/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const share = await loadShare(req.params.id);
  if (!share) {
    res.status(404).json({ error: "Shared order not found" });
    return;
  }
  // Pass an admin-neutral username: every isYou=false, no canEditAddress.
  res.json(await buildShareResponse(share, ""));
});

export default router;
