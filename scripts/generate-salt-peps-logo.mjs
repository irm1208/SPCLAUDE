#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import makerjs from "makerjs";
import opentype from "opentype.js";
import { format } from "prettier";
import { optimize } from "svgo";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = resolve(
  repositoryRoot,
  "artifacts/peps-anonymous/public/brand",
);
const wordmarkFontPath = resolve(
  repositoryRoot,
  "scripts/logo/inter-latin-800-normal.woff",
);

const palette = {
  accent: "#2D6BCC",
  mono: "#0F1F38",
  navy: "#1B3A7A",
  social: "#1B3164",
  white: "#FFFFFF",
};

const wordmarkFontSize = 54;
const wordmarkBaseline = 59;
const wordmarkOriginX = 88;
const wordmarkAvailableWidth = 264;

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

function renderWordmark({ accent, primary, transform }) {
  const transformAttribute = transform ? ` transform="${transform}"` : "";

  return `<g${transformAttribute}>
    <path d="${wordmarkPathData.salt}" fill="${primary}"/>
    <path d="${wordmarkPathData.ampersand}" fill="${accent}"/>
    <path d="${wordmarkPathData.peps}" fill="${primary}"/>
  </g>`;
}

function renderLogo({
  accent,
  primary,
  iconAccent = accent,
  iconPrimary = primary,
  transform,
}) {
  const transformAttribute = transform ? ` transform="${transform}"` : "";

  return `<g${transformAttribute}>
    ${renderMark({
      accent: iconAccent,
      primary: iconPrimary,
      transform: "translate(8 8)",
    })}
    ${renderWordmark({
      accent,
      primary,
      transform: `translate(${wordmarkOriginX} 0) scale(${wordmarkScaleX} 1)`,
    })}
  </g>`;
}

function renderProof() {
  const sizeSamples = [16, 24, 32, 48, 64];
  const sampleOrigins = [72, 128, 200, 288, 400];
  const samples = sizeSamples
    .map((size, index) =>
      renderMark({
        accent: palette.accent,
        primary: palette.navy,
        small: size === 16,
        transform: `translate(${sampleOrigins[index]} 482) scale(${size / 64})`,
      }),
    )
    .join("\n    ");

  return `<path d="M0 0H1200V900H0Z" fill="#F8FAFC"/>
    <path d="M0 560H1200V900H0Z" fill="${palette.social}"/>
    <path d="M64 286H1136" fill="none" stroke="#D0DAE4" stroke-width="2"/>
    <path d="M700 316V452" fill="none" stroke="#D0DAE4" stroke-width="2"/>
    <path d="M64 462H1136" fill="none" stroke="#D0DAE4" stroke-width="2"/>
    ${renderLogo({
      accent: palette.accent,
      iconPrimary: palette.navy,
      primary: palette.mono,
      transform: "translate(64 54) scale(2.5)",
    })}
    ${renderLogo({
      accent: palette.mono,
      primary: palette.mono,
      transform: "translate(64 322) scale(1.55)",
    })}
    ${renderMark({
      accent: palette.accent,
      primary: palette.navy,
      transform: "translate(760 328) scale(1.65)",
    })}
    ${renderMark({
      accent: palette.mono,
      primary: palette.mono,
      transform: "translate(950 328) scale(1.65)",
    })}
    ${samples}
    ${renderLogo({
      accent: palette.white,
      primary: palette.white,
      transform: "translate(64 616) scale(2.25)",
    })}
    ${renderMark({
      accent: palette.white,
      primary: palette.white,
      transform: "translate(960 626) scale(2.5)",
    })}`;
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

const fontBuffer = await readFile(wordmarkFontPath);
const fontArrayBuffer = fontBuffer.buffer.slice(
  fontBuffer.byteOffset,
  fontBuffer.byteOffset + fontBuffer.byteLength,
);
const wordmarkFont = opentype.parse(fontArrayBuffer);
const opticalSpacing = {
  saltToAmpersand: -2,
  ampersandToPeps: -1.5,
};
const pathDataOptions = {
  decimalPlaces: 2,
  flipY: false,
  optimize: true,
};

function outlineGlyphRun(text, originX) {
  const characters = [...text];
  const fontScale = wordmarkFontSize / wordmarkFont.unitsPerEm;
  const pathData = [];
  let cursorX = originX;

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    pathData.push(
      wordmarkFont
        .getPath(character, cursorX, wordmarkBaseline, wordmarkFontSize, {
          kerning: true,
        })
        .toPathData(pathDataOptions),
    );
    cursorX += wordmarkFont.getAdvanceWidth(character, wordmarkFontSize, {
      kerning: true,
    });

    const nextCharacter = characters[index + 1];
    if (nextCharacter) {
      cursorX +=
        wordmarkFont.getKerningValue(
          wordmarkFont.charToGlyph(character),
          wordmarkFont.charToGlyph(nextCharacter),
        ) * fontScale;
    }
  }

  return {
    advanceWidth: cursorX - originX,
    pathData: pathData.join(" "),
  };
}

