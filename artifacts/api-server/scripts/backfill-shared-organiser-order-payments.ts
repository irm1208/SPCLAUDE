import { runWholesaleOrganiserPaymentBackfill } from "../src/lib/wholesale-organiser-payment-backfill";

runWholesaleOrganiserPaymentBackfill()
  .then((summary) => {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  })
  .catch(() => {
    process.exitCode = 1;
  });
