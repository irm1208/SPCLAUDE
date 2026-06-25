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

# Blank preview recovery (orphan start.sh trap)

Symptom: preview pane is fully blank but `curl :5000` still returns *something*.
Cause: repeated restarts leave **orphaned `start.sh` instances** (saw 5 at once).
Each orphan ran its own `5000→21504` proxy + a Vite. When a fresh Start application
can't bind 21504 (an orphan holds it) it lands on 21505–21508, but its proxy still
forwards 5000→21504 → serves a stale/empty orphan Vite → blank screen.

**Fix (do NOT just restart — orphans survive a workflow restart):**
1. `fuser -k 5000/tcp 21504/tcp` — kill whoever holds the preview-path ports **by
   port**, so the artifact `web` workflow's own Vite (on a different 2150x port) is
   left alone. Killing by process name would also nuke/respawn-race that one.
2. `pkill -f "bashr[c] start.sh"` — kill all orphan start.sh (bracket avoids self-match).
3. Restart ONLY **Start application**; start.sh re-frees 5000/21504 and rebinds.
4. Verify `curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/` == 200 and
   screenshot the app. The `wss://localhost … ERR_CONNECTION_REFUSED` HMR warning and
   a 401 on the account fetch (when logged out) are harmless dev noise.
