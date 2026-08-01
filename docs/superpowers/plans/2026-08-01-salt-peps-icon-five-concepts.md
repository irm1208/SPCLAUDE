# Salt&Peps Favicon And Icon Five Concepts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive, interactive gallery comparing five Salt&Peps favicon/icon directions without changing production assets.

**Architecture:** One preview entry component owns selected concept and proof mode. Shared inline SVG primitives render the five concepts on a 64-unit grid, and scoped CSS supplies proof surfaces, size tests, application examples, focus states, and reduced-motion behavior. A source contract protects the concept list and small-size proof hooks.

**Tech Stack:** React, TypeScript, inline SVG, scoped CSS, lucide-react, Node built-in test runner, Vite mockup sandbox.

---

### Task 1: Add the source contract

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/salt-peps-icon-concepts/salt-peps-icon-concepts.test.ts`

- [x] **Step 1: Write the failing test**

  Assert the five concept identifiers, all three proof modes, the shared 64-unit viewBox, size ladder, accessible tab labels, mobile breakpoint, and reduced-motion CSS hooks.

- [x] **Step 2: Run it and verify the expected failure**

  Run `node --experimental-strip-types --test artifacts/mockup-sandbox/src/components/mockups/salt-peps-icon-concepts/salt-peps-icon-concepts.test.ts`.

  Expected: failure because the component and stylesheet do not exist.

### Task 2: Implement the icon concepts and gallery

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/salt-peps-icon-concepts/SaltPepsIconConcepts.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/salt-peps-icon-concepts/_group.css`

- [x] **Step 1: Add shared icon data and SVG primitives**

  Define typed concept metadata and render each concept inside one `viewBox="0 0 64 64"`. Keep color selection centralized by proof mode.

- [x] **Step 2: Add concept and proof controls**

  Render labelled concept tabs, Primary/Reverse/Mono proof tabs, selected status, and synchronized hero/proof surfaces.

- [x] **Step 3: Add size and application checks**

  Show 16px through 64px samples, browser/app/social examples, and a clear note that production assets remain unchanged.

- [x] **Step 4: Add responsive and reduced-motion styling**

  Keep the desktop rail/stage composition, convert the rail to a horizontal scroller at 760px, stack proof cards, and preserve visible focus states.

### Task 3: Verify the route

**Files:**
- Modify: `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`

- [x] **Step 1: Run the focused contract and SSR import check**

  Require all source tests to pass and Vite SSR to expose a function default export from `SaltPepsIconConcepts.tsx`.

- [x] **Step 2: Run the sandbox build and route check**

  Run `MOCKUP_PORT=4174 MOCKUP_BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox build`, then request `/preview/salt-peps-icon-concepts/SaltPepsIconConcepts` and require HTTP 200 from the development server.
