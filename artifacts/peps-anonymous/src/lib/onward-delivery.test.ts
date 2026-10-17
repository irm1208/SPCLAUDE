import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePriceInput, countKits, kitBand, normaliseMatrix, parseEstimate, selectionIsStale,
  statusMessage, onwardApi, filledRateCount, ONWARD_CAPTION,
} from "./onward-delivery";

test("blank price maps to null, never 0", () => {
  assert.equal(parsePriceInput(""), null);
  assert.equal(parsePriceInput("  "), null);
  assert.equal(parsePriceInput("0"), 0);
  assert.equal(parsePriceInput("4,50"), 4.5);
  assert.equal(parsePriceInput("-1"), undefined);
  assert.equal(parsePriceInput("abc"), undefined);
});

test("kits count halves and ignore blank lines; bands", () => {
  assert.equal(countKits([{ productId: "a", quantity: 2 }, { productId: "b", quantity: 0.5 }, { productId: "", quantity: 3 }]), 2.5);
  assert.equal(kitBand(0), "none");
  assert.equal(kitBand(0.5), "small");
  assert.equal(kitBand(5), "small");
  assert.equal(kitBand(5.5), "large");
  assert.equal(kitBand(25), "large");
  assert.equal(kitBand(25.5), "quote");
});

test("normaliseMatrix fills every country with nulls and keeps prices", () => {
  const m = normaliseMatrix({ enabled: true, currency: "USD", rates: [{ country: "DE", pickupSmall: 5, pickupLarge: null, homeSmall: 8, homeLarge: 12 }] },
    [{ code: "AT", name: "Austria" }, { code: "DE", name: "Germany" }]);
  assert.equal(m.rates.length, 2);
  assert.deepEqual(m.rates[0], { country: "AT", pickupSmall: null, pickupLarge: null, homeSmall: null, homeLarge: null });
  assert.equal(m.rates[1].homeLarge, 12);
  assert.equal(filledRateCount(m), 1);
  assert.equal(normaliseMatrix(null, [{ code: "AT", name: "Austria" }]).enabled, false);
});

test("stale saved method requires reselection", () => {
  const e = parseEstimate({ status: "available", country: "DE", kits: 3, currency: "EUR", reshipperUsername: "r", options: [{ method: "pickup", amount: 4 }], selectedMethod: "home" });
  assert.equal(e.selectedMethod, "home");
  assert.equal(selectionIsStale(e, "home"), true);
  assert.equal(selectionIsStale(e, "pickup"), false);
  assert.equal(selectionIsStale(e, null), false);
});

test("parseEstimate tolerates junk and status copy is explicit", () => {
  const e = parseEstimate({ status: "weird", options: [{ method: "drone", amount: 1 }] });
  assert.equal(e.status, "unavailable");
  assert.equal(e.options.length, 0);
  assert.equal(parseEstimate({ status: "unavailable", configured: true }).configured, true);
  assert.equal(parseEstimate({ status: "unavailable", configured: false }).configured, false);
  assert.match(statusMessage(parseEstimate({ status: "quote_required" })), /25/);
  assert.match(statusMessage(parseEstimate({ status: "unassigned" })), /Pending/);
  assert.match(ONWARD_CAPTION, /not included in order total/);
});

test("api calls hit contract routes with JSON bodies and surface server errors", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const ok = (body: unknown) => async (url: string, init?: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status: 200 }); };
  await onwardApi.estimate(ok({ status: "unassigned" }), "gb1", { country: "DE", kits: 2 });
  assert.equal(calls[0].url, "/api/group-buys/gb1/onward-delivery/estimate");
  assert.equal(calls[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { country: "DE", kits: 2 });
  await onwardApi.setOrder(ok({ status: "available", options: [] }), "o1", null);
  assert.equal(calls[1].url, "/api/orders/o1/onward-delivery");
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { method: null });
  await onwardApi.saveMatrix(ok({ matrix: {} }), "admin", "gb1", "bob", { enabled: true, currency: "EUR", rates: [] }, { headers: { "x-admin-secret": "s" } });
  assert.equal(calls[2].url, "/api/admin/group-buys/gb1/onward-delivery/bob");
  assert.equal((calls[2].init?.headers as Record<string, string>)["x-admin-secret"], "s");
  await onwardApi.getManagerOrder(ok({}), "organiser", "gb1", "o1");
  assert.equal(calls[3].url, "/api/organiser/group-buys/gb1/orders/o1/onward-delivery");
  await onwardApi.getReshipperOrder(ok({}), "gb1", "o1");
  assert.equal(calls[4].url, "/api/reshipper/gb/gb1/orders/o1/onward-delivery");
  const fail = async () => new Response(JSON.stringify({ error: "Not your order" }), { status: 403 });
  await assert.rejects(onwardApi.getOrder(fail, "o1"), /Not your order/);
});
