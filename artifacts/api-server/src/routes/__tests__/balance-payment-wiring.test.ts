import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const account = readFileSync(new URL("../account.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../../../../peps-anonymous/src/pages/AccountOrderDetail.tsx", import.meta.url), "utf8");

describe("balance quote and payment contract", () => {
  it("requires the customer's session for both quote and payment", () => {
    expect(account).toContain('router.get("/account/orders/:id/balance-crypto-quote", requireAccount, balanceCryptoQuote)');
    expect(account).toContain('router.post("/account/orders/:id/balance-pay", requireAccount, balanceCryptoPay)');
  });
  it("copies the locked coin amount rather than the raw fiat balance", () => {
    expect(page).toContain('copyValue: usableQuote ? String(usableQuote.cryptoAmount) : undefined');
    expect(page).not.toContain('copyValue: String(amountDue)');
    expect(page).toContain('value: usableQuote ? `${usableQuote.cryptoAmount} ${usableQuote.currency}`');
    expect(page).toContain('copyValue: usableQuote?.walletAddress');
  });
  it("gates submission on a loaded quote and sends the selected coin and chain", () => {
    expect(page).toContain('disabled={verifying || !txHash.trim() || !usableQuote}');
    expect(page).toContain('JSON.stringify({ txHash: cleaned, cryptoCurrency: selectedCrypto, cryptoNetwork: selectedCryptoNetwork })');
    expect(page).toContain('balanceQuote.network === selectedCryptoNetwork');
    expect(page).toContain('Number(balanceQuote.amountDue) === amountDue');
  });
  it("cancels stale quote loads and provides a visible retry after quote failures", () => {
    expect(page).toContain('return () => controller.abort()');
    expect(page).toContain('if (!controller.signal.aborted) setBalanceQuote(data)');
    expect(page).toContain('if (res.status === 409)');
    expect(page).toContain('Retry quote');
  });
});
