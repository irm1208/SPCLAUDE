# Root `.env` Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the repository-root `.env` file for API and primary frontend package commands without overriding environment variables supplied by the shell or deployment platform.

**Architecture:** Use Node's native `--env-file=../../.env` option at each package entry point. Keep the change in package scripts so environment values exist before application modules and Vite configuration are evaluated.

**Tech Stack:** Node.js 20, pnpm, tsx, Vite, Node's built-in test runner

---

### Task 1: Add an environment-loading contract test

**Files:**

- Create: `artifacts/api-server/src/lib/__tests__/root-env-loading.test.mjs`

- [x] **Step 1: Write the failing test**

Create a `node:test` contract test that reads the API and frontend `package.json` files and asserts that API `dev` and frontend `dev`, `build`, and `serve` scripts invoke `node --env-file=../../.env`.

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test artifacts/api-server/src/lib/__tests__/root-env-loading.test.mjs`

Expected: FAIL because the current package scripts do not contain `--env-file=../../.env`.

### Task 2: Connect package entry points to the root `.env`

**Files:**

- Modify: `artifacts/api-server/package.json`
- Modify: `artifacts/peps-anonymous/package.json`
- Modify: `start.sh`

- [x] **Step 1: Update the API development script**

Set `dev` to `NODE_ENV=development node --env-file=../../.env --import tsx ./src/index.ts`.

- [x] **Step 2: Update frontend scripts**

Set `dev`, `build`, and `serve` to invoke Vite through `node --env-file=../../.env ./node_modules/vite/bin/vite.js`, preserving each script's existing arguments.

- [x] **Step 3: Pin the API port in the development launcher**

Export `API_PORT="${API_PORT:-8080}"` in `start.sh` before launching the API. This prevents a repository `.env` `PORT` value from changing the API port away from the frontend proxy target.

- [x] **Step 4: Run the contract test to verify it passes**

Run: `node --test artifacts/api-server/src/lib/__tests__/root-env-loading.test.mjs`

Expected: PASS.

### Task 3: Verify behavior and affected packages

**Files:**

- Modify: `docs/superpowers/plans/2026-09-05-root-env-loading.md` (check off completed steps)

- [x] **Step 1: Verify Node precedence semantics**

Run a temporary env-file probe and confirm the env-file value loads when absent while an exported value remains authoritative.

- [x] **Step 2: Run affected type checks**

Run: `pnpm --filter @workspace/api-server --filter @workspace/peps-anonymous run typecheck`

Expected: both package type checks exit successfully. If unrelated baseline errors prevent this, record the exact failures in the handoff.

- [x] **Step 3: Inspect the final diff**

Run: `git diff --check && git diff -- artifacts/api-server/package.json artifacts/peps-anonymous/package.json artifacts/api-server/src/lib/__tests__/root-env-loading.test.mjs`

Expected: no whitespace errors, no `.env` contents, and only the intended configuration and contract-test changes.

- [ ] **Step 4: Commit if Git identity is available**

Run: `git add artifacts/api-server/package.json artifacts/peps-anonymous/package.json artifacts/api-server/src/lib/__tests__/root-env-loading.test.mjs docs/superpowers/plans/2026-09-05-root-env-loading.md && git commit -m "fix: load root env in app scripts"`

Expected: commit succeeds when repository author identity is configured; otherwise leave the reviewed changes uncommitted and report the identity blocker.
