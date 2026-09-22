export function normalizeWholesaleOrganiserPaymentIdentity(input: {
  txHash: string;
  currency: string;
  network: string;
}): { txHash: string; currency: string; network: string } {
  const currency = input.currency.trim().toUpperCase();
  const rawNetwork = input.network.trim().toLowerCase();
  const network =
    /arbitrum/.test(rawNetwork) ? "arbitrum"
      : /polygon/.test(rawNetwork) ? "polygon"
        : /(bep.?20|bsc|binance)/.test(rawNetwork) ? "bsc"
          : /(tron|trc)/.test(rawNetwork) ? "tron"
            : /solana/.test(rawNetwork) ? "solana"
              : currency === "BTC" && /(mainnet|bitcoin)/.test(rawNetwork) ? "bitcoin"
                : (
                  currency === "ETH"
                  || /(erc.?20|ethereum)/.test(rawNetwork)
                ) ? "ethereum"
                  : rawNetwork;
  const rawTxHash = input.txHash.trim();
  const isHexChain = ["ethereum", "arbitrum", "polygon", "bsc", "tron", "bitcoin"]
    .includes(network);
  const txHash = isHexChain && /^(?:0x)?[0-9a-f]+$/i.test(rawTxHash)
    ? rawTxHash.replace(/^0x/i, "").toLowerCase()
    : rawTxHash;

  return { txHash, currency, network };
}

export function wholesaleOrganiserPaymentIdentityKey(input: {
  txHash: string;
  currency: string;
  network: string;
}): string {
  const identity = normalizeWholesaleOrganiserPaymentIdentity(input);
  return `${identity.currency}:${identity.network}:${identity.txHash}`;
}