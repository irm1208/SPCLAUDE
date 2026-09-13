import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./wholesale-organiser-payment-backfill-cli";
import { WholesaleOrganiserPaymentBackfillError } from "./wholesale-organiser-payment-backfill";

vi.mock("@workspace/db", () => {
  throw new Error("The database module must remain lazy for CLI tests.");
});

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
    const setExitCode = vi.fn();

    await main(async () => summary, setExitCode);

    expect(write).toHaveBeenCalledWith(`${JSON.stringify(summary)}\n`);
    expect(write.mock.calls[0]?.[0]).not.toContain("paymentTxHash");
    expect(write.mock.calls[0]?.[0]).not.toContain("username");
    expect(setExitCode).not.toHaveBeenCalled();
  });

  it("writes a generic diagnostic and partial aggregate on unexpected failure", async () => {
    const summary = {
      scanned: 3,
      repaired: 1,
      alreadyCorrect: 1,
      skippedByCode: { invalid_share_status: 1 },
    };
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const error = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const setExitCode = vi.fn();

    await main(async () => {
      throw new WholesaleOrganiserPaymentBackfillError(summary, new Error("secret database details"));
    }, setExitCode);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith("Shared organiser payment backfill failed.\n");
    expect(write).toHaveBeenCalledWith(`${JSON.stringify(summary)}\n`);
    expect(error.mock.calls[0]?.[0]).not.toContain("secret");
    expect(error.mock.calls[0]?.[0]).not.toContain("username");
  });
});
