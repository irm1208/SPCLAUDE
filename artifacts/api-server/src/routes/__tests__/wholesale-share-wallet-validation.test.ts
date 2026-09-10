import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routeSource = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");

describe("shared-order wallet validation route contract", () => {
  it("maps wallet validation failures to HTTP 400", () => {
    const normalizer = routeSource.indexOf("normalizeOrganiserWallets(body.leadCryptoOptions)");
    const handler = routeSource.indexOf("res.status(400).json({ error: error.message })", normalizer);
    const validationCatch = routeSource.indexOf("error instanceof OrganiserWalletValidationError", normalizer);
    expect(normalizer).toBeGreaterThan(-1);
    expect(validationCatch).toBeGreaterThan(normalizer);
    expect(handler).toBeGreaterThan(normalizer);
    expect(handler).toBeGreaterThan(validationCatch);
  });
});