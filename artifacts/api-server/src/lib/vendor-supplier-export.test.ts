import { describe, expect, it } from "vitest";
import { vendorSupplierText } from "./vendor-supplier-export";

const shipment = (reference: string) => ({
  reference, vendorId: "supplier",
  snapshot: {
    currency: "USD" as const,
    items: [{ productName: "Retatrutide 30mg", quantity: 2, unitCost: "115.00", lineTotal: "230.00" }],
    productCost: "230.00", shippingCost: "61.00", totalCost: "291.00",
    shipping: { name: "Example Recipient", address: "17 Example Road,\nExample Town,\nAB1 2CD", country: "United Kingdom", phone: "01234567890", email: "private@example.invalid" },
  },
});

describe("FS3 supplier TXT format", () => {
  it("matches the requested numbered format without vendor lines or email addresses", () => {
    const block = (code: string, number: number) => `Order no. ${code}
New Order ${number}:

Retatrutide 30mg x2 = $230.00

Total QTY: 2
Total: $230.00
Package: $61.00
Grand Total: $291.00

Address:
Example Recipient
17 Example Road,
Example Town,
AB1 2CD
United Kingdom
Phone: 01234567890`;
    const text = vendorSupplierText([shipment("12577"), shipment("12565")], "Supplier");
    expect(text).toBe(`${block("12577", 1)}\n\n--------------------\n\n${block("12565", 2)}`);
    expect(text).not.toContain("private@example.invalid");
    expect(text).not.toContain("Email:");
    expect(text).not.toContain("Vendor:");
  });
  it("starts numbering at one for each separate download", () => {
    expect(vendorSupplierText([shipment("12565")], "Supplier")).toContain("New Order 1:");
  });
});
