import { expect, it } from "vitest";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import { cropToPdfBox, composeLabelPdf, royalMailSources, detectLabelCrop, labelFilename, sourcePdfBytes } from "./royal-mail-labels";

it("finds Royal Mail PDFs only, deduplicates legacy/keyed duplicates within an order and leaves other carriers alone", () => {
  const pdf = "data:application/pdf;base64,JVBERi0x";
  expect(royalMailSources({ royalMailQrCode: pdf, qrCodes: { "royal-mail": pdf, inpost: pdf } })).toEqual([pdf]);
  expect(royalMailSources({ qrCodes: { "royal-mail": pdf } })).toEqual([pdf]);
  expect(royalMailSources({ royalMailQrCode: "data:image/png;base64,aaaa", qrCodes: { inpost: pdf } })).toEqual([]);
});

it("maps crop coordinates correctly with rotations and nonzero page origins", () => {
  const crop = { x: .1, y: .2, width: .3, height: .4 };
  const expected = [
    { left: 70, bottom: 340, right: 250, top: 660 }, { left: 130, bottom: 100, right: 370, top: 340 },
    { left: 370, bottom: 180, right: 550, top: 500 }, { left: 250, bottom: 500, right: 490, top: 740 },
  ];
  for (let i = 0; i < 4; i++) for (const key of ["left", "bottom", "right", "top"] as const) {
    expect(cropToPdfBox(crop, [10, 20, 610, 820], i * 90)[key]).toBeCloseTo(expected[i][key], 8);
  }
  expect(() => cropToPdfBox({ ...crop, width: 2 }, [0, 0, 100, 100], 0)).toThrow();
});

it("automatically keeps label-sized pages, suggests supported larger label crops, and flags ambiguous layouts/instructions", () => {
  const bounds = { x: .1, y: .1, width: .4, height: .42 };
  expect(detectLabelCrop(288, 432, "", null).confirmed).toBe(true);
  expect(detectLabelCrop(595, 842, "Royal Mail Tracked 24 Postage Cost Click & Drop", bounds).confirmed).toBe(true);
  expect(detectLabelCrop(595, 842, "Royal Mail Invoice Instructions", bounds).confirmed).toBe(false);
  expect(detectLabelCrop(595, 842, "", null).confirmed).toBe(false);
  expect(detectLabelCrop(595, 842, "Royal Mail Tracked", { x: 0, y: 0, width: 1, height: 1 }).confirmed).toBe(false);
});

it("writes vector-preserving exact 4×6 pages for original, cropped, rotated and multipage source PDFs", async () => {
  const doc = await PDFDocument.create();
  const original = doc.addPage([288, 432]);
  original.drawText("Royal Mail label one", { x: 15, y: 350, size: 12 });
  const a4 = doc.addPage([595, 842]);
  a4.setCropBox(10, 20, 570, 800);
  a4.drawRectangle({ x: 80, y: 250, width: 200, height: 300, borderWidth: 1, borderColor: rgb(0, 0, 0) });
  a4.drawText("Royal Mail label two", { x: 90, y: 490, size: 10 });
  const rotated = doc.addPage([432, 288]); rotated.setRotation(degrees(90));
  rotated.drawText("Royal Mail label three", { x: 40, y: 150, size: 12 });
  const output = await composeLabelPdf([{ id: "one", bytes: await doc.save(), labels: [
    { pageIndex: 0, crop: { x: 0, y: 0, width: 1, height: 1 }, viewBox: [0, 0, 288, 432], rotation: 0 },
    { pageIndex: 1, crop: { x: 70 / 570, y: 270 / 800, width: 200 / 570, height: 300 / 800 }, viewBox: [10, 20, 580, 820], rotation: 0 },
    { pageIndex: 2, crop: { x: 0, y: 0, width: 1, height: 1 }, viewBox: [0, 0, 432, 288], rotation: 90 },
  ] }], new AbortController().signal);
  const saved = await PDFDocument.load(output);
  expect(saved.getPageCount()).toBe(3);
  for (const page of saved.getPages()) expect(page.getSize()).toEqual({ width: 288, height: 432 });
  expect(saved.getPages()[0].node.Resources()?.toString()).toContain("XObject");
});

it("rejects corrupt input and cancellation rather than producing an unnoticed partial download", async () => {
  const controller = new AbortController(); controller.abort();
  await expect(composeLabelPdf([], controller.signal)).rejects.toThrow();
  await expect(composeLabelPdf([{ id: "broken", bytes: new Uint8Array([1, 2]), labels: [
    { pageIndex: 0, crop: { x: 0, y: 0, width: 1, height: 1 }, viewBox: [0, 0, 288, 432], rotation: 0 },
  ] }], new AbortController().signal)).rejects.toThrow(/broken/);
  expect(labelFilename("HGH / GB", "GB-UAJBM / 001")).toBe("HGH-GB-GB-UAJBM-001-royal-mail-4x6.pdf");
});

it("rejects PDFs carrying encryption rather than bypassing password protection", async () => {
  const doc = await PDFDocument.create(); doc.addPage([288, 432]);
  // The reader must refuse an encryption trailer, not attempt ignoreEncryption.
  doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: "Standard", V: 4, R: 4 }));
  await expect(composeLabelPdf([{ id: "protected upload", bytes: await doc.save(), labels: [
    { pageIndex: 0, crop: { x: 0, y: 0, width: 1, height: 1 }, viewBox: [0, 0, 288, 432], rotation: 0 },
  ] }], new AbortController().signal)).rejects.toThrow(/encrypted/);
});

it("decodes encoded PDF sources without FileReader, and cancels before loading source data", async () => {
  const bytes = await sourcePdfBytes("data:application/pdf,%25PDF-1.7%0Asynthetic", new AbortController().signal);
  expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7\nsynthetic");
  const controller = new AbortController(); controller.abort();
  await expect(sourcePdfBytes("data:application/pdf,unused", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
});
