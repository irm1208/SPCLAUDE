import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../orders.ts", import.meta.url), "utf8");
const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const lookupSource = readFileSync(
  new URL("../../../../peps-anonymous/src/pages/Lookup.tsx", import.meta.url),
  "utf8",
);
const orderFormSource = readFileSync(
  new URL("../../../../peps-anonymous/src/pages/OrderForm.tsx", import.meta.url),
  "utf8",
);
const reviewSource = readFileSync(
  new URL("../../../../peps-anonymous/src/pages/Review.tsx", import.meta.url),
  "utf8",
);

describe("group-buy order context", () => {
  it("retains a looked-up group-buy order when opening Edit", () => {
    const editHandler = lookupSource.slice(
      lookupSource.indexOf("const handleEdit"),
      lookupSource.indexOf("const handleTopUp"),
    );
    expect(editHandler).toContain("groupBuyId");
    expect(editHandler).toContain("loadExistingOrder(foundOrder)");
    expect(orderFormSource).toContain("draft.orderId && draft.groupBuyId");
  });

  it("infers a unique eligible group buy before delivery and GB validation", () => {
    expect(routeSource).toContain("inferGroupBuyContext");
    expect(routeSource).toContain("GROUP_BUY_SELECTION_REQUIRED");
    expect(routeSource).toContain("eq(groupBuyProductsTable.active, true)");
    expect(routeSource).toContain("eq(productsTable.active, true)");
    const inference = routeSource.indexOf("const resolution = inferGroupBuyContext");
    expect(inference).toBeGreaterThan(-1);
    expect(inference).toBeLessThan(routeSource.indexOf("let deliveryMethodRecord"));
  });

  it("asks the customer to choose before creating an ambiguous order", () => {
    const ambiguity = routeSource.indexOf('code: "GROUP_BUY_SELECTION_REQUIRED"');
    const createInsert = routeSource.indexOf(".insert(ordersTable)", ambiguity);
    expect(ambiguity).toBeGreaterThan(-1);
    expect(routeSource.slice(ambiguity, createInsert)).toContain("return");
    expect(reviewSource).toContain("GROUP_BUY_SELECTION_REQUIRED");
    expect(reviewSource).toContain("eligibleGroupBuys");
  });

  it("keeps explicit group-buy selections on the existing server validation path", () => {
    expect(reviewSource).toContain("selectedGroupBuyId");
    expect(routeSource).toContain("groupBuyId: clientGroupBuyId");
    expect(routeSource).toContain("if (normalizedGroupBuyId) {");
    expect(routeSource).toContain("You are not a member of this group buy");
    expect(routeSource).toContain("One or more products are not available in this group buy");
  });

  it("persists the resolved group and exposes it through organiser group-buy orders", () => {
    expect(routeSource).toContain("groupBuyId: normalizedGroupBuyId,");
    const groupOrdersStart = organiserSource.indexOf('router.get("/organiser/group-buys/:id/orders"');
    expect(groupOrdersStart).toBeGreaterThan(-1);
    expect(organiserSource.slice(groupOrdersStart, groupOrdersStart + 2500))
      .toContain("eq(ordersTable.groupBuyId, id)");
  });
});
