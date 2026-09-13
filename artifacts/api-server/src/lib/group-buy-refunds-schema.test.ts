import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { readFileSync } from "node:fs";
import {
  GROUP_BUY_REFUND_ASSETS,
  GROUP_BUY_REFUND_METHODS,
  GROUP_BUY_REFUND_NETWORKS,
  GROUP_BUY_REFUND_STATUSES,
  accountsTable,
  creditTransactionsTable,
  groupBuyRefundAttemptsTable,
  groupBuyRefundTransitionOutboxTable,
  groupBuyRefundNotificationsTable,
  groupBuyRefundTxClaimsTable,
  groupBuyRefundsTable,
  groupBuysTable,
  ordersTable,
} from "@workspace/db/schema";

describe("group buy refund schema contract", () => {
  const sqlText = (expression: any) =>
    expression.queryChunks.map((chunk: any) => chunk.name ?? chunk.value?.join("") ?? "").join("");

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
        columnType: "PgNumericNumber",
        dataType: "number",
        notNull: true,
        precision: 10,
        scale: 2,
      });
    }
  });

  it("keeps numeric(10,2) values within the expected signed range", () => {
    const moneyColumns = [
      getTableConfig(accountsTable).columns.find(column => column.name === "credits"),
      getTableConfig(creditTransactionsTable).columns.find(column => column.name === "amount"),
      getTableConfig(ordersTable).columns.find(column => column.name === "credits_applied"),
    ];
    const maximum = 10 ** (10 - 2) - 10 ** -2;

    expect(maximum.toFixed(2)).toBe("99999999.99");
    expect((-maximum).toFixed(2)).toBe("-99999999.99");
    for (const column of moneyColumns) {
      expect(column).toMatchObject({ precision: 10, scale: 2 });
    }
  });

  it("keeps the startup fallback aligned with the numeric order schema", () => {
    const source = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

    expect(source).toContain(
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS credits_applied numeric(10,2) NOT NULL DEFAULT 0",
    );
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
      "verification_error_code",
      "verification_error_message",
      "requested_at",
      "verifying_at",
      "failed_at",
      "completed_at",
      "created_at",
      "updated_at",
      "processing_attempt_id",
    ]));
    expect(attemptColumns.map(column => column.name)).toEqual(expect.arrayContaining([
      "id",
      "refund_id",
      "submitted_txid",
      "processor_username",
      "processor_role",
      "started_at",
      "ended_at",
      "result_code",
      "failure_reason",
      "created_at",
    ]));
    expect(getTableConfig(groupBuyRefundTxClaimsTable).columns.map(column => column.name)).toEqual(
      expect.arrayContaining(["txid", "refund_id", "created_at"]),
    );
    expect(getTableConfig(groupBuyRefundTransitionOutboxTable).columns.map(column => column.name)).toEqual(
      expect.arrayContaining([
        "refund_id", "attempt_id", "transition", "processor_username",
        "processor_role", "submitted_txid", "result_code", "delivered_at",
      "attempt_count", "last_attempt_at", "last_error",
      ]),
    );
    expect(refundColumns.map(column => column.name)).not.toContain("verification_error");
    expect(attemptColumns.map(column => column.name)).not.toContain("completed_at");
  });

  it("uses SQL predicates for active-refund, txid, and credit-ledger uniqueness", () => {
    const refundIndexes = getTableConfig(groupBuyRefundsTable).indexes;
    const creditIndexes = getTableConfig(creditTransactionsTable).indexes;

    expect(refundIndexes.map(index => index.config.name)).toEqual(expect.arrayContaining([
      "group_buy_refunds_active_order_unique",
      "group_buy_refunds_outgoing_txid_unique",
    ]));
    expect(getTableConfig(groupBuyRefundAttemptsTable).indexes.map(index => index.config.name))
      .not.toContain("group_buy_refund_attempts_txid_unique");
    expect(getTableConfig(groupBuyRefundTransitionOutboxTable).indexes.map(index => index.config.name))
      .toEqual(expect.arrayContaining([
        "group_buy_refund_transition_outbox_unique",
        "group_buy_refund_transition_outbox_pending_idx",
      ]));
    expect(getTableConfig(groupBuyRefundNotificationsTable).indexes.map(index => index.config.name))
      .toContain("group_buy_refund_notifications_pending_idx");
    const auditPending = getTableConfig(groupBuyRefundTransitionOutboxTable).indexes
      .find(index => index.config.name === "group_buy_refund_transition_outbox_pending_idx");
    const notificationPending = getTableConfig(groupBuyRefundNotificationsTable).indexes
      .find(index => index.config.name === "group_buy_refund_notifications_pending_idx");
    expect(sqlText(auditPending!.config.where!)).toBe("delivered_at is null");
    expect(sqlText(notificationPending!.config.where!)).toBe("sent_at is null");
    expect(getTableConfig(groupBuyRefundTransitionOutboxTable).checks.map(checkConstraint => checkConstraint.name))
      .toContain("group_buy_refund_transition_outbox_txid_nonempty");
    expect(creditIndexes.map(index => index.config.name)).toContain(
      "credit_transactions_account_refund_unique",
    );
    expect(creditIndexes.map(index => index.config.name)).toContain(
      "credit_transactions_account_operation_unique",
    );

    const activeIndex = refundIndexes.find(index => index.config.name === "group_buy_refunds_active_order_unique");
    const txidIndex = refundIndexes.find(index => index.config.name === "group_buy_refunds_outgoing_txid_unique");
    const ledgerIndex = creditIndexes.find(index => index.config.name === "credit_transactions_account_refund_unique");
    const operationIndex = creditIndexes.find(index => index.config.name === "credit_transactions_account_operation_unique");

    expect(sqlText(activeIndex!.config.where!)).toBe(
      "status in ('requested', 'verifying', 'verification_failed')",
    );
    expect(sqlText(txidIndex!.config.where!)).toBe("outgoing_txid is not null");
    expect(sqlText(ledgerIndex!.config.where!)).toBe("refund_id is not null");
    expect((ledgerIndex!.config.columns as any[]).map(column => column.name)).toEqual([
      "account_username",
      "refund_id",
    ]);
    expect(sqlText(operationIndex!.config.where!)).toBe("operation_key is not null");
    expect((operationIndex!.config.columns as any[]).map(column => column.name)).toEqual([
      "account_username",
      "operation_key",
    ]);
    expect(getTableConfig(creditTransactionsTable).columns.find(column => column.name === "refund_id")).toMatchObject({
      notNull: false,
    });
  });

  it("declares database checks for literals, positive amounts, and method-specific fields", () => {
    const refundConfig = getTableConfig(groupBuyRefundsTable);
    const checkSqlByName = new Map(
      refundConfig.checks.map((check: any) => [check.name, sqlText(check.value)]),
    );

    expect(checkSqlByName.get("group_buy_refunds_method_check")).toBe(
      "method in ('credit', 'crypto')",
    );
    expect(checkSqlByName.get("group_buy_refunds_status_check")).toBe(
      "status in ('requested', 'verifying', 'verification_failed', 'completed')",
    );
    expect(checkSqlByName.get("group_buy_refunds_positive_amount_check")).toBe("amount_usd > 0");
    expect(checkSqlByName.get("group_buy_refunds_method_fields_check")).toContain(
      "method = 'credit'",
    );
    expect(checkSqlByName.get("group_buy_refunds_method_fields_check")).toContain(
      "method = 'crypto'",
    );
  });

  it("declares refund foreign keys to the order, group buy, and account identities", () => {
    const foreignKeys = getTableConfig(groupBuyRefundsTable).foreignKeys.map((foreignKey: any) => {
      const reference = foreignKey.reference();
      const foreignTable = reference.foreignTable[Symbol.for("drizzle:Name")];
      return {
        relation: `${reference.columns[0].name}->${foreignTable}.${reference.foreignColumns[0].name}`,
        onDelete: foreignKey.onDelete,
        onUpdate: foreignKey.onUpdate,
      };
    });

    expect(foreignKeys).toEqual(expect.arrayContaining([
      { relation: "order_id->orders.id", onDelete: "restrict", onUpdate: "restrict" },
      { relation: "group_buy_id->group_buys.id", onDelete: "restrict", onUpdate: "restrict" },
      { relation: "account_id->accounts.telegram_username", onDelete: "restrict", onUpdate: "restrict" },
    ]));
  });

  it("retains refund-linked financial history and indexes operational lookup paths", () => {
    const refundConfig = getTableConfig(groupBuyRefundsTable);
    const attemptConfig = getTableConfig(groupBuyRefundAttemptsTable);
    const creditConfig = getTableConfig(creditTransactionsTable);
    const refundForeignKey = (config: any, relation: string) => {
      const foreignKey = config.foreignKeys.find((candidate: any) => {
        const reference = candidate.reference();
        return `${reference.columns[0].name}->${reference.foreignTable[Symbol.for("drizzle:Name")]}.${reference.foreignColumns[0].name}` === relation;
      });
      expect(foreignKey).toBeDefined();
      return foreignKey!;
    };

    expect(refundForeignKey(attemptConfig, "refund_id->group_buy_refunds.id")).toMatchObject({
      onDelete: "restrict",
      onUpdate: "restrict",
    });
    expect(refundForeignKey(creditConfig, "refund_id->group_buy_refunds.id")).toMatchObject({
      onDelete: "restrict",
      onUpdate: "restrict",
    });

    const indexColumns = (config: any, name: string) => {
      const index = config.indexes.find((candidate: any) => candidate.config.name === name);
      expect(index).toBeDefined();
      return (index!.config.columns as any[]).map((column: any) => column.name);
    };

    expect(indexColumns(refundConfig, "group_buy_refunds_order_id_idx")).toEqual(["order_id"]);
    expect(indexColumns(refundConfig, "group_buy_refunds_group_buy_status_idx")).toEqual([
      "group_buy_id",
      "status",
      "requested_at",
      "id",
    ]);
    expect(indexColumns(attemptConfig, "group_buy_refund_attempts_refund_started_idx")).toEqual([
      "refund_id",
      "started_at",
    ]);
  });
});