import { describe, expect, it } from "vitest";
import { adminCookieSecurityOptions, isAllowedAdminCsrfOrigin } from "./admin-csrf-origin";

describe("admin CSRF origin validation", () => {
  it("accepts the request Host without using forwarded-host", () => {
    expect(isAllowedAdminCsrfOrigin("https://admin.example.test", "admin.example.test", {})).toBe(true);
    expect(isAllowedAdminCsrfOrigin("https://attacker.test", "admin.example.test", { "x-forwarded-host": "attacker.test" })).toBe(false);
  });

  it("accepts only the exact HTTPS Replit dev domain when the proxy rewrites Host", () => {
    const env = { NODE_ENV: "development", REPLIT_DEV_DOMAIN: "peps.replit.dev" };
    expect(isAllowedAdminCsrfOrigin("https://peps.replit.dev", "localhost:5000", env)).toBe(true);
    expect(isAllowedAdminCsrfOrigin("https://evil.peps.replit.dev", "localhost:5000", env)).toBe(false);
    expect(isAllowedAdminCsrfOrigin("http://peps.replit.dev", "localhost:5000", env)).toBe(false);
  });

  it("does not enable the Replit development exception in production or without its injected domain", () => {
    expect(isAllowedAdminCsrfOrigin("https://peps.replit.dev", "localhost:5000", { NODE_ENV: "production", REPLIT_DEV_DOMAIN: "peps.replit.dev" })).toBe(false);
    expect(isAllowedAdminCsrfOrigin("https://peps.replit.dev", "localhost:5000", { NODE_ENV: "development" })).toBe(false);
  });

  it("uses the account-compatible attributes for regular and legacy cookies in Replit preview", () => {
    expect(adminCookieSecurityOptions({ NODE_ENV: "development", REPL_ID: "preview" })).toEqual({
      secure: true, sameSite: "none", partitioned: true,
    });
    expect(adminCookieSecurityOptions({ NODE_ENV: "production", REPL_ID: "production" })).toEqual({
      secure: true, sameSite: "strict",
    });
  });
});