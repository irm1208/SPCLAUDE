interface ReceiptShippingNotice {
  vendorShippingIsTbd?: boolean;
  isWholesale?: boolean;
}

interface CurrentGroupShipping {
  vendorShippingEnabled: boolean;
  vendorShippingAmount: number | null;
}

export function shouldShowSuccessVendorShippingWarning(
  receipt: ReceiptShippingNotice | null,
  currentGroup: CurrentGroupShipping | null | undefined,
): boolean {
  if (!receipt || receipt.isWholesale || receipt.vendorShippingIsTbd !== true) {
    return false;
  }
  // The receipt is a historical snapshot, not authority to keep a notice enabled.
  // This only controls the banner; it never changes the order's charges.
  if (currentGroup && (
    !currentGroup.vendorShippingEnabled || currentGroup.vendorShippingAmount != null
  )) {
    return false;
  }
  return true;
}
