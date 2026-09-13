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

export async function main(
  run: () => ReturnType<typeof runWholesaleOrganiserPaymentBackfill> = runWholesaleOrganiserPaymentBackfill,
  setExitCode: (code: number) => void = (code) => {
    process.exitCode = code;
  },
): Promise<void> {
  try {
    const summary = await run();
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    const summary = error instanceof WholesaleOrganiserPaymentBackfillError
      ? error.summary
      : emptySummary();
    process.stderr.write("Shared organiser payment backfill failed.\n");
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    setExitCode(1);
  }
}