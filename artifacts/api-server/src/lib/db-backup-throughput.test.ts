import { expect, it } from "vitest";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { performance } from "node:perf_hooks";
import { pacedBackupStream } from "./db-backup-throughput";

it("paces dump output with bounded chunks and exact bytes while allowing foreground work", async () => {
  const source = Buffer.alloc(256 * 1024, 123);
  let bytes = 0, largest = 0, foreground = 0;
  const timer = setInterval(() => foreground++, 5);
  const start = performance.now();
  try {
    await pipeline(
      Readable.from(pacedBackupStream(Readable.from([source]), 1024 * 1024)),
      new Writable({ write(chunk, _, done) {
        bytes += chunk.length; largest = Math.max(largest, chunk.length);
        expect(chunk.equals(Buffer.alloc(chunk.length, 123))).toBe(true);
        done();
      } }),
    );
  } finally { clearInterval(timer); }
  expect(bytes).toBe(source.length);
  expect(largest).toBeLessThanOrEqual(64 * 1024);
  expect(performance.now() - start).toBeGreaterThanOrEqual(240);
  expect(foreground).toBeGreaterThan(10);
});

it("does not accumulate a burst allowance while downstream is stalled", async () => {
  const input = Readable.from([Buffer.alloc(128 * 1024)]);
  const stream = pacedBackupStream(input, 1024 * 1024);
  await stream.next();
  await new Promise(resolve => setTimeout(resolve, 100));
  const start = performance.now();
  await stream.next();
  expect(performance.now() - start).toBeGreaterThanOrEqual(55);
  await stream.return();
});
