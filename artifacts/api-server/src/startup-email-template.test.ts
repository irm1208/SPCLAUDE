import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("email verification template bootstrap", () => {
  it("runs template initialization before accepting traffic and fails explicitly", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(source.indexOf(".then(() => ensureSystemEmailTemplates())")).toBeLessThan(source.indexOf(".then(() => startServer())"));
    expect(source).toContain("Bootstrap failed; server will not start");
  });
});