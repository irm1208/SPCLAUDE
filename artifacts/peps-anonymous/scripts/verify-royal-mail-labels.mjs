// Optional browser regression check against a running Vite preview. All API data
// is synthetic and intercepted in this browser; no app authentication is bypassed.
// Run: node artifacts/peps-anonymous/scripts/verify-royal-mail-labels.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PDFDocument, rgb } from "pdf-lib";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch {
  const store = join(root, "node_modules/.pnpm");
  const dependency = readdirSync(store).find(name => /^playwright@\d/.test(name));
  if (!dependency) throw new Error("This optional browser check needs a workspace Playwright installation.");
  ({ chromium } = require(join(store, dependency, "node_modules/playwright")));
}
const source = await PDFDocument.create();
function label(page, x, y, width, height) {
  page.drawRectangle({ x, y, width, height, borderWidth: 1, borderColor: rgb(0, 0, 0) });
  page.drawText("Royal Mail Tracked 24", { x: x + 10, y: y + height - 25, size: 11 });
  for (let i = 0; i < 30; i++) page.drawRectangle({ x: x + 15 + i * 4, y: y + height - 100, width: i % 2 ? 1 : 2, height: 45 });
  page.drawText("TEST RECIPIENT - NOT VALID POSTAGE", { x: x + 10, y: y + height - 130, size: 7 });
  page.drawText("Postage Cost - Paid", { x: x + 10, y: y + 35, size: 10 });
  page.drawText("Click & Drop", { x: x + 10, y: y + 15, size: 10 });
}
label(source.addPage([595, 842]), 30, 420, 240, 360);
label(source.addPage([288, 432]), 8, 8, 272, 416);
source.addPage([595, 842]).drawText("Instructions - Do not post this page", { x: 40, y: 780, size: 15 });
// Unfamiliar source sizes: suggested crops must be explicitly confirmed.
label(source.addPage([400, 600]), 10, 10, 380, 580);
label(source.addPage([400, 600]), 10, 10, 380, 580);
const upload = `data:application/pdf;base64,${Buffer.from(await source.save()).toString("base64")}`;
const base = process.env.LABEL_TEST_BASE_URL ?? "http://127.0.0.1:5000";
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ?? (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined);
const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, acceptDownloads: true });
  const errors = [], requests = [];
  page.on("pageerror", error => {
    // Localhost through the preview proxy cannot connect Vite's configured HMR
    // websocket. Ignore only that known dev-client error, never component errors.
    if (error.message === "WebSocket closed without opened." && error.stack?.includes("/@vite/client")) return;
    errors.push(error.message);
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      requests.push({ path: url.pathname, method: route.request().method() });
      if (url.pathname === "/api/admin/group-buys/fixture/orders/one/qr-data") return route.fulfill({ json: { royalMailQrCode: upload, qrCodes: { "royal-mail": upload } } });
      return route.fulfill({ status: 404, json: { error: "No real API calls allowed in this synthetic test" } });
    }
    if (url.pathname === "/__royal_mail_test") return route.fulfill({ contentType: "text/html", body: `<!doctype html>
      <html><head><link rel="stylesheet" href="/src/index.css?direct"></head><body><div id="root"></div>
      <script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import("/node_modules/.vite/deps/react.js")).default;
      const ReactDOM = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
      const { RoyalMailLabelsExport } = await import("/src/components/royal-mail-labels/RoyalMailLabelsExport.tsx");
      ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(RoyalMailLabelsExport, {
        orders: [{id:"one",code:"10001",telegramUsername:"synthetic-recipient"}],
        gbId:"fixture",gbName:"Synthetic label test",batchName:"GB-TEST / 001",scopeDescription:"GB-TEST / 001 · Not Posted",
        mode:"admin",adminSecret:"synthetic-fixture-only",onClose:()=>{}
      }));
      </script></body></html>` });
    return route.continue();
  });
  await page.goto(`${base}/__royal_mail_test`);
  await page.getByText("5 labels included · 0 exclusions · 3 need attention").waitFor({ timeout: 60000 });
  assert.equal(await page.getByRole("button", { name: "Download combined 4×6 PDF (5)" }).isDisabled(), true);
  await page.getByLabel("Exclude this region").nth(2).check();
  await page.getByRole("button", { name: "Show preview", exact: true }).click();
  await page.getByRole("region", { name: "Current label" }).getByText("Label 3 of 4 · Page 4 · 2 awaiting confirmation").waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Confirm & next" && !button.disabled));
  assert.equal(await page.locator("canvas").count(), 1);
  const canvasSize = await page.locator("canvas").evaluate(element => [element.width, element.height]);
  assert.deepEqual(canvasSize, [576, 864]);
  await page.screenshot({ path: "/tmp/royal-mail-crop-review.png", fullPage: true });
  await page.setViewportSize({ width: 402, height: 874 });
  assert.equal(await page.locator("canvas").evaluate(element => getComputedStyle(element).objectFit), "contain");
  const fits = await page.locator("canvas").evaluate(element => {
    const canvas = element.getBoundingClientRect(), frame = element.parentElement.getBoundingClientRect();
    return canvas.top >= frame.top && canvas.bottom <= frame.bottom && canvas.width <= frame.width;
  });
  assert.equal(fits, true, "The complete label must fit inside its mobile preview frame");
  await page.screenshot({ path: "/tmp/royal-mail-review-mobile.png", fullPage: true });
  for (const locator of [page.getByRole("heading", { name: /#10001/ }), page.getByRole("button", { name: "Confirm & next" })]) {
    const bounds = await locator.boundingBox();
    assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 874, "Identity and confirm must stay on screen");
  }
  await page.getByRole("button", { name: "Confirm & next" }).click();
  await page.getByRole("region", { name: "Current label" }).getByText("Label 4 of 4 · Page 5 · 1 awaiting confirmation").waitFor();
  await page.getByRole("button", { name: "Confirm label" }).click();
  await page.getByText("4 labels included · 1 exclusions · 0 need attention").waitFor();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download combined 4×6 PDF (4)" }).click();
  const download = await downloaded;
  await download.saveAs("/tmp/royal-mail-browser-output.pdf");
  assert.match(download.suggestedFilename(), /GB-TEST-001-royal-mail-4x6\.pdf$/);
  const output = await PDFDocument.load(await readFile("/tmp/royal-mail-browser-output.pdf"));
  assert.equal(output.getPageCount(), 4);
  output.getPages().forEach(page => assert.deepEqual(page.getSize(), { width: 288, height: 432 }));
  assert.deepEqual(requests, [{ path: "/api/admin/group-buys/fixture/orders/one/qr-data", method: "GET" }]);
  assert.deepEqual(errors, []);
  console.log("Browser check passed: A4 crop detected, 4x6 kept, instructions explicitly excluded, identified 4x6 previews on desktop/mobile, confirm-and-next review, combined vector PDF downloaded; no writes.");
} finally { await browser.close(); }
