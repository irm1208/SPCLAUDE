const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface TurnstileVerificationInput {
  token: string | undefined | null;
  remoteIp?: string;
}

export interface TurnstileVerificationConfig {
  secretKey?: string;
  fetchFn?: TurnstileFetch;
  production?: boolean;
}

/**
 * Validates a single Turnstile response server-side. This deliberately returns
 * no upstream detail: callers must expose only their own generic failure.
 */
export async function verifyTurnstile(
  { token, remoteIp }: TurnstileVerificationInput,
  config: TurnstileVerificationConfig = {},
): Promise<{ ok: boolean }> {
  const secretKey = config.secretKey ?? process.env["TURNSTILE_SECRET_KEY"];
  if (!token?.trim() || !secretKey) return { ok: false };

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await (config.fetchFn ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { ok: false };
    const result = await response.json() as { success?: unknown };
    return { ok: result.success === true };
  } catch {
    return { ok: false };
  }
}