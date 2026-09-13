# Group Buy Refunds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-enabled, full-refund workflow for eligible personal group-buy orders, supporting exact account-credit refunds and independently verified Ethereum ERC-20 USDC/USDT refunds without trusting client-supplied payment or amount data.

**Architecture:** Keep refund state in dedicated `group_buy_refunds` and append-only `group_buy_refund_attempts` records, with database constraints and a partial active-refund index. Put eligibility, decimal money conversion, mutation blocking, credit completion, and crypto verification in focused server services; route handlers only authenticate, scope, validate input, call those services, and shape responses. Complete every refund in a transaction that locks the refund, order, group buy, and account when credits change, and use conditional writes for idempotency.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM/PostgreSQL, Zod, Vitest, React, TanStack Query, existing Telegram/audit helpers, and the existing Ethereum JSON-RPC payment-verification boundary. The existing account, admin, and organiser refund routes use `fetch` rather than generated OpenAPI hooks, so this plan does not add unrelated OpenAPI/codegen files; if an endpoint is later moved into the generated client, update `lib/api-spec/openapi.yaml` first and run the repository codegen command before consuming it.

---

## Implementation map

Create focused files rather than expanding the already-large route and page files with a second workflow:

- `lib/db/src/schema/group_buy_refunds.ts` — refund, processing-attempt, and notification-marker tables plus literal status/method/asset/network types.
- `lib/db/src/schema/group_buys.ts` — persisted `cryptoRefundsEnabled` setting.
- `lib/db/src/schema/accounts.ts` — decimal-compatible account credit column.
- `lib/db/src/schema/credit_transactions.ts` — decimal-compatible ledger amount and refund linkage.
- `lib/db/src/schema/orders.ts` — decimal-compatible `creditsApplied`.
- `lib/db/src/schema/index.ts` — export refund tables/types.
- `artifacts/api-server/src/lib/refund-money.ts` — exact two-decimal-to-six-decimal conversion and fixed-point arithmetic.
- `artifacts/api-server/src/lib/refund-eligibility.ts` — server-owned eligibility and stable reason codes.
- `artifacts/api-server/src/lib/group-buy-refund.ts` — request creation, credit completion, processor claims, and response shaping.
- `artifacts/api-server/src/lib/refund-crypto-verifier.ts` — exact Ethereum chain/receipt/log verification.
- `artifacts/api-server/src/lib/refund-mutation-guard.ts` — reusable active-refund mutation guard.
- `artifacts/api-server/src/routes/group-buy-refunds.ts` — customer, admin, and organiser refund endpoints.
- `artifacts/api-server/src/routes/index.ts` — mount the refund router.
- `artifacts/api-server/src/routes/group-buys-admin.ts` — admin-only setting create/update.
- `artifacts/api-server/src/routes/organiser.ts` — reject organiser attempts to change the admin-only setting.
- `artifacts/api-server/src/lib/telegram-registry.ts` and `artifacts/api-server/src/lib/refund-notifications.ts` — lifecycle notification templates and idempotent delivery.
- `artifacts/api-server/src/routes/account.ts`, `orders.ts`, `admin.ts`, `group-buys-admin.ts`, `organiser.ts`, `admin-dispatch.ts`, `dispatch-scoped.ts`, `wholesale-shares.ts`, and `lib/order-payment-auto-verify.ts` — apply the mutation guard at every refund-sensitive write.
- `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.ts` — preserve the existing “creator’s personal order only” payment update while adding the refund guard.
- `artifacts/peps-anonymous/src/components/CustomerRefundPanel.tsx` — customer request/status UI.
- `artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.tsx` — reusable admin/organiser queue and processor UI.
- `artifacts/peps-anonymous/src/components/admin/group-buys/shared/core.tsx`, `DetailsPanel.tsx`, `GbDetailShell.tsx`, `Admin.tsx`, `GbOrganiser.tsx`, `AccountOrderDetail.tsx`, and `hooks/use-account.ts` — integrate the setting, queues, order summary data, and customer panel.
- `artifacts/api-server/src/lib/refund-money.test.ts`, `refund-eligibility.test.ts`, `group-buy-refund.test.ts`, `refund-crypto-verifier.test.ts`, `refund-mutation-guard.test.ts`, `routes/__tests__/group-buy-refunds.test.ts`, `routes/__tests__/group-buy-refund-mutation-guard.test.ts`, and `lib/wholesale-organiser-payment-confirmation.test.ts` — focused red/green unit, transaction, route, security, and regression coverage.

The normal development schema path is `pnpm --filter @workspace/db run push`; do not add startup-time production migration SQL to `artifacts/api-server/src/index.ts`, and do not create a second migration runner.

### Task 1: Add constrained refund schema and decimal credit compatibility

**Files:**
- Create: `lib/db/src/schema/group_buy_refunds.ts`
- Modify: `lib/db/src/schema/group_buys.ts`
- Modify: `lib/db/src/schema/accounts.ts`
- Modify: `lib/db/src/schema/credit_transactions.ts`
- Modify: `lib/db/src/schema/orders.ts`
- Modify: `lib/db/src/schema/index.ts`
- Create: `artifacts/api-server/src/lib/refund-schema.test.ts`

- [ ] **Step 1: Write the failing schema contract test**

```ts
// artifacts/api-server/src/lib/refund-schema.test.ts
import { describe, expect, it } from "vitest";
import {
  GROUP_BUY_REFUND_METHODS,
  GROUP_BUY_REFUND_STATUSES,
  GROUP_BUY_REFUND_ASSETS,
  GROUP_BUY_REFUND_NETWORKS,
  groupBuyRefundsTable,
  groupBuyRefundAttemptsTable,
} from "@workspace/db";

describe("group-buy refund schema", () => {
  it("exports the supported literal values and dedicated tables", () => {
    expect(GROUP_BUY_REFUND_METHODS).toEqual(["credit", "crypto"]);
    expect(GROUP_BUY_REFUND_STATUSES).toEqual(["requested", "verifying", "verification_failed", "completed"]);
    expect(GROUP_BUY_REFUND_ASSETS).toEqual(["USDC", "USDT"]);
    expect(GROUP_BUY_REFUND_NETWORKS).toEqual(["Ethereum ERC-20"]);
    expect(groupBuyRefundsTable).toBeDefined();
    expect(groupBuyRefundAttemptsTable).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the schema test and confirm the red failure**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-schema.test.ts`

Expected: FAIL because the refund constants and tables do not exist.

- [ ] **Step 3: Define the group-buy setting and decimal-compatible columns**

In `lib/db/src/schema/group_buys.ts`, add `cryptoRefundsEnabled: boolean("crypto_refunds_enabled").notNull().default(false)` next to the other persisted payment settings. In `lib/db/src/schema/accounts.ts`, replace the current integer declaration with `numeric("credits", { precision: 10, scale: 2, mode: "number" })`; in `lib/db/src/schema/credit_transactions.ts`, use the same numeric declaration for `amount`, add `refundId: text("refund_id")`, and add a unique constraint on `(accountUsername, refundId)` for non-null refund IDs through a partial unique index. In `lib/db/src/schema/orders.ts`, change `creditsApplied` to `numeric("credits_applied", { precision: 10, scale: 2, mode: "number" }).notNull().default("0")`. Preserve the existing public response shape by converting these values to numbers at route boundaries.

- [ ] **Step 4: Add the constrained refund and attempt tables**

Implement the following complete shape in `lib/db/src/schema/group_buy_refunds.ts` (use `check`, `index`, and `uniqueIndex` from `drizzle-orm/pg-core`; use `ordersTable`, `groupBuysTable`, and `accountsTable` references):

