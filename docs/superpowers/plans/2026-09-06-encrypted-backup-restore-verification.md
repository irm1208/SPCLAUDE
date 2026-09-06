# Encrypted Backup Restore Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encrypt every new production database backup and prove weekly that the latest backup restores successfully into a disposable local PostgreSQL cluster.

**Architecture:** A streaming AES-256-GCM envelope sits between `pg_dump` and Google Drive so no completed plain dump is written locally. A separate verifier downloads the newest backup, decrypts it into `psql` connected only to a locally initialized temporary PostgreSQL cluster, validates the restored database, records a sanitized result, and destroys every temporary artifact.

**Tech Stack:** TypeScript, Node.js streams and `crypto`, PostgreSQL 16 CLI tools, Google Drive v3 through Replit Connectors, Drizzle ORM, Vitest.

---

## File map

- Create `artifacts/api-server/src/lib/backup-encryption.ts`: key parsing, envelope constants, streaming AES-256-GCM encryption/decryption, digest calculation.
- Create `artifacts/api-server/src/lib/backup-encryption.test.ts`: cryptographic format and corruption tests.
- Modify `artifacts/api-server/src/lib/google-drive-backup.ts`: encrypted naming/MIME, list newest backup, raw upload/download streaming.
- Modify `artifacts/api-server/src/lib/google-drive-backup.test.ts`: Drive helper and compatibility tests.
- Modify `artifacts/api-server/src/lib/db-backup.ts`: stream `pg_dump` directly into encrypted output and fail closed in production.
- Modify `artifacts/api-server/src/lib/db-backup.test.ts`: encryption-key and backup orchestration tests.
- Create `artifacts/api-server/src/lib/disposable-postgres.ts`: isolated local PostgreSQL cluster lifecycle and target refusal checks.
- Create `artifacts/api-server/src/lib/disposable-postgres.test.ts`: lifecycle safety and cleanup tests.
- Create `artifacts/api-server/src/lib/db-restore-validation.ts`: restored-schema validation queries and result interpretation.
- Create `artifacts/api-server/src/lib/db-restore-validation.test.ts`: validation interpretation tests.
- Create `artifacts/api-server/src/lib/db-backup-verifier.ts`: Drive download, decrypt, restore, validate, audit, alert, cleanup.
- Create `artifacts/api-server/src/lib/db-backup-verifier.test.ts`: verifier orchestration and failure-path tests.
- Modify `artifacts/api-server/src/index.ts`: start weekly verifier schedule.
- Modify `artifacts/api-server/src/lib/db-backup.ts`: export shared scheduler mechanics if useful without coupling backup and verification jobs.
- Modify `artifacts/api-server/src/startup-migrations.test.ts`: verify the production schedule remains wired at startup.
- Modify `replit.md`: document required encryption secret and operational restore check.

---

### Task 1: Authenticated streaming backup envelope

**Files:**
- Create: `artifacts/api-server/src/lib/backup-encryption.ts`
- Create: `artifacts/api-server/src/lib/backup-encryption.test.ts`

- [ ] **Step 1: Write failing format and key tests**

Test these exact public contracts:

```ts
parseBackupEncryptionKey(base64: string): Buffer;
encryptBackupStream(source: Readable, destinationPath: string, key: Buffer): Promise<EncryptedBackupMetadata>;
decryptBackupToStream(sourcePath: string, key: Buffer): Promise<Readable>;
```

Assertions:

```ts
expect(parseBackupEncryptionKey(Buffer.alloc(32, 7).toString("base64"))).toHaveLength(32);
expect(() => parseBackupEncryptionKey("bad")).toThrow(/32 random bytes/);
expect(firstCiphertext).not.toEqual(secondCiphertext);
expect(decrypted).toEqual(plaintext);
expect(ciphertext.includes(plaintext)).toBe(false);
```

Add wrong-key, one-byte mutation, truncation, malformed magic, unsupported version, and missing authentication-tag cases. Every corrupt input must reject before emitting restored SQL.

