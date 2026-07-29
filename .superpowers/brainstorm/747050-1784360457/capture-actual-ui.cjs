const { chromium } = require("/home/amoney/.npm/_npx/705bc6b22212b352/node_modules/playwright");

const screenshotPath = "/home/amoney/UpdateSP/.superpowers/brainstorm/747050-1784360457/content/actual-organizer-v2-basics.png";
const executablePath = "/home/amoney/.cache/ms-playwright/chromium_headless_shell-1228/chrome-linux/headless_shell";

(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem("v2:organiserMode", "setup");
    localStorage.removeItem("v2:selectedGroupBuyId");
  });

  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/account/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          telegramUsername: "tutorial_organiser",
          accountStatus: "active",
          organiserStatus: "approved",
          country: "United Kingdom",
        }),
      });
      return;
    }
    if (pathname === "/api/organiser/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          telegramUsername: "tutorial_organiser",
          email: null,
          organiserStatus: "approved",
        }),
      });
      return;
    }
    if (pathname === "/api/organiser/group-buys") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("http://127.0.0.1:3002/gborganiser-v2", { waitUntil: "domcontentloaded" });
  await page.locator(".ov2-setup-page").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#ov2-step-title").filter({ hasText: "Basics" }).waitFor({ state: "visible" });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(JSON.stringify({ screenshotPath, title: await page.title(), url: page.url() }));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