const saltRun = outlineGlyphRun("SALT", 0);
const ampersandOrigin = saltRun.advanceWidth + opticalSpacing.saltToAmpersand;
const ampersandRun = outlineGlyphRun("&", ampersandOrigin);
const pepsOrigin =
  ampersandOrigin + ampersandRun.advanceWidth + opticalSpacing.ampersandToPeps;
const pepsRun = outlineGlyphRun("PEPS", pepsOrigin);
const wordmarkNaturalWidth = pepsOrigin + pepsRun.advanceWidth;
const wordmarkScaleX = Number(
  Math.min(1, wordmarkAvailableWidth / wordmarkNaturalWidth).toFixed(4),
);
const wordmarkPathData = {
  salt: saltRun.pathData,
  ampersand: ampersandRun.pathData,
  peps: pepsRun.pathData,
};

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
    body: renderMark({
      primary: palette.white,
      accent: palette.white,
      small: true,
    }),
    description:
      "The simplified white SALT and PEPS peptide-bond ampersand for small sizes on dark backgrounds.",
    fileName: "salt-peps-icon-reverse-small.svg",
    title: "SALT&PEPS reverse small icon",
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
  {
    body: renderLogo({
      accent: palette.accent,
      iconPrimary: palette.navy,
      primary: palette.mono,
    }),
    description:
      "The SALT and PEPS peptide icon paired with an outlined uppercase wordmark.",
    fileName: "salt-peps-logo.svg",
    title: "SALT&PEPS logo",
    viewBox: "0 0 360 80",
  },
  {
    body: renderLogo({ accent: palette.white, primary: palette.white }),
    description:
      "The white SALT and PEPS peptide icon and outlined wordmark for dark backgrounds.",
    fileName: "salt-peps-logo-reverse.svg",
    title: "SALT&PEPS reverse logo",
    viewBox: "0 0 360 80",
  },
  {
    body: renderLogo({ accent: palette.mono, primary: palette.mono }),
    description:
      "The single-color SALT and PEPS peptide icon and outlined wordmark.",
    fileName: "salt-peps-logo-mono.svg",
    title: "SALT&PEPS monochrome logo",
    viewBox: "0 0 360 80",
  },
  {
    body: renderProof(),
    description:
      "A proof sheet of primary, monochrome, reverse, icon, and responsive SALT and PEPS logo variants.",
    fileName: "salt-peps-logo-proof.svg",
    title: "SALT&PEPS logo proof sheet",
    viewBox: "0 0 1200 900",
  },
];

await mkdir(brandDirectory, { recursive: true });
await Promise.all(
  assets.map((asset) =>
    serializeSvg(svgDocument(asset), resolve(brandDirectory, asset.fileName)),
  ),
);

const rasterAssets = [
  ["salt-peps-icon-small.svg", "salt-peps-icon-16.png", 16],
  ["salt-peps-icon.svg", "salt-peps-icon-32.png", 32],
  ["salt-peps-icon.svg", "salt-peps-icon-48.png", 48],
  ["salt-peps-social.svg", "salt-peps-social-180.png", 180],
  ["salt-peps-social.svg", "salt-peps-social-512.png", 512],
  [
    "salt-peps-social.svg",
    "salt-peps-apple-touch-180.png",
    180,
    palette.social,
  ],
  ["salt-peps-logo.svg", "salt-peps-logo-1440.png", 1440],
];

await Promise.all(
  rasterAssets.map(async ([sourceName, outputName, width, background]) => {
    const source = await readFile(resolve(brandDirectory, sourceName));
    const png = new Resvg(source, {
      fitTo: { mode: "width", value: width },
      ...(background ? { background } : {}),
    })
      .render()
      .asPng();

    await writeFile(resolve(brandDirectory, outputName), png);
  }),
);

console.log(
  `Generated ${assets.length} SVG and ${rasterAssets.length} PNG SALT&PEPS assets.`,
);
