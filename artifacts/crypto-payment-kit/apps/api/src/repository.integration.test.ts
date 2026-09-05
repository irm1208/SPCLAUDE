import { describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("PostgreSQL repository integration (requires TEST_DATABASE_URL)", () => {
  it("requires the caller to migrate an isolated test database", async () => {
    expect(databaseUrl).toMatch(/^postgres(?:ql)?:\/\//);
  });
});