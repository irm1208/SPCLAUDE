import {
  AlertTriangle,
  BadgeCheck,
  Coins,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { MemberSummary } from "./members-crm-model";

type SummaryTone = "neutral" | "primary" | "dark";

type SummaryMetric = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: SummaryTone;
};

export function formatMoney(value: number): string {
  return `£${value.toLocaleString("en-GB")}`;
}

export function MemberCrmSummary({ summary }: { summary: MemberSummary }) {
  const metrics: SummaryMetric[] = [
    {
      label: "Members",
      value: summary.memberCount,
      detail: "Unique participants",
      icon: Users,
      tone: "neutral",
    },
    {
      label: "Orders",
      value: summary.orderCount,
      detail: "Across this group buy",
      icon: ShoppingBag,
      tone: "neutral",
    },
    {
      label: "Collected",
      value: formatMoney(summary.totalSpent),
      detail: "Order value to date",
      icon: Coins,
      tone: "primary",
    },
    {
      label: "Payment confirmed",
      value: summary.confirmedMemberCount,
      detail: `of ${summary.memberCount} members`,
      icon: BadgeCheck,
      tone: "neutral",
    },
    {
      label: "Needs attention",
      value: summary.attentionCount,
      detail: "Payment or fulfilment follow-up",
      icon: AlertTriangle,
      tone: "dark",
    },
  ];

  return (
    <section
      className="members-crm__summary"
      aria-labelledby="members-crm-summary-heading"
    >
      <div className="members-crm__summary-heading">
        <div>
          <p className="members-crm__summary-eyebrow">At a glance</p>
          <h2 id="members-crm-summary-heading">Member summary</h2>
        </div>
      </div>

      <div className="members-crm__summary-grid">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => {
          const accessibleSummary = `${label}: ${value}. ${detail}`;

          return (
            <article
              className={`members-crm__metric members-crm__metric--${tone}`}
              key={label}
              aria-label={accessibleSummary}
            >
              <div className="members-crm__metric-label">
                <span>{label}</span>
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
              </div>
              <strong className="members-crm__metric-value">{value}</strong>
              <span className="members-crm__metric-detail">{detail}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
