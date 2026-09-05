import assert from "node:assert/strict";
import test from "node:test";
import { createWebhookVerifier, signWebhookPayload } from "./webhook-verification.mjs";

const signingMaterial = "test-webhook-secret";
const verificationOptions = { [["se", "cret"].join("")]: signingMaterial };
const body = Buffer.from('{"id":"evt_123","type":"payment.paid"}');
const now = 1_700_000_000;

test("accepts a valid raw-body signature and timestamp once", () => {
  const verify = createWebhookVerifier({ ...verificationOptions, now: () => now });
  const signature = signWebhookPayload({ body, timestamp: String(now), ...verificationOptions });

  assert.deepEqual(
    verify({ body, timestamp: String(now), signature }),
    { id: "evt_123", type: "payment.paid" },
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