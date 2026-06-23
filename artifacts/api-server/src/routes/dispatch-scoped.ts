// ─── Scoped dispatch routers (reshipper + organiser) ──────────────────────────
// Reuse the admin dispatch route factory but lock scope server-side to the
// signed-in reshipper (own parcels/orders) or organiser (their owned GB).
// No admin secret — these surfaces use the existing reshipper/organiser cookie
// logins (admin-impersonation headers are honored by the shared middleware).
import { Router, type IRouter, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { db } from "@workspace/db";
import {
  gbReshippersTable,
  gbParcelsTable,
  groupBuysTable,
  ordersTable,
  orderDispatchImagesTable,
} from "@workspace/db";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { createDispatchRouter, type DispatchRouterCfg } from "./admin-dispatch";
import { requireReshipper } from "../middleware/require-reshipper";
import { requireOrganiser } from "../middleware/require-organiser";
import { gbOwner } from "./organiser";
import { adminOrdersHandler } from "./admin";

const norm = (s?: string | null): string => (s ?? "").replace(/^@/, "").toLowerCase();

// ─── Reshipper ────────────────────────────────────────────────────────────────
async function reshipperHasGb(req: Request, gbId: string): Promise<boolean> {
  const u = norm(req.reshipper?.telegramUsername);
  if (!u) return false;
  const [row] = await db
    .select({ id: gbReshippersTable.gbId })
    .from(gbReshippersTable)
    .where(
      and(
        eq(gbReshippersTable.gbId, gbId),
        sql`lower(replace(${gbReshippersTable.reshipperUsername}, '@', '')) = ${u}`,
      ),
    )
    .limit(1);
  return !!row;
}

// Load an order's GB + reshipper attribution for access checks.
async function loadOrderScope(orderId: string): Promise<{ groupBuyId: string | null; reshipperUsername: string | null; dispatchedByReshipper: string | null } | null> {
  const [row] = await db
    .select({
      groupBuyId: ordersTable.groupBuyId,
      reshipperUsername: ordersTable.reshipperUsername,
      dispatchedByReshipper: ordersTable.dispatchedByReshipper,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  return row ?? null;
}

function reshipperOwnsOrder(req: Request, row: { reshipperUsername: string | null; dispatchedByReshipper: string | null }): boolean {
  const u = norm(req.reshipper?.telegramUsername);
  return norm(row.reshipperUsername) === u || norm(row.dispatchedByReshipper) === u;
}

// Restrict body order/parcel targeting to the reshipper's own within the URL
// gbId. Fail-closed: any error here returns 500 rather than letting an
// unfiltered payload through.
function reshipperBodyFilter(prefix: string): RequestHandler {
  const re = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/([^/]+)/");
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { orderIds?: unknown; parcelIds?: unknown; orderId?: unknown } | undefined;
      if (!body || typeof body !== "object") { next(); return; }
      const hasOrderIds = Array.isArray(body.orderIds) && body.orderIds.length > 0;
      const hasParcelIds = Array.isArray(body.parcelIds) && body.parcelIds.length > 0;
      const hasOrderId = typeof body.orderId === "string" && !!body.orderId;
      if (!hasOrderIds && !hasParcelIds && !hasOrderId) { next(); return; }
      const gbId = req.path.match(re)?.[1];
      if (!gbId) { next(); return; }
      const u = norm(req.reshipper?.telegramUsername);

      // Singular orderId (e.g. save-dispatch-image): reject if not the reshipper's
      // own order within this GB — a single value can't be silently filtered.
      if (hasOrderId) {
        const order = await loadOrderScope(body.orderId as string);
        if (!order || order.groupBuyId !== gbId || !reshipperOwnsOrder(req, order)) {
          res.status(403).json({ error: "Forbidden" }); return;
        }
      }

      // orderIds array: intersect with the reshipper's own orders in this GB.
      if (hasOrderIds) {
        const ids = (body.orderIds as string[]).map(String);
        const rows = await db
          .select({
            id: ordersTable.id,
            reshipperUsername: ordersTable.reshipperUsername,
            dispatchedByReshipper: ordersTable.dispatchedByReshipper,
          })
          .from(ordersTable)
          .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.id, ids)));
        (req.body as { orderIds: string[] }).orderIds = rows
          .filter((o) => norm(o.reshipperUsername) === u || norm(o.dispatchedByReshipper) === u)
          .map((o) => o.id);
      }

      // parcelIds array: intersect with the reshipper's own parcels in this GB.
      if (hasParcelIds) {
        const pids = (body.parcelIds as string[]).map(String);
        const prows = await db
          .select({ id: gbParcelsTable.id, reshipperUsername: gbParcelsTable.reshipperUsername })
          .from(gbParcelsTable)
          .where(and(eq(gbParcelsTable.groupBuyId, gbId), inArray(gbParcelsTable.id, pids)));
        (req.body as { parcelIds: string[] }).parcelIds = prows
          .filter((p) => norm(p.reshipperUsername) === u)
          .map((p) => p.id);
      }

      next();
    } catch (e) {
      console.error("[reshipper body filter]", e);
      res.status(500).json({ error: "Scope filter failed" });
    }
  };
}

