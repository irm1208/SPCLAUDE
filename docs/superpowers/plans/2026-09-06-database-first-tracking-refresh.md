# Database-First Tracking Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce 17TRACK usage by refreshing persisted, active tracking records no more than once every six hours and deduplicating provider work.

**Architecture:** Keep PostgreSQL as the source used by every read path. Extract pure refresh-policy helpers and a small process-level provider coordinator, then route the existing scheduled and manual refresh functions through them while preserving each domain’s current compare-and-set and privacy rules.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL, Vitest, 17TRACK v2.4 API

---

## File Structure

- Create `artifacts/api-server/src/lib/tracking-refresh-policy.ts`: pure six-hour staleness, terminal-status, retry-backoff, and tracking-key helpers.
- Create `artifacts/api-server/src/lib/tracking-refresh-policy.test.ts`: deterministic policy tests.
- Create `artifacts/api-server/src/lib/track17-client.ts`: provider client with in-flight deduplication, successful-registration memory, timeout handling, and bounded failure backoff.
- Create `artifacts/api-server/src/lib/track17-client.test.ts`: provider-call-count and concurrency tests using injected fetch/key/time dependencies.
- Modify `artifacts/api-server/src/lib/tracking-auto-refresh.ts`: use the shared policy and provider client in scheduled and manual refresh paths.
- Modify `artifacts/api-server/src/lib/tracking-auto-refresh-model.test.ts`: assert six-hour candidate selection and terminal exclusions at the existing package projection boundary.

### Task 1: Define the Six-Hour Refresh Policy

**Files:**
- Create: `artifacts/api-server/src/lib/tracking-refresh-policy.ts`
- Create: `artifacts/api-server/src/lib/tracking-refresh-policy.test.ts`
- Modify: `artifacts/api-server/src/lib/tracking-auto-refresh-model.test.ts`

- [ ] **Step 1: Write failing policy tests**

Add tests covering:

```ts
expect(TRACKING_STALE_AFTER_MS).toBe(6 * 60 * 60 * 1000);
expect(isTrackingRefreshDue(null, "in_transit", now)).toBe(true);
expect(isTrackingRefreshDue(new Date(now - TRACKING_STALE_AFTER_MS + 1), "in_transit", now)).toBe(false);
expect(isTrackingRefreshDue(new Date(now - TRACKING_STALE_AFTER_MS - 1), "in_transit", now)).toBe(true);
expect(isTrackingRefreshDue(null, "delivered", now)).toBe(false);
expect(isTrackingRefreshDue(null, "undeliverable", now)).toBe(false);
expect(isTrackingRefreshDue(null, "expired", now)).toBe(false);
expect(trackingRefreshKey("orders", " ab 123 ", 3011)).toBe("orders:AB123:3011");
```

Extend the existing candidate test so a package checked five hours ago is excluded and one checked more than six hours ago is included.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/lib/tracking-refresh-policy.test.ts \
  src/lib/tracking-auto-refresh-model.test.ts
```

Expected: failure because the policy module and six-hour constant do not exist.

- [ ] **Step 3: Implement the pure policy**

Create exports with these contracts:

```ts
export const TRACKING_STALE_AFTER_MS = 6 * 60 * 60 * 1000;
export const TRACKING_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
export const TRACKING_FAILURE_BACKOFF_MS = 30 * 60 * 1000;
export const TERMINAL_TRACKING_STATUSES = new Set([
  "delivered",
  "undeliverable",
  "expired",
]);

export function normalizeTrackingNumber(value: string): string;
export function trackingRefreshKey(
  domain: string,
  trackingNumber: string,
  carrierCode?: number,
): string;
export function isTrackingRefreshDue(
  lastChecked: Date | string | null | undefined,
  status: string | null | undefined,
  now?: number,
): boolean;
```

Use strict timestamp parsing. Invalid or missing timestamps are due unless the status is terminal.

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2.

Expected: both test files pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/tracking-refresh-policy.ts \
  artifacts/api-server/src/lib/tracking-refresh-policy.test.ts \
  artifacts/api-server/src/lib/tracking-auto-refresh-model.test.ts
git commit -m "test: define six-hour tracking refresh policy"
```

### Task 2: Deduplicate 17TRACK Provider Calls

**Files:**
- Create: `artifacts/api-server/src/lib/track17-client.ts`
- Create: `artifacts/api-server/src/lib/track17-client.test.ts`

- [ ] **Step 1: Write failing coordinator tests**

Build the client through dependency injection:

```ts
const client = createTrack17Client({
  getApiKey: async () => "test-key",
  fetch: fetchSpy,
  now: () => now,
});
```

Test these observable behaviours:

```ts
await Promise.all([
  client.getTrackingInfo("ABC123", 3011),
  client.getTrackingInfo(" abc 123 ", 3011),
]);
expect(getTrackInfoCalls).toBe(1);

await client.getTrackingInfo("ABC123", 3011);
await client.getTrackingInfo("ABC123", 3011);
expect(registerCalls).toBe(1);

fetchSpy.mockRejectedValueOnce(new Error("provider down"));
expect(await client.getTrackingInfo("FAIL1", 0)).toBeNull();
expect(await client.getTrackingInfo("FAIL1", 0)).toBeNull();
expect(fetchSpy).toHaveBeenCalledTimes(1);
```

