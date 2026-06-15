import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import { createProxyMiddleware } from "http-proxy-middleware";
import { globalLimiter } from "./middleware/rate-limits";
import router from "./routes";

const app: Express = express();

// ── CORS ───────────────────────────────────────────────────────
// Explicitly whitelist known origins instead of reflecting any origin.
// Allows localhost (dev) and Replit workspace / deployed app domains.
// Use ALLOWED_ORIGINS env var (comma-separated) to add custom domains.

function buildAllowedOrigins(): string[] {
  const origins: string[] = [
    "http://localhost:5000",
    "http://localhost:8080",
    // Custom production domains — always allowed regardless of env vars
    "https://saltandpeps.co.uk",
    "https://www.saltandpeps.co.uk",
  ];
  // Replit dev domain (e.g. abc123.replit.dev)
  if (process.env["REPLIT_DEV_DOMAIN"]) {
    origins.push(`https://${process.env["REPLIT_DEV_DOMAIN"]}`);
  }
  // Additional custom domains from env (optional, for future use)
  if (process.env["ALLOWED_ORIGINS"]) {
    process.env["ALLOWED_ORIGINS"].split(",").forEach(o => {
      const trimmed = o.trim();
      if (trimmed) origins.push(trimmed);
    });
  }
  return origins;
}

const _allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests with no Origin (same-origin, server-to-server, mobile apps) — allow
      if (!origin) { callback(null, true); return; }
      // Exact match against whitelist
      if (_allowedOrigins.includes(origin)) { callback(null, true); return; }
      // Allow any *.replit.dev or *.replit.app subdomain (covers all workspace and deploy URLs)
      // Also allow origins with an explicit port (e.g. https://xxx.replit.dev:8080)
      if (/^https:\/\/[\w-]+(?:\.[\w-]+)*\.replit\.(dev|app)(:\d+)?$/.test(origin)) { callback(null, true); return; }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Admin-Secret", "X-Impersonate-Username"],
    credentials: true,
  })
);

// ── Security headers ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // API server — no HTML served
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
  })
);

// ── Cookie parser ─────────────────────────────────────────────
app.use(cookieParser());

// ── Body size cap ─────────────────────────────────────────────
// Higher limit for endpoints that accept base64 file payloads.
// QR / payment screenshot routes accept up to 15 MB images (~20 MB as base64).
// Organiser / admin import routes accept up to ~25 MB.
app.use([
  "/api/organiser/products/import-image",
  "/api/organiser/group-buys/:id/import-image",
  "/api/admin/products/extract-from-file",
  "/api/dna/upload",
], express.json({ limit: "30mb" }));
app.use([
  "/api/orders/:id/payment-screenshot",
  "/api/admin/orders/:id/qr",
  "/api/admin/orders/:id/messages",
  "/api/organiser/group-buys/:gbId/orders/:orderId/qr",
  "/api/reshipper/gb/:gbId/orders/:orderId",
  "/api/blood-tests/extract-image",
], express.json({ limit: "15mb" }));
app.use([
  "/api/admin/dispatch/:gbId/ocr-image",
  "/api/admin/dispatch/:gbId/save-dispatch-image",
], express.json({ limit: "40mb" }));
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// ── Trust Replit's reverse proxy so rate-limiter uses real IPs ─
app.set("trust proxy", 1);

// ── Strip X-Powered-By ────────────────────────────────────────
app.disable("x-powered-by");

// ── Null-byte / control-char sanitisation ─────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  const sanitise = (v: unknown): unknown => {
    if (typeof v === "string") return v.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    if (Array.isArray(v)) return v.map(sanitise);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, sanitise(val)])
      );
    }
    return v;
  };
  if (req.body) req.body = sanitise(req.body);
  next();
});

