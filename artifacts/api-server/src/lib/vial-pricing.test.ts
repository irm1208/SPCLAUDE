import { describe, expect, it, vi } from "vitest";
import { priceVialOrder } from "./vial-pricing";

describe("vial checkout pricing", () => {
  it("keeps pounds and locks the converted stablecoin amount", async () => {
    const rate = vi.fn().mockResolvedValue(1.3);
    expect(await priceVialOrder([{ currency: "GBP", unitPrice: 16, quantity: 1 }], 0, rate))
      .toEqual({ currency: "GBP", subtotal: 16, total: 16, paymentUsdAmount: 20.8 });
    expect(rate).toHaveBeenCalledWith("GBP", { strict: true });
  });
  it("applies a fiat discount before conversion", async () => {
    expect(await priceVialOrder([{ currency: "GBP", unitPrice: 16, quantity: 2 }], 2, async () => 1.3))
      .toEqual({ currency: "GBP", subtotal: 32, total: 30, paymentUsdAmount: 39 });
  });
  it("does not add unlike currencies or permit invalid amounts", async () => {
    const rate = vi.fn();
    await expect(priceVialOrder([
      { currency: "GBP", unitPrice: 16, quantity: 1 },
      { currency: "USD", unitPrice: 16, quantity: 1 },
    ], 0, rate)).rejects.toThrow("same currency");
    await expect(priceVialOrder([{ currency: "GBP", unitPrice: NaN, quantity: 1 }], 0, rate))
      .rejects.toThrow("Invalid");
    expect(rate).not.toHaveBeenCalled();
  });
  it("blocks checkout on unavailable or invalid FX, never assuming 1:1", async () => {
    const items = [{ currency: "GBP", unitPrice: 16, quantity: 1 }];
    await expect(priceVialOrder(items, 0, async () => { throw new Error("FX unavailable"); }))
      .rejects.toThrow("FX unavailable");
    await expect(priceVialOrder(items, 0, async () => Infinity)).rejects.toThrow("exchange rate");
    await expect(priceVialOrder(items, 0, async () => 0)).rejects.toThrow("exchange rate");
  });
  it("does not convert stablecoin prices again", async () => {
    const rate = vi.fn();
    expect((await priceVialOrder([{ currency: "USDC", unitPrice: 16, quantity: 1 }], 0, rate)).paymentUsdAmount).toBe(16);
    expect(rate).not.toHaveBeenCalled();
  });
});
