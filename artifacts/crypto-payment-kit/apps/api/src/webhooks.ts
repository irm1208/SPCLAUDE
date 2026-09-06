import { createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export const signWebhook = (timestamp: string, rawBody: Buffer, signingMaterial: string) => createHmac("sha256", signingMaterial).update(`${timestamp}.`).update(rawBody).digest("hex");
export function verifyWebhookSignature(timestamp: string, rawBody: Buffer, signingMaterial: string, signature: string, toleranceSeconds = 300) {
  if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = signWebhook(timestamp, rawBody, signingMaterial); return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
const nonPublicIpv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) nonPublicIpv4.addSubnet(network, prefix, "ipv4");
const nonPublicIpv6 = new BlockList();
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b:1::", 48], ["100::", 64],
  ["2001::", 32], ["2001:2::", 48], ["2001:10::", 28], ["2001:20::", 28],
  ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20], ["fc00::", 7],
  ["fe80::", 10], ["ff00::", 8],
] as const) nonPublicIpv6.addSubnet(network, prefix, "ipv6");

export const isPublicGlobalUnicast = (address: string): boolean => {
  const normalized = address.toLowerCase().split("%")[0];
  const family = isIP(normalized);
  if (family === 4) return !nonPublicIpv4.check(normalized, "ipv4");
  if (family === 6) {
    // Public IPv6 allocations are made only from 2000::/3. Explicitly deny
    // non-global special assignments within that allocation as well.
    return !nonPublicIpv6.check(normalized, "ipv6") &&
      normalizedBlock.check(normalized, "ipv6");
  }
  return false;
};
const normalizedBlock = new BlockList();
normalizedBlock.addSubnet("2000::", 3, "ipv6");
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
  if (!allowLocal && (addresses.length === 0 || addresses.some((entry) => !isPublicGlobalUnicast(entry.address)))) throw new Error("webhook URL is not publicly routable");
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
      if (!security.webhookAllowLocal && (!socket.remoteAddress || !isPublicGlobalUnicast(socket.remoteAddress))) request.destroy(new Error("connected address is not publicly routable"));
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
    if (!security.allowLocal && (addresses.length === 0 || addresses.some((entry) => !isPublicGlobalUnicast(entry.address)))) throw new Error("webhook URL is not publicly routable");
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