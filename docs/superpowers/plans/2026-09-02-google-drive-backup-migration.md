# Google Drive Backup Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all existing local SQL dumps to Google Drive with verified upload-before-delete behavior and make future production backups plain, uncompressed `S&PBACKUP-YYYY-MM-DD_HH-MM-SS.SQL` files.

**Architecture:** Keep Google Drive access behind the existing connector-backed storage module. Add exact-name/exact-size lookup and upload verification for the one-shot migration, while the scheduler uses the same resumable uploader for plain SQL files. Raw SQL is gzip-encoded only across the connector transport and decoded by Drive before storage; historical files preserve their original names and only future scheduled files use the new S&P naming convention.

**Tech Stack:** TypeScript, Node.js `pg_dump`, Replit Connectors SDK, Google Drive v3 resumable uploads, Vitest, `tsx`.

---

### Task 1: Lock the filename and uploader contract with tests

**Files:**
- Modify: `artifacts/api-server/src/lib/google-drive-backup.test.ts`
- Modify: `artifacts/api-server/src/lib/google-drive-backup.ts`

- [ ] **Step 1: Write the failing tests**

Update the filename expectation to:

```ts
expect(buildDriveBackupFileName(new Date("2026-09-02T10:40:11.000Z"))).toBe(
  "S&PBACKUP-2026-09-02_10-40-11.SQL",
);
```

Add tests for the pure migration matching helper:

```ts
expect(findMatchingDriveBackup(
  [
    { id: "wrong-size", name: "backup.sql", size: "10" },
    { id: "right", name: "backup.sql", size: "11" },
  ],
  "backup.sql",
  11,
)).toEqual({ id: "right", name: "backup.sql", size: "11" });

expect(findMatchingDriveBackup(
  [{ id: "conflict", name: "backup.sql", size: "10" }],
  "backup.sql",
  11,
)).toBeNull();
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/google-drive-backup.test.ts
```

Expected: FAIL because the current helper emits the old lowercase gzip filename and has no exact-size matching helper.

- [ ] **Step 3: Implement the minimal helpers**

Change `buildDriveBackupFileName` to return the uppercase `S&PBACKUP-...SQL` name and export:

```ts
export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

export function findMatchingDriveBackup(
  files: DriveBackupFile[],
  fileName: string,
  sizeBytes: number,
): DriveBackupFile | null {
  return files.find(
    (file) => file.name === fileName && Number(file.size) === sizeBytes,
  ) ?? null;
}
```

Remove remote retention selection and pruning because Drive backups are retained indefinitely.

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same Vitest command. Expected: all filename and matching tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/google-drive-backup.ts artifacts/api-server/src/lib/google-drive-backup.test.ts
git commit -m "feat: use plain SQL Google Drive backup names"
```

### Task 2: Make scheduled backups plain SQL

**Files:**
- Modify: `artifacts/api-server/src/lib/db-backup.ts`

- [ ] **Step 1: Write the failing scheduler contract test**

Add a pure assertion around the backup naming and command arguments so the intended command remains explicit:

```ts
expect(buildPgDumpArgs("postgres://example")).toEqual([
  "--no-owner",
  "--no-privileges",
  "postgres://example",
]);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run the API test file containing the new assertion. Expected: FAIL because the command-argument helper does not exist.

- [ ] **Step 3: Implement plain SQL output**

Remove `createGzip`, `pipeline`, and stream compression. Write `pg_dump` stdout directly to a temporary `.SQL` file under `/tmp`. Export or isolate `buildPgDumpArgs` so the exact flags remain testable:

```ts
export function buildPgDumpArgs(dbUrl: string): string[] {
  return ["--no-owner", "--no-privileges", dbUrl];
}
```

Use `S&PBACKUP-...SQL` from `buildDriveBackupFileName`, upload it through the Drive storage module, verify the remote size, and delete the temporary local file only after verification. Preserve the development skip, ten-minute production delay, and advisory lock.

