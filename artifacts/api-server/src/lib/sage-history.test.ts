import { describe, expect, it } from "vitest";
import { removeStaleNoDataAssistantMessages } from "./sage-history";

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