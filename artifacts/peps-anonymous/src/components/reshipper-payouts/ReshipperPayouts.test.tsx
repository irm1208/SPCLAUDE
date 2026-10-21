import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is available through the workspace test harness.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const n of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node"])
  vi.stubGlobal(n, n === "window" ? dom.window : dom.window[n]);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ReshipperPayouts } = await import("./ReshipperPayouts");
import type { PayoutData, PayoutOrder } from "../../lib/reshipper-payouts";

const order = (o: Partial<PayoutOrder>): PayoutOrder => ({ orderId: "o1", code: "PA-101", member: "mira", currency: "USD", adminFeeMinor: 1000, postageMinor: 500,
  paidAdminMinor: 0, paidPostageMinor: 0, remainingAdminMinor: 1000, remainingPostageMinor: 500, status: "owed", reviewReason: null, reviewedAt: null,
  reviewable: false, eligible: true, collector: "admin", ...o });
const data = (): PayoutData => ({
  orders: [order({}), order({ orderId: "o2", code: "PA-102", member: "teo" }), order({ orderId: "o3", code: "PA-103", currency: "GBP" }),
    order({ orderId: "o4", code: "PA-104", status: "needs_review", eligible: false, reviewable: true, collector: null, remainingAdminMinor: 0, remainingPostageMinor: 0 })],
  payouts: [{ id: "p1", amountMinor: 735, currency: "USD", paidAt: "2025-03-02", method: "wise", reference: "W-88", destination: "acct 4471", note: "", recordedBy: "admin1", recordedAt: "2025-03-02T10:00:00Z",
    allocations: [{ orderId: "o9", code: "PA-099", member: "lux", adminFeeMinor: 500, postageMinor: 235 }], voidedAt: "2025-03-03", voidReason: "Wrong account" }],
  totals: [{ currency: "USD", entitledMinor: 3000, paidMinor: 0, owedMinor: 3000, onHoldMinor: 1500 }], needsReviewCount: 1, sourceNotice: "", paymentDetails: { wallet: "0xabc" },
});
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

