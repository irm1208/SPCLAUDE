import React, { act } from "react";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
import { fireEvent } from "../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";

let StoreProfileTab: typeof import("./SellerDashboard").StoreProfileTab;
let SellerDashboard: typeof import("./SellerDashboard").default;
let createRoot: typeof import("react-dom/client").createRoot;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(nextResolve => { resolve = nextResolve; });
  return { promise, resolve };
}

function response(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 401,
    headers: { "Content-Type": "application/json" },
  });
}

const session = { vendorId: "seller-1", vendorName: "Verified Vials", token: "seller-token" };
const profile = {
  id: "seller-1",
  name: "Verified Vials",
  tagline: null,
  description: null,
  contactTelegram: null,
  country: null,
  shipsTo: null,
  rating: null,
  walletAddress: null,
  revolutLink: null,
  paypalLink: null,
};

async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

function passwordButton(container: HTMLElement): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(candidate =>
    candidate.textContent?.includes("Change password"),
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error("Password button not found");
  return button;
}

function setInput(container: HTMLElement, id: string, value: string) {
  const input = container.querySelector(`#${id}`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Input ${id} not found`);
  act(() => {
    fireEvent.change(input, { target: { value } });
    fireEvent.input(input, { target: { value } });
  });
}

async function renderProfile(
  fetchMock: ReturnType<typeof vi.fn>,
  onPasswordChanged = vi.fn(),
  sellerSession = session,
): Promise<{ container: HTMLElement; root: Root; onPasswordChanged: ReturnType<typeof vi.fn> }> {
  vi.stubGlobal("fetch", fetchMock);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(StoreProfileTab, { session: sellerSession, onPasswordChanged }),
    );
  });
  await settle();
  return { container, root, onPasswordChanged };
}

function profileFetch(passwordResponse: () => Promise<Response> | PromiseLike<Response>) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/profile")) return Promise.resolve(response(profile));
    if (url.endsWith("/shop-config")) return Promise.resolve(response({ membersOnly: false }));
    if (url.endsWith("/products")) return Promise.resolve(response([]));
    if (url.endsWith("/account/orders")) return Promise.resolve(response([]));
    return passwordResponse();
  });
}

function installDomGlobals(dom: JSDOM) {
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const name of ["window", "document", "navigator", "location", "history", "localStorage", "sessionStorage", "addEventListener", "removeEventListener", "dispatchEvent", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "HTMLFormElement", "Event", "Node", "DOMException"]) {
    globals[name] = (dom.window as unknown as Record<string, unknown>)[name];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
}

describe("seller self-service password change", () => {
  let dom: JSDOM;

  beforeAll(async () => {
    dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
    installDomGlobals(dom);
    createRoot = (await import("react-dom/client")).createRoot;
    StoreProfileTab = (await import("./SellerDashboard")).StoreProfileTab;
    SellerDashboard = (await import("./SellerDashboard")).default;
  });

  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    dom.window.close();
  });

  it("renders three labelled masked password inputs in the Profile tab", async () => {
    const fetchMock = profileFetch(() => Promise.resolve(response({ ok: true })));
    const { container, root } = await renderProfile(fetchMock);

    expect(container.querySelector('label[for="seller-password-current"]')?.textContent).toContain("Current password");
    expect(container.querySelector('label[for="seller-password-new"]')?.textContent).toContain("New password");
    expect(container.querySelector('label[for="seller-password-confirm"]')?.textContent).toContain("Confirm new password");
    for (const id of ["seller-password-current", "seller-password-new", "seller-password-confirm"]) {
      const input = container.querySelector(`#${id}`);
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect((input as HTMLInputElement).type).toBe("password");
    }
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(3);
    expect((container.querySelector("#seller-password-current") as HTMLInputElement).autocomplete).toBe("current-password");
    expect((container.querySelector("#seller-password-new") as HTMLInputElement).autocomplete).toBe("new-password");
    expect((container.querySelector("#seller-password-confirm") as HTMLInputElement).autocomplete).toBe("new-password");
    expect(fetchMock).toHaveBeenCalledWith("/api/vial/seller/profile", expect.anything());

    root.unmount();
  });

  it("submits the password form from Enter and marks every password input required", async () => {
    const request = deferred<Response>();
    const fetchMock = profileFetch(() => request.promise);
    const { container, root } = await renderProfile(fetchMock);
    const form = container.querySelector("form");

    expect(form).toBeInstanceOf(HTMLFormElement);
    for (const id of ["seller-password-current", "seller-password-new", "seller-password-confirm"]) {
      expect((container.querySelector(`#${id}`) as HTMLInputElement).required).toBe(true);
    }
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "new-password");
    setInput(container, "seller-password-confirm", "new-password");

    await act(async () => { fireEvent.submit(form!); });

    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/password"))).toBe(true);
    request.resolve(response({ ok: true }));
    await settle();
    root.unmount();
  });

  it("disables all password inputs and the submit button while the request is pending", async () => {
    const request = deferred<Response>();
    const fetchMock = profileFetch(() => request.promise);
    const { container, root } = await renderProfile(fetchMock);
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "new-password");
    setInput(container, "seller-password-confirm", "new-password");
    const submit = passwordButton(container);
    await act(async () => { fireEvent.click(submit); });

    for (const id of ["seller-password-current", "seller-password-new", "seller-password-confirm"]) {
      expect((container.querySelector(`#${id}`) as HTMLInputElement).disabled).toBe(true);
    }
    expect(submit.disabled).toBe(true);
    const passwordCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/password"));
    expect(passwordCall?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ currentPassword: "current-password", newPassword: "new-password" }),
    });
    expect(new Headers(passwordCall?.[1]?.headers).get("x-seller-id")).toBe("seller-1");
    expect(new Headers(passwordCall?.[1]?.headers).get("x-seller-token")).toBe("seller-token");

    request.resolve(response({ ok: true }));
    await settle();
    root.unmount();
  });

  it("does not PUT when the new password is shorter than eight characters", async () => {
    const fetchMock = profileFetch(() => Promise.resolve(response({ ok: true })));
    const { container, root } = await renderProfile(fetchMock);
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "short");
    setInput(container, "seller-password-confirm", "short");

    const submit = passwordButton(container);
    expect(submit.disabled).toBe(true);
    await act(async () => { fireEvent.click(submit); });

    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/password"))).toBe(false);
    root.unmount();
  });

  it("does not PUT when the new password values do not match", async () => {
    const fetchMock = profileFetch(() => Promise.resolve(response({ ok: true })));
    const { container, root } = await renderProfile(fetchMock);
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "new-password");
    setInput(container, "seller-password-confirm", "different-password");

    const submit = passwordButton(container);
    expect(submit.disabled).toBe(true);
    await act(async () => { fireEvent.click(submit); });

    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/password"))).toBe(false);
    root.unmount();
  });

  it("shows a safe error and does not call logout after a failed response", async () => {
    const onPasswordChanged = vi.fn();
    const fetchMock = profileFetch(() => Promise.resolve(response({ error: "database secret" }, false)));
    const { container, root } = await renderProfile(fetchMock, onPasswordChanged);
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "new-password");
    setInput(container, "seller-password-confirm", "new-password");

    await act(async () => { fireEvent.click(passwordButton(container)); });
    await settle();

    expect(onPasswordChanged).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Unable to change password");
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain("database secret");
    root.unmount();
  });

  it("clears the password fields and calls the password-changed callback after success", async () => {
    const onPasswordChanged = vi.fn();
    const fetchMock = profileFetch(() => Promise.resolve(response({ ok: true })));
    const { container, root } = await renderProfile(fetchMock, onPasswordChanged);
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "new-password");
    setInput(container, "seller-password-confirm", "new-password");

    await act(async () => { fireEvent.click(passwordButton(container)); });
    await settle();

    expect(onPasswordChanged).toHaveBeenCalledTimes(1);
    expect((container.querySelector("#seller-password-current") as HTMLInputElement).value).toBe("");
    expect((container.querySelector("#seller-password-new") as HTMLInputElement).value).toBe("");
    expect((container.querySelector("#seller-password-confirm") as HTMLInputElement).value).toBe("");
    root.unmount();
  });

  it("does not call the callback when an old response arrives after the session changes", async () => {
    const firstRequest = deferred<Response>();
    const fetchMock = profileFetch(() => firstRequest.promise);
    const onPasswordChanged = vi.fn();
    const rendered = await renderProfile(fetchMock, onPasswordChanged);
    setInput(rendered.container, "seller-password-current", "current-password");
    setInput(rendered.container, "seller-password-new", "new-password");
    setInput(rendered.container, "seller-password-confirm", "new-password");
    await act(async () => { fireEvent.click(passwordButton(rendered.container)); });

    await act(async () => {
      rendered.root.render(
        React.createElement(StoreProfileTab, {
          session: { ...session, token: "new-session-token" },
          onPasswordChanged,
        }),
      );
    });
    await settle();
    expect(onPasswordChanged).not.toHaveBeenCalled();
    expect((fetchMock.mock.calls.find(([input]) => String(input).endsWith("/password"))?.[1]?.signal as AbortSignal).aborted).toBe(true);

    firstRequest.resolve(response({ ok: true }));
    await settle();

    expect(onPasswordChanged).not.toHaveBeenCalled();
    expect(rendered.container.querySelector("#seller-password-current")).toBeTruthy();
    rendered.root.unmount();
  });

  it("does not call the callback when a pending request is aborted by unmount", async () => {
    const request = deferred<Response>();
    const fetchMock = profileFetch(() => request.promise);
    const onPasswordChanged = vi.fn();
    const rendered = await renderProfile(fetchMock, onPasswordChanged);
    setInput(rendered.container, "seller-password-current", "current-password");
    setInput(rendered.container, "seller-password-new", "new-password");
    setInput(rendered.container, "seller-password-confirm", "new-password");
    await act(async () => { fireEvent.click(passwordButton(rendered.container)); });

    const passwordCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/password"));
    await act(async () => { rendered.root.unmount(); });
    request.resolve(response({ ok: true }));
    await settle();

    expect((passwordCall?.[1]?.signal as AbortSignal).aborted).toBe(true);
    expect(onPasswordChanged).not.toHaveBeenCalled();
  });

  it("removes the persisted session and shows the sign-in confirmation after success", async () => {
    localStorage.setItem("peps:seller_session", JSON.stringify(session));
    const fetchMock = profileFetch(() => Promise.resolve(response({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const queryClient = new QueryClient();
    await act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(SellerDashboard),
        ),
      );
    });
    await settle();

    const storeTab = [...container.querySelectorAll("button")].find(button => button.textContent === "My Store");
    expect(storeTab).toBeTruthy();
    await act(async () => { fireEvent.click(storeTab!); });
    await settle();
    setInput(container, "seller-password-current", "current-password");
    setInput(container, "seller-password-new", "new-password");
    setInput(container, "seller-password-confirm", "new-password");
    await act(async () => { fireEvent.click(passwordButton(container)); });
    await settle();

    expect(localStorage.getItem("peps:seller_session")).toBeNull();
    expect(container.textContent).toContain("Password changed");
    expect(container.textContent).toContain("Please sign in again");
    expect(container.textContent).toContain("Sign In");
    expect(container.querySelector("#seller-password-current")).toBeNull();
    root.unmount();
  });
});