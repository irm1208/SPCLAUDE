import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const organiserSource = await readFile(new URL("./organiser.ts", import.meta.url), "utf8");
const adminSource = await readFile(new URL("./admin.ts", import.meta.url), "utf8");

describe("organiser credit payment data contract", () => {
  it("returns creditsApplied with organiser order rows", () => {
    expect(organiserSource).toMatch(/creditsApplied:\s*ordersTable\.creditsApplied/);
  });

  it("filters both admin order endpoints by applied credit", () => {
    expect(adminSource).toMatch(/creditsApplied:\s*creditsAppliedQ/);
    expect(adminSource).toMatch(/sql`\$\{ordersTable\.creditsApplied\} > 0`/);
    expect(adminSource).toMatch(/\/admin\/orders\/ids/);
  });
});