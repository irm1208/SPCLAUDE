import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals, formatInvoiceMoney, invoiceCurrencyForGroupBuy } from "./invoice";
import { buildInvoicePdf } from "./invoice-pdf";

describe("invoice calculations", () => {
  it("maps stablecoin group-buy currencies to dollar invoices", () => {
    expect(invoiceCurrencyForGroupBuy("USDT")).toBe("USD");
    expect(invoiceCurrencyForGroupBuy("USDC")).toBe("USD");
    expect(invoiceCurrencyForGroupBuy("USD")).toBe("USD");
  });

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

  it("removes tax from totals when the invoice hides tax", () => {
    expect(calculateInvoiceTotals({
      currency: "GBP",
      shippingCost: "2.00",
      showTax: false,
      lineItems: [{ id: "line-1", description: "Item", quantity: "1", unitPrice: "10", taxRate: "20", discount: "0" }],
    })).toEqual({ subtotal: "10.00", totalTax: "0.00", total: "12.00" });
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

  it("renders an A4 PDF with the invoice number and total", async () => {
    const pdf = await buildInvoicePdf({
      orderId: "order-1", invoiceNumber: "INV-100", issueDate: "2026-09-15", dueDate: null,
      currency: "GBP", status: "draft", seller: { name: "Salt & Peps", addressLines: [], email: "" },
      customer: { name: "Ada Buyer", addressLines: ["1 Example Road"], email: "ada@example.test" },
      lineItems: [{ id: "item-1", description: "Example item", quantity: "1", unitPrice: "10", taxRate: "0", discount: "0" }],
      notes: "", terms: "", shippingCost: "2.50", subtotal: "10.00", totalTax: "0.00", total: "12.50", showTax: true,
    });

    expect(pdf.subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("INV-100");
    expect(pdf.toString("latin1")).toContain("12.50");
    expect(pdf.toString("latin1")).toContain("/Im1 Do");
  });

  it("omits tax labels and tax values when tax display is disabled", async () => {
    const pdf = await buildInvoicePdf({
      orderId: "order-1", invoiceNumber: "INV-101", issueDate: "2026-09-15", dueDate: null,
      currency: "GBP", status: "draft", seller: { name: "Seller", addressLines: [], email: "" },
      customer: { name: "Buyer", addressLines: [], email: "" },
      lineItems: [{ id: "item-1", description: "Example item", quantity: "1", unitPrice: "10", taxRate: "20", discount: "0" }],
      notes: "", terms: "", shippingCost: "0", subtotal: "10.00", totalTax: "2.00", total: "12.00", showTax: false,
    });

    expect(pdf.toString("latin1")).not.toContain("Tax");
    expect(pdf.toString("latin1")).not.toContain("20% tax");
  });

  it("matches the preview page geometry and keeps every description line", async () => {
    const description = [
      "A deliberately long invoice description that must wrap naturally rather than being clipped",
      "or limited to three lines because the browser preview displays the complete description",
      "including this final unmistakable sentence.",
    ].join(" ");
    const pdf = await buildInvoicePdf({
      orderId: "order-1", invoiceNumber: "INV-LAYOUT", issueDate: "2026-09-15", dueDate: "2026-09-30",
      currency: "GBP", status: "sent", seller: {
        name: "Salt & Peps", addressLines: ["Seller line one", "Seller line two"], email: "seller@example.test",
      },
      customer: { name: "Ada Buyer", addressLines: ["1 Example Road", "Example Town"], email: "ada@example.test" },
      lineItems: [{ id: "item-1", description, quantity: "2", unitPrice: "12.50", taxRate: "20", discount: "5" }],
      notes: "", terms: "", shippingCost: "2.50", subtotal: "23.75", totalTax: "4.75", total: "31.00", showTax: true,
    });
    const source = pdf.toString("latin1");

    // The preview is 620px wide with 40px padding: the equivalent A4 margin is 38.39pt.
    expect(source).toContain("38.39");
    expect(source).toContain("final unmistakable sentence.");
    expect(source).toContain("0.945 0.961 0.976 rg");
    expect(source).toContain("(SENT)");
  });
});
