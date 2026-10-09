import React from "react";
import { act } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @ts-expect-error jsdom is available through the workspace test harness but not declared by this package.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error @testing-library/dom is available through the workspace test harness but not declared by this package.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import { DiscordCredentialsSetup } from "./DiscordCredentialsSetup";
import type { AccountMe } from "../../hooks/use-account";
import { getAccountHandle } from "../../hooks/use-account";
import { LinkedDiscordIdentity } from "./LinkedDiscordIdentity";

let createRoot: typeof import("react-dom/client").createRoot;
let Router: typeof import("wouter").Router;
let DiscordLoginSetupModal: typeof import("./DiscordLoginSetupModal").DiscordLoginSetupModal;
let TelegramLoginSetup: typeof import("./DiscordLoginSetupModal").TelegramLoginSetup;
let dom: JSDOM;
let container: HTMLDivElement;
let root: Root | undefined;
let originalFetch: typeof fetch;
let originalWindow: Window & typeof globalThis;

const accountFixture: AccountMe = {
  telegramUsername: "discord:42",
  discordUsername: "PepsUser",
  verificationRequired: false,
  accountStatus: "active",
  hasPassword: false,
  discordLinked: true,
  discordId: "42",
};

function render(account: AccountMe, skip = false) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <DiscordCredentialsSetup
        account={account}
        onSkip={skip ? () => undefined : undefined}
      />
    </QueryClientProvider>,
  );
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const name of ["window", "document", "navigator", "location", "history", "addEventListener", "removeEventListener", "dispatchEvent", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "HTMLFormElement", "Event", "Node", "DOMException"]) {
    globals[name] = (dom.window as unknown as Record<string, unknown>)[name];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  for (const name of ["MutationObserver", "CustomEvent", "HTMLAnchorElement", "HTMLSelectElement", "HTMLTextAreaElement", "NodeFilter", "SVGElement"]) {
    globals[name] = (dom.window as unknown as Record<string, unknown>)[name];
  }
  globals.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globals.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globals.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globals.addEventListener = dom.window.addEventListener.bind(dom.window);
  globals.removeEventListener = dom.window.removeEventListener.bind(dom.window);
  globals.dispatchEvent = dom.window.dispatchEvent.bind(dom.window);
  originalWindow = globalThis.window;
  originalFetch = globalThis.fetch;
  createRoot = (await import("react-dom/client")).createRoot;
  // Radix captures document availability at module load; import only after DOM
  // setup so its portal/layout effects behave as they do in the browser.
  Router = (await import("wouter")).Router;
  ({ DiscordLoginSetupModal, TelegramLoginSetup } = await import("./DiscordLoginSetupModal"));
});

after(() => {
  dom.window.close();
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

afterEach(async () => {
  if (root) {
    const mountedRoot = root;
    await act(async () => mountedRoot.unmount());
    container.remove();
    root = undefined;
  }
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  dom.window.history.replaceState({}, "", "/");
});

async function mountChildren(children: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
      </QueryClientProvider>,
    );
  });
}

async function mount(account: AccountMe) {
  await mountChildren(<DiscordCredentialsSetup account={account} />);
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
}

function input(id: string): HTMLInputElement {
  const element = container.querySelector(`[data-testid="${id}"]`);
  assert.ok(element instanceof HTMLInputElement, `Expected ${id} input`);
  return element;
}

function changeInput(id: string, value: string) {
  const element = input(id);
  act(() => {
    fireEvent.change(element, { target: { value } });
    fireEvent.input(element, { target: { value } });
  });
}

