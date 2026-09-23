import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const deployScript = await readFile(
  new URL("../../../scripts/deploy.sh", import.meta.url),
  "utf8",
);

describe("deployment build contract", () => {
  it("does not mutate database schema during the image build", () => {
    expect(deployScript).not.toMatch(/\b(?:ALTER|CREATE|DROP)\s+TABLE\b/i);
    expect(deployScript).not.toMatch(/new Client\(\{\s*connectionString:\s*process\.env\.DATABASE_URL/);
  });
});