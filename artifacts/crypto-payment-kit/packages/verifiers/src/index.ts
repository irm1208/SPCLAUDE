import { classifyAmount, type AmountClassification } from "@open-crypto-checkout/core";

export type VerificationStatus = "not_found" | "confirming" | "verified" | "underpaid" | "overpaid_review" | "mismatch" | "unavailable";
export type VerificationResult = { status: VerificationStatus; retryable: boolean; evidence?: Record<string, string | number | boolean> };
export type TransferChecks = {
  available: boolean; found?: boolean; chainMatches?: boolean; succeeded?: boolean; tokenMatches?: boolean;
  destinationMatches?: boolean; timestampMatches?: boolean; confirmations?: number; requiredConfirmations?: number;
  expectedBaseUnits?: string; observedBaseUnits?: string; underpayBps?: number; overpayBps?: number;
};
export type AuthoritativeRequest = Readonly<{ chainId: string; tokenId?: string; railId?: string; family?: "evm_native" | "evm_erc20" | "solana_spl" | "tron_trc20" | "bitcoin"; destination: string; expectedBaseUnits: string; earliestTimestamp: number; requiredConfirmations: number; underpayBps: number; overpayBps: number; transactionHash: string }>;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Shared fail-closed evaluation for data decoded from provider-native responses. */
export function evaluateTransfer(checks: TransferChecks): VerificationResult {
  if (!checks.available) return { status: "unavailable", retryable: true };
  if (checks.found === false) return { status: "not_found", retryable: true };
  if (!checks.chainMatches || !checks.succeeded || !checks.tokenMatches || !checks.destinationMatches || !checks.timestampMatches) return { status: "mismatch", retryable: false };
  if ((checks.confirmations ?? 0) < (checks.requiredConfirmations ?? 0)) return { status: "confirming", retryable: true };
  try {
    const status: AmountClassification = classifyAmount(BigInt(checks.expectedBaseUnits!), BigInt(checks.observedBaseUnits!), checks.underpayBps ?? 0, checks.overpayBps ?? 0);
    return { status, retryable: false };
  } catch { return { status: "mismatch", retryable: false }; }
}
const base = (request: AuthoritativeRequest, fields: Partial<TransferChecks>): TransferChecks => ({
  available: true, found: true, requiredConfirmations: request.requiredConfirmations, expectedBaseUnits: request.expectedBaseUnits,
  underpayBps: request.underpayBps, overpayBps: request.overpayBps, ...fields,
});
const same = (a: string | undefined | null, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const blockConfirmations = (tip: bigint | number, block: bigint | number | undefined) => block === undefined ? 0 : Math.max(0, Number(BigInt(tip) - BigInt(block) + 1n));

type EvmProvider = {
  getChainId(): Promise<number | bigint>; getTransaction(hash: string): Promise<{ to?: string | null; value?: bigint; blockNumber?: bigint } | null>;
  getTransactionReceipt(hash: string): Promise<{ status: string; blockNumber?: bigint; logs?: { address: string; topics: readonly string[]; data: string }[] }>;
  getBlock(block: { blockNumber: bigint }): Promise<{ timestamp: bigint } | null>; getBlockNumber(): Promise<bigint>;
};
export const createEvmNativeAdapter = (provider: EvmProvider) => async (request: AuthoritativeRequest): Promise<VerificationResult> => {
  try {
    const tx = await provider.getTransaction(request.transactionHash);
    if (!tx) return evaluateTransfer({ available: true, found: false });
    const receipt = await provider.getTransactionReceipt(request.transactionHash);
    const block = receipt.blockNumber === undefined ? null : await provider.getBlock({ blockNumber: receipt.blockNumber });
    return evaluateTransfer(base(request, { chainMatches: String(await provider.getChainId()) === request.chainId, succeeded: receipt.status === "success",
      tokenMatches: !request.tokenId, destinationMatches: same(tx.to, request.destination), timestampMatches: !!block && Number(block.timestamp) >= request.earliestTimestamp,
      confirmations: blockConfirmations(await provider.getBlockNumber(), receipt.blockNumber), observedBaseUnits: tx.value?.toString() }));
  } catch { return { status: "unavailable", retryable: true }; }
};
export const createErc20Adapter = (provider: EvmProvider) => async (request: AuthoritativeRequest): Promise<VerificationResult> => {
  try {
    const tx = await provider.getTransaction(request.transactionHash);
    if (!tx) return evaluateTransfer({ available: true, found: false });
    const receipt = await provider.getTransactionReceipt(request.transactionHash);
    const block = receipt.blockNumber === undefined ? null : await provider.getBlock({ blockNumber: receipt.blockNumber });
    const log = receipt.logs?.find((item) => same(item.address, request.tokenId) && item.topics[0]?.toLowerCase() === TRANSFER_TOPIC && same(`0x${item.topics[2]?.slice(-40)}`, request.destination));
    return evaluateTransfer(base(request, { chainMatches: String(await provider.getChainId()) === request.chainId, succeeded: receipt.status === "success",
      tokenMatches: !!log, destinationMatches: !!log, timestampMatches: !!block && Number(block.timestamp) >= request.earliestTimestamp,
      confirmations: blockConfirmations(await provider.getBlockNumber(), receipt.blockNumber), observedBaseUnits: log ? BigInt(log.data).toString() : undefined }));
  } catch { return { status: "unavailable", retryable: true }; }
};

type BitcoinProvider = { getNetwork(): Promise<string>; getTransaction(hash: string): Promise<{ status: { confirmed: boolean; block_height?: number; block_time?: number }; vout: { value: number; scriptpubkey_address?: string }[] } | null>; getTipHeight(): Promise<number> };
export const createBitcoinAdapter = (provider: BitcoinProvider) => async (request: AuthoritativeRequest): Promise<VerificationResult> => {
  try {
    const tx = await provider.getTransaction(request.transactionHash);
    if (!tx) return evaluateTransfer({ available: true, found: false });
    const value = tx.vout.filter((v) => same(v.scriptpubkey_address, request.destination)).reduce((sum, v) => sum + BigInt(v.value), 0n);
    return evaluateTransfer(base(request, { chainMatches: await provider.getNetwork() === request.chainId, succeeded: tx.status.confirmed, tokenMatches: true,
      destinationMatches: value > 0n, timestampMatches: !!tx.status.block_time && tx.status.block_time >= request.earliestTimestamp,
      confirmations: tx.status.confirmed ? blockConfirmations(await provider.getTipHeight(), tx.status.block_height) : 0, observedBaseUnits: value.toString() }));
  } catch { return { status: "unavailable", retryable: true }; }
};

type SolanaBalance = { accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } };
type SolanaProvider = { getCluster(): Promise<string>; getCurrentSlot(): Promise<number>; getParsedTransaction(hash: string): Promise<{ slot: number; blockTime: number | null; meta: { err: unknown; preTokenBalances?: SolanaBalance[]; postTokenBalances?: SolanaBalance[] } } | null> };
export const createSolanaSplAdapter = (provider: SolanaProvider) => async (request: AuthoritativeRequest): Promise<VerificationResult> => {
  try {
    const tx = await provider.getParsedTransaction(request.transactionHash);
    if (!tx) return evaluateTransfer({ available: true, found: false });
    const before = new Map((tx.meta.preTokenBalances ?? []).map((b) => [b.accountIndex, b]));
    const deltas = (tx.meta.postTokenBalances ?? []).filter((b) => b.mint === request.tokenId && b.owner === request.destination)
      .reduce((sum, b) => sum + (BigInt(b.uiTokenAmount.amount) - BigInt(before.get(b.accountIndex)?.uiTokenAmount.amount ?? "0")), 0n);
    return evaluateTransfer(base(request, { chainMatches: await provider.getCluster() === request.chainId, succeeded: tx.meta.err === null, tokenMatches: deltas > 0n,
      destinationMatches: deltas > 0n, timestampMatches: !!tx.blockTime && tx.blockTime >= request.earliestTimestamp,
      confirmations: Math.max(0, (await provider.getCurrentSlot()) - tx.slot + 1), observedBaseUnits: deltas.toString() }));
  } catch { return { status: "unavailable", retryable: true }; }
};

