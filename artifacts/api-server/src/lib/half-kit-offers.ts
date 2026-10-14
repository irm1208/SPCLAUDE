import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db, accountsTable, accountGroupBuysTable, creditTransactionsTable, groupBuysTable,
  gbHalfKitOffersTable as offers, gbHalfKitClaimsTable as claims, ordersTable, orderLineItemsTable,
} from "@workspace/db";
import { assertGroupStock, lockGroupStock } from "./group-buy-stock";
import { assertNoActiveRefund } from "./refund-mutation-guard";
import { fetchFiatToUsd, isStablecoin } from "./crypto-pricing";
import { claimAmounts, eligibleHalfKitOrder, halfKitClaimPaid, hasRemainingHalf, HalfKitError, halfKitTakenMessage, money, offerMoney } from "./half-kit-rules";
import { lockHalfKitMoney } from "./half-kit-lock";

type Database = any; // accepts both the workspace DB and a transaction/savepoint in integration tests
export type HalfKitActor = { username: string; admin?: boolean; adminGbId?: string };
const canonical = (username: string) => username.replace(/^@/, "").toLowerCase();
const number = (value: unknown) => money(value);
const numeric = (value: number) => money(value).toFixed(2);
const same = (a: string, b: string) => canonical(a) === canonical(b);
type Candidate = {
  productId: string; productName: string; totalQuantity: number; defaultPrice: number;
  remainingHalf: boolean; maxPerCustomer: number | null; offer: any;
};

export async function halfKitGroup(database: Database, id: string, actor: HalfKitActor, manage: boolean, lock = false) {
  let query = database.select().from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (lock) query = query.for("update");
  const [group] = await query;
  if (!group) throw new HalfKitError("Group buy not found.", 404);
  if (manage) {
    if (!(actor.admin && (!actor.adminGbId || actor.adminGbId === id))
      && !same(group.organiserId ?? "", actor.username)) throw new HalfKitError("You do not manage this group buy.", 403);
  } else if (!same(group.organiserId ?? "", actor.username)) {
    const membership = await database.select({ id: accountGroupBuysTable.id }).from(accountGroupBuysTable)
      .where(and(eq(accountGroupBuysTable.groupBuyId, id),
        sql`lower(regexp_replace(${accountGroupBuysTable.accountId}, '^@', '')) = ${canonical(actor.username)}`)).limit(1);
    // Historical members can have an order even if the membership record predates the join gate.
    const owned = membership.length ? membership : await database.select({ id: ordersTable.id }).from(ordersTable)
      .where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt),
        sql`lower(regexp_replace(${ordersTable.telegramUsername}, '^@', '')) = ${canonical(actor.username)}`)).limit(1);
    if (!owned.length) throw new HalfKitError("Join this group buy before viewing its half-kit offers.", 403);
  }
  return group;
}
const publicGroup = (group: any) => ({
  id: group.id, name: group.name, currency: group.currency, allowCredits: group.allowCredits === true,
});

