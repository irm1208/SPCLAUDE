import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

type SubmitResponse = {
  id?: string;
  code: string;
  mergedIntoExistingOrder?: boolean;
};

let resolveOrderSubmitDestination:
  | ((data: SubmitResponse, existingOrderId: string | null) => string)
  | undefined;

try {
  ({ resolveOrderSubmitDestination } = await import("./order-submit-destination.ts"));
} catch {
  // The red run intentionally happens before the implementation exists.
}

test("merged add-ons return to the original order detail", () => {
  expect(resolveOrderSubmitDestination).toBeTypeOf("function");
  expect(
    resolveOrderSubmitDestination!(
      { id: "parent-id", code: "11337", mergedIntoExistingOrder: true },
      null,
    ),
  ).toBe("/account/orders/parent-id");
});

test("ordinary new orders keep the existing success destination", () => {
  expect(resolveOrderSubmitDestination).toBeTypeOf("function");
  expect(
    resolveOrderSubmitDestination!({ id: "new-id", code: "11483" }, null),
  ).toBe("/success?code=11483&action=created&oid=new-id");
});

test("the review action names the merge operation", () => {
  const source = readFileSync(new URL("./Review.tsx", import.meta.url), "utf8");
  expect(source).toMatch(/isTopUp\s*\?\s*"Add to Order"/);
});