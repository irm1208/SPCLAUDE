/**
 * Shared blockchain/payment verification utilities.
 * Used by the payments route and the pool-payment auto-verifier.
 */

export const ETH_USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
export const BSC_USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const USDT_DECIMALS = 6;
export const BSC_USDT_DECIMALS = 18;

export const ETH_RPC_ENDPOINTS = [
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://ethereum.blockpi.network/v1/rpc/public",
  "https://eth.drpc.org",
  "https://mainnet.gateway.tenderly.co",
  "https://rpc.mevblocker.io",
];

export const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-rpc.publicnode.com",
  "https://1rpc.io/bnb",
  "https://bsc-mainnet.public.blastapi.io",
];

export type VerifyResult =
  | { verified: true; amountUsdt: number; blockConfirmations: number }
  | { verified: false; reason: string; pending?: boolean; manual?: boolean };

export function isValidTxHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash) || /^[0-9a-fA-F]{64}$/.test(hash);
}

export function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function isValidBtcAddress(addr: string): boolean {
  return /^[13][1-9A-HJ-NP-Za-km-z]{24,33}$/.test(addr) || /^bc1[a-z0-9]{6,87}$/.test(addr);
}

/**
 * Call a JSON-RPC method across a list of endpoints, trying each in turn.
 * @param retryOnNull - when true, a null result is treated the same as an error
 *   and the next endpoint is tried. Use this for eth_getTransactionReceipt so
 *   a node that can't serve the receipt doesn't prematurely end the loop.
 * @param retryIf - optional validator: when it returns true for a result, that
 *   result is treated as unusable and the next endpoint is tried. Use to skip
 *   receipts with empty logs (some public nodes return partial receipts).
 */
