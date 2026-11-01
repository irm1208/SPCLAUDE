import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

export class TmdError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function fail(status: number, message: string): never { throw new TmdError(status, message); }
export const FEATURES = Object.freeze({ coreOnly: true, payments: false, uploads: false, results: false, telegram: false, emailVerification: false });
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function equalSecret(a: unknown, b: string): boolean {
  return typeof a === "string" && a.length <= 256 && Buffer.byteLength(a) === Buffer.byteLength(b)
    && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function checkPassword(password: unknown): string {
  if (typeof password !== "string" || password.length < 10 || Buffer.byteLength(password) > 72)
    fail(400, "Password must be at least 10 characters and no more than 72 UTF-8 bytes.");
  return password;
}
export const passwordSchema = z.string().superRefine((value, ctx) => {
  try { checkPassword(value); } catch { ctx.addIssue({ code: "custom", message: "Password must be at least 10 characters and no more than 72 UTF-8 bytes." }); }
});
const money = z.coerce.number().finite().min(0).max(1_000_000)
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use at most two decimal places.");
const optionalText = (max: number) => z.string().trim().max(max).nullish();
const poolSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: optionalText(6000),
  labName: optionalText(120),
  visibility: z.enum(["public", "unlisted", "invite"]).default("public"),
  accessCode: z.string().min(4).max(100).optional(),
  splitMode: z.enum(["even", "fixed"]).default("even"),
  fixedShareUsd: money.nullable().optional(),
  shippingUsd: money.default(0),
  organiserTipUsd: money.default(0),
  minMembers: z.number().int().min(1).max(10000).default(1),
  maxMembers: z.number().int().min(1).max(10000).nullish(),
  deadlineAt: z.string().datetime({ offset: true }).nullish(),
  items: z.array(z.object({
    testType: z.string().trim().min(2).max(160),
    lab: optionalText(120),
    priceUsd: money.refine(value => value > 0, "Test price must be above zero."),
    quantity: z.number().int().min(1).max(1000),
    batchId: z.null().optional(),
    labOrderUrl: z.string().url().max(1000).refine(value => new URL(value).protocol === "https:", "Use an HTTPS link.").nullish(),
  }).strict()).min(1).max(50),
}).strict().superRefine((data, ctx) => {
  if (data.splitMode === "fixed" && !(Number(data.fixedShareUsd) > 0))
    ctx.addIssue({ code: "custom", message: "Fixed shares must be above zero." });
  if (data.maxMembers != null && data.maxMembers < data.minMembers)
    ctx.addIssue({ code: "custom", message: "Maximum members cannot be below expected members." });
  if (poolCosts(data).target > 10_000_000)
    ctx.addIssue({ code: "custom", message: "The pool target cannot exceed $10,000,000." });
});
export type PoolInput = z.infer<typeof poolSchema>;
export const parsePoolInput = (input: unknown) => poolSchema.parse(input);
export function poolCosts(data: Pick<PoolInput, "items" | "shippingUsd" | "organiserTipUsd" | "splitMode" | "fixedShareUsd" | "minMembers">) {
  const cents = (n: number) => Math.round(n * 100);
  const tests = data.items.reduce((sum, item) => sum + cents(item.priceUsd) * item.quantity, 0);
  const shipping = cents(data.shippingUsd), tip = cents(data.organiserTipUsd);
  const target = tests + shipping + tip;
  return { tests: tests / 100, shipping: shipping / 100, tip: tip / 100, subtotal: target / 100, feePct: 0, fee: 0, target: target / 100,
    share: data.splitMode === "fixed" ? cents(Number(data.fixedShareUsd)) / 100 : Math.ceil(target / data.minMembers) / 100 };
}
export function publicUser(row: Record<string, any>) {
  return { id: row.id, handle: row.handle, displayName: row.display_name, bio: row.bio ?? null, avatarKey: null, createdAt: new Date(row.created_at).toISOString() };
}
export function ownUser(row: Record<string, any>) {
  return { ...publicUser(row), email: row.email, role: "member", emailVerified: false, telegramLinked: false, telegramUsername: null, notificationPrefs: {}, payoutMethods: {} };
}
