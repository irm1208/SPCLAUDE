import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account username foreign-key cascades", () => {
  it("allows wholesale access-request owners to rename their account", () => {
    const source = readFileSync(
      new URL("../../../../lib/db/src/schema/wholesale_access_requests.ts", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(
      /accountUsername:\s*text\("account_username"\)\.notNull\(\)\.references\(\s*\(\) => accountsTable\.telegramUsername,\s*\{\s*onUpdate:\s*"cascade"\s*\}\s*,?\s*\)/,
    );
  });
});