Also test that a successful request after the backoff expires is allowed and that carrier-specific keys do not collide.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/track17-client.test.ts
```

Expected: failure because `createTrack17Client` does not exist.

- [ ] **Step 3: Implement the provider client**

Expose:

```ts
export type Track17Client = {
  getTrackingInfo(
    trackingNumber: string,
    carrierCode?: number,
    options?: { force?: boolean },
  ): Promise<unknown | null>;
};

export function createTrack17Client(deps: {
  getApiKey: () => Promise<string | null>;
  fetch?: typeof fetch;
  now?: () => number;
}): Track17Client;
```

Implementation requirements:

- normalize keys with `trackingRefreshKey`;
- keep one `Map<string, Promise<unknown | null>>` for in-flight work;
- keep bounded timestamp maps for successful registration and failed attempts;
- register only when the key has not registered successfully during the current server process;
- treat 17TRACK error `-18019901` as successfully registered;
- use the existing 10-second timeout;
- remove in-flight entries in `finally`;
- never expose the API key or provider response in logs.

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2.

Expected: all coordinator tests pass with exact provider-call counts.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/track17-client.ts \
  artifacts/api-server/src/lib/track17-client.test.ts
git commit -m "feat: deduplicate 17track refresh calls"
```

### Task 3: Route Existing Refreshes Through the Shared Policy

**Files:**
- Modify: `artifacts/api-server/src/lib/tracking-auto-refresh.ts`
- Modify: `artifacts/api-server/src/lib/tracking-auto-refresh-model.ts`
- Test: `artifacts/api-server/src/lib/tracking-auto-refresh-model.test.ts`
- Test: `artifacts/api-server/src/lib/track17-client.test.ts`

- [ ] **Step 1: Write failing integration-level model assertions**

Add assertions that:

```ts
trackingRefreshCandidates(sourceCheckedFiveHoursAgo, now, TRACKING_STALE_AFTER_MS)
```

returns no candidates, while the same source checked seven hours ago returns its active legs. Add terminal-status cases for every persisted tracking shape represented by the model tests.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/lib/tracking-refresh-policy.test.ts \
  src/lib/track17-client.test.ts \
  src/lib/tracking-auto-refresh-model.test.ts
```

Expected: new assertions fail against the existing 90-minute integration.

- [ ] **Step 3: Integrate the shared client**

In `tracking-auto-refresh.ts`:

- replace local `REFRESH_INTERVAL_MS`, `STALE_AFTER_MS`, terminal-status set, timeout fetch, register, and get-info helpers with imports from the new modules;
- instantiate one process-wide client using the existing database/environment API-key lookup;
- replace each adjacent register/get-info sequence with `track17Client.getTrackingInfo(number, carrierCode)`;
- preserve carrier fallback by retrying once with carrier code `0` only when the carrier-specific lookup returns no accepted result;
- use `TRACKING_STALE_AFTER_MS` in every stale SQL threshold and package candidate call;
- use `isTrackingRefreshDue` for JSON-embedded package timestamps;
- use `TRACKING_SCHEDULER_INTERVAL_MS` for scheduler registration;
- preserve existing compare-and-set writes, notifications, event masking, and manual-refresh authorization.

- [ ] **Step 4: Run focused tests**

Run the command from Step 2.

Expected: all focused tests pass.

- [ ] **Step 5: Run API typecheck**

Run:

```bash
pnpm --filter @workspace/api-server run typecheck
```

Expected: exit code 0.

- [ ] **Step 6: Restart and verify runtime**

Restart only the canonical `Start application` workflow. Confirm:

```bash
curl -fsS http://127.0.0.1:8080/api/products >/dev/null
curl -fsS http://127.0.0.1:5000/ >/dev/null
```

Inspect workflow logs and confirm the tracking scheduler registers without startup errors.

- [ ] **Step 7: Commit**

```bash
git add artifacts/api-server/src/lib/tracking-auto-refresh.ts \
  artifacts/api-server/src/lib/tracking-auto-refresh-model.ts \
  artifacts/api-server/src/lib/tracking-auto-refresh-model.test.ts
git commit -m "feat: refresh saved tracking every six hours"
```

### Task 4: Final Verification

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the complete affected test set**

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/lib/tracking-refresh-policy.test.ts \
  src/lib/track17-client.test.ts \
  src/lib/tracking-auto-refresh-model.test.ts \
  src/lib/order-tracking-model.test.ts \
  src/lib/telegram-package-tracking.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @workspace/api-server run typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Verify no read path gained provider access**

```bash
rg -n "api\\.17track\\.net|track17Client|getTrackingInfo" artifacts/api-server/src/routes
```

Expected: no new GET/page-load handler calls. Existing explicit manual-refresh route calls are permitted.

- [ ] **Step 4: Review the diff**

```bash
git diff HEAD~3 --check
git status --short
```

Expected: no whitespace errors and no uncommitted implementation files.