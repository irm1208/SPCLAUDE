import { createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export const signWebhook = (timestamp: string, rawBody: Buffer, signingMaterial: string) => createHmac("sha256", signingMaterial).update(`${timestamp}.`).update(rawBody).digest("hex");
export function verifyWebhookSignature(timestamp: string, rawBody: Buffer, signingMaterial: string, signature: string, toleranceSeconds = 300) {
  if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = signWebhook(timestamp, rawBody, signingMaterial); return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
const blocked = (address: string) => {
  const normalized = address.toLowerCase().split("%")[0];
  if (!isIP(normalized)) return true;
  if (normalized.startsWith("::ffff:")) return blocked(normalized.slice(7));
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) || normalized.startsWith("ff");
};
export type WebhookLookup = (hostname: string) => Promise<{ address: string; family: number }[]>;
export type WebhookSecurity = { allowLocal?: boolean; lookup?: WebhookLookup };
export async function validateWebhookUrl(value: string, options: boolean | WebhookSecurity = {}) {
  const { allowLocal = false, lookup: resolve = async (hostname: string) => lookup(hostname, { all: true }) } = typeof options === "boolean" ? { allowLocal: options } : options;
  let url: URL; try { url = new URL(value); } catch { throw new Error("invalid webhook URL"); }
  if (url.username || url.password) throw new Error("webhook URL must not include credentials");
  if (url.protocol !== "https:" && !allowLocal) throw new Error("webhook URL must use HTTPS");
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("invalid webhook URL protocol");
  if (allowLocal) return url;
  const addresses = await resolve(url.hostname);
  if (!allowLocal && (addresses.length === 0 || addresses.some((entry) => blocked(entry.address)))) throw new Error("webhook URL is not publicly routable");
  return url;
}
export const redactResponse = (value: string) => value.replace(/(?:authorization|token|secret|password)\s*[:=]\s*\S+/gi, "[redacted]").slice(0, 512);
export type WebhookFetch = (url: URL, init: RequestInit) => Promise<Response>;
const securePost: WebhookFetch = async (url, init) => {
  const security = init as RequestInit & { webhookAddresses?: { address: string; family: number }[]; webhookAllowLocal?: boolean };
  const addresses = security.webhookAddresses!;
  const body = Buffer.from(init.body as Uint8Array);
  return new Promise<Response>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      method: "POST", headers: init.headers as Record<string, string>, timeout: 10_000,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, addresses[0].family),
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 500 })));
    });
    request.on("socket", (socket) => socket.once("connect", () => {
      if (!security.webhookAllowLocal && (!socket.remoteAddress || blocked(socket.remoteAddress))) request.destroy(new Error("connected address is not publicly routable"));
    }));
    request.on("timeout", () => request.destroy(new Error("delivery timeout")));
    request.on("error", reject);
    request.end(body);
  });
};
export async function deliverWebhook(url: URL, rawBody: Buffer, signingMaterial: string, send: WebhookFetch = securePost, security: WebhookSecurity = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    await validateWebhookUrl(url.toString(), security);
    const resolve = security.lookup ?? (async (hostname: string) => lookup(hostname, { all: true }));
    const addresses = await resolve(url.hostname);
    if (!security.allowLocal && (addresses.length === 0 || addresses.some((entry) => blocked(entry.address)))) throw new Error("webhook URL is not publicly routable");
    const requestInit: RequestInit & { webhookAddresses: { address: string; family: number }[]; webhookAllowLocal: boolean } = {
      method: "POST", body: new Uint8Array(rawBody), redirect: "error", signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json", "x-webhook-timestamp": timestamp, "x-webhook-signature": signWebhook(timestamp, rawBody, signingMaterial) },
      webhookAddresses: addresses,
      webhookAllowLocal: security.allowLocal === true,
    };
    const response = await send(url, requestInit);
    return { ok: response.ok, responseStatus: response.status, responseExcerpt: redactResponse(await response.text()) };
  } catch { return { ok: false, responseStatus: 0, responseExcerpt: "delivery unavailable" }; }
}