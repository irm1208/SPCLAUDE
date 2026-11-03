import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import { db, tmdEmailTokensTable, tmdUsersTable, type TmdUser } from "@workspace/db";
import { sendEmail } from "./email";

/**
 * Transactional email for Testmedaddy. Uses the shared Resend transport but its own
 * sender name, address and look, so nothing in the inbox points at the other brands.
 */
export const TMD_BRAND = "Testmedaddy";
export function tmdPublicUrl(): string {
  const raw = process.env["TMD_PUBLIC_URL"] ?? process.env["TESTMEDADDY_URL"] ?? "";
  if (raw) return raw.replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://");
  const dev = process.env["REPLIT_DEV_DOMAIN"];
  return dev ? `https://${dev}:3002` : "http://localhost:21505";
}
const fromEmail = () => process.env["TMD_FROM_EMAIL"] ?? process.env["RESEND_FROM_EMAIL"] ?? "onboarding@resend.dev";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f4f1;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c2524">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e3dd;border-radius:20px">
<tr><td style="padding:28px 32px 8px"><p style="margin:0;font-size:13px;letter-spacing:.02em;color:#1f6b5e;font-weight:700">${TMD_BRAND}</p>
<h1 style="margin:10px 0 0;font-size:22px;color:#1c2524;letter-spacing:-.01em">${esc(title)}</h1></td></tr>
<tr><td style="padding:16px 32px 32px;font-size:15px;line-height:1.65;color:#4b4766">${body}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e2e3dd;font-size:12px;color:#9793b0">You are receiving this because an account on ${TMD_BRAND} used this address. If that was not you, ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href: string, label: string) => `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#1c2524;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px">${esc(label)}</a></p><p style="font-size:12px;color:#9793b0;word-break:break-all">Or paste this link: ${esc(href)}</p>`;

export type TmdMailer = (message: { to: string; subject: string; html: string }) => Promise<{ ok: boolean; error?: string }>;
let mailer: TmdMailer = ({ to, subject, html }) => sendEmail({ to, subject, html, fromName: TMD_BRAND }).then(r => ({ ok: r.ok, error: r.error }));
/** Tests capture outgoing mail. */
export function setTmdMailer(next: TmdMailer | null) { mailer = next ?? (({ to, subject, html }) => sendEmail({ to, subject, html, fromName: TMD_BRAND }).then(r => ({ ok: r.ok, error: r.error }))); }
export const tmdFromAddress = fromEmail;

/* ---- Tokens ------------------------------------------------------------------ */
export type TokenPurpose = "verify" | "reset";
const TTL: Record<TokenPurpose, number> = { verify: 48 * 3_600_000, reset: 30 * 60_000 };
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function issueEmailToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const raw = randomBytes(24).toString("hex");
  await db.transaction(async tx => {
    await tx.delete(tmdEmailTokensTable).where(and(eq(tmdEmailTokensTable.userId, userId), eq(tmdEmailTokensTable.purpose, purpose), isNull(tmdEmailTokensTable.usedAt)));
    await tx.insert(tmdEmailTokensTable).values({ tokenHash: hash(raw), userId, purpose, expiresAt: new Date(Date.now() + TTL[purpose]) });
  });
  return raw;
}
/** Marks the token used and returns its user, or null when unknown, used or expired. */
export async function consumeEmailToken(raw: string, purpose: TokenPurpose): Promise<TmdUser | null> {
  if (!/^[a-f0-9]{48}$/.test(raw)) return null;
  return db.transaction(async tx => {
    const [row] = await tx.select().from(tmdEmailTokensTable)
      .where(and(eq(tmdEmailTokensTable.tokenHash, hash(raw)), eq(tmdEmailTokensTable.purpose, purpose), isNull(tmdEmailTokensTable.usedAt), gt(tmdEmailTokensTable.expiresAt, new Date()))).for("update");
    if (!row) return null;
    await tx.update(tmdEmailTokensTable).set({ usedAt: new Date() }).where(eq(tmdEmailTokensTable.tokenHash, row.tokenHash));
    const [user] = await tx.select().from(tmdUsersTable).where(eq(tmdUsersTable.id, row.userId));
    return user ?? null;
  });
}

/* ---- Messages ---------------------------------------------------------------- */
export async function sendVerificationEmail(user: TmdUser) {
  const raw = await issueEmailToken(user.id, "verify");
  const link = `${tmdPublicUrl()}/verify-email?token=${raw}`;
  return mailer({ to: user.email, subject: `Confirm your ${TMD_BRAND} email`, html: layout("Confirm your email", `<p>Hi ${esc(user.displayName)}, confirm this address to finish setting up your account.</p>${button(link, "Confirm email")}<p>The link is valid for 48 hours.</p>`) });
}
export async function sendPasswordResetEmail(user: TmdUser) {
  const raw = await issueEmailToken(user.id, "reset");
  const link = `${tmdPublicUrl()}/reset-password?token=${raw}`;
  return mailer({ to: user.email, subject: `Reset your ${TMD_BRAND} password`, html: layout("Reset your password", `<p>Someone asked to reset the password for this account. If it was you, choose a new one below.</p>${button(link, "Choose a new password")}<p>The link is valid for 30 minutes. Your current password keeps working until you change it.</p>`) });
}
export async function sendPlainEmail(to: string, subject: string, title: string, bodyHtml: string, cta?: { href: string; label: string }) {
  return mailer({ to, subject, html: layout(title, `${bodyHtml}${cta ? button(cta.href, cta.label) : ""}`) });
}
