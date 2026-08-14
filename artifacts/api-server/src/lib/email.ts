/**
 * Email sending via Resend (Replit connector).
 * Set RESEND_FROM_EMAIL env var to your verified sender address.
 * Falls back to Resend's sandbox address which only delivers to the account owner.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const BRAND = "Salts & Peps";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${BRAND} <${FROM}>`,
        to: [to],
        subject,
        ...(html ? { html } : {}),
        ...(text && !html ? { text } : {}),
      }),
    });
    const body = await res.json().catch(() => ({})) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: (body as any).message ?? "Email send failed" };
    }
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

export function passwordResetEmail(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${BRAND}</p>
          <p style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700">Password Reset</p>
        </td></tr>
        <tr><td style="padding:36px 32px">
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
            We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Your reset code</p>
            <p style="margin:0;font-size:36px;font-weight:800;color:#0f172a;letter-spacing:0.15em;font-family:monospace">${code}</p>
          </div>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
            If you didn't request a password reset, you can safely ignore this email. Your password won't change.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function massEmailTemplate(subject: string, body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .join("<br>");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${BRAND}</p>
          <p style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700">${subject.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>
        </td></tr>
        <tr><td style="padding:36px 32px">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7">${escaped}</p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