- [ ] **Step 2: Run the focused test and confirm red**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/backup-encryption.test.ts
```

Expected: failure because `backup-encryption.ts` does not exist.

- [ ] **Step 3: Implement the versioned envelope**

Use:

```ts
export const BACKUP_MAGIC = Buffer.from("SPBK");
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_IV_BYTES = 12;
export const BACKUP_TAG_BYTES = 16;
```

Envelope layout:

```text
4-byte magic | 1-byte version | 12-byte IV | AES-256-GCM ciphertext of gzip data | 16-byte tag
```

Generate the IV with `randomBytes(12)`. Stream the source through `createGzip()`, then `createCipheriv("aes-256-gcm", key, iv)`, while hashing every written envelope byte with SHA-256. On decryption, read and validate the fixed header and trailing tag before piping through `createDecipheriv` and `createGunzip`. Write through a temporary sibling path and rename atomically only after encryption succeeds.

- [ ] **Step 4: Run focused tests**

Run the command from Step 2. Expected: all encryption tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/backup-encryption.ts artifacts/api-server/src/lib/backup-encryption.test.ts
git commit -m "Encrypt database backup streams"
```

---

### Task 2: Encrypted Google Drive objects and download support

**Files:**
- Modify: `artifacts/api-server/src/lib/google-drive-backup.ts`
- Modify: `artifacts/api-server/src/lib/google-drive-backup.test.ts`

- [ ] **Step 1: Write failing Drive helper tests**

Require:

```ts
buildDriveBackupFileName(date) === "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc";
DRIVE_BACKUP_MIME_TYPE === "application/octet-stream";
isSupportedBackupName("S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc") === true;
isSupportedBackupName("S&PBACKUP-2026-09-02_10-40-11.SQL") === true;
selectNewestBackup(files) === newestNonTrashedSupportedFile;
```

Assert encrypted upload headers contain only binary `Content-Type` and actual encrypted `Content-Length`; they must not contain `Content-Encoding` or decoded `Content-Range`.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/google-drive-backup.test.ts
```

- [ ] **Step 3: Implement raw encrypted upload, listing, and download**

Add:

```ts
listBackups(): Promise<DriveBackupFile[]>;
download(fileId: string, destinationPath: string): Promise<void>;
selectNewestBackup(files: DriveBackupFile[]): DriveBackupFile | null;
```

List only non-trashed children of the backup folder, ordered by `modifiedTime desc`. Download through `/drive/v3/files/{id}?alt=media` and stream the response body to a temporary file before atomic rename. Retain legacy `.SQL` recognition for verification only. Remove gzip transport creation for new encrypted objects.

- [ ] **Step 4: Run focused tests**

Expected: all Drive helper tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/google-drive-backup.ts artifacts/api-server/src/lib/google-drive-backup.test.ts
git commit -m "Store encrypted backups in Google Drive"
```

---

### Task 3: Stream pg_dump into encrypted storage

**Files:**
- Modify: `artifacts/api-server/src/lib/db-backup.ts`
- Modify: `artifacts/api-server/src/lib/db-backup.test.ts`

- [ ] **Step 1: Write failing producer tests**

Test:

```ts
expect(() => requireBackupEncryptionKey({ NODE_ENV: "production" })).toThrow(/DB_BACKUP_ENCRYPTION_KEY/);
expect(requireBackupEncryptionKey({
  NODE_ENV: "production",
  DB_BACKUP_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
})).toHaveLength(32);
```

Mock the dump stream, encrypted writer, Drive upload, and unlink operations. Assert upload occurs only after encryption completes and that failed encryption never calls Drive.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup.test.ts
```

- [ ] **Step 3: Replace plain dump creation**

Spawn `pg_dump` exactly as today, but pass `pgDump.stdout` directly to `encryptBackupStream`. Use only a temporary `.sql.gz.enc.partial` and final encrypted path. Validate `DB_BACKUP_ENCRYPTION_KEY` before spawning `pg_dump`. Preserve advisory locking, retries, and failed encrypted-file pruning. Never log the key or database URL.

- [ ] **Step 4: Run backup and encryption tests**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup.test.ts src/lib/backup-encryption.test.ts src/lib/google-drive-backup.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/db-backup.ts artifacts/api-server/src/lib/db-backup.test.ts
git commit -m "Create encrypted production database backups"
```

