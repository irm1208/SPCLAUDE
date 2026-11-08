import { act, createElement } from "react";
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
    "navigator",
    "HTMLButtonElement",
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
const tok = (id: string) => Buffer.from(id).toString("hex").padEnd(64, "0").slice(0, 64);
const data = {
  vendors: [{ id: "v1", name: "Vendor One" }],
  vendorId: "v1",
  wallets: [
    { id: "w1", currency: "USDT", network: "TRON", address: "address-one" },
  ],
  orders: [
    {
      id: "o1",
      reviewToken: tok("o1"),
      canRemove: true,
      removalReason: null,
      profit: { currency: "USD", basis: "product_gross", salesUsd: "18.20", supplierProductsUsd: "7.00", amountUsd: "11.20", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
      reference: "REF1",
      totalCost: "10.10",
      status: "Submitted",
      stale: false,
      paymentId: null,
    },
    {
      id: "o2",
      reviewToken: tok("o2"),
      canRemove: false,
      removalReason: "This submission has started and is locked.",
      profit: { currency: "USD", basis: "product_gross", salesUsd: "15.00", supplierProductsUsd: "20.00", amountUsd: "-5.00", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
      reference: "REF2",
      totalCost: "20.20",
      status: "Shipped",
      stale: false,
      paymentId: null,
    },
    {
      id: "paid",
      reviewToken: tok("paid"),
      reference: "PAID",
      totalCost: "2",
      status: "Submitted",
      stale: false,
      paymentId: "p1",
      canRemove: false,
      removalReason: "Void the payment receipt before removing this supplier submission.",
      profit: { currency: "USD", basis: "product_gross", salesUsd: null, supplierProductsUsd: null, amountUsd: null, reason: "Customer product prices are ambiguous.", definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
    },
    {
      id: "stale",
      reviewToken: tok("stale"),
      reference: "STALE",
      totalCost: "2",
      status: "Submitted",
      stale: true,
      canRemove: true,
      removalReason: null,
      profit: { currency: "USD", basis: "product_gross", salesUsd: "8.00", supplierProductsUsd: "4.00", amountUsd: "4.00", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
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
  await act(async () => root!.render(createElement(Component)));
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
    orderSnapshots: [
      { submissionId: "o1", reviewToken: tok("o1") },
      { submissionId: "o2", reviewToken: tok("o2") },
    ],
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

function text() {
  return document.body.textContent || "";
}
function detailedData(vendorId = "v1", n = 2) {
  return {
    vendors: [
      { id: "v1", name: "Vendor One" },
      { id: "v2", name: "Vendor Two" },
    ],
    vendorId,
    wallets: [{ id: "w1", currency: "USDT", network: "TRON", address: `addr-${vendorId}` }],
    orders: Array.from({ length: n }, (_, i) => ({
      id: `${vendorId}-o${i}`,
      reference: `${vendorId.toUpperCase()}-REF${i}`,
      status: "Submitted",
      stale: false,
      totalCost: "12.34",
      currencyUSD: true,
      paymentId: null,
      sourceType: i === 0 ? "shared" : "order",
      sourceId: `src-${i}`,
      submittedAt: "2026-01-05T10:00:00.000Z",
      sourceOrders: i === 0 ? [{ id: "m1", code: "ORD-111", username: "member_a" }, { id: "m2", code: "ORD-222", username: null }] : [{ id: "m3", code: "ORD-333", username: null }],
      items: [{ productName: "Retatrutide 10mg", quantity: 2, unitCost: "5.00", lineTotal: "10.00" }],
      productCost: "10.00",
      shippingCost: "2.34",
      eligible: true,
      paymentState: "owed",
      reviewReason: null,
      paidAmountUsd: null,
      reviewToken: tok(`${vendorId}-o${i}`),
      canRemove: true,
      removalReason: null,
      profit: { currency: "USD", basis: "product_gross", salesUsd: "18.00", supplierProductsUsd: "10.00", amountUsd: "8.00", reason: null, definition: "Customer product line sales for this supplier minus submitted supplier product cost, before shipping, fees, credits, discounts, tax, or overheads." },
    })),
    payments: [
      {
        id: "old", txid: "old-tx", cryptoAmount: "1", usdAmount: "1.00", currency: "USDT", network: "TRON",
        walletSnapshot: { currency: "USDT", network: "TRON", address: "historic-address" },
        orders: [{ submissionId: "gone", reference: "LEGACY1", amountUsd: "1.00" }],
        paidAt: "2025-12-01T00:00:00Z", recordedAt: "2025-12-01T00:00:00Z", recordedBy: "admin", voidedAt: null, voidReason: null,
      },
    ],
    summary: {
      currency: "USD",
      owed: { amount: "777.77", count: 63 },
      paid: { amount: "1.00", count: 1 },
      needsReview: { amount: "4.00", count: 2 },
      notOwed: { amount: "0.00", count: 0 },
      unavailableCount: 1,
    },
  };
}
async function mountWith(handler: (path: string, init: RequestInit) => Promise<Response>) {
  requests.length = 0;
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
    return handler(path, init);
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(Component)));
}
const vendorOf = (path: string) => /vendorId=(\w+)/.exec(path)?.[1] ?? "v1";

test("shows whole-ledger server summary, item breakdown and shared constituents", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  assert.ok(text().includes("$777.77"));
  assert.ok(text().includes("63"));
  await click("payment-expand-v1-o0");
  const detail = el("payment-order-detail-v1-o0").textContent!;
  for (const s of ["Retatrutide 10mg", "$5.00", "$10.00", "$2.34", "$12.34", "ORD-111", "member_a", "ORD-222"]) assert.ok(detail.includes(s), s);
});

test("historical receipt without detail says breakdown not recorded", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-receipt-expand-old");
  assert.ok(el("payment-receipt-old").textContent!.includes("Breakdown not recorded"));
  assert.ok(el("payment-receipt-old").textContent!.includes("historic-address"));
});

test("page selection is scoped, capped and keeps hidden selections", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p), 30))));
  await change("payment-vendor", "v1");
  await click("payment-select-page");
  assert.ok(text().includes("25 selected"));
  assert.ok(text().includes("200"));
  await click("payment-page-next");
  assert.ok(el("payment-hidden-selected").textContent!.includes("25"));
});

