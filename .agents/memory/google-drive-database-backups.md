---
name: Google Drive database backups
description: Production backup destination, lifecycle, and scheduling rules that prevent database and project-storage contention.
---

## Required backup format and transport

Backups must appear in Google Drive as one complete plain `.SQL` file, not a collection of parts. Initialize the authorized resumable upload through the existing connector, then send raw SQL chunks directly to the returned Google upload-session URL using Node's HTTPS client. Keep existing multipart backups and their restore compatibility.

**Why:** the user explicitly requested directly downloadable full SQL files. The observed partial-range failures are on the connector upload route, not a limitation of Google Drive's single-file uploads.

**How to apply:** never re-enable partial-range uploads through the connector proxy. Keep chunk sizes aligned to Google's 256 KiB requirement, interpret 308 as upload progress rather than following it as a redirect, validate the HTTPS Google upload destination, and keep the session URL server-side and out of logs because it grants upload access. After ambiguous writes, query acknowledged progress before resending. Verify the complete remote size/checksum before deleting local SQL; filename or size alone does not establish a valid backup. Complete SQL awaiting upload must not expire through age-based pruning, because a prolonged upload outage could otherwise delete the only complete local copy. Fail closed on same-name conflicts and restrict remote deletion to the user-approved retention policy below.

## User-selected frequency and retention

The user selected backups every hour and keeping every backup from the last three days, not the suggested tiered daily retention.

**Why:** the user explicitly selected these options. This replaces the previous six-hour cadence and preserve-all Drive policy as the requested product behavior.

**How to apply:** use a rolling 72-hour capture-time cutoff. Cleanup must follow a fully verified upload and always preserve the latest verified copy, even if older than the cutoff. Permanent removal of expired backups was explained when presenting the plan; do not delete unrelated files or objects needed by retained multipart generations.

## Scheduling and historical backup safety

Mutual exclusion alone does not guarantee one backup per hourly capture window.

**Why:** separate instances or restarts can acquire the same advisory lock successively and still create redundant dumps.

**How to apply:** require durable evidence of a fully size/checksum-verified capture before considering an hour backed up. A filename, modified time, or unverified upload is not enough.

Interrupted legacy cleanup must remain distinguishable from an untrusted incomplete backup.

**Why:** a missing part can mean either an earlier successful deletion or data corruption; treating those as equivalent either risks deletion or permanently prevents cleanup.

**How to apply:** validate the complete reference graph before starting, retain explicit trusted resume provenance, and keep reference information until its children are processed. Stop on uncertainty. Bound cleanup work so a large legacy archive cannot prevent the next scheduled backup.

Do not run heavy full dumps during application startup. Preserve the ten-minute startup delay, cross-instance locking, coalesced retries, and bounded recovery of retained SQL without creating extra dumps. The six-hour upload-recovery budget is a separate safeguard from the requested hourly backup cadence. Historical multipart backups require complete manifests and verification of segments, compressed parts, decoded data, and whole SQL during restoration.

**Why:** immediate full dumps during application startup took nearly six minutes, pushed normal API requests into 30–289 second waits, and accumulated tens of gigabytes inside the project. A whole-file gzip PUT hit Cloudflare's 413 request-body limit. Subsequent real connector tests showed Cloudflare returns 403 Forbidden for *any* partial resumable PUT, even 290-byte gzip or raw bytes, while complete file PUTs succeed. Shrinking partial ranges cannot fix this transport.

**How to apply:** preserve upload-before-delete, complete size/checksum verification, advisory locking, delayed startup, and bounded recovery when changing cadence. Recovery retries retained files rather than creating more dumps; coalesce overlapping work and discard obsolete retries after success. Treat a pending retry as unconfirmed until verified completion appears. In historical manifest tooling only, use full-range PUTs for bounded gzip objects, never partial-range proxy PUTs. Never treat orphan parts as complete. On upload failure, retain the source SQL.