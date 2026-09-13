import { runWholesaleOrganiserPaymentBackfill } from "../src/lib/wholesale-organiser-payment-backfill";
import { pathToFileURL } from "node:url";

export async function main(
  run: () => ReturnType<typeof runWholesaleOrganiserPaymentBackfill> = runWholesaleOrganiserPaymentBackfill,
): Promise<void> {
  try {
    const summary = await run();
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
