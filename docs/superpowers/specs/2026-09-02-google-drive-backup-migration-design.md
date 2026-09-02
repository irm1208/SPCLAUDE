# Google Drive Backup Migration and Plain-SQL Backup Design

**Date:** 2026-09-02  
**Status:** Approved design, pending written-spec review

## Goal

Move the existing local database backup history into the connected Google Drive backup folder, then change all future backups to remain as plain `.sql` files in Google Drive. Backups will be retained indefinitely; the user will delete them manually when needed.

## Scope

### Existing backups

The migration covers every existing `.sql` database dump found in:

- `db-backups/`
- `artifacts/api-server/db-backups/`

Each local file is uploaded unchanged. The migration runs one file at a time. Before uploading, it checks the dedicated Google Drive folder for a file with the same target name and exact byte size:

- If a matching remote file exists, the local file is considered migrated and may be deleted.
- If no matching file exists, the complete local file is uploaded using Drive resumable upload chunks.
- The local original is deleted only after Drive confirms completion and the uploaded file size matches.
- If an upload or verification fails, the local file remains for a later retry.

Target names preserve the source filename while adding a stable database-backup prefix when needed to avoid collisions with future names. Existing local files are not compressed or rewritten.

### Future scheduled backups

Future production backups will:

1. Run `pg_dump` into a temporary plain `.sql` file under `/tmp`.
2. Upload the file to the dedicated Google Drive folder through resumable chunked upload.
3. Verify the Drive response and file size.
4. Delete the local temporary file only after successful verification.

Development servers remain excluded from scheduled backup generation. Production keeps its delayed first run and PostgreSQL advisory lock so startup and multi-instance overlap remain protected.

Remote retention pruning is removed. No automatic Google Drive deletion occurs.

## Components

### Google Drive storage module

Extend the existing Google Drive backup storage boundary to support:

- Plain SQL MIME type and filenames.
- Folder lookup/creation.
- Exact-name and exact-size lookup for migration idempotency.
- Resumable uploads in bounded chunks.
- Upload response and size verification.
- No remote pruning.

The module continues using the already-authorized Google Drive connector. No new credentials or direct Google API credentials are introduced.

### Backup scheduler

Replace gzip output with direct `pg_dump` output to a temporary `.sql` path. Preserve:

- `/tmp` temporary storage
- upload-before-delete ordering
- failed-upload local retention
- development skip
- delayed production startup
- advisory lock

### Migration runner

Add a one-shot migration command/script that discovers both legacy directories and processes files sequentially. It must be safe to rerun:

- Completed files are detected by remote name and exact size.
- Interrupted files remain local.
- A completed remote file is never uploaded again.
- Local deletion is performed only after the matching remote file is confirmed.

The migration output must report each file as skipped/already migrated, uploaded/verified, or failed/retained.

## Error handling

- Missing or unavailable Google Drive connection stops the affected file operation and retains the local source.
- A non-successful Drive response includes the status and bounded response text in the migration or scheduler logs.
- A remote same-name file with a different size is treated as a conflict and is not deleted or silently overwritten.
- A local file that disappears during processing is skipped with a clear log.
- No cleanup operation deletes a local file without a successful exact-size remote verification.

## Testing and verification

Automated tests cover:

- Plain `.sql` future filename and MIME behavior.
- Remote exact-name/exact-size matching.
- Conflict handling for same-name different-size files.
- Migration selection across both legacy directories.
- Idempotent rerun behavior.
- Upload-before-delete ordering.

Verification also includes:

- API typecheck and production compilation.
- A small end-to-end Google Drive upload and exact-size verification.
- A dry-run migration inventory before the 14 GB deletion phase.
- Per-file migration logs and a final local/remote count and byte-size summary.

## Explicit non-goals

- No automatic deletion of Drive backups.
- No compression of new or migrated backups.
- No deletion of the historical local files before their corresponding Drive files are verified.
- No migration of unrelated files from either directory.