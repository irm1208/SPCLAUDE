import {
  auditLogsTable,
  db,
  ordersTable,
  wholesaleShareMembersTable,
  wholesaleSharesTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

export type OrganiserPaymentConfirmationSource = "automatic" | "admin" | "backfill";

export type OrganiserPaymentConfirmationResult =
  | { kind: "confirmed"; shareId: string; organiserOrderId: string; orderChanged: boolean }
  | { kind: "already_confirmed"; shareId: string; organiserOrderId: string }
  | { kind: "rejected"; code: string; message: string };

type RejectionCode =
  | "invalid_input"
  | "not_found"
  | "invalid_share_status"
  | "invalid_parent_status"
  | "missing_transaction_identity"
  | "invalid_amount"
  | "invalid_creator_member"
  | "invalid_creator_order";

type PaymentItem = { quantity?: unknown; unitPrice?: unknown };

function reject(code: RejectionCode, message: string): OrganiserPaymentConfirmationResult {
  return { kind: "rejected", code, message };
}

function finiteMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && !value.trim()) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Match the existing wholesale amount calculation: round every line first. */
function memberSubtotal(items: unknown): number | null {
  if (!Array.isArray(items)) return null;

  let subtotal = 0;
  for (const item of items as PaymentItem[]) {
    if (!item || typeof item !== "object") return null;
    const quantity = finiteMoney(item.quantity);
    const unitPrice = finiteMoney(item.unitPrice);
    if (quantity === null || unitPrice === null || quantity < 0 || unitPrice < 0) return null;
    subtotal += Number((quantity * unitPrice).toFixed(2));
  }
  return Number(subtotal.toFixed(2));
}

function amountDue(members: Array<{ items: unknown }>, shipping: unknown): number | null {
  const vendorShipping = finiteMoney(shipping);
  if (vendorShipping === null || vendorShipping < 0) return null;

  let subtotal = 0;
  for (const member of members) {
    const memberTotal = memberSubtotal(member.items);
    if (memberTotal === null) return null;
    subtotal += memberTotal;
  }
  return Number((subtotal + vendorShipping).toFixed(2));
}

function isPaymentStatus(value: unknown): value is "pending" | "confirmed" {
  return value === "pending" || value === "confirmed";
}

/**
 * Confirm the organiser's platform payment and the organiser's linked order in
 * one transaction. The share lock serialises repeated admin/automatic calls;
 * the candidate and order locks prevent unrelated member orders from being
 * changed and make the audit transition exactly once.
 */
