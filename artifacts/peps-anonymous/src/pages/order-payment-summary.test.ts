import test from "node:test";
import assert from "node:assert/strict";

let getOrderPaymentSummary:
  | ((input: {
      grandTotal: number;
      amountDue: number;
      paymentStatus: string;
      balancePaymentStatus?: string | null;
    }) => {
      hasOutstandingAddOn: boolean;
      paidAmount: number;
      showFullyPaidPanel: boolean;
      statusLabel: string;
    })
  | undefined;

try {
  ({ getOrderPaymentSummary } = await import("./order-payment-summary.ts"));
} catch {
  // The red run intentionally happens before the implementation exists.
}

test("a paid parent with an unpaid add-on is not presented as fully paid", () => {
  assert.equal(typeof getOrderPaymentSummary, "function");

  assert.deepEqual(
    getOrderPaymentSummary!({
      grandTotal: 460,
      amountDue: 120,
      paymentStatus: "confirmed",
      balancePaymentStatus: "unpaid",
    }),
    {
      hasOutstandingAddOn: true,
      paidAmount: 340,
      showFullyPaidPanel: false,
      statusLabel: "Original payment confirmed",
    },
  );
});

test("a settled balance restores the normal fully-paid presentation", () => {
  assert.deepEqual(
    getOrderPaymentSummary!({
      grandTotal: 460,
      amountDue: 0,
      paymentStatus: "confirmed",
      balancePaymentStatus: "confirmed",
    }),
    {
      hasOutstandingAddOn: false,
      paidAmount: 460,
      showFullyPaidPanel: true,
      statusLabel: "Payment confirmed",
    },
  );
});