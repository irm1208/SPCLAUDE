import { describe, expect, it } from "vitest";
import { allocateContents, validateReceipt, orderReadiness, routeOf } from "./supplier-fulfilment-model";

const orders: any[] = [
  { id: "o1", code: "100", username: "one", items: [{ productId: "p", productName: "Product", quantity: 2.5 }] },
  { id: "o2", code: "101", username: "two", items: [{ productId: "p", productName: "Product", quantity: 3 }] },
];
const line = { orderId: "o1", productId: "p", quantity: 1.5 };
describe("supplier package quantities (never member payment or dispatch writes)", () => {
  it("splits half kits across packages without over-allocation", () => {
    const first = allocateContents(orders, [], [line]);
    expect(first[0].quantity).toBe(1.5);
    expect(allocateContents(orders, [{ contents: first }], [{ ...line, quantity: 1 }])[0].quantity).toBe(1);
    expect(() => allocateContents(orders, [{ contents: first }], [{ ...line, quantity: 1.5 }])).toThrow(/remaining/i);
  });
  it("rejects duplicate, invented, fractional, negative and unbounded contents", () => {
    for (const input of [[line, line], [{ ...line, orderId: "other" }], [{ ...line, productId: "other" }],
      [{ ...line, quantity: 0.1 }], [{ ...line, quantity: -1 }], [{ ...line, quantity: Infinity }]]) {
      expect(() => allocateContents(orders, [], input)).toThrow();
    }
  });
  it("only an explicitly cancelled, unreceived allocation can be replaced", () => {
    expect(allocateContents(orders, [{ contents: allocateContents(orders, [], [{ ...line, quantity: 2.5 }]), cancelledAt: new Date() }], [line])).toHaveLength(1);
  });
  it("requires inspection of every expected line, including zero received", () => {
    const contents = allocateContents(orders, [], [line, { orderId: "o2", productId: "p", quantity: 1 }]);
    expect(() => validateReceipt(contents, [{ ...line, good: 1, damaged: 0 }])).toThrow();
    const receipt = validateReceipt(contents, contents.map(l => ({ ...l, good: 0, damaged: 0 })));
    expect(receipt).toHaveLength(2);
    expect(() => validateReceipt(contents, contents.map(l => ({ ...l, good: l.quantity, damaged: 0.5 })))).toThrow();
  });
  it("carrier delivery does not make stock ready; only all usable quantities do", () => {
    const contents = allocateContents(orders, [], [{ ...line, quantity: 2.5 }]);
    const shipment: any = { contents, trackingStatus: "delivered", receipt: [], receiptChecked: false };
    expect(orderReadiness(orders[0], [shipment], []).ready).toBe(false);
    shipment.receipt = [{ ...line, good: 2, damaged: 0.5 }];
    shipment.receiptChecked = true;
    expect(orderReadiness(orders[0], [shipment], []).ready).toBe(false);
    shipment.receipt = [{ ...line, good: 2.5, damaged: 0 }];
    expect(orderReadiness(orders[0], [shipment], []).ready).toBe(true);
    expect(orderReadiness(orders[0], [shipment], ["Routing changed"]).ready).toBe(false);
  });
  it("assigned ownership wins over stale routing type; unresolved legacy orders are not guessed", () => {
    expect(routeOf({ reshipperUsername: "@Fazi", routingType: "direct" })).toEqual({ direct: false, reshipperUsername: "fazi", route: "@fazi" });
    expect(routeOf({ routingType: "reshipper" }).route).toBe("Unassigned — resolve in Fulfilment");
    expect(routeOf({ routingType: "direct" }).direct).toBe(false);
    expect(routeOf({ directShippingRequested: true }).direct).toBe(true);
  });
  it("handles a large batch without cross-member quantity pooling", () => {
    const big = Array.from({ length: 1500 }, (_, i) => ({ ...orders[0], id: `order-${i}` }));
    const all = big.map(o => ({ orderId: o.id, productId: "p", quantity: 2.5 }));
    expect(allocateContents(big, [], all)).toHaveLength(1500);
  });
});
