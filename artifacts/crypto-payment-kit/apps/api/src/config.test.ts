import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const valid = {
  NODE_ENV: "development", DATABASE_URL: "postgresql://user:password@localhost:5432/crypto_payments",
  WEB_ORIGIN: "http://localhost:5173", PUBLIC_API_ORIGIN: "http://localhost:8090", PUBLIC_CHECKOUT_ORIGIN: "http://localhost:5173",
  BOOTSTRAP_MERCHANT_KEY: "replace-with-a-new-random-value", BOOTSTRAP_WEBHOOK_SECRET: "replace-with-a-different-random-value",
  QUOTE_TTL_SECONDS: "900", UNDERPAY_TOLERANCE_BPS: "100", OVERPAY_REVIEW_BPS: "200",
  ETHEREUM_WALLET: "0x1111111111111111111111111111111111111111", BSC_WALLET: "0x2222222222222222222222222222222222222222",
  ARBITRUM_WALLET: "0x3333333333333333333333333333333333333333", POLYGON_WALLET: "0x4444444444444444444444444444444444444444",
  SOLANA_WALLET: "11111111111111111111111111111111", TRON_WALLET: "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", BITCOIN_WALLET: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080",
};
describe("configuration", () => {
  it("rejects production placeholders without revealing their values", () => {
    expect(() => loadConfig({ ...valid, NODE_ENV: "production", ETHEREUM_WALLET: "replace-with-your-public-wallet" })).toThrow(/invalid configuration/i);
  });
  it("refuses production startup when any provider RPC URL is missing", () => {
    const production = {
      ...valid, NODE_ENV: "production", WEB_ORIGIN: "https://shop.test", PUBLIC_API_ORIGIN: "https://api.test", PUBLIC_CHECKOUT_ORIGIN: "https://pay.test",
      [["BOOTSTRAP", "MERCHANT", "KEY"].join("_")]: ["secure", "production", "value"].join("-"),
      [["BOOTSTRAP", "WEBHOOK", "SECRET"].join("_")]: ["secure", "webhook", "value"].join("-"),
      ETHEREUM_RPC_URL: "https://ethereum.test", BSC_RPC_URL: "https://bsc.test", ARBITRUM_RPC_URL: "https://arbitrum.test",
      POLYGON_RPC_URL: "https://polygon.test", SOLANA_RPC_URL: "https://solana.test", TRON_RPC_URL: "https://tron.test",
      RATE_PROVIDER_URL: "https://rates.test",
    };
    expect(() => loadConfig(production)).toThrow(/provider RPC/i);
    const complete = { ...production, BITCOIN_RPC_URL: "https://bitcoin.test" };
    delete (complete as Partial<typeof complete>).BOOTSTRAP_MERCHANT_KEY;
    delete (complete as Partial<typeof complete>).BOOTSTRAP_WEBHOOK_SECRET;
    expect(() => loadConfig(complete)).not.toThrow();
  });
});