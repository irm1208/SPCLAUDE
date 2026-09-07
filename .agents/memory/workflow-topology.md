---
name: Workflow topology (don't over-restart)
description: Which workflows are canonical vs redundant duplicates that fight over ports.
---

# Run topology

The `.replit` run button is "Project", which starts only TWO workflows in parallel:
- **Start application** (`bash start.sh`) — itself launches the API server (8080),
  the peps-anonymous web/Vite dev server on **21504** (21503 is reserved for the
  canvas artifact), and a **5000→21504 proxy** (port 5000 = the preview). This is
  the whole app.
- **artifacts/mockup-sandbox: Component Preview Server** (8081) — for canvas previews.

The workflows **artifacts/api-server: API Server** and **artifacts/peps-anonymous: web**
are STANDALONE DUPLICATES of what `start.sh` already runs. They are now
**artifact-managed**: `removeWorkflow` fails with `PROHIBITED_ACTION` ("managed by an
artifact and cannot be deleted"), and they auto-start alongside Start application.

**Why this matters / how to apply:** Never restart all four workflows to pick up a
config/secret change. Restarting `api-server`/`web` while `Start application` is
running makes them FAIL with `DIDNT_OPEN_A_PORT` (8080 / 21504 already bound) — a
spurious, harmless failure, not a real bug. To reload env/secrets, restart only
**Start application** (and mockup-sandbox if needed).

Agent shell commands can retain the environment snapshot from before a secret was
added or replaced, even across later shell invocations. Repeated format checks in
that stale shell can therefore keep reporting the old value.

**Why:** Secret updates are injected into newly started workflows; they do not
necessarily mutate the environment of the already-running agent/tool session.

**How to apply:** After a secure secret update, do not repeatedly ask the user to
replace it based only on the old agent shell. Restart **Start application** and
validate through newly started application/production behavior without printing
the secret.

# Blank/broken preview recovery (orphan vite steals 21504)

Symptom: preview pane is blank OR `curl :5000` returns 503/000; Start application log
shows `Port 21504 is in use … Local: http://localhost:21508/` while the proxy still
says `5000 → 21504`. Cause: stale **peps-anonymous Vite** processes from earlier
restarts survive and keep 21504-2150x, so the fresh Vite lands on 21508 but the
proxy keeps pointing at 21504 → broken preview.

**Root cause of recurrence:** `fuser`/`lsof`/`ss`/`netstat` are **NOT installed** in
this environment, so start.sh's old `fuser -k 21504/tcp` cleanup silently no-opped
and orphans were never killed. start.sh now self-heals: a `/proc`-based `kill_port()`
(parse `/proc/net/tcp{,6}` state 0A for the port's inode → find owning PID via
`/proc/<pid>/fd`) frees 5000+21504 before binding. So a plain **restart of Start
application now fixes it** — no manual port-killing needed going forward.

**Manual recovery if ever needed again (no fuser available):**
1. Use the `/proc` kill-by-port approach above to free 21504-21507 (NOT 21503 =
   canvas artifact, NOT the live one). Killing peps-anonymous vite by cmdline is
   unsafe — the canvas artifact runs the identical `vite --config vite.config.ts`.
2. Restart ONLY **Start application**; confirm log shows `Local: http://localhost:21504/`
   and `curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/` == 200.
3. Live log via getWorkflowStatus, not /tmp/logs/*.log (that file is stale/rotated).
   `wss://localhost … ERR_CONNECTION_REFUSED` HMR + a 401 account fetch (logged out)
   are harmless dev noise.

# api-server has no watch mode

`api-server`'s `dev` script is plain `tsx ./src/index.ts` (no `--watch`). Unlike the
Vite frontend (which hot-reloads instantly), editing any backend route/lib file does
**nothing** until you restart **Start application** — a GET right after an edit will
silently serve the old handler (e.g. a new response field reads as `undefined`), which
looks like a code bug but is just a stale process. Always restart after backend edits,
then re-verify via curl before concluding something is broken.
