import { Router } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupBuysTable, orderInvoicesTable, orderLineItemsTable, ordersTable } from "@workspace/db";
import { assertNoActiveRefund } from "../lib/refund-mutation-guard";
import {
  calculateInvoiceTotals,
  calculateInvoiceLineItemTotal,
  invoiceDocumentSchema,
  invoiceCurrencyForGroupBuy,
  seedInvoiceFromOrder,
  type InvoiceDocument,
} from "../lib/invoice";
import { buildInvoicePdf } from "../lib/invoice-pdf";
import { requireAdmin } from "../middleware/require-admin";

const router = Router();

function asDocument(row: typeof orderInvoicesTable.$inferSelect): InvoiceDocument {
  return {
    orderId: row.orderId,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency as InvoiceDocument["currency"],
    status: row.status as InvoiceDocument["status"],
    seller: row.seller as InvoiceDocument["seller"],
    customer: row.customer as InvoiceDocument["customer"],
    lineItems: row.lineItems as InvoiceDocument["lineItems"],
    notes: row.notes,
    terms: row.terms,
    shippingCost: String(row.shippingCost),
    subtotal: String(row.subtotal),
    totalTax: String(row.totalTax),
    total: String(row.total),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadOrSeedInvoice(orderId: string): Promise<InvoiceDocument | null> {
  const [existing] = await db.select().from(orderInvoicesTable).where(eq(orderInvoicesTable.orderId, orderId));
  if (existing) return asDocument(existing);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
  const seeded = seedInvoiceFromOrder(order, items);
  if (order.groupBuyId) {
    const [groupBuy] = await db.select({ currency: groupBuysTable.currency }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
    if (groupBuy?.currency) seeded.currency = invoiceCurrencyForGroupBuy(groupBuy.currency);
  }
  const [created] = await db.insert(orderInvoicesTable).values({
    orderId: seeded.orderId,
    invoiceNumber: seeded.invoiceNumber,
    issueDate: seeded.issueDate,
    dueDate: seeded.dueDate,
    currency: seeded.currency,
    status: seeded.status,
    seller: seeded.seller,
    customer: seeded.customer,
    lineItems: seeded.lineItems,
    notes: seeded.notes,
    terms: seeded.terms,
    shippingCost: seeded.shippingCost,
    subtotal: seeded.subtotal,
    totalTax: seeded.totalTax,
    total: seeded.total,
  }).returning();
  return created ? asDocument(created) : seeded;
}

router.get("/admin/orders/:id/invoice", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const invoice = await loadOrSeedInvoice(req.params.id);
    if (!invoice) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(invoice);
  } catch (error) {
    console.error("[admin] invoice load failed", error);
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

router.put("/admin/orders/:id/invoice", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const parsed = invoiceDocumentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid invoice" }); return; }
  try {
    const invoice = parsed.data;
    const totals = calculateInvoiceTotals(invoice);
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
      if (!order) return null;
      await assertNoActiveRefund(tx, req.params.id);
      const [saved] = await tx.insert(orderInvoicesTable).values({
        orderId: req.params.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate ?? null,
        currency: invoice.currency,
        status: invoice.status,
        seller: invoice.seller,
        customer: invoice.customer,
        lineItems: invoice.lineItems,
        notes: invoice.notes,
        terms: invoice.terms,
        shippingCost: invoice.shippingCost,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        total: totals.total,
      }).onConflictDoUpdate({
        target: orderInvoicesTable.orderId,
        set: {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate ?? null,
          currency: invoice.currency,
          status: invoice.status,
          seller: invoice.seller,
          customer: invoice.customer,
          lineItems: invoice.lineItems,
          notes: invoice.notes,
          terms: invoice.terms,
          shippingCost: invoice.shippingCost,
          subtotal: totals.subtotal,
          totalTax: totals.totalTax,
          total: totals.total,
          updatedAt: new Date(),
        },
      }).returning();
      await tx.delete(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, req.params.id));
      await tx.insert(orderLineItemsTable).values(invoice.lineItems.map((item) => ({
        id: randomUUID(), orderId: req.params.id, productId: "", productName: item.description,
        quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: calculateInvoiceLineItemTotal(item),
      })));
      await tx.update(ordersTable).set({
        productSubtotal: totals.subtotal,
        grandTotal: totals.total,
        deliveryPrice: invoice.shippingCost,
        vendorShipping: "0.00",
        notes: invoice.notes || null,
      }).where(and(eq(ordersTable.id, req.params.id)));
      return saved ? { ...asDocument(saved), ...totals, orderId: req.params.id } : null;
    });
    if (!result) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save invoice";
    const status = /refund/i.test(message) ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

router.get("/admin/orders/:id/invoice-pdf", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const invoice = await loadOrSeedInvoice(req.params.id);
    if (!invoice) { res.status(404).json({ error: "Order not found" }); return; }
    const filename = invoice.invoiceNumber.replace(/[^a-z0-9._-]+/gi, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${filename}.pdf"`);
    res.send(buildInvoicePdf(invoice));
  } catch (error) {
    console.error("[admin] invoice PDF failed", error);
    res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
});

export default router;
