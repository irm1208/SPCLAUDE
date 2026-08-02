import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const contentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(contentDir, "../../../..");
const fontPath = resolve(projectRoot, "scripts/logo/inter-latin-800-normal.woff");
const fontBuffer = await readFile(fontPath);
const fontArrayBuffer = fontBuffer.buffer.slice(
  fontBuffer.byteOffset,
  fontBuffer.byteOffset + fontBuffer.byteLength,
);
const font = opentype.parse(fontArrayBuffer);
const fontSize = 96;
const baseline = 118;
const text = "Salt&Peps";
const paths = [];
let cursor = 12;

for (const character of [...text]) {
  const pathData = font
    .charToGlyph(character)
    .getPath(cursor, baseline, fontSize, { kerning: true })
    .toPathData({ decimalPlaces: 2, flipY: false, optimize: true });
  paths.push({ character, pathData });
  cursor += font.getAdvanceWidth(character, fontSize, { kerning: true });
}

const naturalWidth = Math.ceil(cursor + 12);
const wordmark = ({ primary, accent, transform = "" }) => {
  const body = paths
    .map(
      ({ character, pathData }) =>
        `<path d="${pathData}" fill="${character === "&" ? accent : primary}"/>`,
    )
    .join("");
  return `<g${transform ? ` transform="${transform}"` : ""}>${body}</g>`;
};

const svg = ({ body, background, viewBox = `0 0 ${naturalWidth} 150` }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Salt&amp;Peps wordmark">${background ? `<rect width="100%" height="100%" fill="${background}"/>` : ""}${body}</svg>`;

const primary = svg({
  background: "#F8FAFC",
  body: wordmark({ primary: "#0F1F38", accent: "#2D6BCC" }),
});
const reverse = svg({
  background: "#1B3164",
  body: wordmark({ primary: "#FFFFFF", accent: "#FFFFFF" }),
});
const mono = svg({
  background: "#FFFFFF",
  body: wordmark({ primary: "#0F1F38", accent: "#0F1F38" }),
});

const html = `
<style>
  .proposal-head { margin-bottom: 24px; }
  .proposal-head h2 { margin-bottom: 10px; }
  .proposal-head .subtitle { max-width: 760px; }
  .proposal-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 18px; }
  .proposal-panel { border: 1px solid #d5dee8; border-radius: 10px; overflow: hidden; background: #fff; }
  .panel-title { padding: 14px 16px; border-bottom: 1px solid #e3eaf1; color: #0f1f38; font: 800 14px/1 Inter, system-ui, sans-serif; }
  .primary-stage { padding: 42px 30px 34px; background: #f8fafc; }
  .primary-stage svg { display: block; width: 100%; height: auto; }
  .stage-note { margin: 18px 0 0; color: #5c6877; font: 500 12px/1.5 Inter, system-ui, sans-serif; }
  .stage-note strong { color: #0f1f38; font-weight: 800; }
  .samples { display: grid; gap: 1px; background: #dfe6ee; }
  .sample { padding: 20px 18px; }
  .sample-label { margin-bottom: 14px; color: #718096; font: 800 10px/1 Inter, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
  .sample svg { display: block; width: 100%; height: auto; }
  .sample-dark { background: #1b3164; }
  .sample-light { background: #fff; }
  .specs { margin-top: 18px; padding: 17px 19px; border-left: 3px solid #2d6bcc; background: #f7f9fc; }
  .specs strong { color: #0f1f38; font: 800 12px/1 Inter, system-ui, sans-serif; }
  .specs p { margin: 8px 0 0; color: #5c6877; font: 500 12px/1.5 Inter, system-ui, sans-serif; }
  @media (max-width: 780px) { .proposal-grid { grid-template-columns: 1fr; } }
</style>

<div class="proposal-head">
  <h2>Salt&amp;Peps wordmark proposal</h2>
  <p class="subtitle">A path-based typographic construction using the confirmed title case. This is the first real wordmark pass: no icon, no badge, no decorative stroke, and no live-font dependency.</p>
</div>

<div class="proposal-grid">
  <section class="proposal-panel">
    <div class="panel-title">Primary wordmark / light surface</div>
    <div class="primary-stage">
      ${primary}
      <p class="stage-note"><strong>Construction:</strong> heavy geometric sans, controlled spacing around the ampersand, and one restrained blue accent on the connector character. The next refinement would custom-draw the S, a, P, and ampersand rather than changing the architecture.</p>
    </div>
  </section>
  <section class="proposal-panel">
    <div class="panel-title">Required proof contexts</div>
    <div class="samples">
      <div class="sample sample-dark"><div class="sample-label">Reverse</div>${reverse}</div>
      <div class="sample sample-light"><div class="sample-label">Monochrome</div>${mono}</div>
    </div>
  </section>
</div>

<div class="specs"><strong>Decision point</strong><p>Judge the actual wordmark shape and the title-case rhythm first. If this construction is closer, I will custom-redraw the letterforms and then derive the reverse, mono, favicon, and icon fallback from the same geometry. No production files have been changed.</p></div>
`;

await writeFile(resolve(contentDir, "salt-peps-wordmark-proposal-v1.html"), html, "utf8");
