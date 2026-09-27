#!/bin/bash
set -e

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd /home/runner/workspace

# Use PORT from the environment if provided (Replit autoscale sets this at runtime).
# Fall back to 5000, which is what [[ports]] maps to external port 80 in dev.
# API_PORT must always equal PORT so the compiled server binds correctly.
export PORT="${PORT:-5000}"
export API_PORT="${PORT}"
export NODE_ENV=production
# sharp's native packages live outside node_modules so deployment ignore
# patterns cannot strip them from the compiled artifact.
export NODE_PATH="$PWD/artifacts/api-server/dist/vendor${NODE_PATH:+:$NODE_PATH}"

# Run the WWB seed in the background so it never delays server startup.
# Cloud Run requires the process to bind its port quickly; the seed is
# an idempotent DB write that can safely race with normal traffic.
echo "[startup] Seeding WWB lab reports in background..."
bash "$SCRIPTS_DIR/wwb-lab-seed-run.sh" &>/tmp/wwb-seed.log &

echo "[startup] Starting API server on port $PORT..."
exec node artifacts/api-server/dist/index.cjs
