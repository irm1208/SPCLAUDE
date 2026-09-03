---
name: Google Drive database backups
description: Production backup destination, lifecycle, and scheduling rules that prevent database and project-storage contention.
---

Production database backups use `pg_dump --no-owner --no-privileges`, are named `S&PBACKUP-YYYY-MM-DD_HH-MM-SS.SQL`, and are stored uncompressed in the dedicated Google Drive backup folder indefinitely. Development servers do not run scheduled backups. Each production instance waits 10 minutes after startup, then attempts every 12 hours; a PostgreSQL advisory lock prevents multiple instances from backing up simultaneously, but a locked-out attempt is skipped rather than queued.

**Why:** immediate full dumps during application startup took nearly six minutes, pushed normal API requests into 30–289 second waits, and accumulated tens of gigabytes inside the project.

**How to apply:** preserve upload-before-delete, exact remote-size verification, the advisory lock, and delayed production schedule. When answering next-run questions, use the instance startup time rather than the last upload time, and treat a lock-skip as not confirmed until an upload log appears. The connector WAF blocks raw SQL bodies, so gzip only the HTTP transport envelope; Drive must decode it and store exact plain SQL bytes, then delete the envelope. Never prune Drive backups automatically. On failure, retain the source SQL.