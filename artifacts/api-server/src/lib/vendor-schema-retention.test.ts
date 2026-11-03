import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@workspace/db/schema";

describe("vendor schema preserves existing production structures", () => {
  it("exports every vendor table that must be retained on publish", () => {
    const tables = [
      schema.vendorAccountsTable, schema.vendorSessionsTable, schema.vendorPortalRequestsTable,
      schema.vendorSettingsTable, schema.vendorTelegramChatsTable, schema.vendorOrderIssuesTable,
      schema.vendorTelegramLinkTokensTable, schema.vendorTelegramEventsTable,
      schema.vendorThreadsTable, schema.vendorThreadMessagesTable, schema.vendorThreadTelegramMessagesTable,
    ];
    expect(tables.map(table => getTableConfig(table).name)).toEqual([
      "vendor_accounts", "vendor_sessions", "vendor_portal_requests", "vendor_settings",
      "vendor_telegram_chats", "vendor_order_issues", "vendor_telegram_link_tokens",
      "vendor_telegram_events", "vendor_threads", "vendor_thread_messages", "vendor_thread_telegram_messages",
    ]);
  });

  it("retains live foreign-key names and their cascading actions", () => {
    const cases = [
      [schema.vendorSessionsTable, "vendor_sessions_username_fkey", "cascade", "cascade"],
      [schema.vendorPortalRequestsTable, "vendor_portal_requests_username_fkey", "cascade", "cascade"],
      [schema.vendorOrderIssuesTable, "vendor_order_issues_submission_id_fkey", "cascade", "no action"],
      [schema.vendorThreadsTable, "vendor_threads_submission_id_fkey", "set null", "no action"],
      [schema.vendorThreadMessagesTable, "vendor_thread_messages_thread_id_fkey", "cascade", "no action"],
      [schema.vendorThreadTelegramMessagesTable, "vendor_thread_telegram_messages_thread_id_fkey", "cascade", "no action"],
    ] as const;
    for (const [table, name, onDelete, onUpdate] of cases) {
      const fk = getTableConfig(table).foreignKeys.find(key => key.getName() === name);
      expect(fk, name).toBeDefined();
      expect(fk?.onDelete).toBe(onDelete);
      expect(fk?.onUpdate).toBe(onUpdate);
    }
  });

  it("retains the existing vendor account status check", () => {
    expect(getTableConfig(schema.vendorAccountsTable).checks.map(check => check.name))
      .toContain("vendor_accounts_status_check");
  });

  it("uses a plain transaction identity constraint instead of a publish-breaking expression index", () => {
    const config = getTableConfig(schema.vendorPaymentsTable);
    expect(config.uniqueConstraints.map(constraint => constraint.name)).toContain("vendor_payments_active_tx_key_unique");
    expect(config.indexes.some(index => index.config.name === "vendor_payments_active_chain_txid_unique")).toBe(false);
  });
});
