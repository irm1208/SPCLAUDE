#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import makerjs from "makerjs";
import { format } from "prettier";
import { optimize } from "svgo";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = resolve(
  repositoryRoot,
  "artifacts/peps-anonymous/public/brand",
);

const palette = {
  accent: "#2D6BCC",
  mono: "#0F1F38",
  navy: "#1B3A7A",
  social: "#1B3164",
  white: "#FFFFFF",
};

const markPoints = [
  [49, 56],
  [43, 50],
  [23, 28],
  [18, 22],
  [18, 15],
  [23, 9],
  [32, 7],
  [41, 10],
  [46, 16],
  [45, 23],
  [40, 29],
  [31, 35],
  [23, 41],
  [19, 47],
  [21, 53],
  [28, 57],
  [36, 56],
  [43, 51],
  [49, 44],
];

function makerPathData(points) {
  const cartesianPoints = points.map(([x, y]) => [x, -y]);
  const model = new makerjs.models.ConnectTheDots(false, cartesianPoints);

  return makerjs.exporter.toSVGPathData(model, {
    accuracy: 0.01,
    origin: [0, 0],
  });
}

const markPath = makerPathData(markPoints);

const standardCarbonylPath = [
  makerPathData([
    [43.8, 21.4],
    [55.5, 13.5],
  ]),
  makerPathData([
    [45.7, 24],
    [57.2, 16.2],
  ]),
  makerPathData([
    [23.2, 40.6],
    [8.4, 44.8],
  ]),
  makerPathData([
    [24.1, 43.4],
    [9.2, 47.6],
  ]),
].join(" ");

const smallCarbonylPath = [
  makerPathData([
    [44.5, 22.6],
    [56.5, 14.5],
  ]),
  makerPathData([
    [23.5, 42],
    [7.5, 46.5],
  ]),
].join(" ");

const standardLozenges = [
  "M57 10.75 60.75 14.5 57 18.25 53.25 14.5Z",
  "M7 43.25 10.75 47 7 50.75 3.25 47Z",
];

const smallLozenges = [
  "M57 9.75 61.75 14.5 57 19.25 52.25 14.5Z",
  "M6.5 41.5 11.5 46.5 6.5 51.5 1.5 46.5Z",
];

function renderMark({ accent, primary, small = false, transform }) {
  const carbonylPath = small ? smallCarbonylPath : standardCarbonylPath;
  const lozenges = small ? smallLozenges : standardLozenges;
  const transformAttribute = transform ? ` transform="${transform}"` : "";

  return `<g${transformAttribute}>
    <path d="${markPath}" fill="none" stroke="${primary}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${small ? 8 : 7.25}"/>
    <path d="${carbonylPath}" fill="none" stroke="${primary}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${small ? 3.25 : 2.25}"/>
    ${lozenges.map((pathData) => `<path d="${pathData}" fill="${accent}"/>`).join("\n    ")}
  </g>`;
}

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

async function serializeSvg(source, path) {
  const optimized = optimize(source, {
    multipass: true,
    plugins: ["sortAttrs"],
  });
  const formatted = await format(optimized.data, {
    parser: "html",
  });

  await writeFile(path, formatted, "utf8");
}

const assets = [
  {
    body: renderMark({ primary: palette.navy, accent: palette.accent }),
    description:
      "A peptide-bond ampersand with two blue carbonyl groups for SALT and PEPS.",
    fileName: "salt-peps-icon.svg",
    title: "SALT&PEPS icon",
    viewBox: "0 0 64 64",
  },
  {
    body: renderMark({ primary: palette.white, accent: palette.white }),
    description:
      "The white SALT and PEPS peptide-bond ampersand for dark backgrounds.",
    fileName: "salt-peps-icon-reverse.svg",
    title: "SALT&PEPS reverse icon",
    viewBox: "0 0 64 64",
  },
  {
    body: renderMark({ primary: palette.mono, accent: palette.mono }),
    description: "The single-color SALT and PEPS peptide-bond ampersand.",
    fileName: "salt-peps-icon-mono.svg",
    title: "SALT&PEPS monochrome icon",
    viewBox: "0 0 64 64",
  },
  {
    body: renderMark({
      primary: palette.navy,
      accent: palette.accent,
      small: true,
    }),
    description:
      "A simplified SALT and PEPS peptide-bond ampersand for small sizes.",
    fileName: "salt-peps-icon-small.svg",
    title: "SALT&PEPS small icon",
    viewBox: "0 0 64 64",
  },
  {
    body: `<path d="M18 0h144a18 18 0 0 1 18 18v144a18 18 0 0 1-18 18H18a18 18 0 0 1-18-18V18A18 18 0 0 1 18 0Z" fill="${palette.social}"/>
    ${renderMark({
      primary: palette.white,
      accent: palette.white,
      transform: "translate(26 26) scale(2)",
    })}`,
    description:
      "The white SALT and PEPS peptide-bond icon on a deep navy square.",
    fileName: "salt-peps-social.svg",
    title: "SALT&PEPS social icon",
    viewBox: "0 0 180 180",
  },
];

await mkdir(brandDirectory, { recursive: true });
await Promise.all(
  assets.map((asset) =>
    serializeSvg(svgDocument(asset), resolve(brandDirectory, asset.fileName)),
  ),
);

console.log(`Generated ${assets.length} SALT&PEPS icon assets.`);
