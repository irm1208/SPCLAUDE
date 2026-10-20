import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  db, accountsTable, accountGroupBuysTable, gbCountryLegsTable, gbReshippersTable,
  ordersTable, orderLineItemsTable, siteConfigTable, groupBuysTable,
} from "@workspace/db";
import { groupUpdatesAccess } from "./group-buy-updates";
import { deliveryContactError } from "./eu-delivery-checkout";
import { usesCustomEuPostage } from "./group-buy-shipping-options";
import { canonicalUsername, type UpdateActor } from "./group-buy-updates-model";
import {
  estimateOnwardDelivery, normalizeEuCountry, OnwardDeliveryError, parseOnwardMatrix,
  validOnwardMethod,
  type OnwardMethod,
} from "./gb-onward-delivery-rules";

type DataAccess = Pick<typeof db, "select" | "insert" | "update" | "delete" | "execute">;
const same = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && canonicalUsername(a) === canonicalUsername(b);
const matrixKey = (gb: string, assignmentId: string) => `gb_onward_matrix:${encodeURIComponent(gb)}:${encodeURIComponent(assignmentId)}`;
const choiceKey = (orderId: string) => `gb_onward_choice:${orderId}`;
const emptyEstimate = (status: string, country: unknown, kits: number, reshipperUsername: string | null = null) => ({
  status, configured: false, country: normalizeEuCountry(country), kits, reshipperUsername,
  currency: null as string | null, options: [] as { method: OnwardMethod; amount: number }[], selectedMethod: null as OnwardMethod | null,
});

async function config(database: DataAccess, key: string) {
  const [row] = await database.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1);
  return row?.value ?? null;
}
async function putConfig(database: DataAccess, key: string, value: string) {
  await database.insert(siteConfigTable).values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}
async function accountFor(database: DataAccess, username: string) {
  const variants = [username, username.replace(/^@/, ""), `@${username.replace(/^@/, "")}`];
  const rows = await database.select({ username: accountsTable.telegramUsername, country: accountsTable.country })
    .from(accountsTable).where(inArray(accountsTable.telegramUsername, variants));
  return rows.find(row => same(row.username, username)) ?? null;
}
async function matrixFor(database: DataAccess, gbId: string, username: string) {
  const assignments = await database.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId));
  const assignment = assignments.find(row => same(row.reshipperUsername, username));
  if (!assignment) return null;
  const saved = await config(database, matrixKey(gbId, assignment.id));
  return saved ? parseOnwardMatrix(JSON.parse(saved)) : null;
}
export async function onwardSettings(gbId: string, actor: UpdateActor, reshipperOnly = false) {
  if (!reshipperOnly) await groupUpdatesAccess(db, gbId, actor, true);
  const allAssignments = await db.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId));
  const assignments = reshipperOnly ? allAssignments.filter(row => row.enabled && same(row.reshipperUsername, actor.username)) : allAssignments;
  if (reshipperOnly && !assignments.length) throw new OnwardDeliveryError("You are not an active reshipper for this group buy.", 403);
  const names = [...new Set(assignments.map(row => row.reshipperUsername))];
  return {
    reshippers: await Promise.all(names.map(async username => ({
      username, enabled: assignments.some(row => same(row.reshipperUsername, username) && row.enabled),
      matrix: await matrixFor(db, gbId, username),
    }))),
  };
}
export async function saveOnwardMatrix(gbId: string, username: string, actor: UpdateActor, body: unknown, reshipperOnly = false) {
  const matrix = parseOnwardMatrix(body);
  return db.transaction(async tx => {
    if (reshipperOnly && !same(username, actor.username)) throw new OnwardDeliveryError("You can only edit your own onward-delivery matrix.", 403);
    if (!reshipperOnly) await groupUpdatesAccess(tx, gbId, actor, true, true);
    const assignments = await tx.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId)).for("update");
    const assignment = assignments.find(row => same(row.reshipperUsername, username));
    if (!assignment) throw new OnwardDeliveryError("This reshipper is not assigned to this group buy.", 404);
    if (reshipperOnly && !assignment.enabled) throw new OnwardDeliveryError("This reshipper assignment is disabled.", 403);
    await putConfig(tx, matrixKey(gbId, assignment.id), JSON.stringify(matrix));
    return { matrix };
  });
}

