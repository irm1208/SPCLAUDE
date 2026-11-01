import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { siteFrontends } from "./site-frontends";
import { siteDomainPolicy } from "./site-domain-policy";
import { buildAllowedOrigins, isAllowedOrigin } from "./cors-origin";

let directory: string;
let main: string;
let testing: string;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "site-frontends-"));
  main = path.join(directory, "main");
  testing = path.join(directory, "testing");
  for (const [root, name] of [[main, "Salt & Peps"], [testing, "Testmedaddy"]]) {
    await mkdir(path.join(root, "assets"), { recursive: true });
    await writeFile(path.join(root, "index.html"), `<title>${name}</title>`);
    await writeFile(path.join(root, "assets", "site.js"), name);
  }
});
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

async function request(host: string, url = "/", headers: Record<string, string> = {}, testingRoot = testing, mainRoot = main) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(siteDomainPolicy({ production: true }));
  app.get("/api/tmd/example", (_req, res) => res.json({ site: "testing" }));
  app.get("/api/orders", (_req, res) => res.json({ site: "main" }));
  app.use(siteFrontends({ main: mainRoot, testing: testingRoot }));
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    return await new Promise<{ status: number; body: string; contentType?: string }>((resolve, reject) => {
      httpRequest({
        hostname: "127.0.0.1", port: (server.address() as { port: number }).port,
        path: url, headers: { Host: host, ...headers },
      }, response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => { body += chunk; });
        response.on("end", () => resolve({ status: response.statusCode!, body, contentType: response.headers["content-type"] }));
      }).on("error", reject).end();
    });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("separate websites with shared publishing", () => {
  it.each(["saltandpeps.co.uk", "www.saltandpeps.co.uk", "saltandpeps1.replit.app"])("serves Salt & Peps on %s", async host => {
    expect((await request(host)).body).toBe("<title>Salt & Peps</title>");
  });
  it.each(["testmedaddy.com", "www.testmedaddy.com", "TESTMEDADDY.COM:443"])("serves Testmedaddy on %s, including deep links", async host => {
    expect((await request(host, "/login?next=/pools")).body).toBe("<title>Testmedaddy</title>");
  });
  it("does not choose a site from a spoofed forwarded host or a hostname suffix", async () => {
    expect((await request("saltandpeps.co.uk", "/", { "X-Forwarded-Host": "testmedaddy.com" })).body).toContain("Salt & Peps");
    expect((await request("testmedaddy.com.evil.test")).body).toContain("Salt & Peps");
  });
  it("serves assets only from the selected site's build", async () => {
    expect((await request("testmedaddy.com", "/assets/site.js")).body).toBe("Testmedaddy");
    expect((await request("saltandpeps.co.uk", "/assets/site.js")).body).toBe("Salt & Peps");
    expect((await request("testmedaddy.com", "/assets/missing.js")).status).toBe(404);
  });
  it("never falls back to Salt & Peps if Testmedaddy's build is missing", async () => {
    const result = await request("testmedaddy.com", "/", {}, path.join(directory, "missing"));
    expect(result.status).toBe(503);
    expect(result.body).not.toContain("Salt & Peps");
  });
  it("keeps each site's APIs on its own domain", async () => {
    expect((await request("testmedaddy.com", "/api/tmd/example")).status).toBe(200);
    expect((await request("testmedaddy.com", "/api/orders")).status).toBe(404);
    expect((await request("testmedaddy.com", "/%61pi/orders")).status).toBe(404);
    expect((await request("saltandpeps.co.uk", "/api/tmd/example")).status).toBe(404);
    expect((await request("saltandpeps.co.uk", "/api/orders")).status).toBe(200);
  });
  it("accepts Testmedaddy's own login origin, not cross-site requests", async () => {
    const origin = "https://testmedaddy.com";
    expect(isAllowedOrigin(origin, buildAllowedOrigins({}), { NODE_ENV: "production" })).toBe(true);
    expect((await request("testmedaddy.com", "/api/tmd/example", { Origin: origin })).status).toBe(200);
    expect((await request("testmedaddy.com", "/api/tmd/example", { Origin: "https://saltandpeps.co.uk" })).status).toBe(403);
    expect((await request("saltandpeps.co.uk", "/api/orders", { Origin: origin })).status).toBe(403);
  });
  it("preserves the existing dedicated vendor portal document", async () => {
    expect((await request("pepsanonymous.com", "/vendor/login")).body).toContain("Peps Anonymous · Vendor portal");
  });
  it.each(["/vendors", "/v/example", "/forgot-password", "/reset-password", "/verify-email", "/wholesale", "/account", "/unknown-page"])("returns an actual 404 for disconnected Testmedaddy page %s", async url => {
    const result = await request("testmedaddy.com", url);
    expect(result.status).toBe(404);
    expect(result.contentType).toContain("text/html");
    expect(result.body).toContain("Testmedaddy");
  });
  it.each(["/", "/explore", "/how-it-works", "/login", "/signup", "/dashboard", "/host/new", "/host/example", "/host/example/edit", "/settings", "/p/example", "/login/"])("preserves connected Testmedaddy page %s", async url => {
    expect((await request("testmedaddy.com", url)).status).toBe(200);
  });
  it("uses the existing Testmedaddy 404 screen rather than an unavailable-feature placeholder", async () => {
    const app = await readFile(new URL("../../../testmedaddy/src/App.tsx", import.meta.url), "utf8");
    expect(app).toContain("<Route component={NotFound} />");
    expect(app).not.toContain("component={Unavailable}");
  });
  it("publishes one root handler rather than two competing static root sites", async () => {
    const root = new URL("../../../", import.meta.url);
    const apiManifest = await readFile(new URL("api-server/.replit-artifact/artifact.toml", root), "utf8");
    expect(apiManifest).toMatch(/paths\s*=\s*\[[^\]]*"\/"/);
    expect(apiManifest).toContain("build:sites");
    for (const slug of ["peps-anonymous", "testmedaddy"]) {
      const manifest = await readFile(new URL(`${slug}/.replit-artifact/artifact.toml`, root), "utf8");
      expect(manifest).not.toContain('serve = "static"');
    }
  });
  it.runIf(process.env.API_BUNDLE_SMOKE_TESTS === "1")("serves both real production documents and their built JavaScript", async () => {
    const mainRoot = fileURLToPath(new URL("../../../peps-anonymous/dist/public", import.meta.url));
    const testingRoot = fileURLToPath(new URL("../../../testmedaddy/dist/public", import.meta.url));
    for (const [host, title] of [["saltandpeps.co.uk", "Salt"], ["testmedaddy.com", "Testmedaddy"]]) {
      const document = await request(host, "/login", {}, testingRoot, mainRoot);
      expect(document.status).toBe(200);
      expect(document.body).toMatch(new RegExp(`<title>[^<]*${title}`, "i"));
      const script = /<script\b[^>]*\bsrc=["'](\/assets\/[^"']+)["']/.exec(document.body)?.[1];
      expect(script).toBeTruthy();
      const asset = await request(host, script!, {}, testingRoot, mainRoot);
      expect(asset.status).toBe(200);
      expect(asset.contentType).toContain("javascript");
    }
  });
});
