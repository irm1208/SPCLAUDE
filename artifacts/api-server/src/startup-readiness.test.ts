import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production startup readiness", () => {
  it("starts listening before running blocking bootstrap work", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(source.indexOf("const server = startServer()")).toBeLessThan(
      source.lastIndexOf("runStartupMigrations()"),
    );
  });

  it("keeps the deployment health endpoint outside the readiness gate", () => {
    const source = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

    expect(source).toContain('app.get("/api/healthz"');
    expect(source.indexOf('app.get("/api/healthz"')).toBeLessThan(
      source.indexOf('app.use("/api", requireApplicationReady)'),
    );
  });
});