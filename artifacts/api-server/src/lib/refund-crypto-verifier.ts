import {
  ETH_RPC_ENDPOINTS,
  ETH_USDC_CONTRACT,
  ETH_USDT_CONTRACT,
  TRANSFER_TOPIC,
  evmJsonRpc,
  isValidEthAddress,
} from "./payment-verify";

export const REFUND_MIN_CONFIRMATIONS_DEFAULT = 12;
export const REFUND_CRYPTO_ERROR_CODES = [
  "invalid_txid",
  "wrong_network",
  "wrong_token",
  "wrong_recipient",
  "wrong_amount",
  "failed_transaction",
  "transaction_not_found",
  "insufficient_confirmations",
  "provider_unavailable",
] as const;
export type RefundCryptoErrorCode = typeof REFUND_CRYPTO_ERROR_CODES[number];

export type RefundCryptoVerificationInput = {
  txid: string;
  asset: "USDC" | "USDT" | string;
  network: string;
  destinationWallet: string;
  amountBaseUnits: string | bigint;
  minConfirmations?: number;
  rpcCall?: RefundRpcCall;
  rpcEndpoints?: string[];
};

export type RefundRpcCall = (method: string, params?: unknown[]) => Promise<unknown>;

export type RefundCryptoVerificationResult =
  | {
      verified: true;
      txid: string;
      asset: "USDC" | "USDT";
      confirmationCount: number;
      amountBaseUnits: string;
      destinationWallet: string;
    }
  | {
      verified: false;
      code: RefundCryptoErrorCode;
      message: string;
      pending?: boolean;
    };

export function normalizeEthereumTxid(txid: unknown): string | null {
  if (typeof txid !== "string" || !/^(?:0x)?[0-9a-fA-F]{64}$/i.test(txid)) return null;
  return (/^0x/i.test(txid) ? txid : `0x${txid}`).toLowerCase();
}

type NormalizedInput = {
  txid: string;
  asset: "USDC" | "USDT";
  contract: string;
  destinationWallet: string;
  amountBaseUnits: bigint;
  minConfirmations: number;
};

function failure(code: RefundCryptoErrorCode, message: string, pending = false): RefundCryptoVerificationResult {
  return { verified: false, code, message, ...(pending ? { pending: true } : {}) };
}

function isHexQuantity(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value);
}