export async function halfKitCandidates(database: Database, groupId: string): Promise<Candidate[]> {
  const result = await database.execute(sql`
    SELECT gbp.product_id AS "productId", p.name AS "productName",
      COALESCE(sold.quantity, 0) AS "totalQuantity",
      COALESCE(gbp.price_override, p.price)::numeric / 2 AS "defaultPrice",
      gbp.max_per_customer AS "maxPerCustomer",
      h.id AS "offerId", h.price, h.delivery_charge AS "deliveryCharge",
      h.vendor_shipping_charge AS "vendorShippingCharge", h.published, h.version, h.currency
    FROM group_buy_products gbp JOIN products p ON p.id = gbp.product_id
    LEFT JOIN gb_half_kit_offers h ON h.group_buy_id = gbp.group_buy_id AND h.product_id = gbp.product_id
    LEFT JOIN (
      SELECT oli.product_id, SUM(oli.quantity) AS quantity
      FROM order_line_items oli JOIN orders o ON o.id = oli.order_id
      WHERE o.group_buy_id = ${groupId} AND o.status NOT IN ('Draft', 'Cancelled') AND o.deleted_at IS NULL
      GROUP BY oli.product_id
    ) sold ON sold.product_id = gbp.product_id
    WHERE gbp.group_buy_id = ${groupId} AND gbp.active = true ORDER BY p.name
  `);
  return result.rows.map((row: any) => ({
    productId: row.productId, productName: row.productName, totalQuantity: number(row.totalQuantity),
    defaultPrice: number(row.defaultPrice), maxPerCustomer: row.maxPerCustomer,
    remainingHalf: hasRemainingHalf(number(row.totalQuantity)),
    offer: row.offerId ? {
      id: row.offerId, productId: row.productId, price: number(row.price),
      deliveryCharge: number(row.deliveryCharge), vendorShippingCharge: number(row.vendorShippingCharge),
      published: row.published, version: row.version, currency: row.currency,
    } : null,
  }));
}
async function refreshCandidates(database: Database, groupId: string, currency: string) {
  const candidates = await halfKitCandidates(database, groupId);
  for (const candidate of candidates) if (candidate.offer?.published && (!candidate.remainingHalf || candidate.offer.currency !== currency)) {
    await database.update(offers).set({ published: false, version: candidate.offer.version + 1, updatedAt: new Date() })
      .where(and(eq(offers.id, candidate.offer.id), eq(offers.version, candidate.offer.version)));
    candidate.offer.published = false;
    candidate.offer.version++;
  }
  return candidates;
}
async function creditRate(currency: string): Promise<number> {
  if (currency.toUpperCase() === "USD" || isStablecoin(currency)) return 1;
  const rate = await fetchFiatToUsd(currency);
  if (!Number.isFinite(rate) || rate <= 0 || rate === 1) {
    throw new HalfKitError("Cannot convert credits into this group buy's currency right now. Please try again.", 503);
  }
  return rate;
}
async function ownedAccount(database: Database, username: string, lock = false) {
  let query = database.select().from(accountsTable)
    .where(sql`lower(regexp_replace(${accountsTable.telegramUsername}, '^@', '')) = ${canonical(username)}`);
  if (lock) query = query.for("update");
  const [account] = await query;
  if (!account) throw new HalfKitError("Account not found.", 403);
  return account;
}
export async function listHalfKits(groupId: string, actor: HalfKitActor, manage: boolean, database: Database = db) {
  return database.transaction(async (tx: Database) => {
    await lockHalfKitMoney(tx, groupId);
    await lockGroupStock(tx, groupId);
    const group = await halfKitGroup(tx, groupId, actor, manage);
    const candidates = await refreshCandidates(tx, groupId, group.currency);
    if (manage) {
      const result = await tx.execute(sql`
        SELECT c.*, o.code AS "orderCode", o.telegram_username AS "currentUsername",
          o.status AS "orderStatus", o.payment_status AS "paymentStatus", o.amount_due AS "amountDue",
          o.balance_payment_status AS "balancePaymentStatus", o.balance_tx_hash AS "balanceTxHash",
          o.balance_screenshot AS "balanceScreenshot", o.dispatch_confirmed_at AS "dispatchConfirmedAt",
          o.deleted_at AS "deletedAt",
          o.payment_tx_hash AS "paymentTxHash", o.payment_screenshot AS "paymentScreenshot",
          a.discord_username AS "discordUsername"
        FROM gb_half_kit_claims c JOIN orders o ON o.id = c.order_id
        LEFT JOIN accounts a ON lower(regexp_replace(a.telegram_username, '^@', '')) = lower(regexp_replace(o.telegram_username, '^@', ''))
        WHERE c.group_buy_id = ${groupId} ORDER BY c.created_at DESC
      `);
      return { group: publicGroup(group), candidates, claims: result.rows.map((row: any) => {
        const state = { ...row, status: row.orderStatus };
        const paid = halfKitClaimPaid({ cashDue: row.cash_due, paidAt: row.paid_at }, state);
        const cancelled = row.orderStatus === "Cancelled" || row.deletedAt;
        const creditOnlyCancellation = cancelled && row.paymentStatus === "unpaid" && number(row.cash_due) === 0;
        const canRelease = row.state === "active" && (!paid || creditOnlyCancellation)
          && eligibleHalfKitOrder({ ...state, ...(cancelled ? { status: "Submitted", deletedAt: null } : {}) });
        return {
          id: row.id, orderId: row.order_id, orderCode: row.orderCode,
          username: /^@?discord:\d+$/.test(row.currentUsername)
            ? row.discordUsername || row.currentUsername : row.currentUsername,
          productName: row.product_name, price: number(row.price),
          deliveryCharge: number(row.delivery_charge), vendorShippingCharge: number(row.vendor_shipping_charge),
          creditsUsed: number(row.credits_used), currency: row.currency, createdAt: row.created_at,
          status: row.state === "released" ? "released" : paid ? "paid" : canRelease ? "unpaid" : "blocked",
          canRelease,
        };
      }) };
    }
    const rows = await tx.select().from(ordersTable).where(and(
      eq(ordersTable.groupBuyId, groupId), isNull(ordersTable.deletedAt),
      sql`lower(regexp_replace(${ordersTable.telegramUsername}, '^@', '')) = ${canonical(actor.username)}`,
    ));
    const account = await ownedAccount(tx, actor.username);
    const rate = group.allowCredits && number(account.credits) > 0 ? await creditRate(group.currency) : 1;
    return {
      group: publicGroup(group),
      offers: ["active", "closed"].includes(group.status) ? candidates.filter(candidate =>
        candidate.remainingHalf && candidate.offer?.published && candidate.offer.currency === group.currency,
      ).map(candidate => ({ ...candidate.offer, productName: candidate.productName })) : [],
      orders: rows.filter(eligibleHalfKitOrder).map((order: any) => ({
        id: order.id, code: order.code, paymentStatus: order.paymentStatus, amountDue: number(order.amountDue),
      })),
      creditsBalance: group.allowCredits ? Math.floor(number(account.credits) / rate * 100) / 100 : 0,
    };
  });
}