test("vendor switch ignores late responses from previous vendor", async () => {
  let releaseV1: () => void = () => {};
  await mountWith((p) => {
    const v = vendorOf(p);
    if (v === "v1" && p.includes("vendorId")) return new Promise((r) => { releaseV1 = () => r(new Response(JSON.stringify(detailedData("v1")))); });
    return Promise.resolve(new Response(JSON.stringify(detailedData(v))));
  });
  await change("payment-vendor", "v1");
  await change("payment-vendor", "v2");
  await act(async () => releaseV1());
  assert.ok(text().includes("V2-REF0"));
  assert.ok(!text().includes("V1-REF0"));
});

test("refresh failure clears stale ledger and offers retry", async () => {
  let fail = false;
  await mountWith(async (p) => fail ? new Response(JSON.stringify({ error: "Server down" }), { status: 500 }) : new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-select-page");
  fail = true;
  await click("payment-refresh");
  assert.ok(text().includes("Server down"));
  assert.ok(!text().includes("V1-REF0"));
  fail = false;
  await click("payment-retry");
  assert.ok(text().includes("V1-REF0"));
  assert.ok(!text().includes("selected"));
});

test("captures review tokens in draft and keeps review after 409", async () => {
  const withTokens = () => detailedData("v1");
  let conflict = true;
  await mountWith(async (_p, init) => init.method === "POST" && conflict
    ? new Response(JSON.stringify({ error: "Order snapshot changed; refresh" }), { status: 409 })
    : new Response(JSON.stringify(withTokens())));
  await change("payment-vendor", "v1");
  await change("payment-wallet", "w1");
  await click("payment-order-v1-o0");
  await click("payment-order-v1-o1");
  await change("payment-amount", "24.68");
  await change("payment-txid", "tx-tok");
  await click("payment-review");
  await click("payment-confirm");
  const body = requests.find((r) => r.method === "POST")!.body;
  assert.deepEqual(body.orderSnapshots, [
    { submissionId: "v1-o0", reviewToken: tok("v1-o0") },
    { submissionId: "v1-o1", reviewToken: tok("v1-o1") },
  ]);
  assert.deepEqual(body.submissionIds, ["v1-o0", "v1-o1"]);
  assert.ok(text().includes("Order snapshot changed"));
  assert.ok(el("payment-confirm"));
});

test("review shows expandable breakdown for each selected order", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await change("payment-wallet", "w1");
  await click("payment-order-v1-o0");
  await change("payment-amount", "12.34");
  await change("payment-txid", "tx-d");
  await click("payment-review");
  await click("payment-draft-expand-v1-o0");
  const d = el("payment-draft-detail-v1-o0").textContent!;
  for (const s of ["Retatrutide 10mg", "Product subtotal", "$10.00", "Supplier shipping", "$2.34", "$12.34"]) assert.ok(d.includes(s), s);
});

