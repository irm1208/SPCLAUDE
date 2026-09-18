export const INVOICE_CURRENCIES = ["GBP", "EUR", "USD"] as const;
export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;

export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

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
  showTax: boolean;
  subtotal: string;
  totalTax: string;
  total: string;
  createdAt?: string;
  updatedAt?: string;
}

export function calculateInvoiceTotals(invoice: Pick<InvoiceDocument, "lineItems" | "shippingCost"> & Pick<InvoiceDocument, "showTax">) {
  let subtotalCents = 0;
  let taxCents = 0;
  for (const item of invoice.lineItems) {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPriceCents = Math.max(0, Math.round((Number(item.unitPrice) || 0) * 100));
    const discount = Math.min(100, Math.max(0, Number(item.discount) || 0));
    const taxRate = Math.min(100, Math.max(0, Number(item.taxRate) || 0));
    const netCents = Math.round(quantity * unitPriceCents * (1 - discount / 100));
    subtotalCents += netCents;
    if (invoice.showTax) taxCents += Math.round(netCents * taxRate / 100);
  }
  const shippingCents = Math.max(0, Math.round((Number(invoice.shippingCost) || 0) * 100));
  return {
    subtotal: (subtotalCents / 100).toFixed(2),
    totalTax: (taxCents / 100).toFixed(2),
    total: ((subtotalCents + taxCents + shippingCents) / 100).toFixed(2),
  };
}

export function formatInvoiceMoney(value: string, currency: InvoiceCurrency) {
  const locale = currency === "EUR" ? "de-DE" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value) || 0);
}
