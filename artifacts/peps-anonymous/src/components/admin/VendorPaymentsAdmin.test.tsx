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
let Component: typeof import("./VendorPaymentsAdmin").default;
const original = adminAuth.request;
const requests: { path: string; method?: string; body: any }[] = [];
const accounts: {
  username: string;
  status: string;
  vendorId: string | null;
  companyName: string;
  contactName: string;
  email: string;
  createdAt: string;
}[] = [
  {
    username: "supplier",
    status: "pending",
    vendorId: null,
    companyName: "Supplier Co",
    contactName: "Person",
    email: "vendor@example.com",
    createdAt: "2026-01-01",
  },
];
before(async () => {
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost" });
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "Event",
    "Node",
    "MutationObserver",
  ])
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: dom.window[key],
    });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  Component = (await import("./VendorPaymentsAdmin")).default;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  document.body.innerHTML = "";
  adminAuth.request = original;
});
after(() => dom.window.close());
function el(id: string) {
  const value = document.querySelector(`[data-testid="${id}"]`);
  assert.ok(value, id);
  return value!;
}
const data = {
  vendors: [{ id: "v1", name: "Vendor One" }],
  vendorId: "v1",
  wallets: [
    { id: "w1", currency: "USDT", network: "TRON", address: "address-one" },
  ],
  orders: [
    {
      id: "o1",
      reference: "REF1",
      totalCost: "10.10",
      status: "Submitted",
      stale: false,
      paymentId: null,
    },
    {
      id: "o2",
      reference: "REF2",
      totalCost: "20.20",
      status: "Shipped",
      stale: false,
      paymentId: null,
    },
    {
      id: "paid",
      reference: "PAID",
      totalCost: "2",
      status: "Submitted",
      stale: false,
      paymentId: "p1",
    },
    {
      id: "stale",
      reference: "STALE",
      totalCost: "2",
      status: "Submitted",
      stale: true,
      paymentId: null,
    },
  ],
  payments: [],
};
async function mount() {
  requests.length = 0;
  adminAuth.request = async (path, init = {}) => {
    requests.push({
      path,
      method: init.method,
      body: init.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify(data));
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<Component />));
  await change("payment-vendor", "v1");
}
async function change(id: string, value: string) {
  await act(async () => {
    fireEvent.change(el(id), { target: { value } });
  });
}

async function click(id: string) {
  await act(async () => {
    fireEvent.click(el(id));
  });
}
async function review() {
  await change("payment-wallet", "w1");
  await click("payment-order-o1");
  await click("payment-order-o2");
  await change("payment-amount", "30");
  await change("payment-txid", "tx-123");
  await click("payment-review");
}
test("records selected orders with reviewed wallet snapshot", async () => {
  await mount();
  assert.equal((el("payment-order-paid") as HTMLInputElement).disabled, true);
  assert.equal((el("payment-order-stale") as HTMLInputElement).disabled, true);
  await review();
  assert.ok(document.body.textContent!.includes("30.30"));
  assert.equal(requests.filter((r) => r.method).length, 0);
  await click("payment-confirm");
  assert.deepEqual(requests.find((r) => r.method === "POST")?.body, {
    vendorId: "v1",
    walletId: "w1",
    walletSnapshot: {
      currency: "USDT",
      network: "TRON",
      address: "address-one",
    },
    submissionIds: ["o1", "o2"],
    txid: "tx-123",
    cryptoAmount: "30",
  });
});
test("does not claim success on failed record", async () => {
  await mount();
  await review();
  adminAuth.request = async () =>
    new Response(JSON.stringify({ error: "Wallet changed; refresh" }), {
      status: 409,
    });
  await click("payment-confirm");
  assert.ok(
    document
      .querySelector('[role="alert"]')
      ?.textContent?.includes("Wallet changed"),
  );
  assert.ok(!document.body.textContent!.includes("Payment recorded."));
  assert.ok(el("payment-confirm"));
});
test("requires a reason and explicit confirmation to void a receipt", async () => {
  const payment = {
    id: "p1",
    txid: "previous-tx",
    cryptoAmount: "30",
    usdAmount: "30.30",
    currency: "USDT",
    network: "TRON",
    walletSnapshot: data.wallets[0],
    orders: [{ submissionId: "o1", reference: "REF1", amountUsd: "10.10" }],
    paidAt: "2026-01-01",
    recordedAt: "2026-01-01",
    recordedBy: "admin",
    voidedAt: null,
    voidReason: null,
  };
  (data.payments as any[]).push(payment);
  try {
    await mount();
    const voidButton = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Void record",
    )!;
    await act(async () => fireEvent.click(voidButton));
    assert.ok(
      document.body.textContent!.includes(
        "Only corrects this record; does not reverse transfer",
      ),
    );
    assert.equal(
      (el("payment-void-confirm") as HTMLButtonElement).disabled,
      true,
    );
    await change("payment-void-reason", "Wrong transaction");
    await click("payment-void-confirm");
    assert.deepEqual(
      requests.find((r) => r.method === "POST"),
      {
        path: "/api/admin/vendor-payments/p1/void",
        method: "POST",
        body: { reason: "Wrong transaction" },
      },
    );
  } finally {
    data.payments.length = 0;
  }
});
test("requires a saved vendor wallet before review", async () => {
  const wallets = data.wallets;
  data.wallets = [];
  try {
    await mount();
    assert.ok(
      document.body.textContent!.includes(
        "add a payment wallet in their Settings",
      ),
    );
    assert.equal((el("payment-review") as HTMLButtonElement).disabled, true);
  } finally {
    data.wallets = wallets;
  }
});
test("malformed dashboard responses show a load error instead of crashing", async () => {
  await mount();
  adminAuth.request = async () =>
    new Response(JSON.stringify({ vendors: data.vendors }));
  const refresh = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Refresh payments & wallets",
  )!;
  await act(async () => {
    fireEvent.click(refresh);
  });
  assert.ok(
    document.body.textContent!.includes("Could not load payment details"),
  );
  assert.equal(document.querySelector('[data-testid="payment-review"]'), null);
});
