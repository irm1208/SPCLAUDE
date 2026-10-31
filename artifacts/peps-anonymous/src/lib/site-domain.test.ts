import { test } from "node:test";
import assert from "node:assert/strict";
import { siteSurface } from "./site-domain.ts";
test("vendor hosts isolate every path from member effects", () => {
  for (const host of ["pepsanonymous.com", "www.pepsanonymous.com"]) {
    for (const path of ["/", "/vendor", "/vendor/login", "/login", "/account"]) assert.equal(siteSurface(host,path,false), "vendor");
  }
});
test("production never exposes vendor routes on other hosts", () => {
  for (const host of ["saltandpeps.co.uk", "localhost", "evil.replit.dev"]) assert.equal(siteSurface(host,"/vendor",false),"blocked");
  assert.equal(siteSurface("saltandpeps.co.uk","/login",false),"main");
});
test("development permits only explicit local and preview vendor paths", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "preview.example.test"]) assert.equal(siteSurface(host,"/vendor/login",true,["preview.example.test"]),"vendor");
  assert.equal(siteSurface("other.replit.dev","/vendor",true),"blocked");
  assert.equal(siteSurface("localhost","/",true),"main");
});
