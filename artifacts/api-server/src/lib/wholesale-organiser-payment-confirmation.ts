import { db, auditLogsTable, ordersTable, wholesaleShareMembersTable, wholesaleSharesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

export type WholesaleOrganiserPaymentConfirmationMode = "admin" | "automatic" | "backfill";

export interface WholesaleOrganiserPaymentConfirmationInput {
  shareId: string;
  mode?: WholesaleOrganiserPaymentConfirmationMode;
  /** Alias accepted by callers that describe this as the confirmation source. */
  source?: WholesaleOrganiserPaymentConfirmationMode;
  /** Alias for integrations which call the source a confirmation source. */
  confirmationSource?: WholesaleOrganiserPaymentConfirmationMode;
}

export type WholesaleOrganiserPaymentRejectionReason =
  | "invalid_input"
  | "share_not_found"
  | "invalid_share_status"
  | "invalid_parent_status"
  | "missing_transaction_details"
  | "invalid_amount"
  | "invalid_creator_member"
  | "invalid_creator_order";

export type WholesaleOrganiserPaymentConfirmationResult =
  | { status: "confirmed"; shareId: string; creatorOrderId: string }
  | { status: "already_confirmed"; shareId: string; creatorOrderId: string }
  | { status: "rejected"; shareId: string; reason: WholesaleOrganiserPaymentRejectionReason };

type PaymentItem = { quantity?: unknown; unitPrice?: unknown };

function rejected(
  shareId: string,
  reason: WholesaleOrganiserPaymentRejectionReason,
): WholesaleOrganiserPaymentConfirmationResult {
  return { status: "rejected", shareId, reason };
}

function finiteMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && !value.trim()) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function productSubtotal(items: unknown): number | null {
  if (!Array.isArray(items)) return null;

  let subtotal = 0;
  for (const item of items as PaymentItem[]) {
    if (!item || typeof item !== "object") return null;
    const quantity = finiteMoney(item.quantity);
    const unitPrice = finiteMoney(item.unitPrice);
    if (quantity === null || unitPrice === null || quantity < 0 || unitPrice < 0) return null;
    subtotal += quantity * unitPrice;
  }
  return Number(subtotal.toFixed(2));
}

function sourceOf(input: WholesaleOrganiserPaymentConfirmationInput): WholesaleOrganiserPaymentConfirmationMode | null {
  const source = input.mode ?? input.source ?? input.confirmationSource;
  return source === "admin" || source === "automatic" || source === "backfill" ? source : null;
}

/**
 * Confirm the platform payment forwarded by a shared-wholesale organiser.
 *
 * All reads and writes intentionally happen in one transaction. The share,
 * member rows, and creator order are locked before validation so two admin or
 * automatic confirmations cannot race each other or produce duplicate audit
 * entries.
 */
