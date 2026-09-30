import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  AdminApiError,
  AdminAuthController,
  AdminSessionExpiredError,
  initializeAdminRequestAuth,
  isAdminAuthRejection,
  retryAdminAvailability,
} from "./admin-auth.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("status is fetched before issuing a short-lived legacy admin session", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    calls.push({ url: String(input), init });
    return calls.length === 1 ? json({ twoFactorEnabled: false }) : json({ ok: true });
  });
  await auth.initialize();
  await auth.loginWithSecret("bootstrap");
  assert.equal(calls[0]?.url, "/api/admin/security/status");
  assert.equal(calls[1]?.url, "/api/admin/auth/legacy-login");
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), { adminSecret: "bootstrap", rememberMe: false });
  assert.equal(calls[1]?.init?.credentials, "include");
});

test("remembered legacy admin authenticates with a cookie, never persists or resends the shared secret", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const items = new Map<string, string>();
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
  };
  const auth = new AdminAuthController(async (input, init) => {
    calls.push({ url: String(input), init });
    return json({ csrfToken: "legacy-csrf", username: "admin", rememberMe: true });
  }, storage);
  auth.setMode(false);
  await auth.loginWithSecret("private-password", true);
  assert.equal(calls[0]?.url, "/api/admin/auth/legacy-login");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { adminSecret: "private-password", rememberMe: true });
  assert.equal(items.size, 0);
  assert.equal(auth.disabledModeSecret, "");
  assert.equal(auth.rememberMe, true);
  await auth.request("/admin/orders", { method: "PATCH", headers: { "x-admin-secret": "private-password" } });
  assert.equal(calls[1]?.init?.credentials, "include");
  assert.equal(new Headers(calls[1]?.init?.headers).has("x-admin-secret"), false);
  assert.equal(new Headers(calls[1]?.init?.headers).get("x-admin-csrf"), "legacy-csrf");
  await auth.logout();
  assert.equal(calls[2]?.url, "/api/admin/auth/legacy-logout");
});

test("unchecked legacy login does not retain its password and removes older stored copies", async () => {
  const items = new Map<string, string>([["_adm_s", "previous-password"]]);
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
  };
  const auth = new AdminAuthController(async input =>
    String(input).endsWith("/security/status") ? json({ twoFactorEnabled: false }) : json({ ok: true }), storage);
  await auth.initialize();
  assert.equal(items.has("_adm_s"), false);
  assert.equal(auth.disabledModeSecret, "");
  await auth.loginWithSecret("current-password");
  assert.equal(auth.disabledModeSecret, "");
  assert.equal(auth.sessionBacked, true);
  assert.equal(items.has("_adm_s"), false);
});

test("restored legacy remembered session retains its CSRF and seven-day status", async () => {
  const auth = new AdminAuthController(async input => {
    assert.equal(String(input), "/api/admin/auth/legacy-me");
    return json({ username: "admin", csrfToken: "restored-csrf", rememberMe: true });
  });
  auth.setMode(false);
  await auth.restoreSession();
  assert.equal(auth.csrfToken, "restored-csrf");
  assert.equal(auth.rememberMe, true);
});

test("admin startup 503s retry and retain the enabled session", async () => {
  let statusCalls = 0;
  let sessionCalls = 0;
  const auth = new AdminAuthController(async input => {
    if (String(input).endsWith("/security/status")) {
      statusCalls++;
      return statusCalls < 3 ? json({ error: "Application is starting" }, 503) : json({ twoFactorEnabled: true });
    }
    sessionCalls++;
    return sessionCalls === 1 ? json({ error: "Application is starting" }, 503) : json({ username: "alice", csrfToken: "still-valid" });
  });
  const status = await retryAdminAvailability(() => auth.initialize(), undefined, 0);
  const identity = await retryAdminAvailability(() => auth.restoreSession(), undefined, 0);
  assert.equal(status.twoFactorEnabled, true);
  assert.equal(identity.username, "alice");
  assert.equal(auth.csrfToken, "still-valid");
  assert.equal(statusCalls, 3);
  assert.equal(sessionCalls, 2);
});

test("a genuine expired session is not retried, but temporary errors do not clear credentials", async () => {
  let calls = 0;
  const auth = new AdminAuthController(async () => {
    calls++;
    return json({ error: "admin_session_expired" }, 401);
  });
  auth.setMode(true);
  await assert.rejects(retryAdminAvailability(() => auth.restoreSession(), undefined, 0), AdminSessionExpiredError);
  assert.equal(calls, 1);
  assert.equal(isAdminAuthRejection(401), true);
  assert.equal(isAdminAuthRejection(403), true);
  assert.equal(isAdminAuthRejection(503), false);
});

test("a 503 during a session recheck does not expire the admin or discard CSRF", async () => {
  const auth = new AdminAuthController(async () => json({ error: "Application is starting" }, 503));
  auth.setMode(true);
  auth.setCsrfToken("existing-csrf");
  let expired = false;
  auth.onSessionExpired = () => { expired = true; };
  await assert.rejects(auth.restoreSession(), AdminApiError);
  assert.equal(expired, false);
  assert.equal(auth.csrfToken, "existing-csrf");
});

