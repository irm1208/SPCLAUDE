import { Bell, TrendingUp, MessageSquare, Users, CheckCircle2 } from "lucide-react";
import { V2_CARD_BORDER } from "./theme";
import { loadGb, saveGb } from "./storage";

// ─── Activity Feed for Overview ──────────────────────────────────────────────
// "Since last visit" summary at the top of the dashboard. Computes deltas from
// badge counts and renders a dismissable card with a timestamp.

interface ActivityItem {
  icon: typeof Bell;
  text: string;
  color: string;
}

interface ActivityFeedProps {
  selectedGbId?: string;
}

export default function ActivityFeed({ selectedGbId }: ActivityFeedProps) {
  const lastSeen = loadGb<number>(selectedGbId, "lastActivitySeen", Date.now() - 86400000); // default: 1 day ago
  const now = Date.now();

  // Load current state
  const tickets = loadGb<Array<{ id: string; unreadCount?: number; updatedAt: string }>>(selectedGbId, "tickets", [], "v2Tickets");
  const testingRound = loadGb<{ status?: string } | null>(selectedGbId, "testingRound", null, "v2TestingRound");
  const pendingContribs = loadGb<any[]>(selectedGbId, "testingPendingContribs", [], "v2TestingPendingContribs");
  const orders = loadGb<Array<{ status: string; createdAt: string }>>(selectedGbId, "orders", [], "orders");

  // Compute activity since lastSeen
  const newOrders = orders.filter(o => new Date(o.createdAt).getTime() > lastSeen).length;
  const newTicketReplies = tickets.filter(t => new Date(t.updatedAt).getTime() > lastSeen && (t.unreadCount ?? 0) > 0).length;
  const confirmedPayments = orders.filter(o => o.status === "confirmed" && new Date(o.createdAt).getTime() > lastSeen).length;
  const newPendingContribs = pendingContribs.length; // assume these are all new if they exist

  const items: ActivityItem[] = [];
  if (newOrders > 0) items.push({ icon: TrendingUp, text: `${newOrders} new order${newOrders !== 1 ? "s" : ""}`, color: "#16A34A" });
  if (newTicketReplies > 0) items.push({ icon: MessageSquare, text: `${newTicketReplies} ticket ${newTicketReplies !== 1 ? "replies" : "reply"}`, color: "var(--t-blue)" });
  if (confirmedPayments > 0) items.push({ icon: CheckCircle2, text: `${confirmedPayments} payment${confirmedPayments !== 1 ? "s" : ""} confirmed`, color: "#16A34A" });
  if (newPendingContribs > 0) items.push({ icon: Users, text: `Testing pool: ${newPendingContribs} pending contribution${newPendingContribs !== 1 ? "s" : ""}`, color: "#D97706" });

  if (items.length === 0) return null;

  const handleDismiss = () => {
    saveGb(selectedGbId, "lastActivitySeen", now);
    window.location.reload(); // cheap way to re-render; in real app this'd be state
  };

  const timeLabel = (() => {
    const diffHours = Math.floor((now - lastSeen) / 3600000);
    if (diffHours < 1) return "in the last hour";
    if (diffHours < 24) return `in the last ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    const diffDays = Math.floor(diffHours / 24);
    return `since ${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  })();

  return (
    <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50" style={{ border: "1px solid #DBEAFE" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
          <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Recent Activity</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[11px] font-semibold hover:underline"
          style={{ color: "var(--t-blue)" }}
        >
          Mark as read
        </button>
      </div>
      <p className="text-[11px] mb-2" style={{ color: "var(--t-subtle)" }}>{timeLabel}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <Icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
              <span className="text-[13px]" style={{ color: "var(--t-text)" }}>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
