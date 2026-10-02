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

let createRoot: typeof import("react-dom/client").createRoot;
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
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const name of ["window", "document", "navigator", "location", "history", "addEventListener", "removeEventListener", "dispatchEvent", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "HTMLFormElement", "Event", "Node", "DOMException"]) {
    globals[name] = (dom.window as unknown as Record<string, unknown>)[name];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  originalWindow = globalThis.window;
  originalFetch = globalThis.fetch;
  createRoot = (await import("react-dom/client")).createRoot;
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
});

async function mount(account: AccountMe) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DiscordCredentialsSetup account={account} />
      </QueryClientProvider>,
    );
  });
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