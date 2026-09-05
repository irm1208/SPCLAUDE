# Standalone Crypto Payment Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a neutral, self-contained TypeScript/Express/React/PostgreSQL starter repository that another developer can use to accept and verify non-custodial crypto payments without receiving any Peps code, data, branding, database links, production wallets, or secrets.

**Architecture:** Create a new artifact at `artifacts/crypto-payment-kit` with its own pnpm workspace, explicit dependency versions, API app, React app, shared core package, and verifier package. The host website creates payment requests through an authenticated API; customers pay through a public checkout; persisted workers verify transactions and deliver signed webhooks. The extracted artifact must install and run independently from the parent workspace.

**Tech Stack:** TypeScript 5.9, Node.js 22+, Express 5, React 19, Vite 7, PostgreSQL, Drizzle ORM, Zod, Vitest, Testing Library, TanStack Query, viem, `@solana/web3.js`, `bitcoinjs-lib`, `react-qr-code`, Helmet, CORS, and Express Rate Limit.

**Design reference:** `docs/superpowers/specs/2026-09-05-standalone-crypto-payment-kit-design.md`

---

## File Structure

```text
artifacts/crypto-payment-kit/
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── SECURITY.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
├── scripts/
│   ├── assert-standalone.mjs
│   └── create-source-archive.mjs
├── examples/
│   └── merchant-express/
│       ├── README.md
│       ├── package.json
│       └── src/index.ts
├── apps/
│   ├── api/
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── migrations/0001_initial.sql
│   │   └── src/
│   │       ├── app.ts
│   │       ├── config.ts
│   │       ├── index.ts
│   │       ├── db/client.ts
│   │       ├── db/schema.ts
│   │       ├── errors.ts
│   │       ├── middleware/merchant-auth.ts
│   │       ├── middleware/request-id.ts
│   │       ├── payments/payment-repository.ts
│   │       ├── payments/payment-service.ts
│   │       ├── payments/routes.ts
│   │       ├── quotes/quote-service.ts
│   │       ├── verification/routes.ts
│   │       ├── verification/worker.ts
│   │       ├── webhooks/signature.ts
│   │       ├── webhooks/worker.ts
│   │       └── tests/
│   │           ├── auth.test.ts
│   │           ├── checkout.test.ts
│   │           ├── payments.test.ts
│   │           ├── verification-worker.test.ts
│   │           └── webhooks.test.ts
│   └── web/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── api.ts
│           ├── main.tsx
│           ├── styles.css
│           ├── checkout/CheckoutPage.tsx
│           ├── checkout/PaymentDetails.tsx
│           ├── checkout/StatusPanel.tsx
│           └── checkout/CheckoutPage.test.tsx
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── amount.ts
    │       ├── networks.ts
    │       ├── schemas.ts
    │       └── status.ts
    └── verifiers/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── types.ts
            ├── evm.ts
            ├── bitcoin.ts
            ├── solana.ts
            ├── tron.ts
            └── fixtures.test.ts
```

The implementation may add small fixture and helper files next to the tests that consume them. It must not import any module outside `artifacts/crypto-payment-kit`.

### Task 1: Create the isolated artifact and standalone workspace

**Files:**
- Create: `artifacts/crypto-payment-kit/package.json`
- Create: `artifacts/crypto-payment-kit/pnpm-workspace.yaml`
- Create: `artifacts/crypto-payment-kit/tsconfig.base.json`
- Create: `artifacts/crypto-payment-kit/vitest.workspace.ts`
- Create: `artifacts/crypto-payment-kit/.gitignore`
- Create: `artifacts/crypto-payment-kit/.env.example`
- Create: `artifacts/crypto-payment-kit/LICENSE`
- Create: `artifacts/crypto-payment-kit/apps/api/package.json`
- Create: `artifacts/crypto-payment-kit/apps/api/tsconfig.json`
- Create: `artifacts/crypto-payment-kit/apps/web/package.json`
- Create: `artifacts/crypto-payment-kit/apps/web/tsconfig.json`
- Create: `artifacts/crypto-payment-kit/packages/core/package.json`
- Create: `artifacts/crypto-payment-kit/packages/core/tsconfig.json`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/package.json`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/tsconfig.json`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Read the artifact, React/Vite, package-management, and test-driven-development instructions**

Run:

```bash
sed -n '1,240p' .local/skills/artifacts/SKILL.md
sed -n '1,240p' .local/skills/react-vite/SKILL.md
sed -n '1,240p' .local/skills/package-management/SKILL.md
sed -n '1,240p' .agents/skills/test-driven-development/SKILL.md
```

Expected: the implementation worker has the current project-specific creation, package, and TDD rules before writing code.

