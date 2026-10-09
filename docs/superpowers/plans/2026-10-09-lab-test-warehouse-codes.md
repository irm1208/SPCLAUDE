# Lab-test warehouse codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record `US` or `UK` from a lab-test batch-code prefix, preserve the original code, and keep existing compound/dose matching correct.

**Architecture:** Derive warehouse deterministically from a leading `US-` or `UK-`; never ask the extraction model to infer it. Persist it separately on `lab_tests`, normalize only the value used for product-prefix matching, and expose it in extraction review and admin records, deriving it from the code for older rows.

**Tech Stack:** TypeScript, Express, Drizzle/PostgreSQL, React/Vite, Vitest, Node test runner.

---

## File map

- `artifacts/api-server/src/lib/lab-test-warehouse.ts`: server-side parser used by extraction and persistence.
- `artifacts/peps-anonymous/src/lib/batch-prefixes.ts`: client-side warehouse display and prefix normalization used by existing title and lab-report matching.
- `artifacts/peps-anonymous/src/lib/uther-batch-codes.ts`: normalize Uther batch codes before exact/prefix product resolution.
- `artifacts/peps-anonymous/src/components/LabTestsTab.tsx`: normalize the admin editor's manual product-prefix lookup.
- `lib/db/src/schema/lab_tests.ts`: nullable persisted warehouse column.
- `artifacts/api-server/src/lib/gemini-lab-extract.ts`, `artifacts/api-server/src/routes/lab-tests.ts`, `artifacts/api-server/src/routes/organiser.ts`, and `artifacts/api-server/src/routes/admin.ts`: derive/expose warehouse on extraction, create/update/import, prefix application, and list responses.
- `artifacts/peps-anonymous/src/pages/LabTests.tsx`, `artifacts/peps-anonymous/src/components/LabTestsTab.tsx`, and `artifacts/peps-anonymous/src/pages/organiser-v2/LabTestsTab.tsx`: display warehouse during extraction review and in admin/organiser records.

### Task 1: Parse warehouses and preserve product/dose matching

**Files:**
- Create: `artifacts/api-server/src/lib/lab-test-warehouse.ts`
- Create: `artifacts/api-server/src/lib/lab-test-warehouse.test.ts`
- Modify: `artifacts/peps-anonymous/src/lib/batch-prefixes.ts`
- Modify: `artifacts/peps-anonymous/src/lib/uther-batch-codes.ts`
- Create: `artifacts/peps-anonymous/src/lib/batch-prefixes.warehouse.test.ts`
- Modify: `artifacts/peps-anonymous/src/components/LabTestsTab.tsx`
- Modify: `artifacts/api-server/src/routes/lab-tests.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`

- [ ] **Step 1: Write the failing client matching tests**

Add tests for `getLabTestWarehouse`, warehouse-aware product-prefix matching, and the existing SS31 dose mapping:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  batchCodeMatchesPrefix,
  getLabTestWarehouse,
  resolveBatchPrefixName,
} from "./batch-prefixes";

test("detects only leading US and UK warehouse prefixes", () => {
  assert.equal(getLabTestWarehouse("US-SS50-0831"), "US");
  assert.equal(getLabTestWarehouse("uk-SS50-0831"), "UK");
  assert.equal(getLabTestWarehouse("SS50-0831"), null);
  assert.equal(getLabTestWarehouse("EU-SS50-0831"), null);
});

test("strips warehouse only for product matching and keeps dose boundaries", () => {
  assert.equal(batchCodeMatchesPrefix("US-SS50-0831", "SS50"), true);
  assert.equal(batchCodeMatchesPrefix("UK-SS50-0831", "SS50"), true);
  assert.equal(batchCodeMatchesPrefix("US-SS30-0831", "SS50"), false);
  assert.equal(resolveBatchPrefixName("US-SS50-0831")?.compound, "SS-31");
  assert.equal(resolveBatchPrefixName("US-SS50-0831")?.dose, "50mg");
});
```

- [ ] **Step 2: Run the client test and confirm it fails**

Run: `pnpm --filter @workspace/peps-anonymous exec node --experimental-strip-types --test src/lib/batch-prefixes.warehouse.test.ts`

Expected: FAIL because `getLabTestWarehouse` is not implemented and the prefixed batch code does not match `SS50`.

- [ ] **Step 3: Write the failing server parser tests**

In `lab-test-warehouse.test.ts`, add:

```ts
import { describe, expect, it } from "vitest";
import { parseLabTestBatchCode } from "./lab-test-warehouse";