let root: Root; let el: HTMLDivElement;
beforeEach(() => { el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el); });
afterEach(() => { act(() => root.unmount()); el.remove(); });
const flush = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0)); });
const render = async (props: Record<string, unknown>) => { await act(async () => root.render(createElement(ReshipperPayouts, props as never))); await flush(); };
const q = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as unknown as T;
const byLabel = (l: string) => q<HTMLInputElement>(`[aria-label="${l}"]`);
const btn = (t: string) => [...el.querySelectorAll("button")].find(b => b.textContent?.trim().startsWith(t)) as HTMLButtonElement;
const click = (e: Element) => act(async () => { (e as HTMLElement).click(); });
function type(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = input.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(input, value);
  input.dispatchEvent(new dom.window.Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
}
const inputByLabelText = (t: string) => [...el.querySelectorAll("label")].find(l => l.textContent?.startsWith(t))!.querySelector("input,select") as HTMLInputElement;

it("reshipper sees read-only totals and history, no mutating controls", async () => {
  const fetcher = vi.fn(async (_p: string, _i?: RequestInit) => json(data()));
  await render({ mode: "reshipper", gbId: "g1", fetcher });
  expect(fetcher.mock.calls[0][0]).toBe("/api/reshipper/gb/g1/payouts");
  expect(el.textContent).toContain("USD 30.00");
  expect(el.textContent).toContain("Voided 2025-03-03: Wrong account");
  expect(el.querySelectorAll('input[type="checkbox"]').length).toBe(0);
  expect(btn("Void")).toBeUndefined();
  expect(el.textContent).not.toContain("Record payout");
});

it("previews a selected bulk payment, gets wallet approval and stays pending until confirmation", async () => {
  const d = data(), sender = `0x${"a".repeat(40)}`, destination = `0x${"b".repeat(40)}`, txid = `0x${"c".repeat(64)}`;
  d.payoutWallet = { address: destination, network: "ERC-20", currency: "USDC" };
  const provider = { request: vi.fn(async ({ method }: { method: string }) => {
    if (["eth_accounts", "eth_requestAccounts"].includes(method)) return [sender];
    if (method === "eth_chainId" || method === "eth_getTransactionCount") return "0x1";
    if (method === "eth_sendTransaction") return txid;
  }) };
  Object.defineProperty(dom.window, "ethereum", { value: provider, configurable: true });
  let latest = d;
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (!init?.method) return json(latest);
    const payload = JSON.parse(String(init.body));
    if (url.endsWith("/chain/prepare")) {
      const p = { id: payload.operationId, state: "prepared" as const, token: "USDC" as const, network: "ERC-20", sender, destination,
        amountMinor: 3000, usdMinor: 3000, currency: "USD", tokenUnits: "30000000", rate: 1, createdAt: new Date().toISOString(), txid: null, error: null,
        allocations: d.orders.slice(0, 2).map(o => ({ orderId: o.orderId, code: o.code, member: o.member, adminFeeMinor: 1000, postageMinor: 500 })),
        transaction: { from: sender, to: destination, nonce: "0x1", data: "frozen", chainId: "0x1", value: "0x0" } };
      latest = { ...d, orders: d.orders.map(o => ["o1", "o2"].includes(o.orderId) ? { ...o, eligible: false, pendingPayoutId: p.id } : o), chainPayments: [p] };
    } else if (url.endsWith("/approve")) {
      latest = { ...latest, chainPayments: latest.chainPayments!.map(p => ({ ...p, state: "signing" })) };
    } else if (url.endsWith("/submit")) {
      expect(payload).toEqual({ txid });
      latest = { ...latest, chainPayments: latest.chainPayments!.map(p => ({ ...p, state: "broadcast", txid, error: "Waiting for confirmations" })) };
    }
    return json(latest);
  });
  try {
    await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
    await click(byLabel("Select all visible eligible orders"));
    await click(btn("Connect wallet & preview")); await flush();
    expect(el.textContent).toContain("30 USDC");
    expect(provider.request.mock.calls.some(([q]) => q.method === "eth_sendTransaction")).toBe(false);
    expect(btn("Approve payment in wallet").disabled).toBe(true);
    const checked = [...el.querySelectorAll("label")].find(l => l.textContent?.includes("I have checked the token"))!.querySelector("input")!;
    await click(checked); await click(btn("Approve payment in wallet")); await flush();
    expect(provider.request.mock.calls.filter(([q]) => q.method === "eth_sendTransaction")).toHaveLength(1);
    expect(el.textContent).toContain("Payment pending confirmation");
    expect(el.textContent).toContain(txid);
    expect(el.textContent).not.toContain("Paid — confirmed on blockchain");
    expect(byLabel("Select order PA-101").disabled).toBe(true);
  } finally { delete (dom.window as unknown as { ethereum?: unknown }).ethereum; }
});

it("lets reshippers choose a supported payout token and shows pending payments read-only", async () => {
  const d = data(); d.canManagePayoutWallet = true;
  d.payoutWallet = { address: `0x${"b".repeat(40)}`, network: "ERC-20" };
  d.chainPayments = [{ id: "pending-1", state: "broadcast", network: "ERC-20", token: "USDT", destination: d.payoutWallet.address,
    amountMinor: 1500, usdMinor: 1500, currency: "USD", tokenUnits: "15000000", rate: 1, createdAt: "2026-10-21", txid: `0x${"c".repeat(64)}`, error: "Waiting for confirmations", allocations: [] }];
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(init?.method ? { ...d, payoutWallet: { ...d.payoutWallet, currency: "USDC" } } : d));
  await render({ mode: "reshipper", gbId: "g1", fetcher });
  await click(btn("Edit wallet"));
  await act(async () => type(byLabel("Reshipper payout token"), "USDC"));
  await click(btn("Save payout wallet")); await flush();
  const post = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(JSON.parse(String(post[1]!.body))).toMatchObject({ currency: "USDC", network: "ERC-20" });
  expect(el.textContent).toContain("Payment pending confirmation");
  expect(btn("Check confirmation")).toBeUndefined();
  expect(btn("Approve payment")).toBeUndefined();
});

