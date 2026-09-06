import { describe, expect, it } from "vitest";
import { isBlockedAutomatedRegistrationName } from "./registration-abuse";

describe("automated registration name blocking", () => {
  it.each([
    "auditx55d544",
    "@audx55d544",
    "audv001122",
    "audjabcdef",
    "auditshop123",
    "hermesaudit987",
  ])("blocks the observed machine-generated family %s", (username) => {
    expect(isBlockedAutomatedRegistrationName(username)).toBe(true);
  });

  it.each([
    "audrey",
    "audiofan",
    "shopper123",
    "hermesfan",
    "legitimate_user",
  ])("does not block an ordinary username %s", (username) => {
    expect(isBlockedAutomatedRegistrationName(username)).toBe(false);
  });
});