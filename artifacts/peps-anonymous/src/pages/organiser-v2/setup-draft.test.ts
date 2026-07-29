import assert from "node:assert/strict";
import test from "node:test";
import { buildSetupPayload, buildSetupProducts, buildSetupRules } from "./setup-draft.ts";

const draft = {
  basics: {
    name: " Summer Run ", description: "Live draft", currency: "GBP", closeDate: "2026-08-01T18:00",
    manufacturer: "QSC", manufacturerCountry: "China", labTestSupplier: "Janoshik",
  },
  products: {
    products: [
      { id: "temp-1", name: "BPC-157", price: "35", category: "Vendor A", stock: "25" },
      { id: "temp-2", name: "", price: "", category: "", stock: "" },
    ],
  },
  shipping: {
    options: [{ id: "ship-1", label: "UK tracked", price: "6.50", description: "Tracked", region: "UK", requiresAddress: true, requiresQr: false }],
  },
  payments: {
    cryptoEnabled: true,
    cryptoWallets: [{ id: "wallet-1", currency: "USDT", network: "TRC20", address: "T-wallet" }],
    anonpayEnabled: false, anonpayWallet: "", anonpayCurrency: "USDT", anonpayNetwork: "TRC20",
    revolutEnabled: true, revolutHandle: "@summer", paypalEnabled: false, paypalHandle: "",
  },
  access: {
    entryFeeEnabled: true, entryFeeAmount: "10", entryFeeLabel: "Deposit",
    countryMode: "allow" as const, countries: ["UK", "DE"], blockedAccounts: ["blocked_user"], pinEnabled: true, pin: "1234",
  },
  rules: {
    welcomeMessage: "Welcome", rules: [{ id: "rule-1", text: "Pay in 48 hours" }], disclaimer: "Research only", additionalInfo: "Updates in Telegram",
  },
};

test("buildSetupPayload maps the wizard draft to the organiser create/update contract", () => {
  assert.deepEqual(buildSetupPayload(draft), {
    name: "Summer Run",
    description: "Live draft",
    currency: "GBP",
    closeDate: "2026-08-01T18:00",
    manufacturer: "QSC",
    manufacturerCountry: "China",
    labTestSupplier: "Janoshik",
    shippingOptions: [{ id: "ship-1", label: "UK tracked", price: 6.5, description: "Tracked", region: "UK", requiresAddress: true, requiresQr: false }],
    organiserPayments: {
      cryptoOptions: [{ currency: "USDT", network: "TRC20", walletAddress: "T-wallet" }],
      revolutHandle: "@summer",
      paypalHandle: undefined,
      anonPayEnabled: false,
      anonPayWallet: undefined,
      anonPayTicker: undefined,
      anonPayNetwork: undefined,
    },
    allowedCountries: ["UK", "DE"],
    excludedCountries: [],
    blockedAccounts: ["blocked_user"],
    invitePin: "1234",
    entryFeeEnabled: true,
    entryFeeAmount: 10,
    entryFeeLabel: "Deposit",
    infoCards: [{ title: "Additional information", body: "Updates in Telegram" }, { title: "Disclaimer", body: "Research only" }],
    orderPageMessage: "Welcome",
  });
});

test("buildSetupProducts removes empty rows and normalizes numeric fields", () => {
  assert.deepEqual(buildSetupProducts(draft), [
    { name: "BPC-157", price: 35, vendor: "Vendor A", category: "Vendor A", stock: 25 },
  ]);
});

test("buildSetupRules maps enabled server rule records", () => {
  assert.deepEqual(buildSetupRules(draft), [
    { id: "rule-1", text: "Pay in 48 hours", enabled: true, format: "text" },
  ]);
});