export async function saveHalfKit(groupId: string, productId: string, actor: HalfKitActor, input: any, database: Database = db) {
  if (!input || typeof input !== "object") throw new HalfKitError("Invalid offer.", 400);
  const price = offerMoney(input.price), delivery = offerMoney(input.deliveryCharge), vendor = offerMoney(input.vendorShippingCharge);
  if (typeof input.published !== "boolean") throw new HalfKitError("Choose whether the offer is published.", 400);
  return database.transaction(async (tx: Database) => {
    await lockHalfKitMoney(tx, groupId);
    await lockGroupStock(tx, groupId);
    const group = await halfKitGroup(tx, groupId, actor, true, true);
    const candidate = (await refreshCandidates(tx, groupId, group.currency)).find(row => row.productId === productId);
    if (!candidate) throw new HalfKitError("Product is not active in this group buy.", 404);
    if (candidate.offer && input.version !== candidate.offer.version) throw new HalfKitError("This offer changed. Refresh before saving.");
    if (input.published && (!candidate.remainingHalf || !["active", "closed"].includes(group.status))) {
      throw new HalfKitError("Only a live remaining half in an active or closed group buy can be published.");
    }
    const values = {
      price: numeric(price), deliveryCharge: numeric(delivery), vendorShippingCharge: numeric(vendor),
      currency: group.currency, published: input.published, updatedAt: new Date(),
    };
    if (candidate.offer) {
      const [saved] = await tx.update(offers).set({ ...values, version: candidate.offer.version + 1 })
        .where(and(eq(offers.id, candidate.offer.id), eq(offers.version, candidate.offer.version))).returning();
      if (!saved) throw new HalfKitError("Offer changed. Please refresh.");
      return saved;
    }
    const [saved] = await tx.insert(offers).values({
      id: randomUUID(), groupBuyId: groupId, productId, createdBy: actor.username, ...values,
    }).returning();
    return saved;
  });
}

