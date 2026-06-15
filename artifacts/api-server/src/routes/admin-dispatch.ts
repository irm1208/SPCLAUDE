import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { db } from "@workspace/db";
import {
  gbParcelsTable,
  ordersTable,
  orderLineItemsTable,
  orderDispatchImagesTable,
  gbCountryLegsTable,
  groupBuysTable,
  accountsTable,
  type ParcelItem,
} from "@workspace/db";
import { eq, and, inArray, isNull, or, sql } from "drizzle-orm";
import { sendTelegramMessage, notifyUserFromTemplate } from "../lib/telegram";
import { GoogleGenAI } from "../lib/google-genai";
import { randomUUID } from "crypto";

const router = Router();

// ─── types ─────────────────────────────────────────────────────────────────
type ExtParcelItem = ParcelItem & { dispatchedQty?: number };

function remaining(item: ExtParcelItem): number {
  return item.qty - (item.dispatchedQty ?? 0);
}

// ─── GET /admin/dispatch/:gbId/scope-options ────────────────────────────────
// Returns reshippers (that have ≥1 delivered parcel) + country legs for a GB.
router.get("/admin/dispatch/:gbId/scope-options", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;

    const parcels = await db.select().from(gbParcelsTable)
      .where(eq(gbParcelsTable.groupBuyId, gbId));

    const DELIVERED = ["in_transit", "out_for_delivery", "attempted", "delivered"];
    const deliveredParcels = parcels.filter(p => DELIVERED.includes(p.status));

    const reshippers = [
      ...new Set(
        deliveredParcels
          .filter(p => p.reshipperUsername)
          .map(p => p.reshipperUsername!)
      ),
    ].sort();

    const countryLegs = await db.select().from(gbCountryLegsTable)
      .where(eq(gbCountryLegsTable.gbId, gbId));

    res.json({ reshippers, countryLegs });
  } catch (e) {
    console.error("[dispatch scope-options]", e);
    res.status(500).json({ error: "Failed to load scope options" });
  }
});

// ─── GET /admin/dispatch/:gbId/parcels ─────────────────────────────────────
// Returns delivered parcels for a GB (filtered by scope), with remainingQty.
// Query params: scopeType=reshipper|country, scopeId=<username|legId>
router.get("/admin/dispatch/:gbId/parcels", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const { scopeType, scopeId } = req.query as Record<string, string>;

    const DELIVERED = ["in_transit", "out_for_delivery", "attempted", "delivered"];

    let parcels = await db.select().from(gbParcelsTable)
      .where(eq(gbParcelsTable.groupBuyId, gbId));

    parcels = parcels.filter(p => DELIVERED.includes(p.status));

    if (scopeType === "reshipper" && scopeId) {
      const normScope = scopeId.replace(/^@/, "").toLowerCase();
      parcels = parcels.filter(p => (p.reshipperUsername ?? "").replace(/^@/, "").toLowerCase() === normScope);
    } else if (scopeType === "country") {
      parcels = parcels.filter(p => !p.reshipperUsername);
    }

    const result = parcels.map(p => ({
      ...p,
      items: (p.items as ExtParcelItem[]).map(item => ({
        ...item,
        dispatchedQty: item.dispatchedQty ?? 0,
        remainingQty: remaining(item),
      })),
    }));

    res.json(result);
  } catch (e) {
    console.error("[dispatch parcels]", e);
    res.status(500).json({ error: "Failed to load parcels" });
  }
});

