import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "/tmp/updatesp-tools.eSKmJJ/node_modules/playwright/index.mjs";
import jwt from "../artifacts/api-server/node_modules/jsonwebtoken/index.js";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.TUTORIAL_BASE_URL ?? "http://127.0.0.1:21504";
const orderId = "ebf36fa3-b7ae-4e50-8403-484d0eb1d493";
const outputDir = process.env.TUTORIAL_CAPTURE_DIR ?? "exports/group-buy-refund-customer-tutorial-assets";
const demoAccount = "@jordan_hayes";
const demoWallet = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
const jwtSecret = "dev-account-jwt-secret-change-in-prod-at-least-32-chars";

await mkdir(outputDir, { recursive: true });

const session = jwt.sign(
  { telegramUsername: "discord:740158353585471579", jti: randomUUID(), verificationRequired: false },
  jwtSecret,
  { expiresIn: "1h" },
);

function sanitizeAccount(value) {
  return {
    ...value,
    telegramUsername: demoAccount,
    discordUsername: null,
    credits: 42,
    country: "United Kingdom",
    accountStatus: "active",
  };
}

function sanitizeOrder(value, current = null) {
  return {
    ...value,
    code: "GB-2048",
    telegramUsername: demoAccount,
    grandTotal: 125,
    productSubtotal: 120,
    vendorShipping: 0,
    adminFee: 5,
    paymentTxHash: null,
    paymentTestAmount: null,
    testPaymentTxHash: null,
    shippingName: null,
    shippingEmail: null,
    shippingAddress: null,
    shippingPhone: null,
    shippingCountry: "United Kingdom",
    deliveryMethod: "UK - InPost",
    groupBuyId: "DEMO-GB",
    groupBuyPaymentsEnabled: true,
    groupBuyCryptoRefundsEnabled: true,
    canRequest: current === null,
    ineligibilityReasonCode: null,
    preferredAsset: "USDC",
    preferredNetwork: "Ethereum ERC-20",
    current,
    lineItems: [{
      ...(value.lineItems?.[0] ?? {}),
      productId: "demo-bpc-157",
      productName: "BPC-157 10mg",
      quantity: 1,
      unitPrice: 120,
      lineTotal: 120,
      isOos: false,
    }],
  };
}

function refundState(status) {
  const base = {
    id: "demo-refund-2048",
    method: "crypto",
    status,
    amountUsd: 125,
    asset: "USDC",
    network: "Ethereum ERC-20",
    destinationWallet: demoWallet,
    outgoingTxid: null,
    explorerUrl: null,
    verificationErrorCode: null,
    verificationErrorMessage: null,
    requestedAt: "2026-09-14T12:00:00.000Z",
  };
  if (status === "verification_failed") {
    return { ...base, verificationErrorCode: "INVALID_ADDRESS", verificationErrorMessage: "The wallet address could not be verified on the Ethereum network." };
  }
  if (status === "completed") {
    return { ...base, outgoingTxid: "0x8a92...f31a", explorerUrl: "https://etherscan.io/tx/0x8a92demo" };
  }
  return base;
}

async function configurePage(page, current = null) {
  await page.route("**/api/account/me", async route => {
    const response = await route.fetch();
    const value = await response.json();
    await route.fulfill({ response, json: sanitizeAccount(value) });
  });
  await page.route("**/api/account/orders", async route => {
    const response = await route.fetch();
    const value = await response.json();
    const order = Array.isArray(value) && value[0] ? sanitizeOrder(value[0], null) : sanitizeOrder({}, null);
    await route.fulfill({ response, json: [order] });
  });
  await page.route(`**/api/account/orders/${orderId}`, async route => {
    const response = await route.fetch();
    const value = await response.json();
    await route.fulfill({ response, json: sanitizeOrder(value, current) });
  });
  await page.route(`**/api/account/orders/${orderId}/refund`, async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ canRequest: false, preferredAsset: "USDC", preferredNetwork: "Ethereum ERC-20", current: refundState("requested") }),
    });
  });
}

async function newPage(browser, current = null) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await context.addCookies([{ name: "account_session", value: session, url: baseUrl, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  await configurePage(page, current);
  return { context, page };
}

async function addClickPointer(page, selector) {
  await page.evaluate((targetSelector) => {
    document.querySelectorAll(".tutorial-click-pointer").forEach(node => node.remove());
    const textMatch = targetSelector.match(/^(.*):has-text\("(.+)"\)$/i);
    const target = textMatch
      ? [...document.querySelectorAll(textMatch[1])].find(node => node.textContent?.trim().includes(textMatch[2]))
      : document.querySelector(targetSelector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const pointer = document.createElement("div");
    pointer.className = "tutorial-click-pointer";
    pointer.style.cssText = `position:fixed;left:${rect.left + rect.width / 2 - 2}px;top:${rect.top + rect.height / 2 - 2}px;width:0;height:0;z-index:2147483647;pointer-events:none`;
    pointer.innerHTML = `
      <span style="position:absolute;left:-13px;top:-13px;width:28px;height:28px;border:3px solid #ef4444;border-radius:999px;box-shadow:0 0 0 4px rgba(239,68,68,.2),0 2px 8px rgba(0,0,0,.3)"></span>
      <span style="position:absolute;left:8px;top:8px;width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:30px solid #111827;transform:rotate(-42deg);filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"></span>
      <span style="position:absolute;left:24px;top:-32px;background:#ef4444;color:white;border-radius:999px;padding:3px 8px;font:700 12px/1.1 Arial,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">Click here</span>`;
    document.body.appendChild(pointer);
  }, selector);
}

async function save(page, name, pointerSelector) {
  if (pointerSelector) await addClickPointer(page, pointerSelector);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${outputDir}/${name}.png`, animations: "disabled" });
}

const browser = await chromium.launch({ headless: true });

{
  const { context, page } = await newPage(browser);
  await page.goto(`${baseUrl}/account?s=orders`, { waitUntil: "networkidle" });
  await save(page, "01-orders", 'button:has-text("Manage")');
  await context.close();
}

{
  const { context, page } = await newPage(browser);
  await page.goto(`${baseUrl}/account/orders/${orderId}`, { waitUntil: "networkidle" });
  await page.getByText("Need a refund?", { exact: true }).scrollIntoViewIfNeeded();
  await save(page, "02-refund-action", 'button:has-text("I want a refund")');
  await page.getByRole("button", { name: "I want a refund" }).click();
  await save(page, "03-credit-method", 'label:has-text("Refund to account credits")');
  await page.getByText("Refund in crypto", { exact: true }).click();
  await page.locator('input[placeholder="0x…"]').fill(demoWallet);
  await save(page, "04-crypto-method", 'input[placeholder="0x…"]');
  await context.close();
}

for (const status of ["requested", "verifying", "verification_failed", "completed"]) {
  const { context, page } = await newPage(browser, refundState(status));
  await page.goto(`${baseUrl}/account/orders/${orderId}`, { waitUntil: "networkidle" });
  await page.getByText("Refund", { exact: false }).last().scrollIntoViewIfNeeded();
  await save(page, `05-status-${status}`, '.rounded-lg:has-text("Refund")');
  await context.close();
}

await browser.close();
await writeFile(`${outputDir}/manifest.json`, JSON.stringify({ baseUrl, orderId, demoAccount, files: [
  "01-orders.png", "02-refund-action.png", "03-credit-method.png", "04-crypto-method.png",
  "05-status-requested.png", "05-status-verifying.png", "05-status-verification_failed.png", "05-status-completed.png",
] }, null, 2));
console.log(JSON.stringify({ outputDir, demoAccount }));
