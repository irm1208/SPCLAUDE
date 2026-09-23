import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupBuysTable, orderInvoicesTable, orderLineItemsTable, ordersTable } from "@workspace/db";
import { assertNoActiveRefund } from "./refund-mutation-guard";
import { z } from "zod";
import {
  calculateInvoiceTotals,
  invoiceDocumentSchema,
  invoiceCurrencyForGroupBuy,
  seedInvoiceFromOrder,
  type InvoiceDocument,
} from "./invoice";

export type InvoiceInput = z.infer<typeof invoiceDocumentSchema>;

function asDocument(row: typeof orderInvoicesTable.$inferSelect): InvoiceDocument {
  return {
    orderId: row.orderId,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency as InvoiceDocument["currency"],
    status: row.status as InvoiceDocument["status"],
    seller: row.seller as unknown as InvoiceDocument["seller"],
    customer: row.customer as unknown as InvoiceDocument["customer"],
    lineItems: row.lineItems as unknown as InvoiceDocument["lineItems"],
    notes: row.notes,
    terms: row.terms,
    shippingCost: String(row.shippingCost),
    showTax: row.showTax,
    subtotal: String(row.subtotal),
    totalTax: String(row.totalTax),
    total: String(row.total),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadOrSeedInvoice(orderId: string): Promise<InvoiceDocument | null> {
  const [existing] = await db.select().from(orderInvoicesTable).where(eq(orderInvoicesTable.orderId, orderId));
  if (existing) return asDocument(existing);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
  const seeded = seedInvoiceFromOrder(order, items);
  if (order.groupBuyId) {
    const [groupBuy] = await db
      .select({ currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    if (groupBuy?.currency) seeded.currency = invoiceCurrencyForGroupBuy(groupBuy.currency);
  }

  const [created] = await db.insert(orderInvoicesTable).values({
    orderId: seeded.orderId,
    invoiceNumber: seeded.invoiceNumber,
    issueDate: seeded.issueDate,
    dueDate: seeded.dueDate,
    currency: seeded.currency,
    status: seeded.status,
    seller: seeded.seller as unknown as Record<string, unknown>,
    customer: seeded.customer as unknown as Record<string, unknown>,
    lineItems: seeded.lineItems as unknown as Array<Record<string, string>>,
    notes: seeded.notes,
    terms: seeded.terms,
    shippingCost: seeded.shippingCost,
    showTax: seeded.showTax,
    subtotal: seeded.subtotal,
    totalTax: seeded.totalTax,
    total: seeded.total,
  }).returning();

  return created ? asDocument(created) : seeded;
}

export async function saveInvoice(orderId: string, invoice: InvoiceInput): Promise<InvoiceDocument | null> {
  const totals = calculateInvoiceTotals(invoice);
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return null;

    await assertNoActiveRefund(tx, orderId);

    const [saved] = await tx.insert(orderInvoicesTable).values({
      orderId,
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
      showTax: invoice.showTax,
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
        showTax: invoice.showTax,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        total: totals.total,
        updatedAt: new Date(),
      },
    }).returning();

    return saved ? { ...asDocument(saved), ...totals, orderId } : null;
  });
}

export function invoiceFilename(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^a-z0-9._-]+/gi, "-");
}