export async function confirmWholesaleOrganiserPayment(input: {
  shareId: string;
  source: OrganiserPaymentConfirmationSource;
  expectedCurrentParentStatus?: "pending" | "confirmed";
}): Promise<OrganiserPaymentConfirmationResult> {
  const shareId = typeof input?.shareId === "string" ? input.shareId.trim() : "";
  const source = input?.source;
  if (!shareId || (source !== "admin" && source !== "automatic" && source !== "backfill")) {
    return reject("invalid_input", "A share ID and valid confirmation source are required.");
  }

  const expectedCurrentParentStatus =
    input.expectedCurrentParentStatus ?? (source === "backfill" ? "confirmed" : "pending");
  if (!isPaymentStatus(expectedCurrentParentStatus)) {
    return reject("invalid_input", "The expected current parent payment status is invalid.");
  }

  return db.transaction(async (tx) => {
    const [share] = await tx
      .select()
      .from(wholesaleSharesTable)
      .where(eq(wholesaleSharesTable.id, shareId))
      .for("update");
    if (!share) return reject("not_found", "Shared order not found.");
    if (share.status !== "submitted") {
      return reject("invalid_share_status", "Shared order is not submitted.");
    }

    // A pending parent is the normal admin/automatic path. A confirmed parent
    // is also accepted for those sources so a repeated call can still validate
    // the linked order and return an idempotent result. Backfill is confirmed-only.
    const repeatedParentConfirmation =
      source !== "backfill" &&
      expectedCurrentParentStatus === "pending" &&
      share.organiserPaymentStatus === "confirmed";
    if (
      share.organiserPaymentStatus !== expectedCurrentParentStatus &&
      !repeatedParentConfirmation
    ) {
      return reject(
        "invalid_parent_status",
        `Expected organiser payment status "${expectedCurrentParentStatus}".`,
      );
    }

    if (
      typeof share.organiserPaymentTxHash !== "string" ||
      !share.organiserPaymentTxHash.trim() ||
      typeof share.organiserPaymentCurrency !== "string" ||
      !share.organiserPaymentCurrency.trim() ||
      typeof share.organiserPaymentNetwork !== "string" ||
      !share.organiserPaymentNetwork.trim()
    ) {
      return reject(
        "missing_transaction_identity",
        "Stored organiser transaction hash, currency, and network are required.",
      );
    }

    // This read is deliberately not locked: it supplies the existing combined
    // amount calculation. Only the creator candidate below is locked because
    // unrelated member rows must never be part of the state transition.
    const memberItems = await tx
      .select({ items: wholesaleShareMembersTable.items })
      .from(wholesaleShareMembersTable)
      .where(eq(wholesaleShareMembersTable.shareId, share.id));
    const total = amountDue(memberItems, share.totalVendorShipping);
    if (total === null || total <= 0) {
      return reject("invalid_amount", "The organiser payment amount must be positive.");
    }

    const creatorMembers = await tx
      .select()
      .from(wholesaleShareMembersTable)
      .where(and(
        eq(wholesaleShareMembersTable.shareId, share.id),
        eq(wholesaleShareMembersTable.isCreator, true),
        eq(wholesaleShareMembersTable.username, share.creatorUsername),
      ))
      .for("update");
    if (
      creatorMembers.length !== 1 ||
      typeof creatorMembers[0].orderId !== "string" ||
      !creatorMembers[0].orderId.trim()
    ) {
      return reject(
        "invalid_creator_member",
        "Exactly one creator member with a linked order is required.",
      );
    }

    const organiserOrderId = creatorMembers[0].orderId;
    const [organiserOrder] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, organiserOrderId))
      .for("update");
    if (
      !organiserOrder ||
      organiserOrder.orderType !== "wholesale_shared" ||
      organiserOrder.sharedOrderId !== share.id ||
      organiserOrder.telegramUsername !== share.creatorUsername
    ) {
      return reject(
        "invalid_creator_order",
        "The linked creator order does not match this shared wholesale order.",
      );
    }

    const orderAlreadyConfirmed =
      organiserOrder.paymentStatus === "confirmed" ||
      organiserOrder.paymentStatus === "test_confirmed";
    if (
      !orderAlreadyConfirmed &&
      organiserOrder.paymentStatus !== "unpaid" &&
      organiserOrder.paymentStatus !== "pending"
    ) {
      return reject(
        "invalid_creator_order",
        "The linked creator order is not in a confirmable payment state.",
      );
    }

    let orderChanged = false;
    if (!orderAlreadyConfirmed) {
      const [updatedOrder] = await tx
        .update(ordersTable)
        .set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date() })
        .where(and(
          eq(ordersTable.id, organiserOrderId),
          inArray(ordersTable.paymentStatus, ["unpaid", "pending"]),
        ))
        .returning({ id: ordersTable.id });
      if (!updatedOrder) {
        return reject("invalid_creator_order", "The linked creator order changed during confirmation.");
      }
      orderChanged = true;
    }

    let parentChanged = false;
    if (share.organiserPaymentStatus === "pending") {
      const [updatedShare] = await tx
        .update(wholesaleSharesTable)
        .set({ organiserPaymentStatus: "confirmed", organiserPaymentConfirmedAt: new Date() })
        .where(and(
          eq(wholesaleSharesTable.id, share.id),
          eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
        ))
        .returning({ id: wholesaleSharesTable.id });
      if (!updatedShare) {
        return reject("invalid_parent_status", "The shared order payment changed during confirmation.");
      }
      parentChanged = true;
    }

    if (orderChanged) {
      await tx.insert(auditLogsTable).values({
        type: "order",
        level: "info",
        action: "wholesale_share_organiser_order_payment_confirmed",
        message: `Confirmed organiser order payment for shared wholesale order ${share.id}`,
        metadata: {
          source,
          reason: "organiser_platform_payment_confirmed",
          shareId: share.id,
          organiserOrderId,
        },
      });
    }

    if (!parentChanged && !orderChanged) {
      return { kind: "already_confirmed", shareId, organiserOrderId };
    }
    return { kind: "confirmed", shareId, organiserOrderId, orderChanged };
  });
}