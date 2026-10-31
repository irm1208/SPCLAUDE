import assert from "node:assert/strict";
import test from "node:test";
import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { isAllowedAdminCsrfOrigin } from "../api-server/src/lib/admin-csrf-origin.ts";

process.env.PORT = "21504";
process.env.BASE_PATH = "/";
process.env.API_PORT = "8080";

test("API proxy preserves the browser host for admin CSRF validation", async () => {
  const { default: config } = await import("./vite.config.ts");
  const proxy = (config as any).server.proxy["/api"];
  const upstream = createHttpServer((req, res) => {
    res.writeHead(isAllowedAdminCsrfOrigin(req.headers.origin, req.headers.host, { NODE_ENV: "development" }) ? 200 : 403);
    res.end();
  });
  await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamPort = (upstream.address() as import("node:net").AddressInfo).port;
  const server = await createViteServer({
    configFile: false,
    server: { host: "127.0.0.1", port: 0, proxy: { "/api": { ...proxy, target: `http://127.0.0.1:${upstreamPort}` } } },
  });
  try {
    await server.listen();
    const port = (server.httpServer!.address() as import("node:net").AddressInfo).port;
    const origin = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${origin}/api/admin/vendor-portal/access`, { method: "PUT", headers: { origin } })).status, 200);
    assert.equal((await fetch(`${origin}/api/admin/vendor-portal/access`, { method: "PUT", headers: { origin: "https://attacker.test" } })).status, 403);
  } finally {
    await server.close();
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
  }
});
