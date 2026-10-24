import type { Readable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { performance } from "node:perf_hooks";

// A single streaming dump, not parallel pg_dump jobs. Backpressure propagates
// through stdout to pg_dump/COPY, limiting sustained disk/network/DB throughput.
export const BACKUP_BYTES_PER_SECOND = 16 * 1024 * 1024;
const CHUNK_BYTES = 64 * 1024;

export async function* pacedBackupStream(
  source: Readable, bytesPerSecond = BACKUP_BYTES_PER_SECOND,
): AsyncGenerator<Buffer, void, unknown> {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) throw new Error("Invalid backup throughput");
  for await (const input of source) {
    const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
    for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
      const chunk = bytes.subarray(start, start + CHUNK_BYTES);
      const until = performance.now() + chunk.length / bytesPerSecond * 1000;
      // Always yield to foreground I/O, with no catch-up bursts after a stall.
      do { await delay(Math.max(1, until - performance.now())); } while (performance.now() < until);
      yield chunk;
    }
  }
}
