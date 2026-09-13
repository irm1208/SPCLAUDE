import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  GROUP_BUY_REFUND_ASSETS,
  GROUP_BUY_REFUND_METHODS,
  GROUP_BUY_REFUND_NETWORKS,
  GROUP_BUY_REFUND_STATUSES,
  accountsTable,
  creditTransactionsTable,
  groupBuyRefundAttemptsTable,
  groupBuyRefundsTable,
  groupBuysTable,
  ordersTable,
} from "@workspace/db/schema";

describe("group buy refund schema contract", () => {
  it("exports only the supported refund literals", () => {
    expect(GROUP_BUY_REFUND_METHODS).toEqual(["credit", "crypto"]);
    expect(GROUP_BUY_REFUND_STATUSES).toEqual([
      "requested",
      "verifying",
      "verification_failed",
      "completed",
    ]);
    expect(GROUP_BUY_REFUND_ASSETS).toEqual(["USDC", "USDT"]);
    expect(GROUP_BUY_REFUND_NETWORKS).toEqual(["Ethereum ERC-20"]);
  });

  it("uses decimal money columns and defaults refunds to disabled", () => {
    const groupBuyColumns = getTableConfig(groupBuysTable).columns;
    const accountColumns = getTableConfig(accountsTable).columns;
    const creditColumns = getTableConfig(creditTransactionsTable).columns;
    const orderColumns = getTableConfig(ordersTable).columns;

    expect(groupBuyColumns.find(column => column.name === "crypto_refunds_enabled")).toMatchObject({
      columnType: "PgBoolean",
      notNull: true,
      hasDefault: true,
      default: false,
    });

    for (const column of [
      accountColumns.find(column => column.name === "credits"),
      creditColumns.find(column => column.name === "amount"),
      orderColumns.find(column => column.name === "credits_applied"),
    ]) {
      expect(column).toMatchObject({
        columnType: "PgNumeric",
        notNull: true,
        precision: 10,
        scale: 2,
      });
    }
  });

  it("defines refund and attempt linkage with required lifecycle fields", () => {
    const refundColumns = getTableConfig(groupBuyRefundsTable).columns;
    const attemptColumns = getTableConfig(groupBuyRefundAttemptsTable).columns;

    expect(refundColumns.map(column => column.name)).toEqual(expect.arrayContaining([
      "id",
      "order_id",
      "group_buy_id",
      "account_id",
      "method",
      "status",
      "amount_usd",
      "asset",
      "network",
      "destination_wallet",
      "amount_base_units",
      "outgoing_txid",
      "confirmation_count",
      "explorer_url",
      "processor_username",
      "processor_role",
      "verification_error",
      "requested_at",
      "verifying_at",
      "failed_at",
      "completed_at",
      "created_at",
      "updated_at",
    ]));
    expect(attemptColumns.map(column => column.name)).toEqual(expect.arrayContaining([
      "id",
      "refund_id",
      "submitted_txid",
      "processor_username",
      "processor_role",
      "started_at",
      "completed_at",
      "result_code",
      "failure_reason",
      "created_at",
    ]));
  });

  it("uses SQL predicates for active-refund, txid, and credit-ledger uniqueness", () => {
    const refundIndexes = getTableConfig(groupBuyRefundsTable).indexes;
    const creditIndexes = getTableConfig(creditTransactionsTable).indexes;

    expect(refundIndexes.map(index => index.config.name)).toEqual(expect.arrayContaining([
      "group_buy_refunds_active_order_unique",
      "group_buy_refunds_outgoing_txid_unique",
    ]));
    expect(creditIndexes.map(index => index.config.name)).toContain(
      "credit_transactions_account_refund_unique",
    );

    for (const index of [
      ...refundIndexes,
      ...creditIndexes,
    ]) {
      if (index.config.name?.includes("unique")) {
        expect(index.config.where).toBeDefined();
      }
    }
  });

  it("declares database checks for literals, positive amounts, and method-specific fields", () => {
    expect(getTableConfig(groupBuyRefundsTable).checks.length).toBeGreaterThanOrEqual(4);
  });
});