// ─── POST /admin/dispatch/:gbId/compute ────────────────────────────────────
// Body: { parcelIds: string[], scopeType: string, scopeId: string }
// Returns fulfillable + unfulfillable orders based on available parcel stock.
router.post("/admin/dispatch/:gbId/compute", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const { parcelIds, scopeType, scopeId } = req.body as {
      parcelIds: string[];
      scopeType: string;
      scopeId: string;
    };

    if (!Array.isArray(parcelIds) || parcelIds.length === 0) {
      res.status(400).json({ error: "parcelIds required" });
      return;
    }

    // Get selected parcels
    const parcels = await db.select().from(gbParcelsTable)
      .where(and(
        eq(gbParcelsTable.groupBuyId, gbId),
        inArray(gbParcelsTable.id, parcelIds),
      ));

    // Build available stock map (product name lower → remaining qty)
    const stockMap = new Map<string, number>();
    parcels.forEach(p => {
      (p.items as ExtParcelItem[]).forEach(item => {
        const key = item.name.trim().toLowerCase();
        stockMap.set(key, (stockMap.get(key) ?? 0) + remaining(item));
      });
    });

    // Load all active orders for this GB
    const allOrders = await db.select().from(ordersTable)
      .where(eq(ordersTable.groupBuyId, gbId));

    const activeOrders = allOrders.filter(o =>
      !o.deletedAt && !["Cancelled"].includes(o.status)
    );

    // Filter by scope
    let scopedOrders = activeOrders;
    if (scopeType === "reshipper" && scopeId) {
      const normScope = scopeId.replace(/^@/, "").toLowerCase();
      scopedOrders = activeOrders.filter(o => (o.reshipperUsername ?? "").replace(/^@/, "").toLowerCase() === normScope);
    } else if (scopeType === "country" && scopeId) {
      scopedOrders = activeOrders.filter(o => o.countryLegId === scopeId);
    }

    // Only pending orders (not yet shipped)
    const pendingOrders = scopedOrders.filter(o =>
      !["Shipped", "Completed"].includes(o.status)
    );

    // Fetch all line items in one query
    const orderIds = pendingOrders.map(o => o.id);
    const lineItemsAll = orderIds.length > 0
      ? await db.select().from(orderLineItemsTable)
          .where(inArray(orderLineItemsTable.orderId, orderIds))
      : [];

    const lineItemsByOrder = new Map<string, typeof lineItemsAll>();
    lineItemsAll.forEach(li => {
      if (!lineItemsByOrder.has(li.orderId)) lineItemsByOrder.set(li.orderId, []);
      lineItemsByOrder.get(li.orderId)!.push(li);
    });

    // Exact key matching only — substring matching is intentionally removed to prevent
    // combo products (e.g. "KPV 10mg + GHK 50mg") from being confused with standalone
    // products (e.g. "KPV 10mg") whose names appear as substrings of the combo name.
    const findKey = (remaining: Map<string, number>, name: string): string | undefined => {
      const exact = name.trim().toLowerCase();
      return remaining.has(exact) ? exact : undefined;
    };

    // Greedy allocation
    const available = new Map(stockMap);
    const fulfillable: object[] = [];
    const unfulfillable: object[] = [];

    for (const order of pendingOrders) {
      const lineItems = lineItemsByOrder.get(order.id) ?? [];

      if (lineItems.length === 0) {
        unfulfillable.push({
          ...formatOrder(order, lineItems),
          reason: "No line items",
        });
        continue;
      }

      const canFulfill = lineItems.every(li => {
        const k = findKey(available, li.productName);
        return k !== undefined && (available.get(k) ?? 0) >= Number(li.quantity);
      });

      if (canFulfill) {
        lineItems.forEach(li => {
          const k = findKey(available, li.productName)!;
          available.set(k, available.get(k)! - Number(li.quantity));
        });
        fulfillable.push(formatOrder(order, lineItems));
      } else {
        const missing = lineItems
          .filter(li => {
            const k = findKey(available, li.productName);
            return !k || (available.get(k) ?? 0) < Number(li.quantity);
          })
          .map(li => {
            const k = findKey(available, li.productName);
            const have = k ? (available.get(k) ?? 0) : 0;
            return `${li.productName} (need ${li.quantity}, have ${have})`;
          });
        unfulfillable.push({
          ...formatOrder(order, lineItems),
          reason: `Insufficient stock: ${missing.join("; ")}`,
        });
      }
    }

    res.json({
      fulfillable,
      unfulfillable,
      stockSummary: Object.fromEntries(
        [...stockMap.entries()].map(([k, v]) => [k, {
          total: v,
          used: v - (available.get(k) ?? 0),
          remaining: available.get(k) ?? 0,
        }])
      ),
    });
  } catch (e) {
    console.error("[dispatch compute]", e);
    res.status(500).json({ error: "Failed to compute fulfillable orders" });
  }
});

// ─── POST /admin/dispatch/:gbId/confirm ─────────────────────────────────────
// Body: { orderIds: string[], parcelIds: string[] }
// Deducts stock from parcels based on the selected orders' line items.
router.post("/admin/dispatch/:gbId/confirm", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const { orderIds, parcelIds } = req.body as {
      orderIds: string[];
      parcelIds: string[];
    };

    if (!Array.isArray(parcelIds) || parcelIds.length === 0) {
      res.status(400).json({ error: "parcelIds required" });
      return;
    }
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: "orderIds required" });
      return;
    }

    // Get selected orders' line items → build total needs map
    const lineItemsAll = await db.select().from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    const needsMap = new Map<string, number>();
    lineItemsAll.forEach(li => {
      const key = li.productName.trim().toLowerCase();
      needsMap.set(key, (needsMap.get(key) ?? 0) + Number(li.quantity));
    });

    // Get selected parcels
    const parcels = await db.select().from(gbParcelsTable)
      .where(and(
        eq(gbParcelsTable.groupBuyId, gbId),
        inArray(gbParcelsTable.id, parcelIds),
      ));

    const remaining = new Map(needsMap);

    // Deduct from each parcel greedily
    for (const parcel of parcels) {
      const updatedItems = (parcel.items as ExtParcelItem[]).map(item => {
        const exact = item.name.trim().toLowerCase();
        // Exact match only — no substring fallback (see compute endpoint for rationale)
        let deductKey = remaining.has(exact) ? exact : undefined;

        if (!deductKey || !remaining.get(deductKey)) return item;

        const canDeduct = item.qty - (item.dispatchedQty ?? 0);
        const needed = remaining.get(deductKey)!;
        const toDeduct = Math.min(canDeduct, needed);

        if (toDeduct <= 0) return item;

        remaining.set(deductKey, needed - toDeduct);

        return {
          ...item,
          dispatchedQty: (item.dispatchedQty ?? 0) + toDeduct,
        } as ExtParcelItem;
      });

      await db.update(gbParcelsTable)
        .set({ items: updatedItems as ParcelItem[] })
        .where(eq(gbParcelsTable.id, parcel.id));
    }

    // Derive reshipper from the selected parcels (use first parcel's reshipperUsername)
    const dispatchedByReshipper = parcels
      .map(p => p.reshipperUsername)
      .find(r => !!r) ?? null;

    // Mark all dispatched orders as Shipped and stamp dispatch confirmation time + reshipper
    await db.update(ordersTable)
      .set({ status: "Shipped", updatedAt: new Date(), dispatchConfirmedAt: new Date(), dispatchedByReshipper })
      .where(inArray(ordersTable.id, orderIds));

    res.json({ ok: true, confirmed: orderIds.length });
  } catch (e) {
    console.error("[dispatch confirm]", e);
    res.status(500).json({ error: "Failed to confirm dispatch" });
  }
});

