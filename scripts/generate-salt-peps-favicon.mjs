#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import { format } from "prettier";
import { optimize } from "svgo";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = resolve(repositoryRoot, "artifacts/peps-anonymous/public");
const brandDirectory = resolve(publicDirectory, "brand");
const fontPath = resolve(repositoryRoot, "scripts/logo/inter-latin-800-normal.woff");

const colors = {
  background: "#1B3164",
  foreground: "#FFFFFF",
};

const faviconSize = 180;
const glyphSize = 116;
const glyphBaseline = 136;
const glyphCharacters = ["S", "&", "P"];
const glyphTransform = "translate(9 24) scale(.70)";

const fontBuffer = await readFile(fontPath);
const fontArrayBuffer = fontBuffer.buffer.slice(
  fontBuffer.byteOffset,
  fontBuffer.byteOffset + fontBuffer.byteLength,
);
const font = opentype.parse(fontArrayBuffer);

let cursorX = 0;
const glyphPaths = glyphCharacters.map((character) => {
  const pathData = font
    .getPath(character, cursorX, glyphBaseline, glyphSize, { kerning: true })
    .toPathData({ decimalPlaces: 2, flipY: false, optimize: true });

  cursorX += font.getAdvanceWidth(character, glyphSize, { kerning: true });
  return pathData;
});

const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${faviconSize}" height="${faviconSize}" viewBox="0 0 ${faviconSize} ${faviconSize}" role="img" aria-label="Salt&amp;Peps S&amp;P favicon">
  <title>Salt&amp;Peps S&amp;P favicon</title>
  <desc>Type-derived white S&amp;P monogram on a Brand Blue rounded square.</desc>
  <rect width="${faviconSize}" height="${faviconSize}" rx="30" fill="${colors.background}"/>
  <g transform="${glyphTransform}">
    ${glyphPaths.map((pathData) => `<path d="${pathData}" fill="${colors.foreground}"/>`).join("\n    ")}
  </g>
</svg>`;

const optimized = optimize(source, {
  multipass: true,
  plugins: ["sortAttrs"],
}).data;
const favicon = await format(optimized, { parser: "html" });

await mkdir(brandDirectory, { recursive: true });
await writeFile(resolve(publicDirectory, "favicon.svg"), favicon, "utf8");

const appleTouchPng = new Resvg(favicon, {
  fitTo: { mode: "width", value: faviconSize },
  background: colors.background,
}).render().asPng();
await writeFile(
  resolve(brandDirectory, "salt-peps-apple-touch-180.png"),
  appleTouchPng,
);

console.log(
  `Generated ${resolve(publicDirectory, "favicon.svg")} and ${resolve(brandDirectory, "salt-peps-apple-touch-180.png")}`,
);
