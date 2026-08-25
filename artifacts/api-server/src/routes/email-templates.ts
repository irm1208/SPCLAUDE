/**
 * Email Templates — Admin CRUD + Organiser blast
 *
 * GET  /admin/email-templates            list all templates
 * GET  /admin/email-templates/:key       get one
 * PUT  /admin/email-templates/:key       update subject/body/style/active
 * POST /admin/email-templates/:key/preview  send a preview to an email address
 * POST /organiser/group-buys/:gbId/email-blast  send email to GB members
 */
import { Router } from "express";
import { db, emailTemplatesTable, accountGroupBuysTable, accountsTable, customersTable, groupBuysTable } from "@workspace/db";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { sendEmail, buildEmailHtml, renderTemplate, massEmailTemplate } from "../lib/email.js";

const router = Router();

// ─── Shared template variables available per event ────────────────────────────

const EVENT_META: Record<string, { name: string; vars: { key: string; description: string }[] }> = {
  welcome:            { name: "Welcome",             vars: [{ key: "username", description: "Account username" }, { key: "app_url", description: "App URL" }] },
  order_confirmed:    { name: "Order Confirmed",     vars: [{ key: "order_id", description: "Order code" }, { key: "customer_name", description: "Customer username" }, { key: "items_summary", description: "List of ordered items" }, { key: "total", description: "Order total" }, { key: "app_url", description: "App URL" }] },
  order_shipped:      { name: "Order Shipped",       vars: [{ key: "order_id", description: "Order code" }, { key: "tracking_number", description: "Tracking number" }, { key: "tracking_url", description: "Tracking link" }, { key: "app_url", description: "App URL" }] },
  order_delivered:    { name: "Order Delivered",     vars: [{ key: "order_id", description: "Order code" }, { key: "customer_name", description: "Customer username" }, { key: "app_url", description: "App URL" }] },
  gb_joined:          { name: "Group Buy Joined",    vars: [{ key: "gb_name", description: "Group buy name" }, { key: "pin", description: "Member PIN" }, { key: "customer_name", description: "Customer username" }, { key: "app_url", description: "App URL" }] },
  gb_shipping_update: { name: "GB Shipping Update",  vars: [{ key: "gb_name", description: "Group buy name" }, { key: "status", description: "New status" }, { key: "message", description: "Optional message" }, { key: "app_url", description: "App URL" }] },
  email_verification: { name: "Email Verification",  vars: [{ key: "code", description: "6-digit verification code" }, { key: "username", description: "Account username" }] },
  telegram_reminder:  { name: "Telegram Reminder",   vars: [{ key: "username", description: "Account username" }, { key: "app_url", description: "App URL" }] },
  ticket_received:    { name: "Ticket Received",     vars: [{ key: "ticket_id", description: "Ticket ID" }, { key: "subject", description: "Ticket subject" }, { key: "category", description: "Ticket category" }, { key: "app_url", description: "App URL" }] },
  ticket_reply:       { name: "Ticket Reply",        vars: [{ key: "ticket_id", description: "Ticket ID" }, { key: "subject", description: "Ticket subject" }, { key: "reply_preview", description: "Preview of the reply" }, { key: "app_url", description: "App URL" }] },
};

// ─── Admin: list all ──────────────────────────────────────────────────────────

router.get("/admin/email-templates", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.eventKey);
  // Attach meta (available vars) to each template
  const enriched = templates.map(t => ({
    ...t,
    availableVars: EVENT_META[t.eventKey]?.vars ?? [],
  }));
  res.json({ templates: enriched });
});

// ─── Admin: get one ───────────────────────────────────────────────────────────

router.get("/admin/email-templates/:key", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.params;
  const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.eventKey, key));
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }
  res.json({ template: { ...tpl, availableVars: EVENT_META[key]?.vars ?? [] } });
});

// ─── Admin: update ────────────────────────────────────────────────────────────

router.put("/admin/email-templates/:key", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.params;
  const { subject, bodyHtml, fromName, primaryColor, logoUrl, footerText, isActive } = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof subject === "string" && subject.trim()) updates.subject = subject.trim();
  if (typeof bodyHtml === "string") updates.bodyHtml = bodyHtml;
  if (typeof fromName === "string" && fromName.trim()) updates.fromName = fromName.trim();
  if (typeof primaryColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(primaryColor)) updates.primaryColor = primaryColor;
  if (logoUrl !== undefined) updates.logoUrl = typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;
  if (footerText !== undefined) updates.footerText = typeof footerText === "string" && footerText.trim() ? footerText.trim() : null;
  if (typeof isActive === "boolean") updates.isActive = isActive;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }

  const [updated] = await db.update(emailTemplatesTable)
    .set(updates as any)
    .where(eq(emailTemplatesTable.eventKey, key))
    .returning();

  if (!updated) { res.status(404).json({ error: "Template not found" }); return; }
  res.json({ template: { ...updated, availableVars: EVENT_META[key]?.vars ?? [] } });
});

