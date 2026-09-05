import { classifyAmount, type AmountClassification } from "@open-crypto-checkout/core";

export type VerificationStatus = "not_found" | "confirming" | "verified" | "underpaid" | "overpaid_review" | "mismatch" | "unavailable";
export type VerificationResult = { status: VerificationStatus; retryable: boolean; evidence?: Record<string, string | number | boolean> };
export type TransferChecks = {
  available: boolean; found?: boolean; chainMatches?: boolean; succeeded?: boolean; tokenMatches?: boolean;
  destinationMatches?: boolean; timestampMatches?: boolean; confirmations?: number; requiredConfirmations?: number;
  expectedBaseUnits?: string; observedBaseUnits?: string; underpayBps?: number; overpayBps?: number;
};
/** Shared fail-closed evaluation for normalized data from every chain adapter. */
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

export type AuthoritativeRequest = Readonly<{ chainId: string; tokenId?: string; destination: string; expectedBaseUnits: string; earliestTimestamp: number; requiredConfirmations: number; underpayBps: number; overpayBps: number; transactionHash: string }>;
export interface ChainProvider<T> { getTransaction(hash: string): Promise<T | null>; }
export type DecodedTransfer = TransferChecks;
/** Adapter factory keeps RPC transport injectable and database-free. */
export function createVerifier<T>(provider: ChainProvider<T>, decode: (transaction: T, request: AuthoritativeRequest) => TransferChecks) {
  return async (request: AuthoritativeRequest): Promise<VerificationResult> => {
    try {
      const transaction = await provider.getTransaction(request.transactionHash);
      if (!transaction) return { status: "not_found", retryable: true };
      return evaluateTransfer(decode(transaction, request));
    } catch { return { status: "unavailable", retryable: true }; }
  };
}
export const createEvmNativeVerifier = createVerifier;
export const createErc20Verifier = createVerifier;
export const createBitcoinVerifier = createVerifier;
export const createSolanaVerifier = createVerifier;
export const createTronVerifier = createVerifier;