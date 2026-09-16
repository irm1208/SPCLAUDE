import { z } from "zod";

export const invoiceCurrencies = ["GBP", "EUR", "USD"] as const;
export const invoiceStatuses = ["draft", "sent", "paid", "void"] as const;

export type InvoiceCurrency = (typeof invoiceCurrencies)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export interface InvoiceParty {
  name: string;
  addressLines: string[];
  email: string;
  phone?: string;
  taxId?: string;
  logoUrl?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}

export interface InvoiceDocument {
  orderId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: InvoiceCurrency;
  status: InvoiceStatus;
  seller: InvoiceParty;
  customer: InvoiceParty;
  lineItems: InvoiceLineItem[];
  notes: string;
  terms: string;
  shippingCost: string;
  subtotal: string;
  totalTax: string;
  total: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceTotals {
  subtotal: string;
  totalTax: string;
  total: string;
}

const partySchema = z.object({
  name: z.string().trim().max(200),
  addressLines: z.array(z.string().trim().max(200)).max(8),
  email: z.string().trim().max(200),
  phone: z.string().trim().max(80).optional().default(""),
  taxId: z.string().trim().max(80).optional().default(""),
  logoUrl: z.string().trim().max(500).optional().default(""),
});

export const invoiceLineItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(200),
  quantity: z.string().trim().min(1).max(30),
  unitPrice: z.string().trim().min(1).max(30),
  taxRate: z.string().trim().min(1).max(30),
  discount: z.string().trim().min(1).max(30),
});

export const invoiceDocumentSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(100),
  issueDate: z.string().trim().min(1).max(40),
  dueDate: z.string().trim().max(40).nullable().optional().default(null),
  currency: z.enum(invoiceCurrencies),
  status: z.enum(invoiceStatuses),
  seller: partySchema,
  customer: partySchema,
  lineItems: z.array(invoiceLineItemSchema).min(1).max(50),
  notes: z.string().max(2000).default(""),
  terms: z.string().max(2000).default(""),
  shippingCost: z.string().trim().min(1).max(30),
});

function decimalToCents(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${field} must be non-negative`);
  return Math.round(parsed * 100);
}

function decimalToNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${field} must be non-negative`);
  return parsed;
}

function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function calculateInvoiceLineItemTotal(item: Pick<InvoiceLineItem, "quantity" | "unitPrice" | "discount">): string {
  const quantity = decimalToNumber(item.quantity, "quantity");
  if (quantity <= 0) throw new Error("quantity must be greater than zero");
  const unitPriceCents = decimalToCents(item.unitPrice, "unitPrice");
  const discount = decimalToNumber(item.discount, "discount");
  if (discount > 100) throw new Error("discount must be at most 100");
  return centsToDecimal(Math.round(quantity * unitPriceCents * (1 - discount / 100)));
}

export function calculateInvoiceTotals(input: Pick<InvoiceDocument, "lineItems" | "shippingCost" | "currency">): InvoiceTotals {
  let subtotalCents = 0;
  let taxCents = 0;
  for (const item of input.lineItems) {
    const quantity = decimalToNumber(item.quantity, "quantity");
    if (quantity <= 0) throw new Error("quantity must be greater than zero");
    const unitPriceCents = decimalToCents(item.unitPrice, "unitPrice");
    const taxRate = decimalToNumber(item.taxRate, "taxRate");
    const discount = decimalToNumber(item.discount, "discount");
    if (taxRate > 100) throw new Error("taxRate must be at most 100");
    if (discount > 100) throw new Error("discount must be at most 100");
    const grossCents = Math.round(quantity * unitPriceCents);
    const netCents = Math.round(grossCents * (1 - discount / 100));
    subtotalCents += netCents;
    taxCents += Math.round(netCents * (taxRate / 100));
  }
  const shippingCents = decimalToCents(input.shippingCost, "shippingCost");
  return {
    subtotal: centsToDecimal(subtotalCents),
    totalTax: centsToDecimal(taxCents),
    total: centsToDecimal(subtotalCents + taxCents + shippingCents),
  };
}

export function formatInvoiceMoney(value: string, currency: InvoiceCurrency): string {
  const locale = currency === "EUR" ? "de-DE" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value));
}

export function seedInvoiceFromOrder(order: {
  id: string;
  code: string;
  createdAt: Date;
  shippingName?: string | null;
  shippingEmail?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  telegramUsername?: string | null;
  notes?: string | null;
  deliveryPrice?: string | number | null;
  vendorShipping?: string | number | null;
  grandTotal?: string | number | null;
}, lineItems: Array<{ id: string; productName: string; quantity: string | number; unitPrice: string | number }>): InvoiceDocument {
  const items: InvoiceLineItem[] = lineItems.map((item) => ({
    id: item.id,
    description: item.productName,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    taxRate: "0",
    discount: "0",
  }));
  const shippingCost = (Number(order.deliveryPrice ?? 0) + Number(order.vendorShipping ?? 0)).toFixed(2);
  const totals = calculateInvoiceTotals({ currency: "GBP", shippingCost, lineItems: items });
  return {
    orderId: order.id,
    invoiceNumber: order.code,
    issueDate: order.createdAt.toISOString().slice(0, 10),
    dueDate: null,
    currency: "GBP",
    status: "draft",
    seller: { name: "Salt & Peps", addressLines: [], email: "", phone: "", taxId: "", logoUrl: "" },
    customer: {
      name: order.shippingName ?? order.telegramUsername ?? "Customer",
      addressLines: (order.shippingAddress ?? "").split("\n").filter(Boolean),
      email: order.shippingEmail ?? "",
      phone: order.shippingPhone ?? "",
    },
    lineItems: items,
    notes: order.notes ?? "",
    terms: "",
    shippingCost,
    ...totals,
  };
}