```ts
import {
  boolean, check, index, integer, numeric, pgTable, text, timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { groupBuysTable } from "./group_buys";
import { ordersTable } from "./orders";

export const GROUP_BUY_REFUND_METHODS = ["credit", "crypto"] as const;
export type GroupBuyRefundMethod = typeof GROUP_BUY_REFUND_METHODS[number];
export const GROUP_BUY_REFUND_STATUSES = [
  "requested", "verifying", "verification_failed", "completed",
] as const;
export type GroupBuyRefundStatus = typeof GROUP_BUY_REFUND_STATUSES[number];
export const GROUP_BUY_REFUND_ASSETS = ["USDC", "USDT"] as const;
export type GroupBuyRefundAsset = typeof GROUP_BUY_REFUND_ASSETS[number];
export const GROUP_BUY_REFUND_NETWORKS = ["Ethereum ERC-20"] as const;
export type GroupBuyRefundNetwork = typeof GROUP_BUY_REFUND_NETWORKS[number];

export const groupBuyRefundsTable = pgTable("group_buy_refunds", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername),
  method: text("method").notNull(),
  status: text("status").notNull().default("requested"),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  asset: text("asset"),
  network: text("network"),
  destinationWallet: text("destination_wallet"),
  tokenBaseUnits: text("token_base_units"),
  tokenDecimals: integer("token_decimals"),
  outgoingTxid: text("outgoing_txid"),
  confirmationCount: integer("confirmation_count"),
  explorerUrl: text("explorer_url"),
  processorUsername: text("processor_username"),
  processorRole: text("processor_role"),
  verificationErrorCode: text("verification_error_code"),
  verificationErrorMessage: text("verification_error_message"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  verificationStartedAt: timestamp("verification_started_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("group_buy_refunds_order_idx").on(t.orderId),
  index("group_buy_refunds_group_buy_status_idx").on(t.groupBuyId, t.status),
  uniqueIndex("group_buy_refunds_active_order_idx")
    .on(t.orderId)
    .where(check("group_buy_refunds_active_status_check", `${t.status.name} IN ('requested','verifying','verification_failed')`)),
  uniqueIndex("group_buy_refunds_outgoing_txid_idx")
    .on(t.outgoingTxid)
    .where(check("group_buy_refunds_txid_not_null_check", `${t.outgoingTxid.name} IS NOT NULL`)),
  check("group_buy_refunds_method_check", `${t.method.name} IN ('credit','crypto')`),
  check("group_buy_refunds_status_check", `${t.status.name} IN ('requested','verifying','verification_failed','completed')`),
  check("group_buy_refunds_amount_check", `${t.amountUsd.name} > 0`),
  check("group_buy_refunds_crypto_fields_check",
    `(${t.method.name} = 'credit' AND ${t.asset.name} IS NULL AND ${t.network.name} IS NULL AND ${t.destinationWallet.name} IS NULL AND ${t.tokenBaseUnits.name} IS NULL) OR ` +
    `(${t.method.name} = 'crypto' AND ${t.asset.name} IN ('USDC','USDT') AND ${t.network.name} = 'Ethereum ERC-20' AND ${t.destinationWallet.name} IS NOT NULL AND ${t.tokenBaseUnits.name} IS NOT NULL AND ${t.tokenDecimals.name} = 6)`),
]);

export const groupBuyRefundAttemptsTable = pgTable("group_buy_refund_attempts", {
  id: text("id").primaryKey(),
  refundId: text("refund_id").notNull().references(() => groupBuyRefundsTable.id, { onDelete: "cascade" }),
  submittedTxid: text("submitted_txid").notNull(),
  processorUsername: text("processor_username").notNull(),
  processorRole: text("processor_role").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  resultCode: text("result_code"),
  failureReason: text("failure_reason"),
}, (t) => [
  index("group_buy_refund_attempts_refund_idx").on(t.refundId, t.startedAt),
]);

export type GroupBuyRefund = typeof groupBuyRefundsTable.$inferSelect;
export type NewGroupBuyRefund = typeof groupBuyRefundsTable.$inferInsert;
export type GroupBuyRefundAttempt = typeof groupBuyRefundAttemptsTable.$inferSelect;
```

Use a `uniqueIndex(...).where(sql\`\${t.status} IN (...)\`)` expression if the installed Drizzle version rejects `check` in a partial-index predicate; the resulting PostgreSQL index must be `WHERE status IN ('requested','verifying','verification_failed')`, not a global `order_id` unique constraint, because completed history is retained.

- [ ] **Step 5: Export the schema and run the test green**

Add `export * from "./group_buy_refunds";` to `lib/db/src/schema/index.ts`, then run:

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-schema.test.ts`

Expected: PASS.

- [ ] **Step 6: Apply the schema through the normal development Drizzle path**

Run: `pnpm --filter @workspace/db run push`

Expected: Drizzle applies `crypto_refunds_enabled`, the decimal type changes, refund tables, constraints, indexes, and `refund_id` without adding startup migration code. Inspect the generated SQL/output and verify with PostgreSQL that `accounts.credits`, `credit_transactions.amount`, and `orders.credits_applied` are `numeric(10,2)`, and that the active-order and outgoing-TXID indexes are partial unique indexes.

- [ ] **Step 7: Commit the independently reviewable schema change**

```bash
git add lib/db/src/schema/group_buy_refunds.ts lib/db/src/schema/group_buys.ts lib/db/src/schema/accounts.ts lib/db/src/schema/credit_transactions.ts lib/db/src/schema/orders.ts lib/db/src/schema/index.ts artifacts/api-server/src/lib/refund-schema.test.ts
git commit -m "feat: add group buy refund schema"
```

### Task 2: Build exact money, wallet, and server-owned eligibility primitives

**Files:**
- Create: `artifacts/api-server/src/lib/refund-money.ts`
- Create: `artifacts/api-server/src/lib/refund-eligibility.ts`
- Create: `artifacts/api-server/src/lib/refund-money.test.ts`
- Create: `artifacts/api-server/src/lib/refund-eligibility.test.ts`
- Modify: `artifacts/api-server/src/routes/account.ts`
- Modify: `artifacts/api-server/src/routes/orders.ts`
- Modify: `artifacts/api-server/src/lib/wholesale-access-auto-verify.ts`

- [ ] **Step 1: Write failing fixed-point and eligibility tests**

```ts
// artifacts/api-server/src/lib/refund-money.test.ts
import { describe, expect, it } from "vitest";
import { usdToSixDecimalBaseUnits, centsToUsdString, addMoney, subtractMoney } from "./refund-money";

describe("refund fixed-point money", () => {
  it("converts decimal USD without floating point", () => {
    expect(usdToSixDecimalBaseUnits("123.45")).toBe("123450000");
    expect(usdToSixDecimalBaseUnits("0.01")).toBe("10000");
    expect(usdToSixDecimalBaseUnits("10")).toBe("10000000");
  });

  it("rejects values with more than two USD decimals and non-positive values", () => {
    expect(() => usdToSixDecimalBaseUnits("1.001")).toThrow("amount_usd_precision");
    expect(() => usdToSixDecimalBaseUnits("0.00")).toThrow("amount_usd_positive");
    expect(() => usdToSixDecimalBaseUnits("1e2")).toThrow("amount_usd_format");
  });

  it("keeps account credits at exact cents", () => {
    expect(addMoney("12.10", "0.35")).toBe("12.45");
    expect(subtractMoney("12.45", "0.35")).toBe("12.10");
    expect(centsToUsdString(12345n)).toBe("123.45");
  });
});
```

```ts
// artifacts/api-server/src/lib/refund-eligibility.test.ts
import { describe, expect, it } from "vitest";
import { evaluateRefundEligibility } from "./refund-eligibility";

const base = {
  accountId: "buyer",
  order: {
    id: "order-1", telegramUsername: "@buyer", groupBuyId: "gb-1",
    deletedAt: null, status: "Submitted", paymentStatus: "confirmed",
    paymentTxHash: "0x" + "a".repeat(64), paymentConfirmedAt: new Date(),
    paymentCryptoCurrency: "USDT", paymentCryptoNetwork: "ERC-20",
    paymentUsdAmount: "10.25", grandTotal: "10.25", paymentScreenshot: null,
  },
  groupBuy: { id: "gb-1", cryptoRefundsEnabled: true },
  activeRefund: null,
};

