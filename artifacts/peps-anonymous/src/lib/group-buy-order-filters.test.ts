import { describe, expect, it } from "vitest";
import { matchesCancelledOrRefunded } from "./group-buy-order-filters";

describe("matchesCancelledOrRefunded", () => {
  it.each([
    [{ status: "Cancelled", paymentStatus: "unpaid" }, true],
    [{ status: "Submitted", paymentStatus: "refunded" }, true],
    [{ status: " CANCELLED ", paymentStatus: "unpaid" }, true],
    [{ status: "Submitted", paymentStatus: " REFUNDED " }, true],
    [{ status: "Submitted", paymentStatus: "confirmed" }, false],
    [{ status: null, paymentStatus: null }, false],
  ])("matches cancelled or refunded orders for %o", (order, expected) => {
    expect(matchesCancelledOrRefunded(order)).toBe(expected);
  });
});