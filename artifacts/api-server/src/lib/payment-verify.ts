/**
 * Shared blockchain/payment verification utilities.
 * Used by the payments route and the pool-payment auto-verifier.
 */

export const ETH_USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
export const ETH_USDC_CONTRACT = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
export const BSC_USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const USDT_DECIMALS = 6;
export const USDC_DECIMALS = 6;
export const BSC_USDT_DECIMALS = 18;

/**
 * Stablecoins a customer may choose between on the Ethereum ERC-20 rail. Both
 * tokens are sent to the SAME wallet address; only the contract differs.
 */
export const ERC20_STABLE_CURRENCIES = ["USDT", "USDC"] as const;

/**
 * True when the resolved payment rail is the Ethereum ERC-20 USDT rail with a
 * valid EVM wallet — the only rail on which we offer a USDT/USDC choice.
 * USDC is intentionally NOT offered for BSC/BEP-20, TRON/TRC-20, BTC or native ETH.
 */
export function isEthErc20StableRail(
  currency: string | null | undefined,
  network: string | null | undefined,
  wallet: string | null | undefined,
): boolean {
  const cur = (currency ?? "").toUpperCase().trim();
  const net = (network ?? "").toLowerCase().trim();
  return cur === "USDT" && /erc.?20|ethereum/.test(net) && !!wallet && isValidEthAddress(wallet);
}

/**
 * Resolve the currency to actually verify/charge in, honouring a customer's
 * chosen stablecoin but ONLY when it is a valid option on the ERC-20 rail.
 * Any other value (or a non-ERC-20 rail) falls back to the server's base currency.
 * This is the single source of truth — never trust the client's currency directly.
 */
export function effectiveStableCurrency(
  baseCurrency: string,
  network: string,
  wallet: string | null | undefined,
  chosen: string | null | undefined,
): string {
  const c = (chosen ?? "").toUpperCase().trim();
  if (
    c &&
    isEthErc20StableRail(baseCurrency, network, wallet) &&
    (ERC20_STABLE_CURRENCIES as readonly string[]).includes(c)
  ) {
    return c;
  }
  return baseCurrency;
}

export const ETH_RPC_ENDPOINTS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
  "https://eth-mainnet.public.blastapi.io",
  "https://mainnet.gateway.tenderly.co",
  "https://1rpc.io/eth",
  "https://rpc.mevblocker.io",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
];

export const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-rpc.publicnode.com",
  "https://1rpc.io/bnb",
  "https://bsc-mainnet.public.blastapi.io",
];

export type ObservedTransfer = { recipientAddress: string; amount: number };

export type VerifyResult =
  | {
      verified: true;
      amountUsdt: number;
      blockConfirmations: number;
      /** Recipient observed from the confirmed on-chain transfer. */
      recipientAddress?: string;
      observedTransfers?: ObservedTransfer[];
    }
  | {
      verified: false;
      reason: string;
      pending?: boolean;
      manual?: boolean;
      /**
       * Evidence is returned whenever the chain transaction was readable, even
       * when it could not be accepted for the order. This keeps verification
       * behaviour unchanged while allowing the read-only admin audit to show
       * where the funds actually went.
       */
      recipientAddress?: string;
      amountUsdt?: number;
      blockConfirmations?: number;
      observedTransfers?: ObservedTransfer[];
    };

// New chain contracts
export const ARB_USDT_CONTRACT  = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";
export const ARB_USDC_CONTRACT  = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
export const POLY_USDT_CONTRACT = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
export const POLY_USDC_CONTRACT = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";
export const SOL_USDC_MINT      = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_USDT_MINT      = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export const ARB_RPC_ENDPOINTS = [
  "https://arb1.arbitrum.io/rpc",
  "https://arbitrum.llamarpc.com",
  "https://rpc.ankr.com/arbitrum",
  "https://arbitrum.blockpi.network/v1/rpc/public",
  "https://1rpc.io/arb",
];

