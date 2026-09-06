import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { AdminApiError, AdminAuthController, AdminSessionExpiredError } from "./admin-auth.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("status is fetched before disabled shared-secret authentication", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    calls.push({ url: String(input), init });
    return calls.length === 1 ? json({ twoFactorEnabled: false }) : json({ ok: true });
  });
  await auth.initialize();
  await auth.loginWithSecret("bootstrap");
  assert.equal(calls[0]?.url, "/api/admin/security/status");
  assert.equal(new Headers(calls[1]?.init?.headers).get("x-admin-secret"), "bootstrap");
  assert.equal(calls[1]?.init?.credentials, "omit");
});

test("enabled login completes password challenge with TOTP or recovery code", async () => {
  const requests: Array<{ url: string; body: any }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    requests.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (String(input).endsWith("/login")) return json({ challenge: "challenge-1" });
    return json({ csrfToken: "csrf-1" });
  });
  auth.setMode(true);
  const challenge = await auth.login("alice", "correct horse battery");
  await auth.verify(challenge, { code: "123456" });
  await auth.verify(challenge, { recoveryCode: "ABCD-EFGH" });
  assert.deepEqual(requests.map(r => r.body), [
    { username: "alice", password: "correct horse battery" },
    { challenge: "challenge-1", code: "123456" },
    { challenge: "challenge-1", recoveryCode: "ABCD-EFGH" },
  ]);
  assert.equal(requests[0]?.url, "/api/admin/auth/login");
});

test("enabled mutations include cookies and restored CSRF but never admin secret", async () => {
  const calls: RequestInit[] = [];
  const auth = new AdminAuthController(async (_input, init) => {
    calls.push(init ?? {});
    return calls.length === 1 ? json({ username: "alice", csrfToken: "restored" }) : json({ ok: true });
  });
  auth.setMode(true);
  await auth.restoreSession();
  await auth.request("/admin/orders/1", { method: "PATCH", headers: { "x-admin-secret": "must-not-leak" }, body: JSON.stringify({ status: "Paid" }) });
  const headers = new Headers(calls[1]?.headers);
  assert.equal(calls[1]?.credentials, "include");
  assert.equal(headers.get("x-admin-csrf"), "restored");
  assert.equal(headers.has("x-admin-secret"), false);
});

test("step-up retries a mutation once", async () => {
  let mutationCalls = 0;
  let prompts = 0;
  const auth = new AdminAuthController(async (input) => {
    if (String(input).endsWith("/step-up")) return json({ ok: true });
    mutationCalls++;
    return mutationCalls === 1 ? json({ error: "step_up_required" }, 403) : json({ ok: true });
  });
  auth.setMode(true);
  auth.setCsrfToken("csrf");
  auth.setStepUpHandler(async () => { prompts++; return "123456"; });
  const response = await auth.request("/admin/fs3-costs", { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(mutationCalls, 2);
  assert.equal(prompts, 1);
});

test("action-bound assertion uses the exact action target and payload", async () => {
  const calls: Array<{ url: string; body: any; headers: Headers }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null, headers: new Headers(init?.headers) });
    return String(input).endsWith("/step-up") ? json({ assertion: "single-use" }) : json({ ok: true });
  });
  auth.setMode(true);
  auth.setCsrfToken("csrf");
  auth.setStepUpHandler(async () => "123456");
  await auth.request("/admin/security/disable", { method: "POST", body: JSON.stringify({ confirm: true }) }, {
    action: "admin.security.disable", target: "admin-security", payload: null,
  });
  assert.deepEqual(calls[0]?.body, { code: "123456", action: "admin.security.disable", target: "admin-security", payload: null });
  assert.equal(calls[1]?.headers.get("x-admin-action-assertion"), "single-use");
});

test("wallet change-code interception binds the derived hash without exposing codes", async () => {
  const stepUps: any[] = [];
  const auth = new AdminAuthController(async (input, init) => {
    if (String(input).endsWith("/step-up")) {
      stepUps.push(JSON.parse(String(init?.body)));
      return json({ assertion: "single-use" });
    }
    return json({ ok: true });
  });
  auth.setMode(true);
  auth.setCsrfToken("csrf");
  auth.setStepUpHandler(async () => "123456");
  const target = { fetch: (input: RequestInfo | URL, init?: RequestInit) => auth.request(String(input), init) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/admin/wallet-change-code", {
    method: "POST",
    body: JSON.stringify({ currentCode: "old-secret", newCode: "new-secret-code" }),
  });
  uninstall();
  assert.equal(stepUps[0]?.action, "wallet.change-code.update");
  assert.equal(stepUps[0]?.target, "wallet.change-code");
  assert.deepEqual(stepUps[0]?.payload, {
    newCodeHash: "631ce347c402ef25be008f1d827f2ca9133cc8a6615880f247f27a65ce332515",
  });
  assert.equal(JSON.stringify(stepUps[0]).includes("old-secret"), false);
  assert.equal(JSON.stringify(stepUps[0]).includes("new-secret-code"), false);
});