- [ ] **Step 2: Add a failing standalone-boundary assertion**

Create `artifacts/crypto-payment-kit/scripts/assert-standalone.mjs`:

```js
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const forbidden = [
  /salt\s*&\s*peps/i,
  /peps[-_ ]anonymous/i,
  /@workspace\/(api-server|db|shipping|api-zod)/i,
  /DATABASE_URL\s*=\s*(?!postgresql:\/\/user:password@localhost:5432\/crypto_payments)/,
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    if (["node_modules", "dist", "coverage"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

const files = await walk(root);
for (const file of files) {
  if (file.endsWith("assert-standalone.mjs")) continue;
  const text = await readFile(file, "utf8").catch(() => "");
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`Forbidden project coupling in ${file}: ${pattern}`);
  }
}
console.log(`Standalone boundary verified across ${files.length} files`);
```

- [ ] **Step 3: Run the assertion before scaffolding**

Run:

```bash
node artifacts/crypto-payment-kit/scripts/assert-standalone.mjs
```

Expected: FAIL because the artifact workspace has not been created yet.

- [ ] **Step 4: Create the workspace manifests with explicit versions**

Use this root manifest:

```json
{
  "name": "open-crypto-checkout",
  "version": "1.0.0",
  "private": true,
  "license": "MIT",
  "packageManager": "pnpm@10.15.1",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "pnpm --parallel --filter @open-crypto-checkout/api --filter @open-crypto-checkout/web dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run --workspace vitest.workspace.ts",
    "check:standalone": "node scripts/assert-standalone.mjs",
    "check": "pnpm check:standalone && pnpm typecheck && pnpm test && pnpm build",
    "archive": "node scripts/create-source-archive.mjs"
  },
  "devDependencies": {
    "typescript": "5.9.2",
    "vitest": "4.1.9"
  }
}
```

Use this nested workspace file:

```yaml
packages:
  - apps/*
  - packages/*
  - examples/*
```

Add these patterns to the repository-root `pnpm-workspace.yaml`:

```yaml
  - artifacts/crypto-payment-kit/apps/*
  - artifacts/crypto-payment-kit/packages/*
  - artifacts/crypto-payment-kit/examples/*
```

Every nested package must use `workspace:*` only for `@open-crypto-checkout/core` and `@open-crypto-checkout/verifiers`. All third-party dependencies must use explicit public registry versions rather than the parent workspace catalog.

- [ ] **Step 5: Add a non-secret environment template**

Create `.env.example` with only inert placeholders:

```dotenv
NODE_ENV=development
PORT=8090
WEB_ORIGIN=http://localhost:5173
PUBLIC_API_ORIGIN=http://localhost:8090
PUBLIC_CHECKOUT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/crypto_payments
BOOTSTRAP_MERCHANT_KEY=replace-with-a-new-random-value
BOOTSTRAP_WEBHOOK_SECRET=replace-with-a-different-random-value
BOOTSTRAP_WEBHOOK_URL=http://localhost:8091/webhooks/crypto
QUOTE_TTL_SECONDS=900
UNDERPAY_TOLERANCE_BPS=100
OVERPAY_REVIEW_BPS=200
ETHEREUM_WALLET=replace-with-your-public-wallet
BSC_WALLET=replace-with-your-public-wallet
ARBITRUM_WALLET=replace-with-your-public-wallet
POLYGON_WALLET=replace-with-your-public-wallet
SOLANA_WALLET=replace-with-your-public-wallet
TRON_WALLET=replace-with-your-public-wallet
BITCOIN_WALLET=replace-with-your-public-wallet
```

Do not create a real `.env` file.

- [ ] **Step 6: Install through pnpm and verify the boundary**

Run:

```bash
pnpm install
pnpm --dir artifacts/crypto-payment-kit check:standalone
```

Expected: install succeeds and the boundary assertion prints `Standalone boundary verified`.

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml artifacts/crypto-payment-kit
git commit -m "chore: scaffold standalone crypto checkout"
```

### Task 2: Define the shared payment contract and network registry

**Files:**
- Create: `artifacts/crypto-payment-kit/packages/core/src/status.ts`
- Create: `artifacts/crypto-payment-kit/packages/core/src/networks.ts`
- Create: `artifacts/crypto-payment-kit/packages/core/src/amount.ts`
- Create: `artifacts/crypto-payment-kit/packages/core/src/schemas.ts`
- Create: `artifacts/crypto-payment-kit/packages/core/src/index.ts`
- Create: `artifacts/crypto-payment-kit/packages/core/src/core.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from "vitest";
import {
  createPaymentSchema,
  isAllowedTransition,
  NETWORKS,
  classifyAmount,
} from "./index.js";

