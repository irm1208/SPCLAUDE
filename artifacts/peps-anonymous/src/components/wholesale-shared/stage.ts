import type { WholesaleShareStatus } from "@/hooks/use-wholesale-shares";

export type ShareStage = "building" | "paying" | "done" | "cancelled";

export function shareStage(status: WholesaleShareStatus): ShareStage {
  switch (status) {
    case "open":
      return "building";
    case "locked":
      return "paying";
    case "submitted":
      return "done";
    case "cancelled":
      return "cancelled";
  }
}

export const STAGE_LABEL: Record<ShareStage, string> = {
  building: "Building",
  paying: "Time to pay",
  done: "Order placed",
  cancelled: "Cancelled",
};
