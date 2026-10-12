import { type Request, type Response, type NextFunction } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, pool, groupBuysTable, ordersTable, gbHalfKitClaimsTable as claims } from "@workspace/db";
import { requireAdmin } from "./require-admin";
import { requireOrganiser } from "./require-organiser";
import { halfKitLegacyMutation } from "../lib/half-kit-protection-rules";
import { halfKitGroup } from "../lib/half-kit-offers";

// Locks need their own small pool: borrowing all data connections before running
// native handlers would leave those handlers waiting forever for a free connection.
const protectionPool: typeof pool = new (pool.constructor as any)({
  ...pool.options, connectionString: pool.options.connectionString, password: pool.options.password,
  max: 4, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000, allowExitOnIdle: true,
});
const settingsFields = ["currency", "adminFeeEnabled", "adminFeeType", "adminFeeAmount", "adminFeeCountries"];
function settingChanged(before: any, after: any, key: string) {
  if (after[key] === undefined) return false;
  if (key.endsWith("Amount")) return Number(before[key] ?? 0) !== Number(after[key] || 0);
  if (key === "currency") return String(before[key]).toUpperCase() !== String(after[key]).toUpperCase();
  if (key.endsWith("Countries")) {
    const countries = (value: any) => {
      if (typeof value === "string") { try { value = JSON.parse(value); } catch { return value; } }
      return Array.isArray(value) ? [...value].sort() : value ?? [];
    };
    return JSON.stringify(countries(before[key])) !== JSON.stringify(countries(after[key]));
  }
  return before[key] !== after[key];
}
export async function halfKitProtection(req: Request, res: Response, next: NextFunction) {
  const plan = halfKitLegacyMutation(req.method, req.path, req.body ?? {});
  if (!plan) { next(); return; }
  let client: { query(text: string, values?: any[]): Promise<any>; release(error?: Error): void } | undefined;
  let released = false;
  const cleanup = async () => {
    if (!client || released) return;
    released = true;
    try {
      // Persist settlement before another half-kit mutation can clear old balance-payment fields.
      await client.query(`UPDATE gb_half_kit_claims c SET paid_at = now()
        FROM orders o WHERE c.order_id = o.id AND c.state = 'active' AND c.paid_at IS NULL
          AND o.group_buy_id = ANY($1::text[]) AND o.payment_status = 'confirmed'
          AND COALESCE(o.amount_due, 0) = 0`, [groups]);
      await client.query("SELECT pg_advisory_unlock_all()");
      await client.query("RESET lock_timeout");
      client.release();
    } catch (error) { client.release(error as Error); console.error("[half-kit protection cleanup]", error); }
  };
  let groups: string[] = [];
  try {
    const requestedIds = plan.orderId ? [plan.orderId] : (req.body?.orderIds ?? req.body?.ids);
    const ids: string[] | null = Array.isArray(requestedIds) && requestedIds.length && requestedIds.every(id => typeof id === "string")
      ? [...new Set(requestedIds)] : null;
    const groupHint = plan.groupId ?? (typeof req.body?.groupBuyId === "string" ? req.body.groupBuyId : null);
    const targetOrders = plan.kind === "group" ? null : await db.select({
      id: ordersTable.id, groupBuyId: ordersTable.groupBuyId, username: ordersTable.telegramUsername,
    }).from(ordersTable).where(and(
      ...(ids ? [inArray(ordersTable.id, ids)] : []),
      ...(groupHint ? [eq(ordersTable.groupBuyId, groupHint)] : []),
    ));
    if (plan.kind === "group" && groupHint) groups = [groupHint];
    else groups = [...new Set((targetOrders ?? []).map(order => order.groupBuyId).filter((id): id is string => !!id))];
    if (!groups.length) { next(); return; }
    const authorized = await new Promise<boolean>((resolve, reject) => {
      if (plan.role === "admin") { resolve(requireAdmin(req, res)); return; }
      // Member/PIN authentication stays with the original endpoint. This middleware
      // must not turn historically PIN-authorised guest operations into login-only ones.
      if (plan.role === "member") { resolve(true); return; }
      const middleware = requireOrganiser;
      Promise.resolve(middleware(req, res, () => resolve(true)))
        .then(() => { if (res.headersSent) resolve(false); }).catch(reject);
    });
    if (!authorized) return;
    if (plan.role === "organiser") for (const groupId of groups) {
      await halfKitGroup(db, groupId, { username: req.organiser!.telegramUsername,
        admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId }, true);
    }
    groups.sort();
    client = await protectionPool.connect();
    res.once("finish", () => { void cleanup(); });
    const end = res.end;
    res.end = function (this: Response, ...args: any[]) {
      try { return (end as any).apply(this, args); }
      finally { void cleanup(); }
    } as typeof res.end;
    // A disconnected browser does not mean the native async write has stopped.
    res.once("close", () => { if (res.writableEnded) void cleanup(); });
    await client.query("SET lock_timeout = '15s'");
    await client.query(`SELECT pg_advisory_lock(hashtextextended(key, 0))
      FROM (SELECT unnest($1::text[]) AS key ORDER BY key) keys`, [groups.map(id => `half-kit-money:${id}`)]);
    let block = plan.block;
    if (plan.settings) {
      const [group] = await db.select().from(groupBuysTable).where(eq(groupBuysTable.id, groups[0]));
      block = !!group && settingsFields.some(key => settingChanged(group, req.body ?? {}, key));
    }
    if (block || plan.refund) {
      const active = await db.select({ id: claims.id }).from(claims).where(and(
        eq(claims.state, "active"), inArray(claims.groupBuyId, groups),
        ...(ids ? [inArray(claims.orderId, ids)] : []),
      )).limit(1);
      if (active.length && plan.refund && !block) {
        const parents = await db.select({ due: ordersTable.amountDue, paid: ordersTable.paymentStatus }).from(ordersTable)
          .where(and(inArray(ordersTable.groupBuyId, groups), ...(ids ? [inArray(ordersTable.id, ids)] : [])));
        if (parents.some(order => Number(order.due ?? 0) > 0 || order.paid !== "confirmed")) {
          res.status(409).json({ error: "Pay or release unpaid half-kit claims before requesting a whole-order refund." });
          return;
        }
      }
      if (active.length && block) {
        res.status(409).json({ code: "half_kit_pricing_protected",
          error: "This change would alter an order with protected half-kit claims. Release unpaid claims in Fill half kits before changing its products or charges. Payments, notes and fulfilment remain available." });
        return;
      }
    }
    next();
  } catch (error) {
    await cleanup();
    if (!res.headersSent) res.status((error as any)?.status ?? 409).json({
      error: (error as any)?.message ?? "Another payment or half-kit change is in progress. Please retry.",
    });
  }
}
