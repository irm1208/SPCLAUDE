import { db, emailTemplatesTable } from "@workspace/db";

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
}