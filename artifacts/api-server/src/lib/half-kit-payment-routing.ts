type PaymentDetails = {
  cryptoWalletAddress?: string | null;
  cryptoCurrency?: string | null;
  cryptoNetwork?: string | null;
  usdtWallet?: string | null;
  revolutHandle?: string | null;
  paypalHandle?: string | null;
  anonPayEnabled?: boolean | null;
  anonPayWallet?: string | null;
  anonPayTicker?: string | null;
  anonPayNetwork?: string | null;
};
type ReshipperSource = {
  reshipperUsername?: string;
  reshipperPaymentDetails?: PaymentDetails | null;
  enabledPaymentMethods?: Record<string, boolean> | null;
};
const clean = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && !["null", "undefined", "none"].includes(trimmed.toLowerCase()) ? trimmed : null;
};

/** Site/admin destinations are deliberately not inputs to this resolver. */
export function resolveHalfKitPaymentMethods(
  organiser: PaymentDetails | null | undefined,
  reshipper: ReshipperSource | null | undefined,
  validWallet: (address: string) => boolean,
) {
  const r = reshipper?.reshipperPaymentDetails;
  const enabled = reshipper?.enabledPaymentMethods;
  const wallet = (value?: string | null) => {
    const address = clean(value);
    return address && validWallet(address) ? address : null;
  };
  const reshipperCrypto = enabled?.cryptoEnabled ? wallet(r?.cryptoWalletAddress) : null;
  const reshipperUsdt = enabled?.usdtEnabled ? wallet(r?.usdtWallet) : null;
  const cryptoWalletAddress = reshipperCrypto ?? reshipperUsdt ?? wallet(organiser?.cryptoWalletAddress);
  const cryptoCurrency = cryptoWalletAddress
    ? (reshipperCrypto ? clean(r?.cryptoCurrency) : reshipperUsdt ? "USDT" : clean(organiser?.cryptoCurrency)) ?? "USDT"
    : null;
  const cryptoNetwork = cryptoWalletAddress
    ? (reshipperCrypto || reshipperUsdt ? clean(r?.cryptoNetwork) : clean(organiser?.cryptoNetwork)) ?? "ERC-20"
    : null;
  const completeAnonPay = (source: PaymentDetails | null | undefined, isEnabled: boolean) =>
    isEnabled && clean(source?.anonPayWallet) && clean(source?.anonPayTicker) && clean(source?.anonPayNetwork)
      ? source : null;
  const reshipperAnonPay = completeAnonPay(r, enabled?.anonPayEnabled === true);
  const anonPay = reshipperAnonPay ?? completeAnonPay(organiser, organiser?.anonPayEnabled === true);
  return {
    cryptoWalletAddress, cryptoCurrency, cryptoNetwork,
    revolutHandle: (enabled?.revolutEnabled ? clean(r?.revolutHandle) : null) ?? clean(organiser?.revolutHandle),
    paypalHandle: (enabled?.paypalEnabled ? clean(r?.paypalHandle) : null) ?? clean(organiser?.paypalHandle),
    anonPayEnabled: !!anonPay,
    anonPayWallet: clean(anonPay?.anonPayWallet),
    anonPayTicker: clean(anonPay?.anonPayTicker),
    anonPayNetwork: clean(anonPay?.anonPayNetwork),
    collectedBy: reshipperCrypto || reshipperUsdt || (!cryptoWalletAddress && reshipperAnonPay)
      ? { type: "reshipper" as const, username: reshipper?.reshipperUsername }
      : { type: "organiser" as const },
  };
}
