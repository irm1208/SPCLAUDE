import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isBlockedAutomatedRegistrationName } from "./registration-abuse";

describe("automated registration name blocking", () => {
  it.each([
    "auditx55d544",
    "@audx55d544",
    "audv001122",
    "audjabcdef",
    "auditshop123",
    "audanything",
    "audrey",
    "audiofan",
    "hermesaudit987",
  ])("blocks the automated AUD family %s", (username) => {
    expect(isBlockedAutomatedRegistrationName(username)).toBe(true);
  });

  it.each([
    "shopper123",
    "hermesfan",
    "legitimate_user",
  ])("does not block an ordinary username %s", (username) => {
    expect(isBlockedAutomatedRegistrationName(username)).toBe(false);
  });

  it("guards wholesale invite registration and Reshipper applications", () => {
    const wholesaleSource = readFileSync(new URL("../routes/wholesale-shares.ts", import.meta.url), "utf8");
    const reshipperSource = readFileSync(new URL("../routes/reshipper.ts", import.meta.url), "utf8");
    expect(wholesaleSource).toMatch(/wholesale-invite\/:code\/register[\s\S]*isBlockedAutomatedRegistrationName\(tg\)/);
    expect(reshipperSource).toMatch(/reshipper\/apply[\s\S]*isBlockedAutomatedRegistrationName\(username\)/);
  });

  it("rate-limits every public account-creation route", () => {
    const routesSource = readFileSync(new URL("../routes/index.ts", import.meta.url), "utf8");
    expect(routesSource).toContain('router.post("/wholesale-invite/:code/register", signupLimiter)');
  });
});