/** Preference only: deliberately never writes order money, status, payment locks or vendor shipping. */
export async function saveOnwardOrderPreference(database: DataAccess, orderId: string, method: unknown) {
  if (method === undefined) return;
  if (!validOnwardMethod(method)) throw new OnwardDeliveryError("Choose pickup point or home delivery.");
  await putConfig(database, choiceKey(orderId), JSON.stringify({ method }));
}
async function selectedMethod(database: DataAccess, orderId: string): Promise<OnwardMethod | null> {
  const saved = await config(database, choiceKey(orderId));
  if (!saved) return null;
  const method = JSON.parse(saved).method;
  return method === "pickup" || method === "home" ? method : null;
}
export async function getOnwardOrderPreference(orderId: string): Promise<OnwardMethod | null> {
  return selectedMethod(db, orderId);
}

async function reshipperEstimate(database: DataAccess, gbId: string, username: string | null, country: unknown, kits: number, direct: boolean) {
  if (direct) return emptyEstimate("not_applicable", country, kits);
  if (!normalizeEuCountry(country)) return emptyEstimate("unavailable", country, kits, username);
  const [group] = await database.select({ shippingOptions: groupBuysTable.shippingOptions }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (usesCustomEuPostage(group?.shippingOptions, country)) return emptyEstimate("not_applicable", country, kits, username);
  const assignments = await database.select().from(gbReshippersTable).where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.enabled, true)));
  if (!username) {
    const matrices = await Promise.all(assignments.map(async row => {
      const raw = await config(database, matrixKey(gbId, row.id));
      return raw ? parseOnwardMatrix(JSON.parse(raw)) : null;
    }));
    const configured = matrices.some(matrix => matrix?.enabled);
    return { ...emptyEstimate(configured ? "unassigned" : "unavailable", country, kits), configured };
  }
  if (!assignments.some(row => same(row.reshipperUsername, username))) return emptyEstimate("unassigned", country, kits);
  const matrix = await matrixFor(database, gbId, username);
  const result = estimateOnwardDelivery(matrix, country, kits);
  return { ...result, configured: !!matrix?.enabled, reshipperUsername: username, selectedMethod: null as OnwardMethod | null };
}
export async function memberOnwardPreview(gbId: string, actor: UpdateActor, body: Record<string, unknown>) {
  await groupUpdatesAccess(db, gbId, actor, false);
  const kits = body.kits;
  if (typeof kits !== "number") throw new OnwardDeliveryError("Enter the total quantity in kits.");
  // Validate even when no reshipper is assigned.
  estimateOnwardDelivery(null, body.country, kits);
  let country = body.country;
  if (!country) country = (await accountFor(db, actor.username))?.country;
  const [group] = await db.select({ shippingOptions: groupBuysTable.shippingOptions }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (usesCustomEuPostage(group?.shippingOptions, country)) return emptyEstimate("not_applicable", country, kits);
  if (body.directShippingRequested === true) return emptyEstimate("not_applicable", country, kits);
  if (body.orderId) {
    const order = await onwardOrderAccess(db, String(body.orderId), actor, "member");
    if (order.groupBuyId !== gbId) throw new OnwardDeliveryError("Order belongs to a different group buy.", 403);
    return { ...await reshipperEstimate(db, gbId, order.reshipperUsername, country ?? order.shippingCountry, kits, !!order.directShippingRequested),
      selectedMethod: await selectedMethod(db, order.id) };
  }
  const assignments = await db.select().from(gbReshippersTable).where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.enabled, true)));
  let username: string | null = null;
  if (typeof body.reshipperCode === "string" && body.reshipperCode.trim()) {
    const code = body.reshipperCode.trim().toLowerCase();
    const match = assignments.find(row => row.reshipperCodeActive && row.reshipperCode?.toLowerCase() === code);
    if (!match) throw new OnwardDeliveryError("Reshipper code is invalid or inactive.");
    username = match.reshipperUsername;
  } else {
    const [membership] = await db.select().from(accountGroupBuysTable).where(and(
      eq(accountGroupBuysTable.groupBuyId, gbId), eq(accountGroupBuysTable.accountId, actor.username),
    )).limit(1);
    let legCountry: string | null = null;
    if (membership?.countryLegId) {
      const [leg] = await db.select().from(gbCountryLegsTable).where(eq(gbCountryLegsTable.id, membership.countryLegId));
      legCountry = leg?.countryCode ?? null;
    }
    const candidatesFor = (destination: unknown) => {
      const target = normalizeEuCountry(destination);
      if (!target) return [];
      return assignments.filter(row => {
        const coveredCountries = Array.isArray(row.countries) && row.countries.length > 0
          ? row.countries
          : [row.country];
        return coveredCountries.some(country => normalizeEuCountry(country) === target);
      });
    };
    const candidates = (legCountry ? candidatesFor(legCountry) : []);
    const names = [...new Set((candidates.length ? candidates : candidatesFor(country)).map(row => row.reshipperUsername))];
    if (names.length === 1) username = names[0];
  }
  return reshipperEstimate(db, gbId, username, country, kits, false);
}

