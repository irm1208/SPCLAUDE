import { ARB_RPC_ENDPOINTS, BSC_RPC_ENDPOINTS, ETH_RPC_ENDPOINTS, POLYGON_RPC_ENDPOINTS, SOL_RPC_ENDPOINTS } from "./payment-verify";

/** Old, unrelated transfers must never auto-settle a newly issued delivery charge. */
export async function onwardTransactionTime(txHash: string, network: string): Promise<number | null> {
  try {
    if (network === "Bitcoin") {
      const r = await fetch(`https://blockstream.info/api/tx/${encodeURIComponent(txHash)}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return null;
      const body = await r.json() as { status?: { confirmed?: boolean; block_time?: number } };
      return body.status?.confirmed && body.status.block_time ? body.status.block_time * 1000 : null;
    }
    if (network === "TRON") {
      const r = await fetch("https://api.trongrid.io/wallet/gettransactioninfobyid", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: txHash }), signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return null;
      const body = await r.json() as { blockTimeStamp?: number };
      return body.blockTimeStamp ?? null;
    }
    const endpoints = network === "Solana" ? SOL_RPC_ENDPOINTS : network === "Arbitrum" ? ARB_RPC_ENDPOINTS
      : network === "Polygon" ? POLYGON_RPC_ENDPOINTS : network === "BSC" ? BSC_RPC_ENDPOINTS : ETH_RPC_ENDPOINTS;
    for (const endpoint of endpoints.slice(0, 2)) {
      try {
        const rpc = async (method: string, params: unknown[]) => {
          const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(6000) });
          if (!r.ok) return null;
          return (await r.json() as { result?: any }).result ?? null;
        };
        if (network === "Solana") {
          const tx = await rpc("getTransaction", [txHash, { commitment: "finalized", maxSupportedTransactionVersion: 0 }]);
          if (typeof tx?.blockTime === "number") return tx.blockTime * 1000;
        } else {
          const tx = await rpc("eth_getTransactionReceipt", [txHash]);
          if (!tx?.blockNumber) continue;
          const block = await rpc("eth_getBlockByNumber", [tx.blockNumber, false]);
          const seconds = parseInt(block?.timestamp ?? "", 16);
          if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
        }
      } catch { /* Try the independent endpoint, never infer a transaction date. */ }
    }
  } catch { /* Provider unavailable: retain pending for retry or manual review. */ }
  return null;
}