test("wallet address and chain-wallet interception use exact normalized assertions", async () => {
  const stepUps: any[] = [];
  const auth = new AdminAuthController(async (input, init) => {
    if (String(input).endsWith("/step-up")) {
      stepUps.push(JSON.parse(String(init?.body)));
      return json({ assertion: "assertion" });
    }
    return json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  const target = { fetch: (input: RequestInfo | URL, init?: RequestInit) => auth.request(String(input), init) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/admin/wallet-address", { method: "POST", body: JSON.stringify({ walletAddress: " 0xabc ", changeCode: "never-bind" }) });
  await target.fetch("/api/admin/chain-wallets", { method: "PATCH", body: JSON.stringify({ btcWallet: " bc1abc ", empty: null }) });
  uninstall();
  assert.deepEqual(stepUps.map(item => ({ action: item.action, target: item.target, payload: item.payload })), [
    { action: "wallet.address.update", target: "wallet.primary", payload: { walletAddress: "0xabc" } },
    { action: "wallet.chain.update", target: "wallet.chain", payload: { btcWallet: "bc1abc", empty: "" } },
  ]);
  assert.equal(JSON.stringify(stepUps).includes("never-bind"), false);
});

test("enabling clears persisted shared-secret state before session use", async () => {
  const storage = new Map<string, string>([["_adm_s", "shared-secret"]]);
  const auth = new AdminAuthController(async () => json({ csrfToken: "csrf", recoveryCodes: ["CODE"] }), {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  });
  auth.setMode(false);
  await auth.confirmEnable("challenge", "123456");
  assert.equal(auth.twoFactorEnabled, true);
  assert.equal(auth.disabledModeSecret, "");
  assert.equal(storage.has("_adm_s"), false);
  assert.equal(auth.csrfToken, "csrf");
});

test("session expiry while retrying step-up does not retry the mutation again", async () => {
  let mutationCalls = 0;
  let expired = false;
  const auth = new AdminAuthController(async (input) => {
    if (String(input).endsWith("/step-up")) return json({ ok: true });
    mutationCalls++;
    return mutationCalls === 1 ? json({ error: "step_up_required" }, 403) : json({ error: "admin_session_expired" }, 401);
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  auth.onSessionExpired = () => { expired = true; };
  await assert.rejects(auth.request("/admin/fs3-costs", { method: "POST" }), AdminSessionExpiredError);
  assert.equal(mutationCalls, 2);
  assert.equal(expired, true);
});

test("session expiry from the step-up endpoint clears session before retrying", async () => {
  let mutations = 0;
  let expired = false;
  const auth = new AdminAuthController(async (input) => {
    if (String(input).endsWith("/step-up")) return json({ error: "admin_session_expired" }, 401);
    mutations++;
    return json({ error: "step_up_required" }, 403);
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  auth.onSessionExpired = () => { expired = true; };
  await assert.rejects(auth.request("/admin/fs3-costs", { method: "POST" }), AdminSessionExpiredError);
  assert.equal(mutations, 1);
  assert.equal(expired, true);
  assert.equal(auth.csrfToken, "");
});

test("step-up expiry uninstalls the enabled-mode fetch interceptor", async () => {
  let originalCalls = 0;
  const auth = new AdminAuthController(async (input) =>
    String(input).endsWith("/step-up") ? json({ error: "admin_session_expired" }, 401) : json({ error: "step_up_required" }, 403));
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  const target = { fetch: async () => { originalCalls++; return json({ original: true }); } } as typeof globalThis;
  auth.installFetchInterceptor(target);
  await assert.rejects(target.fetch("/api/admin/fs3-costs", { method: "POST" }), AdminSessionExpiredError);
  await target.fetch("/api/admin/fs3-costs", { method: "POST" });
  assert.equal(originalCalls, 1);
});

test("invalid step-up TOTP Unauthorized preserves session and interceptor for retry", async () => {
  let originalCalls = 0;
  let expired = false;
  const auth = new AdminAuthController(async (input) =>
    String(input).endsWith("/step-up") ? json({ error: "Unauthorized" }, 401) : json({ error: "step_up_required" }, 403));
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "000000");
  auth.onSessionExpired = () => { expired = true; };
  const target = { fetch: async () => { originalCalls++; return json({ original: true }); } } as typeof globalThis;
  auth.installFetchInterceptor(target);
  await assert.rejects(target.fetch("/api/admin/fs3-costs", { method: "POST" }), AdminApiError);
  assert.equal(expired, false);
  assert.equal(auth.csrfToken, "csrf");
  await assert.rejects(target.fetch("/api/admin/fs3-costs", { method: "POST" }), AdminApiError);
  assert.equal(originalCalls, 0);
});

test("generic Unauthorized from an admin tab does not erase the admin session", async () => {
  let expired = false;
  const auth = new AdminAuthController(async () => json({ error: "Unauthorized" }, 401));
  auth.setMode(true);
  auth.setCsrfToken("still-valid");
  auth.onSessionExpired = () => { expired = true; };

  const response = await auth.request("/admin/legacy-tab-data");

  assert.equal(response.status, 401);
  assert.equal(expired, false);
  assert.equal(auth.csrfToken, "still-valid");
});

test("confirmation metadata is local UI data and not included in backend assertion", async () => {
  let stepUpBody: any;
  let shownConfirmation: any;
  const auth = new AdminAuthController(async (input, init) => {
    if (String(input).endsWith("/step-up")) {
      stepUpBody = JSON.parse(String(init?.body));
      return json({ assertion: "assertion" });
    }
    return json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async binding => { shownConfirmation = binding?.confirmation; return "123456"; });
  auth.setActionConfirmation("wallet.address.update", "wallet.primary", { before: "Configured ••••1111", after: "Configured ••••2222" });
  const binding = { action: "wallet.address.update", target: "wallet.primary", payload: { walletAddress: "0x2222" } };
  await auth.request("/admin/wallet-address", { method: "POST" }, binding);
  assert.deepEqual(stepUpBody, { code: "123456", action: binding.action, target: binding.target, payload: binding.payload });
  assert.deepEqual(shownConfirmation, { before: "Configured ••••1111", after: "Configured ••••2222" });
});

test("session expiry clears auth and is surfaced to the UI", async () => {
  let expired = false;
  const auth = new AdminAuthController(async () => json({ error: "admin_session_expired" }, 401));
  auth.setMode(true);
  auth.onSessionExpired = () => { expired = true; };
  await assert.rejects(auth.request("/admin/orders"), AdminSessionExpiredError);
  assert.equal(expired, true);
});

test("disable returns the controller to shared-secret mode", async () => {
  const auth = new AdminAuthController(async (input) =>
    String(input).endsWith("/step-up") ? json({ assertion: "assertion" }) : json({ ok: true }));
  auth.setMode(true);
  auth.setCsrfToken("csrf");
  auth.setStepUpHandler(async () => "123456");
  await auth.disable();
  assert.equal(auth.twoFactorEnabled, false);
  assert.equal(auth.csrfToken, "");
});

test("enabled interceptor authenticates intl-shipping mutations carrying admin secret", async () => {
  let seen: { url: string; init?: RequestInit } | undefined;
  const auth = new AdminAuthController(async (input, init) => {
    seen = { url: String(input), init };
    return json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf");
  const target = { fetch: async () => json({ original: true }) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/intl-shipping/zones/1", {
    method: "PATCH",
    headers: { "x-admin-secret": "must-strip", "content-type": "application/json" },
    body: "{}",
  });
  uninstall();
  assert.equal(seen?.url, "/api/intl-shipping/zones/1");
  assert.equal(seen?.init?.credentials, "include");
  assert.equal(new Headers(seen?.init?.headers).has("x-admin-secret"), false);
  assert.equal(new Headers(seen?.init?.headers).get("x-admin-csrf"), "csrf");
});

test("admin impersonation mutations retain identity header and support action binding hook", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    calls.push({ url: String(input), init });
    return String(input).endsWith("/step-up") ? json({ assertion: "bound" }) : json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  auth.setActionBindingResolver((path) => path === "/api/reshipper/me"
    ? { action: "reshipper.payment-destination.update", target: "reshipper:alice", payload: { paypalHandle: "redacted@example" } }
    : undefined);
  const target = { fetch: async () => json({ original: true }) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/reshipper/me", {
    method: "PATCH",
    headers: { "x-admin-secret": "must-strip", "x-impersonate-username": "alice" },
    body: JSON.stringify({ paypalHandle: "redacted@example" }),
  });
  uninstall();
  const mutation = calls.at(-1)!;
  assert.equal(new Headers(mutation.init?.headers).get("x-impersonate-username"), "alice");
  assert.equal(new Headers(mutation.init?.headers).get("x-admin-action-assertion"), "bound");
  assert.equal(new Headers(mutation.init?.headers).has("x-admin-secret"), false);
});

test("Admin FS3 and P&L contain no retired static-password gate", async () => {
  const source = await readFile(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("/admin/fs3-verify"), false);
  assert.equal(source.includes("FS3 password"), false);
});

test("default transport captures native fetch before installing the interceptor", async () => {
  const source = await readFile(new URL("./admin-auth.ts", import.meta.url), "utf8");
  assert.match(source, /this\.fetcher = fetcher \?\? globalThis\.fetch\.bind\(globalThis\)/);

  const originalFetch = globalThis.fetch;
  let nativeCalls = 0;
  globalThis.fetch = async () => {
    nativeCalls++;
    return json({ ok: true });
  };
  try {
    const auth = new AdminAuthController();
    auth.setMode(true);
    const uninstall = auth.installFetchInterceptor();
    const response = await globalThis.fetch("/api/admin/dashboard");
    uninstall();
    assert.equal(response.status, 200);
    assert.equal(nativeCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});