// ─── POST /admin/dispatch/:gbId/undispatch ───────────────────────────────────
// Reverses a dispatch confirmation: resets status to Processing, clears stamps,
// and restores dispatchedQty on parcels for this GB.
router.post("/admin/dispatch/:gbId/undispatch", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params as { gbId: string };
    const { orderIds } = req.body as { orderIds: string[] };

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: "orderIds required" });
      return;
    }

    // Build a map of qty to restore per product name from the order line items
    const lineItems = await db.select().from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    const restoreMap = new Map<string, number>();
    lineItems.forEach(li => {
      const key = li.productName.trim().toLowerCase();
      restoreMap.set(key, (restoreMap.get(key) ?? 0) + Number(li.quantity));
    });

    // Greedily restore dispatchedQty on parcels in this GB
    const parcels = await db.select().from(gbParcelsTable)
      .where(eq(gbParcelsTable.groupBuyId, gbId));

    const toRestore = new Map(restoreMap);
    for (const parcel of parcels) {
      if ([...toRestore.values()].every(v => v <= 0)) break;
      const updatedItems = (parcel.items as ExtParcelItem[]).map(item => {
        const key = item.name.trim().toLowerCase();
        const want = toRestore.get(key) ?? 0;
        if (want <= 0) return item;
        const currentDispatched = item.dispatchedQty ?? 0;
        const actualRestore = Math.min(currentDispatched, want);
        toRestore.set(key, want - actualRestore);
        return { ...item, dispatchedQty: currentDispatched - actualRestore } as ExtParcelItem;
      });
      await db.update(gbParcelsTable)
        .set({ items: updatedItems as ParcelItem[] })
        .where(eq(gbParcelsTable.id, parcel.id));
    }

    // Reset order status back to Processing
    await db.update(ordersTable)
      .set({ status: "Processing", updatedAt: new Date(), dispatchConfirmedAt: null, dispatchedByReshipper: null })
      .where(inArray(ordersTable.id, orderIds));

    res.json({ ok: true, undispatched: orderIds.length });
  } catch (e) {
    console.error("[dispatch undispatch]", e);
    res.status(500).json({ error: "Failed to un-dispatch orders" });
  }
});

// ─── POST /admin/dispatch/:gbId/reattribute ─────────────────────────────────
// Set dispatchedByReshipper on a batch of orders (for correcting historical data).
router.post("/admin/dispatch/:gbId/reattribute", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params as { gbId: string };
    const { orderIds, reshipper } = req.body as { orderIds?: string[]; reshipper?: string };
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: "orderIds required" }); return;
    }
    const normReshipper = reshipper ? String(reshipper).trim() : null;
    await db.update(ordersTable)
      .set({ dispatchedByReshipper: normReshipper, updatedAt: new Date() })
      .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.id, orderIds)));
    res.json({ ok: true, updated: orderIds.length });
  } catch (e) {
    console.error("[dispatch reattribute]", e);
    res.status(500).json({ error: "Failed to re-attribute orders" });
  }
});

// ─── GET /admin/dispatch/:gbId/unshipped-by-reshipper ───────────────────────
// Returns orders in this GB whose reshipperUsername matches (direct match only,
// no leg routing) and whose status is not Shipped/Completed/Cancelled/Deleted.
router.get("/admin/dispatch/:gbId/unshipped-by-reshipper", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params as { gbId: string };
    const reshipper = req.query.reshipper as string | undefined;
    if (!reshipper) { res.status(400).json({ error: "reshipper required" }); return; }
    const norm = reshipper.replace(/^@/, "").toLowerCase();
    const normAt = `@${norm}`;

    const rows = await db.select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      shippingName: ordersTable.shippingName,
      status: ordersTable.status,
      reshipperUsername: ordersTable.reshipperUsername,
    })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.groupBuyId, gbId),
          isNull(ordersTable.deletedAt),
          or(
            sql`lower(${ordersTable.reshipperUsername}) = ${norm}`,
            sql`lower(${ordersTable.reshipperUsername}) = ${normAt}`,
          ),
        ),
      );

    const unshipped = rows.filter(o => !["Shipped", "Completed", "Cancelled"].includes(o.status ?? ""));
    res.json({ orders: unshipped, count: unshipped.length });
  } catch (e) {
    console.error("[dispatch unshipped-by-reshipper]", e);
    res.status(500).json({ error: "Failed to fetch unshipped orders" });
  }
});

