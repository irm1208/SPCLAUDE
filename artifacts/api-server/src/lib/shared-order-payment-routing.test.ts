import { describe, expect, it } from "vitest";
import { resolveSharedOrderPaymentMethods } from "./shared-order-payment-routing";

describe("shared-order payment routing", () => {
  it("does not expose admin AnonPay or crypto when the organiser omitted them", () => {
    expect(resolveSharedOrderPaymentMethods({
      creatorUsername: "organiser",
      leadRevolutHandle: null,
      leadPaypalEmail: null,
      leadAnonPayWallet: null,
      leadCryptoOptions: [],
    }, {
      anonPayTicker: "usdt",
      anonPayNetwork: "ERC20",
    })).toEqual({
      revolutHandle: null,
      paypalHandle: null,
      anonPayEnabled: false,
      anonPayWallet: null,
      anonPayTicker: null,
      anonPayNetwork: null,
      cryptoWalletAddress: null,
      cryptoCurrency: null,
      cryptoNetwork: null,
      availableCryptoOptions: [],
      collectedBy: { type: "organiser", username: "organiser" },
    });
  });

  it("exposes only the organiser's configured shared-order methods", () => {
    const cryptoOptions = [{
      currency: "USDT",
      network: "ERC-20",
      walletAddress: "0x1111111111111111111111111111111111111111",
    }];

    expect(resolveSharedOrderPaymentMethods({
      creatorUsername: "organiser",
      leadRevolutHandle: "@organiser",
      leadPaypalEmail: "organiser-paypal",
      leadAnonPayWallet: "0x2222222222222222222222222222222222222222",
      leadCryptoOptions: cryptoOptions,
    }, {
      anonPayTicker: "usdt",
      anonPayNetwork: "ERC20",
    })).toEqual({
      revolutHandle: "@organiser",
      paypalHandle: "organiser-paypal",
      anonPayEnabled: true,
      anonPayWallet: "0x2222222222222222222222222222222222222222",
      anonPayTicker: "usdt",
      anonPayNetwork: "ERC20",
      cryptoWalletAddress: cryptoOptions[0].walletAddress,
      cryptoCurrency: "USDT",
      cryptoNetwork: "ERC-20",
      availableCryptoOptions: cryptoOptions,
      collectedBy: { type: "organiser", username: "organiser" },
    });
  });
});