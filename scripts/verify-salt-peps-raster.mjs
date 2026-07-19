#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = resolve(
  repositoryRoot,
  "artifacts/peps-anonymous/public/brand",
);

const expectedRasters = [
  ["salt-peps-icon-16.png", 16, 16, "transparent"],
  ["salt-peps-icon-32.png", 32, 32, "transparent"],
  ["salt-peps-icon-48.png", 48, 48, "transparent"],
  ["salt-peps-social-180.png", 180, 180, "transparent"],
  ["salt-peps-social-512.png", 512, 512, "transparent"],
  ["salt-peps-apple-touch-180.png", 180, 180, "opaque"],
  ["salt-peps-logo-1440.png", 1440, 320, "transparent"],
];

const failures = [];
const decodedRasters = new Map();

for (const [
  fileName,
  expectedWidth,
  expectedHeight,
  expectedOpacity,
] of expectedRasters) {
  const filePath = resolve(brandDirectory, fileName);

  try {
    const buffer = await readFile(filePath);
    let png;

    try {
      png = PNG.sync.read(buffer, { checkCRC: true });
    } catch (error) {
      failures.push(
        `${fileName}: is not a CRC-valid decodable PNG (${error instanceof Error ? error.message : "unknown decode error"})`,
      );
      continue;
    }

    if (png.width !== expectedWidth || png.height !== expectedHeight) {
      failures.push(
        `${fileName}: is ${png.width}x${png.height}, expected ${expectedWidth}x${expectedHeight}`,
      );
    }

    let visiblePixels = 0;
    let transparentPixels = 0;
    for (let offset = 3; offset < png.data.length; offset += 4) {
      const alpha = png.data[offset];
      if (alpha > 0) visiblePixels += 1;
      if (alpha < 255) transparentPixels += 1;
    }

    if (visiblePixels === 0) {
      failures.push(`${fileName}: has no visible pixels`);
    }
    if (expectedOpacity === "opaque" && transparentPixels > 0) {
      failures.push(
        `${fileName}: has ${transparentPixels} non-opaque pixels, expected a fully opaque image`,
      );
    }
    if (expectedOpacity === "transparent" && transparentPixels === 0) {
      failures.push(`${fileName}: is fully opaque, expected transparency`);
    }

    decodedRasters.set(fileName, Buffer.from(png.data));
  } catch (error) {
    failures.push(
      `${fileName}: ${error?.code === "ENOENT" ? "missing required file" : "could not be read"}`,
    );
  }
}

const appleTouchPixels = decodedRasters.get("salt-peps-apple-touch-180.png");
const socialPixels = decodedRasters.get("salt-peps-social-180.png");
if (appleTouchPixels && socialPixels && appleTouchPixels.equals(socialPixels)) {
  failures.push(
    "salt-peps-apple-touch-180.png: must be distinct from the transparent social PNG",
  );
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