export const POLYGON_RPC_ENDPOINTS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
  "https://rpc.ankr.com/polygon",
  "https://polygon.blockpi.network/v1/rpc/public",
  "https://1rpc.io/matic",
];

export const SOL_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana",
];

export function isValidTxHash(hash: string): boolean {
  return (
    /^0x[0-9a-fA-F]{64}$/.test(hash) ||
    /^[0-9a-fA-F]{64}$/.test(hash) ||
    /^[1-9A-HJ-NP-Za-km-z]{86,88}$/.test(hash)
  );
}

export function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function isValidBtcAddress(addr: string): boolean {
  return /^[13][1-9A-HJ-NP-Za-km-z]{24,33}$/.test(addr) || /^bc1[a-z0-9]{6,87}$/.test(addr);
}

export function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
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
        signal: AbortSignal.timeout(7000),
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
  const observedTransfers: ObservedTransfer[] = [];
  for (const log of receipt.logs as any[]) {
    if (log.address?.toLowerCase() !== contractAddress) continue;
    if (!Array.isArray(log.topics) || log.topics[0] !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;

    const recipient = "0x" + log.topics[2].slice(26).toLowerCase();
    let rawAmount: bigint;
    try { rawAmount = BigInt(log.data); } catch { continue; }
    const amount = Number(rawAmount) / Math.pow(10, tokenDecimals);
    observedTransfers.push({ recipientAddress: recipient, amount });
    if (recipient !== wallet) continue;

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
      return { verified: true, amountUsdt: amount, blockConfirmations, recipientAddress: recipient, observedTransfers };
    }
  }
  return {
    verified: false,
    reason: "No token transfer to the wallet matching the expected amount was found in this transaction.",
    ...(observedTransfers[0] ? { recipientAddress: observedTransfers[0].recipientAddress, amountUsdt: observedTransfers[0].amount } : {}),
    observedTransfers,
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
  const valueWei = BigInt(tx.value ?? "0x0");
  const amountEth = Number(valueWei) / 1e18;
  if (toAddr !== walletAddress.toLowerCase()) {
    return {
      verified: false,
      reason: "Transaction recipient does not match the payment wallet address.",
      recipientAddress: toAddr || undefined,
      amountUsdt: amountEth,
      observedTransfers: toAddr ? [{ recipientAddress: toAddr, amount: amountEth }] : [],
    };
  }

  const tolerance = expectedAmount * tolerancePct;
  // Accept: within underpay tolerance AND no more than 2% over
  if (amountEth < expectedAmount - Math.max(tolerance, 1e-9)) {
    return { verified: false, reason: `ETH amount received (${amountEth.toFixed(6)}) is less than expected (${expectedAmount.toFixed(6)}).`, recipientAddress: toAddr, amountUsdt: amountEth, observedTransfers: [{ recipientAddress: toAddr, amount: amountEth }] };
  }
  if (amountEth > expectedAmount * 1.02) {
    return { verified: false, reason: `ETH amount received (${amountEth.toFixed(6)}) is more than 2% over the expected amount (${expectedAmount.toFixed(6)}). Please contact support.`, recipientAddress: toAddr, amountUsdt: amountEth, observedTransfers: [{ recipientAddress: toAddr, amount: amountEth }] };
  }

  let blockConfirmations = 1;
  try {
    const currentBlockHex = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_blockNumber", []) as string;
    const txBlockHex = receipt.blockNumber as string;
    const current = parseInt(currentBlockHex, 16);
    const txBlock = parseInt(txBlockHex, 16);
    blockConfirmations = Math.max(1, current - txBlock + 1);
  } catch { }

  return { verified: true, amountUsdt: amountEth, blockConfirmations, recipientAddress: toAddr, observedTransfers: [{ recipientAddress: toAddr, amount: amountEth }] };
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

  const observedTransfers: ObservedTransfer[] = (data.vout ?? [])
    .map((out: any) => ({ recipientAddress: out.scriptpubkey_address, amount: (out.value ?? 0) / 1e8 }))
    .filter((transfer: ObservedTransfer) => Boolean(transfer.recipientAddress) && transfer.amount > 0);
  let observedOutput: { recipientAddress: string; amountUsdt: number } | undefined;
  for (const out of data.vout ?? []) {
    const btcAmount = (out.value ?? 0) / 1e8;
    if (out.scriptpubkey_address && btcAmount > 0) {
      observedOutput ??= { recipientAddress: out.scriptpubkey_address, amountUsdt: btcAmount };
    }
    if (out.scriptpubkey_address !== walletAddress) continue;
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
      return { verified: true, amountUsdt: btcAmount, blockConfirmations, recipientAddress: out.scriptpubkey_address, observedTransfers };
    }
  }
  return {
    verified: false,
    reason: `No BTC output to the expected wallet found — amount sent may be less than the required amount (${expectedAmount.toFixed(8)} BTC).`,
    ...observedOutput,
    observedTransfers,
  };
}

