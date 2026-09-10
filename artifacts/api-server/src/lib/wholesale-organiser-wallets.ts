export interface OrganiserWalletOption {
  currency: string;
  network: string;
  walletAddress: string;
}

export const ORGANISER_WALLET_NETWORKS = [
  "ERC-20",
  "Arbitrum One",
  "Polygon",
  "Solana",
  "TRC-20",
  "Bitcoin Mainnet",
  "Ethereum",
] as const;

const supportedNetworks = new Set<string>(ORGANISER_WALLET_NETWORKS);

/**
 * Normalize the organiser-owned payment destinations stored on a shared order.
 * Incomplete rows are ignored so partially-filled UI rows are harmless; a
 * complete row with an unknown network is rejected rather than persisted.
 */
export function normalizeOrganiserWallets(value: unknown): OrganiserWalletOption[] {
  if (!Array.isArray(value)) {
    throw new Error("Wallet options must be an array.");
  }

  const wallets: OrganiserWalletOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const currency = String(record.currency ?? "").trim().toUpperCase().slice(0, 10);
    const network = String(record.network ?? "").trim().slice(0, 50);
    const walletAddress = String(record.walletAddress ?? "").trim().slice(0, 200);
    if (!currency || !network || !walletAddress) continue;
    if (!supportedNetworks.has(network)) {
      throw new Error(`Unsupported crypto network: ${network}`);
    }
    wallets.push({ currency, network, walletAddress });
  }
  return wallets;
}

export function canAdminEditOrganiserWallets(status: string): boolean {
  return status === "open" || status === "locked";
}

export function describeOrganiserWallets(
  wallets: readonly OrganiserWalletOption[],
): Array<{ currency: string; network: string }> {
  return wallets.map(({ currency, network }) => ({ currency, network }));
}