it("prefills the saved wallet and exact bulk total, then records one TXID covering both orders", async () => {
  const d = data();
  Object.assign(d, { payoutWallet: { address: `0x${"6".repeat(40)}`, network: "ERC-20" } });
  const fetcher = vi.fn(async (_p: string, _i?: RequestInit) => json(d));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  expect(q('details[aria-label="Review & corrections"]').hasAttribute("open")).toBe(false);
  await click(byLabel("Select all visible eligible orders"));
  expect(inputByLabelText("Amount paid").value).toBe("30.00");
  expect(inputByLabelText("Amount paid").readOnly).toBe(true);
  expect(inputByLabelText("Destination actually paid to").value).toBe(`0x${"6".repeat(40)}`);
  expect(inputByLabelText("Method").value).toBe("crypto");
  await act(async () => type(inputByLabelText("TXID"), `0x${"c".repeat(64)}`));
  await click(el.querySelector('section[aria-label="Record payout"] input[type="checkbox"]')!);
  await click(btn("Preview payment"));
  await click(btn("Record payout")); await flush();
  const body = JSON.parse(String(fetcher.mock.calls.find(c => c[1]?.method === "POST")![1]!.body));
  expect(body).toMatchObject({ amount: "30.00", network: "ERC-20", destination: `0x${"6".repeat(40)}`, method: "crypto" });
  expect(body.allocations).toHaveLength(2);
});

it("saves a reshipper payout wallet separately from customer collection wallets", async () => {
  const d = data();
  const address = `0x${"8".repeat(40)}`;
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(init?.method === "POST" ? { ...d, payoutWallet: { address, network: "ERC-20" } } : d));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await act(async () => type(byLabel("Reshipper payout wallet address"), address));
  await click(btn("Save payout wallet")); await flush();
  const call = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(call[0]).toBe("/api/admin/reshippers/kai/gb/g1/payouts/payout-wallet");
  expect(JSON.parse(String(call[1]!.body))).toEqual({ address, network: "ERC-20" });
  expect(el.textContent).toContain(address);
  expect(btn("Copy address")).toBeDefined();
  await render({ mode: "reshipper", gbId: "g2", fetcher: async () => json({ ...d, payoutWallet: { address, network: "ERC-20" } }) });
  expect(el.textContent).toContain(address);
  expect(btn("Save payout wallet")).toBeUndefined();
  expect(q('[aria-label="Payout history"]').textContent).toContain("Orders covered by this payment");
});

it("keeps an invalid payout wallet draft visible and does not replace the saved wallet on server failure", async () => {
  const d = data();
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(init?.method === "POST" ? { error: "Enter a valid wallet address and supported network." } : d, init?.method === "POST" ? 400 : 200));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await act(async () => type(byLabel("Reshipper payout wallet address"), "incorrect-address"));
  await click(btn("Save payout wallet")); await flush();
  expect(q('[role="alert"]').textContent).toContain("valid wallet");
  expect(byLabel("Reshipper payout wallet address").value).toBe("incorrect-address");
  expect(btn("Copy address")).toBeUndefined();
});
it("allows an assigned reshipper to save and edit their own payout wallet without payout controls", async () => {
  const d = { ...data(), canManagePayoutWallet: true };
  const address = `0x${"7".repeat(40)}`;
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(init?.method === "POST" ? { ...d, payoutWallet: { address, network: "Polygon" } } : d));
  await render({ mode: "reshipper", gbId: "g1", fetcher });
  expect(el.textContent).toContain("Your payout wallet");
  await act(async () => {
    type(byLabel("Reshipper payout wallet address"), address);
    type(byLabel("Reshipper payout wallet network"), "Polygon");
  });
  await click(btn("Save payout wallet")); await flush();
  const post = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(post[0]).toBe("/api/reshipper/gb/g1/payouts/payout-wallet");
  expect(JSON.parse(String(post[1]!.body))).toEqual({ address, network: "Polygon" });
  expect(el.textContent).toContain(address);
  await click(btn("Edit wallet"));
  expect(byLabel("Reshipper payout wallet address").value).toBe(address);
  expect(byLabel("Reshipper payout wallet network").value).toBe("Polygon");
  expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  expect(btn("Record payout")).toBeUndefined();
  expect(btn("Void")).toBeUndefined();
  expect(q('[aria-label="Review & corrections"]')).toBeNull();
});