async function enforceHalfLimits(tx: Database, group: any, candidate: Candidate, username: string) {
  const result = await tx.execute(sql`
    SELECT COALESCE(SUM(oli.quantity), 0) AS total,
      COALESCE(SUM(oli.quantity) FILTER (WHERE lower(regexp_replace(o.telegram_username, '^@', '')) = ${canonical(username)}), 0) AS own,
      COALESCE(SUM(oli.quantity) FILTER (WHERE oli.product_id = ${candidate.productId}
        AND lower(regexp_replace(o.telegram_username, '^@', '')) = ${canonical(username)}), 0) AS product
    FROM order_line_items oli JOIN orders o ON o.id = oli.order_id
    WHERE o.group_buy_id = ${group.id} AND o.status NOT IN ('Draft', 'Cancelled') AND o.deleted_at IS NULL
  `);
  const row = result.rows[0];
  for (const [cap, count] of [[group.maxKitsTotal, row.total], [group.maxKitsPerCustomer, row.own], [candidate.maxPerCustomer, row.product]]) {
    if (cap != null && Number(count) + 0.5 > Number(cap)) throw new HalfKitError("This half kit would exceed the group buy's kit limit.");
  }
}
function claimResult(claim: any, order: any) {
  return {
    claimId: claim.id, orderId: order.id, orderCode: order.code,
    amountDue: number(order.amountDue), paymentPath: `/account/orders/${encodeURIComponent(order.id)}`,
  };
}
export async function claimHalfKit(groupId: string, offerId: string, actor: HalfKitActor, input: any, database: Database = db) {
  if (!input || typeof input !== "object") throw new HalfKitError("Invalid claim.", 400);
  if (typeof input.orderId !== "string" || !Number.isInteger(input.version) || typeof input.useCredits !== "boolean"
    || typeof input.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.requestId)) {
    throw new HalfKitError("Invalid claim. Refresh the offer and try again.", 400);
  }
  const expectedCredit = offerMoney(input.expectedCredit ?? 0);
  const groupBefore = await halfKitGroup(database, groupId, actor, false);
  const [existingRequest] = await database.select().from(claims).where(eq(claims.requestId, input.requestId));
  if (existingRequest) {
    const [owned] = await database.select().from(ordersTable).where(eq(ordersTable.id, existingRequest.orderId));
    if (!owned || !same(owned.telegramUsername, actor.username) || owned.groupBuyId !== groupId) {
      throw new HalfKitError("This purchase request was already used.", 403);
    }
    if (existingRequest.state !== "active" || existingRequest.orderId !== input.orderId || existingRequest.offerId !== offerId) {
      throw new HalfKitError("This purchase request was already used.");
    }
    return claimResult(existingRequest, owned);
  }
  const rate = input.useCredits ? await creditRate(groupBefore.currency) : 1;
  return database.transaction(async (tx: Database) => {
    await lockHalfKitMoney(tx, groupId);
    await lockGroupStock(tx, groupId);
    const group = await halfKitGroup(tx, groupId, actor, false, true);
    const account = await ownedAccount(tx, actor.username, input.useCredits);
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, input.orderId)).for("update");
    if (!order || order.groupBuyId !== groupId || !same(order.telegramUsername, actor.username)) {
      throw new HalfKitError("Choose one of your own orders in this group buy.", 403);
    }
    const [replay] = await tx.select().from(claims).where(eq(claims.requestId, input.requestId));
    if (replay) {
      if (replay.orderId !== order.id || replay.offerId !== offerId || replay.state !== "active") {
        throw new HalfKitError("This purchase request was already used.");
      }
      return claimResult(replay, order);
    }
    if (!eligibleHalfKitOrder(order) || !["active", "closed"].includes(group.status)) {
      throw new HalfKitError("This order cannot receive a half kit while dispatched, cancelled or awaiting payment verification.");
    }
    await assertNoActiveRefund(tx, order.id);
    let blocked: unknown;
    try { blocked = JSON.parse(group.blockedAccounts ?? "[]"); } catch { throw new HalfKitError("Invalid group-buy access settings.", 503); }
    if (Array.isArray(blocked) && blocked.some(value => typeof value === "string" && same(value, actor.username))) {
      throw new HalfKitError("You are not allowed to add products to this group buy.", 403);
    }
    const candidate = (await refreshCandidates(tx, groupId, group.currency)).find(row => row.offer?.id === offerId);
    const offer = candidate?.offer;
    if (!candidate?.remainingHalf || !offer?.published || offer.version !== input.version || offer.currency !== group.currency) {
      // Match the exact advertised version, never a historical/released claim.
      const [taken] = await tx.select({ createdAt: claims.createdAt }).from(claims)
        .where(and(eq(claims.offerId, offerId), eq(claims.offerVersion, input.version), eq(claims.state, "active"))).limit(1);
      if (taken) throw new HalfKitError(halfKitTakenMessage(taken.createdAt), 409, "HALF_KIT_TAKEN");
      throw new HalfKitError("This half kit was taken or its price changed. Refresh the available offers.");
    }
    if (input.useCredits && group.allowCredits !== true) throw new HalfKitError("Credits are disabled for this group buy.", 403);
    if (group.currency !== groupBefore.currency) throw new HalfKitError("The group currency changed. Refresh before claiming.");
    await enforceHalfLimits(tx, group, candidate, actor.username);
    await assertGroupStock(tx, groupId, [{ productId: candidate.productId, quantity: 0.5 }]);
    const creditAvailable = input.useCredits ? Math.floor(number(account.credits) / rate * 100) / 100 : 0;
    const amounts = claimAmounts(offer.price, offer.deliveryCharge, offer.vendorShippingCharge, creditAvailable);
    if (Math.abs(amounts.credit - expectedCredit) > 0.001) {
      throw new HalfKitError("Your available credits changed. Refresh and confirm the new amount.");
    }
    const creditsUsd = input.useCredits ? Math.min(number(account.credits), money(amounts.credit * rate)) : 0;
    const id = randomUUID(), lineId = randomUUID();
    await tx.insert(orderLineItemsTable).values({
      id: lineId, orderId: order.id, productId: candidate.productId,
      productName: candidate.productName, quantity: "0.50", unitPrice: numeric(offer.price * 2), lineTotal: numeric(offer.price),
    });
    const [claim] = await tx.insert(claims).values({
      id, offerId, groupBuyId: groupId, orderId: order.id, lineItemId: lineId,
      requestId: input.requestId, offerVersion: offer.version, productId: candidate.productId,
      productName: candidate.productName, username: account.telegramUsername, currency: group.currency,
      price: numeric(offer.price), deliveryCharge: numeric(offer.deliveryCharge), vendorShippingCharge: numeric(offer.vendorShippingCharge),
      creditsUsd: numeric(creditsUsd), creditsUsed: numeric(amounts.credit), cashDue: numeric(amounts.cash),
      // PostgreSQL now() is transaction-start time, which may precede waiting for the claim lock.
      createdAt: sql`clock_timestamp()`,
    }).returning();
    if (creditsUsd > 0) {
      await tx.update(accountsTable).set({ credits: numeric(number(account.credits) - creditsUsd) })
        .where(eq(accountsTable.telegramUsername, account.telegramUsername));
      await tx.insert(creditTransactionsTable).values({
        accountUsername: account.telegramUsername, amount: numeric(-creditsUsd), orderId: order.id,
        operationKey: `half-kit-claim:${id}`, reason: `Half kit added to order #${order.code}`,
      });
    }
    const paid = order.paymentStatus === "confirmed";
    if (paid && number(order.amountDue) === 0) await tx.update(claims).set({ paidAt: new Date() })
      .where(and(eq(claims.orderId, order.id), eq(claims.state, "active"), isNull(claims.paidAt), sql`${claims.id} <> ${id}`));
    if (amounts.cash === 0) await tx.update(claims).set({ paidAt: new Date() }).where(eq(claims.id, id));
    const previousBalanceHash = order.balancePaymentStatus === "confirmed" ? order.balanceTxHash : null;
    const update: any = {
      productSubtotal: numeric(number(order.productSubtotal) + offer.price),
      deliveryPrice: numeric(number(order.deliveryPrice) + offer.deliveryCharge),
      vendorShipping: numeric(number(order.vendorShipping) + offer.vendorShippingCharge),
      grandTotal: numeric(number(order.grandTotal) + amounts.gross),
      creditsApplied: numeric(number(order.creditsApplied) + creditsUsd),
      updatedAt: new Date(),
    };
    if (paid) Object.assign(update, {
      amountDue: numeric(number(order.amountDue) + amounts.cash),
      balanceCryptoQuote: null,
      balancePaymentStatus: number(order.amountDue) + amounts.cash > 0 ? "unpaid" : order.balancePaymentStatus,
      ...(amounts.cash > 0 ? {
        balanceTxHash: null, balanceScreenshot: null, balanceConfirmedAt: null,
        ...(previousBalanceHash && !/^(?:fiat:|anonpay:)/i.test(previousBalanceHash)
          ? { paymentTxHashes: [...new Set([...(order.paymentTxHashes ?? []), previousBalanceHash])] } : {}),
      } : {}),
    });
    else update.paymentUsdAmount = null;
    const [updated] = await tx.update(ordersTable).set(update).where(eq(ordersTable.id, order.id)).returning();
    const [taken] = await tx.update(offers).set({ published: false, version: offer.version + 1, updatedAt: new Date() })
      .where(and(eq(offers.id, offerId), eq(offers.version, input.version), eq(offers.published, true))).returning();
    if (!taken) throw new HalfKitError("Someone else claimed this half kit. Refresh the list.");
    return claimResult(claim, updated);
  });
}

