#!/bin/bash
# Runs on every branch checkout/merge in Replit (see [postMerge] in .replit).
# It used to run "drizzle-kit push --force" against DATABASE_URL on every
# checkout, which can rewrite the live schema. Schema changes now happen only
# when someone runs them deliberately (pnpm --filter @workspace/db run push).
set -e
pnpm install --frozen-lockfile
