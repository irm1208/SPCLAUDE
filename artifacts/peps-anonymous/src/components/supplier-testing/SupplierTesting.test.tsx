import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ItemRow } from "./SupplierTesting";
import { assignableGroups, canJoin, filterItems, type SupplierTestingItem } from "./supplier-testing-logic";

const base: SupplierTestingItem = {
  orderId: "o1", orderCode: "PA-1042", orderType: "group_buy", productId: "p1", productName: "BPC-157 10mg",
  supplierId: "s1", supplierName: "JBG", quantity: 2, eligible: true, interestId: null, groupId: null,
  state: "eligible", assignmentNote: null,
};

describe("supplier testing", () => {
  it("shows a free register-interest button for eligible items, without payment wording", () => {
    const html = renderToStaticMarkup(createElement(ItemRow, { item: base, onJoin: () => {}, joining: false }));
    expect(html).toContain("Register interest");
    expect(html).toContain("Nothing is charged");
    expect(html).not.toMatch(/Pay now|Contribute \$/);
  });
  it("hides the join button once interest is registered", () => {
    const item = { ...base, interestId: "i1", state: "awaiting_batch" as const };
    expect(canJoin(item)).toBe(false);
    const html = renderToStaticMarkup(createElement(ItemRow, { item, onJoin: () => {}, joining: false }));
    expect(html).not.toContain("Register interest");
    expect(html).toContain("Awaiting batch");
  });
  it("compact mode keeps only eligible or registered items for the order", () => {
    const items = [base, { ...base, orderId: "o2" }, { ...base, productId: "p2", eligible: false }];
    expect(filterItems(items, { supplierId: "", productId: "", batch: "" }, "o1", true)).toHaveLength(1);
  });
  it("only offers same supplier and product groups for assignment", () => {
    const groups = [{ id: "a", supplierId: "s1", productId: "p1" }, { id: "b", supplierId: "s2", productId: "p1" }];
    expect(assignableGroups(groups, base).map(g => g.id)).toEqual(["a"]);
  });
});
