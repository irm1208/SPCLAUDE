import { describe, expect, it } from "vitest";
import { adminSessionLifetimes, adminSessionTokenHash, ADMIN_ABSOLUTE_MS, ADMIN_IDLE_MS, ADMIN_REMEMBERED_MS, isRememberedAdminSession } from "./admin-session-policy";

describe("admin remembered-session policy", () => {
  it("binds legacy DB token hashes to the current shared secret", () => {
    const hash = adminSessionTokenHash("opaque-cookie-token", "first-secret");
    expect(hash).not.toBe(adminSessionTokenHash("opaque-cookie-token", "rotated-secret"));
    expect(hash).not.toContain("first-secret");
  });

  it("treats only sessions lasting longer than the standard absolute lifetime as remembered", () => {
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    expect(ADMIN_REMEMBERED_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(isRememberedAdminSession(createdAt, new Date(createdAt.getTime() + ADMIN_REMEMBERED_MS))).toBe(true);
    expect(isRememberedAdminSession(createdAt, new Date(createdAt.getTime() + 8 * 60 * 60 * 1000))).toBe(false);
  });

  it("uses 30m idle and 8h absolute limits when unchecked, and seven days when remembered", () => {
    expect(adminSessionLifetimes(false)).toEqual({ idleMs: ADMIN_IDLE_MS, absoluteMs: ADMIN_ABSOLUTE_MS });
    expect(adminSessionLifetimes(true)).toEqual({ idleMs: ADMIN_REMEMBERED_MS, absoluteMs: ADMIN_REMEMBERED_MS });
  });
});