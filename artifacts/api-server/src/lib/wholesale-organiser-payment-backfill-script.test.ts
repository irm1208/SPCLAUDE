import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  main: vi.fn(async () => {}),
}));

vi.mock("./wholesale-organiser-payment-backfill-cli", () => ({
  main: harness.main,
}));

vi.mock("@workspace/db", () => {
  throw new Error("The database module must remain lazy when importing the script.");
});

describe("backfill script entrypoint", () => {
  it("does not execute main when imported", async () => {
    const scriptPath = resolve(
      process.cwd(),
      "scripts/backfill-shared-organiser-order-payments.ts",
    );

    await import(pathToFileURL(scriptPath).href);

    expect(harness.main).not.toHaveBeenCalled();
  });
});