import { describe, expect, it } from "vitest";
import { shouldLogPreferenceDisabledNotification } from "./telegram";

describe("notification preference-disabled logging", () => {
  it("preserves the existing log by default but permits wholesale's race-safe suppression", () => {
    expect(shouldLogPreferenceDisabledNotification()).toBe(true);
    expect(shouldLogPreferenceDisabledNotification({ suppressPreferenceDisabledLog: false })).toBe(true);
    expect(shouldLogPreferenceDisabledNotification({ suppressPreferenceDisabledLog: true })).toBe(false);
  });
});