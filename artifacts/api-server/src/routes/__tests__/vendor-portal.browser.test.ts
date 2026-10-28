import { randomUUID } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { chromium, expect as browserExpect, type Browser, type Page } from "@playwright/test";
import { afterAll, describe, expect, it, vi } from "vitest";

// Only the DB connection is redirected: every query goes to a real PostgreSQL
// transaction. No authentication middleware, HTTP response, or storage is mocked.
// Nested transactions retain real savepoint/rollback behavior.
const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const actual: any = await vi.importActual("@workspace/db");
  const db: any = {};
  for (const method of ["select", "insert", "update", "delete", "execute", "transaction"]) {
    db[method] = (...args: any[]) => {
      if (!state.tx) throw new Error("Browser fixture transaction is not active");
      return state.tx[method](...args);
    };
  }
  return { ...actual, db };
});

const enabled = process.env.VENDOR_PORTAL_BROWSER_TESTS === "1";
describe.skipIf(!enabled)("vendor portal / real browser sign-in and privacy", () => {
  let browser: Browser | undefined;
  let frontend: ChildProcess | undefined;
  let server: https.Server | undefined;
  let temp: string | undefined;
  const objects = new Set<string>();
  afterAll(async () => {
    await browser?.close();
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    frontend?.kill("SIGTERM");
    if (temp) await rm(temp, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("isolates five real cookie sessions, shipment costs, photos and combined tracking", async () => {
    // Synthetic credentials exist only in this worker, never in workspace secrets.
    const password = `Browser-${randomUUID()}!`;
    const adminPassword = `Admin-${randomUUID()}!`;
    vi.stubEnv("ADMIN_SECRET", adminPassword);
    vi.stubEnv("ACCOUNT_JWT_SECRET", randomUUID() + randomUUID());
    const store: any = await import("@workspace/db");
    const actual: any = await vi.importActual("@workspace/db");
    const rollback = new Error("rollback browser fixtures");
    let completed = false;
    try {
      await actual.db.transaction(async (tx: any) => {
        state.tx = tx;
        try {
        const suffix = randomUUID().slice(0, 8);
        const users = {
          a: `vendor_a_${suffix}`, b: `vendor_b_${suffix}`,
          recipient: `recipient_${suffix}`, member: `member_${suffix}`,
        };
        const vendors = ["browser-a", "browser-b"].map(id => ({
          id, name: id, tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
          regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50] }],
        }));
        await tx.insert(store.siteConfigTable).values({ key: "wholesale_vendors", value: JSON.stringify(vendors) })
          .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: JSON.stringify(vendors) } });
        await tx.insert(store.adminSecuritySettingsTable).values({ id: 1, twoFactorEnabled: false })
          .onConflictDoUpdate({ target: store.adminSecuritySettingsTable.id, set: { twoFactorEnabled: false } });
        const passwordHash = await bcrypt.hash(password, 4);
        await tx.insert(store.accountsTable).values(Object.values(users).map(telegramUsername => ({
          telegramUsername, passwordHash, email: `${telegramUsername}@example.invalid`,
          emailVerifiedAt: new Date(), country: "GB",
        })));
        const product = `Browser privacy product ${suffix}`;
        await tx.insert(store.fs3CostsTable).values({ productName: product, unitCost: "20.00" });
        const shareId = `BR${suffix.toUpperCase()}`;
        const ids = { recipient: randomUUID(), member: randomUUID(), b: randomUUID(), hidden: randomUUID() };
        // All numeric codes are synthetic and checked for conflicts by PostgreSQL.
        const firstCode = 800000000 + Math.floor(Math.random() * 90000000);
        const codes = Object.fromEntries(Object.keys(ids).map((key, i) => [key, String(firstCode + i)]));
        await tx.insert(store.wholesaleSharesTable).values({
          id: shareId, creatorUsername: users.recipient, deliveryUsername: users.recipient,
          status: "submitted", vendorId: vendors[0].id, organiserPaymentStatus: "confirmed",
          shippingName: "Browser Recipient", shippingAddress: "Combined supplier address",
          shippingCountry: "United Kingdom", shippingEmail: "recipient@example.invalid", shippingPhone: "+441234",
        });
        for (const [key, id] of Object.entries(ids)) {
          const shared = key === "recipient" || key === "member";
          await tx.insert(store.ordersTable).values({
            id, code: codes[key], telegramUsername: key === "member" ? users.member : users.recipient,
            deliveryMethod: "Vendor", status: "Submitted", paymentStatus: "confirmed",
            productSubtotal: "1998", grandTotal: "2048", orderType: shared ? "wholesale_shared" : "wholesale",
            sharedOrderId: shared ? shareId : null,
            shippingName: "Browser Recipient", shippingAddress: key === "member" ? "PRIVATE ONWARD ADDRESS" : "Fixture Road",
            shippingCountry: "United Kingdom", shippingEmail: "recipient@example.invalid", shippingPhone: "+441234",
          });
          await tx.insert(store.orderLineItemsTable).values({
            id: randomUUID(), orderId: id, productId: product, productName: product,
            quantity: "2", unitPrice: "999", lineTotal: "1998",
          });
        }
        await tx.insert(store.wholesaleShareMembersTable).values([
          { id: randomUUID(), shareId, username: users.recipient, orderId: ids.recipient },
          { id: randomUUID(), shareId, username: users.member, orderId: ids.member, onwardAddress: "PRIVATE ONWARD ADDRESS" },
        ]);

        // Use the production route tree (including Admin session + CSRF boundary).
        // HTTPS exercises the actual Secure / SameSite=None / Partitioned cookies.
        const router = (await import("../index")).default;
        temp = await mkdtemp(path.join(tmpdir(), "vendor-browser-"));
        execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", `${temp}/key.pem`,
          "-out", `${temp}/cert.pem`, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
        const app = express();
        app.set("trust proxy", 1);
        app.use(cookieParser(), express.json({ limit: "1mb" }));
        app.use("/api", router);
        const portProbe = http.createServer();
        await new Promise<void>(resolve => portProbe.listen(0, "127.0.0.1", resolve));
        const frontendPort = (portProbe.address() as any).port;
        await new Promise<void>(resolve => portProbe.close(() => resolve()));
        // Keep Replit preview cookie behavior in the API worker, but let this
        // temporary Vite instance use local HMR rather than a fixed wss:443.
        const frontendEnv: NodeJS.ProcessEnv = { ...process.env, PORT: String(frontendPort), BASE_PATH: "/", VITE_NO_WATCH: "1" };
        delete frontendEnv.REPL_ID;
        frontend = spawn("pnpm", ["exec", "vite", "--host", "127.0.0.1", "--strictPort"], {
          cwd: path.resolve(import.meta.dirname, "../../../../peps-anonymous"),
          env: frontendEnv,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let frontendLog = "";
        frontend.stdout?.on("data", chunk => { frontendLog += chunk; });
        frontend.stderr?.on("data", chunk => { frontendLog += chunk; });
        app.use((req, res) => {
          const proxy = http.request({ host: "127.0.0.1", port: frontendPort, path: req.originalUrl, method: req.method,
            headers: { ...req.headers, host: "localhost" } }, upstream => {
            res.writeHead(upstream.statusCode!, upstream.headers); upstream.pipe(res);
          });
          proxy.on("error", () => res.status(502).end("Frontend unavailable"));
          req.pipe(proxy);
        });
        server = https.createServer({ key: await readFile(`${temp}/key.pem`), cert: await readFile(`${temp}/cert.pem`) }, app);
        server.on("upgrade", (req, socket, head) => {
          const upstream = net.connect(frontendPort, "127.0.0.1", () => {
            upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries({ ...req.headers, host: "localhost" })
              .map(([key, value]) => `${key}: ${value}`).join("\r\n")}\r\n\r\n`);
            if (head.length) upstream.write(head);
            socket.pipe(upstream); upstream.pipe(socket);
          });
          upstream.on("error", () => socket.destroy());
          socket.on("error", () => upstream.destroy());
          socket.on("close", () => upstream.destroy());
        });
        await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
        const origin = `https://localhost:${(server.address() as any).port}`;
        await browserExpect.poll(async () => {
          if (frontend?.exitCode !== null) throw new Error(`Frontend exited: ${frontendLog}`);
          try { return (await fetch(`http://127.0.0.1:${frontendPort}/login`)).status; } catch { return 0; }
        }, { timeout: 60000 }).toBe(200);
        browser = await chromium.launch({
          headless: true, args: ["--no-sandbox"],
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ?? (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined),
        });
        async function newPage() {
          const context = await browser!.newContext({ ignoreHTTPSErrors: true });
          const page = await context.newPage();
          page.setDefaultTimeout(60000);
          page.on("pageerror", error => console.error("Browser page error:", error.message));
          return page;
        }
        const [a, b, admin, recipient, member, guest] = await Promise.all(Array.from({ length: 6 }, newPage));
        async function api(page: Page, url: string, method = "GET", body?: unknown, csrf?: string) {
          return page.evaluate(async ({ url, method, body, csrf }) => {
            const response = await fetch(url, { method, credentials: "include",
              headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(csrf ? { "X-Admin-Csrf": csrf } : {}) },
              ...(body ? { body: JSON.stringify(body) } : {}) });
            const text = await response.text();
            return { status: response.status, body: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : text,
              cache: response.headers.get("cache-control") };
          }, { url, method, body, csrf });
        }
        await admin.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
        const signedAdmin = await api(admin, "/api/admin/auth/legacy-login", "POST", { adminSecret: adminPassword, rememberMe: false });
        expect(signedAdmin.status).toBe(200);
        const csrf = signedAdmin.body.csrfToken;
        expect((await api(admin, "/api/admin/vendor-portal")).status).toBe(200);
        expect((await api(admin, "/api/admin/vendor-portal/access", "PUT", { username: users.a, vendorId: vendors[0].id })).status).toBe(403);
        for (const [username, vendorId] of [[users.a, vendors[0].id], [users.b, vendors[1].id]]) {
          const granted = await api(admin, "/api/admin/vendor-portal/access", "PUT", { username, vendorId }, csrf);
          expect(granted.status, JSON.stringify(granted.body)).toBe(200);
        }
        async function signIn(page: Page, username: string, next: string) {
          await page.goto(`${origin}/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
          await page.getByPlaceholder("@username or email").fill(username);
          await page.getByPlaceholder("Password or PIN", { exact: true }).fill(password);
          const login = page.waitForResponse(r => r.url().endsWith("/api/account/smart-login") && r.request().method() === "POST");
          await page.locator('button[type="submit"]').click();
          expect((await login).status()).toBe(200);
          await page.waitForURL(`${origin}${next}`);
          expect((await api(page, "/api/account/me")).body.telegramUsername).toBe(username);
          const cookies = await page.context().cookies();
          expect(cookies.find(c => c.name === "account_session")).toMatchObject({ httpOnly: true, secure: true });
        }
        await signIn(a, users.a, "/vendor");
        await signIn(b, users.b, "/vendor");
        await signIn(recipient, users.recipient, "/account?s=orders");
        await signIn(member, users.member, "/account?s=orders");
        await guest.goto(`${origin}/vendor`, { waitUntil: "domcontentloaded" });
        await browserExpect(guest.getByTestId("state-auth-401")).toBeVisible();
        await browserExpect(a.getByTestId("state-empty")).toBeVisible();
        expect((await api(member, "/api/vendor/orders")).status).toBe(403);
        expect((await api(a, "/api/admin/vendor-portal")).status).toBe(401);
        async function submit(vendorId: string, orderCodes: string[]) {
          const preview = await api(admin, "/api/admin/vendor-portal/preview", "POST", { vendorId, orderCodes }, csrf);
          expect(preview.status).toBe(200);
          expect(JSON.stringify(preview.body)).not.toContain("PRIVATE ONWARD ADDRESS");
          const result = await api(admin, "/api/admin/vendor-portal/submit", "POST",
            { vendorId, orderCodes, previewToken: preview.body.previewToken }, csrf);
          expect(result.status).toBe(200);
        }
        await submit(vendors[0].id, [codes.recipient, codes.member]);
        await submit(vendors[1].id, [codes.b]);
        const listA = await api(a, "/api/vendor/orders"), listB = await api(b, "/api/vendor/orders");
        expect(listA.body.orders).toHaveLength(1); expect(listB.body.orders).toHaveLength(1);
        const shipment = listA.body.orders[0], otherShipment = listB.body.orders[0];
        expect(shipment.id).not.toBe(otherShipment.id);
        expect(shipment.items[0]).toMatchObject({ quantity: 4, unitCost: "20.00", lineTotal: "80.00" });
        expect(shipment.totalCost).toBe("130.00");
        for (const result of [listA, listB]) {
          for (const hidden of ["grandTotal", "paymentStatus", "telegramUsername", "unitPrice", "sourceFingerprint", "1998", "2048", "999", "PRIVATE ONWARD ADDRESS"]) {
            expect(JSON.stringify(result.body)).not.toContain(hidden);
          }
        }
        await a.getByTestId("button-refresh").click();
        await browserExpect(a.getByTestId(`card-order-${shipment.id}`)).toBeVisible();
        await browserExpect(a.getByTestId(`card-order-${otherShipment.id}`)).toHaveCount(0);
        await b.getByTestId("button-refresh").click();
        await browserExpect(b.getByTestId(`card-order-${otherShipment.id}`)).toBeVisible();
        await browserExpect(b.getByTestId(`card-order-${shipment.id}`)).toHaveCount(0);
        await a.getByTestId(`card-order-${shipment.id}`).click();
        await a.getByTestId("button-mark-processing").click();
        await browserExpect(a.getByTestId("text-action-result")).toContainText("Marked as processing");
        expect((await api(b, `/api/vendor/orders/${shipment.id}`, "PATCH", { action: "processing" })).status).toBe(404);

        // Upload real image bytes through the form and real App Storage.
        const sharp = (await import("sharp")).default;
        const bytes = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#2563eb" } }).png().toBuffer();
        const uploaded = a.waitForResponse(r => r.url().endsWith(`/vendor/orders/${shipment.id}/images`) && r.request().method() === "POST");
        await a.getByTestId("input-image").setInputFiles({ name: "synthetic-packing.png", mimeType: "image/png", buffer: bytes });
        const uploadResult = await uploaded;
        expect(uploadResult.status(), await uploadResult.text()).toBe(201);
        const rows = await tx.select().from(store.vendorImagesTable).where(eq(store.vendorImagesTable.submissionId, shipment.id));
        rows.forEach((row: any) => objects.add(row.objectPath));
        const photos = await api(recipient, `/api/account/orders/${ids.recipient}/vendor-images`);
        expect(photos.body.images).toHaveLength(1);
        const image = photos.body.images[0];
        const memberImage = await api(recipient, image.url);
        expect(memberImage.status).toBe(200); expect(memberImage.cache).toContain("no-store");
        expect((await api(a, `/api/vendor/vendor-images/${image.id}`)).status).toBe(200);
        expect((await api(admin, `/api/admin/vendor-portal/vendor-images/${image.id}`)).status).toBe(200);
        expect((await api(b, `/api/vendor/vendor-images/${image.id}`)).status).toBe(404);
        expect((await api(member, `/api/account/orders/${ids.member}/vendor-images`)).body.images).toEqual([]);
        expect((await api(member, `/api/account/orders/${ids.recipient}/vendor-images`)).status).toBe(404);
        expect((await api(member, image.url)).status).toBe(404);
        expect((await api(guest, image.url)).status).toBe(401);
        await recipient.goto(`${origin}/account/orders/${ids.recipient}`, { waitUntil: "domcontentloaded" });
        await browserExpect(recipient.locator(`img[src="${image.url}"]`)).toBeVisible();
        await browserExpect.poll(() => recipient.locator(`img[src="${image.url}"]`).evaluate((img: any) => img.naturalWidth)).toBeGreaterThan(0);

        const tracking = `BROWSER${suffix.toUpperCase()}`;
        await a.getByTestId("input-carrier").fill("Fixture");
        await a.getByTestId("input-tracking").fill(tracking);
        await a.getByTestId("button-save-tracking").click();
        await browserExpect(a.getByTestId("text-action-result")).toContainText("Tracking saved");
        expect((await api(recipient, `/api/account/orders/${ids.recipient}`)).body.trackingNumber).toBe(tracking);
        expect((await api(member, `/api/account/orders/${ids.member}`)).body.trackingNumber).toBeNull();
        const memberOrders = await api(member, "/api/account/orders");
        expect(memberOrders.body.find((o: any) => o.id === ids.member).trackingNumber).toBeNull();
        expect(JSON.stringify(memberOrders.body)).not.toContain(tracking);
        expect((await api(member, `/api/account/orders/${ids.recipient}`)).status).toBe(404);
        await recipient.reload({ waitUntil: "domcontentloaded" });
        await browserExpect(recipient.getByText(tracking, { exact: true }).first()).toBeVisible();
        await member.goto(`${origin}/account/orders/${ids.member}`, { waitUntil: "domcontentloaded" });
        await browserExpect(member.getByText(codes.member, { exact: false }).first()).toBeVisible();
        await browserExpect(member.getByText(tracking, { exact: false })).toHaveCount(0);
        await browserExpect(member.locator(`img[src="${image.url}"]`)).toHaveCount(0);
        await member.goto(`${origin}/account/orders/${ids.recipient}`, { waitUntil: "domcontentloaded" });
        await browserExpect(member.getByText(/order not found/i).first()).toBeVisible();
        expect(await member.locator("body").innerText()).not.toContain(tracking);

        expect((await api(admin, "/api/admin/vendor-portal/access", "PUT", { username: users.a, vendorId: null }, csrf)).status).toBe(200);
        expect((await api(a, "/api/vendor/me")).status).toBe(403);
        expect((await api(a, "/api/vendor/orders")).status).toBe(403);
        expect((await api(a, `/api/vendor/orders/${shipment.id}`, "PATCH", { action: "processing" })).status).toBe(403);
        expect((await api(a, `/api/vendor/vendor-images/${image.id}`)).status).toBe(403);
        await a.reload({ waitUntil: "domcontentloaded" });
        await browserExpect(a.getByTestId("state-auth-403")).toBeVisible();
        expect((await api(b, "/api/vendor/orders")).body.orders[0].id).toBe(otherShipment.id);
        // Logout clears the same Secure/Partitioned cookie issued by sign-in.
        expect((await api(b, "/api/account/logout", "POST")).status).toBe(200);
        expect((await api(b, "/api/vendor/orders")).status).toBe(401);
        completed = true;
        // Let fire-and-forget audit/last-login queries settle before rollback.
        await tx.execute((await import("drizzle-orm")).sql`select 1`);
        throw rollback;
        } finally {
          // Stop pollers and image requests before PostgreSQL rolls back, even
          // when an assertion fails halfway through the journey.
          await browser?.close();
          browser = undefined;
        }
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      // Storage is outside PostgreSQL: always remove uploaded synthetic objects,
      // including when a later assertion fails.
      if (state.tx) {
        // The transaction is already rolled back here; keys were captured earlier.
        const { deleteWholesaleUpdateImage } = await import("../../lib/wholesale-update-images");
        for (const key of objects) await deleteWholesaleUpdateImage(key);
      }
      state.tx = null;
    }
    expect(completed).toBe(true);
  }, 300000);
});
