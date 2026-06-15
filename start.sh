#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "[start] Clearing any stale processes..."
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
sleep 1

# Vite runs on port 21503 — the port mapped to externalPort=80 in .replit.
# The API server (port 8080) proxies all non-/api requests to Vite on port 21503.
export VITE_PORT=21503

# Start port 5000 proxy FIRST so the workflow's waitForPort=5000 check passes.
# The proxy retries the connection to 21503 on each request, so it works even
# before Vite is fully up.
echo "[start] Starting port 5000 → 21503 proxy..."
node -e "
  const http = require('http');
  http.createServer((req, res) => {
    const opts = {
      host: '127.0.0.1', port: 21503,
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
  }).listen(5000, '0.0.0.0', () => console.log('[proxy] Port 5000 → 21503 ready'));
" &

# Map GEMINI_API_KEY → AI_INTEGRATIONS_GEMINI_API_KEY when the Replit integration key is absent
if [ -z "${AI_INTEGRATIONS_GEMINI_API_KEY}" ] && [ -n "${GEMINI_API_KEY}" ]; then
  export AI_INTEGRATIONS_GEMINI_API_KEY="${GEMINI_API_KEY}"
fi

echo "[start] Starting API server on port ${API_PORT:-8080}..."
NODE_ENV=development pnpm --filter @workspace/api-server run dev &

echo "[start] Starting frontend on port 21503..."
BASE_PATH=/ PORT=21503 pnpm --filter @workspace/peps-anonymous run dev