export async function confirmWholesaleOrganiserPayment(
  input: WholesaleOrganiserPaymentConfirmationInput,
): Promise<WholesaleOrganiserPaymentConfirmationResult> {
  const shareId = typeof input?.shareId === "string" ? input.shareId.trim() : "";
  const mode = input ? sourceOf(input) : null;
  if (!shareId || !mode) return rejected(shareId, "invalid_input");

  return db.transaction(async (tx) => {
    const [share] = await tx
      .select()
      .from(wholesaleSharesTable)
      .where(eq(wholesaleSharesTable.id, shareId))
      .for("update");
    if (!share) return rejected(shareId, "share_not_found");
    if (share.status !== "submitted") return rejected(shareId, "invalid_share_status");

    const expectedParentStatus = mode === "backfill" ? "confirmed" : "pending";
    if (share.organiserPaymentStatus !== expectedParentStatus) {
      return rejected(shareId, "invalid_parent_status");
    }

    if (
      typeof share.organiserPaymentTxHash !== "string" ||
      !share.organiserPaymentTxHash.trim() ||
      typeof share.organiserPaymentCurrency !== "string" ||
      !share.organiserPaymentCurrency.trim() ||
      typeof share.organiserPaymentNetwork !== "string" ||
      !share.organiserPaymentNetwork.trim()
    ) {
      return rejected(shareId, "missing_transaction_details");
    }

    const shipping = finiteMoney(share.totalVendorShipping);
    if (shipping === null || shipping < 0) return rejected(shareId, "invalid_amount");

    const members = await tx
      .select()
      .from(wholesaleShareMembersTable)
      .where(eq(wholesaleShareMembersTable.shareId, share.id))
      .for("update");
    const creatorMembers = members.filter(member =>
      member.isCreator === true && member.username === share.creatorUsername,
    );
    if (
      creatorMembers.length !== 1 ||
      typeof creatorMembers[0].orderId !== "string" ||
      creatorMembers[0].orderId.trim() === ""
    ) {
      return rejected(shareId, "invalid_creator_member");
    }

    const creatorMember = creatorMembers[0];
    // Product totals are calculated across all member drafts, not just the
    // creator's order. The organiser forwards the combined product total.
    const combinedSubtotal = members.reduce((total, member) => {
      const memberTotal = productSubtotal(member.items);
      return memberTotal === null ? Number.NaN : total + memberTotal;
    }, 0);
    if (
      !Number.isFinite(combinedSubtotal) ||
      combinedSubtotal <= 0 ||
      Number((combinedSubtotal + shipping).toFixed(2)) <= 0
    ) {
      return rejected(shareId, "invalid_amount");
    }

    const [creatorOrder] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, creatorMember.orderId))
      .for("update");
    if (
      !creatorOrder ||
      creatorOrder.orderType !== "wholesale_shared" ||
      creatorOrder.sharedOrderId !== share.id ||
      creatorOrder.telegramUsername !== share.creatorUsername
    ) {
      return rejected(shareId, "invalid_creator_order");
    }

    const alreadyConfirmed =
      creatorOrder.paymentStatus === "confirmed" || creatorOrder.paymentStatus === "test_confirmed";
    if (!alreadyConfirmed && creatorOrder.paymentStatus !== "unpaid" && creatorOrder.paymentStatus !== "pending") {
      return rejected(shareId, "invalid_creator_order");
    }

    let creatorOrderId = creatorOrder.id;
    let creatorOrderTransitioned = false;
    if (!alreadyConfirmed) {
      const [updatedOrder] = await tx
        .update(ordersTable)
        .set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date() })
        .where(and(
          eq(ordersTable.id, creatorOrder.id),
          inArray(ordersTable.paymentStatus, ["unpaid", "pending"]),
        ))
        .returning({ id: ordersTable.id });
      if (!updatedOrder) return rejected(shareId, "invalid_creator_order");
      creatorOrderId = updatedOrder.id;
      creatorOrderTransitioned = true;
    }

    if (mode !== "backfill") {
      await tx
        .update(wholesaleSharesTable)
        .set({ organiserPaymentStatus: "confirmed", organiserPaymentConfirmedAt: new Date() })
        .where(and(
          eq(wholesaleSharesTable.id, share.id),
          eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
        ))
        .returning({ id: wholesaleSharesTable.id });
    }

    if (creatorOrderTransitioned) {
      await tx.insert(auditLogsTable).values({
        type: "order",
        level: "info",
        action: "wholesale_organiser_payment_confirmed",
        message: `Confirmed organiser payment for shared wholesale order ${share.id}`,
        metadata: {
          shareId: share.id,
          creatorUsername: share.creatorUsername,
          creatorOrderId,
          mode,
          transactionHash: share.organiserPaymentTxHash,
          currency: share.organiserPaymentCurrency,
          network: share.organiserPaymentNetwork,
        },
      });
    }

    return {
      status: creatorOrderTransitioned ? "confirmed" : "already_confirmed",
      shareId,
      creatorOrderId,
    };
  });
}

export const confirmSharedWholesaleOrganiserPayment = confirmWholesaleOrganiserPayment;