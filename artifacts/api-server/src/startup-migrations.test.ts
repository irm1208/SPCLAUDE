import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const startupSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const adminSecuritySchemaSource = readFileSync(
  new URL("../../../lib/db/src/schema/admin_security.ts", import.meta.url),
  "utf8",
);

describe("account dashboard startup migrations", () => {
  it("creates the hidden orders table required by the account dashboard", () => {
    expect(startupSource).toMatch(/CREATE TABLE IF NOT EXISTS hidden_orders\s*\(/);
    expect(startupSource).toMatch(
      /CONSTRAINT hidden_orders_username_order_uniq UNIQUE \(telegram_username, order_id\)/,
    );
  });

  it("isolates idempotent refund-sensitive repairs and does not swallow schema failures", () => {
    expect(startupSource).toContain("runStartupRefundSafeRepair");
    expect(startupSource).toContain("refundMutableOrderWhereSkipActive");
    expect(startupSource).toContain("skipped ${activeRows.length} order(s) with active refunds");
    expect(startupSource).not.toContain("Warning — could not apply startup migrations");
  });
});

describe("group-buy shipping product exclusion migrations", () => {
  it("adds the persisted excluded-product list with an empty-array default", () => {
    expect(startupSource).toMatch(
      /ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS vendor_shipping_excluded_product_ids jsonb NOT NULL DEFAULT '\[\]'::jsonb/,
    );
  });
});

describe("ticket message attachment startup migration", () => {
  it("creates private attachment metadata with cascading message cleanup and indexes", () => {
    expect(startupSource).toContain("CREATE TABLE IF NOT EXISTS ticket_message_attachments");
    expect(startupSource).toMatch(
      /ticket_message_id integer NOT NULL REFERENCES ticket_messages\(id\) ON DELETE CASCADE/,
    );
    expect(startupSource).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS ticket_message_attachments_storage_key_unique_idx",
    );
    expect(startupSource).toContain(
      "CREATE INDEX IF NOT EXISTS ticket_message_attachments_message_id_idx",
    );
  });
});

describe("admin security startup migrations", () => {
  it("leaves admin security schema changes to the managed publish migration", () => {
    for (const table of ["admin_security_settings", "admin_users", "admin_recovery_codes", "admin_sessions", "admin_pending_challenges"]) {
      expect(startupSource).not.toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("keeps singleton and token uniqueness rules in the managed schema", () => {
    expect(adminSecuritySchemaSource).toContain('check("admin_security_settings_id_check"');
    expect(adminSecuritySchemaSource).toContain('uniqueIndex("admin_sessions_token_hash_unique_idx"');
    expect(adminSecuritySchemaSource).toContain('uniqueIndex("admin_pending_challenges_token_hash_unique_idx"');
  });
});

describe("database backup startup schedules", () => {
  it("starts restore verification beside the encrypted backup schedule", () => {
    expect(startupSource).toMatch(
      /import \{ startDbBackupVerificationSchedule \} from "\.\/lib\/db-backup-verifier";/,
    );
    expect(startupSource).toMatch(
      /startDbBackupSchedule\(\);\s*startDbBackupVerificationSchedule\(\);/,
    );
  });
});