describe("parseLabTestBatchCode", () => {
  it("separates known warehouse prefixes from the product code", () => {
    expect(parseLabTestBatchCode("US-SS50-0831")).toEqual({
      warehouse: "US",
      productBatchCode: "SS50-0831",
    });
    expect(parseLabTestBatchCode("uk-SS50-0831")).toEqual({
      warehouse: "UK",
      productBatchCode: "SS50-0831",
    });
  });

  it("does not infer warehouses for other or absent prefixes", () => {
    expect(parseLabTestBatchCode("SS50-0831")).toEqual({
      warehouse: null,
      productBatchCode: "SS50-0831",
    });
    expect(parseLabTestBatchCode("EU-UNKNOWN-0831")).toEqual({
      warehouse: null,
      productBatchCode: "EU-UNKNOWN-0831",
    });
    expect(parseLabTestBatchCode("US-UNKNOWN-0831").warehouse).toBe("US");
  });
});
```

- [ ] **Step 4: Run the server parser test and confirm it fails**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/lab-test-warehouse.test.ts`

Expected: FAIL because the parser module does not exist.

- [ ] **Step 5: Implement the two focused parsers and matching changes**

Both parsers recognize only `^(US|UK)-`, case-insensitively. The server parser returns the recognized warehouse and the code suffix for matching; it does not mutate the stored batch code. In `batch-prefixes.ts`, make `batchCodeMatchesPrefix` test the suffix after that prefix, and export `getLabTestWarehouse`. Update the frontend Uther resolver and the API's Uther resolver to use the suffix for product lookup.

In `admin.ts`, normalize the batch code before `batch-code-prefixes/apply-to-tests` looks up its first prefix. In `lab-tests.ts`, allow `/lab-tests?batchPrefix=SS50` to match either `SS50-…` or `US-SS50-…`/`UK-SS50-…`, retaining the existing non-alphanumeric boundary.
In the admin editor's manual batch-code resolver in `LabTestsTab.tsx`, strip a recognized warehouse prefix before looking up its product prefix as well.

The server helper's core behavior is:

```ts
export type LabTestWarehouse = "US" | "UK";

export function parseLabTestBatchCode(code: string | null | undefined): {
  warehouse: LabTestWarehouse | null;
  productBatchCode: string | null;
} {
  const normalized = code?.trim() ?? "";
  const match = /^(US|UK)-/i.exec(normalized);
  return {
    warehouse: match ? (match[1]!.toUpperCase() as LabTestWarehouse) : null,
    productBatchCode: normalized ? normalized.slice(match?.[0].length ?? 0) : null,
  };
}
```

The client matcher first removes only the warehouse prefix, then applies its current boundary expression:

```ts
export type LabTestWarehouse = "US" | "UK";

export function getLabTestWarehouse(code: string | null | undefined): LabTestWarehouse | null {
  const match = /^(US|UK)-/i.exec(code?.trim() ?? "");
  return match ? (match[1]!.toUpperCase() as LabTestWarehouse) : null;
}

export function stripWarehousePrefix(code: string | null | undefined): string | null {
  const normalized = code?.trim() ?? "";
  if (!normalized) return null;
  return normalized.replace(/^(US|UK)-/i, "");
}

const productBatchCode = stripWarehousePrefix(batchCode) ?? "";
const re = new RegExp("^" + escapeRegExp(prefix) + "([^a-z0-9]|$)", "i");
return re.test(productBatchCode);
```

Use `stripWarehousePrefix` in `uther-batch-codes.ts` and the admin editor's manual resolver so every client-side product lookup removes the same leading prefix.

