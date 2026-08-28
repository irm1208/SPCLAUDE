export type SharedOrderPaymentSource = {
  creatorUsername: string;
  leadRevolutHandle: string | null;
  leadPaypalEmail: string | null;
  leadAnonPayWallet: string | null;
  leadCryptoOptions: Array<{ currency: string; network: string; walletAddress: string }> | null;
};

type AnonPayRail = {
  anonPayTicker: string | null;
  anonPayNetwork: string | null;
};

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Shared wholesale orders are peer-to-peer: every destination must belong to
 * the organiser. Site/admin payment destinations are deliberately not inputs.
 */
export function resolveSharedOrderPaymentMethods(
  share: SharedOrderPaymentSource | null | undefined,
  rail: AnonPayRail,
) {
  const options = (share?.leadCryptoOptions ?? []).filter(option =>
    !!clean(option.currency) && !!clean(option.network) && !!clean(option.walletAddress),
  );
  const first = options[0] ?? null;
  const anonPayWallet = clean(share?.leadAnonPayWallet);
  const anonPayTicker = clean(rail.anonPayTicker);
  const anonPayNetwork = clean(rail.anonPayNetwork);
  const anonPayEnabled = !!anonPayWallet && !!anonPayTicker && !!anonPayNetwork;

  return {
    revolutHandle: clean(share?.leadRevolutHandle),
    paypalHandle: clean(share?.leadPaypalEmail),
    anonPayEnabled,
    anonPayWallet: anonPayEnabled ? anonPayWallet : null,
    anonPayTicker: anonPayEnabled ? anonPayTicker : null,
    anonPayNetwork: anonPayEnabled ? anonPayNetwork : null,
    cryptoWalletAddress: first?.walletAddress ?? null,
    cryptoCurrency: first?.currency ?? null,
    cryptoNetwork: first?.network ?? null,
    availableCryptoOptions: options,
    collectedBy: {
      type: "organiser" as const,
      username: share?.creatorUsername,
    },
  };
}