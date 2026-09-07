# Plain full SQL database backups

## Goal

Production database backups return to full, uncompressed `.SQL` files stored in the existing Google Drive backup folder.

## Scope

The scheduled backup writer changes from encrypted `.sql.gz.enc` output to plain `.SQL` output. Existing encrypted backup files, encryption code, restore support, and `DB_BACKUP_ENCRYPTION_KEY` remain untouched.

## Backup flow

1. The production scheduler waits ten minutes after startup and runs every six hours.
2. A PostgreSQL advisory lock prevents multiple app instances from backing up concurrently.
3. `pg_dump` streams a full SQL dump to a private `.partial` file in the temporary backup directory.
4. A successful dump is atomically renamed to `S&PBACKUP-YYYY-MM-DD_HH-MM-SS.SQL`.
5. The existing resumable Google Drive uploader uploads and verifies the file name and byte size.
6. The local file is deleted only after the verified upload.

If dump creation fails, partial output is deleted. If Drive upload fails after a complete dump, the complete local file is retained temporarily for diagnosis or retry safety and pruned after three days.

## Failure handling

Failure audit records, alerts, Telegram admin notifications, and console messages use format-neutral “database backup” language. They must not expose the database URL, SQL contents, dump stderr, credentials, or sensitive local paths.

## Compatibility

The Google Drive listing and restore verifier continue recognizing both legacy `.SQL` files and existing `.sql.gz.enc` files. No remote backup files are deleted or migrated.

## Testing

Tests cover:

- Plain `.SQL` filename generation.
- Successful dump, atomic rename, upload, and local cleanup.
- Dump failure and partial-file cleanup.
- Upload failure and retention of the completed local file.
- Existing scheduling and advisory-lock behavior.
- Continued recognition of encrypted and plain backups for restore.