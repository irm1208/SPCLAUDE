# Discord username and password setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let existing Discord-linked accounts create a password and choose a site login username through an optional post-login prompt and Account Settings.

**Architecture:** Expose computed account credential flags without returning hashes. Redirect incomplete Discord logins to the existing Profile section, render one reusable two-step setup component there and in the secondary profile screen, and reuse the existing authenticated password and username-change endpoints. Do not create another account identifier or modify the transactional rename workflow.

**Tech Stack:** Express, Drizzle, bcrypt, React, React Query, TypeScript, Vitest, Node test runner via tsx.

**Approved spec:** `docs/superpowers/specs/2026-10-02-discord-password-login-design.md`

## Execution setup

Use the existing ignored `.worktrees` directory and a feature branch for implementation. Before creating links, verify ignore rules for root and package-level `node_modules`; follow the worktree-dependency memory note. Use existing dependencies, with no package installation or database migration.

Run these existing baseline tests before editing:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/discord-login.integration.test.ts src/routes/account-verification-auth.integration.test.ts
pnpm --filter @workspace/peps-anonymous test
```

Expected: the targeted API tests and configured frontend test suite pass.

### Task 1: Expose credential readiness and route incomplete Discord logins

**Files:**
- Modify: `artifacts/api-server/src/routes/account.ts`
- Modify: `artifacts/api-server/src/routes/discord.ts`
- Modify: `artifacts/api-server/src/routes/account-verification-auth.integration.test.ts`
- Modify: `artifacts/api-server/src/routes/discord-login.integration.test.ts`

- [ ] **Step 1: Add account response and password-login regression coverage**

In `account-verification-auth.integration.test.ts`, import `bcrypt` from `"bcryptjs"`. Extend the mock query with `innerJoin() { return query; }`. In its account row results, return the existing account plus the computed booleans:

```ts
const accountRows = state.account ? [{
  ...state.account,
  hasPassword: state.account.passwordHash != null,
  discordLinked: state.account.discordId != null,
}] : [];
```

Use `accountRows` for account results in both `limit` and `then`. Replace the mock update method with:

```ts
update(table: unknown) {
  return {
    set(patch: Record<string, unknown>) {
      return {
        where: async () => {
          if (getTableName(table as never) === "accounts" && state.account) {
            Object.assign(state.account, patch);
          }
        },
      };
    },
  };
},
```

Track account identifier matching inside the select query so the password-login test does not accept an unrelated username. Declare `let accountMatches = true;` alongside the existing `table` variable. Replace its `where()` method with:

```ts
where(condition: { queryChunks?: Array<{ value?: unknown }> }) {
  const identifier = condition.queryChunks?.find(chunk => typeof chunk.value === "string")?.value;
  if (table === "accounts" && typeof identifier === "string") {
    accountMatches = identifier === state.account?.telegramUsername;
  }
  return query;
},
```

Include `accountMatches` in the `accountRows` condition: `state.account && accountMatches`.

Extend the existing `request` helper signature to:

```ts
async function request(
  path: string,
  token: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
) {
```

Use these full request options in that helper, retaining its existing Express server and cleanup:

```ts
const body = options.body ?? (
  path.includes("email/confirm") ? { code: "123456" } : undefined
);
const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
  method: options.method ?? (
    path.includes("link-init") || path.includes("email/confirm") ? "POST" : "GET"
  ),
  headers: {
    Cookie: `account_session=${token}`,
    ...(body ? { "Content-Type": "application/json" } : {}),
  },
  body: body ? JSON.stringify(body) : undefined,
});
```

Add `accountStatus: "active"`, `passwordHash: null`, and `discordId: null` to the existing account fixture. Keep the existing verification fixture fields and tests.

Add these tests:

```ts
it("returns credential booleans without exposing a password hash", async () => {
  state.account.verificationRequiredAt = null;
  state.account.discordId = "42";
  const absent = await request("/account/me", token(false));
  expect(absent.status).toBe(200);
  expect(absent.body).toMatchObject({ hasPassword: false, discordLinked: true });
  expect(absent.body).not.toHaveProperty("passwordHash");
  state.account.passwordHash = await bcrypt.hash("SafePassword9!", 4);
  const present = await request("/account/me", token(false));
  expect(present.body.hasPassword).toBe(true);
  expect(JSON.stringify(present.body)).not.toContain(state.account.passwordHash);
});