export async function releaseHalfKit(groupId: string, claimId: string, actor: HalfKitActor, database: Database = db) {
  return database.transaction(async (tx: Database) => {
    await lockHalfKitMoney(tx, groupId);
    await lockGroupStock(tx, groupId);
    const group = await halfKitGroup(tx, groupId, actor, true, true);
    const [claim] = await tx.select().from(claims).where(and(eq(claims.id, claimId), eq(claims.groupBuyId, groupId))).for("update");
    if (!claim) throw new HalfKitError("Claim not found.", 404);
    if (claim.state === "released") return { released: true, claimId };
    const [parent] = await tx.select().from(ordersTable).where(eq(ordersTable.id, claim.orderId));
    if (!parent) throw new HalfKitError("Order not found.", 404);
    const account = number(claim.creditsUsd) > 0 ? await ownedAccount(tx, parent.telegramUsername, true) : null;
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, claim.orderId)).for("update");
    await assertNoActiveRefund(tx, order.id);
    const cancelled = order.status === "Cancelled" || order.deletedAt;
    const cancelledCreditOnly = cancelled && order.paymentStatus === "unpaid" && number(claim.cashDue) === 0;
    if ((halfKitClaimPaid(claim, order) && !cancelledCreditOnly)
      || !eligibleHalfKitOrder({ ...order, ...(cancelled ? { status: "Submitted", deletedAt: null } : {}) })) {
      throw new HalfKitError("A paid or currently verifying claim cannot be released as unpaid.");
    }
    if (claim.currency !== group.currency) throw new HalfKitError("The group currency changed. Resolve it before releasing this claim.");
    await reverseHalfClaim(tx, claim, order, account, actor.username);
    const candidate = (await halfKitCandidates(tx, groupId)).find(row => row.productId === claim.productId);
    if (candidate?.remainingHalf && candidate.offer && !candidate.offer.published && ["active", "closed"].includes(group.status)) {
      await tx.update(offers).set({ published: true, version: candidate.offer.version + 1, updatedAt: new Date() })
        .where(eq(offers.id, claim.offerId));
    }
    return { released: true, claimId };
  });
}

