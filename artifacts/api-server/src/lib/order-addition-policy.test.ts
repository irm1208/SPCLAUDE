import { describe, expect, it } from "vitest";
import { additionMustSplit, additionBlockReason } from "./order-addition-policy";

describe("addition batch boundary", () => {
  it("allows processing/prepared orders until the supplier submission boundary", () => {
    expect(additionBlockReason(false, "prepared", "Processing")).toBeNull();
    expect(additionBlockReason(false, undefined, "Processing")).toBeNull();
    expect(additionBlockReason(false, "released", "Submitted")).toBeNull();
  });
  it("blocks ordered batches even when the member order still says Processing", () => {
    expect(additionBlockReason(false, "ordered", "Processing")).toContain("submitted to the vendor");
    expect(additionBlockReason(true, undefined, "Processing")).toBeTruthy();
    expect(additionBlockReason(false, undefined, "Shipped")).toBeTruthy();
  });
  it.each(["prepared", "ordered"])("splits an active %s allocation", state => {
    expect(additionMustSplit(false, state)).toBe(true);
  });
  it.each([undefined, "released"])("merges without an active commitment (%s)", state => {
    expect(additionMustSplit(false, state)).toBe(false);
  });
  it("preserves legacy supplier locks even without an allocation", () => {
    expect(additionMustSplit(true, undefined)).toBe(true);
  });
});