it("sets a first password without requesting a nonexistent current password", async () => {
  state.account.verificationRequiredAt = null;
  const result = await request("/account/set-password", token(false), {
    method: "POST", body: { password: "SafePassword9!" },
  });
  expect(result.status).toBe(200);
  expect(await bcrypt.compare("SafePassword9!", state.account.passwordHash)).toBe(true);
});

it("does not replace an existing password without the correct current password", async () => {
  state.account.verificationRequiredAt = null;
  state.account.passwordHash = await bcrypt.hash("OldPassword9!", 4);
  const originalHash = state.account.passwordHash;
  for (const currentPassword of [undefined, "WrongPassword9!"]) {
    const result = await request("/account/set-password", token(false), {
      method: "POST", body: { password: "NewPassword9!", currentPassword },
    });
    expect(result.status).toBe(currentPassword ? 401 : 400);
    expect(state.account.passwordHash).toBe(originalHash);
  }
});

it("accepts a site's chosen username and password through normal login", async () => {
  state.account.verificationRequiredAt = null;
  state.account.telegramUsername = "chosen_name";
  state.account.passwordHash = await bcrypt.hash("SafePassword9!", 4);
  const result = await request("/account/smart-login", token(false), {
    method: "POST",
    body: { telegramUsername: "chosen_name", credential: "SafePassword9!" },
  });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({
    ok: true, telegramUsername: "chosen_name", loginMethod: "password",
  });
  expect(result.setCookie).toContain("account_session=");
  const previousIdentifier = await request("/account/smart-login", token(false), {
    method: "POST",
    body: { telegramUsername: "discord:42", credential: "SafePassword9!" },
  });
  expect(previousIdentifier.status).toBe(401);
});
```

- [ ] **Step 2: Add Discord redirect and renamed-account regression tests**

In `discord-login.integration.test.ts`, add this field to the hoisted state:

```ts
linkedAccount: null as null | {
  telegramUsername: string; accountStatus: string; hasPassword: boolean;
},
issuedUsername: null as string | null,
```

Change its account select mock's `where` result to:

```ts
where: async () => state.linkedAccount ? [state.linkedAccount] : [],
```

Add `beforeEach` to the Vitest import, and reset `linkedAccount`, `accountWrites`, and `cookies` before each test. Preserve the existing unlinked-account rejection test.

Record the canonical identity in the existing cookie mock:

```ts
issueAccountCookieForAccount: async (_res: unknown, username: string) => {
  state.cookies += 1;
  state.issuedUsername = username;
},
```

Reset `issuedUsername` to `null` in the same `beforeEach`.

Add this helper and these tests:

```ts
async function discordCallback() {
  const app = express();
  app.use(discordRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const signedState = jwt.sign({ action: "login" }, "discord-test-secret");
    const { port } = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${port}/account/discord/oauth-callback?code=oauth-code&state=${encodeURIComponent(signedState)}`,
      { redirect: "manual" },
    );
    return { status: response.status, location: response.headers.get("location") };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

it.each([
  { telegramUsername: "discord:42", hasPassword: false },
  { telegramUsername: "discord:42", hasPassword: true },
  { telegramUsername: "chosen_name", hasPassword: false },
])("offers setup for incomplete linked account %j", async account => {
  state.linkedAccount = { ...account, accountStatus: "active" };
  expect(await discordCallback()).toEqual({
    status: 302, location: "/account?s=profile&discord_setup=1",
  });
  expect(state.cookies).toBe(1);
});

it("keeps Discord login working after the site username has been renamed", async () => {
  state.linkedAccount = {
    telegramUsername: "chosen_name", hasPassword: true, accountStatus: "active",
  };
  expect(await discordCallback()).toEqual({ status: 302, location: "/account" });
  expect(state.cookies).toBe(1);
  expect(state.issuedUsername).toBe("chosen_name");
});

it("does not show setup or issue a session for a suspended linked account", async () => {
  state.linkedAccount = {
    telegramUsername: "discord:42", hasPassword: false, accountStatus: "suspended",
  };
  const result = await discordCallback();
  expect(result.location).toContain("/login?discord_error=");
  expect(state.cookies).toBe(0);
});
```

- [ ] **Step 3: Run the failing tests**

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/discord-login.integration.test.ts src/routes/account-verification-auth.integration.test.ts
```

Expected: new account-flag and incomplete-Discord-redirect assertions fail because these behaviors are absent. Existing authentication/verification/password checks must still pass; fixture errors are not a valid red result.

- [ ] **Step 4: Implement the computed flags and presentation redirect**

In `/account/me`'s account projection add:

```ts
hasPassword: sql<boolean>`${accountsTable.passwordHash} IS NOT NULL`,
discordLinked: sql<boolean>`${accountsTable.discordId} IS NOT NULL`,
```

In its JSON response add:

```ts
hasPassword: acct?.hasPassword === true,
discordLinked: acct?.discordLinked === true,
```

In `discord.ts`, change the Drizzle import to `import { eq, sql } from "drizzle-orm";`. Add the following to the login account projection, retaining `telegramUsername` and `accountStatus`:

```ts
hasPassword: sql<boolean>`${accountsTable.passwordHash} IS NOT NULL`,
```

Replace only the successful login's `res.redirect("/account")` with:

```ts
const needsCredentialSetup = !byDiscord.hasPassword
  || byDiscord.telegramUsername.replace(/^@/, "").startsWith("discord:");
res.redirect(needsCredentialSetup
  ? "/account?s=profile&discord_setup=1"
  : "/account");
```

Keep session issuance before the redirect, and preserve unlinked, suspended, connect, and verification behavior. The marker is a UI hint, not authorization.

- [ ] **Step 5: Run API tests and commit**

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/discord-login.integration.test.ts src/routes/account-verification-auth.integration.test.ts src/routes/public-registration.integration.test.ts src/middleware/account-auth.test.ts
git diff --check
git add artifacts/api-server/src/routes/account.ts artifacts/api-server/src/routes/discord.ts artifacts/api-server/src/routes/account-verification-auth.integration.test.ts artifacts/api-server/src/routes/discord-login.integration.test.ts
git commit -m "feat: expose Discord credential setup readiness"
```

Expected: selected tests pass. There are no schema changes and no password hashes in response data.

### Task 2: Build the reusable, testable two-step setup

**Files:**
- Create: `artifacts/peps-anonymous/src/lib/discord-credentials-setup.ts`
- Create: `artifacts/peps-anonymous/src/lib/discord-credentials-setup.test.ts`
- Create: `artifacts/peps-anonymous/src/components/account/DiscordCredentialsSetup.tsx`
- Create: `artifacts/peps-anonymous/src/components/account/DiscordCredentialsSetup.test.tsx`
- Modify: `artifacts/peps-anonymous/src/hooks/use-account.ts`

- [ ] **Step 1: Write failing state and request tests**

Create `discord-credentials-setup.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getDiscordSetupStep, submitDiscordSetup } from "./discord-credentials-setup";

test("only incomplete, known Discord-linked account states need setup", () => {
  const base = { telegramUsername: "discord:42", discordLinked: true };
  assert.equal(getDiscordSetupStep({ ...base, hasPassword: false }), "password");
  assert.equal(getDiscordSetupStep({ ...base, hasPassword: true }), "username");
  assert.equal(getDiscordSetupStep({ ...base, telegramUsername: "chosen", hasPassword: false }), "password");
  assert.equal(getDiscordSetupStep({ ...base, telegramUsername: "chosen", hasPassword: true }), "complete");
  assert.equal(getDiscordSetupStep({ ...base, discordLinked: false, hasPassword: false }), "complete");
  assert.equal(getDiscordSetupStep(base), "complete");
  assert.equal(getDiscordSetupStep(null), "complete");
});

test("first-password submission does not send a current password", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fakeFetch = async (url: string, options: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(options.body)) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  await submitDiscordSetup("password", { password: "SafePassword9!" }, fakeFetch);
  assert.deepEqual(calls, [{
    url: "/api/account/set-password", body: { password: "SafePassword9!" },
  }]);
});

test("a rejected username can be retried without repeating password creation", async () => {
  const paths: string[] = [];
  let attempts = 0;
  const fakeFetch = async (url: string) => {
    paths.push(url);
    attempts += 1;
    return new Response(JSON.stringify(attempts === 1
      ? { error: "That username is already taken" }
      : { ok: true, newUsername: "available_name" }), {
      status: attempts === 1 ? 409 : 200,
    });
  };
  const fields = { newUsername: "taken_name", currentPassword: "SafePassword9!" };
  await assert.rejects(submitDiscordSetup("username", fields, fakeFetch), /already taken/);
  await submitDiscordSetup("username", { ...fields, newUsername: "available_name" }, fakeFetch);
  assert.deepEqual(paths, ["/api/account/change-username", "/api/account/change-username"]);
});
```

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/lib/discord-credentials-setup.test.ts
```

Expected: module-not-found failure before the implementation exists.

- [ ] **Step 2: Add the model and request adapter**

Create `discord-credentials-setup.ts`:

```ts
export type SetupAccount = {
  telegramUsername: string;
  hasPassword?: boolean;
  discordLinked?: boolean;
};
export type DiscordSetupStep = "password" | "username" | "complete";

export function getDiscordSetupStep(account: SetupAccount | null | undefined): DiscordSetupStep {
  if (!account?.discordLinked || typeof account.hasPassword !== "boolean") return "complete";
  if (!account.hasPassword) return "password";
  return account.telegramUsername.replace(/^@/, "").startsWith("discord:")
    ? "username" : "complete";
}

export async function submitDiscordSetup(
  step: Exclude<DiscordSetupStep, "complete">,
  fields: { password?: string; newUsername?: string; currentPassword?: string },
  request: (url: string, options: RequestInit) => Promise<Response> = fetch,
): Promise<{ ok: boolean; newUsername?: string }> {
  const path = step === "password" ? "set-password" : "change-username";
  const body = step === "password"
    ? { password: fields.password }
    : { newUsername: fields.newUsername, currentPassword: fields.currentPassword };
  const response = await request(`/api/account/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Could not save your login details");
  }
  return result;
}
```

Add `hasPassword?: boolean;` and `discordLinked?: boolean;` to `AccountMe`.

- [ ] **Step 3: Write failing rendered-state tests**

Create `DiscordCredentialsSetup.test.tsx`:

```tsx
import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiscordCredentialsSetup } from "./DiscordCredentialsSetup";

function render(hasPassword: boolean, username = "discord:42", skip = false) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <DiscordCredentialsSetup
        account={{ telegramUsername: username, discordLinked: true, hasPassword }}
        onSkip={skip ? () => undefined : undefined}
      />
    </QueryClientProvider>,
  );
}
test("first setup asks for a new password, not a current password", () => {
  const html = render(false);
  assert.match(html, /Create a password/);
  assert.match(html, /Confirm password/);
  assert.doesNotMatch(html, /Current password/);
});
test("the username step requires the established password", () => {
  const html = render(true, "discord:42", true);
  assert.match(html, /Choose your site username/);
  assert.match(html, /Current password/);
  assert.match(html, /Skip for now/);
});
test("completed setup disappears and ordinary settings have no skip action", () => {
  assert.equal(render(true, "chosen_name"), "");
  assert.doesNotMatch(render(false), /Skip for now/);
});
```

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/components/account/DiscordCredentialsSetup.test.tsx
```

Expected: missing-component failure.

- [ ] **Step 4: Implement the shared component**

Create `DiscordCredentialsSetup.tsx`:

```tsx
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AccountMe } from "../../hooks/use-account";
import { getDiscordSetupStep, submitDiscordSetup } from "../../lib/discord-credentials-setup";

export function DiscordCredentialsSetup({
  account, onSkip,
}: { account: AccountMe; onSkip?: () => void }) {
  const qc = useQueryClient();
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const step = getDiscordSetupStep({
    ...account, hasPassword: passwordCreated ? true : account.hasPassword,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || step === "complete") return;
    setMessage(null);
    if (step === "password" && password !== confirmation) {
      setMessage({ ok: false, text: "Passwords do not match" });
      return;
    }
    setBusy(true);
    try {
      await submitDiscordSetup(step, step === "password"
        ? { password }
        : { newUsername: username.trim(), currentPassword: password });
      setPassword("");
      setConfirmation("");
      if (step === "password") {
        setPasswordCreated(true);
        qc.setQueryData<AccountMe | null>(["account", "me"], previous =>
          previous?.telegramUsername === account.telegramUsername
            ? { ...previous, hasPassword: true } : previous);
        void qc.invalidateQueries({ queryKey: ["account", "me"] });
        setMessage({ ok: true, text: account.telegramUsername.replace(/^@/, "").startsWith("discord:")
          ? "Password saved. Choose your site username below."
          : "Password saved. You can now use your site username and password to sign in." });
      } else {
        window.location.replace("/account?s=profile");
      }
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save login details" });
    } finally {
      setBusy(false);
    }
  }

  if (step === "complete" && !message) return null;
  const inputClass = "w-full h-11 rounded-xl border px-4 text-sm";
  const inputStyle = { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" };
  return (
    <section className="rounded-2xl p-5 space-y-3"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
        {step === "password" ? "Create a password" : step === "username"
          ? "Choose your site username" : "Password login enabled"}
      </h3>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Sign in without Discord. Your Discord connection stays linked, and this does not change your name on Discord.
      </p>
      {message && <p role={message.ok ? "status" : "alert"} className="text-xs"
        style={{ color: message.ok ? "var(--t-text)" : "#DC2626" }}>{message.text}</p>}
      {step !== "complete" && <form onSubmit={submit} className="space-y-3">
        {step === "username" && <label className="block text-xs">
          Site username
          <input className={inputClass} style={inputStyle} value={username}
            onChange={event => setUsername(event.target.value.replace(/^@+/, ""))}
            autoComplete="username" minLength={3} maxLength={64}
            pattern="[a-zA-Z0-9_]+" required disabled={busy} />
          <span style={{ color: "var(--t-muted)" }}>3–64 letters, numbers, or underscores.</span>
        </label>}
        <label className="block text-xs">
          {step === "password" ? "New password" : "Current password"}
          <input className={inputClass} style={inputStyle} type="password" value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={step === "password" ? "new-password" : "current-password"}
            minLength={step === "password" ? 8 : undefined} required disabled={busy} />
        </label>
        {step === "password" && <>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            At least 8 characters, including a number or special character.
          </p>
          <label className="block text-xs">
            Confirm password
            <input className={inputClass} style={inputStyle} type="password"
              value={confirmation} onChange={event => setConfirmation(event.target.value)}
              autoComplete="new-password" required disabled={busy} />
          </label>
        </>}
        <button type="submit" disabled={busy} className="w-full h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
          {busy ? "Saving…" : step === "password" ? "Create password" : "Save site username"}
        </button>
        {onSkip && <button type="button" onClick={onSkip} disabled={busy}
          className="w-full h-11 text-sm" style={{ color: "var(--t-muted)" }}>Skip for now</button>}
      </form>}
    </section>
  );
}
```

The component must be keyed by the current canonical account identifier at every host to avoid carrying another account's local state across account switches. Do not store form credentials in storage or retain the new password for the next step.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/lib/discord-credentials-setup.test.ts src/components/account/DiscordCredentialsSetup.test.tsx
git diff --check
git add artifacts/peps-anonymous/src/lib/discord-credentials-setup.ts artifacts/peps-anonymous/src/lib/discord-credentials-setup.test.ts artifacts/peps-anonymous/src/components/account/DiscordCredentialsSetup.tsx artifacts/peps-anonymous/src/components/account/DiscordCredentialsSetup.test.tsx artifacts/peps-anonymous/src/hooks/use-account.ts
git commit -m "feat: add Discord password and username setup component"
```

Expected: state, request, retry, and rendered-state tests pass.

### Task 3: Integrate both profile surfaces and verify the complete flow

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/CustomerPortal.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/AccountOrders.tsx`
- Create: `artifacts/peps-anonymous/src/pages/discord-credentials-settings.test.ts`

- [ ] **Step 1: Add failing host integration contracts**

Create `discord-credentials-settings.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const portal = readFileSync(new URL("./CustomerPortal.tsx", import.meta.url), "utf8");
const secondary = readFileSync(new URL("./AccountOrders.tsx", import.meta.url), "utf8");
test("main settings host the shared setup and a post-login skip action", () => {
  assert.match(portal, /<DiscordCredentialsSetup/);
  assert.match(portal, /get\("discord_setup"\) === "1"/);
  assert.match(portal, /onSkip=/);
  assert.match(portal, /hidden=\{needsDiscordSetup\}/);
});
test("secondary profile uses the same setup without claiming identity is immutable", () => {
  assert.match(secondary, /<DiscordCredentialsSetup/);
  assert.match(secondary, /hidden=\{needsDiscordSetup\}/);
  assert.match(secondary, /Manage your site login in Account Settings/);
});
```

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/discord-credentials-settings.test.ts
```

Expected: both tests fail because the shared component is not integrated.

- [ ] **Step 2: Integrate the main Profile section**

Add these imports to `CustomerPortal.tsx`:

```tsx
import { DiscordCredentialsSetup } from "@/components/account/DiscordCredentialsSetup";
import { getDiscordSetupStep } from "@/lib/discord-credentials-setup";
```

After its existing `useAccount()` declaration, add:

```tsx
const needsDiscordSetup = getDiscordSetupStep(account) !== "complete";
const cameFromDiscordSetup = _searchParams.get("discord_setup") === "1";
```

In the Profile section, insert this before the existing Change Username block:

```tsx
{account && <DiscordCredentialsSetup
  key={account.telegramUsername}
  account={account}
  onSkip={cameFromDiscordSetup ? () => setLocation("/account?s=home") : undefined}
/>}
```

Add `hidden={needsDiscordSetup}` to the existing Change Username and Change Password `motion.div` root elements. Keep their handlers and content untouched for completed and ordinary accounts. Successful setup refreshes the full account page after username change; no manual account-reference migration belongs in the client.

- [ ] **Step 3: Integrate the secondary Profile tab**

Add the same two imports to `AccountOrders.tsx`. In `ProfileTab`, after `useAccount()`, add:

```tsx
const needsDiscordSetup = getDiscordSetupStep(account) !== "complete";
```

Before its existing password form, add:

```tsx
{account && <DiscordCredentialsSetup key={account.telegramUsername} account={account} />}
```

Add `hidden={needsDiscordSetup}` to the existing password form. Replace only the identity-label and immutable-identity explanation expressions with:

```tsx
{isDiscord ? "Discord Username" : account?.discordLinked ? "Site login username" : "Telegram Username"}
```

```tsx
{account?.discordLinked
  ? "Manage your site login in Account Settings."
  : "This is your account identity and cannot be changed"}
```

- [ ] **Step 4: Verify the coherent feature**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/lib/discord-credentials-setup.test.ts src/components/account/DiscordCredentialsSetup.test.tsx src/pages/discord-credentials-settings.test.ts
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/api-server exec vitest run src/routes/discord-login.integration.test.ts src/routes/account-verification-auth.integration.test.ts src/routes/public-registration.integration.test.ts src/middleware/account-auth.test.ts
pnpm --filter @workspace/peps-anonymous run build
pnpm --filter @workspace/api-server run build:compile
git diff --check
```

Expected: all selected tests and both builds pass. Use `build:compile`, not the API's schema-pushing `build` command. Review the diff to confirm the existing username-change transaction, Discord provider linkage, current-password verification, and verification gates were not replaced.

For signed-in browser verification when available: inspect the passwordless prompt, skip back to account home, return through Profile, create a password, observe the username step, reject a taken name, retry another name, verify the renamed identity and unchanged records, then confirm password and Discord sign-in. Also inspect a completed account and a non-Discord account for unwanted prompts. Never bypass authentication to obtain a screenshot; report any signed-in visual verification limitation.

- [ ] **Step 5: Commit and finish the branch**

```bash
git add artifacts/peps-anonymous/src/pages/CustomerPortal.tsx artifacts/peps-anonymous/src/pages/AccountOrders.tsx artifacts/peps-anonymous/src/pages/discord-credentials-settings.test.ts
git commit -m "feat: offer Discord credential setup after login and in settings"
```

Follow the branch-finishing workflow for the user's chosen integration method. After integration into the main workspace, restart only the canonical `Start application` workflow once, check startup logs, and capture an accessible app preview. Remove the temporary worktree only after successful integration.