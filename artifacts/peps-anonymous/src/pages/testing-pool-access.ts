const accessKey = (slug: string) => `testing-pool-access:${slug}`;

export function saveTestingPoolAccessCode(slug: string, code: string): void {
  sessionStorage.setItem(accessKey(slug), code.trim());
}

export function buildTestingPoolHeaders(code: string | null, existing?: HeadersInit): Headers {
  const headers = new Headers(existing);
  if (code) headers.set("x-pool-access-code", code);
  return headers;
}

export function testingPoolFetch(slug: string, url: string, init: RequestInit = {}): Promise<Response> {
  const code = sessionStorage.getItem(accessKey(slug));
  return fetch(url, { ...init, headers: buildTestingPoolHeaders(code, init.headers) });
}