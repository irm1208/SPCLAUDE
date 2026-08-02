import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const contentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(contentDir, "../../../..");
const fontFile = resolve(projectRoot, "scripts/logo/inter-latin-800-normal.woff");
const buffer = await readFile(fontFile);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const size = 116;
const baseline = 136;
const characters = ["S", "&", "P"];
let cursor = 0;
const paths = [];

for (const character of characters) {
  const glyph = font.charToGlyph(character);
  paths.push({
    character,
    pathData: glyph.getPath(cursor, baseline, size, { kerning: true }).toPathData({ decimalPlaces: 2, flipY: false, optimize: true }),
    x: cursor,
  });
  cursor += font.getAdvanceWidth(character, size, { kerning: true });
}

const group = ({ primary, accent, transform = "" , mode = "type" }) => {
  const body = paths.map(({ character, pathData, x }) => {
    let attrs = `d="${pathData}" fill="${character === "&" ? accent : primary}"`;
    if (mode === "interlock" && character === "P") attrs += ` transform="translate(-18 0)"`;
    if (mode === "interlock" && character === "&") attrs += ` transform="translate(-6 -8) scale(.86)"`;
    if (mode === "stacked") {
      if (character === "S") attrs += ` transform="translate(42 -22) scale(.72)"`;
      if (character === "&") attrs += ` transform="translate(88 6) scale(.52)"`;
      if (character === "P") attrs += ` transform="translate(125 68) scale(.72)"`;
    }
    return `<path ${attrs}/>`;
  }).join("");
  return `<g${transform ? ` transform="${transform}"` : ""}>${body}</g>`;
};

const tile = ({ body, background = "#F8FAFC", viewBox = "0 0 240 240" }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="S&amp;P monogram">${background ? `<rect width="100%" height="100%" rx="28" fill="${background}"/>` : ""}${body}</svg>`;

const variants = {
  // The raw glyph run is horizontal; these transforms center each construction
  // inside the square after its variant-specific internal transforms are applied.
  type: tile({ body: group({ primary: "#0F1F38", accent: "#2D6BCC", transform: "translate(20 40) scale(.84)" }) }),
  interlock: tile({ body: group({ primary: "#FFFFFF", accent: "#2D6BCC", transform: "translate(30 47) scale(.84)", mode: "interlock" }), background: "#1B3164" }),
  stacked: tile({ body: group({ primary: "#0F1F38", accent: "#2D6BCC", transform: "translate(-14 48) scale(.8)", mode: "stacked" }) }),
};

const faviconSamples = (variant) => [16, 24, 32].map((sizePx) => `<div class="size-sample"><span>${sizePx}px</span><div class="size-tile" style="width:${sizePx}px;height:${sizePx}px">${variants[variant].replace('viewBox="0 0 240 240"', 'viewBox="0 0 240 240"')}</div></div>`).join("");

const card = (id, title, subtitle, description) => `
  <article class="monogram-card" data-choice="${id}" onclick="toggleSelect(this)">
    <div class="card-head"><h3>${title}</h3><p>${subtitle}</p></div>
    <div class="card-body">
      <div class="hero-mark">${variants[id]}</div>
      <div class="card-detail"><p>${description}</p><div class="size-row">${faviconSamples(id)}</div></div>
    </div>
  </article>`;

const html = `
<style>
  .monogram-head { margin-bottom: 24px; }
  .monogram-head h2 { margin-bottom: 10px; }
  .monogram-head .subtitle { max-width: 780px; }
  .monogram-list { display: grid; gap: 18px; }
  .monogram-card { overflow: hidden; border: 1px solid #d5dee8; border-radius: 10px; background: #fff; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
  .monogram-card:hover { transform: translateY(-2px); border-color: #2d6bcc; box-shadow: 0 14px 30px rgba(15,31,56,.11); }
  .monogram-card.selected { border-color: #2d6bcc; box-shadow: 0 0 0 3px rgba(45,107,204,.15), 0 14px 30px rgba(15,31,56,.11); }
  .card-head { display: flex; justify-content: space-between; gap: 18px; align-items: baseline; padding: 15px 18px 13px; border-bottom: 1px solid #e3eaf1; }
  .card-head h3 { margin: 0; color: #0f1f38; font: 800 16px/1.2 Inter, system-ui, sans-serif; }
  .card-head p { margin: 0; color: #718096; font: 600 11px/1.4 Inter, system-ui, sans-serif; text-align: right; }
  .card-body { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 22px; padding: 20px; }
  .hero-mark { width: 240px; height: 240px; }
  .hero-mark svg { display: block; width: 100%; height: 100%; }
  .card-detail { display: flex; flex-direction: column; justify-content: center; }
  .card-detail p { margin: 0; max-width: 560px; color: #5c6877; font: 500 12px/1.55 Inter, system-ui, sans-serif; }
  .size-row { display: flex; align-items: end; gap: 21px; margin-top: 24px; min-height: 62px; }
  .size-sample { display: flex; align-items: center; gap: 7px; color: #718096; font: 700 10px/1 Inter, system-ui, sans-serif; }
  .size-tile { overflow: hidden; border-radius: 3px; background: #1b3164; }
  .size-tile svg { display: block; width: 100%; height: 100%; }
  .decision-note { margin-top: 24px; padding: 16px 18px; border-left: 3px solid #2d6bcc; background: #f7f9fc; }
  .decision-note strong { color: #0f1f38; font: 800 12px/1 Inter, system-ui, sans-serif; }
  .decision-note p { margin: 8px 0 0; color: #5c6877; font: 500 12px/1.5 Inter, system-ui, sans-serif; }
  @media (max-width: 720px) { .card-body { grid-template-columns: 1fr; } .card-head { display: block; } .card-head p { margin-top: 5px; text-align: left; } }
</style>

<div class="monogram-head">
  <h2>S&amp;P monogram studies</h2>
  <p class="subtitle">These are outlined vector constructions for the standalone icon and favicon. All three use the same S, ampersand, and P geometry family; the difference is how tightly they lock together at small sizes.</p>
</div>

<div class="monogram-list" data-multiselect>
  ${card("type", "01 / Type-derived", "clean wordmark DNA", "The most literal extension of the approved Salt&Peps wordmark. It keeps the initials readable and lets the ampersand carry the blue accent without adding a container or symbol.")}
  ${card("interlock", "02 / Interlocked", "compact square mark", "The P moves into the S and the ampersand sits inside the shared mass. This is the strongest candidate for a social avatar if the counters remain open at 24px.")}
  ${card("stacked", "03 / Stacked", "favicon-first fallback", "A vertical lockup designed around the square rather than the horizontal wordmark. It is the most legible at 16px, but it carries more monogram character and less full-name recognition.")}
</div>

<div class="decision-note"><strong>Next decision</strong><p>Select one monogram construction, or tell me to refine the S, ampersand, or P before I turn it into production icon.svg, favicon.svg, reverse, mono, and social variants.</p></div>
`;

await writeFile(resolve(contentDir, "sp-monogram-studies-v1.html"), html, "utf8");
