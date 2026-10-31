import { describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", async () => ({
  ...(await import("../../../../../lib/db/src/schema/index")),
  db: {},
}));
vi.mock("../vendor-portal-service", () => ({
  auditVendor: vi.fn(),
  loadVendorSource: vi.fn(),
  isVendorSubmissionStale: vi.fn(),
}));
import { paymentOrderTotal, paymentInput } from "../vendor-payments";
describe("vendor payment input", () => {
  it("adds snapshot USD using exact cents", () =>
    expect(
      paymentOrderTotal([
        { snapshot: { totalCost: "0.10" } },
        { snapshot: { totalCost: "0.20" } },
      ]),
    ).toBe("0.30"));
  it("rejects invalid snapshot totals", () =>
    expect(() =>
      paymentOrderTotal([{ snapshot: { totalCost: "1.001" } }]),
    ).toThrow());
  it("rejects repeated orders and missing wallet confirmation", () => {
    expect(() =>
      paymentInput({ vendorId: "v", walletId: "w", submissionIds: ["s", "s"] }),
    ).toThrow();
    expect(() =>
      paymentInput({ vendorId: "v", walletId: "w", submissionIds: ["s"] }),
    ).toThrow();
  });
});

describe("payment confirmation", () => {
  const base = {
    vendorId: "v",
    walletId: "w",
    walletSnapshot: {
      currency: "USDC",
      network: "ERC-20",
      address: "0x1111111111111111111111111111111111111111",
    },
    submissionIds: ["z", "a"],
    txid: `0x${"a".repeat(64)}`,
    cryptoAmount: "0.300000",
  };
  it("sorts selected orders and normalizes exact asset units", () => {
    const value = paymentInput(base);
    expect(value.submissionIds).toEqual(["a", "z"]);
    expect(value.cryptoAmount).toBe("0.3");
  });
  it("rejects malformed dates and excessive notes", () => {
    expect(() => paymentInput({ ...base, paidAt: "yesterday" })).toThrow();
    expect(() => paymentInput({ ...base, note: "x".repeat(2001) })).toThrow();
  });
  it("rejects negative, exponent and excessive precision asset amounts", () => {
    for (const cryptoAmount of ["-1", "1e3", "0.0000001"])
      expect(() => paymentInput({ ...base, cryptoAmount })).toThrow();
  });
});

describe("on-chain transaction identity", () => {
  it("treats native ETH and ERC-20 transfers as one transaction namespace", async () => {
    const { vendorPaymentChain } = await import("../vendor-wallet-input");
    expect(vendorPaymentChain("ETH", "Ethereum")).toBe(
      vendorPaymentChain("USDT", "ERC-20"),
    );
  });
});