async function submitForm() {
  const form = container.querySelector("form");
  assert.ok(form, "Expected setup form");
  await act(async () => {
    fireEvent.submit(form);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

test("first setup asks for a new password, not a current password", () => {
  const html = render(accountFixture);
  assert.match(html, /Create a password/);
  assert.match(html, /Confirm password/);
  assert.doesNotMatch(html, /Current password/);
});

test("the username step requires the established password", () => {
  const html = render({ ...accountFixture, hasPassword: true }, true);
  assert.match(html, /Choose your site username/);
  assert.match(html, /Current password/);
  assert.match(html, /Skip for now/);
});

test("completed setup disappears and ordinary settings have no skip action", () => {
  assert.equal(render({ ...accountFixture, telegramUsername: "chosen_name", hasPassword: true }), "");
  assert.doesNotMatch(render(accountFixture), /Skip for now/);
});

test("successful password creation clears both password fields and advances to username", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
  await mount(accountFixture);
  changeInput("input-discord-password", "SafePassword9!");
  changeInput("input-discord-password-confirmation", "SafePassword9!");
  await submitForm();
  assert.match(container.textContent ?? "", /Choose your site username/);
  assert.equal(input("input-discord-password").value, "");
  assert.equal(input("input-discord-site-username").value, "");
  assert.equal(container.querySelector('[data-testid="input-discord-password-confirmation"]'), null);
});

test("a username error keeps the established password available for retry", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
  await mount(accountFixture);
  changeInput("input-discord-password", "SafePassword9!");
  changeInput("input-discord-password-confirmation", "SafePassword9!");
  await submitForm();
  changeInput("input-discord-site-username", "taken_name");
  changeInput("input-discord-password", "SafePassword9!");
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "That username is already taken" }), { status: 409 });
  await submitForm();
  assert.match(container.textContent ?? "", /already taken/);
  assert.equal(input("input-discord-password").value, "SafePassword9!");
  assert.equal(input("input-discord-site-username").value, "taken_name");
});

test("successful username change clears fields and requests a full-page account refresh", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  let reloadTo: string | undefined;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options?.body)) });
    return new Response(JSON.stringify({ ok: true, newUsername: "available_name" }), { status: 200 });
  };
  await mount({ ...accountFixture, hasPassword: true });
  changeInput("input-discord-site-username", "available_name");
  changeInput("input-discord-password", "SafePassword9!");
  globalThis.window = new Proxy(originalWindow, {
    get(target, property) {
      if (property === "location") return { replace: (url: string) => { reloadTo = url; } };
      return Reflect.get(target, property, target);
    },
  });
  await submitForm();
  assert.deepEqual(calls, [{
    url: "/api/account/change-username",
    body: { newUsername: "available_name", currentPassword: "SafePassword9!" },
  }]);
  assert.equal(reloadTo, "/account?s=profile");
  assert.equal(input("input-discord-site-username").value, "");
  assert.equal(input("input-discord-password").value, "");
});

test("switching accounts resets form state", async () => {
  await mount(accountFixture);
  changeInput("input-discord-password", "AccountOne9!");
  await act(async () => {
    root?.render(
      <QueryClientProvider client={new QueryClient()}>
        <DiscordCredentialsSetup account={{ ...accountFixture, telegramUsername: "discord:84" }} />
      </QueryClientProvider>,
    );
  });
  assert.equal(input("input-discord-password").value, "");
});

test("Discord handles show the provider username, with the internal ID only in the linked section", () => {
  assert.equal(getAccountHandle(accountFixture), "PepsUser");
  assert.equal(getAccountHandle({ ...accountFixture, discordUsername: null }), "Discord member");
  const html = renderToStaticMarkup(<LinkedDiscordIdentity account={accountFixture} />);
  assert.match(html, /Linked Discord/);
  assert.match(html, /@PepsUser/);
  assert.match(html, /@discord:42/);
});

test("Telegram setup generates a real link and renders the bot deep link", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push(`${options?.method ?? "GET"} ${url}`);
    return new Response(JSON.stringify(String(url).endsWith("/link-init")
      ? { code: "AABBCCDD", expiresAt: new Date(Date.now() + 900000).toISOString(),
        deepLink: "https://t.me/example_bot?start=AABBCCDD", botUrl: "https://t.me/example_bot" }
      : { linked: false }), { status: 200 });
  };
  await mountChildren(<TelegramLoginSetup accountIdentifier="discord:42" />);
  await settle();
  const button = container.querySelector('[data-testid="discord-setup-link-telegram"]');
  assert.ok(button);
  await act(async () => { fireEvent.click(button); });
  await settle();
  const link = container.querySelector('[data-testid="discord-setup-open-telegram"]') as HTMLAnchorElement;
  assert.equal(link?.href, "https://t.me/example_bot?start=AABBCCDD");
  assert.ok(calls.includes("POST /api/account/telegram/link-init"));
  assert.match(container.textContent ?? "", /\/link AABBCCDD/);
});