describe("refund eligibility", () => {
  it("uses the order grandTotal, not paymentUsdAmount or a client amount", () => {
    const result = evaluateRefundEligibility(base);
    expect(result.eligible).toBe(true);
    expect(result.amountUsd).toBe("10.25");
  });

  it.each([
    ["refunds_disabled", { groupBuy: { ...base.groupBuy, cryptoRefundsEnabled: false } }],
    ["not_owner", { accountId: "another" }],
    ["ineligible_payment_evidence", { order: { ...base.order, paymentTxHash: null } }],
    ["already_cancelled", { order: { ...base.order, status: "Cancelled" } }],
    ["active_refund_exists", { activeRefund: { id: "refund-1", status: "requested" } }],
  ])("returns stable reason %s", (reasonCode, patch) => {
    const result = evaluateRefundEligibility({ ...base, ...patch } as typeof base);
    expect(result).toMatchObject({ eligible: false, reasonCode });
  });
});
```

- [ ] **Step 2: Run both tests to verify they fail**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-money.test.ts src/lib/refund-eligibility.test.ts`

Expected: FAIL because the fixed-point functions and eligibility evaluator do not exist.

- [ ] **Step 3: Implement fixed-point helpers with explicit interfaces**

Implement `refund-money.ts` with no `number` arithmetic in the conversion path:

```ts
export function usdToSixDecimalBaseUnits(usd: string): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(usd)) throw new Error("amount_usd_format");
  const [whole, fraction = ""] = usd.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  if (cents <= 0n) throw new Error("amount_usd_positive");
  return (cents * 10_000n).toString();
}

export function addMoney(left: string, right: string): string {
  return centsToUsdString(usdToCents(left) + usdToCents(right));
}

export function subtractMoney(left: string, right: string): string {
  const result = usdToCents(left) - usdToCents(right);
  if (result < 0n) throw new Error("money_negative");
  return centsToUsdString(result);
}

export function usdToCents(usd: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(usd)) throw new Error("amount_usd_format");
  const [whole, fraction = ""] = usd.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

export function centsToUsdString(cents: bigint): string {
  if (cents < 0n) throw new Error("money_negative");
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}
```

Add `isValidEthAddress` reuse from `artifacts/api-server/src/lib/payment-verify.ts`, but validate the normalized destination again in the request service. Define request input as:

```ts
export type RefundRequestInput =
  | { method: "credit" }
  | { method: "crypto"; asset: "USDC" | "USDT"; network: "Ethereum ERC-20"; destinationWallet: string };
```

- [ ] **Step 4: Implement server-owned eligibility and stable reason codes**

Define:

```ts
export const REFUND_ELIGIBILITY_CODES = [
  "refunds_disabled", "not_owner", "not_group_buy_order", "deleted_order",
  "ineligible_payment_evidence", "already_cancelled", "already_refunded",
  "non_positive_total", "active_refund_exists",
] as const;
export type RefundEligibilityCode = typeof REFUND_ELIGIBILITY_CODES[number];
export type RefundEligibility = {
  eligible: boolean;
  reasonCode: RefundEligibilityCode | null;
  amountUsd: string | null;
};
```

`evaluateRefundEligibility` must require the authenticated account to match the order username (accepting the existing `@user` and `user` legacy forms), a non-null group buy and non-deleted order, `paymentStatus === "confirmed"`, `paymentConfirmedAt !== null`, a non-empty `paymentTxHash` or authoritative entry in `paymentTxHashes`, positive persisted `grandTotal`, and status not in `["Cancelled"]` with no `refundStatus === "refunded"`. Explicitly reject `test_confirmed`, screenshot-only evidence, and values from request bodies. Return `amountUsd: String(order.grandTotal)` on success.

- [ ] **Step 5: Replace whole-credit assumptions at existing credit boundaries**

In `artifacts/api-server/src/routes/account.ts`, `orders.ts`, and `lib/wholesale-access-auto-verify.ts`, replace `Math.floor`, `Math.round`, integer subtraction, and direct numeric addition for account credits with `usdToCents`/`centsToUsdString`. A credit application must use the exact requested two-decimal amount, capped by the locked account balance and the order’s remaining total, and write a numeric string plus a numeric `credit_transactions.amount`. For example:

```ts
const availableCents = usdToCents(String(account.credits ?? "0"));
const requestedCents = usdToCents(String(amount));
const remainingCents = usdToCents(String(order.grandTotal)) - usdToCents(String(order.creditsApplied ?? "0"));
const deductedCents = [availableCents, requestedCents, remainingCents]
  .reduce((min, value) => value < min ? value : min);
const deducted = centsToUsdString(deductedCents);
```

Keep response fields as JSON numbers (`Number(deducted)`) for current UI compatibility, but persist `"0.35"` exactly. Ensure `payments.ts` and `order-payment-auto-verify.ts` parse decimal `creditsApplied` as a string before any subtraction.

- [ ] **Step 6: Run the primitive tests green**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-money.test.ts src/lib/refund-eligibility.test.ts`

Expected: PASS, including the rejection of client-only/test evidence and exact `$123.45` conversion.

- [ ] **Step 7: Commit the primitive change**

```bash
git add artifacts/api-server/src/lib/refund-money.ts artifacts/api-server/src/lib/refund-eligibility.ts artifacts/api-server/src/lib/refund-money.test.ts artifacts/api-server/src/lib/refund-eligibility.test.ts artifacts/api-server/src/routes/account.ts artifacts/api-server/src/routes/orders.ts artifacts/api-server/src/lib/wholesale-access-auto-verify.ts
git commit -m "feat: add exact refund money and eligibility rules"
```

### Task 3: Implement transactional request creation and credit completion

**Files:**
- Create: `artifacts/api-server/src/lib/group-buy-refund.ts`
- Create: `artifacts/api-server/src/lib/group-buy-refund.test.ts`
- Modify: `artifacts/api-server/src/lib/refund-eligibility.ts`
- Modify: `lib/db/src/schema/group_buy_refunds.ts`

- [ ] **Step 1: Write failing service tests for snapshots, validation, and idempotency**

Cover these concrete cases in `group-buy-refund.test.ts` with the existing Vitest fake-DB transaction style used by `wholesale-organiser-payment-confirmation.test.ts`:

```ts
it("snapshots grandTotal and six-decimal token units, ignoring client amount", async () => {
  const result = await createRefundRequest(db, {
    accountId: "buyer",
    orderId: "order-1",
    input: { method: "crypto", asset: "USDC", network: "Ethereum ERC-20", destinationWallet: "0x1111111111111111111111111111111111111111" },
  });
  expect(result.amountUsd).toBe("123.45");
  expect(result.tokenBaseUnits).toBe("123450000");
  expect(insertedRefund.amountUsd).toBe("123.45");
  expect(insertedRefund.tokenBaseUnits).toBe("123450000");
});

it("returns the existing active record for a concurrent duplicate request", async () => {
  const first = await createRefundRequest(db, validCreditInput);
  const second = await createRefundRequest(db, validCreditInput);
  expect(second.id).toBe(first.id);
  expect(insertedRefunds).toHaveLength(1);
});

it("credits once and cancels the linked order atomically", async () => {
  const result = await completeCreditRefund(db, { refundId: "refund-1", processorUsername: "admin", processorRole: "admin" });
  expect(result.status).toBe("completed");
  expect(account.credits).toBe("123.45");
  expect(order).toMatchObject({ refundStatus: "refunded", status: "Cancelled", paymentStatus: "refunded" });
  expect(creditTransactions).toHaveLength(1);
  await completeCreditRefund(db, { refundId: "refund-1", processorUsername: "admin", processorRole: "admin" });
  expect(creditTransactions).toHaveLength(1);
});
```

Also assert invalid wallets, unsupported asset/network, disabled group buys, cancelled orders, `test_confirmed`, screenshot-only evidence, non-group-buy orders, and non-owner orders return the stable error code without inserting a refund.

- [ ] **Step 2: Run the service tests red**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/group-buy-refund.test.ts`

Expected: FAIL because the service functions do not exist.

