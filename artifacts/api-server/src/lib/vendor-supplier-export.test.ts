import { describe, expect, it } from "vitest";
import { supplierTextDetails, vendorSupplierText } from "./vendor-supplier-export";

const shipment = (reference: string) => ({
  reference, vendorId: "supplier", exportUsername: "@example", exportPackageLine: "Package: 1 x $61.00 = $61.00",
  snapshot: {
    currency: "USD" as const,
    items: [{ productName: "Retatrutide 30mg", quantity: 2, unitCost: "115.00", lineTotal: "230.00" }],
    productCost: "230.00", shippingCost: "61.00", totalCost: "291.00",
    shipping: { name: "Example Recipient", address: "17 Example Road,\nExample Town,\nAB1 2CD", country: "United Kingdom", phone: "01234567890", email: "private@example.invalid" },
  },
});

describe("FS3 supplier TXT format", () => {
  it("matches the requested numbered format without vendor lines or email addresses", () => {
    const block = (code: string, number: number) => `Order no. ${code} (@example)
New Order ${number}:

Retatrutide 30mg x2 = $230.00

Total QTY: 2
Total: $230.00
Package: 1 x $61.00 = $61.00
Grand Total: $291.00

Address:
Example Recipient
17 Example Road
Example Town
AB1 2CD
United Kingdom
Phone: 01234567890`;
    const text = vendorSupplierText([shipment("12577"), shipment("12565")], "Supplier");
    expect(text).toBe(`${block("12577", 1)}\n\n--------------------------------\n\n${block("12565", 2)}\n\n================================\n\nGrand total for all orders = Order 1 $291.00 + Order 2 $291.00 = $582.00`);
    expect(text).not.toContain("private@example.invalid");
    expect(text).not.toContain("Email:");
    expect(text).not.toContain("Vendor:");
  });
  it("starts numbering at one for each separate download", () => {
    expect(vendorSupplierText([shipment("12565")], "Supplier")).toContain("New Order 1:");
  });
  it("shows actual single, multiple and mixed-rate package breakdowns", () => {
    const vendor = { id: "supplier", name: "Supplier", tiers: ["1-5", "6-25"], tierBounds: [5, 25], maxKitsPerPackage: 25,
      regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50, 70] }] };
    const base = shipment("10001").snapshot;
    const details = (quantity: number, shippingCost: string) => supplierTextDetails("@example",
      { ...base, shippingCost, items: [{ ...base.items[0], quantity }] }, vendor);
    expect(details(5, "50.00").exportPackageLine).toBe("Package: 1 x $50.00 = $50.00");
    expect(details(36, "140.00").exportPackageLine).toBe("Package: 2 x $70.00 = $140.00");
    expect(details(26, "120.00").exportPackageLine).toBe("Package: $70.00 + $50.00 = $120.00");
    expect(details(36, "135.00").exportPackageLine).toBe("Package: $135.00");
  });
  it("sums the combined footer in exact cents", () => {
    const rows = [shipment("10001"), shipment("10002")];
    rows[0].snapshot.totalCost = "0.10"; rows[1].snapshot.totalCost = "0.20";
    expect(vendorSupplierText(rows, "Supplier")).toContain("Grand total for all orders = Order 1 $0.10 + Order 2 $0.20 = $0.30");
    expect(vendorSupplierText([], "Supplier")).toBe("");
  });
});
