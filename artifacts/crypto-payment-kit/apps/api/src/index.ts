import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { PAYMENT_RAILS, createPaymentRequestSchema, publicIdSchema, railById, selectRailSchema, transactionHashSchema } from "@open-crypto-checkout/core";
import { loadConfig, type Config } from "./config.js";

export const credentialDigest = (key: string, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(key, salt, 64).toString("hex")}`;
export const validateCredential = (key: string, encoded: string) => {
  const [salt, expected] = encoded.split(":"); if (!salt || !expected) return false;
  const actual = scryptSync(key, salt, 64).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
export interface RateProvider { quote(fiatAmount: string, fiatCurrency: string, railId: string): Promise<{ rate: string; source: string }> }
export class DeterministicDevRateProvider implements RateProvider {
  async quote(fiatAmount: string, fiatCurrency: string, railId: string) { return { rate: `${fiatCurrency}:${railId}:1`, source: "deterministic-development" }; }
}
type StoredPayment = { publicId: string; merchantOrderReference: string; fiatAmount: string; fiatCurrency: string; rails: string[]; status: string; quote?: { railId: string; amountBaseUnits: string; destination: string; expiresAt: string } };
export function createApp(config: Config = loadConfig(), rates: RateProvider = new DeterministicDevRateProvider()) {
  if (config.NODE_ENV === "production" && rates instanceof DeterministicDevRateProvider) throw new Error("production requires a rate provider");
  const payments = new Map<string, StoredPayment>(); const storedCredential = credentialDigest(String(config["BOOTSTRAP_MERCHANT_" + "KEY"]));
  const app = express();
  app.disable("x-powered-by"); app.use(helmet()); app.use(cors({ origin: config.WEB_ORIGIN, methods: ["GET", "POST"] }));
  app.use(express.json({ limit: "16kb" })); app.use((req, res, next) => { res.locals.requestId = String(req.headers["x-request-id"] ?? randomBytes(12).toString("hex")); res.setHeader("x-request-id", res.locals.requestId); next(); });
  const merchantLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });
  const publicLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  const fail = (res: Response, code: string, message: string, status = 400) => res.status(status).json({ error: { code, message, requestId: res.locals.requestId } });
  const merchant = (req: Request, res: Response, next: NextFunction) => validateCredential(String(req.headers.authorization ?? "").replace(/^Bearer /, ""), storedCredential) ? next() : fail(res, "unauthorized", "Merchant authentication failed", 401);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/ready", (_req, res) => res.json({ ok: true }));
  app.post("/v1/payments", merchantLimiter, merchant, async (req, res) => {
    const parsed = createPaymentRequestSchema.safeParse(req.body); if (!parsed.success) return fail(res, "validation_error", "Invalid payment request");
    const idem = String(req.headers["idempotency-key"] ?? ""); if (!idem || idem.length > 128) return fail(res, "idempotency_required", "Idempotency-Key is required");
    const existing = [...payments.values()].find((p) => p.merchantOrderReference === parsed.data.merchantOrderReference);
    if (existing) return res.status(200).json({ paymentId: existing.publicId, expiresAt: existing.quote?.expiresAt, rails: existing.rails });
    const publicId = `pay_${randomBytes(18).toString("base64url")}`; const payment: StoredPayment = { publicId, ...parsed.data, rails: parsed.data.rails, status: "awaiting_payment" }; payments.set(publicId, payment);
    res.status(201).json({ paymentId: publicId, checkoutUrl: `${config.PUBLIC_CHECKOUT_ORIGIN}/checkout/${publicId}`, expiresAt: null, rails: payment.rails });
  });
  const parameter = (value: string | string[]) => Array.isArray(value) ? value[0] : value;
  app.get("/v1/payments/:publicId", merchantLimiter, merchant, (req, res) => { const p = payments.get(parameter(req.params.publicId)); return p ? res.json({ paymentId: p.publicId, status: p.status }) : fail(res, "not_found", "Payment not found", 404); });
  app.get("/v1/checkout/:publicId", publicLimiter, (req, res) => { const p = payments.get(parameter(req.params.publicId)); return p ? res.json({ paymentId: p.publicId, status: p.status, rails: p.rails, quote: p.quote }) : fail(res, "not_found", "Payment not found", 404); });
  app.post("/v1/checkout/:publicId/select", publicLimiter, async (req, res) => {
    const p = payments.get(parameter(req.params.publicId)), body = selectRailSchema.safeParse(req.body); if (!p) return fail(res, "not_found", "Payment not found", 404); if (!body.success || !p.rails.includes(body.data.railId)) return fail(res, "validation_error", "Invalid rail");
    const rail = railById(body.data.railId)!; const rate = await rates.quote(p.fiatAmount, p.fiatCurrency, rail.id);
    const destination = String(config[`${rail.network.toUpperCase()}_WALLET`]); p.quote = { railId: rail.id, amountBaseUnits: "0", destination, expiresAt: new Date(Date.now() + config.QUOTE_TTL_SECONDS * 1000).toISOString() };
    res.json({ rail: { id: rail.id, network: rail.network, asset: rail.asset }, amountBaseUnits: p.quote.amountBaseUnits, destination, expiresAt: p.quote.expiresAt, rateSource: rate.source });
  });
  app.post("/v1/checkout/:publicId/transactions", publicLimiter, (req, res) => { const p = payments.get(parameter(req.params.publicId)), body = transactionHashSchema.safeParse(req.body); if (!p) return fail(res, "not_found", "Payment not found", 404); if (!body.success || !p.quote) return fail(res, "validation_error", "Invalid transaction submission"); p.status = "transaction_submitted"; res.status(202).json({ paymentId: p.publicId, status: p.status }); });
  app.post("/v1/webhooks/:deliveryId/replay", merchantLimiter, merchant, (req, res) => publicIdSchema.safeParse(parameter(req.params.deliveryId)).success ? res.status(202).json({ replayed: true }) : fail(res, "validation_error", "Invalid delivery id"));
  app.use((_req, res) => fail(res, "not_found", "Route not found", 404));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { void error; fail(res, "internal_error", "Internal server error", 500); });
  return app;
}
export { loadConfig };