test("copy without clipboard API shows select-and-copy fallback", async () => {
  const nav = globalThis.navigator as any;
  const prev = nav.clipboard;
  Object.defineProperty(nav, "clipboard", { configurable: true, value: undefined });
  try {
    await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
    await change("payment-vendor", "v1");
    await click("payment-copy-w1");
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes("Select and copy"));
  } finally {
    Object.defineProperty(nav, "clipboard", { configurable: true, value: prev });
  }
});

test("shows exact signed product profit beside orders with its definition and sales/cost basis", async () => {
  await mount();
  const ledgerRow = el("payment-order-o1").closest("li")!.textContent!;
  assert.ok(ledgerRow.includes("$11.20"));
  assert.ok(ledgerRow.includes("$18.20"));
  assert.ok(ledgerRow.includes("$7.00"));
  assert.ok(ledgerRow.includes("Estimated product profit"));
  await click("payment-expand-o1");
  const profitDetail = el("payment-profit-detail-o1").textContent!;
  assert.ok(profitDetail.includes("before shipping"));
  assert.ok(profitDetail.includes("Customer product sales: $18.20"));
  assert.ok(profitDetail.includes("Supplier product cost: $7.00"));
  const negativeRow = el("payment-order-o2").closest("li")!.textContent!;
  assert.ok(negativeRow.includes("-$5.00"));
  assert.ok(negativeRow.includes("$15.00"));
  assert.ok(negativeRow.includes("$20.00"));
  const unavailable = el("payment-order-paid").closest("li")!.textContent!;
  assert.ok(unavailable.includes("Unavailable"));
  assert.ok(unavailable.includes("Customer product prices are ambiguous."));
});

test("removal requires confirmation, uses the supplier submission endpoint, and preserves customer order", async () => {
  await mount();
  await click("payment-order-o1");
  await change("payment-wallet", "w1");
  await change("payment-amount", "10");
  await change("payment-txid", "prepared-tx");
  await click("payment-remove-o1");
  assert.ok(el("payment-remove-confirmation").textContent!.includes("REF1"));
  assert.ok(el("payment-remove-confirmation").textContent!.includes("keeps the customer order"));
  assert.ok(el("payment-remove-confirmation").textContent!.includes("does not cancel"));
  assert.equal((el("payment-review") as HTMLButtonElement).disabled, true);
  await click("payment-review");
  assert.equal(document.querySelector('[data-testid="payment-draft"]'), null);
  assert.equal(requests.filter((r) => r.method === "POST").length, 0);
  assert.equal(requests.filter((r) => r.method === "DELETE").length, 0);
  await click("payment-remove-cancel");
  await click("payment-remove-o1");
  let refreshCount = 0;
  let deleted = false;
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: null });
    if (init.method === "DELETE") { deleted = true; return new Response(null, { status: 204 }); }
    refreshCount++;
    return new Response(JSON.stringify({ ...data, orders: deleted ? data.orders.filter((order: any) => order.id !== "o1") : data.orders }));
  };
  await click("payment-remove-confirm");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await act(async () => {});
  assert.ok(requests.some((r) => r.path === "/api/admin/vendor-portal/orders/o1" && r.method === "DELETE"));
  assert.ok(text().includes("Supplier submission REF1 removed"));
  assert.ok(refreshCount > 0);
  assert.equal(document.querySelector('[data-testid="payment-order-o1"]'), null);
  assert.equal(document.querySelector('[data-testid="payment-selected-count"]'), null);
});