- [ ] **Step 3: Define service contracts and request transaction**

Export:

```ts
export type RefundProcessor = {
  username: string;
  role: "admin" | "organiser";
  groupBuyId?: string;
};
export type RefundRequestResult = {
  id: string;
  status: GroupBuyRefundStatus;
  method: GroupBuyRefundMethod;
  amountUsd: string;
  asset: GroupBuyRefundAsset | null;
  network: GroupBuyRefundNetwork | null;
  destinationWallet: string | null;
  tokenBaseUnits: string | null;
};
export async function createRefundRequest(
  database: typeof db,
  input: { accountId: string; orderId: string; input: RefundRequestInput },
): Promise<RefundRequestResult>;
export async function completeCreditRefund(
  database: typeof db,
  processor: RefundProcessor & { refundId: string },
): Promise<RefundRequestResult>;
```

Inside one `database.transaction`, select the order, linked group buy, account, and any active refund; use `.for("update")` on order/group buy/account and re-run `evaluateRefundEligibility` under those locks. Normalize the destination to lowercase only after Ethereum address validation, derive `amountUsd` exclusively from `orders.grandTotal`, derive `tokenBaseUnits` with `usdToSixDecimalBaseUnits`, and insert the request plus an `audit_logs` row. Catch PostgreSQL unique-violation on the active-order index, reselect the active row, and return it rather than producing a second record.

- [ ] **Step 4: Implement credit completion as one locked transaction**

`completeCreditRefund` must:

1. Lock refund, order, group buy, and buyer account.
2. Check organiser scope before mutation (`processor.role === "admin"` or `groupBuy.organiserId === processor.username`).
3. Return the completed record unchanged if already completed.
4. Reject crypto records with `refund_method_mismatch`.
5. Add exact `amountUsd` to `accounts.credits` using cents arithmetic.
6. Insert one positive ledger row with `refundId`, `orderId`, reason `Group-buy refund for order #${order.code}`, and processor.
7. Conditionally update refund `requested|verification_failed -> completed`.
8. Conditionally update order with `refundStatus: "refunded"`, `refundedAt`, `status: "Cancelled"`, and `paymentStatus: "refunded"`.
9. Insert an audit row containing identity, role, source, transition, and stable result code but no wallet credentials.

Do not update the balance or ledger if the conditional refund update returns no row. If any write fails, allow the transaction to roll back and leave the refund retryable.

- [ ] **Step 5: Run the service tests green**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/group-buy-refund.test.ts`

Expected: PASS, including duplicate requests, exact decimal credits, duplicate credit prevention, disabled settings, and organiser scope.

- [ ] **Step 6: Commit the transactional domain service**

```bash
git add artifacts/api-server/src/lib/group-buy-refund.ts artifacts/api-server/src/lib/group-buy-refund.test.ts artifacts/api-server/src/lib/refund-eligibility.ts lib/db/src/schema/group_buy_refunds.ts
git commit -m "feat: add transactional group buy refund service"
```

### Task 4: Add exact Ethereum outgoing-transfer verification

**Files:**
- Create: `artifacts/api-server/src/lib/refund-crypto-verifier.ts`
- Create: `artifacts/api-server/src/lib/refund-crypto-verifier.test.ts`
- Modify: `artifacts/api-server/src/lib/payment-verify.ts`
- Modify: `artifacts/api-server/src/lib/group-buy-refund.ts`
- Modify: `lib/db/src/schema/group_buy_refunds.ts`

- [ ] **Step 1: Write failing verifier tests with deterministic JSON-RPC fixtures**

Use a mocked RPC boundary, not live public RPCs. The test fixture must contain `eth_chainId = "0x1"`, a receipt with `status = "0x1"`, `blockNumber = "0x64"`, a transaction whose `to` is the expected token contract, and a `Transfer` log with:

```ts
const transferLog = {
  address: ETH_USDC_CONTRACT,
  topics: [
    TRANSFER_TOPIC,
    `0x${"0".repeat(24)}${"2".repeat(40)}`,
    `0x${"0".repeat(24)}${"1".repeat(40)}`,
  ],
  data: "0x" + BigInt("123450000").toString(16).padStart(64, "0"),
};
```

Assert exact outcomes:

```ts
it("accepts the exact Ethereum USDC transfer after required confirmations", async () => {
  const result = await verifyRefundOutgoingTransfer({
    txid: "0x" + "a".repeat(64),
    asset: "USDC",
    network: "Ethereum ERC-20",
    destinationWallet: "0x1111111111111111111111111111111111111111",
    tokenBaseUnits: "123450000",
    rpc: fixtureRpc({ latestBlock: "0x70", logs: [transferLog] }),
    requiredConfirmations: 12,
  });
  expect(result).toEqual({ ok: true, confirmationCount: 13 });
});

it.each([
  ["wrong_token", { address: ETH_USDT_CONTRACT }],
  ["wrong_recipient", { topics: [TRANSFER_TOPIC, transferLog.topics[1], `0x${"0".repeat(24)}${"3".repeat(40)}`] }],
  ["wrong_amount", { data: "0x" + BigInt("123449999").toString(16).padStart(64, "0") }],
  ["failed_transaction", { receipt: { status: "0x0" } }],
  ["insufficient_confirmations", { latestBlock: "0x6f" }],
])("returns stable verification code %s", async (code, patch) => {
  await expect(verifyRefundOutgoingTransfer({ ...validInput, rpc: fixtureRpc(patch), requiredConfirmations: 12 }))
    .resolves.toMatchObject({ ok: false, code });
});
```

- [ ] **Step 2: Run verifier tests red**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-crypto-verifier.test.ts`

Expected: FAIL because the refund-specific verifier does not exist.

- [ ] **Step 3: Implement the exact verifier boundary**

Export:

```ts
export type RefundVerificationFailureCode =
  | "invalid_txid" | "wrong_network" | "wrong_token" | "wrong_recipient"
  | "wrong_amount" | "failed_transaction" | "transaction_not_found"
  | "insufficient_confirmations" | "provider_unavailable";
export type RefundVerificationResult =
  | { ok: true; confirmationCount: number; blockNumber: bigint }
  | { ok: false; code: RefundVerificationFailureCode; safeMessage: string; retryable: boolean; confirmationCount?: number };
export async function verifyRefundOutgoingTransfer(input: {
  txid: string;
  asset: "USDC" | "USDT";
  network: "Ethereum ERC-20";
  destinationWallet: string;
  tokenBaseUnits: string;
  rpc?: JsonRpcClient;
  requiredConfirmations: number;
}): Promise<RefundVerificationResult>;
```

Reuse `ETH_USDC_CONTRACT`, `ETH_USDT_CONTRACT`, `TRANSFER_TOPIC`, `ETH_RPC_ENDPOINTS`, and `isValidTxHash` from `payment-verify.ts`, but do not reuse its tolerance-based `number` amount comparison. Query `eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, and `eth_blockNumber`; require chain ID `0x1`, successful receipt, a token contract matching the selected asset, a `Transfer` log with the exact destination and `BigInt(data) === BigInt(tokenBaseUnits)`, and `latestBlock - receiptBlock + 1 >= requiredConfirmations`. Decode addresses from the last 40 hex characters of padded topics and compare lowercased addresses. Read `GROUP_BUY_REFUND_MIN_CONFIRMATIONS` from the environment with a positive default of `12`; invalid configuration must fail closed at startup/config access, not silently become zero.

- [ ] **Step 4: Add claim/attempt/re-lock processing**

Add `submitCryptoRefund(database, processor, refundId, txid)` to `group-buy-refund.ts`. Validate the txid before database work, then conditionally claim only `requested` or `verification_failed` rows into `verifying`, record one attempt with no secrets, independently call the verifier, and update the attempt result. Re-lock refund and order before completion; require the same attempt ID and txid still own the `verifying` row. On failure set `verification_failed`, `verificationErrorCode`, `verificationErrorMessage`, and `failedAt` while leaving order fields untouched. On success set immutable outgoing TXID, explorer URL `https://etherscan.io/tx/${txid}`, confirmation count, completed timestamps, order refund fields/status, and an audit row. A completed refund with the same TXID returns the existing result; a different TXID returns `completed_txid_immutable`. A globally unique outgoing TXID must return `txid_replay`.

