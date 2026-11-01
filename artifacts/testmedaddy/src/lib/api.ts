/**
 * Testmedaddy API client. Cookies carry the session; mutations also send the CSRF token
 * that the server derives from the session. Invite codes and guest claim tokens are kept
 * per pool in browser storage so a shared link keeps working across reloads.
 */
export class ApiError extends Error {
  constructor(message: string, public status: number, public body: any = null) { super(message); this.name = "ApiError"; }
}

let csrfToken: string | null = null;
let restoring: Promise<boolean> | null = null;
export const setCsrfToken = (token: string | null) => { csrfToken = token; };

export async function restoreSession(): Promise<{ user: any; csrfToken: string } | null> {
  const res = await fetch("/api/tmd/auth/session", { credentials: "include", cache: "no-store" });
  if (!res.ok) { csrfToken = null; return null; }
  const body = await res.json();
  csrfToken = typeof body.csrfToken === "string" ? body.csrfToken : null;
  return body;
}

type Options = { headers?: Record<string, string>; form?: FormData; signal?: AbortSignal };
export async function api<T = any>(method: string, path: string, body?: unknown, options: Options = {}): Promise<T> {
  const mutation = !["GET", "HEAD"].includes(method);
  if (mutation && !csrfToken) {
    restoring ??= restoreSession().then(s => !!s).catch(() => false).finally(() => { restoring = null; });
    await restoring;
  }
  const headers = new Headers(options.headers);
  if (mutation && csrfToken) headers.set("x-tmd-csrf", csrfToken);
  let payload: BodyInit | undefined;
  if (options.form) payload = options.form;
  else if (body !== undefined) { headers.set("Content-Type", "application/json"); payload = JSON.stringify(body); }
  const res = await fetch(path, { method, headers, body: payload, credentials: "include", cache: "no-store", signal: options.signal });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (res.status === 401 && path.startsWith("/api/tmd/auth/")) csrfToken = null;
  if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  return data as T;
}
export const get = <T = any>(path: string, options?: Options) => api<T>("GET", path, undefined, options);
export const post = <T = any>(path: string, body?: unknown, options?: Options) => api<T>("POST", path, body, options);
export const put = <T = any>(path: string, body?: unknown, options?: Options) => api<T>("PUT", path, body, options);
export const patch = <T = any>(path: string, body?: unknown, options?: Options) => api<T>("PATCH", path, body, options);
export const del = <T = any>(path: string, body?: unknown, options?: Options) => api<T>("DELETE", path, body, options);
export function upload<T = any>(path: string, file: File, fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", file);
  return api<T>("POST", path, undefined, { form });
}

/** `tmd/batch/<uuid>.webp` → `/api/tmd/files/batch/<uuid>.webp` */
export const fileUrl = (key: string | null | undefined, query = "") => key ? `/api/tmd/files/${key.replace(/^tmd\//, "")}${query}` : "";

/* ---- Per-pool access state ---------------------------------------------------- */
const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
export const poolAccess = {
  code(slug: string) { return safe(() => sessionStorage.getItem(`tmd:code:${slug}`), null); },
  setCode(slug: string, code: string | null) { safe(() => code ? sessionStorage.setItem(`tmd:code:${slug}`, code) : sessionStorage.removeItem(`tmd:code:${slug}`), undefined); },
  claim(slug: string) { return safe(() => localStorage.getItem(`tmd:claim:${slug}`), null); },
  setClaim(slug: string, claim: string | null) { safe(() => claim ? localStorage.setItem(`tmd:claim:${slug}`, claim) : localStorage.removeItem(`tmd:claim:${slug}`), undefined); },
  /** Headers and query string for a pool request. */
  params(slug: string) {
    const code = this.code(slug), claim = this.claim(slug);
    const headers: Record<string, string> = {};
    if (code) headers["x-tmd-access-code"] = code;
    const query = claim ? `?claim=${encodeURIComponent(claim)}` : "";
    return { headers, query, claim };
  },
};
