import { describe, expect, it } from "vitest";
import {
  isBloodDataUnavailableResponse,
  removeStaleNoDataAssistantMessages,
} from "./sage-history";

describe("removeStaleNoDataAssistantMessages", () => {
  it("removes stale assistant requests to upload results when biomarkers are loaded", () => {
    const result = removeStaleNoDataAssistantMessages([
      { role: "assistant", content: "I still can't see an uploaded report. Please attach it again." },
      { role: "user", content: "You've got the data" },
      { role: "user", content: "Explain my latest bloodwork" },
    ]);

    expect(result).toEqual([
      { role: "user", content: "You've got the data" },
      { role: "user", content: "Explain my latest bloodwork" },
    ]);
  });

  it("keeps ordinary assistant health guidance", () => {
    const result = removeStaleNoDataAssistantMessages([
      { role: "assistant", content: "Your haematocrit is above the stated reference range." },
    ]);

    expect(result).toEqual([
      { role: "assistant", content: "Your haematocrit is above the stated reference range." },
    ]);
  });

  it("handles curly apostrophes from model-generated replies", () => {
    const result = removeStaleNoDataAssistantMessages([
      { role: "assistant", content: "I can explain it, but I don’t see the bloodwork attached yet. Please upload the report or paste the results." },
    ]);

    expect(result).toEqual([]);
  });
});

describe("isBloodDataUnavailableResponse", () => {
  it("detects the contradictory upload request returned despite loaded biomarkers", () => {
    expect(isBloodDataUnavailableResponse(
      "Please upload the report or paste the results, including test name, result and units, and lab reference range.",
    )).toBe(true);
  });

  it("detects explicit claims that bloodwork is unavailable", () => {
    expect(isBloodDataUnavailableResponse(
      "I don’t see your bloodwork attached yet. Please upload the report.",
    )).toBe(true);
  });

  it("does not reject grounded bloodwork guidance", () => {
    expect(isBloodDataUnavailableResponse(
      "Your testosterone is above the stated reference range, while your other reported markers should be reviewed together.",
    )).toBe(false);
  });

  it("does not reject a suggestion to upload future results for comparison", () => {
    expect(isBloodDataUnavailableResponse(
      "You can upload future results to compare them with this current panel.",
    )).toBe(false);
  });
});