- [ ] **Step 5: Run verifier and service tests green**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-crypto-verifier.test.ts src/lib/group-buy-refund.test.ts`

Expected: PASS for wrong token/network/recipient/amount, failed receipt, insufficient confirmations, replay, concurrent claims, successful cancellation, and idempotent same-TXID retry.

- [ ] **Step 6: Commit exact crypto verification**

```bash
git add artifacts/api-server/src/lib/refund-crypto-verifier.ts artifacts/api-server/src/lib/refund-crypto-verifier.test.ts artifacts/api-server/src/lib/payment-verify.ts artifacts/api-server/src/lib/group-buy-refund.ts lib/db/src/schema/group_buy_refunds.ts
git commit -m "feat: verify exact Ethereum refund transfers"
```

### Task 5: Add admin-only configuration, scoped processor APIs, and route tests

**Files:**
- Create: `artifacts/api-server/src/routes/group-buy-refunds.ts`
- Create: `artifacts/api-server/src/routes/__tests__/group-buy-refunds.test.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/routes/group-buys-admin.ts`
- Modify: `artifacts/api-server/src/routes/organiser.ts`

- [ ] **Step 1: Write failing route tests**

Build an Express app with the same router mounting and mocked `requireAdmin`, `requireAccount`, and `requireOrganiser` pattern used by `cross-router-role-isolation.test.ts`. Assert:

```ts
it("defaults new group buys to refunds disabled and only admin can toggle it", async () => {
  const created = await request.post("/admin/group-buys").send({ name: "GB" }).expect(201);
  expect(created.body.cryptoRefundsEnabled).toBe(false);
  await request.patch("/admin/group-buys/GB").send({ cryptoRefundsEnabled: true }).expect(200);
  await request.patch("/organiser/group-buys/GB").send({ cryptoRefundsEnabled: true }).expect(403);
});

it("scopes organiser queues and mutations to owned group buys on the server", async () => {
  await request.get("/organiser/group-buy-refunds?groupBuyId=not-owned").expect(404);
  await request.post("/organiser/group-buy-refunds/refund-outside-scope/credit-complete").expect(404);
  await request.get("/admin/group-buy-refunds?groupBuyId=any").expect(200);
});

it("never accepts a refund amount from the request body", async () => {
  const response = await request.post("/account/orders/order-1/refund").send({
    method: "crypto", asset: "USDC", network: "Ethereum ERC-20",
    destinationWallet: "0x1111111111111111111111111111111111111111", amountUsd: "0.01",
  }).expect(201);
  expect(response.body.amountUsd).toBe("123.45");
});
```

Add cases for disabled settings, ownership, unsupported input, active duplicate, admin all-GB access, organiser owned-only access, stable errors, and retrying a `verification_failed` record.

- [ ] **Step 2: Run route tests red**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-refunds.test.ts`

Expected: FAIL because the router and admin setting handling do not exist.

- [ ] **Step 3: Add the admin-only setting to existing group-buy routes**

In `group-buys-admin.ts`, read `cryptoRefundsEnabled` in POST/PATCH bodies, default POST to `false`, validate it as a boolean, and include it in the typed `updates` object. Emit an audit event when it changes. In `organiser.ts`, omit it from create/update payloads and return `403` with `{ code: "admin_only_setting" }` if the body contains it; do not let an organiser-created group buy opt in indirectly. Preserve history when an admin changes the setting to false.

- [ ] **Step 4: Implement customer and processor endpoints**

Mount `groupBuyRefundsRouter` from `routes/index.ts` after account/admin middleware is active. Implement these exact endpoints:

```text
POST /account/orders/:orderId/refund
GET  /admin/group-buy-refunds?groupBuyId=&status=
GET  /admin/group-buy-refunds/:refundId
POST /admin/group-buy-refunds/:refundId/credit-complete
POST /admin/group-buy-refunds/:refundId/verify
GET  /organiser/group-buy-refunds?groupBuyId=&status=
GET  /organiser/group-buy-refunds/:refundId
POST /organiser/group-buy-refunds/:refundId/credit-complete
POST /organiser/group-buy-refunds/:refundId/verify
```

Customer input is parsed as the `RefundRequestInput` union and the amount field is ignored/rejected; call `createRefundRequest` with `req.account!.telegramUsername` and `orderId`. Admin routes call `requireAdmin` and use `{ username: req.adminUsername ?? "admin", role: "admin" }`. Organiser routes call `requireOrganiser`, join the refund to `group_buys.organiser_id`, and require `gbOwner(req, refund.groupBuyId)` for both list and mutation. Never fetch all rows and filter in JavaScript. Queue rows include customer display username, order/group-buy IDs, method, asset/network, amount, destination, requested time, status, attempts, and safe verification failure. Map domain errors to the stable codes in the design with 400/403/404/409 statuses.

- [ ] **Step 5: Run route tests green**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-refunds.test.ts`

Expected: PASS, proving setting authorization and organiser scope are enforced by each server route, not by UI filtering.

- [ ] **Step 6: Commit APIs and scope**

```bash
git add artifacts/api-server/src/routes/group-buy-refunds.ts artifacts/api-server/src/routes/__tests__/group-buy-refunds.test.ts artifacts/api-server/src/routes/index.ts artifacts/api-server/src/routes/group-buys-admin.ts artifacts/api-server/src/routes/organiser.ts
git commit -m "feat: add scoped group buy refund APIs"
```

### Task 6: Add one reusable refund-sensitive mutation guard to every write path

**Files:**
- Create: `artifacts/api-server/src/lib/refund-mutation-guard.ts`
- Create: `artifacts/api-server/src/lib/refund-mutation-guard.test.ts`
- Create: `artifacts/api-server/src/routes/__tests__/group-buy-refund-mutation-guard.test.ts`
- Modify: `artifacts/api-server/src/routes/account.ts`
- Modify: `artifacts/api-server/src/routes/orders.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`
- Modify: `artifacts/api-server/src/routes/group-buys-admin.ts`
- Modify: `artifacts/api-server/src/routes/organiser.ts`
- Modify: `artifacts/api-server/src/routes/admin-dispatch.ts`
- Modify: `artifacts/api-server/src/routes/dispatch-scoped.ts`
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`
- Modify: `artifacts/api-server/src/lib/order-payment-auto-verify.ts`
- Modify: `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.ts`

- [ ] **Step 1: Write the failing guard tests**

```ts
// artifacts/api-server/src/lib/refund-mutation-guard.test.ts
import { describe, expect, it } from "vitest";
import { assertRefundMutationAllowed, REFUND_MUTATION_BLOCKED_CODE } from "./refund-mutation-guard";

describe("refund mutation guard", () => {
  it("blocks every active lifecycle state", async () => {
    for (const status of ["requested", "verifying", "verification_failed"] as const) {
      await expect(assertRefundMutationAllowed(fakeDbWithStatus(status), "order-1"))
        .rejects.toMatchObject({ code: REFUND_MUTATION_BLOCKED_CODE });
    }
  });

  it("allows no refund and allows a completed refund through the active guard", async () => {
    await expect(assertRefundMutationAllowed(fakeDbWithStatus(null), "order-1")).resolves.toBeUndefined();
    await expect(assertRefundMutationAllowed(fakeDbWithStatus("completed"), "order-1")).resolves.toBeUndefined();
  });
});
```

```ts
// artifacts/api-server/src/routes/__tests__/group-buy-refund-mutation-guard.test.ts
it.each([
  ["customer shipping address", () => post("/account/orders/order-1/shipping-address", validAddress)],
  ["organiser payment status", () => patch("/organiser/group-buys/gb-1/orders/order-1", { paymentStatus: "confirmed" })],
  ["admin route update", () => patch("/admin/group-buys/gb-1/orders/order-1/country-leg", { countryLegId: "leg-2" })],
  ["dispatch status", () => post("/admin/dispatch/confirm", { orderIds: ["order-1"] })],
  ["customer soft delete", () => deleteRequest("/account/orders/order-1")],
])("returns refund_active for %s", async (_label, action) => {
  await action().expect(409).expect(({ body }) => expect(body.code).toBe("refund_active"));
});
```

