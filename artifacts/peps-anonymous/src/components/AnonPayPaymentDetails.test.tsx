import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { AnonPayPaymentDetails } from "./AnonPayPaymentDetails";

describe("AnonPay payment references", () => {
  it("separates the session and outgoing blockchain TXID with correct links", () => {
    const html = renderToStaticMarkup(createElement(AnonPayPaymentDetails, {
      value: "anonpay:example-session|0xoutgoing",
      explorerUrl: hash => `https://etherscan.io/tx/${hash}`,
    }));
    expect(html).toContain("AnonPay Payment ID");
    expect(html).toContain('href="https://trocador.app/en/anonpay/example-session"');
    expect(html).toContain("Blockchain TXID");
    expect(html).toContain('href="https://etherscan.io/tx/0xoutgoing"');
    expect(html).not.toContain("example-session%7C");
  });
  it("does not present the payment session as a blockchain transaction", () => {
    const html = renderToStaticMarkup(createElement(AnonPayPaymentDetails, { value: "anonpay:example-session" }));
    expect(html).toContain("Not available from AnonPay yet");
    expect(html).not.toContain("etherscan");
  });
});