type TronProvider = { getNetwork(): Promise<string>; getTransactionInfo(hash: string): Promise<{ receipt?: { result?: string }; blockNumber?: number; blockTimeStamp?: number } | null>; getEvents(hash: string): Promise<{ data: { event_name: string; contract_address: string; result: { to?: string; value?: string } }[] }>; getNowBlock(): Promise<{ block_header: { raw_data: { number: number } } }> };
export const createTronTrc20Adapter = (provider: TronProvider) => async (request: AuthoritativeRequest): Promise<VerificationResult> => {
  try {
    const info = await provider.getTransactionInfo(request.transactionHash);
    if (!info) return evaluateTransfer({ available: true, found: false });
    const event = (await provider.getEvents(request.transactionHash)).data.find((e) => e.event_name === "Transfer" && same(e.contract_address, request.tokenId) && same(e.result.to, request.destination));
    return evaluateTransfer(base(request, { chainMatches: await provider.getNetwork() === request.chainId, succeeded: info.receipt?.result === "SUCCESS", tokenMatches: !!event,
      destinationMatches: !!event, timestampMatches: !!info.blockTimeStamp && Math.floor(info.blockTimeStamp / 1000) >= request.earliestTimestamp,
      confirmations: info.blockNumber === undefined ? 0 : Math.max(0, (await provider.getNowBlock()).block_header.raw_data.number - info.blockNumber + 1), observedBaseUnits: event?.result.value }));
  } catch { return { status: "unavailable", retryable: true }; }
};