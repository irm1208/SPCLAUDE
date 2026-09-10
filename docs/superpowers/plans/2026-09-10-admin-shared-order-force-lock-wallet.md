# Admin Shared-Order Force Lock and Wallet Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only force-lock action for open shared orders and an admin editor for the organiser wallets that members pay into.

**Architecture:** Extend the existing transactional `attemptLockShare` service with an explicit `admin_force` mode that bypasses only confirmation and per-member minimum-kit readiness checks. Add dedicated `/admin/wholesale-shares/:id/force-lock` and `/admin/wholesale-shares/:id/organiser-wallets` routes under the existing admin boundary; keep wallet validation in a small shared module used by both organiser and admin writes. Update the existing `AdminWholesaleSharesTab` rather than creating a second admin surface.

**Tech Stack:** TypeScript, Express 5, Drizzle/PostgreSQL transactions, React 19, Vite, Vitest, Node test runner.

---

## File map

- Create `artifacts/api-server/src/lib/wholesale-organiser-wallets.ts`
  - Own the organiser-wallet input type, supported-network allow-list, normalizer,
    redacted audit descriptors, and state-editability rule.
- Create `artifacts/api-server/src/lib/wholesale-organiser-wallets.test.ts`
  - Unit-test wallet normalization, state gating, and audit redaction.
- Modify `artifacts/api-server/src/routes/wholesale-shares.ts`
  - Add force-lock mode and endpoint, reuse wallet validation in the existing fee
    route, add the dedicated admin wallet route, and return wallet data in admin detail.
- Modify `artifacts/api-server/src/routes/admin-security-hardening.test.ts`
  - Protect the admin-only route wiring and force-lock mode contract.
- Create `artifacts/peps-anonymous/src/pages/admin-wholesale-shares-contract.test.ts`
  - Protect the admin force-lock endpoint, warning copy, wallet editor, and wallet endpoint.
- Modify `artifacts/peps-anonymous/src/pages/Admin.tsx`
  - Extend admin detail types/state and render the force-lock and organiser-wallet controls.

### Task 1: Add shared organiser-wallet validation

**Files:**
- Create: `artifacts/api-server/src/lib/wholesale-organiser-wallets.ts`
- Create: `artifacts/api-server/src/lib/wholesale-organiser-wallets.test.ts`
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`

- [ ] **Step 1: Write failing wallet-domain tests**

Test these exact behaviors:

```ts
import { describe, expect, it } from "vitest";
import {
  canAdminEditOrganiserWallets,
  describeOrganiserWallets,
  normalizeOrganiserWallets,
} from "./wholesale-organiser-wallets";

