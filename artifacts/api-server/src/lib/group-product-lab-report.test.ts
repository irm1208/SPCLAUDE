import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("@workspace/db", async () => ({
  ...(await import("@workspace/db/schema")),
  db: { select: () => ({ from: () => ({ where: () => ({ limit: mocks.lookup }) }) }) },
}));
import { validateGroupProductLabReport } from "./group-product-lab-report";
beforeEach(() => vi.clearAllMocks());
it("preserves automatic matching and omitted settings without querying reports", async () => {
  expect(await validateGroupProductLabReport(null)).toEqual({ ok: true, id: null });
  expect(await validateGroupProductLabReport(undefined)).toEqual({ ok: true, id: undefined });
  expect(mocks.lookup).not.toHaveBeenCalled();
});
it.each([0, -1, 1.5, "12", true, {}, Number.MAX_SAFE_INTEGER + 1])("rejects invalid report IDs: %s", async value => {
  expect((await validateGroupProductLabReport(value)).ok).toBe(false);
  expect(mocks.lookup).not.toHaveBeenCalled();
});
it("only accepts a report that exists", async () => {
  mocks.lookup.mockResolvedValueOnce([{ id: 12 }]).mockResolvedValueOnce([]);
  expect(await validateGroupProductLabReport(12)).toEqual({ ok: true, id: 12 });
  expect((await validateGroupProductLabReport(99)).ok).toBe(false);
});
