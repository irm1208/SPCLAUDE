# Encrypted Backup and Restore Verification Design

## Purpose

Prove that production database backups can be restored successfully without ever writing to the production database, and encrypt every newly created backup before it leaves the application host.

## Scope

This change will:

- replace new plain Drive backup objects with compressed, authenticated, encrypted objects;
- preserve read compatibility with existing legacy `.SQL` Drive backups;
- run a genuine full restore into a disposable local PostgreSQL 16 cluster;
- validate the restored database with structural and representative read-only checks;
- record success or failure without customer data;
- alert administrators when verification fails;
- run restore verification weekly in production.

Remote retention remains unchanged and is outside this scope.

## Backup file format

New backup files will use the suffix `.sql.gz.enc`.

The application will:

1. Stream `pg_dump` output through gzip.
2. Encrypt the compressed stream with AES-256-GCM.
3. Write a versioned binary envelope containing:
   - a fixed magic marker;
   - format version;
   - random 96-bit IV;
   - encrypted gzip payload;
   - 128-bit GCM authentication tag.
4. Calculate and record a SHA-256 digest of the final encrypted object.
5. Upload the encrypted bytes to Google Drive without `Content-Encoding`.
6. Verify the Drive object name and encrypted byte size before deleting temporary files.

AES-GCM authentication means a wrong key, truncated backup, or modified ciphertext fails before restoration.

## Encryption key

The key will be supplied only through the Replit secret `DB_BACKUP_ENCRYPTION_KEY`.

Requirements:

- exactly 32 random bytes encoded as base64;
- never logged, stored in source, written into backup metadata, or included in audit records;
- required in production—backup creation fails closed if missing or malformed;
- development tests use generated in-memory keys only.

Key rotation will be handled by adding an explicit format key identifier in a future change if needed. This implementation uses one active key and does not delete legacy backups.

## Legacy compatibility

The verifier will understand:

- new `.sql.gz.enc` objects using the active encryption key;
- existing legacy `.SQL` Drive objects using their existing Drive transport behavior.

Backup creation will produce only the new encrypted format after rollout. Existing Drive backups will not be rewritten or deleted.

## Isolated restore lifecycle

The verifier will never accept a restore database URL.

For each run it will:

1. Acquire a PostgreSQL advisory lock so only one application instance verifies at a time.
2. Select the newest completed Drive backup.
3. Create a unique directory beneath the operating-system temporary directory.
4. Initialize a new PostgreSQL 16 cluster with `initdb`.
5. Start it on `127.0.0.1` using an operating-system-assigned free port and Unix socket inside the temporary directory.
6. Refuse to continue if:
   - the data directory is not inside the expected temporary root;
   - the server target is not loopback/local socket;
   - any restore command contains `DATABASE_URL`;
   - the target database name is not the verifier's generated disposable name.
7. Download the selected Drive object to the temporary directory.
8. Verify its remote metadata and local SHA-256 digest when available.
9. Decrypt and decompress it as a stream.
10. Restore with `psql` using `ON_ERROR_STOP=1`.
11. Run validation checks.
12. Stop PostgreSQL and recursively delete the cluster, socket, decrypted stream artifacts, and downloaded object in `finally`.

Production database credentials are used only by the existing `pg_dump` backup creator. They are never passed to the restore process.

## Validation checks

A restore is successful only if all checks pass:

- `psql` completes with no SQL error;
- the restored database contains the expected core schemas and tables;
- a configurable minimum number of application tables exists;
- core tables can be queried;
- all declared foreign-key constraints validate;
- duplicate primary-key checks return no findings;
- PostgreSQL sequences are not behind the maximum stored identifier for sequence-backed tables;
- representative read-only application queries succeed;
- restored table and row totals are non-zero and plausible;
- no connection points at the production host or database.

The verifier will not log row contents, usernames, addresses, orders, transaction hashes, or other customer data.

## Scheduling and concurrency

- Ordinary encrypted backups continue every six hours.
- Restore verification runs once weekly after a startup delay.
- The verifier uses a separate advisory lock from backup creation.
- A verifier does not start while another verifier holds the lock.
- A timeout stops PostgreSQL and cleans temporary data if download, restore, or validation hangs.
- Development mode does not start the schedule automatically.
- A manual command will run the same verifier for controlled testing.

## Results and alerting

Each run writes an audit event containing only:

- Drive file ID and filename;
- encrypted file size and digest;
- format version;
- start/end timestamps and duration;
- PostgreSQL major version;
- table count and aggregate row count;
- validation check names and pass/fail status;
- sanitized failure category.

Failures create an admin alert and use the existing administrator email/Telegram notification paths where configured. Error output is sanitized before storage so SQL values, connection strings, and secrets cannot leak.

## Failure behavior

- Backup encryption or upload failure retains temporary output for the existing short local retry window, but never leaves a plain SQL dump after the process exits normally.
- Missing or malformed encryption keys fail closed in production.
- Authentication-tag failure marks the backup corrupt and prevents `psql` execution.
- Restore or validation failure never replaces, deletes, or modifies a Drive backup.
- Cleanup failures are logged separately and trigger an alert.

## Testing

Tests will cover:

- encrypted-envelope round trip;
- random IV generation and nondeterministic ciphertext;
- wrong-key, modified-ciphertext, truncated-file, and malformed-header rejection;
- filename and MIME changes;
- no plaintext fragments in encrypted output;
- key validation and production fail-closed behavior;
- Drive upload/download metadata and streaming;
- legacy backup detection;
- loopback and temporary-directory refusal guards;
- restore command construction without `DATABASE_URL`;
- scheduler timing, overlap prevention, advisory-lock contention, and shutdown;
- validation-query interpretation;
- guaranteed cleanup on every failure stage;
- an integration test that creates a small SQL fixture, restores it into a disposable local PostgreSQL cluster, queries it, and destroys it.

The final verification will include the API test suite, type checking for changed files, a real disposable-cluster restore test, workflow restart, and clean startup logs.

## Rollout

1. Add and securely configure `DB_BACKUP_ENCRYPTION_KEY`.
2. Publish the encrypted backup implementation.
3. Confirm a new `.sql.gz.enc` object appears in Drive.
4. Run the verifier against that object.
5. Confirm a successful audit event and cleanup.
6. Leave legacy backups untouched.

No production restore will ever be performed as part of this system.