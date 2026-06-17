---
name: Workflow topology (don't over-restart)
description: Which workflows are canonical vs redundant duplicates that fight over ports.
---

# Run topology

The `.replit` run button is "Project", which starts only TWO workflows in parallel:
- **Start application** (`bash start.sh`) — itself launches the API server (8080),
  the peps-anonymous web/Vite dev server (21503), and a 5000→21503 proxy. This is
  the whole app.
- **artifacts/mockup-sandbox: Component Preview Server** (8081) — for canvas previews.

The workflows **artifacts/api-server: API Server** and **artifacts/peps-anonymous: web**
are STANDALONE DUPLICATES of what `start.sh` already runs. They are an alternative
dev setup and are NOT part of the "Project" run button.

**Why this matters / how to apply:** Never restart all four workflows to pick up a
config/secret change. Restarting `api-server`/`web` while `Start application` is
running makes them FAIL with `DIDNT_OPEN_A_PORT` (8080 / 21503 already bound) — a
spurious, harmless failure, not a real bug. To reload env/secrets, restart only
**Start application** (and mockup-sandbox if needed). Leave the two duplicate
workflows stopped/failed; they only make sense when Start application is NOT running.
