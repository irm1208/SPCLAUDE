import { describe, expect, it } from "vitest";
import { PaymentRepository } from "./repository.js";

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
});