- [ ] **Step 2: Run both guard tests red**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-mutation-guard.test.ts src/routes/__tests__/group-buy-refund-mutation-guard.test.ts`

Expected: FAIL because the guard is absent and existing routes still write directly.

- [ ] **Step 3: Implement the guard with conditional-write support**

Export:

```ts
export const REFUND_MUTATION_BLOCKED_CODE = "refund_active";
export class RefundMutationBlockedError extends Error {
  readonly code = REFUND_MUTATION_BLOCKED_CODE;
  constructor(readonly orderId: string) {
    super("This order cannot be changed while its refund is being processed.");
  }
}
export async function assertRefundMutationAllowed(database: typeof db, orderId: string): Promise<void> {
  const [active] = await database.select({ id: groupBuyRefundsTable.id })
    .from(groupBuyRefundsTable)
    .where(and(
      eq(groupBuyRefundsTable.orderId, orderId),
      inArray(groupBuyRefundsTable.status, ["requested", "verifying", "verification_failed"]),
    ))
    .limit(1);
  if (active) throw new RefundMutationBlockedError(orderId);
}
```

Add a companion `refundMutableOrderWhere(orderId)` SQL predicate for update paths that can enforce the status in the same statement. The guard must not block reads, refund completion’s own locked writes, or already-completed/refunded protections.

- [ ] **Step 4: Apply the guard at customer, admin, organiser, dispatch, bulk, and background writes**

Before and inside each relevant transaction/update, call the guard or add its active-refund `NOT EXISTS` predicate to:

1. Customer order editing, line-item/quantity edits, address updates, QR uploads, deletion/restoration/cancellation, payment evidence/transaction/rate/network changes, add-ons, test votes, balance-payment writes, and `account/group-buys/:gbId/leave` in `account.ts` and `orders.ts`.
2. Admin order patch/financial edits, payment-status confirmation, soft delete/restore, group-buy order route/country-leg/bulk-route/bulk-add-product paths in `admin.ts` and `group-buys-admin.ts`.
3. Organiser order patch, manual order creation/edit, payment status, quantities, OOS, tracking, QR-posted, route/reassignment, and deletion paths in `organiser.ts` and `dispatch-scoped.ts`.
4. Dispatch confirmation, rollback, and bulk shipment writes in `admin-dispatch.ts`.
5. Wholesale shared-order member edits, delivery/address changes, removal, cancellation, and organiser confirmation paths in `wholesale-shares.ts`.
6. Background payment auto-verification and shared organiser payment confirmation before any order status/payment update.

Use the existing route’s authorization first, then return `409` JSON `{ error, code: "refund_active", orderId }`. Do not rely on disabled buttons. If a mutation updates multiple orders, lock/check all IDs and reject the whole operation before any write; do not partially mutate an unguarded subset.

- [ ] **Step 5: Add and run the organiser personal-order regression**

Extend `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts` with two member orders and assert the confirmation service updates only the creator order:

```ts
it("confirms only the organiser personal order", async () => {
  const result = await confirmWholesaleOrganiserPayment(db, {
    shareId: "share-1", source: "admin", txHash: "0x" + "a".repeat(64),
    currency: "USDT", network: "ERC-20", expectedCurrentParentStatus: "pending",
  });
  expect(result.kind).toBe("confirmed");
  expect(updatedOrderIds).toEqual(["organiser-personal-order"]);
  expect(memberOrder.paymentStatus).toBe("unpaid");
});
```

The service must continue locking the creator member/order and use `organiserOrderId` in the conditional update; it must not use `share.id`, the first member order, or an unscoped `inArray` update. If the creator order has an active refund, return `refund_active` and leave parent/member order statuses unchanged.

- [ ] **Step 6: Run guard and regression tests green**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-mutation-guard.test.ts src/routes/__tests__/group-buy-refund-mutation-guard.test.ts src/lib/wholesale-organiser-payment-confirmation.test.ts`

Expected: PASS for all representative customer/admin/organiser/dispatch/background paths and the personal-order payment-status regression.

- [ ] **Step 7: Commit mutation protection**

```bash
git add artifacts/api-server/src/lib/refund-mutation-guard.ts artifacts/api-server/src/lib/refund-mutation-guard.test.ts artifacts/api-server/src/routes/__tests__/group-buy-refund-mutation-guard.test.ts artifacts/api-server/src/routes/account.ts artifacts/api-server/src/routes/orders.ts artifacts/api-server/src/routes/admin.ts artifacts/api-server/src/routes/group-buys-admin.ts artifacts/api-server/src/routes/organiser.ts artifacts/api-server/src/routes/admin-dispatch.ts artifacts/api-server/src/routes/dispatch-scoped.ts artifacts/api-server/src/routes/wholesale-shares.ts artifacts/api-server/src/lib/order-payment-auto-verify.ts artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.ts artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts
git commit -m "feat: block order mutations during refunds"
```

### Task 7: Add lifecycle notifications and audit idempotency

**Files:**
- Create: `artifacts/api-server/src/lib/refund-notifications.ts`
- Create: `artifacts/api-server/src/lib/refund-notifications.test.ts`
- Modify: `lib/db/src/schema/group_buy_refunds.ts`
- Modify: `artifacts/api-server/src/lib/telegram-registry.ts`
- Modify: `artifacts/api-server/src/lib/group-buy-refund.ts`

- [ ] **Step 1: Write failing transition notification tests**

```ts
it("sends one notification per refund/status transition", async () => {
  await notifyRefundTransition(db, { refundId: "refund-1", status: "requested", accountId: "buyer", amountUsd: "10.00" });
  await notifyRefundTransition(db, { refundId: "refund-1", status: "requested", accountId: "buyer", amountUsd: "10.00" });
  expect(sentEventKeys).toEqual(["refund-1:requested"]);
  expect(notificationMarkers).toHaveLength(1);
});

it("never includes credentials or private keys in audit metadata", async () => {
  await auditRefundTransition(db, {
    refundId: "refund-1", transition: "completed", resultCode: "verified",
    txid: "0x" + "a".repeat(64), destinationWallet: "0x1111111111111111111111111111111111111111",
  });
  expect(JSON.stringify(auditMetadata)).not.toMatch(/private|secret|keyMaterial|password/i);
});
```

- [ ] **Step 2: Run notification tests red**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-notifications.test.ts`

Expected: FAIL because the marker table and notification service do not exist.

- [ ] **Step 3: Add a persisted unique notification marker and templates**

Add `groupBuyRefundNotificationsTable` to `group_buy_refunds.ts` with `id`, `refundId`, `accountId`, `status`, `eventKey`, `sentAt`, and unique `(refundId, status, accountId)`. Add registry defaults for `group_buy_refund_requested`, `group_buy_refund_verifying`, `group_buy_refund_failed`, and `group_buy_refund_completed`; use only non-sensitive template variables (`order_code`, `amount_usd`, `status`, `explorer_url`, `txid`). Implement `notifyRefundTransition` by inserting the marker with `onConflictDoNothing`, then calling `notifyUserFromTemplate` only when the insert returns a row. A failed Telegram send leaves the marker for deterministic transition idempotency and is recorded in existing Telegram logs without retrying the lifecycle transition.

- [ ] **Step 4: Wire audits and notifications to successful state transitions**

Call the helper only after the request/claim/failure/completion transaction commits, passing the transition’s stable result code. Audit rows must include refund/order/group-buy IDs, method, processor username/role, source (`customer`, `admin`, `organiser`, `background`), transition, result code, and TXID when applicable. Never log destination private material, RPC credentials, or raw request bodies. Request, verification begins, verification failure, and completion each produce one event, while retries produce no duplicate event.

- [ ] **Step 5: Run tests green**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/refund-notifications.test.ts src/lib/group-buy-refund.test.ts`

