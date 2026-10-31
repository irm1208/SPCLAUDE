import { PAYOUT_ASSETS } from "@workspace/payout-assets";
import bs58 from "bs58";
import { createHash, timingSafeEqual } from "node:crypto";
import { bech32, bech32m } from "bech32";
import { keccak_256 } from "@noble/hashes/sha3";
import { VendorPortalError } from "./vendor-portal-model";

export interface VendorWalletOption {
  currency: string;
  network: string;
  family: "evm" | "solana" | "tron" | "bitcoin";
  decimals: number;
}
export const VENDOR_WALLET_OPTIONS: readonly VendorWalletOption[] = [
  ...PAYOUT_ASSETS.map(({ currency, network, family, decimals }) => ({
    currency,
    network,
    family,
    decimals,
  })),
  {
    currency: "BTC",
    network: "Bitcoin Mainnet",
    family: "bitcoin",
    decimals: 8,
  },
  { currency: "ETH", network: "Ethereum", family: "evm", decimals: 18 },
  { currency: "SOL", network: "Solana", family: "solana", decimals: 9 },
];
export function vendorWalletOption(
  currency: unknown,
  network: unknown,
): VendorWalletOption {
  const coin =
    typeof currency === "string" ? currency.trim().toUpperCase() : "";
  const raw = typeof network === "string" ? network.trim() : "";
  const aliases: Record<string, string> = {
    erc20: "ERC-20",
    "erc-20": "ERC-20",
    trc20: "TRC-20",
    "trc-20": "TRC-20",
    bep20: "BSC",
    "bep-20": "BSC",
    bitcoin: "Bitcoin Mainnet",
    eth: "Ethereum",
  };
  const rail = aliases[raw.toLowerCase()] ?? raw;
  const option = VENDOR_WALLET_OPTIONS.find(
    (o) =>
      o.currency === coin && o.network.toLowerCase() === rail.toLowerCase(),
  );
  if (!option)
    throw new VendorPortalError("Choose a supported currency and network.");
  return option;
}
function decodedLength(value: string, expected: number): boolean {
  try {
    return bs58.decode(value).length === expected;
  } catch {
    return false;
  }
}
function base58Check(value: string, versions: number[]): boolean {
  try {
    const bytes = Buffer.from(bs58.decode(value));
    if (bytes.length !== 25 || !versions.includes(bytes[0])) return false;
    const body = bytes.subarray(0, 21);
    const checksum = createHash("sha256")
      .update(createHash("sha256").update(body).digest())
      .digest()
      .subarray(0, 4);
    return timingSafeEqual(checksum, bytes.subarray(21));
  } catch {
    return false;
  }
}
function validBitcoinAddress(address: string): boolean {
  if (/^[13]/.test(address)) return base58Check(address, [0, 5]);
  for (const codec of [bech32, bech32m]) {
    try {
      const decoded = codec.decode(address);
      const version = decoded.words[0];
      const program = codec.fromWords(decoded.words.slice(1));
      if (
        decoded.prefix !== "bc" ||
        version > 16 ||
        program.length < 2 ||
        program.length > 40
      )
        continue;
      if (version === 0)
        return codec === bech32 && [20, 32].includes(program.length);
      return codec === bech32m;
    } catch {
      /* Try the other checksum variant. */
    }
  }
  return false;
}
function validEvmAddress(address: string): boolean {
  if (!/^0x[a-f0-9]{40}$/i.test(address) || /^0x0{40}$/i.test(address))
    return false;
  const hex = address.slice(2);
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true;
  const checksum = Buffer.from(
    keccak_256(Buffer.from(hex.toLowerCase())),
  ).toString("hex");
  return [...hex].every(
    (c, i) =>
      !/[a-f]/i.test(c) ||
      c ===
        (parseInt(checksum[i], 16) >= 8 ? c.toUpperCase() : c.toLowerCase()),
  );
}
/** Native ETH and ERC-20 tokens share one blockchain transaction namespace. */
export function vendorPaymentChain(
  currency: unknown,
  network: unknown,
): string {
  const option = vendorWalletOption(currency, network);
  return ["Ethereum", "ERC-20"].includes(option.network)
    ? "Ethereum"
    : option.network;
}
export interface VendorWalletInput {
  id?: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
}
export function vendorWalletsInput(body: unknown): VendorWalletInput[] {
  const raw =
    body && typeof body === "object"
      ? (body as { wallets?: unknown }).wallets
      : undefined;
  if (!Array.isArray(raw) || raw.length < 1)
    throw new VendorPortalError(
      "Add at least one payment wallet before continuing.",
    );
  if (raw.length > 20)
    throw new VendorPortalError("Save at most 20 payment wallets.");
  const keys = new Set<string>(),
    ids = new Set<string>();
  return raw.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new VendorPortalError("Check each payment wallet.");
    const w = item as Record<string, unknown>,
      option = vendorWalletOption(w.currency, w.network);
    const address = typeof w.address === "string" ? w.address.trim() : "";
    const valid =
      option.family === "evm"
        ? validEvmAddress(address)
        : option.family === "bitcoin"
          ? validBitcoinAddress(address)
          : option.family === "tron"
            ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address) &&
              base58Check(address, [0x41])
            : decodedLength(address, 32);
    if (!valid)
      throw new VendorPortalError(
        `Enter a valid ${option.network} wallet address.`,
      );
    if (w.label != null && typeof w.label !== "string")
      throw new VendorPortalError("Wallet label must be text.");
    const label = typeof w.label === "string" ? w.label.trim() : "";
    if (label.length > 80)
      throw new VendorPortalError(
        "Wallet labels must be 80 characters or fewer.",
      );
    const key = `${option.currency}:${option.network}:${option.family === "evm" || (option.family === "bitcoin" && /^bc1/i.test(address)) ? address.toLowerCase() : address}`;
    if (keys.has(key))
      throw new VendorPortalError("Remove the duplicate payment wallet.");
    keys.add(key);
    let id: string | undefined;
    if (w.id != null) {
      if (
        typeof w.id !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(w.id) ||
        ids.has(w.id)
      )
        throw new VendorPortalError("Invalid or duplicate wallet ID.");
      id = w.id;
      ids.add(id);
    }
    return {
      ...(id ? { id } : {}),
      currency: option.currency,
      network: option.network,
      address,
      label: label || null,
    };
  });
}
export function normalizeVendorTxid(
  value: unknown,
  currency: unknown,
  network: unknown,
): string {
  const option = vendorWalletOption(currency, network),
    txid = typeof value === "string" ? value.trim() : "";
  const valid =
    option.family === "evm"
      ? /^0x[a-f0-9]{64}$/i.test(txid)
      : option.family === "solana"
        ? txid.length >= 80 && txid.length <= 90 && decodedLength(txid, 64)
        : /^[a-f0-9]{64}$/i.test(txid);
  if (!valid)
    throw new VendorPortalError(`Enter a valid ${option.network} TXID.`);
  return option.family === "solana" ? txid : txid.toLowerCase();
}
export function normalizeVendorCryptoAmount(
  value: unknown,
  currency: unknown,
  network: unknown,
): string {
  const option = vendorWalletOption(currency, network),
    text = typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,30}(?:\.\d+)?$/.test(text))
    throw new VendorPortalError("Enter the amount sent as a positive number.");
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > option.decimals || !/[1-9]/.test(text))
    throw new VendorPortalError(
      `Enter a positive amount with at most ${option.decimals} decimal places.`,
    );
  const integer = whole.replace(/^0+(?=\d)/, ""),
    decimals = fraction.replace(/0+$/, "");
  return integer + (decimals ? `.${decimals}` : "");
}
