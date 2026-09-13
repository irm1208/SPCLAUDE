import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRefundQueueJson } from "./GroupBuyRefundQueue";

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
});