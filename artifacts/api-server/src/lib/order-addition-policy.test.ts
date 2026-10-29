import { describe, expect, it } from "vitest";
import { additionMustSplit } from "./order-addition-policy";

describe("addition batch boundary", () => {
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