describe("organiser wallet validation", () => {
  it("normalizes valid entries and drops incomplete entries", () => {
    expect(normalizeOrganiserWallets([
      { currency: " usdt ", network: "ERC-20", walletAddress: " 0xabc " },
      { currency: "", network: "Solana", walletAddress: "missing-currency" },
    ])).toEqual([{ currency: "USDT", network: "ERC-20", walletAddress: "0xabc" }]);
  });

  it("rejects unsupported networks", () => {
    expect(() => normalizeOrganiserWallets([
      { currency: "USDT", network: "Unsupported", walletAddress: "abc" },
    ])).toThrow("Unsupported crypto network");
  });

  it("allows admin edits only while open or locked", () => {
    expect(canAdminEditOrganiserWallets("open")).toBe(true);
    expect(canAdminEditOrganiserWallets("locked")).toBe(true);
    expect(canAdminEditOrganiserWallets("submitted")).toBe(false);
    expect(canAdminEditOrganiserWallets("cancelled")).toBe(false);
  });

  it("never includes addresses in audit descriptors", () => {
    const descriptors = describeOrganiserWallets([
      { currency: "USDT", network: "ERC-20", walletAddress: "0xsecret" },
    ]);
    expect(descriptors).toEqual([{ currency: "USDT", network: "ERC-20" }]);
    expect(JSON.stringify(descriptors)).not.toContain("0xsecret");
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/wholesale-organiser-wallets.test.ts
```

Expected: FAIL because `wholesale-organiser-wallets.ts` does not exist.

- [ ] **Step 3: Implement the wallet-domain module**

Implement:

```ts
export interface OrganiserWalletOption {
  currency: string;
  network: string;
  walletAddress: string;
}

const VALID_NETWORKS = new Set([
  "ERC-20", "Arbitrum One", "Polygon", "Solana",
  "TRC-20", "Bitcoin Mainnet", "Ethereum",
]);

export function normalizeOrganiserWallets(value: unknown): OrganiserWalletOption[] {
  if (!Array.isArray(value)) throw new Error("Wallet options must be an array.");
  const result: OrganiserWalletOption[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const currency = String(item.currency ?? "").trim().toUpperCase().slice(0, 10);
    const network = String(item.network ?? "").trim().slice(0, 50);
    const walletAddress = String(item.walletAddress ?? "").trim().slice(0, 200);
    if (!currency || !network || !walletAddress) continue;
    if (!VALID_NETWORKS.has(network)) throw new Error(`Unsupported crypto network: ${network}`);
    result.push({ currency, network, walletAddress });
  }
  return result;
}

export const canAdminEditOrganiserWallets = (status: string) =>
  status === "open" || status === "locked";

export const describeOrganiserWallets = (wallets: OrganiserWalletOption[]) =>
  wallets.map(({ currency, network }) => ({ currency, network }));
```

- [ ] **Step 4: Replace the fee route's local wallet cleaner**

Import `normalizeOrganiserWallets` into `wholesale-shares.ts`. Replace the local
network set and `cleanCryptoOptions` implementation so the organiser-facing fee
route and the new admin route cannot drift. Preserve the existing behavior where
an explicit empty array clears all organiser wallets.

- [ ] **Step 5: Run wallet tests and API typecheck for changed code**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/wholesale-organiser-wallets.test.ts
pnpm --filter @workspace/api-server typecheck
```

Expected: wallet tests PASS. If the repository's documented unrelated backend
type errors remain, record them and continue only after confirming no error points
to the changed files.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/lib/wholesale-organiser-wallets.ts \
  artifacts/api-server/src/lib/wholesale-organiser-wallets.test.ts \
  artifacts/api-server/src/routes/wholesale-shares.ts
git commit -m "Share organiser wallet validation"
```

### Task 2: Add the admin force-lock endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`
- Modify: `artifacts/api-server/src/routes/admin-security-hardening.test.ts`

- [ ] **Step 1: Write a failing route-contract test**

Add assertions that require:

```ts
const wholesale = read("./wholesale-shares.ts");
expect(wholesale).toContain('router.post("/admin/wholesale-shares/:id/force-lock"');
expect(wholesale).toContain('"admin_force"');
expect(wholesale).toContain("wholesale_share_admin_force_locked");
```

Also assert the normal `/wholesale-shares/:id/lock` call still passes `"manual"`.

- [ ] **Step 2: Run the contract test and verify RED**

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/admin-security-hardening.test.ts
```

Expected: FAIL because the route and `admin_force` mode do not exist.

- [ ] **Step 3: Extend the lock service mode**

Change the signature to:

```ts
type LockMode = "manual" | "auto" | "admin_force";

export async function attemptLockShare(
  share: ShareRow,
  actor: string,
  mode: LockMode,
): Promise<LockResult>
```

Derive `const forceMemberReadiness = mode === "admin_force"`. Guard both the
pre-transaction and in-transaction confirmation checks with
`!forceMemberReadiness`. Guard only the per-member minimum-kit check with the same
condition. Do not bypass member-count, delivery, pricing, total caps, row-lock,
status-transition, or payment-protection checks.

- [ ] **Step 4: Add the dedicated admin endpoint**

Under the existing admin route group:

```ts
router.post("/admin/wholesale-shares/:id/force-lock", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const share = await loadShare(String(req.params.id));
  if (!share) return void res.status(404).json({ error: "Shared order not found" });
  const result = await attemptLockShare(share, res.locals.adminUsername ?? "admin", "admin_force");
  if (!result.ok) return void res.status(result.status).json({ error: result.error });
  const updated = await loadShare(share.id);
  res.json(await buildShareResponse(updated!, ""));
});
```

Have the lock service emit `wholesale_share_admin_force_locked` at warning level
for `admin_force`, with member, empty-member, unconfirmed-member, kit, and shipping
counts. Keep the existing `wholesale_share_locked` event for manual/auto modes.
Never log wallet addresses.

- [ ] **Step 5: Run focused backend tests**

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/routes/admin-security-hardening.test.ts \
  src/lib/wholesale-organiser-wallets.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/wholesale-shares.ts \
  artifacts/api-server/src/routes/admin-security-hardening.test.ts
git commit -m "Add admin shared order force lock"
```

### Task 3: Add the admin organiser-wallet endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`
- Modify: `artifacts/api-server/src/routes/admin-security-hardening.test.ts`

- [ ] **Step 1: Add failing route and privacy assertions**

Require the route and safe audit helper:

```ts
expect(wholesale).toContain('router.put("/admin/wholesale-shares/:id/organiser-wallets"');
expect(wholesale).toContain("describeOrganiserWallets");
expect(wholesale).toContain("wholesale_share_admin_wallets_updated");
```

- [ ] **Step 2: Run and verify RED**

Run the focused admin-security test. Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement the endpoint**

Authenticate with `requireAdmin`, load the share, return 404 when absent, and
return 409 unless `canAdminEditOrganiserWallets(share.status)` is true. Normalize
`req.body.wallets`, update only `leadCryptoOptions`, and return refreshed admin
detail data.

Write a warning-level audit event containing:

```ts
{
  shareId,
  before: describeOrganiserWallets(previousWallets),
  after: describeOrganiserWallets(wallets),
}
```

Do not update fee-paid flags, totals, platform wallet data, or organiser payment status.

- [ ] **Step 4: Confirm the admin detail response exposes current wallets**

`buildShareResponse` already returns `fees.leadCryptoOptions`; preserve that field
in `/admin/wholesale-shares/:id`. Add a response-level assertion if implementation
changes would otherwise omit it.

- [ ] **Step 5: Run focused tests**

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/routes/admin-security-hardening.test.ts \
  src/lib/wholesale-organiser-wallets.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/wholesale-shares.ts \
  artifacts/api-server/src/routes/admin-security-hardening.test.ts
git commit -m "Let admins edit organiser wallets"
```

### Task 4: Add the force-lock and wallet controls to the admin tab

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/admin-wholesale-shares-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`

- [ ] **Step 1: Write the failing frontend contract test**

Use Node's test runner and read `Admin.tsx` as text. Require:

```ts
assert.match(source, /\/admin\/wholesale-shares\/\$\{row\.id\}\/force-lock/);
assert.match(source, /Force lock/);
assert.match(source, /unconfirmed members/i);
assert.match(source, /organiser-wallets/);
assert.match(source, /Organiser payment wallets/);
assert.match(source, /leadCryptoOptions/);
```

- [ ] **Step 2: Run and verify RED**

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test \
  src/pages/admin-wholesale-shares-contract.test.ts
```

Expected: FAIL because the force endpoint and wallet editor do not exist.

- [ ] **Step 3: Extend frontend types and editor state**

Ensure `AdminShareDetail.fees.leadCryptoOptions` is typed as:

```ts
Array<{ currency: string; network: string; walletAddress: string }>
```

Add:

```ts
type AdminOrganiserWalletDraft = {
  currency: string;
  network: string;
  walletAddress: string;
};

const [walletEditor, setWalletEditor] = useState<{
  shareId: string;
  wallets: AdminOrganiserWalletDraft[];
} | null>(null);
```

Initialize the editor from the latest `detail.fees.leadCryptoOptions`, not stale
row data.

- [ ] **Step 4: Add a dedicated force-lock handler**

Do not reuse the generic warning. Show a force-specific confirmation explaining
that unconfirmed and empty members will not block locking and current financial
values will be materialised. POST to
`/admin/wholesale-shares/${detail.id}/force-lock`, disable while busy, then refresh
both detail and the current status-filter list so the row moves between tabs.

- [ ] **Step 5: Render and save the wallet editor**

In the expanded admin settings card:

- show all current wallet rows;
- provide currency, supported-network select, and address input;
- allow add/remove;
- disable editing outside `open`/`locked`;
- confirm before saving;
- PUT `{ wallets: walletEditor.wallets }` to the dedicated admin endpoint;
- close the editor and refresh detail only after success;
- keep the editor open and display/alert the server error on failure.

- [ ] **Step 6: Run frontend tests and typecheck**

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test \
  src/pages/admin-wholesale-shares-contract.test.ts
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/peps-anonymous typecheck
```

Expected: contract and auth tests PASS; typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/Admin.tsx \
  artifacts/peps-anonymous/src/pages/admin-wholesale-shares-contract.test.ts
git commit -m "Add admin shared order force controls"
```

### Task 5: Verify the complete feature

**Files:**
- Verify all files changed above.

- [ ] **Step 1: Run the API suite**

```bash
pnpm --filter @workspace/api-server test
```

Expected: all feature tests pass. If the known disposable-Postgres `initdb`
environment test fails, run it in isolation once and report both results.

- [ ] **Step 2: Run frontend verification**

```bash
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/peps-anonymous typecheck
pnpm --filter @workspace/peps-anonymous build
git diff --check
```

Expected: PASS.

- [ ] **Step 3: Restart the canonical workflow**

Restart only `Start application`. Confirm schema sync completes, Vite reports
ready, and the API reports `Server listening on port 8080`.

- [ ] **Step 4: Visually verify the admin Shared Orders tab**

Capture the running app and verify:

- an open shared order shows `Force lock`;
- the warning is explicit;
- the organiser wallet section displays current rows;
- open/locked orders allow editing;
- submitted/cancelled orders are read-only;
- loading and disabled states remain legible on desktop and mobile widths.

- [ ] **Step 5: Final commit if verification required adjustments**

```bash
git add artifacts/api-server artifacts/peps-anonymous
git commit -m "Verify admin shared order controls"
```

Do not commit unrelated uploaded assets.