it("invalidates the payout destination confirmation when the saved wallet changes", async () => {
  const d = data();
  Object.assign(d, { payoutWallet: { address: `0x${"6".repeat(40)}`, network: "ERC-20" } });
  let current = d;
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => {
    if (init?.method === "POST") current = { ...d, payoutWallet: JSON.parse(String(init.body)) };
    return json(current);
  });
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await click(byLabel("Select order PA-101"));
  await act(async () => type(inputByLabelText("TXID"), `0x${"c".repeat(64)}`));
  const confirmation = () => el.querySelector('section[aria-label="Record payout"] input[type="checkbox"]') as HTMLInputElement;
  await click(confirmation());
  expect(confirmation().checked).toBe(true);
  await click(btn("Edit wallet"));
  await act(async () => type(byLabel("Reshipper payout wallet address"), `0x${"9".repeat(40)}`));
  await click(btn("Save payout wallet")); await flush();
  expect(inputByLabelText("Destination actually paid to").value).toBe(`0x${"9".repeat(40)}`);
  expect(confirmation().checked).toBe(false);
  expect(btn("Preview payment").disabled).toBe(true);
});

it("admin picks a group, then selects visible eligible rows of one currency", async () => {
  const fetcher = vi.fn(async (p: string) => p.endsWith("/payouts/groups") ? json({ groups: [{ id: "g7", name: "Spring", currency: "usd" }] }) : json(data()));
  await render({ mode: "admin", username: "kai", fetcher });
  await act(async () => type(q<HTMLSelectElement>("select"), "g7")); await flush();
  expect(fetcher.mock.calls.at(-1)![0]).toBe("/api/admin/reshippers/kai/gb/g7/payouts");
  await act(async () => type(q<HTMLInputElement>('input[type="search"]'), "teo"));
  await click(byLabel("Select all visible eligible orders"));
  expect(byLabel("Select order PA-102").checked).toBe(true);
  await act(async () => type(q<HTMLInputElement>('input[type="search"]'), ""));
  expect(byLabel("Select order PA-101").checked).toBe(false);
  expect(byLabel("Select order PA-103").disabled).toBe(true);
  expect(el.textContent).not.toContain("referencesOnly");
  expect(inputByLabelText("Destination actually paid to").value).toBe("");
});

it("records crypto TXIDs and shows the same TXID to the reshipper", async () => {
  const txid = `0x${"a1".repeat(32)}`;
  const saved = data();
  saved.payouts = [{ ...saved.payouts[0], method: "crypto", reference: txid, voidedAt: null, voidReason: null }];
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(init?.method === "POST" ? saved : data()));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await click(byLabel("Select order PA-101"));
  await act(async () => {
    type(inputByLabelText("Amount paid"), "15.00");
    type(inputByLabelText("Method"), "crypto");
    type(inputByLabelText("Destination actually paid to"), "0xRecipient");
  });
  expect(el.textContent).toContain("Enter a TXID");
  await act(async () => type(inputByLabelText("TXID"), txid));
  await click(el.querySelector('section[aria-label="Record payout"] input[type="checkbox"]')!);
  await click(btn("Preview payment"));
  expect(q('[aria-label="Payout preview"]').textContent).toContain(txid);
  await click(btn("Record payout")); await flush();
  const post = fetcher.mock.calls.find(call => call[1]?.method === "POST")!;
  expect(JSON.parse(String(post[1]?.body))).toMatchObject({ method: "crypto", reference: txid });
  expect(q('[aria-label="Payout history"]').textContent).toContain(`TXID: ${txid}`);
  await render({ mode: "reshipper", gbId: "g2", fetcher: async () => json(saved) });
  expect(q('[aria-label="Payout history"]').textContent).toContain(`TXID: ${txid}`);
  expect(q('[aria-label="Payout history"]').textContent).toContain("PA-099");
});

