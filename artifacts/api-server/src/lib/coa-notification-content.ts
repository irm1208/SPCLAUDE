export const COA_EVENTS = ["invited", "paid", "processing", "completed"] as const;
export type CoaEvent = typeof COA_EVENTS[number];
export const COA_EMAIL_VARS = [
  { key: "order_code", description: "Order code" },
  { key: "fee", description: "Separate COA fee" },
  { key: "currency", description: "COA fee currency" },
  { key: "message", description: "COA lifecycle update" },
  { key: "order_url", description: "Member's COA request link" },
];
const messages: Record<CoaEvent, string> = {
  invited: "Admin has invited you to request a COA. Open your order to enter your details and review the separate COA fee.",
  paid: "Your separate COA payment has been received. No further COA payment is needed.",
  processing: "Your COA request is now being processed.",
  completed: "Admin has marked your COA request completed. Open your order to review the request and any attached files.",
};
export const escapeCoaHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function coaNotificationContent(event: CoaEvent, request: { fee: string; currency: string },
  order: { id: string; code: string }, baseUrl = "") {
  const vars = {
    order_code: escapeCoaHtml(order.code), fee: escapeCoaHtml(request.fee), currency: escapeCoaHtml(request.currency),
    message: messages[event],
    // Relative links work in the feed; external channels require absolute URLs.
    order_url: `${escapeCoaHtml(baseUrl.replace(/\/+$/, ""))}/account/orders/${encodeURIComponent(order.id)}#coa`,
  };
  return { vars, text: `<b>COA request · ${vars.order_code}</b>\n${vars.message}\n`
    + `COA fee: ${vars.fee} ${vars.currency}\n\n<a href="${vars.order_url}">View COA request →</a>` };
}