Expected: PASS with exactly one marker and audit per lifecycle transition.

- [ ] **Step 6: Commit notification/audit behavior**

```bash
git add artifacts/api-server/src/lib/refund-notifications.ts artifacts/api-server/src/lib/refund-notifications.test.ts lib/db/src/schema/group_buy_refunds.ts artifacts/api-server/src/lib/telegram-registry.ts artifacts/api-server/src/lib/group-buy-refund.ts
git commit -m "feat: add idempotent refund notifications and audits"
```

### Task 8: Integrate customer order-summary API and UI

**Files:**
- Create: `artifacts/peps-anonymous/src/components/CustomerRefundPanel.tsx`
- Modify: `artifacts/api-server/src/routes/account.ts`
- Modify: `artifacts/peps-anonymous/src/hooks/use-account.ts`
- Modify: `artifacts/peps-anonymous/src/pages/AccountOrderDetail.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/CustomerPortal.tsx`
- Create: `artifacts/peps-anonymous/src/components/customer-refund-contract.test.ts`

- [ ] **Step 1: Write the failing UI contract test**

Use the existing source-contract test style for large pages:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";

const detail = fs.readFileSync("src/pages/AccountOrderDetail.tsx", "utf8");
const panel = fs.readFileSync("src/components/CustomerRefundPanel.tsx", "utf8");

describe("customer refund surface", () => {
  it("mounts the refund panel from the order detail and explains irreversible crypto transfers", () => {
    expect(detail).toContain("<CustomerRefundPanel");
    expect(panel).toContain("I want a refund");
    expect(panel).toContain("completed on-chain transfers cannot be reversed");
    expect(panel).toContain("USDC");
    expect(panel).toContain("USDT");
    expect(panel).toContain("etherscan.io/tx/");
  });
});
```

- [ ] **Step 2: Run the UI contract test red**

Run: `pnpm --filter @workspace/peps-anonymous exec vitest run src/components/customer-refund-contract.test.ts`

Expected: FAIL because the panel and response fields are absent.

- [ ] **Step 3: Extend both account order responses from one shared formatter**

Add a small `getCustomerRefundView(orderId, accountId)` helper in `account.ts`, and call it from both `GET /account/orders` and `GET /account/orders/:id` so list/detail cannot disagree. Return:

```ts
type CustomerRefundView = {
  canRequest: boolean;
  ineligibilityReasonCode: RefundEligibilityCode | null;
  current: {
    id: string;
    method: "credit" | "crypto";
    status: "requested" | "verifying" | "verification_failed" | "completed";
    amountUsd: number;
    asset: "USDC" | "USDT" | null;
    network: "Ethereum ERC-20" | null;
    destinationWallet: string | null;
    outgoingTxid: string | null;
    explorerUrl: string | null;
    verificationErrorCode: string | null;
    verificationErrorMessage: string | null;
    requestedAt: string;
  } | null;
};
```

Show `canRequest` only when the group-buy setting is enabled and eligibility succeeds; retain `current` history when the setting is later disabled. Never expose processor identities or private failure details to the customer.

- [ ] **Step 4: Implement the focused customer panel**

`CustomerRefundPanel` accepts `{ orderId, refundView, onUpdated }`, renders the button only for eligible group-buy orders, offers `credit` and `crypto`, validates required fields for Ethereum address/client UX, and posts only `{ method }` or `{ method, asset, network, destinationWallet }` to `/api/account/orders/${orderId}/refund`. The server remains authoritative. Render exact labels “Refund to account credits”, “Refund in crypto”, “Refund request submitted”, “Refund is being verified”, “Refund verification failed”, and “Refund completed”; show the immutable amount from the response, safe failure code/message, outgoing TXID, and explorer link. Disable all refund-sensitive customer edit controls when `refundView.current.status` is active, but retain the server guard.

- [ ] **Step 5: Integrate without rewriting `AccountOrderDetail.tsx`**

Add only the order type fields and one `<CustomerRefundPanel>` near the existing payment summary in `AccountOrderDetail.tsx`; reuse the current fetch/refetch path after successful submission. Add a compact refund badge to the order card in `CustomerPortal.tsx` using the same `refund` data from `/account/orders`, without moving existing order or payment components. Add a typed `useRequestRefund` mutation to `use-account.ts` only if the component needs it; do not introduce generated API hooks for these manually fetched account routes.

- [ ] **Step 6: Run UI and API tests green**

Run: `pnpm --filter @workspace/peps-anonymous exec vitest run src/components/customer-refund-contract.test.ts && pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-refunds.test.ts`

Expected: PASS, with customer ownership enforced, no refund control for disabled/non-eligible orders, history visible after disable, and TXID/explorer data visible after completion.

- [ ] **Step 7: Commit customer surface**

```bash
git add artifacts/peps-anonymous/src/components/CustomerRefundPanel.tsx artifacts/peps-anonymous/src/components/customer-refund-contract.test.ts artifacts/api-server/src/routes/account.ts artifacts/peps-anonymous/src/hooks/use-account.ts artifacts/peps-anonymous/src/pages/AccountOrderDetail.tsx artifacts/peps-anonymous/src/pages/CustomerPortal.tsx
git commit -m "feat: add customer group buy refund flow"
```

### Task 9: Add admin and organiser queues and processor controls

**Files:**
- Create: `artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.tsx`
- Modify: `artifacts/peps-anonymous/src/components/admin/group-buys/shared/core.tsx`
- Modify: `artifacts/peps-anonymous/src/components/admin/group-buys/GbDetailShell.tsx`
- Modify: `artifacts/peps-anonymous/src/components/admin/group-buys/panels/DetailsPanel.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx`
- Create: `artifacts/peps-anonymous/src/components/group-buy-refund-queue-contract.test.ts`
- Modify: `artifacts/api-server/src/routes/group-buy-refunds.ts`

- [ ] **Step 1: Write the failing queue contract test**

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";

const queue = fs.readFileSync("src/components/GroupBuyRefundQueue.tsx", "utf8");
const shell = fs.readFileSync("src/components/admin/group-buys/GbDetailShell.tsx", "utf8");

describe("processor refund queue", () => {
  it("shows all processing data and uses scoped endpoints", () => {
    for (const label of ["Customer", "Order", "Group buy", "Asset", "Network", "Refund amount", "Destination wallet", "Request date", "Status", "Processing attempts"]) {
      expect(queue).toContain(label);
    }
    expect(queue).toContain("/admin/group-buy-refunds");
    expect(queue).toContain("/organiser/group-buy-refunds");
    expect(shell).toContain("GroupBuyRefundQueue");
  });
});
```

- [ ] **Step 2: Run the queue test red**

Run: `pnpm --filter @workspace/peps-anonymous exec vitest run src/components/group-buy-refund-queue-contract.test.ts`

Expected: FAIL because the queue component and navigation are absent.

- [ ] **Step 3: Add typed setting and queue navigation**

Add `cryptoRefundsEnabled?: boolean` to the `GroupBuy` type in `shared/core.tsx`. Add a “Crypto refunds” switch to the admin `DetailsPanel.tsx` that PATCHes `/api/admin/group-buys/:id` with `{ cryptoRefundsEnabled: checked }`, displays “Refunds are disabled by default”, and never renders in organiser mode. Add a “Refunds” detail tab in `GbDetailShell.tsx` and render `<GroupBuyRefundQueue mode="admin" groupBuyId={currentGb.id} adminSecret={secret} />`. In `GbOrganiser.tsx`, render the same component with `mode="organiser"` only for the selected owned GB; do not offer the setting control.

- [ ] **Step 4: Implement the reusable queue**

