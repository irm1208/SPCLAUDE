import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  main,
  runWithPool,
  writeFailure,
} from "../src/lib/wholesale-organiser-payment-backfill-cli";

async function runStandalone(): Promise<void> {
  await runWithPool(
    () => main(),
    async () => {
      const { pool } = await import("@workspace/db");
      return pool;
    },
    (summary, writeSummary) => writeFailure(
      summary,
      (code) => {
        process.exitCode = code;
      },
      writeSummary,
    ),
  );
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  void runStandalone();
}
