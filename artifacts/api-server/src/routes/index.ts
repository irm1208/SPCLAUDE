import { Router, type IRouter } from "express";
import {
  strictLimiter,
  adminLimiter,
  adminAuthLimiter,
  orderCreateLimiter,
  feedbackLimiter,
} from "../middleware/rate-limits";
import healthRouter from "./health";
import productsRouter from "./products";
import deliveryMethodsRouter from "./delivery-methods";
import configRouter from "./config";
import ordersRouter from "./orders";
import sheetsSyncRouter from "./sheets-sync";
import adminRouter from "./admin";
import paymentsRouter from "./payments";
import feedbackRouter from "./feedback";
import labTestsRouter from "./lab-tests";
import shipmentsRouter from "./shipments";
import vialShopRouter from "./vial-shop";
import accountRouter from "./account";
import groupBuysRouter from "./group-buys";
import groupBuysAdminRouter from "./group-buys-admin";
import telegramRouter from "./telegram";
import bloodTestsRouter from "./blood-tests";
import compoundsRouter from "./compounds";
import glp1Router from "./glp1";
import gbParcelsRouter from "./gb-parcels";
import plotterRouter from "./plotter";
import organiserRouter from "./organiser";
import organiserAdminRouter from "./organiser-admin";
import reshipperRouter from "./reshipper";
import reshipperAdminRouter from "./reshipper-admin";
import organiserReshippersRouter from "./organiser-reshippers";
import couriersRouter from "./couriers";
import healthInsightsRouter from "./health-insights";
import telegramTemplatesRouter from "./telegram-templates";
import trackingLinksRouter from "./tracking-links";
import gbTestingRouter from "./gb-testing";
import testingPoolsRouter from "./testing-pools";
import shippingRouter from "./shipping";
import intlShippingRouter from "./intl-shipping";
import gbCountryLegsRouter from "./gb-country-legs";
import couponCodesRouter from "./coupon-codes";
import qiyunleRouter from "./qiyunle";
import adminSystemRouter from "./admin-system";
import orderMessagesRouter from "./order-messages";
import ticketsRouter from "./tickets";
import adminAiChatbotRouter from "./admin-ai-chatbot";
import adminBtChatRouter from "./admin-bt-chat";
import adminDispatchRouter from "./admin-dispatch";
import dnaRouter from "./dna";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(deliveryMethodsRouter);
router.use(configRouter);

// Tight rate limit on admin auth-check (on top of brute-force lockout)
router.use("/admin/auth-check", adminAuthLimiter);

// Strict rate limiting on sensitive write endpoints
router.use("/orders/lookup", strictLimiter);
router.use("/orders/claim-pin", strictLimiter);
router.use("/orders/:id/generate-test", strictLimiter);
router.use("/orders/:id/submit-test", strictLimiter);
router.use("/orders/:id/pay", strictLimiter);
router.use("/orders/:id/pin", strictLimiter);
router.use("/orders/:id/confirm-fiat", strictLimiter);

// Rate limit order creation (10 per hour per IP) — POST /orders only, not lookups
router.post("/orders", orderCreateLimiter);

// FS3 password verify gets strict limiting
router.use("/admin/fs3-verify", strictLimiter);

// Admin routes get their own limiter
router.use("/admin", adminLimiter);

// Feedback submission rate limiting
router.use("/feedback", feedbackLimiter);

// Account auth endpoints get strict rate limiting
router.use("/account/signup", strictLimiter);
router.use("/account/login", strictLimiter);
router.use("/account/smart-login", strictLimiter);
router.use("/account/order-login", strictLimiter);
router.use("/account/forgot-password", strictLimiter);
router.use("/account/reset-password", strictLimiter);
router.use("/account/join-gb", strictLimiter);

router.use(ordersRouter);
router.use(sheetsSyncRouter);
router.use(adminRouter);
router.use(paymentsRouter);
router.use(feedbackRouter);
router.use(labTestsRouter);
router.use(shipmentsRouter);
router.use(vialShopRouter);
router.use(accountRouter);
router.use(groupBuysRouter);
router.use(groupBuysAdminRouter);
router.use(gbParcelsRouter);
router.use(telegramRouter);
router.use(bloodTestsRouter);
router.use(compoundsRouter);
router.use(glp1Router);
router.use(plotterRouter);
router.use(organiserRouter);
router.use(organiserAdminRouter);
router.use(reshipperRouter);
router.use(reshipperAdminRouter);
router.use(organiserReshippersRouter);
router.use(couriersRouter);
router.use(healthInsightsRouter);
router.use(telegramTemplatesRouter);
router.use(trackingLinksRouter);
router.use(gbTestingRouter);
router.use(testingPoolsRouter);
router.use(shippingRouter);
router.use(intlShippingRouter);
router.use(gbCountryLegsRouter);
router.use(couponCodesRouter);
router.use(qiyunleRouter);
router.use(adminSystemRouter);
router.use(orderMessagesRouter);
router.use(ticketsRouter);
router.use(adminAiChatbotRouter);
router.use(adminBtChatRouter);
router.use(adminDispatchRouter);
router.use(dnaRouter);

// ── GET /fx-rates — server-side proxy for frankfurter.app FX rates ──────────
// Proxies GBP→USD/EUR rates so the browser avoids CORS restrictions.
// Caches the upstream response for 1 hour via Cache-Control headers.
router.get("/fx-rates", async (_req, res) => {
  try {
    const upstream = await fetch("https://api.frankfurter.app/latest?from=GBP&to=USD,EUR", {
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) { res.status(502).json({ error: "Upstream FX API error" }); return; }
    const data = await upstream.json() as { rates?: Record<string, number> };
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({ rates: data.rates ?? {} });
  } catch {
    res.status(502).json({ error: "Failed to fetch FX rates" });
  }
});

export default router;