`GroupBuyRefundQueue` fetches the exact scoped endpoint, displays safe customer/order/group-buy/method/asset/network/amount/destination/requestedAt/status/attempt data, and polls only while a selected row is `verifying`. For credit rows show “Complete credit refund”; for crypto rows show a TXID input and “Verify outgoing transfer”. Use the route response to show stable error codes, do not let a processor edit amount/asset/network/destination, and show the irreversible-transfer warning before submission. On mutation success invalidate/refetch the queue and order state. Admin requests include `x-admin-secret`; organiser requests include account credentials. A selected organiser URL is always supplied to the server, and a queue loaded for another group-buy returns the server error instead of being filtered client-side.

- [ ] **Step 5: Run queue tests and scoped API tests green**

Run: `pnpm --filter @workspace/peps-anonymous exec vitest run src/components/group-buy-refund-queue-contract.test.ts && pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-refunds.test.ts`

Expected: PASS, including admin all-scope access, organiser own-GB-only access, credit completion, crypto retry, and visible attempt/failure details.

- [ ] **Step 6: Commit processor surfaces**

```bash
git add artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.tsx artifacts/peps-anonymous/src/components/group-buy-refund-queue-contract.test.ts artifacts/peps-anonymous/src/components/admin/group-buys/shared/core.tsx artifacts/peps-anonymous/src/components/admin/group-buys/GbDetailShell.tsx artifacts/peps-anonymous/src/components/admin/group-buys/panels/DetailsPanel.tsx artifacts/peps-anonymous/src/pages/Admin.tsx artifacts/peps-anonymous/src/pages/GbOrganiser.tsx artifacts/api-server/src/routes/group-buy-refunds.ts
git commit -m "feat: add refund processor queues"
```

### Task 10: Add database-backed integration coverage and complete verification

**Files:**
- Create: `artifacts/api-server/src/lib/group-buy-refund.integration.test.ts`
- Modify: `artifacts/api-server/src/routes/__tests__/group-buy-refunds.test.ts`
- Modify: `artifacts/api-server/src/routes/__tests__/group-buy-refund-mutation-guard.test.ts`
- Modify: `artifacts/api-server/src/lib/refund-crypto-verifier.test.ts`
- Modify: `artifacts/api-server/src/lib/refund-money.test.ts`
- Modify: `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts`
- Modify: `docs/superpowers/plans/2026-09-13-group-buy-refunds.md` only if a test-discovered interface correction is needed before execution

- [ ] **Step 1: Write the failing end-to-end domain matrix**

Create a disposable PostgreSQL integration test using the repository’s existing `disposable-postgres.test.ts` setup. Seed one enabled group buy, one organiser-owned group buy, buyer/other accounts, eligible personal order, non-group-buy order, test-confirmed order, screenshot-only order, and a shared-wholesale creator/member pair. Assert:

```ts
it("persists request, completes credit exactly once, and preserves history after disable", async () => {
  const created = await postCustomerRefund({ method: "credit" });
  expect(created.status).toBe("requested");
  const completed = await postAdminCredit(created.id);
  expect(completed.status).toBe("completed");
  expect(await accountCredits("buyer")).toBe("123.45");
  expect(await refundLedgerRows(created.id)).toHaveLength(1);
  await disableGroupBuy("gb-1");
  expect((await getCustomerOrder("order-1")).refund.status).toBe("completed");
});
```

Add test cases for admin-only/default-off setting, customer ownership and linkage, real confirmed evidence versus test/screenshot/client-only evidence, exact server `grandTotal`, credit/crypto selection, Ethereum wallet/asset/network validation, duplicate/concurrent request prevention, organiser queue scope, exact six-decimal conversion, wrong token/network/recipient/amount, failed receipt, insufficient confirmations, successful cancellation, ledger atomicity, TXID replay and same-TXID idempotency, concurrent processor attempts, every representative mutation path, customer status/TXID/explorer visibility, one notification/audit per transition, and the shared-wholesale organiser personal-order regression.

- [ ] **Step 2: Run the focused red integration command**

Run: `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @workspace/api-server exec vitest run src/lib/group-buy-refund.integration.test.ts`

Expected: FAIL until all schema, service, router, guard, and UI response contracts are wired together.

- [ ] **Step 3: Make the integration suite green without widening scope**

Fix only interface mismatches revealed by the matrix. Keep transaction lock order consistent (`refund -> order -> group buy -> account`), use conditional updates for all lifecycle transitions, preserve completed history when disabled, and keep failed verification retryable without changing order or account balances. Do not add automatic broadcasting, private-key custody, fiat refunds, partial refunds, cross-network assets, or a new production migration runner.

- [ ] **Step 4: Run focused unit, integration, database, typecheck, and build commands**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/refund-schema.test.ts src/lib/refund-money.test.ts src/lib/refund-eligibility.test.ts src/lib/group-buy-refund.test.ts src/lib/refund-crypto-verifier.test.ts src/lib/refund-mutation-guard.test.ts src/lib/refund-notifications.test.ts src/lib/wholesale-organiser-payment-confirmation.test.ts src/routes/__tests__/group-buy-refunds.test.ts src/routes/__tests__/group-buy-refund-mutation-guard.test.ts src/lib/group-buy-refund.integration.test.ts
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/api-server run build:compile
pnpm --filter @workspace/peps-anonymous run build
```

Expected: every Vitest file passes, Drizzle reports no pending development schema change, both typechecks exit `0`, and both builds complete without generated-client changes. Because these routes use existing manual `fetch` conventions, do not run `pnpm --filter @workspace/api-spec run codegen` and do not modify `lib/api-client-react/src/generated`; if a future implementation changes a refund route to generated hooks, first add its complete request/response schemas to `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen` and commit the generated output in the same change.

- [ ] **Step 5: Perform the final source and security review**

Run:

```bash
rg -n "amountUsd|grandTotal|tokenBaseUnits|confirmationCount|privateKey|secret|password" artifacts/api-server/src/lib/group-buy-refund.ts artifacts/api-server/src/lib/refund-crypto-verifier.ts artifacts/api-server/src/routes/group-buy-refunds.ts
rg -n "cryptoRefundsEnabled|refund_active|group_buy_refund|organiserOrderId" lib/db/src artifacts/api-server/src artifacts/peps-anonymous/src
git diff --check
git status --short
```

Expected: amount and token values originate from locked server rows; client-supplied amount/rate/success/contract/confirmation values are absent from completion logic; no secret/private key is persisted or logged; every requested path contains the guard; organiser confirmation contains the `organiserOrderId` conditional update; `git diff --check` is clean; and only intended feature files are modified.

- [ ] **Step 6: Commit the complete verification coverage**

```bash
git add artifacts/api-server/src/lib/group-buy-refund.integration.test.ts artifacts/api-server/src/routes/__tests__/group-buy-refunds.test.ts artifacts/api-server/src/routes/__tests__/group-buy-refund-mutation-guard.test.ts artifacts/api-server/src/lib/refund-crypto-verifier.test.ts artifacts/api-server/src/lib/refund-money.test.ts artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts
git commit -m "test: verify group buy refunds end to end"
```

## Final handoff checklist

- [ ] `cryptoRefundsEnabled` is persisted, default false, admin-only, and disabling it leaves existing records visible.
- [ ] Refunds apply only to non-deleted personal group-buy orders with authoritative confirmed real crypto evidence and positive server `grandTotal`.
- [ ] Credit refunds preserve cents, use one idempotent positive ledger transaction, and complete order cancellation atomically.
- [ ] Crypto refunds lock immutable six-decimal base units, verify Ethereum chain/token/recipient/amount/receipt/confirmation depth independently, and globally bind outgoing TXIDs.
- [ ] `requested`, `verifying`, and `verification_failed` records block every relevant customer/admin/organiser/dispatch/bulk/background mutation.
- [ ] Admin sees all queues; organisers see and mutate only their owned group buys on every route.
- [ ] Customer order summaries expose eligibility reason, lifecycle status, safe failure, TXID, and explorer URL.
- [ ] Notifications and audit records are transition-only and privacy-safe.
- [ ] The shared-wholesale organiser payment regression proves only the organiser’s personal order becomes paid.
- [ ] The final change uses the normal Drizzle development schema path, does not add startup production migration code, and does not touch OpenAPI/codegen because these route families use manual fetch.