import { afterEach, describe, expect, it, vi } from "vitest";
import { onwardTransactionTime } from "./gb-onward-chain-time";
import { fetchFiatToUsd } from "./crypto-pricing";

afterEach(() => vi.unstubAllGlobals());
describe("onward payment chain timestamps and strict FX", () => {
  it("reads the actual EVM block time rather than trusting a submitted date", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ result: { blockNumber: "0x10" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { timestamp: "0x65" } }) });
    vi.stubGlobal("fetch", fetcher);
    expect(await onwardTransactionTime(`0x${"a".repeat(64)}`, "Ethereum")).toBe(101_000);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).method).toBe("eth_getBlockByNumber");
  });
  it("uses finalized Solana transaction time", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { blockTime: 123 } }) });
    vi.stubGlobal("fetch", fetcher);
    expect(await onwardTransactionTime("signature", "Solana")).toBe(123_000);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).params[1].commitment).toBe("finalized");
  });
  it("does not accept an unconfirmed Bitcoin transaction timestamp", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: { confirmed: false, block_time: 123 } }) }));
    expect(await onwardTransactionTime("hash", "Bitcoin")).toBeNull();
  });
  it("fails closed when chain time cannot be obtained", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
    expect(await onwardTransactionTime("hash", "Ethereum")).toBeNull();
    expect(await onwardTransactionTime("hash", "TRON")).toBeNull();
  });
  it("requires live fiat FX for new delivery requests without changing legacy defaults", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchFiatToUsd("EUR", { strict: true })).rejects.toThrow("unavailable");
    expect(await fetchFiatToUsd("GBP")).toBe(1.27);
    expect(await fetchFiatToUsd("USD", { strict: true })).toBe(1);
  });
});
