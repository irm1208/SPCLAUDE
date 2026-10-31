import type { RequestHandler } from "express";

const VENDOR_HOSTS = new Set(["pepsanonymous.com", "www.pepsanonymous.com"]);
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const VENDOR_PAGES = new Set(["/", "/vendor", "/vendor/", "/vendor/login", "/vendor/login/", "/login", "/login/"]);
const HEALTH_PATHS = new Set(["/health", "/_health", "/api", "/api/health", "/api/healthz"]);

// Never use req.hostname: Express derives that from X-Forwarded-Host when trust proxy is on.
function authority(value: string): { host: string; authority: string } | null {
  if (!/^(?:[a-z0-9.-]+|\[::1\])(?::[0-9]+)?$/i.test(value)) return null;
  const match = /^(\[::1\]|[^:]+)(?::([0-9]+))?$/.exec(value);
  if (!match || (match[2] && (+match[2] < 1 || +match[2] > 65535))) return null;
  return { host: match[1].toLowerCase(), authority: value.toLowerCase() };
}

export function siteDomainPolicy(options: { production: boolean; developmentHosts?: string[] }): RequestHandler {
  const developmentHosts = new Set([...LOCAL_HOSTS, ...(options.developmentHosts ?? [])].map(host => host.toLowerCase()));
  return (req, res, next) => {
    const host = authority(req.headers.host ?? "");
    const path = req.originalUrl.split("?", 1)[0];
    // Decode only for boundary classification; preserve the actual route for Express.
    // Ordinary main-site parameters (e.g. encoded usernames) remain valid.
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); }
    catch { res.status(400).json({ error: "Invalid request path" }); return; }
    for (let depth = 0; depth < 5 && /%[0-9a-f]{2}/i.test(decodedPath); depth++) {
      try { decodedPath = decodeURIComponent(decodedPath); } catch { break; }
    }
    const vendorHost = !!host && VENDOR_HOSTS.has(host.host);
    const vendorResource = /^\/(?:vendor(?:\/|$)|api\/vendor(?:\/|$))/i.test(decodedPath);
    if (!host || !path.startsWith("/") || /[\\\x00-\x20\x7f]/.test(path)
      || /[\\\x00-\x1f\x7f]/.test(decodedPath) || decodedPath.includes("//")
      || decodedPath.split("/").some(segment => segment === "." || segment === "..")
      || ((vendorHost || vendorResource) && path.includes("%"))) {
      res.status(400).json({ error: "Invalid request path or host" }); return;
    }
    const localDevelopment = !options.production && developmentHosts.has(host.host);
    const vendorApi = /^\/api\/vendor(?:\/|$)/i.test(path);
    const vendorPage = /^\/vendor(?:\/|$)/i.test(path);
    const origin = req.headers.origin;
    if (origin) {
      let originUrl: URL;
      try { originUrl = new URL(origin); } catch { res.status(403).json({ error: "Origin not allowed" }); return; }
      const vendorOrigin = VENDOR_HOSTS.has(originUrl.hostname.toLowerCase());
      if ((vendorOrigin && !vendorHost) || ((vendorHost || vendorApi) && (originUrl.origin !== origin || originUrl.host.toLowerCase() !== host.authority || !["http:", "https:"].includes(originUrl.protocol) || (options.production && vendorHost && originUrl.protocol !== "https:")))) {
        res.status(403).json({ error: "Origin not allowed" }); return;
      }
    }
    if ((vendorApi || vendorPage) && !vendorHost && !localDevelopment) {
      res.status(404).json({ error: "Not found" }); return;
    }
    if (vendorHost) {
      const staticAsset = /^\/assets\/[a-z0-9_./-]+\.(?:js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|mp3|mp4|wasm)$/i.test(path)
        || path === "/favicon.svg" || /^\/brand\/[a-z0-9_-]+\.(?:svg|png)$/i.test(path);
      if (!vendorApi && !VENDOR_PAGES.has(path) && !HEALTH_PATHS.has(path) && !staticAsset) {
        res.status(404).json({ error: "Not found" }); return;
      }
    }
    next();
  };
}

/** Shared build, distinct vendor document: no member Mini App bootstrap. */
export function siteDocument(html: string, hostHeader: string): string {
  const host = authority(hostHeader);
  if (!host || !VENDOR_HOSTS.has(host.host)) return html;
  return html.replace(/<title>[^<]*<\/title>/i, "<title>Peps Anonymous · Vendor portal</title>")
    .replace(/<script\b[^>]*\bsrc=["']https:\/\/telegram\.org\/js\/telegram-web-app\.js["'][^>]*>\s*<\/script>/gi, "");
}
