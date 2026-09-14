import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GroupBuyRefundCardMetadata,
  fetchRefundQueueJson,
  normalizeRefundQueueItem,
} from "./GroupBuyRefundQueue";

describe("fetchRefundQueueJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("aborts a queue request and reports a timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    })));

    const request = fetchRefundQueueJson("/api/admin/group-buy-refunds?limit=100", {
      headers: { "x-admin-secret": "test-secret" },
    });
    const rejection = expect(request).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(15_000);

    await rejection;
  });

  it("renders every incoming payment TXID with an explicit empty state and separates refund TXIDs", () => {
    const markup = renderToStaticMarkup(createElement(GroupBuyRefundCardMetadata, {
      paymentTxids: ["payment-1", "payment-2"],
      outgoingTxid: "refund-1",
    }));
    expect(markup).toContain("Payment TXID(s)");
    expect(markup).toContain("payment-1");
    expect(markup).toContain("payment-2");
    expect(markup).toContain("Refund TXID: refund-1");

    const emptyMarkup = renderToStaticMarkup(createElement(GroupBuyRefundCardMetadata, {
      paymentTxids: null,
      outgoingTxid: null,
    }));
    expect(emptyMarkup).toContain("No payment TXID recorded");
  });

  it("normalizes missing and legacy payment TXID fields for list/detail/polling data", () => {
    expect(normalizeRefundQueueItem({ paymentTxids: ["  payment-1  ", 42, ""] }).paymentTxids).toEqual(["payment-1"]);
    expect(normalizeRefundQueueItem({ paymentTxids: null }).paymentTxids).toEqual([]);
    expect(normalizeRefundQueueItem({ paymentTxids: "legacy-payment" }).paymentTxids).toEqual([]);
    expect(normalizeRefundQueueItem({}).paymentTxids).toEqual([]);
  });
});