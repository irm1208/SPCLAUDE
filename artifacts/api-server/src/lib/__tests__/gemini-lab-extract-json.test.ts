import { describe, expect, it } from "vitest";
import { parseSageJsonResponse } from "../gemini-lab-extract";

describe("parseSageJsonResponse", () => {
  it("parses a GPT-5.5 JSON object after a Zhihuiai think block", () => {
    expect(parseSageJsonResponse(
      '<think>Reading the certificate fields.</think>\n{"batch_code":"G10-0727","purity_pct":97.945}',
    )).toEqual({
      batch_code: "G10-0727",
      purity_pct: 97.945,
    });
  });

  it("parses a fenced JSON array after a think block", () => {
    expect(parseSageJsonResponse(
      "<think>Checking visible batch codes.</think>\n```json\n[\"G10-0727\"]\n```",
    )).toEqual(["G10-0727"]);
  });
});