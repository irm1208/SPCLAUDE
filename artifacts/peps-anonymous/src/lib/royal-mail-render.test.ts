import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import { composeLabelPdf, type Crop } from "./royal-mail-labels";
const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const canvasLib = createRequire(join(pdfjsRoot, "package.json"))("@napi-rs/canvas");
for (const key of ["DOMMatrix", "ImageData", "Path2D"]) Object.defineProperty(globalThis, key, { configurable: true, value: canvasLib[key] });

it("renders every crop/rotation without cutting label corner marks or retaining unrelated page content", async () => {
  const source = await PDFDocument.create();
  const crops: Crop[] = [
    { x: 70 / 570, y: 270 / 800, width: 200 / 570, height: 300 / 800 },
    { x: 230 / 800, y: 70 / 570, width: 300 / 800, height: 200 / 570 },
    { x: 300 / 570, y: 230 / 800, width: 200 / 570, height: 300 / 800 },
    { x: 270 / 800, y: 300 / 570, width: 300 / 800, height: 200 / 570 },
  ];
  for (let r = 0; r < 4; r++) {
    const page = source.addPage([595, 842]); page.setCropBox(10, 20, 570, 800); page.setRotation(degrees(r * 90));
    page.drawRectangle({ x: 400, y: 80, width: 100, height: 100, color: rgb(1, 0, 0) }); // Must not survive cropping.
    for (const [x, y, color] of [
      [82, 252, rgb(1, 0, 0)], [268, 252, rgb(0, 1, 0)], [82, 538, rgb(0, 0, 1)], [268, 538, rgb(1, 0, 1)],
    ] as const) page.drawRectangle({ x, y, width: 10, height: 10, color });
    for (let bar = 0; bar < 30; bar++) page.drawRectangle({ x: 100 + bar * 4, y: 350, width: bar % 2 ? 1 : 2, height: 45, color: rgb(0, 0, 0) });
    page.drawText("Synthetic recipient - TEST ONLY", { x: 95, y: 450, size: 8 });
  }
  const output = await composeLabelPdf([{ id: "synthetic", bytes: await source.save(), labels: crops.map((crop, pageIndex) => ({
    pageIndex, crop, viewBox: [10, 20, 580, 820], rotation: pageIndex * 90,
  })) }], new AbortController().signal);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: output, standardFontDataUrl: join(pdfjsRoot, "standard_fonts/"), isEvalSupported: false }).promise;
  try {
    for (let index = 1; index <= 4; index++) {
      const page = await pdf.getPage(index), viewport = page.getViewport({ scale: 1 });
      const canvas = canvasLib.createCanvas(viewport.width, viewport.height), ctx = canvas.getContext("2d");
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const counts = { red: 0, green: 0, blue: 0, purple: 0, black: 0 };
      for (let p = 0; p < data.length; p += 4) {
        const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
        if (r > 220 && g < 30 && b < 30) counts.red++;
        if (g > 220 && r < 30 && b < 30) counts.green++;
        if (b > 220 && r < 30 && g < 30) counts.blue++;
        if (r > 220 && b > 220 && g < 30) counts.purple++;
        if (r < 30 && g < 30 && b < 30) counts.black++;
      }
      for (const color of ["red", "green", "blue", "purple"] as const) {
        expect(counts[color], `${color} corner, rotation ${index}`).toBeGreaterThan(150);
        expect(counts[color], `outside content, rotation ${index}`).toBeLessThan(250);
      }
      expect(counts.black).toBeGreaterThan(2000);
      page.cleanup();
    }
  } finally { await pdf.destroy(); }
}, 30000);