// ─── POST /admin/dispatch/:gbId/mark-shipped-by-reshipper ───────────────────
// Finds all non-Shipped/Completed orders in this GB for a given reshipper and
// marks them as Shipped + stamps dispatchConfirmedAt + dispatchedByReshipper.
// Used to recover orders confirmed via packing slips before status tracking existed.
router.post("/admin/dispatch/:gbId/mark-shipped-by-reshipper", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params as { gbId: string };
    // orderIds: if provided, mark only those specific orders; otherwise mark all unshipped for reshipper
    const { reshipper, orderIds } = req.body as { reshipper?: string; orderIds?: string[] };
    if (!reshipper) { res.status(400).json({ error: "reshipper required" }); return; }
    const norm = reshipper.replace(/^@/, "").toLowerCase();
    const normAt = `@${norm}`;

    let toMark: string[];

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      // Validate the supplied IDs belong to this GB and match the reshipper
      const rows = await db.select({ id: ordersTable.id, reshipperUsername: ordersTable.reshipperUsername, status: ordersTable.status })
        .from(ordersTable)
        .where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt), inArray(ordersTable.id, orderIds)));
      toMark = rows
        .filter(o => {
          const r = (o.reshipperUsername ?? "").replace(/^@/, "").toLowerCase();
          return (r === norm || r === normAt.slice(1)) && !["Shipped", "Completed", "Cancelled"].includes(o.status ?? "");
        })
        .map(o => o.id);
    } else {
      const allOrders = await db.select({ id: ordersTable.id, reshipperUsername: ordersTable.reshipperUsername, status: ordersTable.status })
        .from(ordersTable)
        .where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));
      toMark = allOrders.filter(o => {
        const r = (o.reshipperUsername ?? "").replace(/^@/, "").toLowerCase();
        return (r === norm || r === normAt.slice(1)) && !["Shipped", "Completed", "Cancelled"].includes(o.status ?? "");
      }).map(o => o.id);
    }

    if (toMark.length === 0) {
      res.json({ ok: true, marked: 0 }); return;
    }

    await db.update(ordersTable)
      .set({ status: "Shipped", updatedAt: new Date(), dispatchConfirmedAt: new Date(), dispatchedByReshipper: reshipper })
      .where(inArray(ordersTable.id, toMark));

    res.json({ ok: true, marked: toMark.length });
  } catch (e) {
    console.error("[dispatch mark-shipped-by-reshipper]", e);
    res.status(500).json({ error: "Failed to mark orders as shipped" });
  }
});

// ─── GET /admin/dispatch/:gbId/half-kits ────────────────────────────────────
// Returns orders with half-kit line items (qty < 1), grouped by reshipper.
router.get("/admin/dispatch/:gbId/half-kits", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;

    const allOrders = await db.select().from(ordersTable)
      .where(eq(ordersTable.groupBuyId, gbId));

    const activeOrders = allOrders.filter(o =>
      !o.deletedAt && o.status !== "Cancelled"
    );

    if (activeOrders.length === 0) {
      res.json({ reshippers: [] });
      return;
    }

    const orderIds = activeOrders.map(o => o.id);
    const lineItems = await db.select().from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    // Half kits = fractional quantity (0.5, 1.5, etc.)
    const halfKitLineItems = lineItems.filter(li => {
      const qty = Number(li.quantity);
      return qty > 0 && qty !== Math.floor(qty);
    });

    // Index by order
    const halfKitsByOrder = new Map<string, typeof halfKitLineItems>();
    halfKitLineItems.forEach(li => {
      if (!halfKitsByOrder.has(li.orderId)) halfKitsByOrder.set(li.orderId, []);
      halfKitsByOrder.get(li.orderId)!.push(li);
    });

    // Only orders that have at least one half-kit line item
    const ordersWithHalfKits = activeOrders.filter(o => halfKitsByOrder.has(o.id));

    // Group by reshipper
    const shipperMap = new Map<string, typeof ordersWithHalfKits>();
    ordersWithHalfKits.forEach(o => {
      const key = o.reshipperUsername ?? "__direct__";
      if (!shipperMap.has(key)) shipperMap.set(key, []);
      shipperMap.get(key)!.push(o);
    });

    const reshippers = [...shipperMap.entries()]
      .map(([username, orders]) => ({
        username: username === "__direct__" ? null : username,
        orders: orders.map(o => {
          const items = halfKitsByOrder.get(o.id) ?? [];
          return {
            id: o.id,
            code: o.code,
            telegramUsername: o.telegramUsername,
            status: o.status,
            halfKitItems: items.map(li => ({
              productName: li.productName,
              quantity: Number(li.quantity),
            })),
            totalHalfKits: items.reduce((s, li) => s + Number(li.quantity), 0),
          };
        }),
        totalHalfKits: orders.reduce((s, o) =>
          s + (halfKitsByOrder.get(o.id) ?? [])
            .reduce((s2, li) => s2 + Number(li.quantity), 0), 0),
      }))
      .sort((a, b) => {
        if (!a.username) return 1;
        if (!b.username) return -1;
        return a.username.localeCompare(b.username);
      });

    res.json({ reshippers });
  } catch (e) {
    console.error("[dispatch half-kits]", e);
    res.status(500).json({ error: "Failed to load half-kit summary" });
  }
});

// ─── GET /admin/dispatch/:gbId/click-drop-csv ───────────────────────────────
// Exports selected orders as a Royal Mail Click & Drop compatible CSV.
// Query param: orderIds=id1,id2,...  (comma-separated)
// ─── helper: AI address parser ──────────────────────────────────────────────
type ParsedAddr = {
  line1: string; line2: string; city: string;
  postcode: string; country: string; phone: string; email: string;
};

/** Returns true when shippingAddress looks like an unstructured blob */
function addrNeedsAI(addr: string): boolean {
  const a = addr.toLowerCase();
  return (
    a.includes("united kingdom") ||
    a.includes("phone:") ||
    a.includes("email:") ||
    a.includes("self storage") ||
    a.length > 100
  );
}

