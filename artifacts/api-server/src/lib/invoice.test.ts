import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals, formatInvoiceMoney } from "./invoice";
import { buildInvoicePdf } from "./invoice-pdf";

describe("invoice calculations", () => {
  it("calculates discounted line subtotal, tax, shipping, and total in cents", () => {
    const totals = calculateInvoiceTotals({
      currency: "GBP",
      shippingCost: "3.25",
      lineItems: [
        {
          id: "line-1",
          description: "Research peptide",
          quantity: "2",
          unitPrice: "12.50",
          taxRate: "20",
          discount: "5",
        },
      ],
    });

    expect(totals).toEqual({
      subtotal: "23.75",
      totalTax: "4.75",
      total: "31.75",
    });
  });

  it("formats supported currencies with the requested locale", () => {
    expect(formatInvoiceMoney("1234.5", "GBP")).toContain("1,234.50");
    expect(formatInvoiceMoney("1234.5", "EUR")).toContain("1.234,50");
    expect(formatInvoiceMoney("1234.5", "USD")).toContain("1,234.50");
  });

  it("rejects negative invoice values", () => {
    expect(() => calculateInvoiceTotals({
      currency: "USD",
      shippingCost: "0",
      lineItems: [{
        id: "line-1",
        description: "Invalid",
        quantity: "-1",
        unitPrice: "2",
        taxRate: "0",
        discount: "0",
      }],
    })).toThrow("quantity");
  });

  it("renders an A4 PDF with the invoice number and total", () => {
    const pdf = buildInvoicePdf({
      orderId: "order-1", invoiceNumber: "INV-100", issueDate: "2026-09-15", dueDate: null,
      currency: "GBP", status: "draft", seller: { name: "Salt & Peps", addressLines: [], email: "" },
      customer: { name: "Ada Buyer", addressLines: ["1 Example Road"], email: "ada@example.test" },
      lineItems: [{ id: "item-1", description: "Example item", quantity: "1", unitPrice: "10", taxRate: "0", discount: "0" }],
      notes: "", terms: "", shippingCost: "2.50", subtotal: "10.00", totalTax: "0.00", total: "12.50",
    });

    expect(pdf.subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("INV-100");
    expect(pdf.toString("latin1")).toContain("12.50 GBP");
  });
});
