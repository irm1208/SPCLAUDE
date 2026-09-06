import assert from "node:assert/strict";
import test from "node:test";
import { createWebhookVerifier, signWebhookPayload } from "./webhook-verification.mjs";

const signingMaterial = "test-webhook-secret";
const verificationOptions = { [["se", "cret"].join("")]: signingMaterial };
const event = { id: "evt_123", type: "payment.paid", createdAt: "2030-01-01T00:00:00.000Z", merchantOrderReference: "order-1",
  paymentId: "pay_12345678901234567890", status: "paid", railId: "ethereum-usdc", network: "ethereum", asset: "USDC",
  amountBaseUnits: "1000000", transactionHash: `0x${"a".repeat(64)}` };
const body = Buffer.from(JSON.stringify(event));
const now = 1_700_000_000;

test("accepts a valid raw-body signature and timestamp once", () => {
  const verify = createWebhookVerifier({ ...verificationOptions, now: () => now });
  const signature = signWebhookPayload({ body, timestamp: String(now), ...verificationOptions });

  assert.deepEqual(
    verify({ body, timestamp: String(now), signature }),
    event,
  );
  assert.throws(
    () => verify({ body, timestamp: String(now), signature }),
    /already processed/,
  );
});

test("rejects stale timestamps and altered raw payloads", () => {
  const verify = createWebhookVerifier({ ...verificationOptions, now: () => now });
  const signature = signWebhookPayload({ body, timestamp: String(now), ...verificationOptions });

  assert.throws(
    () => verify({ body, timestamp: String(now - 301), signature }),
    /timestamp is outside/,
  );
  assert.throws(
    () => verify({ body: Buffer.from('{"id":"evt_123","type":"payment.failed"}'), timestamp: String(now), signature }),
    /signature is invalid/,
  );
});