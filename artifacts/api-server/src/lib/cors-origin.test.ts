import { describe, expect, it } from "vitest";
import { buildAllowedOrigins, isAllowedOrigin } from "./cors-origin";

describe("API CORS origins", () => {
  it("allows the configured Vite dev and preview ports", () => {
    const allowed = buildAllowedOrigins({ PORT: "3001", VITE_PORT: "3002" });
    expect(isAllowedOrigin("http://localhost:3001", allowed)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3002", allowed)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3002", allowed)).toBe(true);
  });

  it("allows VS Code forwarded loopback ports in development", () => {
    const allowed = buildAllowedOrigins({});
    const development = { NODE_ENV: "development" };

    expect(isAllowedOrigin("http://localhost:53477", allowed, development)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:49152", allowed, development)).toBe(true);
    expect(isAllowedOrigin("http://[::1]:4173", allowed, development)).toBe(true);
  });

  it("keeps arbitrary loopback ports restricted in production", () => {
    const allowed = buildAllowedOrigins({});
    expect(isAllowedOrigin("http://localhost:53477", allowed, { NODE_ENV: "production" })).toBe(false);
  });

  it("rejects unrelated web origins", () => {
    expect(
      isAllowedOrigin("https://example.com", buildAllowedOrigins({}), { NODE_ENV: "development" }),
    ).toBe(false);
  });
});