describe("payment contract", () => {
  it("contains every approved rail", () => {
    expect(Object.keys(NETWORKS).sort()).toEqual([
      "arbitrum-usdc", "arbitrum-usdt", "bitcoin-btc", "bsc-usdt",
      "ethereum-eth", "ethereum-usdc", "ethereum-usdt",
      "polygon-usdc", "polygon-usdt", "solana-usdc", "solana-usdt",
      "tron-usdt",
    ]);
  });

  it("rejects zero-priced payment requests", () => {
    expect(createPaymentSchema.safeParse({
      merchantOrderRef: "ORDER-1",
      fiatAmount: "0",
      fiatCurrency: "USD",
      allowedRails: ["ethereum-usdt"],
    }).success).toBe(false);
  });

  it("never permits paid to revert", () => {
    expect(isAllowedTransition("paid", "confirming")).toBe(false);
    expect(isAllowedTransition("paid", "cancelled")).toBe(false);
  });

  it("uses explicit underpaid and overpaid-review boundaries", () => {
    expect(classifyAmount(99_00n, 100_00n, 100, 200)).toBe("accepted");
    expect(classifyAmount(98_99n, 100_00n, 100, 200)).toBe("underpaid");
    expect(classifyAmount(102_01n, 100_00n, 100, 200)).toBe("overpaid_review");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/core test
```

Expected: FAIL because the exports do not exist.

- [ ] **Step 3: Implement the status, amount, schemas, and registry**

Define immutable statuses:

```ts
export const paymentStatuses = [
  "created", "awaiting_payment", "transaction_submitted", "confirming",
  "paid", "expired", "underpaid", "overpaid_review", "failed", "cancelled",
] as const;
export type PaymentStatus = typeof paymentStatuses[number];

const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["transaction_submitted", "expired", "cancelled"],
  transaction_submitted: ["confirming", "underpaid", "overpaid_review", "failed"],
  confirming: ["paid", "underpaid", "overpaid_review", "failed"],
  paid: [],
  expired: [],
  underpaid: [],
  overpaid_review: [],
  failed: [],
  cancelled: [],
};
export const isAllowedTransition = (from: PaymentStatus, to: PaymentStatus) =>
  transitions[from].includes(to);
```

Represent money and token quantities as decimal strings at API boundaries and `bigint` base units internally. Implement `classifyAmount` with integer basis-point arithmetic; never use JavaScript floating point for settlement comparisons.

Define every rail as:

```ts
export interface NetworkDefinition {
  id: string;
  family: "evm" | "bitcoin" | "solana" | "tron";
  chainId?: number;
  asset: "BTC" | "ETH" | "USDT" | "USDC";
  decimals: number;
  tokenAddress?: string;
  confirmationTarget: number;
}
```

Populate official public chain IDs and token contract/mint addresses, with a source comment linking to each issuer or chain explorer. No receiving wallet belongs in this registry.

- [ ] **Step 4: Run core tests and typecheck**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/core test
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/core typecheck
```

Expected: all core tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add artifacts/crypto-payment-kit/packages/core
git commit -m "feat: define standalone payment contracts"
```

### Task 3: Add validated configuration and PostgreSQL persistence

**Files:**
- Create: `artifacts/crypto-payment-kit/apps/api/src/config.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/db/schema.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/db/client.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/migrations/0001_initial.sql`
- Create: `artifacts/crypto-payment-kit/apps/api/src/payments/payment-repository.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/config.test.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/payment-repository.test.ts`

- [ ] **Step 1: Write failing configuration tests**

```ts
import { expect, it } from "vitest";
import { parseConfig } from "../config.js";

it("rejects placeholder wallets and missing database configuration", () => {
  expect(() => parseConfig({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@localhost:5432/crypto_payments",
    ETHEREUM_WALLET: "replace-with-your-public-wallet",
  })).toThrow(/placeholder|configuration/i);
});

it("does not include secret values in validation errors", () => {
  const secret = "merchant-secret-that-must-not-leak";
  expect(() => parseConfig({ BOOTSTRAP_MERCHANT_KEY: secret }))
    .toThrowError(new RegExp(`^(?!.*${secret}).*$`, "s"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- config.test.ts
```

Expected: FAIL because `parseConfig` does not exist.

- [ ] **Step 3: Implement strict environment validation**

Use Zod to parse all settings once at startup. Validate receiving addresses using the corresponding family validator. Production startup must fail if any enabled rail uses a placeholder value, localhost origin, default merchant key, default webhook secret, or malformed database URL. Error messages list variable names, never values.

- [ ] **Step 4: Write failing repository invariants**

Create database-backed tests that migrate a temporary test schema and prove:

```ts
it("deduplicates merchant order references and idempotency keys");
it("prevents one network transaction from paying two requests");
it("records paid status and evidence in one transaction");
it("does not allow a paid payment to transition backwards");
it("claims one persisted job only once under concurrency");
```

Use `TEST_DATABASE_URL`; skip with an explicit message only when that variable is absent. The CI/check documentation must require this suite before production use.

- [ ] **Step 5: Implement schema and repository**

Create Drizzle definitions and SQL DDL for:

```ts
merchants
merchant_api_keys
merchant_webhooks
payments
payment_quotes
payment_transactions
payment_events
verification_attempts
verification_jobs
webhook_events
webhook_deliveries
```

Use `uuid` primary keys internally and a separate random `public_id`. Use `numeric` or base-unit text for amounts, `jsonb` only for bounded metadata/evidence, and UTC timestamps. Add check constraints for status values and partial indexes for due jobs. Store `api_key_hash` and `webhook_secret_ciphertext`/provider reference; never log either.

Implement `markPaid` as a single transaction that row-locks the payment, verifies its current state, inserts immutable evidence and status event, marks the transaction accepted, updates payment status, and inserts the webhook event.

- [ ] **Step 6: Apply the migration and run repository tests**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api db:migrate
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- payment-repository.test.ts
```

Expected: migration succeeds; repository tests PASS or explicitly report that `TEST_DATABASE_URL` is required.

- [ ] **Step 7: Commit**

```bash
git add artifacts/crypto-payment-kit/apps/api
git commit -m "feat: persist standalone crypto payments"
```

### Task 4: Build merchant authentication and payment APIs

**Files:**
- Create: `artifacts/crypto-payment-kit/apps/api/src/errors.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/middleware/request-id.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/middleware/merchant-auth.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/payments/payment-service.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/payments/routes.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/app.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/index.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/auth.test.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/payments.test.ts`

- [ ] **Step 1: Write failing HTTP contract tests**

```ts
it("returns 401 without a merchant API key");
it("compares a presented API key to the stored hash");
it("creates one payment for repeated idempotent requests");
it("returns 409 when an idempotency key is reused with a different body");
it("never exposes internal IDs, hashes, webhook secrets, or database fields");
it("returns a stable error envelope containing code, message, and requestId");
```

Example success assertion:

```ts
expect(response.body).toEqual({
  publicId: expect.stringMatching(/^pay_[A-Za-z0-9_-]{24,}$/),
  merchantOrderRef: "ORDER-1001",
  status: "created",
  fiatAmount: "49.99",
  fiatCurrency: "USD",
  checkoutUrl: expect.stringMatching(/\/checkout\/pay_/),
  expiresAt: expect.any(String),
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- auth.test.ts payments.test.ts
```

Expected: FAIL because the app and routes are absent.

- [ ] **Step 3: Implement middleware and routes**

Use `crypto.scrypt` with a per-key salt for bootstrap/demo API keys and `timingSafeEqual` for comparisons. Never store or query plaintext API keys. Add:

```ts
POST /v1/payments
GET /v1/payments/:publicId
GET /health
GET /ready
```

Apply Helmet, strict JSON body limits, configured CORS, separate public/merchant rate limits, and request IDs. Return errors through one terminal middleware:

```ts
{
  "error": {
    "code": "payment_not_found",
    "message": "Payment not found",
    "requestId": "req_..."
  }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- auth.test.ts payments.test.ts
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/crypto-payment-kit/apps/api
git commit -m "feat: add merchant payment API"
```

### Task 5: Implement quotes and public checkout instructions

**Files:**
- Create: `artifacts/crypto-payment-kit/apps/api/src/quotes/quote-service.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/quotes/rate-provider.ts`
- Modify: `artifacts/crypto-payment-kit/apps/api/src/payments/routes.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/checkout.test.ts`

- [ ] **Step 1: Write failing checkout tests**

```ts
it("returns only the allowed rails for a public payment");
it("locks the selected quote and server receiving address");
it("does not accept a receiving address, token contract, or amount from the browser");
it("returns the existing quote during its lock period");
it("expires stale quotes rather than silently changing the requested amount");
it("formats base units without floating-point rounding");
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- checkout.test.ts
```

Expected: FAIL with missing checkout routes.

- [ ] **Step 3: Implement a replaceable rate provider and checkout routes**

Define:

```ts
export interface RateProvider {
  getUsdPrice(asset: "BTC" | "ETH" | "USDT" | "USDC"): Promise<{
    price: string;
    observedAt: Date;
    source: string;
  }>;
}
```

Provide a deterministic development provider enabled only outside production and a documented HTTP provider interface for production. Persist the fiat amount, quoted crypto amount, source, rate, wallet, network definition snapshot, and expiry.

Add:

```ts
GET /v1/checkout/:publicId
POST /v1/checkout/:publicId/select
```

The select body contains only `{ "rail": "ethereum-usdt" }`. Ignore no extra fields; reject them through `.strict()` schemas.

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- checkout.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/crypto-payment-kit/apps/api
git commit -m "feat: lock server-authoritative crypto quotes"
```

### Task 6: Implement isolated multi-chain verification adapters

**Files:**
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/types.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/evm.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/bitcoin.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/solana.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/tron.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/index.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/fixtures.test.ts`
- Create: `artifacts/crypto-payment-kit/packages/verifiers/src/fixtures/*.json`

- [ ] **Step 1: Define the adapter contract and failing fixture tests**

```ts
export interface VerificationRequest {
  rail: string;
  transactionHash: string;
  recipient: string;
  expectedBaseUnits: bigint;
  underpayToleranceBps: number;
  overpayReviewBps: number;
  submittedAfter: Date;
}

export type VerificationResult =
  | { kind: "not_found"; retryable: true }
  | { kind: "confirming"; confirmations: number; target: number; retryable: true }
  | { kind: "verified"; receivedBaseUnits: bigint; confirmations: number; evidence: Record<string, unknown> }
  | { kind: "underpaid"; receivedBaseUnits: bigint; evidence: Record<string, unknown> }
  | { kind: "overpaid_review"; receivedBaseUnits: bigint; evidence: Record<string, unknown> }
  | { kind: "mismatch"; reason: "recipient" | "asset" | "network" | "failed" | "too_old" }
  | { kind: "unavailable"; retryable: true; provider: string };
```

For each family, add fixtures proving:

- Valid exact payment
- Valid payment at underpay tolerance
- Underpayment below tolerance
- Overpayment requiring review
- Wrong recipient
- Wrong token contract/mint
- Failed/reverted transaction
- Insufficient confirmations
- Provider unavailable

- [ ] **Step 2: Run fixture tests to verify failure**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/verifiers test
```

Expected: FAIL because adapters are unimplemented.

- [ ] **Step 3: Implement EVM verification**

Use `viem` public clients with explicit chain IDs and an ordered RPC failover list. For native ETH, inspect transaction recipient, value, status, block number, and receipt. For tokens, decode `Transfer(address,address,uint256)` logs from the configured contract and sum transfers to the recipient. Reject a receipt from the wrong chain or contract.

- [ ] **Step 4: Implement Bitcoin verification**

Use a small `BitcoinProvider` interface and Blockstream-compatible implementation. Sum outputs matching the expected address; require confirmed block height and calculate confirmations from current tip. Treat absent transactions as retryable and conflicting/unconfirmed failures explicitly.

- [ ] **Step 5: Implement Solana verification**

Use `@solana/web3.js` parsed transaction responses. Require successful meta, expected mint, destination token owner/account resolution, and finalized/confirmed commitment per configuration. Sum matching SPL token balance deltas using raw integer amounts.

- [ ] **Step 6: Implement Tron verification**

Use a narrow `TronProvider` interface over TronGrid-compatible endpoints. Require successful receipt, correct TRC-20 contract, correct recipient topic/address decoding, integer transfer amount, and configured confirmation target.

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/verifiers test
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/verifiers typecheck
```

Expected: all family fixtures PASS.

- [ ] **Step 8: Commit**

```bash
git add artifacts/crypto-payment-kit/packages/verifiers
git commit -m "feat: verify payments across supported chains"
```

### Task 7: Connect transaction submission to the persisted verification worker

**Files:**
- Create: `artifacts/crypto-payment-kit/apps/api/src/verification/routes.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/verification/worker.ts`
- Modify: `artifacts/crypto-payment-kit/apps/api/src/app.ts`
- Modify: `artifacts/crypto-payment-kit/apps/api/src/index.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/verification-worker.test.ts`

- [ ] **Step 1: Write failing worker and submission tests**

```ts
it("accepts only a hash valid for the selected chain family");
it("returns the same transaction record for repeated submissions");
it("rejects a hash already accepted for another payment");
it("moves not-found and unavailable results to a bounded retry");
it("moves low-confirmation results to confirming");
it("marks verified payment and evidence atomically");
it("cannot process the same due job concurrently");
it("never changes a paid payment after a late worker result");
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- verification-worker.test.ts
```

Expected: FAIL with missing worker and route.

- [ ] **Step 3: Add transaction submission**

Add:

```ts
POST /v1/checkout/:publicId/transactions
```

The strict body is `{ "transactionHash": "..." }`. Normalize only case-insensitive EVM hashes; preserve case where chain encoding requires it. Insert the transaction and job in one database transaction, then move the payment from `awaiting_payment` to `transaction_submitted`.

- [ ] **Step 4: Implement persisted job claims and result mapping**

Claim with `FOR UPDATE SKIP LOCKED`, set a lease expiration and worker ID, then call the family adapter outside the claim transaction. On completion, lock the payment and transaction before applying the result. Use bounded exponential retry with deterministic jitter and an attempt ceiling for provider unavailability; transactions awaiting confirmations remain retryable until payment expiry plus a configured grace period.

Map:

```ts
not_found | unavailable -> retry job, state stays transaction_submitted
confirming -> payment confirming, retry job
verified -> atomic paid transition and webhook event
underpaid -> terminal underpaid
overpaid_review -> terminal overpaid_review
mismatch -> terminal failed with redacted reason
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- verification-worker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add artifacts/crypto-payment-kit/apps/api
git commit -m "feat: verify submitted crypto transactions"
```

### Task 8: Add signed and retryable merchant webhooks

**Files:**
- Create: `artifacts/crypto-payment-kit/apps/api/src/webhooks/signature.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/webhooks/worker.ts`
- Modify: `artifacts/crypto-payment-kit/apps/api/src/payments/routes.ts`
- Create: `artifacts/crypto-payment-kit/apps/api/src/tests/webhooks.test.ts`

- [ ] **Step 1: Write failing signature and delivery tests**

```ts
it("signs timestamp dot raw-body with HMAC SHA-256");
it("produces a stable event ID and schema");
it("does not include internal IDs or verification-provider credentials");
it("retries timeout, 429, and 5xx responses with a bounded backoff");
it("does not retry successful 2xx responses");
it("supports idempotent manual replay without changing the event");
it("bounds and redacts the stored response excerpt");
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- webhooks.test.ts
```

Expected: FAIL with missing signature and worker modules.

- [ ] **Step 3: Implement signing and delivery**

Sign:

```ts
const signed = `${timestamp}.${rawBody}`;
const signature = createHmac("sha256", secret).update(signed).digest("hex");
```

Send:

```text
X-Crypto-Event-Id: evt_...
X-Crypto-Timestamp: 1788600000
X-Crypto-Signature: v1=<hex>
Content-Type: application/json
```

Persist the exact canonical body before delivery. Enforce HTTPS webhook URLs in production, block loopback/link-local/private-network targets unless an explicit development-only flag is enabled, disable redirects, resolve DNS defensively, cap body/response sizes, and use request timeouts to reduce SSRF exposure.

- [ ] **Step 4: Add merchant-authenticated replay**

Add:

```ts
POST /v1/webhooks/:deliveryId/replay
```

Verify the delivery belongs to the authenticated merchant and create a new delivery attempt referencing the immutable event.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/api test -- webhooks.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add artifacts/crypto-payment-kit/apps/api
git commit -m "feat: deliver signed payment webhooks"
```

### Task 9: Build the neutral React demo store and checkout

**Files:**
- Create: `artifacts/crypto-payment-kit/apps/web/index.html`
- Create: `artifacts/crypto-payment-kit/apps/web/vite.config.ts`
- Create: `artifacts/crypto-payment-kit/apps/web/src/main.tsx`
- Create: `artifacts/crypto-payment-kit/apps/web/src/api.ts`
- Create: `artifacts/crypto-payment-kit/apps/web/src/App.tsx`
- Create: `artifacts/crypto-payment-kit/apps/web/src/checkout/CheckoutPage.tsx`
- Create: `artifacts/crypto-payment-kit/apps/web/src/checkout/PaymentDetails.tsx`
- Create: `artifacts/crypto-payment-kit/apps/web/src/checkout/StatusPanel.tsx`
- Create: `artifacts/crypto-payment-kit/apps/web/src/styles.css`
- Create: `artifacts/crypto-payment-kit/apps/web/src/checkout/CheckoutPage.test.tsx`

- [ ] **Step 1: Read frontend design guidance and delegate the visual implementation**

Read `.agents/skills/frontend-design/SKILL.md`, `.local/skills/design/SKILL.md`, and `.agents/skills/vercel-react-best-practices/SKILL.md`. Delegate the page implementation to a DESIGN subagent with the approved neutral brief. Do not copy styling or assets from the existing product.

- [ ] **Step 2: Write failing checkout behavior tests**

```tsx
it("shows only API-provided payment rails");
it("renders network, asset, exact amount, destination, expiry, and QR");
it("never permits editing the destination or exact amount");
it("submits the transaction hash once and survives a repeated click");
it("polls while submitted or confirming and stops in a terminal state");
it("renders accessible loading, error, expired, underpaid, review, and paid states");
it("wraps long addresses and hashes at a 320px viewport");
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/web test
```

Expected: FAIL because checkout components are absent.

- [ ] **Step 4: Implement the demo and checkout**

Use a restrained neutral visual system with no imported product marks. The demo home page creates a fake order by calling a development-only demo endpoint or instructs the developer to use the API example. The checkout route is `/checkout/:publicId`.

Build payment URIs only from API-returned values:

```ts
function paymentUri(option: CheckoutOption): string {
  switch (option.family) {
    case "bitcoin": return `bitcoin:${option.recipient}?amount=${option.displayAmount}`;
    case "ethereum": return `ethereum:${option.recipient}@${option.chainId}?value=${option.baseUnits}`;
    case "solana": return `solana:${option.recipient}?amount=${option.displayAmount}`;
    case "tron": return option.recipient;
  }
}
```

For ERC-20 tokens, generate an EIP-681 token transfer URI using the token contract, recipient, and integer base units. Label the network prominently to prevent wrong-chain transfers.

- [ ] **Step 5: Run tests, typecheck, and build**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/web test
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/web typecheck
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/web build
```

Expected: PASS and Vite emits `dist`.

- [ ] **Step 6: Start the artifact workflow and verify desktop/mobile screenshots**

Configure the artifact according to the artifact and workflow instructions. Restart its managed workflow once. Capture `/` and a seeded `/checkout/:publicId` at desktop and mobile widths; confirm no branding leakage, no horizontal overflow, clear network warnings, and visible status/error states.

- [ ] **Step 7: Commit**

```bash
git add artifacts/crypto-payment-kit/apps/web artifacts/crypto-payment-kit/.replit-artifact/artifact.toml pnpm-lock.yaml
git commit -m "feat: add neutral crypto checkout demo"
```

### Task 10: Add a safe merchant integration example and production documentation

**Files:**
- Create: `artifacts/crypto-payment-kit/examples/merchant-express/package.json`
- Create: `artifacts/crypto-payment-kit/examples/merchant-express/src/index.ts`
- Create: `artifacts/crypto-payment-kit/examples/merchant-express/README.md`
- Create: `artifacts/crypto-payment-kit/README.md`
- Create: `artifacts/crypto-payment-kit/SECURITY.md`
- Create: `artifacts/crypto-payment-kit/docs/API.md`
- Create: `artifacts/crypto-payment-kit/docs/NETWORKS.md`
- Create: `artifacts/crypto-payment-kit/docs/PRODUCTION_CHECKLIST.md`
- Create: `artifacts/crypto-payment-kit/docs/TROUBLESHOOTING.md`

- [ ] **Step 1: Write the webhook receiver example test first**

The example must expose and test:

```ts
export function verifyWebhook(options: {
  rawBody: Buffer;
  timestamp: string;
  signature: string;
  secret: string;
  nowSeconds?: number;
}): boolean;
```

Tests cover valid signatures, modified bodies, stale timestamps, malformed headers, and constant-time comparison of equal-length buffers.

- [ ] **Step 2: Implement the host example**

The example:

- Creates a local fake store order.
- Calls `POST /v1/payments` from the server, never the browser.
- Redirects to the returned checkout URL.
- Captures the raw webhook body before JSON parsing.
- Validates timestamp and signature.
- Deduplicates event IDs.
- Marks the fake order paid idempotently.
- Contains placeholder URLs and secrets only.

- [ ] **Step 3: Write complete standalone documentation**

The README starts with:

```md
# Open Crypto Checkout

A non-custodial starter kit for accepting and verifying cryptocurrency
payments with TypeScript, Express, React, and PostgreSQL.

This repository never holds private keys and cannot move funds. Replace every
placeholder with infrastructure and public receiving addresses you control.
Do not accept real money until you have completed an independent security,
legal, tax, database, RPC, monitoring, and backup review.
```

Document:

- Requirements and fresh PostgreSQL setup
- `cp .env.example .env` with instructions to create the recipient's own values
- Migrations, bootstrap merchant, API, web, and worker startup
- Every supported rail and token identifier source
- Payment and webhook integration
- Secret rotation
- Database backup expectations
- RPC provider expectations and failover
- Confirmation/tolerance configuration
- Known non-goals
- Production checklist
- Troubleshooting without exposing secrets

State explicitly that no database is bundled or linked and that `DATABASE_URL` must point to a database owned by the recipient.

- [ ] **Step 4: Run example tests and standalone scan**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit --filter @open-crypto-checkout/merchant-example test
pnpm --dir artifacts/crypto-payment-kit check:standalone
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/crypto-payment-kit
git commit -m "docs: add standalone merchant integration guide"
```

### Task 11: Create a sanitized source archive and prove it runs independently

**Files:**
- Create: `artifacts/crypto-payment-kit/scripts/create-source-archive.mjs`
- Create: `artifacts/crypto-payment-kit/scripts/archive-allowlist.json`
- Create: `artifacts/crypto-payment-kit/src-archive.test.mjs`
- Create generated deliverable: `deliverables/open-crypto-checkout-v1.0.0.tar.gz`

- [ ] **Step 1: Write a failing archive-content test**

The test extracts the archive into a temporary directory and asserts:

```js
assert(exists("package.json"));
assert(exists(".env.example"));
assert(!exists(".env"));
assert(!exists("node_modules"));
assert(!exists(".git"));
assert(!exists("dist"));
assert(!exists("coverage"));
assert(noPathStartsWith("../"));
assert(noSymlinks());
assert(noForbiddenProjectNamesOrWorkspaceImports());
assert(noLikelySecrets());
```

Use both a strict allowlist and content scanning. Treat PEM blocks, JWT-like strings, database URLs other than the documented localhost placeholder, and high-entropy assignments to key/secret/token/password variables as failures.

- [ ] **Step 2: Run the archive test to verify failure**

Run:

```bash
node artifacts/crypto-payment-kit/src-archive.test.mjs
```

Expected: FAIL because no archive exists.

- [ ] **Step 3: Implement deterministic allowlisted packaging**

Create a tarball from an explicit allowlist rooted at `artifacts/crypto-payment-kit`, normalized to a top-level `open-crypto-checkout/` directory. Do not archive through a broad repository glob. Reject unexpected symlinks and files over a documented size ceiling.

- [ ] **Step 4: Test the extracted repository independently**

Run:

```bash
tmpdir="$(mktemp -d)"
tar -xzf deliverables/open-crypto-checkout-v1.0.0.tar.gz -C "$tmpdir"
cd "$tmpdir/open-crypto-checkout"
pnpm install --frozen-lockfile
pnpm check:standalone
pnpm typecheck
pnpm test
pnpm build
```

Expected: every command exits 0 without reading parent-workspace packages, environment files, databases, or configuration.

- [ ] **Step 5: Run dependency and source security scans**

Read `.local/skills/security-scan/SKILL.md` and run the required dependency, SAST, and secret scans against the standalone artifact and extracted archive. Resolve all critical/high findings or document a justified non-applicability in `SECURITY.md`; never waive a leaked-secret finding.

- [ ] **Step 6: Run the complete project verification**

Run:

```bash
pnpm --dir artifacts/crypto-payment-kit check
node artifacts/crypto-payment-kit/src-archive.test.mjs
git diff --check
git status --short
```

Expected: standalone scan, typecheck, tests, build, archive test, and diff check PASS. Git status shows only the intended archive/code changes.

- [ ] **Step 7: Review the finished code**

Read `.local/skills/code-review/SKILL.md` and `.agents/skills/requesting-code-review/SKILL.md`. Dispatch the required review focused on:

- Money-integrity boundaries
- Chain-verification correctness
- SSRF and webhook safety
- Secret/config leakage
- Cross-payment transaction reuse
- Concurrency and idempotency
- Accidental parent-project imports or branding

Fix critical/high findings and rerun the checks invalidated by those fixes.

- [ ] **Step 8: Present the archive**

Use:

```js
await presentAsset({
  filePath: "deliverables/open-crypto-checkout-v1.0.0.tar.gz",
  title: "Open Crypto Checkout v1.0.0",
  description: "Standalone TypeScript, Express, React, and PostgreSQL crypto payment starter with no project branding, production configuration, database links, or customer data."
});
```

- [ ] **Step 9: Commit**

```bash
git add artifacts/crypto-payment-kit deliverables/open-crypto-checkout-v1.0.0.tar.gz pnpm-lock.yaml
git commit -m "feat: package standalone crypto payment kit"
```

## Final Acceptance Pass

- [ ] Search the entire artifact and extracted archive for the parent product name, package names, routes, domains, database URLs, wallet values, webhook values, and secret names.
- [ ] Confirm only the documented localhost placeholder database URL appears.
- [ ] Confirm the archive does not include `.env`, database dumps, logs, production data, generated credentials, or private keys.
- [ ] Confirm every configured receiving address comes from the recipient's environment.
- [ ] Confirm the demo cannot be mistaken for production-ready without configuration.
- [ ] Confirm all twelve approved rails render and verify through the correct family adapter.
- [ ] Confirm a transaction cannot credit more than one payment.
- [ ] Confirm paid status is atomic and irreversible through ordinary APIs.
- [ ] Confirm webhook verification and event deduplication work in the host example.
- [ ] Confirm the extracted repository installs, tests, typechecks, and builds without the parent workspace.