async function verifySolanaTokenTransfer(
  signature: string,
  walletAddress: string,
  expectedAmount: number,
  mintAddress: string,
  tokenSymbol: string,
  tolerancePct = 0.01,
): Promise<VerifyResult> {
  let txData: any = null;
  for (const endpoint of SOL_RPC_ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const json: any = await r.json();
      if (json.error || !json.result) continue;
      txData = json.result;
      break;
    } catch { /* try next */ }
  }
  if (!txData) {
    return { verified: false, pending: true, reason: "Solana transaction not found — it may still be propagating. Please wait and try again." };
  }
  if (txData.meta?.err !== null && txData.meta?.err !== undefined) {
    return { verified: false, reason: "Solana transaction failed on-chain." };
  }
  const pre: any[] = txData.meta?.preTokenBalances ?? [];
  const post: any[] = txData.meta?.postTokenBalances ?? [];
  const observedTransfers: ObservedTransfer[] = [];
  let observedTransfer: { recipientAddress: string; amountUsdt: number } | undefined;
  for (const postBal of post) {
    if (postBal.mint !== mintAddress) continue;
    const preBal = pre.find((p: any) => p.accountIndex === postBal.accountIndex && p.mint === mintAddress);
    const preAmt = preBal ? parseFloat(preBal.uiTokenAmount?.uiAmount ?? "0") : 0;
    const postAmt = parseFloat(postBal.uiTokenAmount?.uiAmount ?? "0");
    const received = postAmt - preAmt;
    if (received <= 0) continue;
    observedTransfers.push({ recipientAddress: postBal.owner ?? "", amount: received });
    observedTransfer ??= { recipientAddress: postBal.owner ?? "", amountUsdt: received };
    if (postBal.owner !== walletAddress) continue;
    const minAccepted = expectedAmount - Math.max(expectedAmount * tolerancePct, 0.02);
    if (received >= minAccepted) {
      return { verified: true, amountUsdt: received, blockConfirmations: 1, recipientAddress: postBal.owner, observedTransfers };
    }
    const shortfall = parseFloat((expectedAmount - received).toFixed(2));
      return { verified: false, reason: `Underpayment: ${received.toFixed(2)} ${tokenSymbol} received, ${expectedAmount.toFixed(2)} expected. Short by ${shortfall.toFixed(2)} ${tokenSymbol}.`, recipientAddress: postBal.owner, amountUsdt: received, observedTransfers };
  }
  return { verified: false, reason: `No ${tokenSymbol} transfer to the expected wallet found in this Solana transaction.`, ...observedTransfer, observedTransfers };
}

