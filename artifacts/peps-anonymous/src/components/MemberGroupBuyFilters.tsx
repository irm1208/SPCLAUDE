import React from "react";
import { MEMBER_GB_FILTERS, filterMemberGroupBuys, type MemberGbFilter } from "@/lib/member-group-buys";

export function MemberGroupBuyFilters({ groups, value, onChange }: {
  groups: { status: string; archived?: boolean }[];
  value: MemberGbFilter;
  onChange: (value: MemberGbFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter group buys">
      {MEMBER_GB_FILTERS.map(filter => (
        <button key={filter.value} type="button" aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
          className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-full text-xs font-semibold transition-colors"
          style={{
            background: value === filter.value ? "#1B3A7A" : "var(--t-surface)",
            color: value === filter.value ? "#FFFFFF" : "var(--t-muted)",
            border: `1px solid ${value === filter.value ? "#1B3A7A" : "var(--t-border)"}`,
          }}>
          {filter.label}
          <span className="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
            style={{ background: value === filter.value ? "rgba(255,255,255,0.16)" : "var(--t-surface2)" }}>
            {filterMemberGroupBuys(groups, filter.value).length}
          </span>
        </button>
      ))}
    </div>
  );
}