/** Parse a naive clean address (number + street only) into line1/line2 */
function naiveSplit(addrRaw: string): { line1: string; line2: string } {
  const newlineIdx = addrRaw.indexOf("\n");
  if (newlineIdx !== -1) {
    return {
      line1: addrRaw.slice(0, newlineIdx).trim(),
      line2: addrRaw.slice(newlineIdx + 1).replace(/\n/g, " ").trim(),
    };
  }
  const commaIdx = addrRaw.indexOf(",");
  if (commaIdx !== -1) {
    return {
      line1: addrRaw.slice(0, commaIdx).trim(),
      line2: addrRaw.slice(commaIdx + 1).trim(),
    };
  }
  return { line1: addrRaw, line2: "" };
}

/**
 * Batch-parse messy address blobs using Gemini.
 * Returns a map of order ID → ParsedAddr.
 */
async function aiParseAddresses(
  orders: Array<{ id: string; shippingAddress: string | null }>
): Promise<Map<string, ParsedAddr>> {
  const result = new Map<string, ParsedAddr>();
  if (orders.length === 0) return result;

  try {
    const ai = new GoogleGenAI({});
    const input = orders.map(o => ({ id: o.id, raw: o.shippingAddress ?? "" }));

    const prompt = `You are a UK address parser. Parse each address blob into structured fields.
Return ONLY a valid JSON array — no markdown, no commentary.

Input (JSON array of {id, raw}):
${JSON.stringify(input)}

For each item return:
{"id":"...","line1":"...","line2":"...","city":"...","postcode":"...","country":"GB","phone":"...","email":"..."}

Rules:
- line1: house number + street name (e.g. "62 The Drive")
- line2: optional secondary line — flat/unit/building name; empty string if none
- city: town or city name only
- postcode: UK postcode (e.g. "TW7 4AD") — include space if possible
- country: 2-letter ISO code, default "GB"
- phone: digits + country code only, no "Phone:" label (e.g. "+44 7453 881963")
- email: email address only, no "Email:" label
- Use empty string "" for any field not found in the raw text`;

    const resp = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = (resp.text ?? "").replace(/```json\s*|```/g, "").trim();
    const parsed: ParsedAddr[] = JSON.parse(text);
    for (const p of parsed) {
      if (p && (p as any).id) result.set((p as any).id, p);
    }
  } catch (err) {
    console.error("[click-drop-csv] AI address parse failed:", err);
    // Proceed without AI — rows will fall back to naive split
  }

  return result;
}

router.get("/admin/dispatch/:gbId/click-drop-csv", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const rawIds = String(req.query.orderIds ?? "");
    if (!rawIds) { res.status(400).json({ error: "orderIds required" }); return; }
    const orderIds = rawIds.split(",").map(s => s.trim()).filter(Boolean);
    if (orderIds.length === 0) { res.status(400).json({ error: "orderIds required" }); return; }
    const serviceCode = String(req.query.serviceCode ?? "CRL24").trim() || "CRL24";
    const weightG = String(req.query.weightG ?? "500").trim() || "500";

    const orders = await db
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        shippingName: ordersTable.shippingName,
        shippingAddress: ordersTable.shippingAddress,
        shippingCity: ordersTable.shippingCity,
        shippingPostcode: ordersTable.shippingPostcode,
        shippingCountry: ordersTable.shippingCountry,
        shippingPhone: ordersTable.shippingPhone,
        shippingEmail: ordersTable.shippingEmail,
        grandTotal: ordersTable.grandTotal,
        deliveryMethod: ordersTable.deliveryMethod,
      })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.groupBuyId, gbId),
        inArray(ordersTable.id, orderIds),
      ));

    // Identify orders whose shippingAddress blob needs AI parsing
    // (structured city/postcode fields missing OR blob looks like a free-text dump)
    const needsAI = orders.filter(o => {
      const addr = (o.shippingAddress ?? "").trim();
      if (!addr) return false;
      const missingStructured = !o.shippingCity || !o.shippingPostcode;
      return missingStructured || addrNeedsAI(addr);
    });

    const aiMap = await aiParseAddresses(needsAI);

    // Royal Mail Click & Drop official template column order
    // (matches "Example Upload file with full mappings" template exactly)
    const cols = [
      "Order Reference",
      "Special Instructions",
      "Date",
      "Weight",
      "Format",
      "Sub Total",
      "Shipping Cost",
      "Total",
      "Currency Code",
      "Service Code",
      "Safe Place",
      "Address Book reference",
      "Title",
      "First Name",
      "Last Name",
      "Full Name",
      "Phone",
      "Email",
      "Company Name",
      "Address line 1",
      "Address line 2",
      "Address Line 3",
      "City",
      "County",
      "Postcode",
      "Country",
      "Product SKU",
      "Product Name",
      "Product Price",
      "Product Quantity",
      "Product Weight",
      "Product Harmonised System Code",
      "Product Stock Location",
    ];

    const csvEscape = (v: string | null | undefined): string => {
      const s = (v ?? "").replace(/[\r\n]+/g, " ").trim();
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // Weight query param is in grams; Click & Drop expects kg
    const weightKg = (parseFloat(weightG) / 1000).toFixed(3);

    const rows = orders.map(o => {
      const addrRaw = (o.shippingAddress ?? "").trim();
      let addr1 = "", addr2 = "";

      const ai = aiMap.get(o.id);
      if (ai) {
        addr1 = ai.line1;
        addr2 = ai.line2;
      } else {
        const split = naiveSplit(addrRaw);
        addr1 = split.line1;
        addr2 = split.line2;
      }

      // DB structured fields win; AI fills gaps
      const city     = o.shippingCity     || ai?.city     || "";
      const postcode = o.shippingPostcode || ai?.postcode || "";
      const country  = o.shippingCountry  || ai?.country  || "GB";
      const phone    = o.shippingPhone    || ai?.phone    || "";
      const email    = o.shippingEmail    || ai?.email    || "";

      // Split full name into first / last for Click & Drop name fields
      const fullName = (o.shippingName ?? "").trim();
      const spaceIdx = fullName.indexOf(" ");
      const firstName = spaceIdx !== -1 ? fullName.slice(0, spaceIdx) : fullName;
      const lastName  = spaceIdx !== -1 ? fullName.slice(spaceIdx + 1) : "";

      const ref = o.code ? `@${o.code}` : o.id.slice(0, 8);

      return [
        csvEscape(ref),         // Order Reference
        "",                     // Special Instructions
        "",                     // Date
        weightKg,               // Weight (kg)
        "Parcel",               // Format
        "",                     // Sub Total
        "",                     // Shipping Cost
        "",                     // Total
        "",                     // Currency Code
        serviceCode,            // Service Code
        "",                     // Safe Place
        "",                     // Address Book reference
        "",                     // Title
        csvEscape(firstName),   // First Name
        csvEscape(lastName),    // Last Name
        csvEscape(fullName),    // Full Name
        csvEscape(phone),       // Phone
        csvEscape(email),       // Email
        "",                     // Company Name
        csvEscape(addr1),       // Address line 1
        csvEscape(addr2),       // Address line 2
        "",                     // Address Line 3
        csvEscape(city),        // City
        "",                     // County
        csvEscape(postcode),    // Postcode
        csvEscape(country),     // Country
        "",                     // Product SKU
        "",                     // Product Name
        "",                     // Product Price
        "",                     // Product Quantity
        "",                     // Product Weight
        "",                     // Product Harmonised System Code
        "",                     // Product Stock Location
      ].join(",");
    });

    const csv = [cols.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="click-drop-${gbId}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (e) {
    console.error("[dispatch click-drop-csv]", e);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
});

