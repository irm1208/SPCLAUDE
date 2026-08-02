#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import { format } from "prettier";
import { optimize } from "svgo";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = resolve(
  repositoryRoot,
  "artifacts/peps-anonymous/public/brand",
);
const fontPath = resolve(
  repositoryRoot,
  "scripts/logo/inter-latin-800-normal.woff",
);

const palette = {
  accent: "#2D6BCC",
  border: "#D0DAE4",
  deepNavy: "#1B3164",
  ink: "#0F1F38",
  navy: "#1B3A7A",
  surface: "#F8FAFC",
  white: "#FFFFFF",
};

const wordmarkText = "Salt&Peps";
const wordmarkFontSize = 64;
const wordmarkBaseline = 57;
const wordmarkOriginX = 10;
const wordmarkViewBox = "0 0 360 80";

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function svgDocument({ body, description, title, viewBox }) {
  const escapedTitle = escapeXml(title);
  const escapedDescription = escapeXml(description);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${escapedTitle}">
  <title>${escapedTitle}</title>
  <desc>${escapedDescription}</desc>
  ${body}
</svg>`;
}

function renderGlyphs({ accent, primary, transform = "" }) {
  const transformAttribute = transform ? ` transform="${transform}"` : "";
  const paths = glyphs
    .map(
      ({ character, pathData }) =>
        `<path d="${pathData}" fill="${character === "&" ? accent : primary}"/>`,
    )
    .join("\n    ");

  return `<g${transformAttribute}>
    ${paths}
  </g>`;
}

function renderProof() {
  return [
    `<path d="M0 0H1200V900H0Z" fill="${palette.surface}"/>`,
    `<path d="M0 640H1200V900H0Z" fill="${palette.deepNavy}"/>`,
    `<path d="M64 320H1136" fill="none" stroke="${palette.border}" stroke-width="2"/>`,
    `<path d="M64 630H1136" fill="none" stroke="${palette.border}" stroke-width="2"/>`,
    renderGlyphs({
      accent: palette.accent,
      primary: palette.ink,
      transform: "translate(64 68) scale(2.6)",
    }),
    renderGlyphs({
      accent: palette.ink,
      primary: palette.ink,
      transform: "translate(64 370) scale(1.55)",
    }),
    `<path d="M840 366H1136V404H840Z" fill="${palette.navy}"/>`,
    `<path d="M840 420H1136V458H840Z" fill="${palette.accent}"/>`,
    renderGlyphs({
      accent: palette.white,
      primary: palette.white,
      transform: "translate(64 700) scale(2.4)",
    }),
  ].join("\n    ");
}

async function serializeSvg(source, path) {
  const optimized = optimize(source, {
    multipass: true,
    plugins: ["sortAttrs"],
  });
  const formatted = await format(optimized.data, { parser: "html" });
  await writeFile(path, formatted, "utf8");
}

const fontBuffer = await readFile(fontPath);
const fontArrayBuffer = fontBuffer.buffer.slice(
  fontBuffer.byteOffset,
  fontBuffer.byteOffset + fontBuffer.byteLength,
);
const font = opentype.parse(fontArrayBuffer);
const pathDataOptions = {
  decimalPlaces: 2,
  flipY: false,
  optimize: true,
};

const glyphs = [];
let cursorX = wordmarkOriginX;
for (const character of [...wordmarkText]) {
  const pathData = font
    .charToGlyph(character)
    .getPath(cursorX, wordmarkBaseline, wordmarkFontSize, { kerning: true })
    .toPathData(pathDataOptions);
  glyphs.push({ character, pathData });
  cursorX += font.getAdvanceWidth(character, wordmarkFontSize, {
    kerning: true,
  });
}

const assets = [
  {
    body: renderGlyphs({ accent: palette.accent, primary: palette.ink }),
    description:
      "The title-case Salt&Peps wordmark in heavy geometric sans, with a restrained blue ampersand accent.",
    fileName: "salt-peps-logo.svg",
    title: "Salt&Peps logo",
    viewBox: wordmarkViewBox,
  },
  {
    body: renderGlyphs({ accent: palette.white, primary: palette.white }),
    description:
      "The white title-case Salt&Peps wordmark for dark backgrounds.",
    fileName: "salt-peps-logo-reverse.svg",
    title: "Salt&Peps reverse logo",
    viewBox: wordmarkViewBox,
  },
  {
    body: renderGlyphs({ accent: palette.ink, primary: palette.ink }),
    description: "The single-color title-case Salt&Peps wordmark.",
    fileName: "salt-peps-logo-mono.svg",
    title: "Salt&Peps monochrome logo",
    viewBox: wordmarkViewBox,
  },
  {
    body: renderProof(),
    description:
      "A proof sheet of the primary, monochrome, and reverse Salt&Peps wordmark variants.",
    fileName: "salt-peps-logo-proof.svg",
    title: "Salt&Peps logo proof sheet",
    viewBox: "0 0 1200 900",
  },
];

await mkdir(brandDirectory, { recursive: true });
await Promise.all(
  assets.map((asset) =>
    serializeSvg(svgDocument(asset), resolve(brandDirectory, asset.fileName)),
  ),
);

const primarySvg = await readFile(
  resolve(brandDirectory, "salt-peps-logo.svg"),
);
const logoPng = new Resvg(primarySvg, {
  fitTo: { mode: "width", value: 1440 },
})
  .render()
  .asPng();
await writeFile(resolve(brandDirectory, "salt-peps-logo-1440.png"), logoPng);

console.log(
  `Generated ${assets.length} SVG and 1 PNG Salt&Peps wordmark assets.`,
);