export async function evmJsonRpc(endpoints: string[], method: string, params: unknown[], retryOnNull = false, retryIf?: (result: unknown) => boolean): Promise<unknown> {
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(12000),
      });
      const json: any = await res.json();
      if (json.error) throw new Error(json.error.message ?? "RPC error");
      if (retryOnNull && json.result === null) {
        lastErr = new Error("null result from RPC");
        continue;
      }
      if (retryIf && retryIf(json.result)) {
        lastErr = new Error("RPC result failed validation, trying next endpoint");
        continue;
      }
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function verifyErc20Transfer(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  rpcEndpoints: string[],
  contractAddress: string,
  tokenDecimals: number,
  networkLabel: string,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  // Normalise hash — Revolut/Coinbase often omit the 0x prefix
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  let receipt: any;
  try {
    // retryOnNull: skip nodes that haven't propagated the tx yet (null receipt)
    // retryIf: skip nodes that return a receipt with empty logs — some public RPC nodes
    //   return a partial receipt (no logs) when under load, which would falsely fail
    //   the token transfer check even though the transaction is fully confirmed.
    receipt = await evmJsonRpc(
      rpcEndpoints,
      "eth_getTransactionReceipt",
      [hash],
      true,
      (r: any) => r !== null && r.status === "0x1" && Array.isArray(r.logs) && r.logs.length === 0,
    );
  } catch {
    // All endpoints either errored, returned null, or returned empty-logs receipts.
    // Treat as pending so the customer can try again rather than seeing a misleading error.
    return { verified: false, pending: true, reason: `Transaction not yet readable on ${networkLabel} — please wait a minute and try again.` };
  }
  if (!receipt) {
    return { verified: false, pending: true, reason: "Transaction not found on-chain — check the hash is correct, or wait a minute and try again." };
  }
  if (receipt.status !== "0x1") {
    return { verified: false, reason: "Transaction failed on-chain." };
  }

  const wallet = walletAddress.toLowerCase();
  for (const log of receipt.logs as any[]) {
    if (log.address?.toLowerCase() !== contractAddress) continue;
    if (!Array.isArray(log.topics) || log.topics[0] !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;

    const recipient = "0x" + log.topics[2].slice(26).toLowerCase();
    if (recipient !== wallet) continue;

    let rawAmount: bigint;
    try { rawAmount = BigInt(log.data); } catch { continue; }
    const amount = Number(rawAmount) / Math.pow(10, tokenDecimals);
    const tolerance = expectedAmount * tolerancePct;
    // Accept: within underpay tolerance AND no more than 2% over
    if (amount >= expectedAmount - Math.max(tolerance, 0.02) && amount <= expectedAmount * 1.02) {
      let blockConfirmations = 1;
      try {
        const currentBlockHex = await evmJsonRpc(rpcEndpoints, "eth_blockNumber", []) as string;
        const txBlockHex = receipt.blockNumber as string;
        const current = parseInt(currentBlockHex, 16);
        const txBlock = parseInt(txBlockHex, 16);
        blockConfirmations = Math.max(1, current - txBlock + 1);
      } catch { }
      return { verified: true, amountUsdt: amount, blockConfirmations };
    }
  }
  return {
    verified: false,
    reason: "No token transfer to the wallet matching the expected amount was found in this transaction.",
  };
}

export async function verifyNativeEthTransfer(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  let receipt: any;
  try {
    receipt = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_getTransactionReceipt", [hash], true);
  } catch {
    return { verified: false, pending: true, reason: "Transaction not found on Ethereum — it may still be propagating. Please wait a minute and try again." };
  }
  if (!receipt) return { verified: false, pending: true, reason: "Transaction not found on-chain — check the hash is correct, or wait a minute and try again." };
  if (receipt.status !== "0x1") return { verified: false, reason: "Transaction failed on-chain." };

  let tx: any;
  try {
    tx = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_getTransactionByHash", [hash]);
  } catch {
    return { verified: false, reason: "Could not fetch transaction details from Ethereum." };
  }
  if (!tx) return { verified: false, reason: "Transaction not found on Ethereum." };

  const toAddr = (tx.to ?? "").toLowerCase();
  if (toAddr !== walletAddress.toLowerCase()) {
    return { verified: false, reason: "Transaction recipient does not match the payment wallet address." };
  }

  const valueWei = BigInt(tx.value ?? "0x0");
  const amountEth = Number(valueWei) / 1e18;
  const tolerance = expectedAmount * tolerancePct;
  // Accept: within underpay tolerance AND no more than 2% over
  if (amountEth < expectedAmount - Math.max(tolerance, 1e-9)) {
    return { verified: false, reason: `ETH amount received (${amountEth.toFixed(6)}) is less than expected (${expectedAmount.toFixed(6)}).` };
  }
  if (amountEth > expectedAmount * 1.02) {
    return { verified: false, reason: `ETH amount received (${amountEth.toFixed(6)}) is more than 2% over the expected amount (${expectedAmount.toFixed(6)}). Please contact support.` };
  }

  let blockConfirmations = 1;
  try {
    const currentBlockHex = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_blockNumber", []) as string;
    const txBlockHex = receipt.blockNumber as string;
    const current = parseInt(currentBlockHex, 16);
    const txBlock = parseInt(txBlockHex, 16);
    blockConfirmations = Math.max(1, current - txBlock + 1);
  } catch { }

  return { verified: true, amountUsdt: amountEth, blockConfirmations };
}

export async function verifyBtcPayment(
  txid: string,
  walletAddress: string,
  expectedAmount: number,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  let data: any;
  try {
    const r = await fetch(`https://blockstream.info/api/tx/${txid}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) {
      return { verified: false, pending: true, reason: "Bitcoin transaction not found — it may not have been broadcast yet." };
    }
    if (!r.ok) {
      return { verified: false, reason: "Could not reach Bitcoin network — please try again shortly." };
    }
    data = await r.json();
  } catch {
    return { verified: false, reason: "Could not reach Bitcoin network — please try again shortly." };
  }

  if (!data.status?.confirmed) {
    return { verified: false, pending: true, reason: "Bitcoin transaction not yet confirmed — please wait for at least 1 block confirmation." };
  }

  for (const out of data.vout ?? []) {
    if (out.scriptpubkey_address !== walletAddress) continue;
    const btcAmount = (out.value ?? 0) / 1e8;
    const tolerance = expectedAmount * tolerancePct;
    // Accept: within underpay tolerance AND no more than 2% over
    if (btcAmount >= expectedAmount - Math.max(tolerance, 1e-8) && btcAmount <= expectedAmount * 1.02) {
      let blockConfirmations = 1;
      try {
        const tipRes = await fetch("https://blockstream.info/api/blocks/tip/height", { signal: AbortSignal.timeout(5000) });
        const tipHeight = parseInt(await tipRes.text(), 10);
        if (!isNaN(tipHeight) && data.status.block_height) {
          blockConfirmations = Math.max(1, tipHeight - data.status.block_height + 1);
        }
      } catch { }
      return { verified: true, amountUsdt: btcAmount, blockConfirmations };
    }
  }
  return {
    verified: false,
    reason: `No BTC output to the expected wallet found — amount sent may be less than the required amount (${expectedAmount.toFixed(8)} BTC).`,
  };
}

export async function verifyTransaction(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  currency: string,
  network: string,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();

  if (cur === "USDT" && /erc.?20|ethereum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ETH_RPC_ENDPOINTS, ETH_USDT_CONTRACT, USDT_DECIMALS, "Ethereum", tolerancePct);
  }
  if (cur === "USDT" && /bep.?20|bsc|binance/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, BSC_RPC_ENDPOINTS, BSC_USDT_CONTRACT, BSC_USDT_DECIMALS, "BSC", tolerancePct);
  }
  if (cur === "ETH" && /mainnet|ethereum|erc.?20/.test(net)) {
    if (!isValidEthAddress(walletAddress)) {
      return { verified: false, reason: "ETH payment configured but no compatible EVM wallet address is set." };
    }
    return verifyNativeEthTransfer(txHash, walletAddress, expectedAmount, tolerancePct);
  }
  if (cur === "BTC" && /mainnet|bitcoin/.test(net)) {
    if (!isValidBtcAddress(walletAddress)) {
      return { verified: false, reason: "BTC payment configured but no Bitcoin wallet address is set." };
    }
    return verifyBtcPayment(txHash, walletAddress, expectedAmount, tolerancePct);
  }
  return {
    verified: false,
    manual: true,
    reason: `Automated verification is not supported for ${currency} on ${network}.`,
  };
}