// ─── GET /admin/dispatch/:gbId/gb-info ──────────────────────────────────────
// Returns lightweight GB info needed by the Dispatched Orders tab.
router.get("/admin/dispatch/:gbId/gb-info", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const [gb] = await db
      .select({
        id: groupBuysTable.id,
        name: groupBuysTable.name,
        qrUploadInpostEnabled: groupBuysTable.qrUploadInpostEnabled,
        qrUploadRoyalMailEnabled: groupBuysTable.qrUploadRoyalMailEnabled,
        qrUploadMessage: groupBuysTable.qrUploadMessage,
        qrUploadCouriers: groupBuysTable.qrUploadCouriers,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));

    if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

    // Derive effective QR courier list (same logic as customer-facing routes)
    let qrCouriers: string[] = [];
    if (gb.qrUploadCouriers && (gb.qrUploadCouriers as string[]).length > 0) {
      qrCouriers = gb.qrUploadCouriers as string[];
    } else {
      if (gb.qrUploadInpostEnabled) qrCouriers.push("InPost");
      if (gb.qrUploadRoyalMailEnabled) qrCouriers.push("Royal Mail");
    }

    res.json({
      id: gb.id,
      name: gb.name,
      qrCouriers,
      qrUploadMessage: gb.qrUploadMessage ?? null,
    });
  } catch (e) {
    console.error("[dispatch gb-info]", e);
    res.status(500).json({ error: "Failed to load GB info" });
  }
});

