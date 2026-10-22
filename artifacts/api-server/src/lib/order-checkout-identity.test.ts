import { describe, expect, it } from "vitest";
import { resolveOrderUsername } from "./order-checkout-identity";

describe("order checkout identity", () => {
  it("ignores a different name submitted by a signed-in member", () => {
    expect(resolveOrderUsername("Member", "different-member")).toBe("@member");
    expect(resolveOrderUsername("@MEMBER", null)).toBe("@member");
    expect(resolveOrderUsername("member", { injected: true })).toBe("@member");
  });
  it("preserves guest checkout while rejecting missing or invalid names", () => {
    expect(resolveOrderUsername(undefined, " Guest ")).toBe("@guest");
    expect(resolveOrderUsername(null, "@Guest")).toBe("@guest");
    for (const value of [undefined, null, "", " ", {}, 123]) {
      expect(resolveOrderUsername(undefined, value)).toBeNull();
    }
  });
  it("does not fall back to a submitted name for a malformed authenticated identity", () => {
    expect(resolveOrderUsername("", "other-member")).toBeNull();
  });
});
