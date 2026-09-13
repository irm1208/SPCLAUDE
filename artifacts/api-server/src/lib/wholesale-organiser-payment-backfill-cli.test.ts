import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../../scripts/backfill-shared-organiser-order-payments";

describe("shared organiser payment backfill CLI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints only the aggregate summary on success", async () => {
    const summary = {
      scanned: 2,
      repaired: 1,
      alreadyCorrect: 0,
      skippedByCode: { invalid_share_status: 1 },
    };
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await main(async () => summary);

    expect(write).toHaveBeenCalledWith(`${JSON.stringify(summary)}\n`);
    expect(write.mock.calls[0]?.[0]).not.toContain("paymentTxHash");
    expect(write.mock.calls[0]?.[0]).not.toContain("username");
  });

  it("sets a failing exit code without printing unexpected error details", async () => {
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await main(async () => {
      throw new Error("database failure with payment and username details");
    });

    expect(process.exitCode).toBe(1);
    expect(write).not.toHaveBeenCalled();
    process.exitCode = previousExitCode;
  });
});