- [ ] **Step 6: Run both parser and matching tests**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec node --experimental-strip-types --test src/lib/batch-prefixes.warehouse.test.ts
pnpm --filter @workspace/api-server exec vitest run src/lib/lab-test-warehouse.test.ts
```

Expected: both commands pass; `US-SS50-0831` and `UK-SS50-0831` resolve to SS-31 50mg, and `SS50` does not match a different dose prefix.

### Task 2: Persist warehouse throughout extraction and record writes

**Files:**
- Modify: `lib/db/src/schema/lab_tests.ts`
- Modify: `artifacts/api-server/src/lib/gemini-lab-extract.ts`
- Modify: `artifacts/api-server/src/routes/lab-tests.ts`
- Modify: `artifacts/api-server/src/routes/organiser.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`
- Create: `artifacts/api-server/src/routes/lab-tests-warehouse.integration.test.ts`

- [ ] **Step 1: Write the failing persistence tests**

Use the existing Vitest route-test pattern with `@workspace/db` mocked from `@workspace/db/schema` and a fake database. Cover a new record from a `US-` extraction, a record updated/re-extracted with a `UK-` batch code, the admin bulk batch-code update, and the existing batch-prefix apply action. Assert the full batch code remains intact and the separate `warehouse` value is saved.

The essential assertions are:

```ts
expect(inserted.batchCode).toBe("US-SS50-0831");
expect(inserted.warehouse).toBe("US");
expect(updated.batchCode).toBe("UK-SS50-0831");
expect(updated.warehouse).toBe("UK");
```

Mock the DB without constructing a connection pool:

```ts
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: fakeDb, pool: {} };
});
```

- [ ] **Step 2: Run the persistence tests and confirm they fail**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/lab-tests-warehouse.integration.test.ts`

Expected: FAIL because the schema and API write payloads do not include `warehouse`.

- [ ] **Step 3: Add the nullable database field**

Add `warehouse` as a nullable text column in `lab_tests`. Use the database skill before applying the development schema change; do not directly alter production. Production schema changes remain part of the normal publish process.

The schema addition is:

```ts
warehouse: text("warehouse"),
```

- [ ] **Step 4: Add warehouse to extraction results**

Add `warehouse: "US" | "UK" | null` to `ExtractedCoAData`. `runSageExtraction` derives it from the extracted `batchCode` using `parseLabTestBatchCode`; do not change the model prompt to classify warehouses. Add the same derived field to the organiser-specific extraction response in `organiser.ts`.

The normalization at the extraction boundary is:

```ts
const { warehouse } = parseLabTestBatchCode(extracted.batchCode);
return { ...extracted, warehouse };
```

- [ ] **Step 5: Derive warehouse for every lab-test write**

Use the server parser when building inserts and updates in public URL/PDF submissions, admin create/edit and `with-pdf`, bulk imports, single/batch re-extraction, organiser submissions/imports, and admin batch-code changes. When batch code changes, derive the new value even when it is null so an old warehouse cannot remain attached to a non-prefixed code. When the admin applies known batch-prefix mappings to existing rows, derive the warehouse from each row's batch code as part of that update.

Every insert that uses a final batch code follows this pattern:

```ts
const { warehouse } = parseLabTestBatchCode(batchCode);
await db.insert(labTestsTable).values({ ...values, batchCode, warehouse });
```

An update that changes the code derives the replacement rather than carrying forward the prior warehouse:

```ts
const { warehouse } = parseLabTestBatchCode(nextBatchCode);
await db.update(labTestsTable)
  .set({ batchCode: nextBatchCode, warehouse })
  .where(eq(labTestsTable.id, id));
```

- [ ] **Step 6: Expose saved and historical values in read responses**

Add `warehouse` to the explicit projections for `/lab-tests` and `/admin/lab-tests/pending`. For a null saved value, return the value derived from the batch code so existing rows display correctly without a historical data rewrite.

- [ ] **Step 7: Run persistence tests**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/lab-tests-warehouse.integration.test.ts`

Expected: PASS for create, update/re-extraction, and bulk batch-code changes; all returned and persisted batch codes retain their original `US-`/`UK-` prefix.

### Task 3: Show warehouse in extraction review and admin/organiser records

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/LabTests.tsx`
- Modify: `artifacts/peps-anonymous/src/components/LabTestsTab.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/LabTestsTab.tsx`
- Modify: frontend lab-test record types used by those files

- [ ] **Step 1: Add a display-helper test**

Extend `batch-prefixes.warehouse.test.ts` to assert that saved `US`/`UK` values and historical null values derived from a batch code format as `US warehouse` or `UK warehouse`; unprefixed codes display no warehouse.

- [ ] **Step 2: Run the client test and confirm it fails**

