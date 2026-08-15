---
name: Email template system
description: How transactional emails are architected, where hooks live, and patterns to follow when adding new ones.
---

## Architecture
- **Table**: `email_templates` (PK: `event_key`) — `subject`, `body_html`, `from_name`, `primary_color`, `logo_url`, `footer_text`, `is_active`
- **10 seeded templates**: welcome, order_confirmed, order_shipped, order_delivered, gb_joined, gb_shipping_update, email_verification, telegram_reminder, ticket_received, ticket_reply
- **Core lib**: `artifacts/api-server/src/lib/email.ts`
  - `sendEmail()` — raw Resend send
  - `buildEmailHtml()` — generates responsive layout HTML
  - `renderTemplate()` — `{{var}}` substitution
  - `sendTemplatedEmail(eventKey, to, vars)` — DB-driven, non-throwing (logs errors)

## Hook pattern
All route hooks use dynamic import + fire-and-forget (never block the response):
```ts
;(async () => {
  try {
    const [acct] = await db.select({ email: accountsTable.email }).from(accountsTable).where(eq(accountsTable.telegramUsername, username));
    if (acct?.email) {
      const { sendTemplatedEmail } = await import("../lib/email.js");
      await sendTemplatedEmail("eventKey", acct.email, { var1: "...", var2: "..." });
    }
  } catch {}
})().catch(() => {});
```

## Active hooks
| Event | File | Trigger |
|---|---|---|
| welcome | account.ts | Signup with email |
| gb_joined | account.ts | GB join success |
| ticket_received | tickets.ts | Customer opens ticket |
| ticket_reply | tickets.ts | Admin replies to ticket |
| order_confirmed | payments.ts | firePaymentNotifications("confirmed") |
| order_shipped | admin.ts | Bulk tracking update sets Shipped |

## Scheduler
`artifacts/api-server/src/lib/email-scheduler.ts` — runs every 6h, sends `telegram_reminder` to accounts 48-72h old with email but no Telegram chatId.
Started in `index.ts` via `startEmailScheduler()`.

## Admin UI
`EmailTemplatesTab` component in `Admin.tsx` (before EmailBlastTab).
Nav: Communications > Email Templates (`id: "email-templates"`).
API: `GET/PUT /admin/email-templates/:key`, `POST .../preview`.

## Organiser UI
`BroadcastTab.tsx` has an "Email Members" card at the bottom.
Uses `organiserApi.emailBlast(gbId, { subject, body, testEmail? })` → `POST /organiser/group-buys/:gbId/email-blast`.

## Middleware gotcha
`requireOrganiser` is an Express `(req, res, next)` middleware — use it as:
```ts
router.post("/path", requireOrganiser, async (req, res) => { ... });
// Access organiser via req.organiser!.telegramUsername
```
Never call `if (!requireOrganiser(req, res)) return;` — that pattern is for `requireAdmin` only.

**Why**: requireOrganiser does async DB lookups and uses next() to pass control; calling it without next() leaves the response hanging.
