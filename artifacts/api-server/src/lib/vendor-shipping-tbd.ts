type Amount = number | string | null | undefined;

interface VendorShippingOrderContext {
  groupBuyId: string | null | undefined;
  orderType: string | null | undefined;
  directShippingRequested: boolean | null | undefined;
  isAddition: boolean;
}

function appliesToVendorShippingTbd(context: VendorShippingOrderContext): boolean {
  return Boolean(context.groupBuyId)
    && !context.orderType?.startsWith("wholesale")
    && !context.directShippingRequested
    && !context.isAddition;
}

function numericAmount(amount: Amount): number {
  if (amount == null) return 0;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveNewOrderVendorShippingIsTbd(input: VendorShippingOrderContext & {
  configuredAmount: Amount;
  vendorShipping?: Amount;
}): boolean {
  if (!appliesToVendorShippingTbd(input) || numericAmount(input.vendorShipping) > 0) {
    return false;
  }
  return input.configuredAmount == null;
}

export function resolveOrderVendorShippingIsTbd(input: VendorShippingOrderContext & {
  savedState: boolean | null | undefined;
  vendorShipping: Amount;
  configuredAmount: Amount;
}): boolean {
  if (input.savedState != null) return input.savedState;
  if (!appliesToVendorShippingTbd(input) || numericAmount(input.vendorShipping) > 0) {
    return false;
  }
  if (input.configuredAmount == null) return true;
  return numericAmount(input.configuredAmount) !== 0;
}