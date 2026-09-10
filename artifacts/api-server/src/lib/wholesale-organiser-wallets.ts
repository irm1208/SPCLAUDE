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

export class OrganiserWalletValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganiserWalletValidationError";
  }
}

/**
 * Normalize the organiser-owned payment destinations stored on a shared order.
 * Incomplete rows are ignored so partially-filled UI rows are harmless; a
 * complete row with an unknown network is rejected rather than persisted.
 */
export function normalizeOrganiserWallets(value: unknown): OrganiserWalletOption[] {
  if (!Array.isArray(value)) {
    throw new OrganiserWalletValidationError("Wallet options must be an array.");
  }

  const wallets: OrganiserWalletOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    for (const field of ["currency", "network", "walletAddress"] as const) {
      if (record[field] !== null && record[field] !== undefined && typeof record[field] !== "string") {
        throw new OrganiserWalletValidationError(`Wallet ${field} must be a string.`);
      }
    }
    const currency = (record.currency as string | null | undefined ?? "").trim().toUpperCase();
    const network = (record.network as string | null | undefined ?? "").trim();
    const walletAddress = (record.walletAddress as string | null | undefined ?? "").trim();
    if (!currency || !network || !walletAddress) continue;
    if (currency.length > 10) {
      throw new OrganiserWalletValidationError("Wallet currency must be 10 characters or fewer.");
    }
    if (network.length > 50) {
      throw new OrganiserWalletValidationError("Wallet network must be 50 characters or fewer.");
    }
    if (walletAddress.length > 200) {
      throw new OrganiserWalletValidationError("Wallet address must be 200 characters or fewer.");
    }
    if (!supportedNetworks.has(network)) {
      throw new OrganiserWalletValidationError(`Unsupported crypto network: ${network}`);
    }
    wallets.push({ currency, network, walletAddress });
  }
  return wallets;
}

export function canAdminEditOrganiserWallets(status: string): boolean {
  return status === "open" || status === "locked";
}

export function describeOrganiserWallets(
  wallets: unknown,
): Array<{ currency: string; network: string }> {
  if (!Array.isArray(wallets)) return [];
  return wallets.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.currency !== "string" || typeof record.network !== "string") return [];
    const currency = record.currency.trim();
    const network = record.network.trim();
    if (!currency || !network) return [];
    return [{ currency, network }];
  });
}