import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./admin-auth.ts", import.meta.url), "utf8");

describe("admin auth routes", () => {
  it("exposes the server-authoritative status and session authentication endpoints", () => {
    for (const path of ["/admin/security/status", "/admin/security/enable/start", "/admin/security/enable/confirm", "/admin/auth/login", "/admin/auth/verify", "/admin/auth/logout", "/admin/auth/step-up", "/admin/security/disable"]) {
      expect(source).toContain(path);
    }
  });
});