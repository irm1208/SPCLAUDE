import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoPayment } from "./api";

describe("development demo API", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("never sends a merchant credential from the browser", async () => {
    const fetch = vi.fn(async (_url, init: RequestInit) => new Response(JSON.stringify({ paymentId: "pay_demo", checkoutUrl: "/checkout/pay_demo", rails: [] }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    await createDemoPayment({ fiatAmount: "1.00", fiatCurrency: "USD", rails: ["bitcoin-btc"] });
    expect(fetch.mock.calls[0][0]).toContain("/demo/payments");
    expect(new Headers(fetch.mock.calls[0][1]?.headers).has("authorization")).toBe(false);
  });
});