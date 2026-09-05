import {
  createBitcoinAdapter, createErc20Adapter, createEvmNativeAdapter, createSolanaSplAdapter,
  createTronTrc20Adapter, type AuthoritativeRequest, type BitcoinProvider, type EvmProvider,
  type SolanaProvider, type TronProvider, type VerificationResult,
} from "@open-crypto-checkout/verifiers";

export type RailProviderSet = {
  evm: Partial<Record<"ethereum" | "bsc" | "arbitrum" | "polygon", EvmProvider>>;
  bitcoin: BitcoinProvider;
  solana: SolanaProvider;
  tron: TronProvider;
};

export const composeRailVerifier = (providers: RailProviderSet) => async (request: AuthoritativeRequest): Promise<VerificationResult> => {
  const network = request.railId?.split("-")[0] as keyof RailProviderSet["evm"] | undefined;
  const adapter = request.family === "evm_native" && network && providers.evm[network] ? createEvmNativeAdapter(providers.evm[network]!)
    : request.family === "evm_erc20" && network && providers.evm[network] ? createErc20Adapter(providers.evm[network]!)
    : request.family === "bitcoin" && providers.bitcoin ? createBitcoinAdapter(providers.bitcoin)
    : request.family === "solana_spl" && providers.solana ? createSolanaSplAdapter(providers.solana)
    : request.family === "tron_trc20" && providers.tron ? createTronTrc20Adapter(providers.tron)
    : null;
  return adapter ? adapter(request) : { status: "unavailable", retryable: true };
};

type JsonRpc = { result?: any; error?: unknown };
const jsonRpc = async (url: string, method: string, params: unknown[] = []) => {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json() as JsonRpc;
  if (body.error) throw new Error("RPC error");
  return body.result;
};
const hexBigInt = (value?: string | null) => value ? BigInt(value) : undefined;

const evmProvider = (url: string): EvmProvider => ({
  getChainId: async () => BigInt(await jsonRpc(url, "eth_chainId")),
  getTransaction: async (hash) => {
    const tx = await jsonRpc(url, "eth_getTransactionByHash", [hash]);
    return tx ? { to: tx.to, value: hexBigInt(tx.value), blockNumber: hexBigInt(tx.blockNumber) } : null;
  },
  getTransactionReceipt: async (hash) => {
    const receipt = await jsonRpc(url, "eth_getTransactionReceipt", [hash]);
    if (!receipt) throw new Error("receipt unavailable");
    return { status: receipt.status === "0x1" ? "success" : "failed", blockNumber: hexBigInt(receipt.blockNumber), logs: receipt.logs };
  },
  getBlock: async ({ blockNumber }) => {
    const block = await jsonRpc(url, "eth_getBlockByNumber", [`0x${blockNumber.toString(16)}`, false]);
    return block ? { timestamp: BigInt(block.timestamp) } : null;
  },
  getBlockNumber: async () => BigInt(await jsonRpc(url, "eth_blockNumber")),
});

export type ProviderUrls = {
  ETHEREUM_RPC_URL: string; BSC_RPC_URL: string; ARBITRUM_RPC_URL: string; POLYGON_RPC_URL: string;
  SOLANA_RPC_URL: string; TRON_RPC_URL: string; BITCOIN_RPC_URL: string;
};
export const createProviderSet = (urls: ProviderUrls): RailProviderSet => ({
  evm: {
    ethereum: evmProvider(urls.ETHEREUM_RPC_URL), bsc: evmProvider(urls.BSC_RPC_URL),
    arbitrum: evmProvider(urls.ARBITRUM_RPC_URL), polygon: evmProvider(urls.POLYGON_RPC_URL),
  },
  bitcoin: {
    getNetwork: async () => "mainnet",
    getTransaction: async (hash) => {
      const response = await fetch(`${urls.BITCOIN_RPC_URL.replace(/\/$/, "")}/tx/${encodeURIComponent(hash)}`, { signal: AbortSignal.timeout(10_000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Bitcoin RPC HTTP ${response.status}`);
      return response.json() as ReturnType<BitcoinProvider["getTransaction"]>;
    },
    getTipHeight: async () => {
      const response = await fetch(`${urls.BITCOIN_RPC_URL.replace(/\/$/, "")}/blocks/tip/height`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Bitcoin RPC HTTP ${response.status}`);
      return Number(await response.text());
    },
  },
  solana: {
    getCluster: async () => "mainnet-beta",
    getCurrentSlot: async () => Number(await jsonRpc(urls.SOLANA_RPC_URL, "getSlot", [{ commitment: "finalized" }])),
    getParsedTransaction: async (hash) => jsonRpc(urls.SOLANA_RPC_URL, "getTransaction", [hash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]),
  },
  tron: {
    getNetwork: async () => "mainnet",
    getTransactionInfo: async (hash) => {
      const response = await fetch(`${urls.TRON_RPC_URL.replace(/\/$/, "")}/wallet/gettransactioninfobyid`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: hash }), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Tron RPC HTTP ${response.status}`);
      const value = await response.json() as Record<string, unknown>;
      return Object.keys(value).length ? value as Awaited<ReturnType<TronProvider["getTransactionInfo"]>> : null;
    },
    getEvents: async (hash) => {
      const response = await fetch(`${urls.TRON_RPC_URL.replace(/\/$/, "")}/v1/transactions/${encodeURIComponent(hash)}/events`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Tron RPC HTTP ${response.status}`);
      return response.json() as ReturnType<TronProvider["getEvents"]>;
    },
    getNowBlock: async () => {
      const response = await fetch(`${urls.TRON_RPC_URL.replace(/\/$/, "")}/wallet/getnowblock`, { method: "POST", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Tron RPC HTTP ${response.status}`);
      return response.json() as ReturnType<TronProvider["getNowBlock"]>;
    },
  },
});