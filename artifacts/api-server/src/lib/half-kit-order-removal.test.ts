import { describe, expect, it } from "vitest";
import { planHalfKitOrderEdit } from "./half-kit-order-edit-rules";

const half = { id: "reserved", productId: "ss50", productName: "SS-31 50mg",
  quantity: "0.50", unitPrice: "230", lineTotal: "115" };
const ordinary = { id: "ordinary", productId: "ss30", productName: "SS-31 30mg",
  quantity: "1.00", unitPrice: "155", lineTotal: "155" };
const other = { id: "other", productId: "mito", productName: "Mitoprime",
  quantity: "1.00", unitPrice: "110", lineTotal: "110" };
const order = { status: "Submitted", paymentStatus: "unpaid", productSubtotal: "380", grandTotal: "398",
  deliveryMethodId: "royal", tip: "0", testingContribution: "0", creditsApplied: 0, couponDiscount: "0" };
const input = { deliveryMethodId: "royal", lineItems: [
  { productId: "ss50", quantity: 0.5 }, { productId: "ss30", quantity: 0 }, { productId: "mito", quantity: 1 },
] };
const options = { allowUnpaidOrdinaryReductions: true };
const plan = (parent: any = order, body: any = input) =>
  planHalfKitOrderEdit(parent, [half, ordinary, other], [half.id], body, [], options);

describe("organiser removal of ordinary items alongside reserved halves", () => {
  it("removes SS-31 30mg for 155 without changing the reserved SS-31 50mg half", () => {
    const result = plan();
    expect(result.lines).toEqual([half, other]);
    expect(result.orderPatch).toMatchObject({ productSubtotal: "225.00", grandTotal: "243.00", paymentUsdAmount: null });
    expect(result.subtotalDelta).toBe(-155);
  });
  it("allows decreasing an ordinary quantity at its saved price", () => {
    const result = plan(order, { ...input, lineItems: input.lineItems.map(line =>
      line.productId === "ss30" ? { ...line, quantity: 0.5 } : line) });
    expect(result.orderPatch.grandTotal).toBe("320.50");
    expect(result.lines.find(line => line.id === ordinary.id)?.lineTotal).toBe("77.50");
  });
  it("still refuses removing or resizing the reserved half", () => {
    for (const quantity of [0, 1]) expect(() => plan(order, { ...input,
      lineItems: input.lineItems.map(line => line.productId === "ss50" ? { ...line, quantity } : line),
    })).toThrow(/reserved half-kit quantities/i);
  });
  it("does not permit reductions of paid, credited or discounted orders", () => {
    for (const change of [{ paymentStatus: "confirmed" }, { creditsApplied: 10 }, { couponDiscount: "5" }]) {
      expect(() => plan({ ...order, ...change })).toThrow(/refund|credit|discount|paid/i);
    }
  });
  it("does not disguise a paid removal as a net-positive swap", () => {
    expect(() => plan({ ...order, paymentStatus: "confirmed" }, { ...input, lineItems: [
      ...input.lineItems, { productId: "new", quantity: 10 },
    ] })).toThrow(/paid|refund/i);
  });
  it("rejects negative quantities and zero quantities for new products", () => {
    for (const quantity of [-1, NaN, Infinity, 0.1]) expect(() => plan(order, { ...input,
      lineItems: input.lineItems.map(line => line.productId === "ss30" ? { ...line, quantity } : line),
    })).toThrow(/quantity/i);
    expect(() => plan(order, { ...input, lineItems: [...input.lineItems, { productId: "new", quantity: 0 }] }))
      .toThrow(/quantity/i);
  });
  it("does not widen the ordinary customer additive-edit contract", () => {
    expect(() => planHalfKitOrderEdit(order, [half, ordinary, other], [half.id], input, []))
      .toThrow(/quantity|only add/i);
  });
});
