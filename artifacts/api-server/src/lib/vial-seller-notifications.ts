import { sendTelegramMessage } from "./telegram";
import { writeLog } from "./audit-log";
import { createAlert } from "./create-alert";
import { formatVialPrice } from "./vial-pricing";

export function validateSellerTelegramChatId(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^[1-9]\d{0,15}$/.test(value.trim())) {
    throw new Error("Enter your numeric private Telegram chat ID, not an @username or group ID.");
  }
  return value.trim();
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type Seller = { id: string; name: string; telegramChatId?: string | null; notifyVendor?: boolean };
type OrderNotice = {
  code: string; currency: string; total: number; notes?: string | null;
  items: { productId: string; productName: string; quantity: number; lineTotal: number }[];
};

/** An alert failure must be visible to Admin, but must never undo a placed order. */
export async function notifyVialSellers(sellers: Seller[], order: OrderNotice): Promise<void> {
  for (const seller of sellers) {
    if (seller.notifyVendor === false) continue;
    let reason = seller.telegramChatId ? "delivery_failed" : "telegram_not_linked";
    if (seller.telegramChatId) {
      const items = order.items.map(i => `• ${escapeHtml(i.productName)} ×${i.quantity} — ${formatVialPrice(i.lineTotal, order.currency)}`).join("\n");
      const message =
        `📦 <b>New Order — Awaiting Your Approval</b>\n\n` +
        `Order: <code>${escapeHtml(order.code)}</code>\n` +
        `Total: <b>${formatVialPrice(order.total, order.currency)}</b>\n\n` +
        `<b>Items:</b>\n${items}` +
        (order.notes ? `\n\n<b>Buyer's Note:</b>\n${escapeHtml(order.notes)}` : "") +
        `\n\nLog into your seller dashboard to <b>accept or reject</b> this order. The buyer is waiting for your response.`;
      try {
        if (await sendTelegramMessage(seller.telegramChatId, message, "HTML")) continue;
      } catch { reason = "delivery_failed"; }
    }
    await writeLog("seller", "warn", "vial_seller_notification_failed",
      `Seller new-order Telegram alert was not delivered`,
      { vendorId: seller.id, orderCode: order.code, reason }).catch(() => {});
    await createAlert("seller", "medium", "Seller order alert not delivered",
      `Order ${order.code}: ${seller.name}'s Telegram alert ${reason === "telegram_not_linked" ? "could not be sent because Telegram is not linked" : "failed"}. The order is saved. Check the seller's notification settings.`,
      { linkUrl: "#vialshop" }).catch(() => {});
  }
}
