import { z } from "zod";
import { getPayoutAsset, tokenBaseUnits } from "@workspace/payout-assets";
import { applyPayout, digest, moneyToMinor, PayoutError, type PayoutLedger, type FeeOrder, type PayoutRecipient } from "./reshipper-payout-rules";
import { isChainPending, type ChainIntent } from "./payout-chain-schema";
const inputSchema = z.object({
  operationId: z.string().uuid(), currency: z.string().min(2).max(8), sender: z.string().trim().min(1).max(200),
  allocations: z.array(z.object({ orderId: z.string().min(1).max(100), adminFee: z.string(), postage: z.string() })).min(1).max(5000),
});
export function prepareChainIntent(ledger: PayoutLedger, orders: FeeOrder[], currency: string, recipient: PayoutRecipient,
  wallet: { address: string; network: string; currency?: string } | null, raw: unknown, actor: string, now: string, rate: number): ChainIntent {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new PayoutError("Select payable orders and connect a compatible wallet.");
  const body = parsed.data;
  const requestHash = digest(JSON.stringify({ ...body, allocations: [...body.allocations].sort((a, b) => a.orderId.localeCompare(b.orderId)) }));
  const previous = ledger.chainPayments.find(p => p.id === body.operationId);
  if (previous) {
    if (previous.accountId !== recipient.id || previous.requestHash !== requestHash) throw new PayoutError("This operation belongs to a different payment.", 409);
    return previous;
  }
  if (!wallet?.currency) throw new PayoutError("Ask the reshipper to choose their payout token and network first.");
  const asset = getPayoutAsset(wallet.network, wallet.currency);
  if (!asset) throw new PayoutError("This token and network do not support connected payouts. Use a supported USDT/USDC option.");
  if (ledger.chainPayments.some(p => isChainPending(p) && p.allocations.some(a => body.allocations.some(b => b.orderId === a.orderId))))
    throw new PayoutError("An order already has a pending payout. Resume that payment instead.", 409);
  if (body.currency !== currency || !Number.isFinite(rate) || rate <= 0) throw new PayoutError("Payout currency or conversion rate changed. Refresh.", 409);
  const amountMinor = body.allocations.reduce((s, a) => s + moneyToMinor(a.adminFee) + moneyToMinor(a.postage), 0);
  if (!Number.isSafeInteger(amountMinor) || !amountMinor) throw new PayoutError("Select a positive payout amount.");
  const usdMinor = Math.round(amountMinor * rate);
  if (!Number.isSafeInteger(usdMinor) || usdMinor <= 0) throw new PayoutError("Converted payout is outside the supported amount range.");
  // Reuse the complete paid-only, ownership, currency and per-component allocation validation.
  const snapshot = applyPayout(structuredClone(ledger), orders, currency, recipient, {
    ...body, amount: (amountMinor / 100).toFixed(2), paidAt: now.slice(0, 10), method: "crypto",
    reference: `pending:${body.operationId}`, destination: wallet.address, network: wallet.network, confirmedDestination: true,
  }, actor, now);
  const intent: ChainIntent = {
    id: body.operationId, requestHash, accountId: recipient.id, username: recipient.username, state: "prepared",
    destination: wallet.address, network: wallet.network, token: asset.currency, sender: body.sender,
    amountMinor, currency, usdMinor, tokenUnits: tokenBaseUnits(usdMinor, asset.decimals), rate,
    allocations: snapshot.allocations, createdAt: now, createdBy: actor, verifiedAt: null, txid: null, error: null, transaction: {}, signedRaw: null, previousTxids: [],
  };
  ledger.chainPayments.push(intent);
  ledger.audit.push({ action: "chain_payout_prepared", actor, at: now, reason: "Reserved selected order fees for a wallet-approved payout.", details: { id: intent.id } });
  return intent;
}
export function settleChainIntent(ledger: PayoutLedger, id: string, actor: string, now: string) {
  const intent = ledger.chainPayments.find(p => p.id === id);
  if (!intent) throw new PayoutError("Payment not found.", 404);
  const existing = ledger.payouts.find(p => p.operationId === id);
  if (existing) return existing;
  if (intent.state !== "broadcast" || !intent.txid || !intent.verifiedAt) throw new PayoutError("This transfer is not confirmed on-chain.", 409);
  if (ledger.payouts.some(p => p.reference.toLowerCase() === intent.txid!.toLowerCase()))
    throw new PayoutError("This transaction is already recorded.", 409);
  // A sent payment must retain its original allocations even if a member's order changes after approval.
  for (const a of intent.allocations) {
    const entry = ledger.entitlements[a.orderId];
    const prior = ledger.payouts.filter(p => !p.voidedAt).flatMap(p => p.allocations).filter(p => p.orderId === a.orderId);
    if (!entry || entry.accountId !== intent.accountId || entry.currency !== intent.currency ||
      prior.reduce((s, p) => s + p.adminFeeMinor, 0) + a.adminFeeMinor > entry.adminFeeMinor ||
      prior.reduce((s, p) => s + p.postageMinor, 0) + a.postageMinor > entry.postageMinor)
      throw new PayoutError("Confirmed transfer allocations require Admin review. Do not send again.", 409);
  }
  const receipt = {
    id, accountId: intent.accountId, username: intent.username, operationId: id, requestHash: intent.requestHash,
    amountMinor: intent.amountMinor, currency: intent.currency, paidAt: now, method: "crypto",
    reference: intent.txid, destination: intent.destination, network: intent.network,
    token: intent.token, tokenUnits: intent.tokenUnits, chainVerified: true,
    note: "Confirmed blockchain payout", recordedBy: actor, recordedAt: now,
    allocations: intent.allocations, voidedAt: null, voidReason: null,
  };
  ledger.payouts.push(receipt); intent.state = "confirmed";
  ledger.audit.push({ action: "chain_payout_confirmed", actor, at: now, reason: "Verified transfer settled the reserved allocations.", details: { id, txid: intent.txid } });
  return receipt;
}
