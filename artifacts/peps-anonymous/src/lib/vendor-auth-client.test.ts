import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { clearVendorCsrfToken, vendorFetch } from './vendor-auth-client.ts';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearVendorCsrfToken(); });
test('restores vendor CSRF before sending a mutation and includes cookies', async () => {
  const calls: Array<[string, RequestInit | undefined]> = [];
  globalThis.fetch = async (url, options) => {
    calls.push([String(url), options]);
    return new Response(JSON.stringify({ csrfToken: 'vendor-only' }), { status: 200 });
  };
  await vendorFetch('/api/vendor/orders/one', { method: 'PATCH' });
  assert.equal(calls[0][0], '/api/vendor/auth/session');
  assert.equal(new Headers(calls[1][1]?.headers).get('x-vendor-csrf'), 'vendor-only');
  assert.equal(calls[1][1]?.credentials, 'include');
});
test('a member session cannot supply vendor mutation credentials', async () => {
  const calls: string[] = [];
  globalThis.fetch = async url => { calls.push(String(url)); return new Response('{}', { status: 401 }); };
  const response = await vendorFetch('/api/vendor/orders/one', { method: 'PATCH', headers: { 'x-vendor-csrf': 'member-token' } });
  assert.equal(response.status, 401);
  assert.deepEqual(calls, ['/api/vendor/auth/session']);
});
test('expires the cached vendor token on unauthorized responses', async () => {
  let sessions = 0;
  let mutations = 0;
  globalThis.fetch = async url => {
    if (String(url).endsWith('/auth/session')) { sessions++; return new Response(JSON.stringify({ csrfToken: `token-${sessions}` })); }
    mutations++; return new Response('{}', { status: mutations === 1 ? 401 : 200 });
  };
  await vendorFetch('/api/vendor/orders/one', { method: 'PATCH' });
  await vendorFetch('/api/vendor/orders/two', { method: 'PATCH' });
  assert.equal(sessions, 2);
});
