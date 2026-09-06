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

describe("group-buy shipping product exclusion migrations", () => {
  it("adds the persisted excluded-product list with an empty-array default", () => {
    expect(startupSource).toMatch(
      /ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS vendor_shipping_excluded_product_ids jsonb NOT NULL DEFAULT '\[\]'::jsonb/,
    );
  });
});

describe("admin security startup migrations", () => {
  it("creates the identity, recovery, session and challenge tables", () => {
    for (const table of ["admin_security_settings", "admin_users", "admin_recovery_codes", "admin_sessions", "admin_pending_challenges"]) {
      expect(startupSource).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(startupSource).toMatch(/admin_users_username_unique UNIQUE \(username\)/);
    expect(startupSource).toMatch(/last_totp_step bigint/);
    expect(startupSource).toMatch(/admin_sessions_token_hash_idx/);
  });
});
