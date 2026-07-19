#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = resolve(
  repositoryRoot,
  "artifacts/peps-anonymous/public/brand",
);

const expectedRasters = [
  ["salt-peps-icon-16.png", 16, 16],
  ["salt-peps-icon-32.png", 32, 32],
  ["salt-peps-icon-48.png", 48, 48],
  ["salt-peps-social-180.png", 180, 180],
  ["salt-peps-social-512.png", 512, 512],
  ["salt-peps-logo-1440.png", 1440, 320],
];

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const failures = [];

for (const [fileName, expectedWidth, expectedHeight] of expectedRasters) {
  const filePath = resolve(brandDirectory, fileName);

  try {
    const buffer = await readFile(filePath);

    if (buffer.length < 33 || !buffer.subarray(0, 8).equals(pngSignature)) {
      failures.push(`${fileName}: is not a valid PNG file`);
      continue;
    }

    const chunkType = buffer.toString("ascii", 12, 16);
    if (chunkType !== "IHDR") {
      failures.push(
        `${fileName}: first PNG chunk is ${chunkType}, expected IHDR`,
      );
      continue;
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width !== expectedWidth || height !== expectedHeight) {
      failures.push(
        `${fileName}: is ${width}x${height}, expected ${expectedWidth}x${expectedHeight}`,
      );
    }

    if (buffer.length < 100) {
      failures.push(`${fileName}: PNG payload is unexpectedly small`);
    }
  } catch (error) {
    failures.push(
      `${fileName}: ${error?.code === "ENOENT" ? "missing required file" : "could not be read"}`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `SALT&PEPS raster contract: FAIL (${failures.length} violation${failures.length === 1 ? "" : "s"})`,
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `SALT&PEPS raster contract: PASS (${expectedRasters.length} PNG assets validated)`,
  );
}
