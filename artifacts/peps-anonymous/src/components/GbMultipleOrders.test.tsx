import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GbMultipleOrderBadge, GbMultipleOrderNotice } from "./GbMultipleOrders";
import { isMultipleGbOrder } from "../lib/gb-multiple-orders";
import { mapApiOrder } from "../pages/organiser-v2/api/organiser-api";
import { normalizeOrdersWithIssues } from "../pages/organiser-v2/domain/order";

describe("group-buy multiple-order UI", () => {
  it("preserves the database count and add-on marker through mapping and normalization", () => {
    const mapped = mapApiOrder({ id: "order", telegramUsername: "alice", status: "Submitted",
      grandTotal: 10, createdAt: "2026-10-11T12:00:00Z", multipleGbOrderCount: 2,
      additionOfOrderId: "parent", lineItems: [] });
    const normalized = normalizeOrdersWithIssues([mapped]).orders[0];
    expect(normalized.multipleGbOrderCount).toBe(2);
    expect(normalized.additionOfOrderId).toBe("parent");
    expect(isMultipleGbOrder(normalized)).toBe(false);
  });
  it("does not flag cancelled or draft orders, including a draft mapped to pending", () => {
    expect(isMultipleGbOrder({ status: "Cancelled", multipleGbOrderCount: 3 })).toBe(false);
    expect(isMultipleGbOrder({ status: "pending", apiStatus: "Draft", multipleGbOrderCount: 3 })).toBe(false);
    expect(isMultipleGbOrder({ status: "paid", multipleGbOrderCount: 2 })).toBe(true);
  });
  it("shows the full count on separate orders and a different label on additions", () => {
    expect(renderToStaticMarkup(createElement(GbMultipleOrderBadge, { order: { multipleGbOrderCount: 3 } }))).toContain("Multiple orders · 3");
    const addon = renderToStaticMarkup(createElement(GbMultipleOrderBadge, { order: { multipleGbOrderCount: 3, additionOfOrderId: "parent" } }));
    expect(addon).toContain("Add-on order");
    expect(addon).not.toContain("Multiple orders ·");
  });
  it("keeps the filter available when there are no duplicates", () => {
    const html = renderToStaticMarkup(createElement(GbMultipleOrderNotice, { people: 0, checked: false, onChange: () => {} }));
    expect(html).toContain("Show multiple orders only");
    expect(html).not.toContain("people have");
  });
});
