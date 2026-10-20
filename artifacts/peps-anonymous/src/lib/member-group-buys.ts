export const MEMBER_GB_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "completed", label: "Completed" },
] as const;

export type MemberGbFilter = typeof MEMBER_GB_FILTERS[number]["value"];
type MemberGroupBuy = { status: string; archived?: boolean };

/** `archived` is the existing account-owned, reversible completion flag.
 * Never change the shared group-buy lifecycle or member order statuses here.
 */
export function filterMemberGroupBuys<T extends MemberGroupBuy>(groups: T[], filter: MemberGbFilter): T[] {
  return groups.filter(gb => {
    if (filter === "all") return true;
    if (filter === "completed") return !!gb.archived;
    if (gb.archived) return false;
    return gb.status === (filter === "open" ? "active" : "closed");
  });
}
