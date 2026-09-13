import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./telegram-templates.ts", import.meta.url), "utf8");

describe("refund Telegram template protection", () => {
  it("applies the editable-in-admin guard to single/read-write routes", () => {
    expect(source).toContain("function requireEditable");
    expect(source.match(/requireEditable\(meta, res\)/g)?.length).toBe(3);
    expect(source).toContain(".filter(meta => meta.editableInAdmin !== false)");
  });
});