async function verifyTronUsdtTransfer(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  tolerancePct = 0.01,
): Promise<VerifyResult> {
  let data: any;
  try {
    const r = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(14000),
    });
    if (!r.ok) return { verified: false, reason: "Could not reach Tron network — please try again." };
    data = await r.json();
  } catch {
    return { verified: false, reason: "Could not reach Tron network — please try again." };
  }
  if (!data || !data.confirmed) {
    return { verified: false, pending: true, reason: "Tron transaction not yet confirmed. Please wait for on-chain confirmation." };
  }
  const transfers: any[] = data.trc20TransferInfo ?? [];
  const observedTransfers: ObservedTransfer[] = [];
  let observedTransfer: { recipientAddress: string; amountUsdt: number } | undefined;
  for (const t of transfers) {
    const contract = (t.contract_address ?? t.contractAddress ?? "").toLowerCase();
    if (contract !== TRON_USDT_CONTRACT.toLowerCase()) continue;
    const to = (t.to_address ?? t.to ?? "");
    const decimals = parseInt(t.decimals ?? "6", 10);
    const amount = parseInt(t.amount ?? "0", 10) / Math.pow(10, decimals);
    if (amount <= 0) continue;
    observedTransfers.push({ recipientAddress: to, amount });
    observedTransfer ??= { recipientAddress: to, amountUsdt: amount };
    if (to !== walletAddress) continue;
    const minAccepted = expectedAmount - Math.max(expectedAmount * tolerancePct, 0.02);
    if (amount >= minAccepted && amount > 0) {
      return { verified: true, amountUsdt: amount, blockConfirmations: 1, recipientAddress: to, observedTransfers };
    }
    if (amount > 0) {
      const shortfall = parseFloat((expectedAmount - amount).toFixed(2));
      return { verified: false, reason: `Underpayment: ${amount.toFixed(2)} USDT received, ${expectedAmount.toFixed(2)} expected. Short by ${shortfall.toFixed(2)} USDT.`, recipientAddress: to, amountUsdt: amount, observedTransfers };
    }
  }
  return { verified: false, reason: "No USDT TRC-20 transfer to the expected wallet found in this Tron transaction.", ...observedTransfer, observedTransfers };
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

  if (cur === "USDT" && /arbitrum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ARB_RPC_ENDPOINTS, ARB_USDT_CONTRACT, USDT_DECIMALS, "Arbitrum", tolerancePct);
  }
  if (cur === "USDC" && /arbitrum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ARB_RPC_ENDPOINTS, ARB_USDC_CONTRACT, USDC_DECIMALS, "Arbitrum", tolerancePct);
  }
  if (cur === "USDT" && /polygon/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, POLYGON_RPC_ENDPOINTS, POLY_USDT_CONTRACT, USDT_DECIMALS, "Polygon", tolerancePct);
  }
  if (cur === "USDC" && /polygon/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, POLYGON_RPC_ENDPOINTS, POLY_USDC_CONTRACT, USDC_DECIMALS, "Polygon", tolerancePct);
  }
  if (cur === "USDC" && /solana/.test(net)) {
    return verifySolanaTokenTransfer(txHash, walletAddress, expectedAmount, SOL_USDC_MINT, "USDC", tolerancePct);
  }
  if (cur === "USDT" && /solana/.test(net)) {
    return verifySolanaTokenTransfer(txHash, walletAddress, expectedAmount, SOL_USDT_MINT, "USDT", tolerancePct);
  }
  if (cur === "USDT" && /tron|trc/.test(net)) {
    return verifyTronUsdtTransfer(txHash, walletAddress, expectedAmount, tolerancePct);
  }
  if (cur === "USDT" && /erc.?20|ethereum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ETH_RPC_ENDPOINTS, ETH_USDT_CONTRACT, USDT_DECIMALS, "Ethereum", tolerancePct);
  }
  if (cur === "USDC" && /erc.?20|ethereum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ETH_RPC_ENDPOINTS, ETH_USDC_CONTRACT, USDC_DECIMALS, "Ethereum", tolerancePct);
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
