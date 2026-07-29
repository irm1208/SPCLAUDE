export interface TopbarContextInput {
  status?: string | null;
  memberCount?: number | null;
  orderCount?: number | null;
}

export interface TopbarContextLabels {
  statusLabel: string;
  statusTone: "active" | "neutral";
  memberLabel: string;
  orderLabel: string;
}

function statusPresentation(status: string | null | undefined): Pick<TopbarContextLabels, "statusLabel" | "statusTone"> {
  switch (status?.trim().toLowerCase()) {
    case "active":
    case "open":
      return { statusLabel: "Open", statusTone: "active" };
    case "draft":
      return { statusLabel: "Draft", statusTone: "neutral" };
    case "closed":
      return { statusLabel: "Closed", statusTone: "neutral" };
    case "archived":
      return { statusLabel: "Archived", statusTone: "neutral" };
    default:
      return { statusLabel: "Group buy", statusTone: "neutral" };
  }
}

function countPresentation(count: number | null | undefined): string {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return "—";
  return Math.floor(count).toLocaleString("en-GB");
}

export function buildTopbarContext(input: TopbarContextInput): TopbarContextLabels {
  return {
    ...statusPresentation(input.status),
    memberLabel: countPresentation(input.memberCount),
    orderLabel: countPresentation(input.orderCount),
  };
}