it("validates allocation totals, previews, keeps operationId on retry and shows server error", async () => {
  const posts: { path: string; body: { operationId: string; amount: string; allocations: unknown[] } }[] = [];
  let fail = true;
  const fetcher = vi.fn(async (p: string, init?: RequestInit) => {
    if (init?.method === "POST") { posts.push({ path: p, body: JSON.parse(String(init.body)) }); return fail ? json({ error: "Ledger locked" }, 409) : json(data()); }
    return json(data());
  });
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await click(byLabel("Select order PA-101"));
  await act(async () => type(byLabel("Postage for PA-101"), "9.00"));
  expect(el.textContent).toContain("postage exceeds");
  await act(async () => type(byLabel("Postage for PA-101"), "2.50"));
  await act(async () => {
    type(inputByLabelText("Amount paid"), "12.00"); type(inputByLabelText("Method"), "cash");
    type(inputByLabelText("Reference"), "R1"); type(inputByLabelText("Destination actually paid to"), "In person");
  });
  expect(inputByLabelText("Amount paid").value).toBe("12.50");
  expect(btn("Preview payment").disabled).toBe(true);
  await click(el.querySelector('section[aria-label="Record payout"] input[type="checkbox"]')!);
  await click(btn("Preview payment"));
  expect(q('[aria-label="Payout preview"]').textContent).toContain("2.50");
  await click(btn("Record payout")); await flush();
  expect(q('[role="alert"]').textContent).toContain("Ledger locked");
  expect(inputByLabelText("Reference").value).toBe("R1");
  fail = false;
  await click(btn("Record payout")); await flush();
  expect(posts).toHaveLength(2);
  expect(posts[1].body.operationId).toBe(posts[0].body.operationId);
  expect(posts[0].path).toBe("/api/admin/reshippers/kai/gb/g1/payouts");
  expect(posts[0].body).toMatchObject({ amount: "12.50", currency: "USD", confirmedDestination: true, allocations: [{ orderId: "o1", adminFee: "10.00", postage: "2.50" }] });
});

it("admin reviews needs_review rows with capped fees and audited reason", async () => {
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(data()));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  const radio = [...el.querySelectorAll('input[type="radio"]')][0] as HTMLInputElement;
  await click(radio);
  await act(async () => type(byLabel("Review admin fee for PA-104"), "11.00"));
  expect(el.textContent).toContain("cannot exceed the current fee");
  await act(async () => { type(byLabel("Review admin fee for PA-104"), "10.00"); type(inputByLabelText("Reason (audited)"), "Bank statement"); });
  await click(btn("Confirm 1 reviewed")); await flush();
  const call = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(call[0]).toBe("/api/admin/reshippers/kai/gb/g1/payouts/review");
  expect(JSON.parse(String(call[1]!.body))).toEqual({ reason: "Bank statement", orders: [{ orderId: "o4", collector: "admin", adminFee: "10.00", postage: "5.00" }] });
});

it("shows full incoming customer TXIDs before reviewing and explains absent chain records", async () => {
  const d = data();
  const txid = `0x${"a1".repeat(32)}`;
  Object.assign(d.orders[3], { paymentTxids: [txid, "b".repeat(64)] });
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher: async () => json(d) });
  const review = q('section[aria-label="Review historical collections"]');
  expect(review.textContent).toContain("Customer payment TXIDs");
  expect(review.textContent).toContain(txid);
  expect(review.textContent).toContain("b".repeat(64));
  expect(review.querySelectorAll("code")).toHaveLength(2);
  d.orders[3] = { ...d.orders[3], paymentTxids: [] };
  await render({ mode: "admin", username: "kai", gbId: "g2", fetcher: async () => json(d) });
  expect(q('section[aria-label="Review historical collections"]').textContent).toContain("No blockchain TXID recorded");
});

it("shows load errors with retry", async () => {
  const fetcher = vi.fn(async () => json({ error: "Not your group buy" }, 403));
  await render({ mode: "reshipper", gbId: "g1", fetcher });
  expect(q('[role="alert"]').textContent).toContain("Not your group buy");
});

