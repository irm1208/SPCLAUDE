import { describe, expect, it } from "vitest";
import { inferGroupBuyContext } from "./group-buy-order-context";

const memberships = [
  { groupBuyId: "gb-a", allowExtraOrder: false },
  { groupBuyId: "gb-b", allowExtraOrder: false },
];
const groups = [
  { id: "gb-a", name: "Alpha", status: "active", allowExtraOrders: false },
  { id: "gb-b", name: "Beta", status: "active", allowExtraOrders: false },
];
const products = [
  { groupBuyId: "gb-a", productId: "p1" },
  { groupBuyId: "gb-a", productId: "p2" },
  { groupBuyId: "gb-b", productId: "p1" },
  { groupBuyId: "gb-b", productId: "p2" },
];

function resolve(overrides: Partial<Parameters<typeof inferGroupBuyContext>[0]> = {}) {
  return inferGroupBuyContext({
    authenticatedUsername: "@customer",
    submittedUsername: "customer",
    isWholesaleOrder: false,
    productIds: ["p1", "p2"],
    memberships,
    groupBuys: groups,
    eligibleProducts: products,
    ...overrides,
  });
}

describe("inferGroupBuyContext", () => {
  it("returns the only member group buy accepting every submitted product", () => {
    expect(resolve({ groupBuys: [groups[0]] })).toEqual({ kind: "unique", groupBuyId: "gb-a" });
  });

  it("returns all matching groups when the order context is ambiguous", () => {
    expect(resolve()).toEqual({
      kind: "ambiguous",
      eligibleGroupBuys: [{ id: "gb-a", name: "Alpha" }, { id: "gb-b", name: "Beta" }],
    });
  });

  it("retains standalone behavior when no group matches every product", () => {
    expect(resolve({ eligibleProducts: [{ groupBuyId: "gb-a", productId: "p1" }] })).toEqual({ kind: "none" });
  });

  it("does not infer a group for another submitted identity, wholesale, or a non-orderable group", () => {
    expect(resolve({ submittedUsername: "someone-else" })).toEqual({ kind: "none" });
    expect(resolve({ isWholesaleOrder: true })).toEqual({ kind: "none" });
    expect(resolve({
      groupBuys: [{ ...groups[0], status: "closed" }],
    })).toEqual({ kind: "none" });
  });

  it("honors the existing extra-order acceptance rules", () => {
    expect(resolve({
      memberships: [{ groupBuyId: "gb-a", allowExtraOrder: true }],
      groupBuys: [{ ...groups[0], status: "closed" }],
    })).toEqual({ kind: "unique", groupBuyId: "gb-a" });
  });
});
