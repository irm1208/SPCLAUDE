import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { request as httpRequest, type Server } from "node:http";
import { siteDomainPolicy, isTestmedaddyHost, testmedaddyHosts } from "./site-domain-policy";

const servers: Server[] = [];
afterEach(() => { for (const server of servers.splice(0)) server.close(); });

/** Node's fetch drops a custom Host header, so use http.request like the main policy test. */
async function request(host: string, path: string, headers: Record<string, string> = {}, production = true) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(siteDomainPolicy({ production, developmentHosts: ["preview.example.test"], testmedaddyHosts: ["testmedaddy.test", "www.testmedaddy.test"] }));
  app.use((_req, res) => res.status(200).send("served"));
  const server = app.listen(0); servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  return new Promise<number>(resolve => {
    httpRequest({ hostname: "127.0.0.1", port: address.port, path, headers: { Host: host, ...headers } }, response => { response.resume(); resolve(response.statusCode!); }).end();
  });
}

describe("Testmedaddy domain boundary", () => {
  it("serves only its own API, health and pages on its hosts", async () => {
    expect(await request("testmedaddy.test", "/api/tmd/pools")).toBe(200);
    expect(await request("www.testmedaddy.test", "/p/some-pool")).toBe(200);
    expect(await request("testmedaddy.test", "/api/healthz")).toBe(200);
    expect(await request("testmedaddy.test", "/api/orders")).toBe(404);
    expect(await request("testmedaddy.test", "/api/vendor/portal")).toBe(404);
    expect(await request("testmedaddy.test", "/api/admin/orders")).toBe(404);
    expect(await request("testmedaddy.test", "/vendor")).toBe(404);
  });
  it("hides the Testmedaddy API on every other production host", async () => {
    expect(await request("saltandpeps.co.uk", "/api/tmd/pools")).toBe(404);
    expect(await request("pepsanonymous.com", "/api/tmd/auth/login")).toBe(404);
    expect(await request("saltandpeps.co.uk", "/api/products")).toBe(200);
  });
  it("allows the Testmedaddy API in local development", async () => {
    expect(await request("localhost:8080", "/api/tmd/pools", {}, false)).toBe(200);
    expect(await request("preview.example.test", "/api/tmd/pools", {}, false)).toBe(200);
  });
  it("refuses cross-product origins", async () => {
    expect(await request("saltandpeps.co.uk", "/api/products", { Origin: "https://testmedaddy.test" })).toBe(403);
    expect(await request("testmedaddy.test", "/api/tmd/pools", { Origin: "https://saltandpeps.co.uk" })).toBe(403);
    expect(await request("testmedaddy.test", "/api/tmd/pools", { Origin: "http://testmedaddy.test" })).toBe(403);
    expect(await request("testmedaddy.test", "/api/tmd/pools", { Origin: "https://testmedaddy.test" })).toBe(200);
  });
  it("reads hosts from the environment by default", () => {
    expect([...testmedaddyHosts({})]).toEqual(["testmedaddy.com", "www.testmedaddy.com"]);
    expect([...testmedaddyHosts({ TESTMEDADDY_HOSTS: "Example.com, staging.example.com" })]).toEqual(["example.com", "staging.example.com"]);
    expect(isTestmedaddyHost("testmedaddy.com")).toBe(true);
    expect(isTestmedaddyHost("testmedaddy.com:443")).toBe(true);
    expect(isTestmedaddyHost("saltandpeps.co.uk")).toBe(false);
  });
});
