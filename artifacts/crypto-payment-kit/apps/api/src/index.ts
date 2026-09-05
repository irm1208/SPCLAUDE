import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createPaymentRequestSchema, fiatToBaseUnits, railById, selectRailSchema, transactionHashSchema } from "@open-crypto-checkout/core";
import { loadConfig, type Config } from "./config.js";
import { PaymentRepository } from "./repository.js";
import * as schema from "./db/schema.js";
import { composeRailVerifier, createProviderSet, type ProviderUrls } from "./providers.js";
import { VerificationWorker, WebhookDeliveryWorker, startWorkerLoops } from "./worker.js";
import { deliverWebhook, validateWebhookUrl } from "./webhooks.js";

export const credentialDigest = (key: string, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(key, salt, 64).toString("hex")}`;
export const validateCredential = (key: string, encoded: string) => {
  const [salt, expected] = encoded.split(":"); if (!salt || !expected) return false;
  const actual = scryptSync(key, salt, 64).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
export interface RateProvider { quote(fiatAmount: string, fiatCurrency: string, railId: string): Promise<{ rate: string; source: string; quotedAt?: Date }> }
export class DeterministicDevRateProvider implements RateProvider { async quote() { return { rate: "1", source: "deterministic-development", quotedAt: new Date() }; } }
export class HttpRateProvider implements RateProvider {
  constructor(private readonly url: string) {}
  async quote(fiatAmount: string, fiatCurrency: string, railId: string) {
    const response = await fetch(this.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fiatAmount, fiatCurrency, railId }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("rate provider unavailable");
    const result = await response.json() as { rate?: unknown; source?: unknown; quotedAt?: unknown };
    if (typeof result.rate !== "string" || typeof result.source !== "string" || typeof result.quotedAt !== "string") throw new Error("invalid rate provider response");
    return { rate: result.rate, source: result.source, quotedAt: new Date(result.quotedAt) };
  }
}

/** Routes deliberately receive persistence; tests can inject a repository fake, production cannot. */
export function createApp(config: Config = loadConfig(), rates: RateProvider = new DeterministicDevRateProvider(), repository?: PaymentRepository, demoMerchantId?: string) {
  if (!repository) throw new Error("PaymentRepository is required; HTTP persistence cannot be in memory");
  if (config.NODE_ENV === "production" && rates instanceof DeterministicDevRateProvider) throw new Error("production requires a rate provider");
  const app = express();
  app.disable("x-powered-by"); app.use(helmet()); app.use(cors({ origin: config.WEB_ORIGIN, methods: ["GET", "POST"] }));
  app.use(express.json({ limit: "16kb" })); app.use((req, res, next) => { res.locals.requestId = String(req.headers["x-request-id"] ?? randomBytes(12).toString("hex")); res.setHeader("x-request-id", res.locals.requestId); next(); });
  const merchantLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });
  const publicLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
  const fail = (res: Response, code: string, message: string, status = 400) => res.status(status).json({ error: { code, message, requestId: res.locals.requestId } });
  const parameter = (value: string | string[]) => Array.isArray(value) ? value[0] : value;
  const merchant = async (req: Request, res: Response, next: NextFunction) => {
    const merchantId = await repository.authenticate(String(req.headers.authorization ?? "").replace(/^Bearer /, ""), validateCredential);
    if (!merchantId) return fail(res, "unauthorized", "Merchant authentication failed", 401);
    res.locals.merchantId = merchantId; next();
  };
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/ready", async (_req, res, next) => { try { await repository.checkout("__readiness_probe__"); res.json({ ok: true }); } catch (error) { next(error); } });
  app.post("/v1/payments", merchantLimiter, merchant, async (req, res, next) => {
    try {
      const parsed = createPaymentRequestSchema.safeParse(req.body); if (!parsed.success) return fail(res, "validation_error", "Invalid payment request");
      const idem = String(req.headers["idempotency-key"] ?? ""); if (!idem || idem.length > 128) return fail(res, "idempotency_required", "Idempotency-Key is required");
      const payment = await repository.createPayment(res.locals.merchantId, { publicId: `pay_${randomBytes(18).toString("base64url")}`, merchantOrderReference: parsed.data.merchantOrderReference, idempotencyKey: idem, fiatAmount: parsed.data.fiatAmount, fiatCurrency: parsed.data.fiatCurrency, rails: parsed.data.rails });
      res.status(payment.publicId.startsWith("pay_") ? 201 : 200).json({ paymentId: payment.publicId, checkoutUrl: `${config.PUBLIC_CHECKOUT_ORIGIN}/checkout/${payment.publicId}`, expiresAt: null, rails: payment.rails });
    } catch (error) { next(error); }
  });
  if (config.NODE_ENV !== "production" && demoMerchantId) app.post("/v1/demo/payments", publicLimiter, async (req, res, next) => {
    try {
      const parsed = createPaymentRequestSchema.safeParse(req.body); if (!parsed.success) return fail(res, "validation_error", "Invalid payment request");
      const idem = String(req.headers["idempotency-key"] ?? ""); if (!idem || idem.length > 128) return fail(res, "idempotency_required", "Idempotency-Key is required");
      const payment = await repository.createPayment(demoMerchantId, { publicId: `pay_${randomBytes(18).toString("base64url")}`, merchantOrderReference: parsed.data.merchantOrderReference, idempotencyKey: idem, fiatAmount: parsed.data.fiatAmount, fiatCurrency: parsed.data.fiatCurrency, rails: parsed.data.rails });
      res.status(201).json({ paymentId: payment.publicId, checkoutUrl: `${config.PUBLIC_CHECKOUT_ORIGIN}/checkout/${payment.publicId}`, expiresAt: null, rails: payment.rails });
    } catch (error) { next(error); }
  });
  app.get("/v1/payments/:publicId", merchantLimiter, merchant, async (req, res, next) => { try { const payment = await repository.paymentForMerchant(res.locals.merchantId, parameter(req.params.publicId)); return payment ? res.json({ paymentId: payment.publicId, status: payment.status }) : fail(res, "not_found", "Payment not found", 404); } catch (error) { next(error); } });
  app.get("/v1/checkout/:publicId", publicLimiter, async (req, res, next) => { try { const payment = await repository.checkout(parameter(req.params.publicId)); return payment ? res.json(payment) : fail(res, "not_found", "Payment not found", 404); } catch (error) { next(error); } });
  app.post("/v1/checkout/:publicId/select", publicLimiter, async (req, res, next) => { try {
    const body = selectRailSchema.safeParse(req.body); if (!body.success) return fail(res, "validation_error", "Invalid rail");
    const rail = railById(body.data.railId); if (!rail) return fail(res, "validation_error", "Invalid rail");
    const payment = await repository.checkout(parameter(req.params.publicId)); if (!payment) return fail(res, "not_found", "Payment not found", 404);
    const rate = await rates.quote(String(payment.fiatAmount), String(payment.fiatCurrency), rail.id);
    if (!rate.source || !rate.quotedAt || !Number.isFinite(rate.quotedAt.getTime()) || Date.now() - rate.quotedAt.getTime() > config.QUOTE_TTL_SECONDS * 1000) return fail(res, "rate_unavailable", "Rate is stale or unavailable", 503);
    const destination = String(config[`${rail.network.toUpperCase()}_WALLET`]);
    let amountBaseUnits: bigint;
    try { amountBaseUnits = fiatToBaseUnits(String(payment.fiatAmount), rate.rate, rail.decimals); } catch { return fail(res, "rate_unavailable", "Rate is invalid or unavailable", 503); }
    if (amountBaseUnits <= 0n) return fail(res, "rate_unavailable", "Rate produced an invalid amount", 503);
    const quote = await repository.selectQuote(parameter(req.params.publicId), {
      railId: rail.id, family: rail.kind, networkName: rail.network, chainId: rail.chainId, asset: rail.asset, tokenId: rail.tokenId, decimals: rail.decimals,
      amountBaseUnits: amountBaseUnits.toString(), rate: rate.rate, rateSource: rate.source, destination, requiredConfirmations: rail.confirmations,
      underpayBps: Number(config.UNDERPAY_TOLERANCE_BPS), overpayBps: Number(config.OVERPAY_REVIEW_BPS), expiresAt: new Date(Date.now() + config.QUOTE_TTL_SECONDS * 1000),
    });
    return quote ? res.json(await repository.checkout(parameter(req.params.publicId))) : fail(res, "not_found", "Payment not found", 404);
  } catch (error) { next(error); } });
  app.post("/v1/checkout/:publicId/transactions", publicLimiter, async (req, res, next) => { try {
    const body = transactionHashSchema.safeParse(req.body); if (!body.success) return fail(res, "validation_error", "Invalid transaction submission");
    const result = await repository.submitTransaction(parameter(req.params.publicId), body.data.transactionHash);
    if (result.kind === "missing") return fail(res, "not_found", "Payment not found", 404);
    if (result.kind === "reused") return fail(res, "transaction_reused", "Transaction is already assigned", 409);
    if (result.kind === "quote_required") return fail(res, "quote_required", "Select a current quote first", 409);
    res.status(202).json({ paymentId: parameter(req.params.publicId), status: result.status });
  } catch (error) { next(error); } });
  app.post("/v1/webhooks/:deliveryId/replay", merchantLimiter, merchant, async (req, res, next) => { try {
    const deliveryId = parameter(req.params.deliveryId); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deliveryId)) return fail(res, "validation_error", "Invalid delivery id");
    return await repository.replayDelivery(res.locals.merchantId, deliveryId) ? res.status(202).json({ replayed: true }) : fail(res, "not_found", "Delivery not found", 404);
  } catch (error) { next(error); } });
  app.use((_req, res) => fail(res, "not_found", "Route not found", 404));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { void error; fail(res, "internal_error", "Internal server error", 500); });
  return app;
}

export async function createServer(config: Config = loadConfig(), rates?: RateProvider) {
  const pool = new Pool({ connectionString: String(config.DATABASE_URL) });
  const db = drizzle(pool, { schema }); // executable Drizzle/pg composition, schema checked at compile time
  void db;
  const repository = new PaymentRepository(pool);
  let demoMerchantId: string | undefined;
  if (config.NODE_ENV !== "production") {
    const webhookUrl = config.BOOTSTRAP_WEBHOOK_URL ? (await validateWebhookUrl(String(config.BOOTSTRAP_WEBHOOK_URL), { allowLocal: config.ALLOW_LOCAL_WEBHOOKS === "true" })).toString() : undefined;
    const webhookMaterial = String(config.BOOTSTRAP_WEBHOOK_SECRET);
    demoMerchantId = await repository.bootstrapDevelopment(credentialDigest(String(config.BOOTSTRAP_MERCHANT_KEY)), credentialDigest(webhookMaterial), webhookMaterial, webhookUrl, config.ALLOW_LOCAL_WEBHOOKS === "true");
  }
  const providers = createProviderSet(config as unknown as ProviderUrls);
  const verification = new VerificationWorker(repository, composeRailVerifier(providers));
  const webhooks = new WebhookDeliveryWorker(repository, (url, body, signingMaterial) =>
    deliverWebhook(url, body, signingMaterial, undefined, { allowLocal: config.NODE_ENV !== "production" && config.ALLOW_LOCAL_WEBHOOKS === "true" }));
  const stopWorkers = startWorkerLoops(verification, webhooks);
  const rateProvider = rates ?? (config.NODE_ENV === "production" ? new HttpRateProvider(String(config.RATE_PROVIDER_URL)) : new DeterministicDevRateProvider());
  const app = createApp(config, rateProvider, repository, demoMerchantId);
  const close = async (server?: Server) => {
    stopWorkers();
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  };
  return { pool, app, close };
}
if (process.argv[1]?.endsWith("/index.ts") || process.argv[1]?.endsWith("/index.js")) {
  const runtime = await createServer();
  const server = runtime.app.listen(Number(process.env.PORT ?? 8090));
  const shutdown = () => { void runtime.close(server).then(() => process.exit(0), () => process.exit(1)); };
  process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
}
export { loadConfig };