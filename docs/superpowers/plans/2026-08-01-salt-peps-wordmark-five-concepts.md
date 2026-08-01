# Salt&Peps Wordmark Five Concepts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated, interactive gallery comparing five Salt&Peps wordmark directions without changing the production logo assets.

**Architecture:** A single preview component owns selection state and renders shared wordmark primitives in three proof modes. Scoped CSS supplies the five typographic treatments, responsive layout, focus states, and reduced-motion behavior. A source contract test protects the concept list, proof contexts, and accessibility hooks.

**Tech Stack:** React, TypeScript, Vite mockup sandbox, scoped CSS, Node built-in test runner, lucide-react.

---

### Task 1: Add the source contract

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/salt-peps-wordmark-concepts/salt-peps-wordmark-concepts.test.ts`

- [x] **Step 1: Write the failing test**

  Assert that the component exposes the five concept identifiers, the `Salt&Peps` specimen, labelled concept and proof controls, three proof mode identifiers, reduced-motion CSS, and the mobile breakpoint.

- [x] **Step 2: Run the test to verify it fails**

  Run `node --experimental-strip-types --test artifacts/mockup-sandbox/src/components/mockups/salt-peps-wordmark-concepts/salt-peps-wordmark-concepts.test.ts`.

  Expected: failure because the component and scoped stylesheet do not yet exist.

### Task 2: Implement the gallery component and scoped styling

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/salt-peps-wordmark-concepts/SaltPepsWordmarkConcepts.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/salt-peps-wordmark-concepts/_group.css`

- [x] **Step 1: Implement shared state and concept data**

  Keep `selectedConcept` and `proofMode` in the entry component. Pass those values into shared `Wordmark` and `ProofCard` renderers so all contexts remain synchronized.

- [x] **Step 2: Implement accessible controls and proof views**

  Render five concept tabs, three proof-mode tabs, a labelled status region, primary/reverse/mono proof cards, and the responsive application strip. Use existing lucide icons for status and copy actions.

- [x] **Step 3: Add scoped visual treatments**

  Define the locked palette once, then differentiate the five concepts by typographic register, optical spacing, ampersand treatment, and baseline behavior. Add responsive rules at 1040px and 760px plus the reduced-motion override.

### Task 3: Verify the route

**Files:**
- Modify: `artifacts/mockup-sandbox/src/.generated/mockup-components.ts` (generated route entry)

- [x] **Step 1: Run the focused contract**

  Run the Node test command from Task 1 and require two passing tests.

- [x] **Step 2: Run the sandbox build**

  Run `MOCKUP_PORT=4174 MOCKUP_BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox build` and require exit code 0.

- [x] **Step 3: Load the route through Vite SSR**

  Load `/src/components/mockups/salt-peps-wordmark-concepts/SaltPepsWordmarkConcepts.tsx` with Vite's middleware SSR loader and require a function default export.
