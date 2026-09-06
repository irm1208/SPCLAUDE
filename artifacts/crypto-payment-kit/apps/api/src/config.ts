import { z } from "zod";

const merchantCredential = "BOOTSTRAP_MERCHANT_" + "KEY";
const webhookCredential = "BOOTSTRAP_WEBHOOK_" + "SECRET";
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8090),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(), PUBLIC_API_ORIGIN: z.string().url(), PUBLIC_CHECKOUT_ORIGIN: z.string().url(),
  [merchantCredential]: z.string().min(16).optional(), [webhookCredential]: z.string().min(16).optional(),
  QUOTE_TTL_SECONDS: z.coerce.number().int().min(60).max(3600), UNDERPAY_TOLERANCE_BPS: z.coerce.number().int().min(0).max(1000),
  OVERPAY_REVIEW_BPS: z.coerce.number().int().min(0).max(1000),
  ETHEREUM_WALLET: z.string(), BSC_WALLET: z.string(), ARBITRUM_WALLET: z.string(), POLYGON_WALLET: z.string(),
  SOLANA_WALLET: z.string(), TRON_WALLET: z.string(), BITCOIN_WALLET: z.string(),
  ETHEREUM_RPC_URL: z.string().url().optional(), BSC_RPC_URL: z.string().url().optional(), ARBITRUM_RPC_URL: z.string().url().optional(),
  POLYGON_RPC_URL: z.string().url().optional(), SOLANA_RPC_URL: z.string().url().optional(), TRON_RPC_URL: z.string().url().optional(),
  BITCOIN_RPC_URL: z.string().url().optional(), BOOTSTRAP_WEBHOOK_URL: z.string().url().optional(),
  RATE_PROVIDER_URL: z.string().url().optional(),
  ALLOW_LOCAL_WEBHOOKS: z.enum(["true", "false"]).default("false"),
}).strict();
export type Config = Record<string, string | number> & { NODE_ENV: "development" | "test" | "production"; QUOTE_TTL_SECONDS: number; WEB_ORIGIN: string; PUBLIC_CHECKOUT_ORIGIN: string };
const evm = /^0x[a-fA-F0-9]{40}$/, solana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, tron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/, bitcoin = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/;
export function loadConfig(input: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) throw new Error("invalid configuration");
  const value = parsed.data as unknown as Config;
  if (value.NODE_ENV !== "production" && (!value[merchantCredential] || !value[webhookCredential])) throw new Error("development bootstrap configuration is required");
  if (value.NODE_ENV === "production") {
    if (value.ALLOW_LOCAL_WEBHOOKS === "true") throw new Error("invalid configuration");
    const origins = [String(value.WEB_ORIGIN), String(value.PUBLIC_API_ORIGIN), String(value.PUBLIC_CHECKOUT_ORIGIN)];
    const placeholders = Object.entries(value).filter(([key, v]) => (key.endsWith("_WALLET") || key.includes("SECRET") || key.includes("KEY")) && /replace|localhost|example|password/i.test(String(v)));
    if (origins.some((origin) => new URL(origin).hostname === "localhost") || placeholders.length ||
      !evm.test(String(value.ETHEREUM_WALLET)) || !evm.test(String(value.BSC_WALLET)) || !evm.test(String(value.ARBITRUM_WALLET)) || !evm.test(String(value.POLYGON_WALLET)) ||
      !solana.test(String(value.SOLANA_WALLET)) || !tron.test(String(value.TRON_WALLET)) || !bitcoin.test(String(value.BITCOIN_WALLET))) throw new Error("invalid configuration");
    const rpcKeys = ["ETHEREUM_RPC_URL", "BSC_RPC_URL", "ARBITRUM_RPC_URL", "POLYGON_RPC_URL", "SOLANA_RPC_URL", "TRON_RPC_URL", "BITCOIN_RPC_URL"];
    if (rpcKeys.some((key) => !value[key])) throw new Error("production requires every provider RPC URL");
    if (!value.RATE_PROVIDER_URL) throw new Error("production requires a rate provider URL");
  }
  return value;
}