const RESHIPPER_PREFIX = "/reshipper/dispatch";
const reshipperCfg: DispatchRouterCfg = {
  prefix: RESHIPPER_PREFIX,
  ordersImagesPrefix: "/reshipper/dispatch/orders",
  auth: requireReshipper,
  forceScope: (req: Request) => {
    const u = req.reshipper!.telegramUsername;
    const q = req.query as Record<string, unknown>;
    q["scopeType"] = "reshipper";
    q["scopeId"] = u;
    q["reshipper"] = u;
    if (req.body && typeof req.body === "object") {
      const b = req.body as Record<string, unknown>;
      b["scopeType"] = "reshipper";
      b["scopeId"] = u;
      b["reshipper"] = u;
    }
  },
  bodyScopeFilter: reshipperBodyFilter(RESHIPPER_PREFIX),
  // Narrows read endpoints to the reshipper's own orders/parcels server-side.
  reshipperScope: (req) => norm(req.reshipper?.telegramUsername) || null,
  assertGbAccess: (req, gbId) => reshipperHasGb(req, gbId),
  assertImageAccess: async (req, imageId) => {
    const [img] = await db
      .select({ orderId: orderDispatchImagesTable.orderId })
      .from(orderDispatchImagesTable)
      .where(eq(orderDispatchImagesTable.id, imageId))
      .limit(1);
    if (!img) return false;
    const order = await loadOrderScope(img.orderId);
    if (!order?.groupBuyId) return false;
    return (await reshipperHasGb(req, order.groupBuyId)) && reshipperOwnsOrder(req, order);
  },
  assertOrderAccess: async (req, orderId) => {
    const order = await loadOrderScope(orderId);
    if (!order?.groupBuyId) return false;
    return (await reshipperHasGb(req, order.groupBuyId)) && reshipperOwnsOrder(req, order);
  },
  includeAux: true,
  listGroupBuys: async (req) => {
    const u = norm(req.reshipper?.telegramUsername);
    if (!u) return [];
    const rows = await db
      .select({ id: groupBuysTable.id, name: groupBuysTable.name })
      .from(gbReshippersTable)
      .innerJoin(groupBuysTable, eq(groupBuysTable.id, gbReshippersTable.gbId))
      .where(sql`lower(replace(${gbReshippersTable.reshipperUsername}, '@', '')) = ${u}`)
      .orderBy(asc(groupBuysTable.name));
    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  },
  ordersHandler: adminOrdersHandler,
};

// ─── Organiser ──────────────────────────────────────────────────────────────
async function organiserOwnsGb(req: Request, gbId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId))
    .limit(1);
  return !!row;
}

const ORGANISER_PREFIX = "/organiser/dispatch";
const organiserCfg: DispatchRouterCfg = {
  prefix: ORGANISER_PREFIX,
  ordersImagesPrefix: "/organiser/dispatch/orders",
  auth: requireOrganiser,
  assertGbAccess: (req, gbId) => organiserOwnsGb(req, gbId),
  assertImageAccess: async (req, imageId) => {
    const [img] = await db
      .select({ orderId: orderDispatchImagesTable.orderId })
      .from(orderDispatchImagesTable)
      .where(eq(orderDispatchImagesTable.id, imageId))
      .limit(1);
    if (!img) return false;
    const order = await loadOrderScope(img.orderId);
    if (!order?.groupBuyId) return false;
    return organiserOwnsGb(req, order.groupBuyId);
  },
  assertOrderAccess: async (req, orderId) => {
    const order = await loadOrderScope(orderId);
    if (!order?.groupBuyId) return false;
    return organiserOwnsGb(req, order.groupBuyId);
  },
  includeAux: true,
  listGroupBuys: async (req) => {
    return db
      .select({ id: groupBuysTable.id, name: groupBuysTable.name })
      .from(groupBuysTable)
      .where(gbOwner(req))
      .orderBy(asc(groupBuysTable.name));
  },
  ordersHandler: adminOrdersHandler,
};

export const reshipperDispatchRouter: IRouter = createDispatchRouter(reshipperCfg);
export const organiserDispatchRouter: IRouter = createDispatchRouter(organiserCfg);
