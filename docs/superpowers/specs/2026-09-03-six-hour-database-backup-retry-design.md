# Six-Hour Database Backup Retry Design

## Goal

Run production PostgreSQL backups every six hours instead of every twelve hours, while ensuring that a scheduled attempt is not lost when another production instance currently holds the distributed backup lock.

Development-mode scheduled backups remain disabled.

## Approved approach

Keep the existing PostgreSQL advisory lock as the cross-instance serialization mechanism. When a scheduled attempt cannot acquire that lock, treat the attempt as pending rather than completed and retry it after a short delay. The retry continues until it acquires the lock and finishes the backup attempt.

Retries are local to each server instance and have these safeguards:

- At most one retry timer may be pending in an instance.
- A retry does not start while that instance is already running a backup.
- Acquiring the lock clears the pending retry state.
- The normal six-hour timer remains independent, so a future scheduled time is not permanently shifted by an earlier lock collision.

This prioritizes guaranteeing that a held-back attempt eventually runs over guaranteeing exactly one Drive file across simultaneously active instances. Concurrent instances can therefore produce an additional backup after the original lock holder finishes, but each dump is independently uploaded and verified using the existing safeguards.

## Timing

- Production startup delay remains ten minutes.
- The recurring production interval changes to six hours.
- A lock-contended attempt retries after a short fixed delay.
- A retry that is still contended schedules another retry rather than silently dropping the attempt.

The retry delay is intentionally much shorter than the six-hour cadence so a brief overlap is recovered promptly without busy-looping.

## Components and data flow

1. `startDbBackupSchedule` schedules the unchanged startup delay and the new six-hour interval.
2. `runDbBackup` attempts the existing local in-progress guard and PostgreSQL advisory lock.
3. A failed lock acquisition returns a distinct contention result to the scheduler.
4. The scheduler records one pending retry and logs that the backup is being retried.
5. A retry re-enters the same backup path, so it uses the same `pg_dump`, Google Drive upload, exact-size verification, cleanup, and local failure retention behavior.
6. Successful lock acquisition clears the pending retry marker. Upload or dump failures remain handled as failures of that attempt and do not delete the local SQL source.

No database schema changes or new external services are required.

## Error handling

- Missing `DATABASE_URL` continues to skip the attempt with a warning.
- A local backup already in progress continues to avoid overlapping work in that instance.
- Lock contention is no longer logged as a terminal skip; it schedules a retry.
- Dump or upload failures continue to retain the temporary SQL file and rely on the existing pruning policy.
- Timer callback failures are handled without creating unhandled promise rejections.

## Testing

Add unit coverage for the scheduler behavior using controllable timers and a lock/backup seam:

- The configured recurring interval is six hours.
- A lock-contended run schedules a retry.
- Only one retry is scheduled while a retry is already pending.
- A retry is cleared after the lock becomes available and the attempt runs.
- Development mode does not schedule production backups.

Run the backup-focused tests, the full API test suite, and the API typecheck after implementation.