import { describe, expect, it, vi } from "vitest";

vi.mock("sharp", () => {
  throw new Error("sharp native runtime unavailable");
});

describe("invoice PDF startup isolation", () => {
  it("loads the API module and renders a text-logo PDF when sharp is unavailable", async () => {
    const { buildInvoicePdf } = await import("./invoice-pdf");

    const pdf = await buildInvoicePdf({
      orderId: "order-1",
      invoiceNumber: "INV-STARTUP",
      issueDate: "2026-09-19",
      dueDate: null,
      currency: "GBP",
      status: "draft",
      seller: { name: "Salt & Peps", addressLines: [], email: "" },
      customer: { name: "Test Buyer", addressLines: [], email: "" },
      lineItems: [{
        id: "item-1",
        description: "Example item",
        quantity: "1",
        unitPrice: "10",
        taxRate: "0",
        discount: "0",
      }],
      notes: "",
      terms: "",
      shippingCost: "0",
      subtotal: "10.00",
      totalTax: "0.00",
      total: "10.00",
      showTax: true,
    });

    expect(pdf.subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("INV-STARTUP");
    expect(pdf.toString("latin1")).not.toContain("/Im1 Do");
  });
});