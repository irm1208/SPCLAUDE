import { createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";

export const signWebhook = (timestamp: string, rawBody: Buffer, signingMaterial: string) => createHmac("sha256", signingMaterial).update(`${timestamp}.`).update(rawBody).digest("hex");
export function verifyWebhookSignature(timestamp: string, rawBody: Buffer, signingMaterial: string, signature: string, toleranceSeconds = 300) {
  if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = signWebhook(timestamp, rawBody, signingMaterial); return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
const blocked = (address: string) => /^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(address);
export async function validateWebhookUrl(value: string, allowLocal = false) {
  let url: URL; try { url = new URL(value); } catch { throw new Error("invalid webhook URL"); }
  if (url.protocol !== "https:" && !allowLocal) throw new Error("webhook URL must use HTTPS");
  const addresses = await lookup(url.hostname, { all: true });
  if (!allowLocal && (addresses.length === 0 || addresses.some((entry) => blocked(entry.address)))) throw new Error("webhook URL is not publicly routable");
  return url;
}
export const redactResponse = (value: string) => value.replace(/(?:authorization|token|secret|password)\s*[:=]\s*\S+/gi, "[redacted]").slice(0, 512);
export type WebhookFetch = (url: URL, init: RequestInit) => Promise<Response>;
export async function deliverWebhook(url: URL, rawBody: Buffer, signingMaterial: string, send: WebhookFetch = (target, init) => fetch(target, init)) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const response = await send(url, {
      method: "POST", body: new Uint8Array(rawBody), redirect: "error", signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json", "x-webhook-timestamp": timestamp, "x-webhook-signature": signWebhook(timestamp, rawBody, signingMaterial) },
    });
    return { ok: response.ok, responseStatus: response.status, responseExcerpt: redactResponse(await response.text()) };
  } catch { return { ok: false, responseStatus: 0, responseExcerpt: "delivery unavailable" }; }
}