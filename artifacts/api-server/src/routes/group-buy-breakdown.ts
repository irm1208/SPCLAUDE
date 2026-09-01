import { Router, type IRouter, type Request, type Response } from "express";
import {
  accountsTable,
  gbCountryLegsTable,
  groupBuysTable,
  orderLineItemsTable,
  ordersTable,
  db,
} from "@workspace/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireReshipper, verifyReshipperAssignment } from "../middleware/require-reshipper";
import {
  buildGroupBuyBreakdown,
  type GroupBuyBreakdownFilters,
  type GroupBuyBreakdownOrderInput,
  type GroupBuyRegionKey,
} from "../lib/group-buy-breakdown";

const router: IRouter = Router();

type BreakdownScope = "admin" | "organiser" | "reshipper";
type BreakdownOrderRow = {
  id: string;
  code: string;
  telegramUsername: string;
  paymentStatus: string | null;
  productSubtotal: string | number | null;
  createdAt: Date;
};

function parseFilters(query: Request["query"]): GroupBuyBreakdownFilters {
  const paymentStatus = query.paymentStatus === "paid" || query.paymentStatus === "unpaid"
    ? query.paymentStatus
    : "all";
  const region = query.region === "UK" || query.region === "EU" || query.region === "ROW" || query.region === "UNKNOWN"
    ? query.region as GroupBuyRegionKey
    : "all";
  const asString = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
  return {
    paymentStatus,
    region,
    country: asString(query.country) ?? "all",
    productId: asString(query.productId) ?? "all",
    search: asString(query.search),
  };
}

async function getOrdersForBreakdown(
  gbId: string,
  scope: BreakdownScope,
  req: Request,
  res: Response,
): Promise<GroupBuyBreakdownOrderInput[] | null> {
  const [gb] = await dbSelectGroupBuy(gbId);
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return null;
  }

  let whereClause = and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt));
  if (scope === "organiser") {
    const organiser = req.organiser!;
    if (organiser.isAdmin && organiser.adminGbId && organiser.adminGbId !== gbId) {
      res.status(404).json({ error: "Group buy not found" });
      return null;
    }
    if (!organiser.isAdmin) {
      const ownsGroupBuy = await dbSelectOwnedGroupBuy(gbId, organiser.telegramUsername);
      if (!ownsGroupBuy) {
        res.status(404).json({ error: "Group buy not found" });
        return null;
      }
    }
  }

  if (scope === "reshipper") {
    const assignment = await verifyReshipperAssignment(req, res, gbId);
    if (!assignment) return null;

    const [countryLeg] = await db
      .select({ id: gbCountryLegsTable.id })
      .from(gbCountryLegsTable)
      .where(and(
        eq(gbCountryLegsTable.gbId, gbId),
        sql`lower(${gbCountryLegsTable.countryCode}) = lower(${assignment.country.trim()})`,
      ));

    const notDirectShipping = sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`;
    whereClause = countryLeg
      ? and(
          whereClause,
          or(
            eq(ordersTable.reshipperUsername, assignment.reshipperUsername),
            and(isNull(ordersTable.reshipperUsername), eq(ordersTable.countryLegId, countryLeg.id)),
          ),
          notDirectShipping,
        )
      : and(whereClause, eq(ordersTable.reshipperUsername, assignment.reshipperUsername), notDirectShipping);
  }

  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      paymentStatus: ordersTable.paymentStatus,
      productSubtotal: ordersTable.productSubtotal,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(whereClause)
    .orderBy(desc(ordersTable.createdAt)) as BreakdownOrderRow[];

  if (orders.length === 0) return [];

  const orderIds = orders.map((order: BreakdownOrderRow) => order.id);
  const lineItems = await db
    .select({
      orderId: orderLineItemsTable.orderId,
      productId: orderLineItemsTable.productId,
      productName: orderLineItemsTable.productName,
      quantity: orderLineItemsTable.quantity,
      lineTotal: orderLineItemsTable.lineTotal,
    })
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  const linesByOrder = new Map<string, GroupBuyBreakdownOrderInput["lineItems"]>();
  for (const line of lineItems) {
    const lines = linesByOrder.get(line.orderId) ?? [];
    lines.push({
      productId: line.productId,
      productName: line.productName,
      quantity: Number(line.quantity ?? 0),
      lineTotal: Number(line.lineTotal ?? 0),
    });
    linesByOrder.set(line.orderId, lines);
  }

  const rawUsernames = [...new Set(orders.map((order: BreakdownOrderRow) => order.telegramUsername))];
  const lookupUsernames = [...new Set([...rawUsernames, ...rawUsernames.map((username: string) => username.replace(/^@/, ""))])];
  const accountRows = lookupUsernames.length > 0
    ? await db
      .select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country })
      .from(accountsTable)
      .where(inArray(accountsTable.telegramUsername, lookupUsernames))
    : [];
  const countryByUsername = new Map<string, string | null>();
  for (const account of accountRows) {
    const normalized = account.telegramUsername.toLowerCase().replace(/^@/, "");
    countryByUsername.set(normalized, account.country);
  }

  return orders.map((order: BreakdownOrderRow) => ({
    id: order.id,
    code: order.code,
    telegramUsername: order.telegramUsername,
    accountCountry: countryByUsername.get(order.telegramUsername.toLowerCase().replace(/^@/, "")) ?? null,
    paymentStatus: order.paymentStatus,
    productSubtotal: Number(order.productSubtotal ?? 0),
    lineItems: linesByOrder.get(order.id) ?? [],
  }));
}

async function dbSelectGroupBuy(gbId: string) {
  return db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
}

async function dbSelectOwnedGroupBuy(gbId: string, username: string) {
  const [groupBuy] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(and(
      eq(groupBuysTable.id, gbId),
      sql`lower(${groupBuysTable.organiserId}) = lower(${username})`,
    ));
  return groupBuy;
}

async function sendBreakdown(
  req: Request,
  res: Response,
  gbId: string,
  scope: BreakdownScope,
): Promise<void> {
  const orders = await getOrdersForBreakdown(gbId, scope, req, res);
  if (orders === null) return;
  res.json(buildGroupBuyBreakdown(orders, parseFilters(req.query)));
}

router.get("/admin/group-buys/:gbId/order-breakdown", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await sendBreakdown(req, res, String(req.params.gbId), "admin");
});

router.get("/organiser/group-buys/:gbId/order-breakdown", requireOrganiser, async (req, res): Promise<void> => {
  await sendBreakdown(req, res, String(req.params.gbId), "organiser");
});

router.get("/reshipper/gb/:gbId/order-breakdown", requireReshipper, async (req, res): Promise<void> => {
  await sendBreakdown(req, res, String(req.params.gbId), "reshipper");
});

export default router;