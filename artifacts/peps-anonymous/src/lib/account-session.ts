export const ACCOUNT_ACTIVITY_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const ACCOUNT_ACTIVITY_RETRY_INTERVAL_MS = 30 * 1000;

export function shouldRefreshAccountSession(
  lastRefreshAt: number | null,
  now: number,
  minimumIntervalMs = ACCOUNT_ACTIVITY_REFRESH_INTERVAL_MS,
): boolean {
  return lastRefreshAt === null || now - lastRefreshAt >= minimumIntervalMs;
}

export async function readAccountSessionResponse<T extends object>(
  response: Response,
  restrictedAccount: T,
): Promise<T | null> {
  if (response.status === 401) return null;
  if (response.status === 403) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    return body?.error === "verification_required" ? restrictedAccount : null;
  }
  if (!response.ok) {
    throw new Error(`Unable to verify account session (${response.status})`);
  }
  return response.json() as Promise<T>;
}