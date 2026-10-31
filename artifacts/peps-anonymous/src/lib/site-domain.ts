/** Routing and member-session effects must share this boundary. */
export function siteSurface(hostname: string, pathname: string, development: boolean, developmentHosts: string[] = []): "vendor" | "main" | "blocked" {
  const host = hostname.toLowerCase();
  if (host === "pepsanonymous.com" || host === "www.pepsanonymous.com") return "vendor";
  if (/^\/vendor(?:\/|$)/i.test(pathname)) {
    const local = ["localhost", "127.0.0.1", "[::1]", ...developmentHosts].includes(host);
    return development && local ? "vendor" : "blocked";
  }
  return "main";
}
