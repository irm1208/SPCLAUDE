import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { request as httpRequest, type Server } from "node:http";
import { siteDomainPolicy } from "./site-domain-policy";
const servers: Server[] = [];
afterEach(() => { for (const server of servers.splice(0)) server.close(); });
async function request(host: string, path: string, headers: Record<string,string> = {}, production = true) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(siteDomainPolicy({ production, developmentHosts: ["preview.example.test"] }));
  app.use((_req, res) => res.status(200).send("served"));
  const server = app.listen(0); servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  return new Promise<{status: number}>(resolve => {
    httpRequest({ hostname: "127.0.0.1", port: address.port, path, headers: { Host: host, ...headers } }, response => {
      response.resume(); resolve({ status: response.statusCode! });
    }).end();
  });
}
describe("site domain boundary", () => {
  it("only serves vendor APIs and vendor pages on vendor hosts", async () => {
    for (const host of ["pepsanonymous.com", "www.pepsanonymous.com"]) {
      for (const path of ["/", "/vendor", "/vendor/login", "/login", "/api/vendor/auth/me", "/_health", "/api/healthz", "/assets/index-123.js", "/favicon.svg"]) expect((await request(host, path)).status, path).toBe(200);
      for (const path of ["/account", "/api/account/me", "/api/admin/vendor-accounts", "/api/vendorish", "/peptide-explorer/index.html", "/assets/index.html", "/index.html"]) expect((await request(host, path)).status, path).toBe(404);
    }
  });
  it("blocks vendor resources on all other production hosts, retaining main admin routes", async () => {
    for (const host of ["saltandpeps.co.uk", "localhost", "evil.replit.dev", "pepsanonymous.com.evil.test"]) {
      for (const path of ["/vendor", "/vendor/login", "/api/vendor/auth/me"]) expect((await request(host,path)).status).toBe(404);
      expect((await request(host,"/api/admin/vendor-accounts")).status).toBe(200);
    }
  });
  it("does not trust forwarded host or forwarded origin headers", async () => {
    expect((await request("saltandpeps.co.uk", "/api/vendor/me", { "X-Forwarded-Host": "pepsanonymous.com" })).status).toBe(404);
    expect((await request("pepsanonymous.com", "/api/account/me", { "X-Forwarded-Host": "saltandpeps.co.uk" })).status).toBe(404);
  });
  it("rejects cross-site requests even when globally CORS-allowed", async () => {
    expect((await request("saltandpeps.co.uk", "/api/account/me", { Origin: "https://pepsanonymous.com" })).status).toBe(403);
    for (const origin of ["https://saltandpeps.co.uk", "https://www.pepsanonymous.com", "https://anything.replit.dev", "http://pepsanonymous.com", "https://pepsanonymous.com/", "null"]) expect((await request("pepsanonymous.com", "/api/vendor/me", { Origin: origin })).status).toBe(403);
    expect((await request("pepsanonymous.com", "/api/vendor/me", { Origin: "https://pepsanonymous.com" })).status).toBe(200);
  });
  it("rejects ambiguous encoded and backslash paths", async () => {
    for (const path of ["/%76endor", "/api/%76endor/me", "/assets/%252e%252e/account", "/vendor%5clogin", "/vendor\\login", "/api/vendor/../account", "/api/vendor%2fme"]) expect((await request("saltandpeps.co.uk",path)).status).toBe(400);
  });
  it("preserves encoded main-site route parameters", async () => {
    for (const path of ["/api/account/member/some%40name", "/track/gb/123/member/a%20name", "/track/order%23123", "/api/account/user%3Fname"]) expect((await request("saltandpeps.co.uk", path)).status).toBe(200);
  });
  it("allows development vendor paths only on an explicit local/preview host", async () => {
    for (const host of ["localhost:5000", "127.0.0.1:5000", "preview.example.test"]) expect((await request(host,"/vendor",{},false)).status).toBe(200);
    expect((await request("random.replit.dev","/vendor",{},false)).status).toBe(404);
  });
});

import { siteDocument } from "./site-domain-policy";
describe("site HTML document", () => {
  const html = '<html><head><title>Salt & Peps</title><script src="https://telegram.org/js/telegram-web-app.js"></script><script type="module" src="/assets/index.js"></script></head><body><div id="root"></div></body></html>';
  it("changes vendor title and removes the Telegram Mini App SDK", () => {
    for (const host of ["pepsanonymous.com", "www.pepsanonymous.com:443"]) {
      const document = siteDocument(html, host);
      expect(document).toContain("<title>Peps Anonymous · Vendor portal</title>");
      expect(document).not.toContain('<script src="https://telegram.org/js/telegram-web-app.js">');
      expect(document).toContain('<script type="module" src="/assets/index.js"></script>');
    }
  });
  it("preserves main-site HTML exactly", () => {
    expect(siteDocument(html, "saltandpeps.co.uk")).toBe(html);
    expect(siteDocument(html, "pepsanonymous.com.evil.test")).toBe(html);
  });
});

describe("vendor favicon isolation", () => {
  const html = '<title>Salt & Peps</title><link rel="icon" type="image/svg+xml" href="/favicon.svg" /><link rel="apple-touch-icon" href="/brand/salt-peps-apple-touch-180.png" />';
  it("uses only Peps Anonymous icons in the vendor document", () => {
    const document = siteDocument(html, "pepsanonymous.com");
    expect(document).toContain('/brand/pepsanonymous-favicon.svg');
    expect(document).toContain('/brand/pepsanonymous-apple-touch-180.png');
    expect(document).not.toContain('salt-peps');
    expect(document).not.toContain('href="/favicon.svg"');
  });
  it("keeps the main site's original icons", () => {
    expect(siteDocument(html, "saltandpeps.co.uk")).toBe(html);
  });
});
