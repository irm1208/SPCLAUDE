#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "[start] Clearing any stale processes..."
pkill -f "tsx.*src/index.ts" 2>/dev/null || true

# Free only the ports this script owns.
# Port 21503 is left free for the canvas artifact (Replit injects PORT=21503 for it).
# This script's Vite runs on 21504 instead to avoid the conflict.
#
# NOTE: `fuser`/`lsof`/`ss` are not installed in this environment, so we resolve
# the PID holding a port by reading /proc directly. Without this, stale Vite
# processes survive restarts, keep port 21504, and force the new Vite onto 21508
# while the 5000->21504 proxy keeps pointing at the dead port -> blank preview.
kill_port() {
  local port="$1" hp ino pid
  hp=$(printf '%04X' "$port")
  local inodes
  inodes=$(awk -v hp="$hp" 'NR>1 && $4=="0A"{split($2,a,":"); if(a[2]==hp) print $10}' \
    /proc/net/tcp /proc/net/tcp6 2>/dev/null | sort -u)
  for ino in $inodes; do
    for pid in $(ls /proc 2>/dev/null | grep -E '^[0-9]+$'); do
      if ls -l "/proc/$pid/fd" 2>/dev/null | grep -q "socket:\[$ino\]"; then
        echo "[start] Freeing port $port (killing stale PID $pid)"
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  done
  return 0
}

# Fall back to fuser when it exists; otherwise use the /proc-based killer.
if command -v fuser >/dev/null 2>&1; then
  fuser -k 5000/tcp 2>/dev/null || true
  fuser -k 21504/tcp 2>/dev/null || true
else
  kill_port 5000 || true
  kill_port 21504 || true
fi
sleep 1

# Vite runs on port 21504 (canvas artifact owns 21503).
# The proxy on port 5000 forwards to 21504.
export VITE_PORT=21504

# Start port 5000 proxy FIRST so the workflow's waitForPort=5000 check passes.
# The proxy retries the connection to 21504 on each request, so it works even
# before Vite is fully up.
echo "[start] Starting port 5000 → 21504 proxy..."
node -e "
  const http = require('http');
  http.createServer((req, res) => {
    const opts = {
      host: '127.0.0.1', port: 21504,
      path: req.url, method: req.method,
      headers: { ...req.headers, host: 'localhost' },
    };
    const proxy = http.request(opts, r => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res, { end: true });
    });
    req.pipe(proxy, { end: true });
    proxy.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(503);
        res.end('Starting up — please refresh in a moment.');
      }
    });
  }).listen(5000, '0.0.0.0', () => console.log('[proxy] Port 5000 → 21504 ready'));
" &

# Map GEMINI_API_KEY → AI_INTEGRATIONS_GEMINI_API_KEY when the Replit integration key is absent
if [ -z "${AI_INTEGRATIONS_GEMINI_API_KEY}" ] && [ -n "${GEMINI_API_KEY}" ]; then
  export AI_INTEGRATIONS_GEMINI_API_KEY="${GEMINI_API_KEY}"
fi

echo "[start] Starting API server on port ${API_PORT:-8080}..."
NODE_ENV=development pnpm --filter @workspace/api-server run dev &

echo "[start] Starting frontend on port 21504..."
BASE_PATH=/ PORT=21504 pnpm --filter @workspace/peps-anonymous run dev