// ─── POST /admin/dispatch/:gbId/notify-qr ───────────────────────────────────
// Sends a Telegram QR-upload reminder to the selected orders' customers.
// Body: { orderIds: string[], customMessage?: string }
router.post("/admin/dispatch/:gbId/notify-qr", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const { orderIds, customMessage } = req.body as {
      orderIds: string[];
      customMessage?: string;
    };

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: "orderIds required" }); return;
    }

    // Load GB name for the message
    const [gb] = await db
      .select({ name: groupBuysTable.name, qrUploadMessage: groupBuysTable.qrUploadMessage })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));

    const gbName = gb?.name ?? "your group buy";
    const appUrl = process.env["PUBLIC_URL"] ?? "https://saltandpeps.co.uk";

    // Load orders to get telegram usernames and codes
    const orders = await db.select({
      id: ordersTable.id,
      telegramUsername: ordersTable.telegramUsername,
      code: ordersTable.code,
    }).from(ordersTable).where(inArray(ordersTable.id, orderIds));

    type NotifyResult = { orderId: string; username: string; status: "sent" | "failed" | "no_account" | "no_chat_id" };
    const results: NotifyResult[] = [];
    let sent = 0, failed = 0, skipped = 0;

    for (const order of orders) {
      const bare = order.telegramUsername.replace(/^@/, "").toLowerCase();
      const code = order.code ?? order.id.slice(0, 8);

      try {
        // notifyUserFromTemplate looks up the account's chatId internally
        await notifyUserFromTemplate(bare, "status", "customer_qr_upload_reminder", {
          code,
          username: bare,
          gb_name: gbName,
          app_url: appUrl,
          ...(customMessage?.trim() ? { extra: customMessage.trim() } : {}),
        });
        results.push({ orderId: order.id, username: order.telegramUsername, status: "sent" });
        sent++;
      } catch {
        results.push({ orderId: order.id, username: order.telegramUsername, status: "failed" });
        failed++;
      }
    }

    res.json({ ok: true, sent, failed, skipped, results });
  } catch (e) {
    console.error("[dispatch notify-qr]", e);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

// ─── POST /admin/dispatch/:gbId/ocr-image ───────────────────────────────────
// Runs Gemini Vision OCR on an uploaded image and returns extracted order data
// + the best matching order from this GB. Does NOT save anything yet.
// Body: { imageData: string (base64 data URL), filename: string }
router.post("/admin/dispatch/:gbId/ocr-image", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const { imageData, filename } = req.body as { imageData: string; filename: string };

    if (!imageData || !imageData.startsWith("data:image/")) {
      res.status(400).json({ error: "imageData must be a base64 data URL (image/jpeg or image/png)" });
      return;
    }

    // Strip data URL prefix to get raw base64 + mime
    const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) { res.status(400).json({ error: "Invalid image data URL format" }); return; }
    const [, mimeType, base64Data] = match;

    // Run Gemini OCR
    const geminiClient = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
    });

    const prompt = `You are reading a dispatch packing slip photo from an online peptide store called Peps Anonymous (saltandpeps.co.uk).

The slip layout is:
1. TOP LINE (large, bold): The ORDER CODE displayed as @NUMBER — e.g. "@10170" or "@9823". This is the ORDER CODE (a number), NOT a Telegram username, even though it starts with @.
2. SECOND LINE (smaller, grey): The customer's Telegram username — e.g. "@oliviao187". This is the real Telegram handle.
3. ITEMS: product name × quantity lines.
4. "Total Kits — N" line.
5. Shipping method line.
6. Name and address block at the bottom.

Extract these fields and return ONLY a JSON object (no markdown, no explanation):
{
  "orderCode": "<the number from the large @NUMBER at the top — e.g. if it says @10170, return 10170>",
  "telegramUsername": "<the smaller Telegram username from the second line, without the @ prefix — e.g. oliviao187>",
  "memberName": "<customer full name from the address block if visible, else null>",
  "notes": "<any other identifying text that might help match the order, else null>"
}

Rules:
- orderCode: Extract only the NUMBER from the large bold @NUMBER at the very top of the slip. Do NOT include the @ sign. Return null if not found.
- telegramUsername: The smaller @handle below the order code. Return null if not found. Do NOT confuse this with the order code.
- If only one @handle is visible and it appears to be a number (e.g. @10170), treat it as the orderCode, not a telegramUsername.
- Return null for any field you cannot find.`;

    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp", data: base64Data } },
        ],
      }],
      config: { temperature: 0.1, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
    });

    const raw = (response.text ?? "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let ocrResult: { orderCode?: string | null; telegramUsername?: string | null; memberName?: string | null; notes?: string | null } = {};
    try { ocrResult = JSON.parse(cleaned); } catch { /* OCR returned garbage — proceed with empty */ }

    const extractedCode = (ocrResult.orderCode != null ? String(ocrResult.orderCode) : "").replace(/^[@#]/, "").trim() || null;
    const extractedUsername = (ocrResult.telegramUsername ?? "").replace(/^@/, "").toLowerCase().trim() || null;

    console.log("[dispatch ocr-image] extracted:", { extractedCode, extractedUsername, memberName: ocrResult.memberName, notes: ocrResult.notes, raw: cleaned.slice(0, 200) });

    // Find matching order in this GB
    const gbOrders = await db.select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      shippingName: ordersTable.shippingName,
      status: ordersTable.status,
    }).from(ordersTable).where(eq(ordersTable.groupBuyId, gbId));

    let matchedOrder: typeof gbOrders[0] | null = null;
    let matchConfidence: "high" | "medium" | "low" = "low";

    // Try code match first (most reliable)
    if (extractedCode) {
      const byCode = gbOrders.find(o => o.code === extractedCode);
      if (byCode) { matchedOrder = byCode; matchConfidence = "high"; }
    }
    // Fall back to username match
    if (!matchedOrder && extractedUsername) {
      const byUser = gbOrders.find(o =>
        o.telegramUsername.replace(/^@/, "").toLowerCase() === extractedUsername
      );
      if (byUser) { matchedOrder = byUser; matchConfidence = "medium"; }
    }
    // Fall back to name match
    if (!matchedOrder && ocrResult.memberName) {
      const nameLower = ocrResult.memberName.toLowerCase();
      const byName = gbOrders.find(o =>
        (o.shippingName ?? "").toLowerCase().includes(nameLower) ||
        nameLower.includes((o.shippingName ?? "").toLowerCase())
      );
      if (byName) { matchedOrder = byName; matchConfidence = "low"; }
    }

    res.json({
      ocr: {
        orderCode: extractedCode,
        telegramUsername: extractedUsername ? `@${extractedUsername}` : null,
        memberName: ocrResult.memberName ?? null,
        notes: ocrResult.notes ?? null,
      },
      match: matchedOrder ? {
        orderId: matchedOrder.id,
        orderCode: matchedOrder.code,
        telegramUsername: matchedOrder.telegramUsername,
        shippingName: matchedOrder.shippingName,
        status: matchedOrder.status,
        confidence: matchConfidence,
      } : null,
    });
  } catch (e) {
    console.error("[dispatch ocr-image]", e);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// ─── POST /admin/dispatch/:gbId/save-dispatch-image ─────────────────────────
// Saves a confirmed dispatch image to an order.
// Body: { orderId, imageData, filename, ocrOrderCode?, ocrUsername? }
router.post("/admin/dispatch/:gbId/save-dispatch-image", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { orderId, imageData, filename, ocrOrderCode, ocrUsername } = req.body as {
      orderId: string;
      imageData: string;
      filename: string;
      ocrOrderCode?: string;
      ocrUsername?: string;
    };

    if (!orderId || !imageData || !filename) {
      res.status(400).json({ error: "orderId, imageData, and filename are required" }); return;
    }

    const imageId = randomUUID();
    await db.insert(orderDispatchImagesTable).values({
      id: imageId,
      orderId,
      imageData,
      filename: filename || "dispatch.jpg",
      uploadedAt: new Date(),
      ocrOrderCode: ocrOrderCode ?? null,
      ocrUsername: ocrUsername ?? null,
    });

    res.json({ ok: true, imageId });
  } catch (e) {
    console.error("[dispatch save-dispatch-image]", e);
    res.status(500).json({ error: "Failed to save dispatch image" });
  }
});

