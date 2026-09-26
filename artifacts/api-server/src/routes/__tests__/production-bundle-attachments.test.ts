import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const buildSource = readFileSync(fileURLToPath(new URL("../../../build.ts", import.meta.url)), "utf8");
const bundledDependencies = buildSource.match(/const allowlist = \[([\s\S]*?)\];/)?.[1] ?? "";

describe("production API bundle", () => {
  it.each(["file-type", "@replit/object-storage"])(
    "bundles %s because the published artifact has no runtime package links",
    (dependency) => {
      expect(bundledDependencies).toContain(`"${dependency}"`);
    },
  );
});