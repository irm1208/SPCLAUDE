export interface PayoutAsset {
  network: string; currency: "USDT" | "USDC"; family: "evm" | "solana" | "tron";
  contract: string; decimals: number; rpc: string; chainId?: number; confirmations?: number;
}
const evm = (network: string, chainId: number, rpc: string, confirmations: number, currency: "USDT" | "USDC", contract: string, decimals = 6): PayoutAsset =>
  ({ network, chainId, rpc, confirmations, currency, contract, decimals, family: "evm" });
export const PAYOUT_ASSETS: readonly PayoutAsset[] = [
  evm("ERC-20", 1, "https://ethereum-rpc.publicnode.com", 12, "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7"),
  evm("ERC-20", 1, "https://ethereum-rpc.publicnode.com", 12, "USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
  evm("Arbitrum One", 42161, "https://arbitrum-one-rpc.publicnode.com", 20, "USDT", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"),
  evm("Arbitrum One", 42161, "https://arbitrum-one-rpc.publicnode.com", 20, "USDC", "0xaf88d065e77c8cc2239327c5edb3a432268e5831"),
  evm("Polygon", 137, "https://polygon-bor-rpc.publicnode.com", 128, "USDT", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"),
  evm("Polygon", 137, "https://polygon-bor-rpc.publicnode.com", 128, "USDC", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"),
  evm("BSC", 56, "https://bsc-rpc.publicnode.com", 15, "USDT", "0x55d398326f99059ff775485246999027b3197955", 18),
  { network: "Solana", currency: "USDT", family: "solana", contract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, rpc: "https://solana-rpc.publicnode.com" },
  { network: "Solana", currency: "USDC", family: "solana", contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, rpc: "https://solana-rpc.publicnode.com" },
  { network: "TRC-20", currency: "USDT", family: "tron", contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6, rpc: "https://api.trongrid.io" },
];
export function getPayoutAsset(network: string, currency: string): PayoutAsset | null {
  return PAYOUT_ASSETS.find(a => a.network === network && a.currency === currency) ?? null;
}
export function tokenBaseUnits(usdMinor: number, decimals: number): string {
  if (!Number.isSafeInteger(usdMinor) || usdMinor <= 0 || decimals < 2 || decimals > 18) throw new Error("Invalid payout token amount.");
  return (BigInt(usdMinor) * 10n ** BigInt(decimals - 2)).toString();
}
export function displayTokenUnits(units: string, decimals: number): string {
  const s = units.padStart(decimals + 1, "0");
  return `${s.slice(0, -decimals)}.${s.slice(-decimals)}`.replace(/\.?0+$/, "") || "0";
}
export function transferData(address: string, units: string): string {
  if (!/^0x[0-9a-f]{40}$/i.test(address) || !/^\d+$/.test(units) || BigInt(units) >= 2n ** 256n) throw new Error("Invalid token transfer.");
  return `0xa9059cbb${address.slice(2).toLowerCase().padStart(64, "0")}${BigInt(units).toString(16).padStart(64, "0")}`;
}
