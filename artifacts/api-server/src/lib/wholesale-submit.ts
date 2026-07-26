import { db } from "@workspace/db";
import { ordersTable, wholesaleSharesTable, wholesaleShareMembersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendAdminMessage } from "./telegram";
import { writeLog } from "./audit-log";

function escHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Called whenever a member order's payment is confirmed. If the order belongs to
 * a locked shared wholesale order and every sibling order is now confirmed, flip
 * the parent share to "submitted" (exactly once) and notify the admin.
 *
 * Safe to call from any payment-confirmation path: it no-ops for non-shared
 * orders, and the conditional UPDATE guarantees the submit + notification fire
 * only once even under concurrent confirmations.
 */
export async function maybeSubmitSharedOrder(orderId: string): Promise<void> {
  try {
    const [order] = await db
      .select({ orderType: ordersTable.orderType, sharedOrderId: ordersTable.sharedOrderId })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order || order.orderType !== "wholesale_shared" || !order.sharedOrderId) return;

    const shareId = order.sharedOrderId;
    const [share] = await db
      .select()
      .from(wholesaleSharesTable)
      .where(eq(wholesaleSharesTable.id, shareId));
    if (!share || share.status !== "locked") return;

    // Are all sibling orders confirmed?
    const siblings = await db
      .select({ id: ordersTable.id, paymentStatus: ordersTable.paymentStatus, grandTotal: ordersTable.grandTotal })
      .from(ordersTable)
      .where(eq(ordersTable.sharedOrderId, shareId));

    if (siblings.length === 0) return;

    // When the organiser has configured their own wallet, members pay them directly.
    // Their personal order is bundled into the platform payment they forward to admin,
    // so don't require it to be individually confirmed before auto-submitting.
    const hasOwnWallet = Array.isArray(share.leadCryptoOptions) && (share.leadCryptoOptions as unknown[]).length > 0;
    let creatorOrderId: string | null = null;
    if (hasOwnWallet) {
      const [creatorMember] = await db
        .select({ orderId: wholesaleShareMembersTable.orderId })
        .from(wholesaleShareMembersTable)
        .where(and(
          eq(wholesaleShareMembersTable.shareId, shareId),
          eq(wholesaleShareMembersTable.isCreator, true),
        ));
      creatorOrderId = creatorMember?.orderId ?? null;
    }

    const allPaid = siblings.every(s =>
      s.paymentStatus === "confirmed" || (hasOwnWallet && creatorOrderId != null && s.id === creatorOrderId)
    );
    if (!allPaid) return;

    // Exactly-once flip: only the call that wins the WHERE status='locked' race
    // proceeds to notify.
    const flipped = await db
      .update(wholesaleSharesTable)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(and(eq(wholesaleSharesTable.id, shareId), eq(wholesaleSharesTable.status, "locked")))
      .returning({ id: wholesaleSharesTable.id });

    if (flipped.length === 0) return; // someone else already submitted it

    const combinedTotal = siblings.reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
    const totalKits = share.totalKits != null ? Number(share.totalKits) : 0;
    const totalShipping = share.totalVendorShipping != null ? Number(share.totalVendorShipping) : 0;

    await writeLog("order", "info", "wholesale_share_submitted",
      `Shared wholesale order ${shareId} fully paid and auto-submitted — ${siblings.length} members, ${totalKits} kits`,
      { shareId, members: siblings.length, totalKits, totalShipping, combinedTotal });

    const lines = [
      "✅ <b>Shared wholesale order ready</b>",
      `Share: <code>${escHtml(shareId)}</code>`,
      `Delivery to: <b>${escHtml(share.deliveryUsername ?? "—")}</b>`,
      share.shippingName ? `Name: ${escHtml(share.shippingName)}` : "",
      share.shippingAddress ? `Address: ${escHtml(share.shippingAddress)}` : "",
      share.shippingCountry ? `Country: ${escHtml(share.shippingCountry)}` : "",
      `Members: <b>${siblings.length}</b>`,
      `Total kits: <b>${totalKits}</b>`,
      `Vendor shipping: <b>$${totalShipping.toFixed(2)}</b>`,
      `Combined total: <b>$${combinedTotal.toFixed(2)}</b>`,
      "All members have paid — ready to place with the vendor.",
    ].filter(Boolean);

    await sendAdminMessage(lines.join("\n")).catch(() => {});
  } catch (err) {
    console.error("[wholesale-submit] maybeSubmitSharedOrder failed:", err);
  }
}
