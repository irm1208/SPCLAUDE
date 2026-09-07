import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSellerSignupBody, canSubmitSellerSignup } from "./seller-signup";

const form = {
  name: " Alpha Peptides ",
  tagline: " Trusted seller ",
  contactTelegram: " @alpha ",
  country: " UK ",
  shipsTo: "Europe",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

describe("seller signup request", () => {
  it("requires a completed security check", () => {
    assert.throws(
      () => buildSellerSignupBody(form, "   "),
      /complete the security check/i,
    );
  });

  it("includes the Turnstile token in the normalized API body", () => {
    assert.deepEqual(buildSellerSignupBody(form, " captcha-token "), {
      name: "Alpha Peptides",
      tagline: "Trusted seller",
      contactTelegram: "alpha",
      country: "UK",
      shipsTo: "Europe",
      password: "correct-horse",
      turnstileToken: "captcha-token",
    });
  });

  it("allows submission only after required fields and CAPTCHA are complete", () => {
    assert.equal(canSubmitSellerSignup(form, "captcha-token"), true);
    assert.equal(canSubmitSellerSignup({ ...form, name: " " }, "captcha-token"), false);
    assert.equal(canSubmitSellerSignup(form, ""), false);
  });
});