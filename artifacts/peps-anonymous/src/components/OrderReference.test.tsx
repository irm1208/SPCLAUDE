import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderReference } from "./OrderReference";
import { orderReference } from "@/lib/order-reference";
import { mapApiOrder } from "@/pages/organiser-v2/api/organiser-api";
import { normalizeOrdersWithIssues } from "@/pages/organiser-v2/domain/order";
import { filterOrders, type OrderFilterValues } from "@/pages/organiser-v2/orders-filter-model";

const addition = { code: "ADD-00000000-0000-0000-0000-000000000001", displayReference: "12414-A1",
  isAddition: true, additionParent: { id: "parent", reference: "12414" } };

describe("readable order references", () => {
  it("shows the alias and parent without changing canonical code or payment state", () => {
    for (const paymentStatus of ["confirmed", "unpaid"]) {
      const order = { ...addition, paymentStatus };
      const html = renderToStaticMarkup(<OrderReference order={order} />);
      expect(html).toContain("#12414-A1");
      expect(html).toContain("Addition to #12414");
      expect(html).not.toContain("ADD-000000");
      expect(order.code).toBe(addition.code);
      expect(order.paymentStatus).toBe(paymentStatus);
    }
  });
  it("leaves ordinary orders alone and safely handles unavailable parents", () => {
    expect(orderReference({ code: "12414" })).toBe("12414");
    const html = renderToStaticMarkup(<OrderReference order={{ code: addition.code, isAddition: true }} />);
    expect(html).toContain("original order unavailable");
    expect(html).not.toContain(addition.code);
  });
  it("keeps aliases through both V2 mapping and normalization, and searches old and new references", () => {
    const mapped = mapApiOrder({ ...addition, id: "child", telegramUsername: "synthetic",
      status: "Submitted", paymentStatus: "unpaid", grandTotal: 300, createdAt: "2026-10-31T00:00:00Z",
      lineItems: [{ productName: "Synthetic", quantity: 1, unitPrice: 300, lineTotal: 300 }] });
    const { orders } = normalizeOrdersWithIssues([mapped]);
    expect(orders).toHaveLength(1);
    expect(orders[0].displayReference).toBe("12414-A1");
    expect(orders[0].code).toBe(addition.code);
    expect(orders[0].additionParent).toEqual(addition.additionParent);
    const filters: OrderFilterValues = { statusFilters: ["all"], countryFilters: [], paymentMethodFilters: [],
      orderDateFrom: "", orderDateTo: "", paymentDateFrom: "", paymentDateTo: "", sortOrder: "newest" };
    expect(filterOrders(orders, filters, "12414-a1")).toHaveLength(1);
    expect(filterOrders(orders, filters, addition.code)).toHaveLength(1);
  });
});
