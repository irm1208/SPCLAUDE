import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const deployScript = await readFile(
  new URL("../../../scripts/deploy.sh", import.meta.url),
  "utf8",
);
const apiPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

describe("deployment build contract", () => {
  it("does not mutate database schema during the image build", () => {
    expect(deployScript).not.toMatch(/\b(?:ALTER|CREATE|DROP)\s+TABLE\b/i);
    expect(deployScript).not.toMatch(/new Client\(\{\s*connectionString:\s*process\.env\.DATABASE_URL/);
  });
  it("keeps both API build entrypoints compile-only", () => {
    for (const name of ["build", "build:compile"]) {
      expect(apiPackage.scripts[name], name).not.toMatch(/push-force|db:push|drizzle-kit|@workspace\/db/);
      expect(apiPackage.scripts[name], name).toBe("tsx ./build.ts");
    }
  });
});