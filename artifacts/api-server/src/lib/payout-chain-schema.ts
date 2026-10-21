import { z } from "zod";
export const chainIntentSchema = z.object({
  id: z.string().uuid(), requestHash: z.string(), accountId: z.string(), username: z.string(),
  state: z.enum(["prepared", "signing", "broadcast", "confirmed", "failed", "cancelled"]),
  destination: z.string(), network: z.string(), token: z.enum(["USDT", "USDC"]), sender: z.string(),
  amountMinor: z.number().int().positive(), currency: z.string(), usdMinor: z.number().int().positive(),
  tokenUnits: z.string().regex(/^\d+$/), rate: z.number().positive(),
  allocations: z.array(z.object({ orderId: z.string(), code: z.string(), member: z.string(), adminFeeMinor: z.number().int().nonnegative(), postageMinor: z.number().int().nonnegative() })),
  createdAt: z.string(), createdBy: z.string(), verifiedAt: z.string().nullable().default(null),
  txid: z.string().nullable().default(null), error: z.string().nullable().default(null),
  previousTxids: z.array(z.string()).max(5).default([]),
  // Admin-only signing/broadcast metadata. Never expose these fields in reshipper responses.
  transaction: z.record(z.string(), z.unknown()).default({}),
  signedRaw: z.string().nullable().default(null),
});
export type ChainIntent = z.infer<typeof chainIntentSchema>;
export const isChainPending = (p: Pick<ChainIntent, "state">) => ["prepared", "signing", "broadcast"].includes(p.state);
