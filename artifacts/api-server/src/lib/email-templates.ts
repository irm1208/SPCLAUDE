import { db, emailTemplatesTable } from "@workspace/db";
import { COA_EVENTS, COA_EMAIL_VARS } from "./coa-notification-content";

const EMAIL_VERIFICATION_TEMPLATE = {
  eventKey: "email_verification",
  name: "Verify your email",
  subject: "Your Salt & Peps verification code",
  bodyHtml: `<p>Hello {{username}},</p><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:0.15em">{{code}}</p><p>This code expires in 15 minutes. If you did not create an account, you can ignore this email.</p>`,
  availableVars: JSON.stringify([
    { key: "code", description: "6-digit verification code" },
    { key: "username", description: "Account username" },
  ]),
  isActive: true,
};

/** Adds required system templates without modifying administrator customizations. */
export async function ensureSystemEmailTemplates(): Promise<void> {
  await db.insert(emailTemplatesTable).values(EMAIL_VERIFICATION_TEMPLATE).onConflictDoNothing();
  await db.insert(emailTemplatesTable).values(COA_EVENTS.map(event => ({
    eventKey: `coa_${event}`, name: `COA request: ${event}`,
    subject: `COA request ${event} — {{order_code}}`,
    bodyHtml: `<p>Order <strong>{{order_code}}</strong></p><p>{{message}}</p><p>Separate COA fee: {{fee}} {{currency}}</p><p><a href="{{order_url}}">View your COA request</a></p>`,
    availableVars: JSON.stringify(COA_EMAIL_VARS), isActive: true,
  }))).onConflictDoNothing();
}