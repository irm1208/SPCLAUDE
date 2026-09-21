export type OrganiserPaymentAutoDecision =
  | { autoConfirm: true }
  | {
      autoConfirm: false;
      reason:
        | "invalid_amount"
        | "credits_applied"
        | "unsupported_currency"
        | "not_fully_verified";
    };

export function evaluateOrganiserPaymentAutoConfirmation(input: {
  amountDue: number;
  totalCreditsApplied: number;
  currency: string;
  verifiedAmount: number | null;
}): OrganiserPaymentAutoDecision {
  if (!Number.isFinite(input.amountDue) || input.amountDue <= 0) {
    return { autoConfirm: false, reason: "invalid_amount" };
  }
  if (input.totalCreditsApplied > 0) {
    return { autoConfirm: false, reason: "credits_applied" };
  }
  if (!["USDT", "USDC"].includes(input.currency.trim().toUpperCase())) {
    return { autoConfirm: false, reason: "unsupported_currency" };
  }
  if (
    input.verifiedAmount === null
    || !Number.isFinite(input.verifiedAmount)
    || input.verifiedAmount + 0.000001 < input.amountDue
  ) {
    return { autoConfirm: false, reason: "not_fully_verified" };
  }
  return { autoConfirm: true };
}