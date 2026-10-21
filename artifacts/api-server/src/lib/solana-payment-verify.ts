import { PublicKey } from "@solana/web3.js";
import type { VerifyResult, ObservedTransfer } from "./payment-verify";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SCALE = 1_000_000;

/** Net raw SPL units, including debits and closed accounts. uiAmount is nullable and never authoritative. */
function transfers(tx: any, signature: string, wallet: string, mint: string): Map<string, bigint> | null {
  if (!tx?.meta || tx.meta.err !== null || !Array.isArray(tx.meta.preTokenBalances) ||
    !Array.isArray(tx.meta.postTokenBalances) || !tx.transaction?.signatures?.includes(signature)) return null;
  const keys = tx.transaction.message?.accountKeys ?? [];
  const ata = PublicKey.findProgramAddressSync([new PublicKey(wallet).toBuffer(), TOKEN_PROGRAM.toBuffer(), new PublicKey(mint).toBuffer()], ASSOCIATED_PROGRAM)[0].toBase58();
  const amounts = new Map<string, bigint>();
  for (const [balances, sign] of [[tx.meta.preTokenBalances, -1n], [tx.meta.postTokenBalances, 1n]] as const) {
    const seen = new Set<number>();
    for (const b of balances) {
      if (b.mint !== mint) continue;
      const raw = b.uiTokenAmount?.amount;
      if (!Number.isInteger(b.accountIndex) || b.accountIndex < 0 || seen.has(b.accountIndex) ||
        b.uiTokenAmount?.decimals !== 6 || typeof raw !== "string" || !/^\d{1,20}$/.test(raw) ||
        BigInt(raw) > 18_446_744_073_709_551_615n) return null;
      seen.add(b.accountIndex);
      const key = typeof keys[b.accountIndex] === "string" ? keys[b.accountIndex] : keys[b.accountIndex]?.pubkey;
      // Accept an explicitly configured token account as well as the wallet owner/its canonical ATA.
      const owner = key === wallet ? wallet : b.owner || (key === ata ? wallet : undefined);
      if (typeof owner !== "string" || !owner) return null;
      amounts.set(owner, (amounts.get(owner) ?? 0n) + sign * BigInt(raw));
    }
  }
  return amounts;
}

export async function verifySolanaStablecoinPayment(
  signature: string, wallet: string, expectedAmount: number, mint: string, symbol: string,
  tolerancePct: number, endpoints: readonly string[],
): Promise<VerifyResult> {
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0 || !Number.isSafeInteger(Math.round(expectedAmount * SCALE)) ||
    !Number.isFinite(tolerancePct) || tolerancePct < 0 || tolerancePct >= 1)
    return { verified: false, reason: "Invalid expected Solana payment amount." };
  try { new PublicKey(wallet); new PublicKey(mint); }
  catch { return { verified: false, reason: "Invalid Solana payment destination." }; }
  let observed: Map<string, bigint> | null = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }] }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) continue;
      const json: any = await response.json();
      if (json.error || !json.result) continue;
      if (json.result.meta && json.result.meta.err != null) return { verified: false, reason: "Solana transaction failed on-chain." };
      observed = transfers(json.result, signature, wallet, mint);
      if (observed !== null) break;
    } catch { /* Network failure or incomplete metadata: try another node, never guess a payment. */ }
  }
  if (observed === null) return { verified: false, pending: true,
    reason: "Solana confirmation data is not available yet. Automatic verification will retry; do not send another payment." };
  const observedTransfers: ObservedTransfer[] = [...observed].filter(([, units]) => units > 0n)
    .map(([recipientAddress, units]) => ({ recipientAddress, amount: Number(units) / SCALE }));
  const received = observedTransfers.find(t => t.recipientAddress === wallet);
  if (!received) return { verified: false, reason: `No net ${symbol} payment to the expected Solana wallet found.`,
    observedTransfers, ...(observedTransfers[0] ? { recipientAddress: observedTransfers[0].recipientAddress, amountUsdt: observedTransfers[0].amount } : {}) };
  // Keep the existing 1% policy and two-cent stablecoin rounding floor; never accept zero/negative net receipts.
  const minimumUnits = BigInt(Math.round(expectedAmount * SCALE))
    - BigInt(Math.round(Math.max(expectedAmount * tolerancePct, 0.02) * SCALE));
  if (observed.get(wallet)! >= minimumUnits) return { verified: true, recipientAddress: wallet, amountUsdt: received.amount, blockConfirmations: 1, observedTransfers };
  return { verified: false, recipientAddress: wallet, amountUsdt: received.amount, observedTransfers,
    reason: `Underpayment: ${received.amount.toFixed(6)} ${symbol} received, ${expectedAmount.toFixed(6)} expected. Short by ${(expectedAmount - received.amount).toFixed(6)} ${symbol}.` };
}
