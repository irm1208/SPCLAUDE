/**
 * Email sending via Resend (Replit connector).
 * Set RESEND_FROM_EMAIL env var to your verified sender address.
 * Falls back to Resend's sandbox address which only delivers to the account owner.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, emailTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const connectors = new ReplitConnectors();
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const BRAND = "Salt & Peps";
const APP_URL = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");

// ── Core send ─────────────────────────────────────────────────────────────────

export async function sendEmail({
  to, subject, html, text, fromName,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const from = `${fromName ?? BRAND} <${FROM}>`;
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        ...(html ? { html } : {}),
        ...(text && !html ? { text } : {}),
      }),
    });
    const body = await res.json().catch(() => ({})) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: (body as any).message ?? "Email send failed" };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildEmailHtml(opts: {
  title: string;
  bodyHtml: string;
  primaryColor?: string;
  logoUrl?: string | null;
  footerText?: string | null;
  fromName?: string;
}): string {
  const { title, bodyHtml, primaryColor = "#1B3A7A", logoUrl, footerText, fromName } = opts;
  const brand = fromName ?? BRAND;
  const year = new Date().getFullYear();
  const footer = footerText ?? `&copy; ${year} ${brand}. All rights reserved.`;

  // Darken the primary colour slightly for the gradient
  const headerBg = `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor})`;

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${brand}" style="max-height:40px;max-width:160px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto">`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr><td style="background:${headerBg};padding:28px 32px;text-align:center">
          ${logoSection}
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${brand}</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700">${title}</p>
        </td></tr>
        <tr><td style="padding:36px 32px">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Template rendering ────────────────────────────────────────────────────────

/** Replace {{var_name}} placeholders in a string with values from vars. */
export function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── DB-driven template send ───────────────────────────────────────────────────

/** Load a template from DB, render it, and send. Returns silently on failure. */
export async function sendTemplatedEmail(
  eventKey: string,
  to: string | null | undefined,
  vars: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  if (!to || !to.includes("@")) return { ok: false, error: "Invalid recipient" };
  try {
    const [tpl] = await db
      .select()
      .from(emailTemplatesTable)
      .where(eq(emailTemplatesTable.eventKey, eventKey));

    if (!tpl || !tpl.isActive) return { ok: false, error: "Email template unavailable" };

    const allVars = { app_url: APP_URL, ...vars };
    const subject = renderTemplate(tpl.subject, allVars);
    const bodyHtml = renderTemplate(tpl.bodyHtml, allVars);
    const html = buildEmailHtml({
      title: tpl.name,
      bodyHtml,
      primaryColor: tpl.primaryColor,
      logoUrl: tpl.logoUrl,
      footerText: tpl.footerText,
      fromName: tpl.fromName,
    });

    return await sendEmail({ to, subject, html, fromName: tpl.fromName });
  } catch (e) {
    console.error(`[email] Failed to send ${eventKey} to ${to}:`, (e as Error).message);
    return { ok: false, error: "Email send failed" };
  }
}

// ── Legacy templates (kept for backward compat) ───────────────────────────────

export function passwordResetEmail(code: string): string {
  return buildEmailHtml({
    title: "Password Reset",
    bodyHtml: `
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
        We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Your reset code</p>
        <p style="margin:0;font-size:36px;font-weight:800;color:#0f172a;letter-spacing:0.15em;font-family:monospace">${code}</p>
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
        If you didn't request a password reset, you can safely ignore this email. Your password won't change.
      </p>`,
  });
}

export function massEmailTemplate(subject: string, body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .split("\n").join("<br>");
  return buildEmailHtml({
    title: subject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    bodyHtml: `<p style="margin:0;color:#374151;font-size:15px;line-height:1.7">${escaped}</p>`,
  });
}
