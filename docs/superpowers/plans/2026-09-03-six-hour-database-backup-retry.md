# Six-Hour Database Backup Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change production PostgreSQL backups to a six-hour cadence and retry lock-contended attempts until they run instead of silently dropping them.

**Architecture:** Keep `pg_try_advisory_lock` as the distributed mutex and make `runDbBackup` return a typed outcome for the scheduler. Extract the timer orchestration into a small injectable scheduler helper; it will maintain one pending retry timer per instance, while the existing dump/upload/cleanup path remains unchanged.

**Tech Stack:** TypeScript, Node.js timers, PostgreSQL advisory locks, Vitest, pnpm workspace scripts.

---

## Files and responsibilities

- **Modify:** `artifacts/api-server/src/lib/db-backup.ts`
  - Export the six-hour interval constant and retry delay constant for focused tests.
  - Add a `DbBackupResult` union for scheduler-visible outcomes.
  - Return lock contention, local in-progress, and missing-database outcomes from `runDbBackup`.
  - Add an injectable `createDbBackupScheduler` that schedules the ten-minute first run, six-hour recurring run, and one-at-a-time retry timer.
  - Keep `startDbBackupSchedule` production-only and connect it to the existing `runDbBackup`.
- **Create:** `artifacts/api-server/src/lib/db-backup.test.ts`
  - Test the timer contract and retry state machine without real database, filesystem, `pg_dump`, or Google Drive calls.
- **Modify:** `.agents/memory/google-drive-database-backups.md`
  - Update the durable scheduling description after implementation so future work does not rely on the old twelve-hour/skip behavior.

## Task 1: Add failing scheduler behavior tests

**Files:**
- Create: `artifacts/api-server/src/lib/db-backup.test.ts`

- [ ] **Step 1: Write tests for the public scheduler contract**

Use Vitest fake timers and an injected `runBackup` callback. The test file should import `BACKUP_RETRY_DELAY_MS`, `FIRST_BACKUP_DELAY_MS`, `INTERVAL_MS`, `DbBackupResult`, and `createDbBackupScheduler` from `./db-backup`.

Cover these behaviors with separate tests:

```ts
it("uses a six-hour recurring interval", () => {
  expect(INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
});

it("runs the first production attempt after ten minutes", async () => {
  const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("completed");
  const scheduler = createDbBackupScheduler(runBackup);
  scheduler.start();

  await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS - 1);
  expect(runBackup).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(runBackup).toHaveBeenCalledTimes(1);
});

it("runs recurring attempts every six hours", async () => {
  const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("completed");
  const scheduler = createDbBackupScheduler(runBackup);
  scheduler.start();

  await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
  await vi.advanceTimersByTimeAsync(INTERVAL_MS);
  expect(runBackup).toHaveBeenCalledTimes(2);
});

it("retries a lock-contended attempt after the retry delay", async () => {
  const runBackup = vi.fn<() => Promise<DbBackupResult>>()
    .mockResolvedValueOnce("lock_contended")
    .mockResolvedValueOnce("completed");
  const scheduler = createDbBackupScheduler(runBackup);
  scheduler.start();

  await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
  expect(runBackup).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(BACKUP_RETRY_DELAY_MS - 1);
  expect(runBackup).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(runBackup).toHaveBeenCalledTimes(2);
});

it("keeps only one pending retry when multiple attempts see lock contention", async () => {
  const runBackup = vi.fn<() => Promise<DbBackupResult>>()
    .mockResolvedValue("lock_contended");
  const scheduler = createDbBackupScheduler(runBackup);
  scheduler.start();

  await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
  await vi.advanceTimersByTimeAsync(BACKUP_RETRY_DELAY_MS);
  expect(runBackup).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(2);
});

it("does not create overlapping backup work when a recurring callback fires during local work", async () => {
  let resolveBackup!: (result: DbBackupResult) => void;
  const runBackup = vi.fn<() => Promise<DbBackupResult>>()
    .mockImplementationOnce(() => new Promise<DbBackupResult>(resolve => {
      resolveBackup = resolve;
    }))
    .mockResolvedValue("completed");
  const scheduler = createDbBackupScheduler(runBackup);
  scheduler.start();

  await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
  await vi.advanceTimersByTimeAsync(INTERVAL_MS);
  expect(runBackup).toHaveBeenCalledTimes(1);
  resolveBackup("completed");
  await vi.advanceTimersByTimeAsync(0);
  expect(runBackup).toHaveBeenCalledTimes(1);
});

it("stops all scheduled timers when stopped", async () => {
  const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("completed");
  const scheduler = createDbBackupScheduler(runBackup);
  scheduler.start();
  scheduler.stop();

  await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS + INTERVAL_MS);
  expect(runBackup).not.toHaveBeenCalled();
});
```

