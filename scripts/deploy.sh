#!/bin/bash
set -e

cd /home/runner/workspace

# Ensure pnpm is available — use local binary if present, fall back to global
PNPM="./node_modules/.bin/pnpm"
if ! [ -x "$PNPM" ]; then
  PNPM="pnpm"
fi

echo "[deploy] Installing dependencies..."
$PNPM install --no-frozen-lockfile

echo "[deploy] Compiling API server..."
NODE_OPTIONS="--max-old-space-size=4096" $PNPM --filter @workspace/api-server run build:compile

echo "[deploy] Building frontend..."
# PORT must be set for vite.config.ts; use 5000 to match production default.
# BASE_PATH=/ serves the SPA from root in production.
NODE_OPTIONS="--max-old-space-size=4096" PORT=5000 BASE_PATH=/ $PNPM --filter @workspace/peps-anonymous run build

echo "[deploy] Build complete."
