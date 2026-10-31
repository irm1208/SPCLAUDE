import { describe, it, expect } from "vitest";
import bs58 from "bs58";
import { createHash } from "node:crypto";
import { bech32, bech32m } from "bech32";
import {
  VENDOR_WALLET_OPTIONS,
  vendorWalletsInput,
  normalizeVendorTxid,
  normalizeVendorCryptoAmount,
} from "./vendor-wallet-input";
const evm = "0x" + "1".repeat(40);
describe("vendor receiving wallets and payment declarations", () => {
  it("offers every configured payout rail plus native BTC ETH and SOL", () => {
    for (const [currency, network] of [
      ["USDT", "TRC-20"],
      ["USDT", "ERC-20"],
      ["USDC", "Solana"],
      ["BTC", "Bitcoin Mainnet"],
      ["ETH", "Ethereum"],
      ["SOL", "Solana"],
    ])
      expect(
        VENDOR_WALLET_OPTIONS.some(
          (o) => o.currency === currency && o.network === network,
        ),
      ).toBe(true);
  });
  it("accepts multiple wallets, including distinct destinations on the same rail", () => {
    const wallets = vendorWalletsInput({
      wallets: [
        { currency: "usdt", network: "erc20", address: ` ${evm} ` },
        {
          currency: "USDT",
          network: "ERC-20",
          address: "0x" + "2".repeat(40),
          label: "Backup",
        },
        {
          currency: "USDC",
          network: "Solana",
          address: "11111111111111111111111111111111",
        },
      ],
    });
    expect(wallets).toHaveLength(3);
    expect(wallets[0]).toMatchObject({
      currency: "USDT",
      network: "ERC-20",
      address: evm,
    });
  });
  it("requires a wallet and rejects invalid networks, wrong-chain addresses and duplicates", () => {
    expect(() => vendorWalletsInput({ wallets: [] })).toThrow(/at least one/i);
    expect(() =>
      vendorWalletsInput({
        wallets: [{ currency: "USDT", network: "Unknown", address: evm }],
      }),
    ).toThrow(/supported/i);
    expect(() =>
      vendorWalletsInput({
        wallets: [{ currency: "USDT", network: "TRC-20", address: evm }],
      }),
    ).toThrow(/address/i);
    const w = { currency: "USDT", network: "ERC-20", address: evm };
    expect(() =>
      vendorWalletsInput({
        wallets: [w, { ...w, address: evm.toUpperCase().replace("0X", "0x") }],
      }),
    ).toThrow(/duplicate/i);
  });
  it("accepts valid Bitcoin legacy, SegWit, Taproot and Tron checksum encodings", () => {
    const legacy = "1BoatSLRHtKNngkdXEeobR76b53LETtpyT";
    const segwit = bech32.encode("bc", [
      0,
      ...bech32.toWords(Buffer.alloc(20, 1)),
    ]);
    const taproot = bech32m.encode("bc", [
      1,
      ...bech32m.toWords(Buffer.alloc(32, 1)),
    ]);
    for (const address of [legacy, segwit, taproot])
      expect(
        vendorWalletsInput({
          wallets: [{ currency: "BTC", network: "Bitcoin Mainnet", address }],
        }),
      ).toHaveLength(1);
    const body = Buffer.from([0x41, ...Array(20).fill(1)]);
    const checksum = createHash("sha256")
      .update(createHash("sha256").update(body).digest())
      .digest()
      .subarray(0, 4);
    expect(
      vendorWalletsInput({
        wallets: [
          {
            currency: "USDT",
            network: "TRC-20",
            address: bs58.encode(Buffer.concat([body, checksum])),
          },
        ],
      }),
    ).toHaveLength(1);
    const wrongVariant = bech32.encode("bc", [
      1,
      ...bech32.toWords(Buffer.alloc(32, 1)),
    ]);
    expect(() =>
      vendorWalletsInput({
        wallets: [
          {
            currency: "BTC",
            network: "Bitcoin Mainnet",
            address: wrongVariant,
          },
        ],
      }),
    ).toThrow(/address/i);
  });
  it("rejects Bitcoin and Tron addresses with invalid checksums", () => {
    for (const address of ["bc1abcdef", "1BoatSLRHtKNngkdXEeobR76b53LETtpyU"]) {
      expect(() =>
        vendorWalletsInput({
          wallets: [{ currency: "BTC", network: "Bitcoin Mainnet", address }],
        }),
      ).toThrow(/address/i);
    }
    const invalidTron = bs58.encode(
      Uint8Array.from([0x41, ...Array(24).fill(1)]),
    );
    expect(() =>
      vendorWalletsInput({
        wallets: [
          { currency: "USDT", network: "TRC-20", address: invalidTron },
        ],
      }),
    ).toThrow(/address/i);
  });
  it("normalizes TXIDs by network without claiming on-chain verification", () => {
    expect(normalizeVendorTxid("0x" + "A".repeat(64), "USDT", "ERC-20")).toBe(
      "0x" + "a".repeat(64),
    );
    expect(normalizeVendorTxid("A".repeat(64), "USDT", "TRC-20")).toBe(
      "a".repeat(64),
    );
    expect(() => normalizeVendorTxid("sent", "USDT", "ERC-20")).toThrow(
      /TXID/i,
    );
  });
  it("keeps crypto amounts exact and enforces currency precision", () => {
    expect(normalizeVendorCryptoAmount("000123.450000", "USDT", "TRC-20")).toBe(
      "123.45",
    );
    expect(
      normalizeVendorCryptoAmount("0.00000001", "BTC", "Bitcoin Mainnet"),
    ).toBe("0.00000001");
    for (const value of ["0", "-1", "1e5", "NaN", "1.0000001"])
      expect(() =>
        normalizeVendorCryptoAmount(value, "USDT", "TRC-20"),
      ).toThrow(/amount/i);
  });
});
