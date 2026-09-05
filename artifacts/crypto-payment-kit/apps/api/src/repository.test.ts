import { describe, expect, it } from "vitest";
import { PaymentRepository, buildWebhookEvent } from "./repository.js";
import { webhookEventSchema } from "@open-crypto-checkout/core";

describe("PaymentRepository SQL contract", () => {
  it("creates a payment through its injected PostgreSQL transaction rather than process state", async () => {
    const calls: string[] = [];
    const client = {
      query: async (sql: string) => {
        calls.push(sql);
        if (sql === "BEGIN" || sql === "COMMIT") return { rows: [], rowCount: 0 };
        if (sql.includes("INSERT INTO payments")) return { rows: [{ id: "p1", public_id: "pay_1", status: "awaiting_payment" }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
      release: () => undefined,
    };
    const repository = new PaymentRepository({ connect: async () => client } as never);

    const payment = await repository.createPayment("merchant-1", {
      publicId: "pay_1", merchantOrderReference: "order-1", idempotencyKey: "key-1",
      fiatAmount: "12.00", fiatCurrency: "USD", rails: ["ethereum-usdc"],
    });

    expect(payment.publicId).toBe("pay_1");
    expect(calls).toContain("BEGIN");
    expect(calls.some((sql) => sql.includes("INSERT INTO payments"))).toBe(true);
    expect(calls).toContain("COMMIT");
  });

  it("returns the public checkout contract with full rails and a reloadable selected quote", async () => {
    const repository = new PaymentRepository({ query: async () => ({ rows: [{
      publicId: "pay_12345678901234567890", status: "awaiting_payment", fiatAmount: "10.00", fiatCurrency: "USD",
      allowedRails: ["ethereum-usdc"], quoteRailId: "ethereum-usdc", quoteNetwork: "ethereum", quoteChainId: "1",
      quoteAsset: "USDC", quoteTokenId: "0xtoken", quoteDestination: "0xaddress", quoteAmountBaseUnits: "10000000",
      quoteExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    }] }) } as never);
    await expect(repository.checkout("pay_12345678901234567890")).resolves.toEqual({
      publicId: "pay_12345678901234567890", status: "awaiting_payment", fiatAmount: "10.00", fiatCurrency: "USD",
      expiresAt: "2030-01-01T00:00:00.000Z", allowedRails: [expect.objectContaining({ id: "ethereum-usdc", asset: "USDC" })],
      selectedQuote: {
        railId: "ethereum-usdc", network: "ethereum", chainId: "1", asset: "USDC", tokenAddress: "0xtoken",
        destinationAddress: "0xaddress", amountBaseUnits: "10000000", expiresAt: "2030-01-01T00:00:00.000Z",
      },
    });
  });

  it("builds the complete immutable payment webhook contract", () => {
    const event = buildWebhookEvent({
      id: "evt-1", createdAt: new Date("2030-01-01T00:00:00.000Z"), merchantOrderReference: "order-1",
      paymentId: "pay_12345678901234567890", railId: "ethereum-usdc", network: "ethereum", asset: "USDC",
      amountBaseUnits: "1000000", transactionHash: "0x" + "a".repeat(64),
    });
    expect(webhookEventSchema.parse(event)).toEqual(event);
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("idempotently bootstraps one development merchant and endpoint", async () => {
    const sql: string[] = [];
    const client = { query: async (text: string) => {
      sql.push(text);
      if (text.includes("RETURNING id") || text.includes("SELECT id FROM merchants")) return { rows: [{ id: "merchant-1" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }, release: () => undefined };
    const repository = new PaymentRepository({ connect: async () => client } as never);
    await expect(repository.bootstrapDevelopment("api-digest", "webhook-digest", "signing", "http://127.0.0.1:9000/hook", true)).resolves.toBe("merchant-1");
    expect(sql.some((text) => text.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(sql.some((text) => text.includes("UPDATE api_keys"))).toBe(true);
    expect(sql.some((text) => text.includes("UPDATE webhook_endpoints"))).toBe(true);
  });

  it("validates webhook SSRF policy before endpoint persistence", async () => {
    let connected = false;
    const repository = new PaymentRepository({ connect: async () => { connected = true; throw new Error("should not connect"); } } as never);
    await expect(repository.bootstrapDevelopment("api-digest", "webhook-digest", "signing", "http://127.0.0.1/hook")).rejects.toThrow(/HTTPS/);
    expect(connected).toBe(false);
  });
});