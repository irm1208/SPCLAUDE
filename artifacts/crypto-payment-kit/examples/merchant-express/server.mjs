import express from "express";
import { createWebhookVerifier } from "./webhook-verification.mjs";

const app = express();
const verifyWebhook = createWebhookVerifier({ secret: process.env.WEBHOOK_SIGNING_SECRET });

// This route must precede express.json(): signatures cover the exact raw bytes.
app.post("/webhooks/open-crypto-checkout", express.raw({ type: "application/json", limit: "100kb" }), (request, response) => {
  try {
    const event = verifyWebhook({
      body: request.body,
      timestamp: request.header("x-webhook-timestamp"),
      signature: request.header("x-webhook-signature"),
    });

    // Persist event.id in your own DATABASE_URL-backed transaction before fulfilment.
    // Fulfilment must itself be idempotent: webhook delivery can be retried.
    console.info("verified payment event", { id: event.id, type: event.type });
    response.sendStatus(204);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "invalid webhook" });
  }
});

app.use(express.json({ limit: "100kb" }));
app.listen(process.env.PORT ?? 3000, () => console.info("merchant receiver listening"));