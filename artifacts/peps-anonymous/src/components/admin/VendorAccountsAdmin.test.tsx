import { act } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace test harness.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace test harness.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import { adminAuth } from "../../lib/admin-auth";
let root: Root | undefined;
let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let Component: typeof import("./VendorAccountsAdmin").default;
const original = adminAuth.request;
const requests: { path: string; method?: string; body: any }[] = [];
const accounts: { username: string; status: string; vendorId: string | null; companyName: string; contactName: string; email: string; createdAt: string }[] = [{ username: "supplier", status: "pending", vendorId: null, companyName: "Supplier Co", contactName: "Person", email: "vendor@example.com", createdAt: "2026-01-01" }];
before(async () => {
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
  for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node", "MutationObserver"]) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  Component = (await import("./VendorAccountsAdmin")).default;
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); document.body.innerHTML = ""; adminAuth.request = original; });
after(() => dom.window.close());
function el(id: string) { const value = document.querySelector(`[data-testid="${id}"]`); assert.ok(value, id); return value!; }
async function mount(accountRows = accounts) {
  requests.length = 0;
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify(init.method ? { ok: true } : { accounts: accountRows, vendors: [{ id: "v1", name: "Vendor One" }] }), { status: 200 });
  };
  const container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root!.render(<Component />));
}
async function change(id: string, value: string) { await act(async () => { fireEvent.change(el(id), { target: { value } }); }); }
test("approves a pending dedicated account only after selecting its vendor", async () => {
  await mount();
  assert.equal((el("button-activate-supplier") as HTMLButtonElement).disabled, true);
  await change("select-vendor-supplier", "v1");
  await act(async () => { fireEvent.click(el("button-activate-supplier")); });
  assert.deepEqual(requests.find(r => r.method === "PUT"), { path: "/api/admin/vendor-accounts/supplier", method: "PUT", body: { vendorId: "v1", status: "active" } });
});
test("creates credentials through the admin session and clears the password", async () => {
  await mount();
  await change("input-vendor-username", "new_vendor"); await change("input-vendor-password", "a-secret-password"); await change("select-new-vendor", "v1");
  await act(async () => { fireEvent.submit(el("form-create-vendor")); });
  const request = requests.find(r => r.method === "POST");
  assert.equal(request?.body.username, "new_vendor"); assert.equal(request?.body.password, "a-secret-password"); assert.equal(request?.body.vendorId, "v1");
  assert.equal((el("input-vendor-password") as HTMLInputElement).value, "");
  assert.ok(!document.body.textContent!.includes("a-secret-password"));
});
test("resets a password without activating a pending account", async () => {
  await mount(); await change("input-reset-supplier", "another-secret-password");
  await act(async () => { fireEvent.click(el("button-reset-supplier")); });
  assert.deepEqual(requests.find(r => r.method === "PUT")?.body, { vendorId: null, status: "pending", password: "another-secret-password" });
  assert.equal((el("input-reset-supplier") as HTMLInputElement).value, "");
});
test("declines a pending account without requiring a vendor link", async () => {
  await mount();
  await act(async () => { fireEvent.click(el("button-suspend-supplier")); });
  assert.deepEqual(requests.find(r => r.method === "PUT")?.body, { vendorId: null, status: "disabled" });
});
test("shows failed mutations without claiming success", async () => {
  await mount(); await change("select-vendor-supplier", "v1");
  adminAuth.request = async () => new Response(JSON.stringify({ error: "Account update denied" }), { status: 403 });
  await act(async () => { fireEvent.click(el("button-activate-supplier")); });
  assert.equal(document.querySelector('[role="alert"]')?.textContent, "Account update denied");
  assert.ok(!document.body.textContent!.includes("Account updated for"));
});

test("suspends and reactivates accounts with their linked vendor", async () => {
  await mount([{ ...accounts[0], status: "active", vendorId: "v1" }]);
  await act(async () => { fireEvent.click(el("button-suspend-supplier")); });
  assert.deepEqual(requests.find(r => r.method === "PUT")?.body, { vendorId: "v1", status: "disabled" });
  await act(async () => root!.unmount()); root = undefined; document.body.innerHTML = "";
  await mount([{ ...accounts[0], status: "disabled", vendorId: "v1" }]);
  assert.equal(el("button-activate-supplier").textContent, "Reactivate");
  await act(async () => { fireEvent.click(el("button-activate-supplier")); });
  assert.deepEqual(requests.find(r => r.method === "PUT")?.body, { vendorId: "v1", status: "active" });
});
test("rejects passwords that exceed the Unicode password length limit before sending", async () => {
  await mount(); await change("input-vendor-username", "new_vendor"); await change("input-vendor-password", "😀".repeat(20)); await change("select-new-vendor", "v1");
  await act(async () => { fireEvent.submit(el("form-create-vendor")); });
  assert.ok(!requests.some(request => request.method === "POST"));
  assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /shorten passwords/);
});
test("saves an account-specific portal display name with the vendor link", async () => {
  await mount([{ ...accounts[0], status: "active", vendorId: "v1" }]);
  await change("input-display-name-supplier", "  Northstar Labs  ");
  await act(async () => { fireEvent.click(el("button-activate-supplier")); });
  assert.deepEqual(requests.find(request => request.method === "PUT")?.body, { vendorId: "v1", status: "active", displayName: "Northstar Labs" });
});
test("allows clearing the display name to restore the vendor profile name", async () => {
  await mount([{ ...accounts[0], status: "active", vendorId: "v1", displayName: "Northstar" } as any]);
  assert.equal((el("input-display-name-supplier") as HTMLInputElement).value, "Northstar");
  await change("input-display-name-supplier", "");
  await act(async () => { fireEvent.click(el("button-activate-supplier")); });
  assert.equal(requests.find(request => request.method === "PUT")?.body.displayName, null);
});