test("Telegram setup reports link failures instead of claiming it connected", async () => {
  globalThis.fetch = async (url) => new Response(JSON.stringify(
    String(url).endsWith("/link-init") ? { error: "Bot unavailable" } : { linked: false }
  ), { status: String(url).endsWith("/link-init") ? 503 : 200 });
  await mountChildren(<TelegramLoginSetup accountIdentifier="discord:42" />);
  await settle();
  await act(async () => {
    fireEvent.click(container.querySelector('[data-testid="discord-setup-link-telegram"]')!);
  });
  await settle();
  assert.match(container.textContent ?? "", /Bot unavailable/);
  assert.doesNotMatch(container.textContent ?? "", /Telegram connected/);
});

test("Discord callback marker opens a popup immediately and skipping removes the marker", async () => {
  dom.window.history.replaceState({}, "", "/account?s=profile&discord_setup=1");
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith("/me") ? accountFixture : { linked: false }
  ), { status: 200 });
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  const modal = document.querySelector('[role="dialog"]');
  assert.ok(modal, "Expected a popup, not just an inline profile form");
  assert.match(modal.textContent ?? "", /Create a password/);
  assert.equal(modal.querySelector('[data-testid="discord-setup-progress"]')?.getAttribute("aria-label"), "Step 1 of 2");
  assert.doesNotMatch(modal.querySelector('[data-testid="discord-setup-step-content"]')?.textContent ?? "", /Link Telegram/);
  assert.ok(modal.querySelector('[data-testid="discord-setup-continue-discord"]'));
  await act(async () => {
    fireEvent.click(document.querySelector('[data-testid="discord-setup-continue-discord"]')!);
  });
  await settle();
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(new URLSearchParams(dom.window.location.search).has("discord_setup"), false);
});

test("skipping setup persists the choice before closing the popup", async () => {
  dom.window.history.replaceState({}, "", "/account?s=profile&discord_setup=1");
  const requests: Array<{ url: string; method: string }> = [];
  globalThis.fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/me")) return new Response(JSON.stringify(accountFixture), { status: 200 });
    requests.push({ url: path, method: init?.method ?? "GET" });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  await act(async () => {
    fireEvent.click(document.querySelector('[data-testid="discord-setup-continue-discord"]')!);
  });
  await settle();
  assert.deepEqual(requests, [{ url: "/api/account/discord/setup-skip", method: "POST" }]);
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test("keeps the setup open and reports an error if the skip choice cannot be saved", async () => {
  dom.window.history.replaceState({}, "", "/account?s=profile&discord_setup=1");
  globalThis.fetch = async url => {
    if (String(url).endsWith("/me")) return new Response(JSON.stringify(accountFixture), { status: 200 });
    return new Response(JSON.stringify({ error: "Could not save your choice" }), { status: 503 });
  };
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  await act(async () => {
    fireEvent.click(document.querySelector('[data-testid="discord-setup-continue-discord"]')!);
  });
  await settle();
  assert.ok(document.querySelector('[role="dialog"]'), "The dialog should remain open so the user can retry");
  assert.match(document.querySelector('[data-testid="discord-setup-skip-error"]')?.textContent ?? "", /Could not save your choice/);
});

test("returning Discord users with site credentials still see Telegram setup on sign-in", async () => {
  dom.window.history.replaceState({}, "", "/account?s=profile&discord_setup=1");
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith("/me") ? { ...accountFixture, telegramUsername: "chosen_name", hasPassword: true } : { linked: true }
  ), { status: 200 });
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  const modal = document.querySelector('[role="dialog"]');
  assert.ok(modal);
  assert.match(modal.textContent ?? "", /Username and password are ready/);
  assert.equal(modal.querySelector('[data-testid="discord-setup-progress"]')?.getAttribute("aria-label"), "Step 1 of 2");
  assert.doesNotMatch(modal.textContent ?? "", /Telegram connected/);
  assert.equal(document.querySelector('[data-testid="input-discord-password"]'), null);
  await act(async () => fireEvent.click(document.querySelector('[data-testid="discord-setup-next"]')!));
  await settle();
  assert.match(modal.textContent ?? "", /Telegram connected/);
});

