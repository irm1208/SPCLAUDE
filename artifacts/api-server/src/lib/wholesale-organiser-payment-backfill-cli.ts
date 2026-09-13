import {
  runWholesaleOrganiserPaymentBackfill,
  WholesaleOrganiserPaymentBackfillError,
  type WholesaleOrganiserPaymentBackfillSummary,
} from "./wholesale-organiser-payment-backfill";

const emptySummary = (): WholesaleOrganiserPaymentBackfillSummary => ({
  scanned: 0,
  repaired: 0,
  alreadyCorrect: 0,
  skippedByCode: {},
});

export type BackfillPool = {
  end: () => Promise<unknown>;
};

export type BackfillCliResult = {
  summary: WholesaleOrganiserPaymentBackfillSummary;
  failed: boolean;
};

export function writeFailure(
  summary: WholesaleOrganiserPaymentBackfillSummary,
  setExitCode: (code: number) => void,
  writeSummary = true,
): void {
  process.stderr.write("Shared organiser payment backfill failed.\n");
  if (writeSummary) process.stdout.write(`${JSON.stringify(summary)}\n`);
  setExitCode(1);
}

export async function runWithPool(
  run: () => Promise<BackfillCliResult>,
  loadPool: () => Promise<BackfillPool>,
  reportFailure: (summary: WholesaleOrganiserPaymentBackfillSummary, writeSummary?: boolean) => void,
): Promise<BackfillCliResult> {
  let result: BackfillCliResult = {
    summary: emptySummary(),
    failed: false,
  };
  let pool: BackfillPool | undefined;

  try {
    try {
      pool = await loadPool();
    } catch {
      result = { summary: emptySummary(), failed: true };
      reportFailure(result.summary);
      return result;
    }

    try {
      result = await run();
    } catch (error) {
      const summary = error instanceof WholesaleOrganiserPaymentBackfillError
        ? error.summary
        : emptySummary();
      result = { summary, failed: true };
      reportFailure(result.summary);
    }
    return result;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch {
        if (!result.failed) {
          result.failed = true;
          reportFailure(result.summary, false);
        }
      }
    }
  }
}


export async function main(
  run: () => ReturnType<typeof runWholesaleOrganiserPaymentBackfill> = runWholesaleOrganiserPaymentBackfill,
  setExitCode: (code: number) => void = (code) => {
    process.exitCode = code;
  },
): Promise<BackfillCliResult> {
  try {
    const summary = await run();
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return {
      summary,
      failed: false,
    };
  } catch (error) {
    const summary = error instanceof WholesaleOrganiserPaymentBackfillError
      ? error.summary
      : emptySummary();
    writeFailure(summary, setExitCode);
    return {
      summary,
      failed: true,
    };
  }
}