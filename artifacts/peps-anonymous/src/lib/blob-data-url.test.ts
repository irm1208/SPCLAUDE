import assert from "node:assert/strict";
import test from "node:test";
import { blobToDataUrl } from "./blob-data-url.ts";

test("reads PDF bytes without FileReader (Safari Lockdown Mode)", async () => {
  assert.equal(typeof globalThis.FileReader, "undefined");
  const file = new Blob(["%PDF-1.7\nexample"], { type: "application/pdf" });
  assert.equal(await blobToDataUrl(file), `data:application/pdf;base64,${Buffer.from("%PDF-1.7\nexample").toString("base64")}`);
});

test("preserves large binary images without truncating or corrupting bytes", async () => {
  const bytes = Uint8Array.from({ length: 100_001 }, (_, i) => i % 256);
  const file = new Blob([bytes], { type: "image/png" });
  assert.equal(await blobToDataUrl(file), `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
});

test("supports browsers without Blob.arrayBuffer", async () => {
  const file = new Blob(["label"], { type: "image/jpeg" });
  Object.defineProperty(file, "arrayBuffer", { value: undefined });
  assert.equal(await blobToDataUrl(file), "data:image/jpeg;base64,bGFiZWw=");
});

test("reports unreadable files instead of producing a corrupt preview", async () => {
  const file = new Blob(["label"]);
  Object.defineProperty(file, "arrayBuffer", { value: async () => { throw new Error("Cannot read file"); } });
  await assert.rejects(blobToDataUrl(file), /Cannot read file/);
});
