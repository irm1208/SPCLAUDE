import { afterAll, beforeAll, describe, it } from "vitest";
import { chromium, expect, type Browser, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import pg from "pg";

// Explicit opt-in; only the development preview is allowed.
describe.runIf(process.env.TMD_BROWSER_TESTS === "1")("Testmedaddy real-browser core workflow", () => {
  const suffix = randomBytes(6).toString("hex");
  const handles = [`tmdbrowserowner_${suffix}`, `tmdbrowsermember_${suffix}`];
  const emails = handles.map(handle => `${handle}@example.invalid`);
  const password = "Synthetic-browser-test-password-123!";
  const title = `Temporary browser test ${suffix}`;
  let browser: Browser;
  const base = `https://${process.env.REPLIT_DEV_DOMAIN}/testmedaddy`;
  beforeAll(async () => {
    if (!process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev")) throw new Error("Browser test requires the development domain.");
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? "/repl/tools/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  });
  afterAll(async () => {
    if (browser) await browser.close();
    if (!process.env.DATABASE_URL) return;
    const database = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const client = await database.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM tmd_members WHERE user_id IN (SELECT id FROM tmd_users WHERE email=ANY($1::text[]))", [emails]);
      await client.query("DELETE FROM tmd_pools WHERE organiser_id IN (SELECT id FROM tmd_users WHERE email=ANY($1::text[]))", [emails]);
      await client.query("DELETE FROM tmd_users WHERE email=ANY($1::text[])", [emails]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); await database.end(); }
  });
  async function signup(page: Page, index: number) {
    await page.goto(`${base}/signup`);
    await page.getByLabel("Email", { exact: true }).fill(emails[index]);
    await page.getByLabel("Handle", { exact: true }).fill(handles[index]);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.locator("form").getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your dashboard" })).toBeVisible();
  }
  it("signs up, persists sessions, creates/edits/publishes, signs in and joins/leaves through the real UI", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const owner = await context.newPage();
    owner.setDefaultTimeout(20000);
    const errors: string[] = [];
    owner.on("pageerror", error => errors.push(error.message));
    await signup(owner, 0);
    await owner.reload();
    await expect(owner.getByRole("heading", { name: "Your dashboard" })).toBeVisible();
    await owner.goto(`${base}/host/new`);
    await owner.getByLabel("Pool title", { exact: true }).fill(title);
    await owner.getByLabel(/^Visibility/).selectOption("unlisted");
    await owner.getByLabel("Test type", { exact: true }).fill("HPLC purity test");
    await owner.getByLabel("Price estimate (USD)", { exact: true }).fill("120");
    await owner.getByLabel("Minimum members", { exact: true }).fill("2");
    await owner.getByRole("button", { name: "Save pool", exact: true }).click();
    await expect(owner.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await owner.getByRole("button", { name: "Publish / reopen", exact: true }).click();
    await expect(owner.getByText("open", { exact: true })).toBeVisible();
    const manageUrl = owner.url();
    await owner.getByRole("link", { name: "View member page", exact: true }).click();
    const poolUrl = owner.url();

    const memberContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const member = await memberContext.newPage();
    member.setDefaultTimeout(20000);
    member.on("pageerror", error => errors.push(error.message));
    await member.goto(poolUrl);
    await expect(member.getByRole("button", { name: "Sign in to join", exact: true })).toBeVisible();
    await signup(member, 1);
    await member.goto(poolUrl);
    await member.getByRole("button", { name: "Register interest", exact: true }).click();
    await expect(member.getByText("Your interest is registered", { exact: true })).toBeVisible();
    await member.reload();
    await expect(member.getByRole("button", { name: "Leave pool", exact: true })).toBeVisible();
    expect(await member.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await owner.goto(manageUrl);
    await expect(owner.getByRole("heading", { name: "Members (1)", exact: true })).toBeVisible();
    await owner.screenshot({ path: "/tmp/testmedaddy-core-owner.png", fullPage: true });
    await member.screenshot({ path: "/tmp/testmedaddy-core-member.png", fullPage: true });

    const loginContext = await browser.newContext();
    const login = await loginContext.newPage();
    await login.goto(`${base}/login`);
    await login.getByLabel("Email or handle", { exact: true }).fill(handles[0]);
    await login.getByLabel("Password", { exact: true }).fill(password);
    await login.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(login.getByRole("heading", { name: "Your dashboard", exact: true })).toBeVisible();
    await login.goto(manageUrl);
    await expect(login.getByRole("link", { name: "Edit", exact: true })).toBeVisible();
    await login.getByRole("link", { name: "Edit", exact: true }).click();
    await login.getByLabel("Pool title", { exact: true }).fill(`${title} edited`);
    await login.getByRole("button", { name: "Save pool", exact: true }).click();
    await expect(login.getByRole("heading", { name: `${title} edited`, exact: true })).toBeVisible();

    await member.getByRole("button", { name: "Leave pool", exact: true }).click();
    await expect(member.getByRole("button", { name: "Register interest", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  }, 120000);
});
