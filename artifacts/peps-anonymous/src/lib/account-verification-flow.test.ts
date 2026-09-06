import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TURNSTILE_TEST_SITE_KEY,
  accountRequiresVerification,
  parseResendRetrySeconds,
  resolveTurnstileSiteKey,
} from "./account-verification-flow";

describe("account verification flow", () => {
  it("fails closed without a production Turnstile site key", () => {
    assert.equal(resolveTurnstileSiteKey(undefined, true), "");
    assert.equal(resolveTurnstileSiteKey(undefined, false), TURNSTILE_TEST_SITE_KEY);
    assert.equal(resolveTurnstileSiteKey(" configured ", true), "configured");
  });

  it("routes only explicit restricted bootstrap accounts to verification", () => {
    assert.equal(accountRequiresVerification({ verificationRequired: true }), true);
    assert.equal(accountRequiresVerification({ verificationRequired: false }), false);
    assert.equal(accountRequiresVerification(null), false);
  });

  it("extracts server resend cooldowns without inventing one", () => {
    assert.equal(parseResendRetrySeconds("Please wait 45 seconds before resending."), 45);
    assert.equal(parseResendRetrySeconds("Verification email cannot be sent"), null);
  });
});