---

### Task 4: Disposable PostgreSQL safety boundary

**Files:**
- Create: `artifacts/api-server/src/lib/disposable-postgres.ts`
- Create: `artifacts/api-server/src/lib/disposable-postgres.test.ts`

- [ ] **Step 1: Write failing guard and lifecycle tests**

Public contracts:

```ts
assertDisposableDataDirectory(path: string, expectedRoot: string): void;
assertLoopbackPostgresTarget(host: string, database: string, expectedDatabase: string): void;
startDisposablePostgres(options?: { timeoutMs?: number }): Promise<DisposablePostgres>;
```

Reject `/`, workspace paths, symlink escapes, production hostnames, non-loopback hosts, mismatched database names, and command arguments containing `DATABASE_URL`. Verify `stopAndRemove()` is idempotent.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/disposable-postgres.test.ts
```

- [ ] **Step 3: Implement cluster lifecycle**

Create a unique root with `mkdtemp(join(tmpdir(), "sp-backup-verify-"))`, resolve its real path, run `initdb --auth=trust --no-locale --encoding=UTF8`, reserve a loopback port, and start `postgres` with:

```text
-D <dataDir> -h 127.0.0.1 -p <port> -k <socketDir>
```

Wait for `pg_isready`, create a generated database such as `restore_verify_<random>`, and expose only fixed internally generated connection arguments. In `finally`, stop with `pg_ctl -m fast stop`, then recursively delete the verified temporary root.

- [ ] **Step 4: Run lifecycle tests**

Expected: all guard tests and a real create/query/destroy integration test pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/disposable-postgres.ts artifacts/api-server/src/lib/disposable-postgres.test.ts
git commit -m "Add disposable PostgreSQL restore target"
```

---

### Task 5: Restored-database validation

**Files:**
- Create: `artifacts/api-server/src/lib/db-restore-validation.ts`
- Create: `artifacts/api-server/src/lib/db-restore-validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Define:

```ts
interface RestoreValidationResult {
  tableCount: number;
  aggregateRowCount: number;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
}
validateRestoredDatabase(target: DisposablePostgres): Promise<RestoreValidationResult>;
```

Fixtures must cover missing core tables, invalid foreign keys, sequences behind stored IDs, zero-row implausibility, and all-valid results.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-restore-validation.test.ts
```

- [ ] **Step 3: Implement read-only validation**

Query `pg_catalog`, `information_schema`, and expected core relations (`accounts`, `orders`, `order_line_items`, `products`, `audit_logs`). Use `SET TRANSACTION READ ONLY` for representative checks. Validate constraints with catalog metadata and detect any `NOT VALID` constraints. Inspect owned sequences and compare `last_value` with the maximum associated column. Return counts and check names only—never row contents.

- [ ] **Step 4: Run focused tests**

Expected: all validation tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/db-restore-validation.ts artifacts/api-server/src/lib/db-restore-validation.test.ts
git commit -m "Validate restored database backups"
```

---

### Task 6: End-to-end verifier, audit, and alerts

**Files:**
- Create: `artifacts/api-server/src/lib/db-backup-verifier.ts`
- Create: `artifacts/api-server/src/lib/db-backup-verifier.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Mock each stage and assert this order:

```text
lock → list/select → download → digest → disposable cluster → decrypt → psql restore → validate → audit → cleanup
```

