# Database Backup Google Drive Retry Design

## Goal

Prevent a temporary missing or unavailable Google Drive connection from losing an otherwise complete database backup. A failed Drive upload should enter a bounded retry cycle instead of waiting for the next six-hour backup run.

Google OAuth authorization cannot be created or forced by application code. The retry system therefore waits for the existing Replit Google Drive connection to become available again.

## Selected behavior

- Keep a completed plain `.SQL` dump when its Drive upload fails.
- Retry reconciliation and upload every 10 minutes.
- Stop retrying after 6 hours from the first failed upload.
- Reuse the same retained file; do not run `pg_dump` again for each retry.
- Before uploading, check whether Drive already contains the exact filename and byte size.
- After uploading, verify the exact filename and byte size in Drive before deleting the local file.
- Keep the normal six-hour backup schedule active.
- Never overlap retry work with another local backup attempt.

## Scheduler design

The scheduler will distinguish three outcomes:

- `completed`: no retry remains.
- `lock_contended`: use the existing five-minute lock-contention retry.
- `failed`: start or continue the new ten-minute upload-recovery retry window.

The first failed attempt records the retry-window deadline. Only one recovery timer may exist. Every recovery attempt calls the existing backup orchestration, which first reconciles retained complete SQL files before creating a new dump.

If retained-file reconciliation succeeds, the original file is uploaded and removed. The orchestration may then create the currently scheduled dump only when invoked by the normal schedule; a recovery-only callback must not create an extra dump.

## Retry limits

- Retry interval: 10 minutes.
- Maximum window: 6 hours from the first upload failure.
- A successful retained upload clears the timer and deadline.
- Stopping the scheduler clears all timers and retry state.
- A process restart resets in-memory retry timing. Existing retained files are still reconciled by the next startup backup attempt if the deployment filesystem retained them.

## Notifications and logging

- Preserve the existing failure alert and request ID for the initial failed backup.
- Log that a retained backup will be retried every 10 minutes for up to 6 hours.
- Do not send Telegram failure alerts every 10 minutes.
- Send one recovery notification when the retained backup is verified in Drive.
- Send one final failure notification if the six-hour retry window expires.
- Logs must identify the backup filename but must not expose connector credentials, database URLs, or SQL contents.

## Failure safety

- A missing Google Drive connection remains an authorization failure; retries do not bypass OAuth or CSRF controls.
- A retained file is deleted only after exact remote name-and-size verification.
- If an upload response is lost but Drive created the file, the next retry discovers the exact remote match and safely removes the local copy.
- Partial or wrong-size remote files do not count as success.
- Retry failures remain isolated from the API process and must never crash the deployment.

## Tests

Add scheduler tests proving:

1. A failed upload schedules a retry after exactly 10 minutes.
2. Retries continue within the six-hour window.
3. No more than one retry timer exists.
4. Success cancels the retry cycle.
5. Expiry stops retries and emits the final-failure callback once.
6. Normal six-hour scheduling remains active during retries.
7. Recovery callbacks reconcile retained SQL files without creating another dump.
8. Scheduler shutdown clears all timers.

Existing retained-file, lost-response, exact-size verification, backup lifecycle, and Google Drive upload tests must remain passing.