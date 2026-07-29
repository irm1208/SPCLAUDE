type OriginEnvironment = Record<string, string | undefined>;

export function buildAllowedOrigins(env: OriginEnvironment = process.env): string[] {
  const origins = new Set([
    "http://localhost:5000",
    "http://localhost:8080",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "https://saltandpeps.co.uk",
    "https://www.saltandpeps.co.uk",
  ]);

  for (const port of [env.PORT, env.VITE_PORT]) {
    if (!port || !/^\d+$/.test(port)) continue;
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }
  if (env.REPLIT_DEV_DOMAIN) origins.add(`https://${env.REPLIT_DEV_DOMAIN}`);
  env.ALLOWED_ORIGINS?.split(",").forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed);
  });
  return [...origins];
}

function isDevelopmentLoopbackOrigin(origin: string, env: OriginEnvironment): boolean {
  if (env.NODE_ENV !== "development") return false;

  try {
    const parsed = new URL(origin);
    const port = Number(parsed.port);
    const isLoopback = parsed.hostname === "localhost"
      || parsed.hostname === "127.0.0.1"
      || parsed.hostname === "[::1]";

    return parsed.protocol === "http:"
      && parsed.origin === origin
      && isLoopback
      && Number.isInteger(port)
      && port > 0
      && port <= 65_535;
  } catch {
    return false;
  }
}

export function isAllowedOrigin(
  origin: string,
  allowedOrigins: readonly string[],
  env: OriginEnvironment = process.env,
): boolean {
  return allowedOrigins.includes(origin)
    || /^https:\/\/[\w-]+(?:\.[\w-]+)*\.replit\.(dev|app)(:\d+)?$/.test(origin)
    || isDevelopmentLoopbackOrigin(origin, env);
}