function isWord(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isAddressWord(value: unknown): value is string {
  return typeof value === "string" && /^0x0{24}[0-9a-fA-F]{40}$/.test(value);
}

function readMinimumConfirmations(explicit: number | undefined): number | null {
  if (explicit !== undefined) {
    return Number.isInteger(explicit) && explicit > 0 ? explicit : null;
  }
  const configured = process.env.GROUP_BUY_REFUND_MIN_CONFIRMATIONS;
  if (configured === undefined || configured.trim() === "") return REFUND_MIN_CONFIRMATIONS_DEFAULT;
  return /^\d+$/.test(configured) && Number(configured) > 0 && Number.isSafeInteger(Number(configured))
    ? Number(configured)
    : null;
}

function normalizeInput(input: RefundCryptoVerificationInput): NormalizedInput | RefundCryptoVerificationResult {
  if (
    !normalizeEthereumTxid(input?.txid)
  ) {
    return failure("invalid_txid", "The submitted Ethereum transaction ID is invalid.");
  }
  if (input.network !== "Ethereum ERC-20") {
    return failure("wrong_network", "Refund verification requires Ethereum ERC-20.");
  }
  if (input.asset !== "USDC" && input.asset !== "USDT") {
    return failure("wrong_token", "The submitted transaction does not use a supported refund token.");
  }
  if (typeof input.destinationWallet !== "string" || !isValidEthAddress(input.destinationWallet)) {
    return failure("wrong_recipient", "The refund destination wallet is invalid.");
  }
  let amountBaseUnits: bigint;
  try {
    if (typeof input.amountBaseUnits !== "string" && typeof input.amountBaseUnits !== "bigint") throw new Error();
    if (typeof input.amountBaseUnits === "string" && !/^[1-9]\d*$/.test(input.amountBaseUnits)) throw new Error();
    amountBaseUnits = BigInt(input.amountBaseUnits);
    if (amountBaseUnits <= 0n) throw new Error();
  } catch {
    return failure("wrong_amount", "The configured refund amount is invalid.");
  }
  const minConfirmations = readMinimumConfirmations(input.minConfirmations);
  if (minConfirmations === null) {
    return failure("provider_unavailable", "Refund confirmation configuration is invalid.");
  }
  return {
    txid: normalizeEthereumTxid(input.txid)!,
    asset: input.asset,
    contract: (input.asset === "USDC" ? ETH_USDC_CONTRACT : ETH_USDT_CONTRACT).toLowerCase(),
    destinationWallet: input.destinationWallet.toLowerCase(),
    amountBaseUnits,
    minConfirmations,
  };
}

async function rpc(input: RefundCryptoVerificationInput, method: string, params: unknown[]): Promise<unknown> {
  if (input.rpcCall) {
    const response: any = await input.rpcCall(method, params);
    if (response && typeof response === "object" && (
      "jsonrpc" in response || "id" in response || "result" in response || "error" in response
    )) {
      if (
        response.jsonrpc !== "2.0"
        || response.id !== 1
        || (!Object.prototype.hasOwnProperty.call(response, "result")
          && !Object.prototype.hasOwnProperty.call(response, "error"))
        || (response.error == null && !Object.prototype.hasOwnProperty.call(response, "result"))
      ) throw new Error("malformed RPC envelope");
      if (response.error) throw new Error("RPC error");
      return response.result;
    }
    return response;
  }
  return evmJsonRpc(input.rpcEndpoints ?? ETH_RPC_ENDPOINTS, method, params, false);
}

/**
 * Verifies an outgoing ERC-20 refund without converting the amount through a
 * JavaScript number. Every identity and amount check is performed on canonical
 * Ethereum ABI values.
 */
export async function verifyRefundCryptoTransfer(
  input: RefundCryptoVerificationInput,
): Promise<RefundCryptoVerificationResult> {
  const normalized = normalizeInput(input);
  if ("verified" in normalized) return normalized;

  let chainId: unknown;
  try {
    chainId = await rpc(input, "eth_chainId", []);
  } catch {
    return failure("provider_unavailable", "Ethereum provider is unavailable.");
  }
  if (chainId !== "0x1") return failure("wrong_network", "The transaction was not read from Ethereum mainnet.");

  let transaction: any;
  try {
    transaction = await rpc(input, "eth_getTransactionByHash", [normalized.txid]);
  } catch {
    return failure("provider_unavailable", "Ethereum provider is unavailable.");
  }
  if (transaction === null || transaction === undefined) {
    return failure("transaction_not_found", "The transaction is not yet available on Ethereum.", true);
  }
  if (typeof transaction !== "object") {
    return failure("provider_unavailable", "Ethereum returned malformed transaction data.");
  }
  if (typeof transaction.hash !== "string" || normalizeEthereumTxid(transaction.hash) !== normalized.txid) {
    return failure("transaction_not_found", "Ethereum returned a different transaction than requested.");
  }
  if (typeof transaction.to !== "string") {
    return failure("transaction_not_found", "Ethereum returned no token contract target for this transaction.");
  }
  if (transaction.to.toLowerCase() !== normalized.contract) {
    return failure("wrong_token", "The transaction target is not the selected refund token contract.");
  }

  let receipt: any;
  try {
    receipt = await rpc(input, "eth_getTransactionReceipt", [normalized.txid]);
  } catch {
    return failure("provider_unavailable", "Ethereum provider is unavailable.");
  }
  if (receipt === null || receipt === undefined) {
    return failure("transaction_not_found", "The transaction receipt is not yet available on Ethereum.", true);
  }
  if (typeof receipt !== "object" || receipt.status !== "0x1") {
    return failure("failed_transaction", "The Ethereum transaction did not execute successfully.");
  }
  if (typeof receipt.transactionHash !== "string" || normalizeEthereumTxid(receipt.transactionHash) !== normalized.txid) {
    return failure("transaction_not_found", "Ethereum returned a receipt for a different transaction.");
  }
  if (!isHexQuantity(receipt.blockNumber) || !Array.isArray(receipt.logs)) {
    return failure("provider_unavailable", "Ethereum returned malformed receipt data.");
  }

  const matchingTokenLogs: Array<{ recipient: string; amount: bigint }> = [];
  for (const log of receipt.logs) {
    if (!log || typeof log !== "object") return failure("provider_unavailable", "Ethereum returned malformed log data.");
    if (typeof log.address !== "string") return failure("provider_unavailable", "Ethereum returned malformed log data.");
    if (!Array.isArray(log.topics)) {
      return failure("provider_unavailable", "Ethereum returned malformed log data.");
    }
    if (log.topics[0] !== TRANSFER_TOPIC) continue;
    if (log.address.toLowerCase() !== normalized.contract) {
      if (
        log.topics.length !== 3
        || !isAddressWord(log.topics[1])
        || !isAddressWord(log.topics[2])
        || !isWord(log.data)
      ) return failure("provider_unavailable", "Ethereum returned malformed log data.");
      continue;
    }
    if (log.topics.length !== 3) {
      continue;
    }
    if (!isAddressWord(log.topics[1]) || !isAddressWord(log.topics[2]) || !isWord(log.data)) {
      return failure("provider_unavailable", "The token transfer log has malformed ABI data.");
    }
    let amount: bigint;
    try {
      amount = BigInt(log.data);
    } catch {
      return failure("wrong_amount", "The token transfer amount is invalid.");
    }
    matchingTokenLogs.push({
      recipient: `0x${log.topics[2].slice(-40).toLowerCase()}`,
      amount,
    });
  }
  if (matchingTokenLogs.length === 0) {
    const hasOtherTokenTransfer = receipt.logs.some((log: any) =>
      log && typeof log === "object"
      && typeof log.address === "string"
      && log.address.toLowerCase() !== normalized.contract
      && Array.isArray(log.topics)
      && log.topics[0] === TRANSFER_TOPIC,
    );
    return failure(hasOtherTokenTransfer ? "wrong_token" : "wrong_amount", hasOtherTokenTransfer
      ? "No transfer from the selected refund token was found."
      : "No valid transfer from the selected refund token was found.");
  }
  const exactMatches = matchingTokenLogs.filter(log =>
    log.recipient === normalized.destinationWallet && log.amount === normalized.amountBaseUnits);
  const destinationMatches = matchingTokenLogs.filter(log =>
    log.recipient === normalized.destinationWallet);
  if (destinationMatches.length > 1) {
    return failure("wrong_amount", "The transaction contains multiple transfers to the refund destination.");
  }
  if (exactMatches.length > 1) {
    return failure("wrong_amount", "The transaction contains ambiguous matching refund transfers.");
  }
  if (exactMatches.length === 0) {
    if (matchingTokenLogs.some(log => log.recipient === normalized.destinationWallet)) {
      return failure("wrong_amount", "The token amount does not exactly match the locked refund amount.");
    }
    return failure("wrong_recipient", "The token transfer recipient does not match the refund destination.");
  }

  let latestBlock: unknown;
  try {
    latestBlock = await rpc(input, "eth_blockNumber", []);
  } catch {
    return failure("provider_unavailable", "Ethereum provider is unavailable.");
  }
  if (!isHexQuantity(latestBlock)) return failure("provider_unavailable", "Ethereum returned a malformed block number.");
  const latest = Number.parseInt(latestBlock, 16);
  const receiptBlock = Number.parseInt(receipt.blockNumber, 16);
  if (!Number.isSafeInteger(latest) || !Number.isSafeInteger(receiptBlock) || latest < receiptBlock) {
    return failure("provider_unavailable", "Ethereum returned an invalid block range.");
  }
  const confirmationCount = latest - receiptBlock + 1;
  if (confirmationCount < normalized.minConfirmations) {
    return failure("insufficient_confirmations", `The transaction has ${confirmationCount} confirmations; ${normalized.minConfirmations} are required.`);
  }
  return {
    verified: true,
    txid: normalized.txid,
    asset: normalized.asset,
    confirmationCount,
    amountBaseUnits: normalized.amountBaseUnits.toString(),
    destinationWallet: normalized.destinationWallet,
  };
}

export const verifyRefundCrypto = verifyRefundCryptoTransfer;