Run: `pnpm --filter @workspace/peps-anonymous exec node --experimental-strip-types --test src/lib/batch-prefixes.warehouse.test.ts`

Expected: FAIL because the display helper is not implemented.

- [ ] **Step 3: Implement the warehouse display helper**

Add a small pure helper in `batch-prefixes.ts` that prefers the saved warehouse and falls back to `getLabTestWarehouse(batchCode)`. Return a concise label or `null`; do not display the warehouse as part of the compound name or dose.

Its behavior is:

```ts
export function labTestWarehouseLabel(
  warehouse: LabTestWarehouse | null | undefined,
  batchCode: string | null | undefined,
): string | null {
  const detected = warehouse ?? getLabTestWarehouse(batchCode);
  return detected ? `${detected} warehouse` : null;
}
```

- [ ] **Step 4: Display the warehouse on extraction and admin surfaces**

Add the nullable `warehouse` property to the affected frontend record and extraction-result types. Preserve `warehouse` when mapping extraction responses into review state; if a response lacks it, derive it from the batch code. Show the warehouse beside the batch code in the public/admin extraction review, the admin pending and saved-record lists, and the organiser extraction/review UI. Derive a display value for old rows whose saved field is null. Keep public certificate/product cards unchanged apart from the shared product-title matching fix from Task 1.

Use the same label helper in each view:

```tsx
const warehouseLabel = labTestWarehouseLabel(test.warehouse, test.batchCode);
return (
  <div>
    <span>{test.batchCode}</span>
    {warehouseLabel && <span>{warehouseLabel}</span>}
  </div>
);
```

- [ ] **Step 5: Run client tests and typecheck**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec node --experimental-strip-types --test src/lib/batch-prefixes.warehouse.test.ts
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: tests pass and TypeScript reports no errors from the new field or display helper.

### Task 4: Apply the development schema and verify the whole feature

**Files:**
- No additional source files; verify the changes from Tasks 1–3.

- [ ] **Step 1: Apply the development database schema**

After reading `.local/skills/database/SKILL.md`, run `pnpm --filter @workspace/db run push` against the development database and verify that the nullable `lab_tests.warehouse` column exists. Stop if Drizzle proposes an unrelated destructive rename or drop.

- [ ] **Step 2: Run focused API and client tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/lab-test-warehouse.test.ts src/routes/lab-tests-warehouse.integration.test.ts
pnpm --filter @workspace/peps-anonymous exec node --experimental-strip-types --test src/lib/batch-prefixes.warehouse.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 3: Run typechecks and builds**

Run:

```bash
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/api-server run build:compile
pnpm --filter @workspace/peps-anonymous run build
```

Expected: both app builds complete. Record any pre-existing unrelated typecheck failure separately rather than expanding scope.

- [ ] **Step 4: Restart and inspect the canonical app workflow**

Read `.local/skills/workflows/SKILL.md`, restart only `Start application`, and check workflow/browser logs. Verify the application starts; do not restart the duplicate API-server or Peps web workflows.

- [ ] **Step 5: Verify the visible UI**

Capture the running app preview. The admin route may be behind authentication, so do not bypass auth; if the preview only shows sign-in, report that the signed-in admin UI could not be visually inspected and rely on builds/tests for those views.

- [ ] **Step 6: Commit the feature**

```bash
git add lib/db/src/schema/lab_tests.ts artifacts/api-server/src/lib/lab-test-warehouse.ts artifacts/api-server/src/lib/lab-test-warehouse.test.ts artifacts/api-server/src/lib/gemini-lab-extract.ts artifacts/api-server/src/routes/lab-tests.ts artifacts/api-server/src/routes/organiser.ts artifacts/api-server/src/routes/admin.ts artifacts/api-server/src/routes/lab-tests-warehouse.integration.test.ts artifacts/peps-anonymous/src/lib/batch-prefixes.ts artifacts/peps-anonymous/src/lib/uther-batch-codes.ts artifacts/peps-anonymous/src/lib/batch-prefixes.warehouse.test.ts artifacts/peps-anonymous/src/pages/LabTests.tsx artifacts/peps-anonymous/src/components/LabTestsTab.tsx artifacts/peps-anonymous/src/pages/organiser-v2/LabTestsTab.tsx
git commit -m "feat: track lab test warehouses"
```
