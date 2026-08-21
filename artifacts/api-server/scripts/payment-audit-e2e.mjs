const apiBase = process.env.PAYMENT_AUDIT_BASE_URL
  ?? `http://127.0.0.1:${process.env.API_PORT ?? "8080"}/api`;
const adminSecret = process.env.ADMIN_SECRET;

if (!adminSecret) {
  throw new Error("ADMIN_SECRET must be available to run the Payment Audit E2E check.");
}

const authHeaders = { "x-admin-secret": adminSecret };
const jsonHeaders = { ...authHeaders, "content-type": "application/json" };

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function effectiveStatus(item) {
  return item.latestAudit?.status
    ?? (item.txKind === "crypto" ? "review" : "not_chain");
}

const summary = {
  unauthenticated: {},
  scopes: {},
  statuses: {},
  controlledCheck: null,
  walletLifecycle: null,
};
let temporaryWalletId;

try {
  for (const [name, path, init] of [
    ["read", "/admin/payment-audit?scope=all&status=all&limit=1", {}],
    ["createWallet", "/admin/payment-audit/wallet-history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scope: "all",
        network: "unauthenticated-test",
        address: "unauthenticated-test",
        effectiveFrom: "2026-08-20T00:00:00.000Z",
      }),
    }],
    ["deleteWallet", "/admin/payment-audit/wallet-history/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    }],
  ]) {
    const { response } = await request(path, init);
    assert(response.status === 401, `${name} without credentials returned ${response.status}, expected 401`);
    summary.unauthenticated[name] = response.status;
  }

  for (const scope of ["group_buy", "wholesale", "shared_order"]) {
    const { response, body } = await request(
      `/admin/payment-audit?scope=${scope}&status=all&limit=100`,
      { headers: authHeaders },
    );
    assert(response.ok, `${scope} filter returned ${response.status}`);
    assert(body.total > 0, `${scope} filter returned no references`);
    assert(body.items.every(item => item.scope === scope), `${scope} filter returned a mismatched reference`);
    summary.scopes[scope] = { total: body.total, returned: body.items.length };
  }

  for (const status of ["verified", "underpaid", "wrong_wallet", "review", "not_chain"]) {
    const { response, body } = await request(
      `/admin/payment-audit?scope=all&status=${status}&limit=100`,
      { headers: authHeaders },
    );
    assert(response.ok, `${status} filter returned ${response.status}`);
    assert(body.items.every(item => effectiveStatus(item) === status), `${status} filter returned an invalid status`);
    summary.statuses[status] = { total: body.total, returned: body.items.length };
  }

  const { response: initialResponse, body: initialBody } = await request(
    "/admin/payment-audit?scope=all&status=all&limit=250",
    { headers: authHeaders },
  );
  assert(initialResponse.ok, `initial audit list returned ${initialResponse.status}`);
  const target = initialBody.items.find(item => item.txKind === "crypto");
  assert(target, "No crypto reference was available for the controlled audit check.");

  const { response: searchResponse, body: searchBody } = await request(
    `/admin/payment-audit?scope=${target.scope}&status=all&search=${encodeURIComponent(target.code)}&limit=100`,
    { headers: authHeaders },
  );
  assert(searchResponse.ok, `search returned ${searchResponse.status}`);
  assert(
    searchBody.items.some(item => item.id === target.id && item.txHash === target.txHash && item.reference === target.reference),
    "Search did not return the selected crypto reference",
  );

  const beforePaymentStatus = target.paymentStatus;
  const { response: checkResponse, body: checkBody } = await request(
    "/admin/payment-audit/check",
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ orderId: target.id, txHash: target.txHash, source: target.reference }),
    },
  );
  assert(checkResponse.ok, `controlled audit check returned ${checkResponse.status}`);
  assert(checkBody.item?.latestAudit?.checkedAt, "controlled check did not record an audit snapshot");
  assert(checkBody.item.paymentStatus === beforePaymentStatus, "controlled check changed paymentStatus");

  const auditStatus = effectiveStatus(checkBody.item);
  const { response: afterResponse, body: afterBody } = await request(
    `/admin/payment-audit?scope=${target.scope}&status=${auditStatus}&search=${encodeURIComponent(target.code)}&limit=100`,
    { headers: authHeaders },
  );
  assert(afterResponse.ok, `post-check search returned ${afterResponse.status}`);
  const refreshed = afterBody.items.find(item =>
    item.id === target.id && item.txHash === target.txHash && item.reference === target.reference);
  assert(refreshed?.latestAudit?.checkedAt, "saved audit snapshot was not returned");
  assert(refreshed.paymentStatus === beforePaymentStatus, "fresh order data changed paymentStatus");
  summary.controlledCheck = {
    scope: target.scope,
    auditStatus,
    beforePaymentStatus,
    afterPaymentStatus: refreshed.paymentStatus,
    snapshotRecorded: true,
  };

  const marker = `payment-audit-e2e-${Date.now()}`;
  const { response: createResponse, body: createBody } = await request(
    "/admin/payment-audit/wallet-history",
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        scope: "shared_order",
        network: marker,
        address: `temporary-wallet-${marker}`,
        effectiveFrom: "2026-08-20T12:00:00.000Z",
        effectiveUntil: "2026-08-21T12:00:00.000Z",
        note: "Temporary E2E validation; removed immediately.",
      }),
    },
  );
  assert(createResponse.status === 201 && createBody.entry?.id, `wallet create returned ${createResponse.status}`);
  temporaryWalletId = createBody.entry.id;

  const { response: walletReadResponse, body: walletReadBody } = await request(
    "/admin/payment-audit/wallet-history",
    { headers: authHeaders },
  );
  assert(walletReadResponse.ok, `wallet read returned ${walletReadResponse.status}`);
  assert(walletReadBody.entries.some(entry => entry.id === temporaryWalletId && entry.network === marker), "created wallet row was not returned");

  const { response: deleteResponse } = await request(
    `/admin/payment-audit/wallet-history/${temporaryWalletId}`,
    { method: "DELETE", headers: authHeaders },
  );
  assert(deleteResponse.ok, `wallet delete returned ${deleteResponse.status}`);
  temporaryWalletId = undefined;

  const { response: finalWalletResponse, body: finalWalletBody } = await request(
    "/admin/payment-audit/wallet-history",
    { headers: authHeaders },
  );
  assert(finalWalletResponse.ok && !finalWalletBody.entries.some(entry => entry.network === marker), "temporary wallet row remained");
  summary.walletLifecycle = { created: true, removed: true, dated: true };

  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (temporaryWalletId) {
    await request(`/admin/payment-audit/wallet-history/${temporaryWalletId}`, {
      method: "DELETE",
      headers: authHeaders,
    }).catch(() => {});
  }
}