# Database Backup Drive Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retry retained SQL backup uploads every 10 minutes for up to 6 hours when Google Drive is unavailable, without creating duplicate dumps or repeated failure alerts.

**Architecture:** Split backup execution into normal runs, which reconcile retained files and then create a dump, and recovery runs, which only reconcile retained files. Extend the scheduler with a single bounded recovery timer and callbacks for recovered and expired outcomes.

**Tech Stack:** TypeScript, Node.js timers and filesystem APIs, Vitest fake timers, existing Replit Google Drive connector.

---

### Task 1: Add a retained-backup-only recovery operation

**Files:**
- Modify: `artifacts/api-server/src/lib/db-backup.ts`
- Test: `artifacts/api-server/src/lib/db-backup.test.ts`

- [ ] **Step 1: Write failing tests for retained-only recovery**

Add tests that inject retained-file dependencies and prove recovery:

```ts
it("recovery uploads retained SQL files without creating a new dump", async () => {
  const createDump = vi.fn();
  const reconcile = vi.fn(async () => 1);
  const result = await runRetainedBackupRecovery({ reconcile, createDump });
  expect(result).toBe("completed");
  expect(reconcile).toHaveBeenCalledOnce();
  expect(createDump).not.toHaveBeenCalled();
});

it("recovery reports failure without throwing when Drive remains unavailable", async () => {
  const result = await runRetainedBackupRecovery({
    reconcile: vi.fn(async () => { throw new Error("Drive unavailable"); }),
    createDump: vi.fn(),
  });
  expect(result).toBe("failed");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/lib/db-backup.test.ts
```

Expected: failure because `runRetainedBackupRecovery` does not exist.

- [ ] **Step 3: Implement retained-only recovery**

Export a small dependency-injected operation:

```ts
export async function runRetainedBackupRecovery(options: {
  reconcile: () => Promise<number>;
  consoleError?: (message: string) => void;
}): Promise<"completed" | "failed"> {
  try {
    const recovered = await options.reconcile();
    if (recovered > 0) {
      console.log(`[db-backup] Reconciled ${recovered} retained SQL backup(s)`);
    }
    return "completed";
  } catch {
    (options.consoleError ?? console.error)("[db-backup] Retained SQL backup recovery failed");
    return "failed";
  }
}
```

Extract the existing retained-file dependency assembly into a shared function. Add `runDbBackupRecovery()` that uses `backupInProgress` and the advisory lock, creates the backup directory, calls only retained reconciliation and pruning, and returns the existing `DbBackupResult` outcomes. It must never call `createAndUploadPlainBackup` or spawn `pg_dump`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/lib/db-backup.test.ts
```

Expected: all backup tests pass.

### Task 2: Add the bounded scheduler retry cycle and notifications

**Files:**
- Modify: `artifacts/api-server/src/lib/db-backup.ts`
- Test: `artifacts/api-server/src/lib/db-backup.test.ts`

- [ ] **Step 1: Write failing scheduler tests**

Extend the scheduler factory to accept recovery and lifecycle callbacks:

```ts
const scheduler = createDbBackupScheduler(runBackup, {
  runRecovery,
  onRecoveryStarted,
  onRecovered,
  onRecoveryExpired,
});
```

Add fake-timer tests proving:

```ts
expect(BACKUP_UPLOAD_RETRY_DELAY_MS).toBe(10 * 60 * 1000);
expect(BACKUP_UPLOAD_RETRY_WINDOW_MS).toBe(6 * 60 * 60 * 1000);
```

Then verify a `failed` normal run schedules recovery at 10 minutes, repeated failed recovery calls continue only before the deadline, success clears the cycle and calls `onRecovered` once, expiry calls `onRecoveryExpired` once, only one retry timer exists, the six-hour normal interval remains active, and `stop()` clears all timers.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/lib/db-backup.test.ts
```

Expected: failures because failed runs currently do not schedule recovery.

- [ ] **Step 3: Implement bounded recovery scheduling**

Add:

```ts
export const BACKUP_UPLOAD_RETRY_DELAY_MS = 10 * 60 * 1000;
export const BACKUP_UPLOAD_RETRY_WINDOW_MS = 6 * 60 * 60 * 1000;
```

Track one `uploadRetryTimer`, one `uploadRetryDeadline`, and whether recovery-start/recovery-end callbacks have fired. A normal `failed` result starts the deadline once and schedules recovery. A failed recovery reschedules only when another full delay fits within the deadline. A completed recovery clears retry state. Normal six-hour callbacks continue to call the full backup operation.

Lifecycle callback failures must be caught independently and must not stop scheduling. Production callbacks should:

```ts
onRecoveryStarted: async () => {
  console.warn("[db-backup] Drive upload unavailable — retrying retained SQL backup every 10 min for up to 6 h");
},
onRecovered: async () => {
  await sendAdminMessage("Database backup recovered: retained SQL backup uploaded and verified in Google Drive.");
},
onRecoveryExpired: async () => {
  await sendAdminMessage("Database backup recovery failed: Google Drive remained unavailable for 6 hours.");
},
```

Use sanitized audit and alert records alongside Telegram for recovery and terminal expiry. Do not include credentials, SQL content, or database URLs.

- [ ] **Step 4: Run focused and complete API tests**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/lib/db-backup.test.ts src/lib/google-drive-backup.test.ts
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
git diff --check
```

Expected: all backup tests and the full API suite pass; production build succeeds; diff check is clean.

- [ ] **Step 5: Review and commit**

Run an independent review focused on timer races, duplicate dumps, retained-file deletion safety, process-crash safety, and notification spam. Resolve blocking findings, then commit:

```bash
git add artifacts/api-server/src/lib/db-backup.ts artifacts/api-server/src/lib/db-backup.test.ts docs/superpowers/plans/2026-09-09-database-backup-drive-retry.md
git commit -m "Retry unavailable Drive backup uploads"
```