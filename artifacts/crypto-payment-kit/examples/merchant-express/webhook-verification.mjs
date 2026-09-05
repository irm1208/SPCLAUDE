import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload({ body, timestamp, secret }) {
  return createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex");
}

export function createWebhookVerifier({ secret, toleranceSeconds = 300, now = () => Math.floor(Date.now() / 1000) }) {
  if (!secret) throw new Error("WEBHOOK_SIGNING_SECRET is required");
  const processedEventIds = new Set();

  return ({ body, timestamp, signature }) => {
    if (!/^\d+$/.test(timestamp ?? "") || Math.abs(now() - Number(timestamp)) > toleranceSeconds) {
      throw new Error("webhook timestamp is outside the accepted tolerance");
    }
    if (!/^[a-f0-9]{64}$/i.test(signature ?? "")) throw new Error("webhook signature is invalid");

    const expected = signWebhookPayload({ body, timestamp, secret });
    if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
      throw new Error("webhook signature is invalid");
    }

    let event;
    try {
      event = JSON.parse(body.toString("utf8"));
    } catch {
      throw new Error("webhook body is not valid JSON");
    }
    if (typeof event.id !== "string" || event.id.length === 0) throw new Error("webhook event id is required");
    if (processedEventIds.has(event.id)) throw new Error("webhook event was already processed");
    processedEventIds.add(event.id);
    return event;
  };
}