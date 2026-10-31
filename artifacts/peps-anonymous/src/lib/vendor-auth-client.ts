/** Vendor credentials are independent from member authentication and stay in memory. */
let csrfToken: string | null = null;
let restoring: Promise<Response> | null = null;
export function setVendorCsrfToken(token: string) { csrfToken = token; }
export function clearVendorCsrfToken() { csrfToken = null; }
export async function restoreVendorSession(): Promise<Response> {
  const response = await fetch('/api/vendor/auth/session', { credentials: 'include', cache: 'no-store' });
  if (response.ok) {
    const body = await response.clone().json();
    csrfToken = typeof body.csrfToken === 'string' ? body.csrfToken : null;
  } else { clearVendorCsrfToken(); }
  return response;
}
export async function vendorFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes((options.method ?? 'GET').toUpperCase());
  if (mutation && !csrfToken) {
    restoring ??= restoreVendorSession().finally(() => { restoring = null; });
    const session = await restoring;
    if (!session.ok) return session;
    if (!csrfToken) return new Response(JSON.stringify({ error: 'Vendor session unavailable. Sign in again.' }), { status: 401 });
  }
  const headers = new Headers(options.headers);
  if (mutation) headers.set('x-vendor-csrf', csrfToken!);
  const response = await fetch(url, { ...options, credentials: 'include', headers });
  if (response.status === 401 || (url === '/api/vendor/auth/logout' && response.ok)) clearVendorCsrfToken();
  return response;
}
