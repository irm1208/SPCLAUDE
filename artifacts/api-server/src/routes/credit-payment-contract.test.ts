import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const organiserSource = await readFile(new URL("./organiser.ts", import.meta.url), "utf8");

describe("organiser credit payment data contract", () => {
  it("returns creditsApplied with organiser order rows", () => {
    expect(organiserSource).toMatch(/creditsApplied:\s*ordersTable\.creditsApplied/);
  });
});