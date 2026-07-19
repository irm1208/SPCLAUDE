import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const startupSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

describe("account dashboard startup migrations", () => {
  it("creates the hidden orders table required by the account dashboard", () => {
    expect(startupSource).toMatch(/CREATE TABLE IF NOT EXISTS hidden_orders\s*\(/);
    expect(startupSource).toMatch(
      /CONSTRAINT hidden_orders_username_order_uniq UNIQUE \(telegram_username, order_id\)/,
    );
  });
});
