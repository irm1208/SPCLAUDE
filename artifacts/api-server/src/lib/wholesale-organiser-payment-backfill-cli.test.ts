import { afterEach, describe, expect, it, vi } from "vitest";
import { main, runWithPool, writeFailure } from "./wholesale-organiser-payment-backfill-cli";
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

  it.each([
    ["success", false],
    ["failure", true],
  ] as const)("closes the standalone pool after %s", async (_outcome, shouldFail) => {
    const events: string[] = [];
    const pool = {
      end: vi.fn(async () => {
        events.push("pool.end");
      }),
    };
    const run = vi.fn(async () => {
      events.push("runner");
      if (shouldFail) throw new Error("runner failed");
      return {
        summary: {
          scanned: 0,
          repaired: 0,
          alreadyCorrect: 0,
          skippedByCode: {},
        },
        failed: false,
      };
    });
    const reportFailure = vi.fn();

    const operation = runWithPool(run, async () => pool, reportFailure);

    if (shouldFail) {
      await expect(operation).resolves.toMatchObject({ failed: true });
      expect(reportFailure).toHaveBeenCalledOnce();
    } else {
      await expect(operation).resolves.toMatchObject({ failed: false });
      expect(reportFailure).not.toHaveBeenCalled();
    }
    expect(run).toHaveBeenCalledOnce();
    expect(pool.end).toHaveBeenCalledOnce();
    expect(events).toEqual(["runner", "pool.end"]);
  });

  it("reports a pool acquisition failure without raw details", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const error = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const setExitCode = vi.fn();
    const run = vi.fn();

    const result = await runWithPool(
      run,
      async () => {
        throw new Error("secret connection string");
      },
      (summary, writeSummary) => writeFailure(summary, setExitCode, writeSummary),
    );

    expect(result).toMatchObject({ failed: true, summary: { scanned: 0 } });
    expect(run).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("Shared organiser payment backfill failed.\n");
    expect(write).toHaveBeenCalledWith(
      '{"scanned":0,"repaired":0,"alreadyCorrect":0,"skippedByCode":{}}\n',
    );
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(error.mock.calls.flat().join(" ")).not.toContain("secret");
  });

  it("reports pool cleanup failure without duplicating successful output", async () => {
    const summary = {
      scanned: 2,
      repaired: 1,
      alreadyCorrect: 1,
      skippedByCode: {},
    };
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const error = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const setExitCode = vi.fn();

    const result = await runWithPool(
      () => main(async () => summary, setExitCode),
      async () => ({
        end: async () => {
          throw new Error("secret pool failure");
        },
      }),
      (failureSummary, writeSummary) => writeFailure(failureSummary, setExitCode, writeSummary),
    );

    expect(result).toMatchObject({ failed: true, summary });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(`${JSON.stringify(summary)}\n`);
    expect(error).toHaveBeenCalledWith("Shared organiser payment backfill failed.\n");
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(error.mock.calls.flat().join(" ")).not.toContain("secret");
  });

  it("does not duplicate diagnostics when main and cleanup both fail", async () => {
    const summary = {
      scanned: 1,
      repaired: 1,
      alreadyCorrect: 0,
      skippedByCode: {},
    };
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const error = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const setExitCode = vi.fn();

    await runWithPool(
      () => main(async () => {
        throw new WholesaleOrganiserPaymentBackfillError(summary, new Error("secret runner failure"));
      }, setExitCode),
      async () => ({
        end: async () => {
          throw new Error("secret pool failure");
        },
      }),
      (failureSummary, writeSummary) => writeFailure(failureSummary, setExitCode, writeSummary),
    );

    expect(write).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(setExitCode).toHaveBeenCalledTimes(1);
    expect(error.mock.calls.flat().join(" ")).not.toContain("secret");
  });
});
