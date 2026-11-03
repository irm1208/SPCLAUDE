import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { TmdUser, TmdVendor, TmdBatch, TmdPool, TmdPoolMember, TmdPaymentMethods } from "@workspace/db";

/** Error carrying an HTTP status; route wrappers turn it into `{ error }` JSON. */
export class TmdError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = "TmdError"; }
}

type Handler = (req: Request, res: Response) => Promise<void>;
/** Wraps a route so TmdError becomes a JSON error and anything else a safe 500. */
export function handled(handler: Handler, scope = "tmd"): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof TmdError) { res.status(error.status).json({ error: error.message }); return; }
      console.error(`[${scope}]`, error instanceof Error ? error.stack ?? error.message : error);
      if (!res.headersSent) res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
}

/* ---- Input helpers --------------------------------------------------------- */
export const str = (value: unknown, max = 500): string => (typeof value === "string" ? value.trim().slice(0, max) : "");
export const optStr = (value: unknown, max = 500): string | null => { const s = str(value, max); return s ? s : null; };
export const bool = (value: unknown, fallback = false): boolean => (typeof value === "boolean" ? value : fallback);
export function money(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return fallback;
  return Math.round(n * 100) / 100;
}
export function int(value: unknown, fallback: number, min = 0, max = 10_000): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;
export const normaliseEmail = (value: unknown) => str(value, 254).toLowerCase();
export const normaliseHandle = (value: unknown) => str(value, 30).toLowerCase().replace(/^@/, "");
export const validPassword = (value: unknown): value is string => typeof value === "string" && value.length >= 10 && Buffer.byteLength(value, "utf8") <= 72;

export function slugify(input: string, max = 60): string {
  const base = input.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/g, "");
  return base || "item";
}
export const shortId = (bytes = 4) => randomBytes(bytes).toString("hex");
export const token = (bytes = 32) => randomBytes(bytes).toString("hex");

/* ---- Payment method validation --------------------------------------------- */
const NETWORKS = ["ethereum", "erc20", "bsc", "bep20", "arbitrum", "polygon", "solana", "tron", "trc20", "bitcoin", "mainnet"];
export function normalisePaymentMethods(input: unknown): TmdPaymentMethods {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const out: TmdPaymentMethods = {};
  if (Array.isArray(src.crypto)) {
    const rails = src.crypto.map((c: any) => ({ currency: str(c?.currency, 12).toUpperCase(), network: str(c?.network, 24).toLowerCase(), address: str(c?.address, 128) }))
      .filter((c: { currency: string; network: string; address: string }) => c.currency && c.address && NETWORKS.some(n => c.network.includes(n)));
    if (rails.length) out.crypto = rails.slice(0, 8);
  }
  if (src.anonpay && typeof src.anonpay === "object") {
    const a = { wallet: str(src.anonpay.wallet, 128), ticker: str(src.anonpay.ticker, 12).toLowerCase(), network: str(src.anonpay.network, 24).toLowerCase() };
    if (a.wallet && a.ticker && a.network) out.anonpay = a;
  }
  if (src.revolut && typeof src.revolut === "object") { const handle = str(src.revolut.handle, 64).replace(/^@/, ""); if (handle) out.revolut = { handle }; }
  if (src.paypal && typeof src.paypal === "object") { const email = normaliseEmail(src.paypal.email); if (EMAIL_RE.test(email)) out.paypal = { email }; }
  return out;
}
export const hasPaymentMethod = (m: TmdPaymentMethods) => !!(m.crypto?.length || m.anonpay || m.revolut || m.paypal);

/* ---- Public shapes ----------------------------------------------------------- */
export function publicUser(user: TmdUser) {
  return { id: user.id, handle: user.handle, displayName: user.displayName, bio: user.bio, avatarKey: user.avatarKey, createdAt: user.createdAt };
}
export function privateUser(user: TmdUser) {
  return {
    ...publicUser(user), email: user.email, role: user.role, emailVerified: !!user.emailVerifiedAt,
    telegramLinked: !!user.telegramChatId, telegramUsername: user.telegramUsername, notificationPrefs: user.notificationPrefs ?? {},
    payoutMethods: user.payoutMethods ?? {},
  };
}
export function publicVendor(vendor: TmdVendor) {
  return { id: vendor.id, slug: vendor.slug, name: vendor.name, website: vendor.website, country: vendor.country, description: vendor.description, logoKey: vendor.logoKey, verified: vendor.verified, createdAt: vendor.createdAt };
}
export function publicBatch(batch: TmdBatch) {
  return { id: batch.id, vendorId: batch.vendorId, compound: batch.compound, batchNumber: batch.batchNumber, mg: batch.mg, capColour: batch.capColour, manufacturedOn: batch.manufacturedOn, notes: batch.notes, createdAt: batch.createdAt };
}
/** Pool fields safe for anyone who may view the pool. Hashes and private notes never leave the server. */
export function publicPool(pool: TmdPool) {
  return {
    id: pool.id, slug: pool.slug, organiserId: pool.organiserId, title: pool.title, description: pool.description, status: pool.status,
    visibility: pool.visibility, inviteOnly: pool.visibility === "invite", resultsVisibility: pool.resultsVisibility, labName: pool.labName,
    splitMode: pool.splitMode, fixedShareUsd: pool.fixedShareUsd, shippingUsd: pool.shippingUsd, organiserTipUsd: pool.organiserTipUsd,
    platformFeePct: pool.platformFeePct, targetUsd: pool.targetUsd, minMembers: pool.minMembers, maxMembers: pool.maxMembers,
    deadlineAt: pool.deadlineAt, paymentMethods: pool.paymentMethods ?? {}, coverPhotoKey: pool.coverPhotoKey,
    telegram: { linked: !!pool.telegramChatId, title: pool.telegramChatTitle },
    hasResults: !!pool.resultsPublishedAt, resultsPublishedAt: pool.resultsPublishedAt, fundedAt: pool.fundedAt, createdAt: pool.createdAt, updatedAt: pool.updatedAt,
  };
}
/** Member row as the pool page shows it: anonymous members keep their name private. */
export function publicMember(member: TmdPoolMember) {
  return {
    id: member.id, displayName: member.anonymous ? "Anonymous" : member.displayName, anonymous: member.anonymous,
    paymentStatus: member.paymentStatus, amountUsd: member.amountUsd, joinedAt: member.joinedAt, verifiedAt: member.verifiedAt,
  };
}
/** Member row as the member themself or the organiser sees it. */
export function privateMember(member: TmdPoolMember) {
  return {
    ...publicMember(member), displayName: member.displayName, userId: member.userId, guestContact: member.guestContact,
    paymentMethod: member.paymentMethod, paymentCurrency: member.paymentCurrency, paymentNetwork: member.paymentNetwork, paymentAddress: member.paymentAddress,
    paymentRef: member.paymentRef, paymentAmountCrypto: member.paymentAmountCrypto, paymentUsdPerCoin: member.paymentUsdPerCoin,
    hasScreenshot: !!member.screenshotKey, screenshotKey: member.screenshotKey, note: member.note, submittedAt: member.submittedAt, claimToken: member.claimToken,
  };
}