test("admin page does not log out on a temporary visibility-check failure", async () => {
  const source = await readFile(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /adminAuth\.restoreSession\(\)\.catch\(doLogout\)/);
  assert.doesNotMatch(source, /if \(!r\.ok\) doLogout\(\)/);
  assert.match(source, /retryAdminAvailability\(\(\) => adminAuth\.initialize\(\)/);
  assert.match(source, /isAdminAuthRejection\(r\.status\)/);
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
    { username: "alice", password: "correct horse battery", rememberMe: false },
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

test("standalone admin pages restore the 2FA session before making mutations", async () => {
  const calls: string[] = [];
  const auth = new AdminAuthController(async (input) => {
    calls.push(String(input));
    if (calls.length === 1) return json({ twoFactorEnabled: true });
    return json({ username: "alice", csrfToken: "receiver-csrf" });
  });

  await initializeAdminRequestAuth(auth, "legacy-secret");
  await auth.request("/admin/lab-tests/bookmarklet-import", { method: "POST" });

  assert.deepEqual(calls, [
    "/api/admin/security/status",
    "/api/admin/auth/me",
    "/api/admin/lab-tests/bookmarklet-import",
  ]);
  assert.equal(auth.csrfToken, "receiver-csrf");
});

test("Janoshik receiver uses the session-aware admin request path", async () => {
  const source = await readFile(new URL("../pages/JanoshikReceiver.tsx", import.meta.url), "utf8");
  assert.match(source, /initializeAdminRequestAuth\(adminAuth,/);
  assert.match(source, /adminAuth\.request\("\/admin\/lab-tests\/bookmarklet-import"/);
  assert.doesNotMatch(source, /fetch\("\/api\/admin\/lab-tests\/bookmarklet-import"/);
  assert.doesNotMatch(source, /d\.type === "janoshik-bulk-hello"[^\\n]+&& d\.secret\)/);
  assert.doesNotMatch(source, /d\.type !== "janoshik-helper-payload"[^\\n]+\|\| !d\.secret/);
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

test("organiser wallet updates bind the backend action with normalized wallet payload", async () => {
  const stepUps: any[] = [];
  const auth = new AdminAuthController(async (input, init) => {
    if (String(input).endsWith("/step-up")) {
      stepUps.push(JSON.parse(String(init?.body)));
      return json({ assertion: "wallet-assertion" });
    }
    return json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  const target = { fetch: (input: RequestInfo | URL, init?: RequestInit) => auth.request(String(input), init) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/admin/wholesale-shares/share-7/organiser-wallets", {
    method: "PUT",
    body: JSON.stringify({ wallets: [{ currency: "USDT", network: "ERC-20", walletAddress: "0xabc" }] }),
  });
  uninstall();
  assert.deepEqual(stepUps[0], {
    code: "123456",
    action: "wholesale-share.organiser-wallets.update",
    target: "share:share-7",
    payload: [{ currency: "USDT", network: "ERC-20", walletAddress: "0xabc" }],
  });
});

test("organiser wallet assertions drop incomplete rows like server normalization", async () => {
  const stepUps: any[] = [];
  const auth = new AdminAuthController(async (input, init) => {
    if (String(input).endsWith("/step-up")) {
      stepUps.push(JSON.parse(String(init?.body)));
      return json({ assertion: "wallet-assertion" });
    }
    return json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  const target = { fetch: (input: RequestInfo | URL, init?: RequestInit) => auth.request(String(input), init) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/admin/wholesale-shares/share-8/organiser-wallets", {
    method: "PUT",
    body: JSON.stringify({ wallets: [
      { currency: " usdt ", network: "ERC-20", walletAddress: " 0xabc " },
      { currency: "", network: "Solana", walletAddress: "missing-currency" },
      { currency: null, network: "Polygon", walletAddress: "missing-currency" },
      { currency: "ETH", network: "Ethereum", walletAddress: " 0xdef " },
    ] }),
  });
  uninstall();
  assert.deepEqual(stepUps[0]?.payload, [
    { currency: "USDT", network: "ERC-20", walletAddress: "0xabc" },
    { currency: "ETH", network: "Ethereum", walletAddress: "0xdef" },
  ]);
});

test("organiser wallet assertions skip binding for populated non-string fields", async () => {
  const stepUps: unknown[] = [];
  const auth = new AdminAuthController(async (input, init) => {
    if (String(input).endsWith("/step-up")) stepUps.push(JSON.parse(String(init?.body)));
    return json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  const target = { fetch: (input: RequestInfo | URL, init?: RequestInit) => auth.request(String(input), init) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/admin/wholesale-shares/share-9/organiser-wallets", {
    method: "PUT",
    body: JSON.stringify({ wallets: [{ currency: 42, network: "Ethereum", walletAddress: "0xabc" }] }),
  });
  uninstall();
  assert.equal(stepUps.length, 0);
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

test("both Admin View-as entry points use the centralized admin request path", async () => {
  const source = await readFile(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
  const centralizedCalls = source.match(/adminAuth\.request\("\/admin\/impersonate"/g) ?? [];
  assert.equal(centralizedCalls.length, 2);
  assert.doesNotMatch(source, /fetch\(apiUrl\("\/admin\/impersonate"\)/);
});

test("admin impersonation mutation uses session CSRF in enabled mode and shared secret in disabled mode", async () => {
  const calls: RequestInit[] = [];
  const auth = new AdminAuthController(async (_input, init) => {
    calls.push(init ?? {});
    return json({ token: "one-time" });
  });

  auth.setMode(true);
  auth.setCsrfToken("csrf");
  await auth.request("/admin/impersonate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-secret": "must-strip" },
    body: JSON.stringify({ telegramUsername: "alice" }),
  });

  auth.setMode(false);
  await auth.loginWithSecret("legacy-secret");
  await auth.request("/admin/impersonate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ telegramUsername: "bob" }),
  });

  const enabledHeaders = new Headers(calls[0]?.headers);
  assert.equal(calls[0]?.credentials, "include");
  assert.equal(enabledHeaders.get("x-admin-csrf"), "csrf");
  assert.equal(enabledHeaders.has("x-admin-secret"), false);

  const disabledHeaders = new Headers(calls[2]?.headers);
  assert.equal(calls[2]?.credentials, "include");
  assert.equal(disabledHeaders.has("x-admin-secret"), false);
});

test("admin logout retries once with the current cookie CSRF and fails closed if revocation fails", async () => {
  const requests: Array<{ path: string; csrf: string | null }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    const path = String(input);
    requests.push({ path, csrf: new Headers(init?.headers).get("x-admin-csrf") });
    if (path.endsWith("/legacy-login")) return json({ username: "admin", csrfToken: "legacy-csrf", rememberMe: true });
    if (path.endsWith("/legacy-me")) return json({ username: "admin", csrfToken: "fresh", rememberMe: true });
    return requests.filter(r => r.path.endsWith("/legacy-logout")).length === 1
      ? json({ error: "CSRF validation failed" }, 403) : json({ ok: true });
  });
  auth.setMode(false);
  await auth.loginWithSecret("private", true);
  await auth.logout();
  assert.deepEqual(requests.filter(r => r.path.endsWith("/legacy-logout")).map(r => r.csrf), ["legacy-csrf", "fresh"]);
  assert.equal(auth.sessionBacked, false);
});

test("a rejected admin logout retains authenticated state instead of pretending to sign out", async () => {
  const auth = new AdminAuthController(async input =>
    String(input).endsWith("/legacy-me")
      ? json({ username: "admin", csrfToken: "fresh", rememberMe: true })
      : String(input).endsWith("/legacy-logout")
        ? json({ error: "CSRF validation failed" }, 403)
        : json({ username: "admin", csrfToken: "original", rememberMe: true }));
  auth.setMode(false);
  await auth.loginWithSecret("private", true);
  await assert.rejects(auth.logout(), AdminApiError);
  assert.equal(auth.sessionBacked, true);
  assert.equal(auth.csrfToken, "fresh");
});

test("admin impersonation payment destinations use exact built-in action bindings", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const auth = new AdminAuthController(async (input, init) => {
    calls.push({ url: String(input), init });
    return String(input).endsWith("/step-up") ? json({ assertion: "bound" }) : json({ ok: true });
  });
  auth.setMode(true); auth.setCsrfToken("csrf"); auth.setStepUpHandler(async () => "123456");
  const target = { fetch: async () => json({ original: true }) } as typeof globalThis;
  const uninstall = auth.installFetchInterceptor(target);
  await target.fetch("/api/reshipper/me", {
    method: "PATCH",
    headers: { "x-admin-secret": "must-strip", "x-impersonate-username": "alice" },
    body: JSON.stringify({ paypalHandle: "redacted@example" }),
  });
  await target.fetch("/api/reshipper/gb/gb-123/payment-details", {
    method: "PATCH",
    headers: { "x-admin-secret": "must-strip", "x-impersonate-username": "alice" },
    body: JSON.stringify({ revolutHandle: " @alice " }),
  });
  uninstall();
  const stepUps = calls.filter(call => call.url.endsWith("/step-up")).map(call => JSON.parse(String(call.init?.body)));
  assert.deepEqual(stepUps, [
    {
      code: "123456",
      action: "reshipper.payment-destination.update",
      target: "reshipper:alice",
      payload: { paypalHandle: "redacted@example" },
    },
    {
      code: "123456",
      action: "reshipper.assignment-payment-destination.update",
      target: "reshipper:alice:group-buy:gb-123",
      payload: { revolutHandle: "@alice" },
    },
  ]);
  for (const mutation of calls.filter(call => !call.url.endsWith("/step-up"))) {
    assert.equal(new Headers(mutation.init?.headers).get("x-impersonate-username"), "alice");
    assert.equal(new Headers(mutation.init?.headers).get("x-admin-action-assertion"), "bound");
    assert.equal(new Headers(mutation.init?.headers).has("x-admin-secret"), false);
  }
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