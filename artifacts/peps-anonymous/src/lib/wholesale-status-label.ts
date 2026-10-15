/** Presentation only: persisted order statuses and fulfilment transitions stay unchanged. */
export function wholesaleStatusLabel(label: string, orderType?: string | null): string {
  if (orderType !== "wholesale" && orderType !== "wholesale_shared") return label;
  if (label === "Processing" || label === "Processed") return "Order received by Vendor";
  return label.replace(/^Part processed(?= \()/, "Part received by Vendor");
}

export function submittedTimelineLabel(orderType?: string | null): string {
  return orderType === "wholesale" || orderType === "wholesale_shared" ? "Submitted" : "Ordered";
}