// ─── GET /admin/dispatch/images/:imageId ────────────────────────────────────
// Lazy-loads a single dispatch image's data (base64). Admin only.
router.get("/admin/dispatch/images/:imageId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [img] = await db.select().from(orderDispatchImagesTable)
      .where(eq(orderDispatchImagesTable.id, req.params.imageId));
    if (!img) { res.status(404).json({ error: "Image not found" }); return; }
    res.json({ imageData: img.imageData, filename: img.filename });
  } catch (e) {
    console.error("[dispatch fetch-image]", e);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// ─── DELETE /admin/dispatch/images/:imageId ──────────────────────────────────
router.delete("/admin/dispatch/images/:imageId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.delete(orderDispatchImagesTable).where(eq(orderDispatchImagesTable.id, req.params.imageId));
    res.json({ ok: true });
  } catch (e) {
    console.error("[dispatch delete-image]", e);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// ─── GET /admin/orders/:orderId/dispatch-images ──────────────────────────────
// Returns metadata list for all dispatch images on an order (no image data).
router.get("/admin/orders/:orderId/dispatch-images", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const imgs = await db.select({
      id: orderDispatchImagesTable.id,
      orderId: orderDispatchImagesTable.orderId,
      filename: orderDispatchImagesTable.filename,
      uploadedAt: orderDispatchImagesTable.uploadedAt,
      ocrOrderCode: orderDispatchImagesTable.ocrOrderCode,
      ocrUsername: orderDispatchImagesTable.ocrUsername,
    }).from(orderDispatchImagesTable)
      .where(eq(orderDispatchImagesTable.orderId, req.params.orderId));
    res.json(imgs);
  } catch (e) {
    console.error("[dispatch list-images]", e);
    res.status(500).json({ error: "Failed to list images" });
  }
});

// ─── helpers ───────────────────────────────────────────────────────────────
type LineItemRow = typeof orderLineItemsTable.$inferSelect;
type OrderRow = typeof ordersTable.$inferSelect;

function formatOrder(order: OrderRow, lineItems: LineItemRow[]) {
  return {
    id: order.id,
    code: order.code,
    telegramUsername: order.telegramUsername,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    shippingName: order.shippingName,
    shippingAddress: order.shippingAddress,
    shippingCity: order.shippingCity,
    shippingPostcode: order.shippingPostcode,
    shippingCountry: order.shippingCountry,
    reshipperUsername: order.reshipperUsername,
    routingType: order.routingType,
    lineItems: lineItems.map(li => ({
      productName: li.productName,
      quantity: Number(li.quantity),
    })),
  };
}

// ─── GET /admin/dispatch/:gbId/dispatch-images-map ──────────────────────────
// Returns a map of orderId → [{id, filename}] for all dispatch images in the GB.
router.get("/admin/dispatch/:gbId/dispatch-images-map", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { gbId } = req.params;
    const imgs = await db.select({
      id: orderDispatchImagesTable.id,
      orderId: orderDispatchImagesTable.orderId,
      filename: orderDispatchImagesTable.filename,
    }).from(orderDispatchImagesTable)
      .innerJoin(ordersTable, eq(orderDispatchImagesTable.orderId, ordersTable.id))
      .where(eq(ordersTable.groupBuyId, gbId));
    const map: Record<string, { id: string; filename: string }[]> = {};
    for (const img of imgs) {
      if (!map[img.orderId]) map[img.orderId] = [];
      map[img.orderId].push({ id: img.id, filename: img.filename });
    }
    res.json(map);
  } catch (e) {
    console.error("[dispatch-images-map]", e);
    res.status(500).json({ error: "Failed to load dispatch images map" });
  }
});

// ── POST /admin/dispatch/:gbId/archive-orders ──────────────────────────────
// Moves selected dispatched orders in/out of the archive view (sets/clears dispatchArchivedAt).
router.post("/admin/dispatch/:gbId/archive-orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params as { gbId: string };
  const { orderIds, archive = true } = req.body as { orderIds: string[]; archive?: boolean };
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    res.status(400).json({ error: "orderIds required" }); return;
  }
  try {
    await db.update(ordersTable)
      .set({ dispatchArchivedAt: archive ? new Date() : null })
      .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.id, orderIds)));
    res.json({ ok: true, updated: orderIds.length, archived: archive });
  } catch (e) {
    console.error("[dispatch archive-orders]", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
