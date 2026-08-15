/**
 * Email scheduler — runs periodic email jobs:
 * • 48-hour Telegram-not-linked reminder
 */
import { db, accountsTable } from "@workspace/db";
import { and, isNull, isNotNull, gt, lt, sql } from "drizzle-orm";
import { sendTemplatedEmail } from "./email.js";

const APP_URL = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");

/** Send a Telegram-not-linked reminder to accounts that signed up 48-72h ago with email but no Telegram. */
async function sendTelegramReminders(): Promise<void> {
  try {
    const now = Date.now();
    const from = new Date(now - 72 * 60 * 60 * 1000); // 72h ago
    const to   = new Date(now - 48 * 60 * 60 * 1000); // 48h ago

    const accounts = await db
      .select({ telegramUsername: accountsTable.telegramUsername, email: accountsTable.email })
      .from(accountsTable)
      .where(
        and(
          isNull(accountsTable.telegramChatId),     // no Telegram linked
          isNotNull(accountsTable.email),            // has an email
          gt(accountsTable.createdAt, from),
          lt(accountsTable.createdAt, to),
        )
      );

    for (const account of accounts) {
      if (!account.email) continue;
      const username = account.telegramUsername.replace(/^@/, "").replace(/^discord:.*/, "");
      if (!username) continue;

      await sendTemplatedEmail("telegram_reminder", account.email, {
        username,
        app_url: APP_URL,
      });
    }

    if (accounts.length > 0) {
      console.log(`[email-scheduler] Telegram reminders sent to ${accounts.length} account(s)`);
    }
  } catch (e) {
    console.error("[email-scheduler] Telegram reminder job failed:", (e as Error).message);
  }
}

/** Start the scheduler — runs reminder check every 6 hours. */
export function startEmailScheduler(): void {
  // Run once shortly after startup (offset by 2 min to avoid startup congestion)
  setTimeout(() => {
    sendTelegramReminders();
    // Then every 6 hours
    setInterval(sendTelegramReminders, 6 * 60 * 60 * 1000);
  }, 2 * 60 * 1000);

  console.log("[email-scheduler] Started — Telegram reminder check every 6 h");
}