The overlap test must prove that the scheduler-level in-flight guard prevents an interval callback from invoking `runBackup` while the prior scheduled invocation is unresolved.

- [ ] **Step 2: Run the new test file and verify it fails for the missing implementation**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup.test.ts
```

Expected: FAIL because the new exports and scheduler helper do not exist yet. Do not change production code before observing this expected failure.

- [ ] **Step 3: Commit the failing tests**

```bash
git add artifacts/api-server/src/lib/db-backup.test.ts
git commit -m "test: specify six-hour backup retry scheduling"
```

## Task 2: Implement the six-hour scheduler and forced retries

**Files:**
- Modify: `artifacts/api-server/src/lib/db-backup.ts`

- [ ] **Step 1: Add typed outcomes and timing constants**

Replace the twelve-hour interval with:

```ts
export const INTERVAL_MS = 6 * 60 * 60 * 1000;
export const FIRST_BACKUP_DELAY_MS = 10 * 60 * 1000;
export const BACKUP_RETRY_DELAY_MS = 5 * 60 * 1000;

export type DbBackupResult =
  | "completed"
  | "lock_contended"
  | "already_in_progress"
  | "not_configured";
```

Keep the existing backup directory, retention, lock name, and file naming constants unchanged.

- [ ] **Step 2: Make `runDbBackup` report scheduler-relevant outcomes**

Change the return type to `Promise<DbBackupResult>` and return:

- `"already_in_progress"` when the instance-local guard is set.
- `"not_configured"` when `DATABASE_URL` is absent.
- `"lock_contended"` when `withBackupLock` returns `false`.
- `"completed"` after the existing locked task finishes, including the existing behavior that logs and retains a temporary file if dump/upload fails.

Do not remove the advisory lock, upload-before-delete order, exact-size verification, or pruning behavior.

- [ ] **Step 3: Implement the injectable scheduler**

Add:

```ts
export function createDbBackupScheduler(
  runBackup: () => Promise<DbBackupResult>,
): {
  start: () => void;
  stop: () => void;
}
```

The scheduler must:

1. Schedule the first call after `FIRST_BACKUP_DELAY_MS`.
2. Schedule recurring calls with `INTERVAL_MS`.
3. After `"lock_contended"`, schedule one retry after `BACKUP_RETRY_DELAY_MS`.
4. Keep a retry timer reference so repeated lock contention cannot create multiple pending retry timers.
5. Clear the retry reference before invoking a retry, allowing the next lock-contended result to schedule the next retry.
6. Track an in-flight scheduler invocation so a retry or interval callback does not invoke `runBackup` concurrently with an unresolved prior call.
7. Catch and log rejected `runBackup` promises from timer callbacks rather than producing unhandled rejections.
8. Make `stop()` clear the first-run, interval, and retry timers and prevent later callback work.

A successful `"completed"` result clears the pending retry state if one exists. The normal interval must remain independent of retries.

- [ ] **Step 4: Connect production startup to the scheduler**

Update `startDbBackupSchedule` to keep the existing development guard and log the new six-hour cadence. In production, create and start the scheduler with `runDbBackup`:

```ts
const scheduler = createDbBackupScheduler(runDbBackup);
scheduler.start();
```

Use the existing log prefix and state clearly that a lock-contended attempt will be retried.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup.test.ts
```

Expected: PASS with all scheduler tests green.

- [ ] **Step 6: Commit the implementation**

```bash
git add artifacts/api-server/src/lib/db-backup.ts
git commit -m "feat: retry production backups every six hours"
```

## Task 3: Update durable documentation and verify the whole API artifact

**Files:**
- Modify: `.agents/memory/google-drive-database-backups.md`

- [ ] **Step 1: Update the scheduling rule**

Change the durable description from “every 12 hours” and “skipped rather than queued” to six-hour production attempts and retry-until-lock-available behavior. Preserve the documented ten-minute startup delay, development disablement, advisory lock, upload-before-delete rule, exact-size verification, indefinite Drive retention, and local failure retention.

- [ ] **Step 2: Run the full API test suite**

Run:

```bash
pnpm --filter @workspace/api-server test
```

Expected: PASS with no failing tests.

- [ ] **Step 3: Run the API typecheck**

Run:

```bash
pnpm --filter @workspace/api-server typecheck
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 4: Check the final diff**

Run:

```bash
git diff HEAD~3 --check
git status --short
```

Expected: no whitespace errors and only the intended scheduler, test, and memory changes present.

- [ ] **Step 5: Commit the documentation update**

```bash
git add .agents/memory/google-drive-database-backups.md
git commit -m "docs: record backup retry schedule"
```