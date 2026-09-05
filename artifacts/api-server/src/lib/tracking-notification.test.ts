import { describe, expect, it } from "vitest";
import { formatTrackingNumbersForNotification } from "./tracking-notification";

describe("formatTrackingNumbersForNotification", () => {
  it("labels both legs of a BMURFS package", () => {
    expect(formatTrackingNumbersForNotification([{
      id: "p1",
      courier: "bmurfs",
      internationalTrackingNumber: "SMEX6082643740",
      localTrackingNumber: "HD358713635GB",
    }])).toContain("International");
    expect(formatTrackingNumbersForNotification([{
      id: "p1",
      courier: "bmurfs",
      internationalTrackingNumber: "SMEX6082643740",
      localTrackingNumber: "HD358713635GB",
    }])).toContain("Local courier");
  });
});