test("guided setup shows only the active step and pins the Discord skip action", async () => {
  dom.window.history.replaceState({}, "", "/account?s=profile&discord_setup=1");
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith("/me") ? accountFixture : { linked: false }
  ), { status: 200 });
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  const modal = document.querySelector('[role="dialog"]');
  const stepContent = modal?.querySelector('[data-testid="discord-setup-step-content"]');
  const footer = modal?.querySelector('[data-testid="discord-setup-sticky-footer"]');
  assert.equal(modal?.querySelector('[data-testid="discord-setup-progress"]')?.getAttribute("aria-label"), "Step 1 of 2");
  assert.ok(stepContent);
  assert.match(stepContent.textContent ?? "", /Create a password/);
  assert.doesNotMatch(stepContent.textContent ?? "", /Link Telegram/);
  assert.ok(stepContent.querySelector('[data-testid="linked-discord-identity"]'));
  assert.match(stepContent.textContent ?? "", /@PepsUser/);
  assert.match(stepContent.textContent ?? "", /@discord:42/);
  assert.ok(footer, "Skip/continue actions should remain outside the scrolling step content");
  assert.ok(footer.querySelector('[data-testid="discord-setup-continue-discord"]'));
});

test("completed credentials advance to Telegram and the user can return to account details", async () => {
  dom.window.history.replaceState({}, "", "/account?s=profile&discord_setup=1");
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith("/me")
      ? { ...accountFixture, telegramUsername: "chosen_name", hasPassword: true }
      : { linked: false }
  ), { status: 200 });
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  assert.match(document.querySelector('[data-testid="discord-setup-step-content"]')?.textContent ?? "", /Username and password are ready/);
  await act(async () => fireEvent.click(document.querySelector('[data-testid="discord-setup-next"]')!));
  const stepContent = document.querySelector('[data-testid="discord-setup-step-content"]');
  assert.equal(document.querySelector('[data-testid="discord-setup-progress"]')?.getAttribute("aria-label"), "Step 2 of 2");
  assert.match(stepContent?.textContent ?? "", /Link Telegram/);
  assert.match(stepContent?.textContent ?? "", /Linked Discord/);
  await act(async () => fireEvent.click(document.querySelector('[data-testid="discord-setup-back"]')!));
  assert.equal(document.querySelector('[data-testid="discord-setup-progress"]')?.getAttribute("aria-label"), "Step 1 of 2");
});

test("ordinary account visits do not reopen the Discord popup", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(accountFixture), { status: 200 });
  await mountChildren(<Router><DiscordLoginSetupModal /></Router>);
  await settle();
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test("saving a site username inside the popup preserves the setup marker across identity refresh", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, newUsername: "new_member" }), { status: 200 });
  let navigatedTo = "";
  globalThis.window = new Proxy(originalWindow, {
    get(target, key) {
      if (key === "location") return { replace: (url: string) => { navigatedTo = url; } };
      return Reflect.get(target, key);
    },
  });
  await mountChildren(<DiscordCredentialsSetup account={{ ...accountFixture, hasPassword: true }}
    continuationUrl="/account?s=profile&discord_setup=1" />);
  changeInput("input-discord-site-username", "new_member");
  changeInput("input-discord-password", "existing-password");
  await submitForm();
  assert.equal(navigatedTo, "/account?s=profile&discord_setup=1");
});