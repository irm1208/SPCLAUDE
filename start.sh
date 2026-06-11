#!/bin/bash
set -e

cd Product-Landing-Page

PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

PORT=5000 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous run dev &
FRONTEND_PID=$!

wait $API_PID $FRONTEND_PID