async function reverseHalfClaim(tx: Database, claim: any, order: any, account: any, actor: string) {
      const [line] = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.id, claim.lineItemId)).for("update");
      if (!line || line.orderId !== order.id || number(line.quantity) !== 0.5 || number(line.lineTotal) !== number(claim.price)) {
        throw new HalfKitError("The claimed line changed. Review the order before releasing.");
      }
      const gross = number(claim.price) + number(claim.deliveryCharge) + number(claim.vendorShippingCharge);
      const balances = {
        productSubtotal: number(order.productSubtotal) - number(claim.price),
        deliveryPrice: number(order.deliveryPrice) - number(claim.deliveryCharge),
        vendorShipping: number(order.vendorShipping) - number(claim.vendorShippingCharge),
        grandTotal: number(order.grandTotal) - gross,
        creditsApplied: number(order.creditsApplied) - (number(order.creditsApplied) === 0 ? 0 : number(claim.creditsUsd)),
        ...(order.paymentStatus === "confirmed" ? { amountDue: number(order.amountDue) - number(claim.cashDue) } : {}),
      };
      if (Object.values(balances).some(value => value < -0.001)) throw new HalfKitError("The order balance changed. Review before releasing.");
      await tx.delete(orderLineItemsTable).where(eq(orderLineItemsTable.id, claim.lineItemId));
      await tx.update(ordersTable).set({
        ...Object.fromEntries(Object.entries(balances).map(([key, value]) => [key, numeric(Math.max(0, value))])),
        balanceCryptoQuote: null,
        ...(order.paymentStatus !== "confirmed" ? { paymentUsdAmount: null } : {}),
        updatedAt: new Date(),
      }).where(eq(ordersTable.id, order.id));
       if (account && number(claim.creditsUsd) > 0 && number(order.creditsApplied) > 0) {
        await tx.update(accountsTable).set({ credits: numeric(number(account.credits) + number(claim.creditsUsd)) })
          .where(eq(accountsTable.telegramUsername, account.telegramUsername));
        await tx.insert(creditTransactionsTable).values({
          accountUsername: account.telegramUsername, amount: claim.creditsUsd, orderId: order.id,
          operationKey: `half-kit-release:${claim.id}`, reason: `Unpaid half kit released from order #${order.code}`,
        });
      }
    await tx.update(claims).set({ state: "released", releasedAt: new Date(), releasedBy: actor }).where(eq(claims.id, claim.id));
}

/** Whole-order cancellation returns only new half-kit credits, atomically with the deletion.
 * The native request already holds the money mutex. No cash-funded, paid order is cancelled here. */
export async function cancelUnpaidHalfClaims(tx: Database, orderId: string, actor: string) {
  const pending = await tx.select().from(claims).where(and(eq(claims.orderId, orderId), eq(claims.state, "active")));
  if (!pending.length) return;
  const [parent] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const account = pending.some((claim: any) => number(claim.creditsUsd) > 0)
    ? await ownedAccount(tx, parent.telegramUsername, true) : null;
  const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
  if (order.paymentStatus !== "unpaid" || !eligibleHalfKitOrder(order) || !same(order.telegramUsername, actor)) {
    throw new HalfKitError("Resolve the payment before cancelling this half-kit order.");
  }
  await assertNoActiveRefund(tx, order.id);
  for (const claim of pending) {
    const [current] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    const currentAccount = account ? await ownedAccount(tx, account.telegramUsername, true) : null;
    await reverseHalfClaim(tx, claim, current, currentAccount, actor);
  }
}
