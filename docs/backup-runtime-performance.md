# Backup runtime impact

## Scope and unchanged safeguards

This change does not run a live dump, upload a backup, delete Drive data, change
providers, or change the approved hourly capture schedule / rolling 72-hour
retention. The ten-minute startup delay, six-hour upload-recovery budget,
coalesced scheduling, verified-upload receipts, advisory lock, local SQL retention
until verification, and legacy multipart restore support remain unchanged.

## Changes

- The production plain-SQL writer applies backpressure at a maximum of 16 MiB/s,
  in 64 KiB chunks, yielding to foreground I/O. Slow downstream writes do not
  accumulate a later catch-up burst. This limits sustained dump transfer and
  local disk writes; it is **not** a PostgreSQL CPU/query-cost governor.
- Full retention inventory uses up to four concurrent paginated walks. Legacy
  manifest creation-time quartiles choose balanced time boundaries because the
  legacy archive is temporally clustered. These samples only choose boundaries:
  the four disjoint ranges cover the entire timeline, including unrelated names,
  old outliers, and future timestamps. All pages and all folder objects remain
  part of the inventory. No manifests means a full ordinary inventory, not an
  assumption that the folder is empty.
- Legacy generation walks use a global maximum of four concurrent reads,
  including nested segment reads. Every reference graph is checked before any
  deletion. A corrupt or unreadable graph still blocks all candidate deletion.
- The existing three-minute retention budget now includes planning. Expiration
  before a complete plan causes zero mutations. Started reads are drained before
  returning to the shared-lock owner. Existing four-at-a-time deletion phases,
  file-count limits, fresh metadata checks, anchor protection, and trusted
  interrupted-deletion provenance remain in place.
- Retention transport requests have a 30-second timeout, further limited by the
  remaining cleanup budget. The signal-aware connector fetch cancels network
  requests and body downloads. A raced identity lookup retains that same abort
  signal, so it cannot later start an uncancelled mutation.
- Drive's explicit `incompleteSearch` response now fails closed.
- Operational logs report dump/upload/planning/retention times, cumulative Drive
  request latency, maximum Drive request latency, lock-query round trips, pool
  acquisition wait, and pool pressure. No backup contents, credentials, upload
  session URLs, or customer data are logged by these measurements. Drive request
  latency measures time to response headers; full planning time also includes
  body download, checksum validation, and parsing.

## Reproducible safe profiling

With the development application running:

```sh
pnpm --filter @workspace/api-server exec tsx scripts/profile-db-backup-runtime.ts --fixture-drive
pnpm --filter @workspace/api-server exec tsx scripts/profile-db-backup-runtime.ts --drive
```

The first command compares serial and bounded complete 83-root synthetic graphs.
The second reads the actual Drive archive. `--serial-drive` additionally measures
the old serial network behavior, subject to the same overall read-only budget.
The script probes the public customer catalogue through the development domain
and runs `SELECT 1` alongside background work. It also writes 128 MiB of generated
bytes to a private temporary file through the actual pacing helper, then removes
that synthetic file. It never invokes `pg_dump`, uploads, marks deletion jobs, or
deletes Drive objects.

### Fixture and synthetic-output measurements

Development measurements on 2026-10-24; these are observations, not universal
production latency guarantees:

| Workload | Duration | Customer API p95 | DB p95 | API/DB errors |
| --- | ---: | ---: | ---: | ---: |
| Idle baseline | 10.04 s | 15 ms | 2 ms | 0 |
| Serial 83-root fixture | 3.43 s | 13 ms | 2 ms | 0 |
| Four-read 83-root fixture | 0.88 s | 10 ms | 1 ms | 0 |
| Paced synthetic 128 MiB output | 9.38 s | 14 ms | 1 ms | 0 |

Both fixture variants validate all 83 complete generations. Bounded planning was
about 3.9 times faster with the same graph and 40 ms simulated read latency.
Event-loop p99 was 11 ms in these phases. The synthetic writer achieved about
13.7 MiB/s, below its 16 MiB/s ceiling.

Initial real-archive profiling showed why both stages needed attention: serial
inventory did not complete within three minutes, and equal-duration partitions
were still badly skewed. A separate run interrupted by an application restart
is not accepted as evidence of customer-request responsiveness.

### Final real Drive read-only measurements

The balanced-inventory run completed all inventory and graph-planning work in
110.5 seconds, within the existing three-minute cleanup budget:

- Complete inventory: 83,592 files, including 83 legacy root manifests.
- Root/segment reads: 249; observed peak concurrency: four.
- Graph-planning time after inventory: 44.9 seconds.
- Customer catalogue: 994 requests, p95 15 ms, maximum 62 ms, zero failures.
- Database probes: 994 queries, p95 2 ms, maximum 22 ms, zero failures.
- Idle baseline: API p95 15 ms and DB p95 4 ms.
- Event-loop p99 during the read-only workload: 14 ms.
- Drive requests including discovery/inventory: 435; cumulative response-header
  latency across workers: 320.0 seconds; longest individual request: 3.71 seconds.
  Cumulative request time is not wall-clock duration.

The existing graph validator reported unverifiable legacy references, so
`skippedLegacy` remained true and the deletion plan was empty. The profiler
deliberately exited nonzero for this safety condition, **not** for a request
failure or an exceeded runtime budget. No Drive mutations occurred and no
validation or deletion guards were bypassed. Repairing historical reference
problems is not part of this performance change. Fixture tests separately verify
successful plans and deletion ordering on complete valid graphs.

## Automated checks

```sh
pnpm --filter @workspace/api-server exec vitest run src/lib/db-backup src/lib/google-drive-backup src/lib/backup-encryption
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run typecheck
```

The backup suite passes 165 tests across ten files, including 83-root completeness,
nested read concurrency, deadline deferral, draining on failure, exhaustive
inventory ranges and pagination, cancellation, checksums, interrupted deletion,
verified-upload-before-retention ordering, and shared-lock ownership. The API
production build passes. Workspace API typechecking still fails in pre-existing
unrelated files (including Admin 2FA and refund types); it reports no errors in the
changed backup modules.

No real dump was used for these measurements. Production database scan/CPU
contention still requires observation of a naturally scheduled backup using the
new timings; a synthetic byte stream cannot establish that result.