- [ ] **Step 4: Run typecheck and focused tests**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/google-drive-backup.test.ts
pnpm --filter @workspace/api-server run typecheck
```

Expected: tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/db-backup.ts artifacts/api-server/src/lib/google-drive-backup.test.ts
git commit -m "feat: schedule uncompressed SQL backups"
```

### Task 3: Add the idempotent historical migration runner

**Files:**
- Create: `artifacts/api-server/scripts/migrate-db-backups-to-google-drive.ts`
- Modify: `artifacts/api-server/src/lib/google-drive-backup.ts`
- Modify: `artifacts/api-server/package.json`
- Test: `artifacts/api-server/src/lib/google-drive-backup.test.ts`

- [ ] **Step 1: Write failing migration tests**

Cover:

```ts
expect(discoverLegacyBackupFiles(["/tmp/a.sql", "/tmp/b.txt"])).toEqual([
  "/tmp/a.sql",
]);

expect(migrationAction({ localPath: "/tmp/backup.sql", localSize: 11, remote: null }))
  .toBe("upload");
expect(migrationAction({ localPath: "/tmp/backup.sql", localSize: 11,
  remote: { id: "same", name: "backup.sql", size: "11" } }))
  .toBe("already_migrated");
expect(migrationAction({ localPath: "/tmp/backup.sql", localSize: 11,
  remote: { id: "conflict", name: "backup.sql", size: "10" } }))
  .toBe("conflict");
```

- [ ] **Step 2: Run the focused test to verify it fails**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/google-drive-backup.test.ts
```

Expected: FAIL because the migration helpers do not exist.

- [ ] **Step 3: Implement the migration storage methods**

Expose exact-folder listing, exact-name lookup, upload, and remote size verification from the Drive storage boundary. Treat a same-name different-size file as a conflict and never overwrite it. Use a temporary gzip transport envelope because the connector WAF rejects raw SQL request bodies; send the full decoded byte range in one resumable request, verify Drive stored the uncompressed byte size, and delete the envelope immediately.

- [ ] **Step 4: Implement the one-shot runner**

The script must:

1. Discover `.sql` files from `db-backups/` and `artifacts/api-server/db-backups/`.
2. Preserve each basename as the Drive filename.
3. Check Drive for exact name and exact size before upload.
4. Upload one file at a time when no matching file exists.
5. Verify the returned Drive file ID and exact size.
6. Delete the local file only after verification.
7. Log `already_migrated`, `uploaded_and_verified`, `conflict`, or `failed_and_retained`.
8. Continue to the next file after a failure.

Add a package script:

```json
"migrate:db-backups": "tsx scripts/migrate-db-backups-to-google-drive.ts"
```

- [ ] **Step 5: Run migration tests and typecheck**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/google-drive-backup.test.ts
pnpm --filter @workspace/api-server run typecheck
```

Expected: all migration tests pass and typecheck is clean.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/scripts/migrate-db-backups-to-google-drive.ts artifacts/api-server/src/lib/google-drive-backup.ts artifacts/api-server/src/lib/google-drive-backup.test.ts artifacts/api-server/package.json
git commit -m "feat: migrate legacy backups to Google Drive"
```

### Task 4: Run the real 14 GB migration and verify the result

**Files:**
- No source changes expected.

- [ ] **Step 1: Inventory before deletion**

```bash
find db-backups artifacts/api-server/db-backups -maxdepth 1 -type f -name '*.sql' -printf '%s %p\n' | sort -n
```

Record the file count and byte total.

- [ ] **Step 2: Run the one-shot migration**

```bash
pnpm --filter @workspace/api-server run migrate:db-backups
```

Run one file at a time. If the command is interrupted, rerun the same command; exact name and size matching must skip completed files.

- [ ] **Step 3: Verify Drive and local state**

Confirm every source file is either reported as verified or retained with a failure/conflict reason. Confirm each deleted source has a same-name Drive file with an exact matching size. Confirm no unrelated files were touched.

- [ ] **Step 4: Run the application verification**

```bash
pnpm --filter @workspace/api-server run build:compile
git diff --check
```

Restart the canonical `Start application` workflow and confirm development logs say scheduled backups are disabled and no `pg_dump` process is running.