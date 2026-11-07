// @ts-expect-error This workspace's transitive jsdom has no declaration package.
import { JSDOM } from "jsdom";
import { afterEach, expect, it } from "vitest";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { FeeDisclosure } = await import("./FeeDisclosure");
import type { SharedOrderCosts, CostLine } from "@/hooks/use-wholesale-shares";
afterEach(() => { document.body.innerHTML = ""; });

const line = (o: Partial<CostLine>): CostLine => ({ amount: null, currency: "USD", status: "known", basis: "your_order", includedInOrder: true, ...o });
const base = (o: Partial<SharedOrderCosts> = {}): SharedOrderCosts => ({
  stage: "estimate", currency: "USD",
  organiser: line({ amount: 5, basis: "per_person" }),
  perKit: line({ amount: 6, rate: 2, basis: "per_kit" }),
  vendorShipping: line({ amount: 12.4, status: "estimate", basis: "your_share" }),
  onwardShipping: line({ status: "not_set", currency: null, includedInOrder: false }),
  orderTotal: null, ...o,
});

async function render(costs: SharedOrderCosts | null, extra: { unsavedChanges?: boolean; onRetry?: () => void } = {}) {
  const el = document.createElement("div"); document.body.append(el);
  const root = createRoot(el);
  await React.act(async () => root.render(<FeeDisclosure costs={costs} {...extra} />));
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent ?? null;
  return { el, q, unmount: () => React.act(async () => root.unmount()) };
}

it("shows known, estimate, basis and exact onward not-set copy", async () => {
  const r = await render(base());
  expect(r.q("cost-value-organiser")).toBe("USD 5.00");
  expect(r.q("cost-line-organiser")).toContain("per person");
  expect(r.q("cost-value-vendorShipping")).toBe("Est. USD 12.40");
  expect(r.q("cost-value-onwardShipping")).toBe("Not set yet — ask the organiser");
  expect(r.el.querySelector('[data-testid="group-costs-separate"] [data-testid="cost-line-onwardShipping"]')).not.toBeNull();
  await r.unmount();
});

it("treats per-kit rate and amount as one charge without adding them", async () => {
  const r = await render(base());
  expect(r.q("cost-value-perKit")).toBe("USD 6.00");
  expect(r.q("cost-line-perKit")).toContain("USD 2.00 per kit");
  expect(r.el.textContent).not.toContain("8.00");
  await r.unmount();
});

it("distinguishes zero/no fee from unknown and never invents a total", async () => {
  const r = await render(base({
    organiser: line({ amount: 0, basis: "per_person" }),
    perKit: line({ status: "not_required", basis: "per_kit" }),
    vendorShipping: line({ amount: null, basis: "your_share" }),
  }));
  expect(r.q("cost-value-organiser")).toBe("No fee");
  expect(r.q("cost-value-perKit")).toBe("No fee");
  expect(r.q("cost-value-vendorShipping")).toBe("Unavailable");
  expect(r.q("row-order-total")).toBeNull();
  await r.unmount();
});

it("shows onward postage in its own currency, separate from the locked server total", async () => {
  const r = await render(base({
    stage: "locked", orderTotal: 123.45,
    onwardShipping: line({ amount: 4.2, currency: "GBP", includedInOrder: false, basis: "your_share" }),
  }));
  expect(r.q("status-cost-stage")).toBe("Locked amounts");
  expect(r.q("text-order-total")).toBe("USD 123.45");
  expect(r.q("cost-value-onwardShipping")).toBe("GBP 4.20");
  expect(r.el.textContent).toContain("different currency");
  expect(r.el.textContent).not.toContain("127.65");
  await r.unmount();
});

it("renders missing cost data as unavailable, never free", async () => {
  const r = await render(null);
  expect(r.q("text-costs-unavailable")).toContain("Nothing here means free");
  expect(r.el.textContent).not.toContain("No fee");
  await r.unmount();
});

it("offers retry when cost data is missing", async () => {
  let n = 0;
  const r = await render(null, { onRetry: () => { n++; } });
  await React.act(async () => (r.el.querySelector('[data-testid="button-retry-costs"]') as HTMLButtonElement).click());
  expect(n).toBe(1);
  await r.unmount();
});

it("warns that amounts reflect the saved basket and respects not_required onward", async () => {
  const r = await render(base({ onwardShipping: line({ status: "not_required", currency: null, includedInOrder: false }) }), { unsavedChanges: true });
  expect(r.q("text-costs-unsaved")).toContain("Save item changes to refresh");
  expect(r.q("cost-value-onwardShipping")).toBe("No fee");
  await r.unmount();
});

it("discloses the known per-kit rate before joining even when the total is calculated later", async () => {
  const r = await render(base({ stage: "invitation", perKit: line({
    amount: null, rate: 3.5, basis: "per_kit", status: "calculated_later",
  }) }));
  expect(r.q("cost-value-perKit")).toContain("USD 3.50 per kit");
  expect(r.el.querySelector('[data-testid="text-order-total"]')).toBeNull();
  await r.unmount();
});
