export class CouponError extends Error {
  constructor(message: string) { super(message); this.name = "CouponError"; }
}
export type CouponPolicy = {
  groupBuyId: string | null;
  isActive: boolean;
  expiresAt: Date | string | null;
  discountType: string;
  discountValue: number | string;
  maxUses: number | null;
  maxUsesPerAccount?: number | null;
  usageCount: number;
  minSubtotal?: number | string | null;
};
export type CouponContext = {
  groupBuyId: string | null;
  productSubtotal: number;
  total: number;
  usesByAccount?: number;
  now?: Date;
};
export function couponQuoteMatches(quoted: unknown, actual: number): boolean {
  return quoted === undefined || (typeof quoted === "number" && Number.isFinite(quoted) && quoted === actual);
}
export function calculateCouponDiscount(coupon: CouponPolicy, context: CouponContext): number {
  const base = coupon.groupBuyId ? context.productSubtotal : context.total;
  const value = Number(coupon.discountValue);
  return Number(Math.min(base, coupon.discountType === "percentage" ? base * value / 100 : value).toFixed(2));
}
export function couponProblem(coupon: CouponPolicy, context: CouponContext): string | null {
  if (coupon.groupBuyId && coupon.groupBuyId !== context.groupBuyId) return "This coupon is only valid for its own group buy";
  if (!coupon.isActive) return "This coupon is disabled";
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= (context.now ?? new Date()).getTime()) return "This coupon has expired";
  if (coupon.maxUses != null && coupon.usageCount >= coupon.maxUses) return "This coupon has reached its total usage limit";
  if (coupon.maxUsesPerAccount != null && (context.usesByAccount ?? 0) >= coupon.maxUsesPerAccount) return "This coupon has reached its per-customer usage limit";
  const value = Number(coupon.discountValue);
  if (!["percentage", "fixed"].includes(coupon.discountType) || !Number.isFinite(value) || value <= 0 || (coupon.discountType === "percentage" && value > 100)) return "Invalid coupon discount";
  if (!Number.isFinite(context.productSubtotal) || context.productSubtotal < 0 || !Number.isFinite(context.total) || context.total < 0) return "Invalid order subtotal";
  if (context.productSubtotal < Number(coupon.minSubtotal ?? 0)) return "The product subtotal is below this coupon's minimum spend";
  if (calculateCouponDiscount(coupon, context) <= 0) return "There is no eligible subtotal to discount";
  return null;
}
export function parseGroupCouponInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CouponError("Invalid coupon settings");
  if (typeof body.code !== "string") throw new CouponError("A coupon code is required");
  const code = body.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new CouponError("Codes must contain 2–40 letters, numbers, underscores or hyphens");
  if (body.discountType !== "percentage" && body.discountType !== "fixed") throw new CouponError("Choose percentage or fixed discount");
  const numeric = (raw: unknown, label: string) => {
    if ((typeof raw !== "number" && typeof raw !== "string") || (typeof raw === "string" && !raw.trim())) throw new CouponError(`${label} must be a number`);
    return Number(raw);
  };
  const value = numeric(body.discountValue, "Discount");
  if (!Number.isFinite(value) || value <= 0 || Number(value.toFixed(2)) <= 0 || value > 99999999.99 || (body.discountType === "percentage" && value > 100)) throw new CouponError("Enter a positive discount; percentages cannot exceed 100");
  const limit = (raw: unknown, fallback: number | null, label: string) => {
    if (raw === undefined) return fallback;
    if (raw === null) return null;
    const number = numeric(raw, label);
    if (!Number.isInteger(number) || number < 1 || number > 2147483647) throw new CouponError(`${label} must be a positive whole number, or blank for unlimited`);
    return number;
  };
  const minSubtotal = numeric(body.minSubtotal ?? 0, "Minimum subtotal");
  if (!Number.isFinite(minSubtotal) || minSubtotal < 0 || minSubtotal > 99999999.99) throw new CouponError("Minimum subtotal must be zero or a positive amount");
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") throw new CouponError("isActive must be a boolean");
  const expiresAt = body.expiresAt == null || body.expiresAt === "" ? null : new Date(String(body.expiresAt));
  if (expiresAt && !Number.isFinite(expiresAt.getTime())) throw new CouponError("Invalid expiry date");
  if (body.description != null && (typeof body.description !== "string" || body.description.length > 500)) throw new CouponError("Description must be at most 500 characters");
  return {
    code, description: typeof body.description === "string" ? body.description.trim() || null : null,
    discountType: body.discountType,
    discountValue: value.toFixed(2),
    maxUses: limit(body.maxUses, null, "Total usage limit"),
    maxUsesPerAccount: limit(body.maxUsesPerAccount, 1, "Per-customer usage limit"),
    minSubtotal: minSubtotal.toFixed(2), expiresAt,
    isActive: body.isActive === undefined ? true : body.isActive,
  };
}