it("bulk-checks payment wallets and shows unmatched orders without marking them paid", async () => {
  const d = data();
  Object.assign(d, { collectionWallets: [{ collector: "admin", address: "0xabc", network: "ERC-20", effectiveFrom: "2026-01-01T00:00:00Z", effectiveUntil: null }] });
  const response = { ...d, walletCheckResults: [{ orderId: "o4", code: "PA-104", collector: null, reason: "Multiple payments need review." }] };
  const fetcher = vi.fn(async (_p: string, init?: RequestInit) => json(init?.method === "POST" ? response : d));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await click(btn("Check payment wallets"));
  const post = fetcher.mock.calls.find(call => call[1]?.method === "POST")!;
  expect(post[0]).toBe("/api/admin/reshippers/kai/gb/g1/payouts/check-wallets");
  expect(JSON.parse(String(post[1]!.body))).toEqual({ orderIds: ["o4"] });
  expect(el.textContent).toContain("Multiple payments need review.");
  expect(byLabel("Select order PA-104").disabled).toBe(true);
});

it("saves a dated wallet ownership declaration for bulk collection checks", async () => {
  const fetcher = vi.fn(async (_p: string, _init?: RequestInit) => json(data()));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  await act(async () => {
    type(inputByLabelText("Wallet address"), `0x${"2".repeat(40)}`);
    type(inputByLabelText("Owned from"), "2026-01-01");
  });
  await click(byLabel("Confirm wallet ownership"));
  await click(btn("Save wallet ownership"));
  const post = fetcher.mock.calls.find(call => call[1]?.method === "POST")!;
  expect(post[0]).toBe("/api/admin/reshippers/kai/gb/g1/payouts/wallets");
  expect(JSON.parse(String(post[1]!.body))).toMatchObject({ collector: "admin", network: "ERC-20", effectiveFrom: "2026-01-01T00:00:00.000Z", confirmed: true });
});

it("uses settled review caps and enforces a 5-character reason", async () => {
  const d = data();
  Object.assign(d.orders[3], { reviewAdminMinor: 1250, reviewPostageMinor: 300 });
  const fetcher = vi.fn(async (_p: string, _i?: RequestInit) => json(d));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  expect(el.textContent).toContain("Max: USD 12.50 fee, USD 3.00 postage");
  await click(el.querySelectorAll('input[type="radio"]')[0]);
  expect(byLabel("Review admin fee for PA-104").value).toBe("12.50");
  await act(async () => type(byLabel("Review postage for PA-104"), "3.01"));
  expect(el.textContent).toContain("cannot exceed the current fee");
  await act(async () => { type(byLabel("Review postage for PA-104"), "3.00"); type(inputByLabelText("Reason (audited)"), "ok"); });
  expect(el.textContent).toContain("at least 5 characters");
  expect(btn("Confirm 1 reviewed").disabled).toBe(true);
  await act(async () => type(inputByLabelText("Reason (audited)"), "Fee raised"));
  await click(btn("Confirm 1 reviewed")); await flush();
  const call = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(JSON.parse(String(call[1]!.body)).orders[0]).toEqual({ orderId: "o4", collector: "admin", adminFee: "12.50", postage: "3.00" });
});

it("correction toggle exposes previously reviewed orders only on demand", async () => {
  const d = data();
  d.orders = [order({ orderId: "o5", code: "PA-105", status: "not_owed", collector: "reshipper", reviewable: true, eligible: false }), order({ orderId: "o6", code: "PA-106" })];
  d.needsReviewCount = 0;
  const fetcher = vi.fn(async (_p: string, _i?: RequestInit) => json(d));
  await render({ mode: "admin", username: "kai", gbId: "g1", fetcher });
  expect(byLabel("Review admin fee for PA-105")).toBeNull();
  expect(el.querySelectorAll('input[type="radio"]').length).toBe(0);
  await click(btn("Correct a previous review (1)"));
  expect(el.textContent).toContain("Currently: Paid directly to reshipper");
  await click(el.querySelectorAll('input[type="radio"]')[0]);
  await act(async () => type(inputByLabelText("Reason (audited)"), "Was Admin-held after all"));
  await click(btn("Confirm 1 reviewed")); await flush();
  const call = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(JSON.parse(String(call[1]!.body)).orders).toEqual([{ orderId: "o5", collector: "admin", adminFee: "10.00", postage: "5.00" }]);
});
