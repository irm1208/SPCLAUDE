import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { PAYMENT_RAILS } from "@open-crypto-checkout/core";
import { createApp, type RateProvider } from "./index.js";
import type { Config } from "./config.js";
import type { PaymentRepository } from "./repository.js";

const config = { NODE_ENV: "test", WEB_ORIGIN: "http://localhost:5173", PUBLIC_CHECKOUT_ORIGIN: "http://localhost:5173", QUOTE_TTL_SECONDS: 900,
  UNDERPAY_TOLERANCE_BPS: 100, OVERPAY_REVIEW_BPS: 200, ETHEREUM_WALLET: "0x0000000000000000000000000000000000000001" } as Config;
const rate: RateProvider = { quote: async () => ({ rate: "1", source: "fixture", quotedAt: new Date() }) };
let server: Server | undefined;
const request = async (app: ReturnType<typeof createApp>, path: string, init?: RequestInit) => {
  server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return fetch(`http://127.0.0.1:${port}${path}`, init);
};
afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined; });

describe("public checkout HTTP contract", () => {
  it("returns the same exact contract after selection and reload", async () => {
    const checkout = { publicId: "pay_12345678901234567890", status: "awaiting_payment", fiatAmount: "10.00", fiatCurrency: "USD", expiresAt: null,
      allowedRails: [PAYMENT_RAILS[0]], selectedQuote: null as any };
    const repository = {
      checkout: async () => checkout,
      selectQuote: async (_id: string, quote: any) => {
        checkout.expiresAt = quote.expiresAt.toISOString();
        checkout.selectedQuote = { railId: quote.railId, network: quote.networkName, chainId: quote.chainId, asset: quote.asset, tokenAddress: null, destinationAddress: quote.destination, amountBaseUnits: quote.amountBaseUnits, expiresAt: quote.expiresAt.toISOString() };
        return checkout.selectedQuote;
      },
    } as unknown as PaymentRepository;
    const app = createApp(config, rate, repository);
    const selected = await request(app, `/v1/checkout/${checkout.publicId}/select`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ railId: "ethereum-eth" }) });
    expect(await selected.json()).toEqual(checkout);
    await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined;
    const reloaded = await request(app, `/v1/checkout/${checkout.publicId}`);
    expect(await reloaded.json()).toEqual(checkout);
  });

  it("mounts demo creation only outside production", async () => {
    const repository = { createPayment: async () => ({ publicId: "pay_12345678901234567890", rails: ["bitcoin-btc"] }) } as unknown as PaymentRepository;
    const body = JSON.stringify({ merchantOrderReference: "demo-1", fiatAmount: "1.00", fiatCurrency: "USD", rails: ["bitcoin-btc"] });
    const development = createApp(config, rate, repository, "merchant-demo");
    expect((await request(development, "/v1/demo/payments", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "id" }, body })).status).toBe(201);
    await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined;
    const production = createApp({ ...config, NODE_ENV: "production" }, rate, repository, "merchant-demo");
    expect((await request(production, "/v1/demo/payments", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "id" }, body })).status).toBe(404);
  });
});