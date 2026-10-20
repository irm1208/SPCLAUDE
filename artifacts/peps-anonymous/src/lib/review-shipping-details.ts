export interface ReviewShippingDraft {
  groupBuyId: string | null;
  deliveryMethodId: string | null;
  directShippingRequested: boolean;
  additionOfOrderId: string | null;
  orderType: string | null;
  shippingName: string;
  shippingAddress: string;
  shippingCountry: string;
  shippingPhone: string;
  shippingEmail: string;
}

export function reviewShippingRequirements(draft: ReviewShippingDraft) {
  const euPostage = Boolean(draft.groupBuyId && draft.orderType !== "wholesale" && draft.deliveryMethodId?.startsWith("eu-postage-"));
  const show = !draft.additionOfOrderId && Boolean(draft.directShippingRequested || !draft.groupBuyId || euPostage);
  return { show, requireEuContact: show && euPostage && !draft.directShippingRequested };
}

export function validateReviewShippingDetails(draft: ReviewShippingDraft): string | null {
  const { show, requireEuContact } = reviewShippingRequirements(draft);
  if (!show) return null;
  if (!draft.shippingName.trim()) return requireEuContact ? "Please enter your full name for EU delivery" : "Please enter your full name";
  if (!draft.shippingAddress.trim()) return "Please enter your delivery address";
  if (requireEuContact) {
    if (!draft.shippingCountry.trim()) return "Please choose your country for EU delivery";
    if (!/^\+?[\d\s().-]+$/.test(draft.shippingPhone.trim()) || draft.shippingPhone.replace(/\D/g, "").length < 7) {
      return "Please enter a valid mobile number including its country code";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.shippingEmail.trim())) return "Please enter a valid email address for EU delivery";
  }
  return null;
}
