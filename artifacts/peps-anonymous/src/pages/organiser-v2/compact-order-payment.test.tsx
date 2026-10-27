import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { OrganiserOrder } from "./domain/order";

vi.mock("@/components/onward-delivery/OnwardPayments", () => ({ OnwardPaymentReadonly: () => null }));
vi.mock("@/components/onward-delivery/OnwardDelivery", () => ({ OnwardDeliveryReadonly: () => null }));
const { default: CompactOrderList } = await import("./CompactOrderList");

const order: OrganiserOrder = {
  id: "one", memberUsername: "member", memberName: "Member", status: "processing",
  paymentStatus: "confirmed", createdAt: "2026-10-26T10:15:00.000Z",
  paidAt: "2026-10-27T12:30:00.000Z", total: 130, paymentMethod: "USDT",
  country: "GB", shippingOption: "Post", products: [{ name: "Example", quantity: 2, price: 65 }],
};
const render = (changes: Partial<OrganiserOrder> = {}) =>
  renderToStaticMarkup(createElement(CompactOrderList, { orders: [{ ...order, ...changes }] }));

describe("compact order payment summary", () => {
  it("shows a paid pill plus separate order and payment dates without expansion", () => {
    const html = render();
    expect(html).toContain('data-label="Payment"');
    expect(html).toMatch(/data-tone="success"[^>]*>Paid</);
    expect(html).toContain(">Order date<");
    expect(html).toContain(">Payment date<");
    expect(html).toContain('dateTime="2026-10-26T10:15:00.000Z"');
    expect(html).toContain('dateTime="2026-10-27T12:30:00.000Z"');
    expect(html).not.toContain("orders-compact-detail-top");
  });
  it("uses actual payment status, never fulfilment status, to show unpaid", () => {
    const html = render({ status: "shipped", paymentStatus: "unpaid", paidAt: undefined });
    expect(html).toMatch(/data-tone="warning"[^>]*>Unpaid</);
    expect(html).toContain('data-label="Payment date">—</span>');
  });
  it("does not imply test payments or refunds are fully paid", () => {
    expect(render({ paymentStatus: "test_confirmed" })).toContain(">Test paid<");
    expect(render({ paymentStatus: "refunded" })).toContain(">Refunded<");
  });
  it("handles missing or invalid dates without inventing dates or crashing", () => {
    const html = render({ createdAt: "invalid", paidAt: "invalid" });
    expect(html).toContain('data-label="Order date">—</span>');
    expect(html).toContain('data-label="Payment date">—</span>');
    expect(html).not.toContain("Invalid Date");
  });
});