// ─── Admin: send preview ──────────────────────────────────────────────────────

router.post("/admin/email-templates/:key/preview", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.params;
  const { previewEmail } = req.body as { previewEmail?: string };

  if (!previewEmail || !previewEmail.includes("@")) {
    res.status(400).json({ error: "A valid preview email address is required" });
    return;
  }

  const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.eventKey, key));
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }

  // Substitute all {{vars}} with sample values for preview
  const meta = EVENT_META[key];
  const sampleVars: Record<string, string> = {
    app_url: process.env["APP_URL"] ?? "https://saltandpeps.co.uk",
  };
  for (const v of (meta?.vars ?? [])) {
    sampleVars[v.key] = `[${v.key}]`;
  }

  const subject = `[PREVIEW] ${renderTemplate(tpl.subject, sampleVars)}`;
  const bodyHtml = renderTemplate(tpl.bodyHtml, sampleVars);
  const html = buildEmailHtml({ title: tpl.name, bodyHtml, primaryColor: tpl.primaryColor, logoUrl: tpl.logoUrl, footerText: tpl.footerText, fromName: tpl.fromName });

  const result = await sendEmail({ to: previewEmail, subject, html, fromName: tpl.fromName });
  if (!result.ok) { res.status(502).json({ error: result.error ?? "Failed to send preview" }); return; }
  res.json({ ok: true, message: `Preview sent to ${previewEmail}` });
});

// ─── Organiser: email blast to GB members ────────────────────────────────────

router.post("/organiser/group-buys/:gbId/email-blast", requireOrganiser, async (req, res): Promise<void> => {
  const organiserUsername: string = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const { subject, body, testEmail } = req.body as { subject?: string; body?: string; testEmail?: string };

  if (!subject?.trim()) { res.status(400).json({ error: "Subject is required" }); return; }
  if (!body?.trim()) { res.status(400).json({ error: "Body is required" }); return; }

  // Verify organiser owns this GB
  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  const orgTg = organiserUsername?.replace(/^@/, "");
  const gbOrg = gb.organiserId?.replace(/^@/, "");
  if (orgTg !== gbOrg) { res.status(403).json({ error: "You are not the organiser of this group buy" }); return; }

  // Test send
  if (testEmail) {
    const html = massEmailTemplate(`[TEST] ${subject.trim()}`, body.trim());
    const result = await sendEmail({ to: testEmail, subject: `[TEST] ${subject.trim()}`, html });
    if (!result.ok) { res.status(502).json({ error: result.error ?? "Failed to send test" }); return; }
    res.json({ ok: true, sent: 0, total: 0, test: true });
    return;
  }

  // Fetch all GB member usernames
  const members = await db
    .select({ accountId: accountGroupBuysTable.accountId })
    .from(accountGroupBuysTable)
    .where(eq(accountGroupBuysTable.groupBuyId, gbId));

  const usernames = members.map(m => m.accountId.replace(/^@/, ""));
  if (usernames.length === 0) { res.json({ ok: true, sent: 0, total: 0 }); return; }

  // Get emails from accounts and customers tables
  const [accountEmails, customerEmails] = await Promise.all([
    db.select({ username: accountsTable.telegramUsername, email: accountsTable.email })
      .from(accountsTable)
      .where(and(inArray(accountsTable.telegramUsername, usernames), isNotNull(accountsTable.email))),
    db.select({ username: customersTable.telegramUsername, email: customersTable.email })
      .from(customersTable)
      .where(and(inArray(customersTable.telegramUsername, usernames.map(u => `@${u}`)), isNotNull(customersTable.email))),
  ]);

  // Merge — prefer accounts.email, fall back to customers.email
  const emailMap = new Map<string, string>();
  for (const c of customerEmails) {
    if (c.email) emailMap.set(c.username.replace(/^@/, ""), c.email);
  }
  for (const a of accountEmails) {
    if (a.email) emailMap.set(a.username.replace(/^@/, ""), a.email);
  }

  const emails = [...new Set([...emailMap.values()])].filter(e => e.includes("@"));
  if (emails.length === 0) { res.json({ ok: true, sent: 0, total: 0, message: "No members have email addresses on file" }); return; }

  const html = massEmailTemplate(subject.trim(), body.trim());
  const BATCH = 25;
  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(to => sendEmail({ to, subject: subject.trim(), html }))
    );
    sent += results.filter(r => r.status === "fulfilled" && (r.value as any).ok).length;
  }

  res.json({ ok: true, sent, total: emails.length, gbName: gb.name });
});

export default router;