// ── Request logging — correlation ID + response time ──────────
// Assigns every request a short random correlation ID.
// Logs: METHOD /path status ms [correlationId]
// Skips /health to avoid log spam.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/api/health" || req.path === "/health") { next(); return; }
  const correlationId = randomBytes(6).toString("hex");
  const start = Date.now();
  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    console.log(`[${level}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms [${correlationId}]`);
  });
  next();
});

// ── Health check ───────────────────────────────────────────────
// Must be registered before the rate-limiter so Cloud Run / Replit
// autoscale health probes always get an instant 200 — even before
// the frontend dist is built or while migrations are running.
app.get("/_health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// ── Global rate limit (API only — not static assets or proxy) ──
// Replit collapses all user traffic to a single egress IP, so the limit
// applies to every user together. Restricting it to /api keeps static
// file serving and the dev Vite proxy from burning through the counter.
// In development we skip the global limiter entirely — the per-route
// limiters (adminAuthLimiter, strictLimiter, etc.) still protect sensitive
// endpoints; the global limiter only prevents DoS in production.
if (process.env.NODE_ENV === "production") {
  app.use("/api", globalLimiter, router);
} else {
  app.use("/api", router);
}

// ── Dev proxy to Vite ─────────────────────────────────────────
// In development, the Replit preview always hits port 8080 (externalPort=80).
// All non-/api requests are forwarded to the Vite dev server so the full
// app (including HMR) is visible in the default preview pane.
// /api requests are handled by Express above and never reach this proxy.
if (process.env["NODE_ENV"] !== "production") {
  // Mockup sandbox preview server — must be registered before the catch-all Vite proxy.
  // Use pathFilter so the full /__mockup/... path is preserved when forwarding.
  app.use(
    createProxyMiddleware({
      target: "http://localhost:8081",
      pathFilter: "/__mockup/**",
      changeOrigin: false,
      ws: true,
      on: {
        error: (_err: Error, _req: Request, res: Response) => {
          if (!res.headersSent) {
            (res as Response).status(502).send(
              "Mockup sandbox is starting — please refresh in a moment."
            );
          }
        },
      },
    })
  );
  console.log("[dev] /__mockup/* → Mockup sandbox on :8081");

  const vitePort = process.env["VITE_PORT"] ?? process.env["PORT"] ?? "21503";
  app.use(
    createProxyMiddleware({
      target: `http://localhost:${vitePort}`,
      changeOrigin: false,
      ws: true,
      on: {
        error: (_err: Error, _req: Request, res: Response) => {
          if (!res.headersSent) {
            (res as Response).status(502).send(
              "Vite dev server is starting — please refresh in a moment."
            );
          }
        },
      },
    })
  );
  console.log(`[dev] Non-API requests → Vite dev server on :${vitePort}`);
}

// ── Production static frontend ─────────────────────────────────
// When NODE_ENV=production and the Vite build exists, serve the
// compiled frontend from the Express server with full security headers.
if (process.env["NODE_ENV"] === "production") {
  const frontendDist = path.resolve(__dirname, "../../peps-anonymous/dist/public");
  if (fs.existsSync(frontendDist)) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https: wss:",
      "img-src 'self' data: blob: https:",
      "frame-src https://trocador.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const staticHeaders = (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Content-Security-Policy", csp);
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      next();
    };

    app.use(staticHeaders);
    app.use(express.static(frontendDist, { index: false }));
    // SPA fallback — return index.html for any non-API route
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    // Frontend dist not found — still respond 200 to the health check route (GET /)
    // so the Cloud Run promote step doesn't time out waiting for the SPA.
    console.warn(`[startup] Frontend dist not found at ${frontendDist} — serving fallback`);
    app.use((_req: Request, res: Response) => {
      res.status(200).send("OK");
    });
  }
}

// ── Global error handler ───────────────────────────────────────
// Never leak internal stack traces or error details to the client.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any).status ?? 500;
  if (status >= 500) {
    console.error("[ERROR]", err.message, err.stack);
    res.status(status).json({ error: "Internal server error" });
  } else {
    res.status(status).json({ error: err.message });
  }
});

export default app;