export type OnwardOrderScope = "member" | "admin" | "organiser" | "reshipper";
export async function validateEuDeliveryCheckout(gbId: string, actor: UpdateActor, body: Record<string, any>, orderId?: string) {
  if (body.directShippingRequested === true || body.additionOfOrderId) return false;
  // New checkout uses country-scoped custom postage, not the retired matrix
  // picker. Keep validation for explicit legacy preferences only; existing
  // issued delivery charges have their own payment flow.
  if (body.onwardDeliveryMethod == null) return false;
  const estimate = await memberOnwardPreview(gbId, actor, {
    country: body.shippingCountry, kits: (body.lineItems ?? []).reduce((n: number, item: any) => n + Number(item.quantity), 0),
    reshipperCode: body.reshipperCode, orderId,
  });
  if (!estimate.configured || !estimate.options.length) return false;
  const error = deliveryContactError(body);
  if (error) throw new OnwardDeliveryError(error);
  if (!estimate.options.some(option => option.method === body.onwardDeliveryMethod)) throw new OnwardDeliveryError("Choose your EU onward-delivery option.");
  return true;
}
export async function onwardOrderAccess(database: DataAccess, orderId: string, actor: UpdateActor, scope: OnwardOrderScope, gbId?: string, lock = false) {
  const query = database.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), isNull(ordersTable.deletedAt))).limit(1);
  const [order] = await (lock ? query.for("update") : query);
  if (!order || !order.groupBuyId || (gbId && gbId !== order.groupBuyId)) throw new OnwardDeliveryError("Group-buy order not found.", 404);
  if (scope === "admin" || scope === "organiser") {
    await groupUpdatesAccess(database, order.groupBuyId, actor, true);
  } else if (scope === "reshipper") {
    if (!same(order.reshipperUsername, actor.username)) throw new OnwardDeliveryError("This order is not assigned to you.", 403);
    const assignments = await database.select().from(gbReshippersTable).where(and(eq(gbReshippersTable.gbId, order.groupBuyId), eq(gbReshippersTable.enabled, true)));
    if (!assignments.some(row => same(row.reshipperUsername, actor.username))) throw new OnwardDeliveryError("You are not an active reshipper for this group buy.", 403);
  } else {
    if (!same(order.telegramUsername, actor.username)) throw new OnwardDeliveryError("This is not your order.", 403);
    await groupUpdatesAccess(database, order.groupBuyId, actor, false);
  }
  return order;
}
export async function estimateForOrder(database: DataAccess, order: typeof ordersTable.$inferSelect) {
  const lines = await database.select({ quantity: orderLineItemsTable.quantity }).from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, order.id));
  const kits = lines.reduce((sum, row) => sum + Number(row.quantity), 0);
  const country = order.shippingCountry || (await accountFor(database, order.telegramUsername))?.country;
  if (!kits) return emptyEstimate("unavailable", country, 0, order.reshipperUsername);
  return { ...await reshipperEstimate(database, order.groupBuyId!, order.reshipperUsername, country, kits, !!order.directShippingRequested),
    selectedMethod: await selectedMethod(database, order.id) };
}
export async function onwardOrderEstimate(orderId: string, actor: UpdateActor, scope: OnwardOrderScope, gbId?: string) {
  return estimateForOrder(db, await onwardOrderAccess(db, orderId, actor, scope, gbId));
}
export async function changeOnwardChoice(orderId: string, actor: UpdateActor, method: unknown) {
  return db.transaction(async tx => {
    const order = await onwardOrderAccess(tx, orderId, actor, "member", undefined, true);
    if (["Cancelled", "Shipped", "Delivered", "Refunded"].includes(order.status) || order.dispatchedByReshipper) throw new OnwardDeliveryError("Delivery preferences cannot be changed after dispatch or cancellation.", 409);
    const estimate = await estimateForOrder(tx, order);
    if (method !== null && !estimate.options.some(option => option.method === method)) throw new OnwardDeliveryError("This delivery option is not currently available. Refresh the estimate.", 409);
    await saveOnwardOrderPreference(tx, orderId, method);
    return { ...estimate, selectedMethod: method as OnwardMethod | null };
  });
}