test("failed removal preserves the row and reports error without success", async () => {
  await mount();
  await click("payment-remove-o1");
  adminAuth.request = async (path, init = {}) => {
    requests.push({ path, method: init.method, body: null });
    if (init.method === "DELETE") return new Response(JSON.stringify({ error: "Submission changed" }), { status: 409 });
    return new Response(JSON.stringify(data));
  };
  await click("payment-remove-confirm");
  assert.ok(text().includes("Submission changed"));
  assert.ok(!text().includes("Supplier submission removed"));
  assert.ok(el("payment-order-o1"));
});

test("paid and started submissions cannot be removed", async () => {
  await mount();
  assert.equal((el("payment-remove-paid") as HTMLButtonElement).disabled, true);
  assert.ok(el("payment-remove-paid").textContent!.includes("Void the payment receipt"));
  assert.equal((el("payment-remove-o2") as HTMLButtonElement).disabled, true);
  assert.ok(el("payment-remove-o2").textContent!.includes("started"));
});
test("Admin override requires a reason and sends it only after explicit confirmation", async () => {
  let deleted = false;
  const overrideOrder = { ...data.orders[0], status: "Shipped", canRemove: true, requiresRemovalOverride: true };
  await mountWith(async (path, init = {}) => {
    if (init.method === "DELETE") {
      requests.push({ path, method: init.method, body: JSON.parse(String(init.body)) });
      deleted = true;
      return new Response(JSON.stringify({ ok: true }));
    }
    return new Response(JSON.stringify({ ...data, orders: deleted ? [] : [overrideOrder] }));
  });
  await change("payment-vendor", "v1");
  await click("payment-remove-o1");
  assert.match(el("payment-remove-confirmation").textContent!, /does not stop a parcel already shipped/);
  assert.equal((el("payment-remove-confirm") as HTMLButtonElement).disabled, true);
  await change("payment-remove-reason", "  Duplicate shipment handled outside portal  ");
  assert.equal((el("payment-remove-confirm") as HTMLButtonElement).disabled, false);
  assert.equal(deleted, false);
  await click("payment-remove-confirm");
  assert.deepEqual(requests.find(r => r.method === "DELETE")?.body, { override: true, reason: "Duplicate shipment handled outside portal" });
  assert.equal(document.querySelector('[data-testid="payment-order-o1"]'), null);
});

test("switching vendors clears removal confirmation and stale removal cannot act", async () => {
  await mountWith(async (p) => new Response(JSON.stringify(detailedData(vendorOf(p)))));
  await change("payment-vendor", "v1");
  await click("payment-remove-v1-o0");
  await change("payment-vendor", "v2");
  assert.equal(document.querySelector('[data-testid="payment-remove-confirmation"]'), null);
  assert.ok(!text().includes("V1-REF0"));
});

for (const [label, bad] of [["missing", undefined], ["malformed", "NOT-A-SHA"]] as const) {
  test(`${label} review token blocks review and POST while history still renders`, async () => {
    await mountWith(async (p) => {
      const d: any = detailedData(vendorOf(p));
      if (bad === undefined) delete d.orders[0].reviewToken; else d.orders[0].reviewToken = bad;
      return new Response(JSON.stringify(d));
    });
    await change("payment-vendor", "v1");
    await change("payment-wallet", "w1");
    await click("payment-order-v1-o0");
    await click("payment-order-v1-o1");
    await change("payment-amount", "24.68");
    await change("payment-txid", "tx-bad");
    assert.equal((el("payment-review") as HTMLButtonElement).disabled, true);
    assert.ok(el("payment-token-warning").textContent!.includes("Refresh"));
    await click("payment-review");
    assert.equal(document.querySelector('[data-testid="payment-draft"]'), null);
    assert.equal(requests.filter((r) => r.method === "POST").length, 0);
    await click("payment-receipt-expand-old");
    assert.ok(el("payment-receipt-old").textContent!.includes("Breakdown not recorded"));
    assert.ok(el("payment-receipt-old").textContent!.includes("LEGACY1"));
  });
}
