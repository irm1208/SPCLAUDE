import assert from "node:assert/strict";
import test from "node:test";
import {
  OrganiserApiError,
  createOrganiserApi,
  mapApiGroupBuy,
  mapApiOrder,
  organiserRequest,
} from "./organiser-api.ts";

test("organiserRequest uses the same-origin API with authenticated cookies", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await organiserRequest<{ ok: boolean }>(
    "/organiser/group-buys/gb-1",
    { method: "PATCH", body: { status: "closed" } },
    fetcher,
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(requestUrl, "/api/organiser/group-buys/gb-1");
  assert.equal(requestInit?.credentials, "include");
  assert.equal(new Headers(requestInit?.headers).get("content-type"), "application/json");
  assert.equal(requestInit?.body, JSON.stringify({ status: "closed" }));
});

test("organiserRequest exposes status and server error messages", async () => {
  const fetcher: typeof fetch = async () => new Response(
    JSON.stringify({ error: "Group buy not found" }),
    { status: 404, headers: { "content-type": "application/json" } },
  );

  await assert.rejects(
    organiserRequest("/organiser/group-buys/missing", undefined, fetcher),
    (error: unknown) => {
      assert.ok(error instanceof OrganiserApiError);
      assert.equal(error.status, 404);
      assert.equal(error.message, "Group buy not found");
      return true;
    },
  );
});

test("mapApiOrder normalizes the live organiser order response", () => {
  const order = mapApiOrder({
    id: "order-1",
    code: "GB-1042",
    telegramUsername: "@member_one",
    status: "Processing",
    paymentStatus: "confirmed",
    grandTotal: 92.5,
    deliveryMethod: "UK Tracked",
    shippingName: "Member One",
    shippingCountry: "United Kingdom",
    accountCountry: "United Kingdom",
    trackingNumber: "TRACK-1",
    adminNotes: "Keep chilled",
    paymentTxHash: "fiat:revolut",
    paymentMethod: "revolut",
    createdAt: "2026-07-15T10:00:00.000Z",
    paymentConfirmedAt: "2026-07-15T10:30:00.000Z",
    lineItems: [
      {
        id: "line-1",
        productId: "product-1",
        productName: "Tirzepatide 10mg",
        quantity: 2,
        unitPrice: 40,
        lineTotal: 80,
        isOos: false,
      },
    ],
  });

  assert.equal(order.id, "order-1");
  assert.equal(order.memberUsername, "member_one");
  assert.equal(order.memberName, "Member One");
  assert.equal(order.status, "processing");
  assert.equal(order.total, 92.5);
  assert.equal(order.paymentMethod, "Revolut");
  assert.equal(order.paymentProof?.value, "fiat:revolut");
  assert.equal(order.products[0].id, "line-1");
  assert.equal(order.products[0].productId, "product-1");
  assert.equal(order.products[0].name, "Tirzepatide 10mg");
  assert.equal(order.paidAt, "2026-07-15T10:30:00.000Z");
});

test("mapApiOrder derives pending and completed workflow states", () => {
  const base = {
    id: "order-2",
    telegramUsername: "member_two",
    grandTotal: 20,
    deliveryMethod: null,
    shippingName: null,
    shippingCountry: null,
    accountCountry: "Germany",
    createdAt: "2026-07-15T10:00:00.000Z",
    lineItems: [],
  };

  assert.equal(mapApiOrder({ ...base, status: "Submitted", paymentStatus: "unpaid" }).status, "pending");
  assert.equal(mapApiOrder({ ...base, status: "Submitted", paymentStatus: "confirmed" }).status, "paid");
  assert.equal(mapApiOrder({ ...base, status: "Completed", paymentStatus: "confirmed" }).status, "delivered");
  assert.equal(mapApiOrder({ ...base, status: "Cancelled", paymentStatus: "unpaid" }).status, "cancelled");
});

test("mapApiGroupBuy supplies the workspace contract from the live group buy", () => {
  const groupBuy = mapApiGroupBuy({
    id: "gb-1",
    name: "Summer Peptide Run",
    status: "active",
    currency: "GBP",
    closeDate: "2026-08-01T18:00:00.000Z",
    memberLimit: 75,
  });

  assert.deepEqual(groupBuy, {
    id: "gb-1",
    name: "Summer Peptide Run",
    status: "active",
    currency: "GBP",
    closeDate: "2026-08-01T18:00:00.000Z",
    members: 0,
    maxMembers: 75,
    activeOrders: 0,
    revenue: 0,
    pendingPayments: 0,
    pendingLabs: 0,
    openTickets: 0,
  });
});

test("createOrganiserApi exposes the replacement workspace resource endpoints", async () => {
  const requests: Array<{ url: string; method: string }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), method: init?.method ?? "GET" });
    const url = String(input);
    const body = url.includes("/tickets") ? { tickets: [] }
      : url.includes("/testing") ? {
        round: null,
        products: [],
        labTests: [],
        contributions: { pending: 0, confirmed: 0, rejected: 0, total: 0 },
        poolTotal: 0,
        contributorCount: 0,
        totalVotes: 0,
        milestones: [],
        votes: [],
        testVotes: {},
      }
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  const api = createOrganiserApi(fetcher);

  await api.createGroupBuy({ name: "Summer Run" });
  await api.requestPublic("gb / one");
  await api.members("gb / one");
  await api.tickets("gb / one");
  await api.testingPool("gb / one");
  await api.testingPoolSnapshot("gb / one");
  await api.products("gb / one");
  await api.labTests();

  assert.deepEqual(requests, [
    { url: "/api/organiser/group-buys", method: "POST" },
    { url: "/api/organiser/group-buys/gb%20%2F%20one/request-public", method: "PATCH" },
    { url: "/api/organiser/group-buys/gb%20%2F%20one/members", method: "GET" },
    { url: "/api/organiser/tickets?groupBuyId=gb%20%2F%20one", method: "GET" },
    { url: "/api/organiser/group-buys/gb%20%2F%20one/testing", method: "GET" },
    { url: "/api/group-buys/gb%20%2F%20one/testing", method: "GET" },
    { url: "/api/organiser/group-buys/gb%20%2F%20one/products", method: "GET" },
    { url: "/api/organiser/lab-tests", method: "GET" },
  ]);
});