Test failures at download, authentication, PostgreSQL startup, `psql`, validation, audit, and cleanup. Assert production database URLs and SQL stderr values never appear in stored/logged messages.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup-verifier.test.ts
```

- [ ] **Step 3: Implement verifier**

Add:

```ts
runLatestBackupVerification(): Promise<"verified" | "lock_contended" | "not_configured">;
```

Use a dedicated advisory lock. Download the newest backup. For encrypted format, verify/decrypt with the active key and stream plaintext SQL directly into:

```text
psql -X --set ON_ERROR_STOP=1 --host 127.0.0.1 --port <port> --dbname <generated>
```

For a legacy `.SQL`, stream the downloaded representation according to its Drive response without modifying the source. On success write a sanitized `backup_restore_verified` audit event. On failure write `backup_restore_failed`, create an admin alert, and invoke existing admin notification channels with a generic failure category and request ID.

- [ ] **Step 4: Run verifier tests**

Expected: all verifier tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/db-backup-verifier.ts artifacts/api-server/src/lib/db-backup-verifier.test.ts
git commit -m "Verify latest database backup restores"
```

---

### Task 7: Weekly schedule and operational wiring

**Files:**
- Modify: `artifacts/api-server/src/lib/db-backup-verifier.ts`
- Modify: `artifacts/api-server/src/lib/db-backup-verifier.test.ts`
- Modify: `artifacts/api-server/src/index.ts`
- Modify: `artifacts/api-server/src/startup-migrations.test.ts`
- Modify: `replit.md`

- [ ] **Step 1: Write failing scheduler tests**

Require:

```ts
RESTORE_VERIFY_INTERVAL_MS === 7 * 24 * 60 * 60 * 1000;
RESTORE_VERIFY_FIRST_DELAY_MS === 60 * 60 * 1000;
```

Verify no automatic schedule in development, no overlapping local runs, advisory-lock retry behavior, and `stop()` clearing all timers.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup-verifier.test.ts src/startup-migrations.test.ts
```

- [ ] **Step 3: Wire production startup**

Import and call `startDbBackupVerificationSchedule()` beside `startDbBackupSchedule()` in the server-listen callback. Document `DB_BACKUP_ENCRYPTION_KEY`, the six-hour encrypted backup schedule, weekly restore verification, failure alerts, and the manual verification command in `replit.md`.

- [ ] **Step 4: Run focused tests**

Expected: scheduler and startup-wiring tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/db-backup-verifier.ts artifacts/api-server/src/lib/db-backup-verifier.test.ts artifacts/api-server/src/index.ts artifacts/api-server/src/startup-migrations.test.ts replit.md
git commit -m "Schedule weekly backup restore verification"
```

---

### Task 8: Real restore verification and final checks

**Files:**
- Modify only if checks expose defects in files from Tasks 1–7.

- [ ] **Step 1: Request the encryption secret securely**

Use the workspace Secrets flow for `DB_BACKUP_ENCRYPTION_KEY`. The user supplies a password-manager-generated base64 encoding of exactly 32 random bytes. Never request or display it in chat.

- [ ] **Step 2: Run the complete API suite**

```bash
pnpm --filter @workspace/api-server exec vitest run
```

Expected: all test files pass.

- [ ] **Step 3: Run changed-file type verification**

Run the project typecheck and compare failures against the known baseline. No new error may reference the new backup, Drive, disposable PostgreSQL, validation, verifier, or startup-wiring files.

- [ ] **Step 4: Run a genuine local restore fixture**

Create a small disposable source database fixture, dump it with the production argument builder, encrypt it, restore it through the verifier's disposable-cluster path, query known fixture counts, and confirm the cluster directory no longer exists afterward. This test must not read or use production `DATABASE_URL`.

- [ ] **Step 5: Restart the canonical workflow**

Restart `Start application`, refresh logs once, and confirm the API starts without attempting scheduled backup or restore work in development.

- [ ] **Step 6: Verify repository state**

```bash
git diff --check
git status --short
```

Expected: no uncommitted implementation changes.

- [ ] **Step 7: Publish handoff**

Present the Publish action. After publish, confirm through production logs that:

- a new encrypted backup uploads;
- no plaintext backup remains locally;
- the weekly verifier schedule starts;
- a manual or scheduled verification records `backup_restore_verified`;
- temporary PostgreSQL files are removed.