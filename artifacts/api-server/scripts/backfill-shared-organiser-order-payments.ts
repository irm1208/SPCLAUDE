import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { main } from "../src/lib/wholesale-organiser-payment-backfill-cli";
import { runWithPool } from "../src/lib/wholesale-organiser-payment-backfill-cli";

async function runStandalone(): Promise<void> {
  await runWithPool(
    () => main(),
    async () => {
      const { pool } = await import("@workspace/db");
      return pool;
    },
  );
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  void runStandalone();
}
