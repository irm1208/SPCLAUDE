import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye as EyeIcon,
  Filter,
  Flag,
  FlaskConical,
  Folder,
  Link2,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { fmtMoney, type SampleGB } from "./data";
import { buildOverviewSnapshot } from "./overview-model";
import { ViewSwitcher } from "./OrganiserUi";
import { useOrders } from "./domain/repository-context";
import { toOverviewOrders } from "./domain/order-selectors";

const VIEW_OPTIONS = ["Spreadsheet", "Board", "Calendar", "Timeline"] as const;

const laneMeta = {
  awaiting: { icon: Folder, tone: "purple" },
  paid: { icon: Zap, tone: "orange" },
  packing: { icon: Sparkles, tone: "pink" },
  dispatched: { icon: CheckCircle2, tone: "green" },
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

const STATUS_HERO: Record<SampleGB["status"], { eyebrow: string; live: boolean }> = {
  active: { eyebrow: "Live group buy operations", live: true },
  draft: { eyebrow: "Draft — not yet live", live: false },
  closed: { eyebrow: "Closed group buy", live: false },
  archived: { eyebrow: "Archived group buy", live: false },
};

export default function OverviewTabV3({
  selectedGbId,
  gb,
  memberCount,
  memberLimit,
  dispatchReadyCount,
  onGoto,
}: {
  selectedGbId: string;
  gb: SampleGB;
  memberCount: number;
  memberLimit: number | null;
  dispatchReadyCount: number;
  onGoto: (tab: string) => void;
}) {
  const [activeView, setActiveView] = useState<(typeof VIEW_OPTIONS)[number]>("Board");
  const storedOrders = useOrders();
  const overviewOrders = toOverviewOrders(storedOrders);
  const snapshot = buildOverviewSnapshot(overviewOrders, memberCount, gb.currency);
  const totalOrders = snapshot.board.reduce((total, column) => total + column.orders.length, 0);
  const pendingPayments = storedOrders.filter(order => order.status === "pending").length;
  const confirmedPayments = storedOrders.filter(order => order.status !== "pending" && order.status !== "cancelled").length;
  const capacityPercentage = memberLimit
    ? Math.min(100, Math.round((memberCount / Math.max(1, memberLimit)) * 100))
    : 0;
  const statusHero = STATUS_HERO[gb.status];
  const closesVerb = gb.status === "closed" || gb.status === "archived" ? "Closed" : "Closes";
  const closeLabel = gb.closeDate ? `${closesVerb} ${formatDate(gb.closeDate)}` : "No close date";

  const metrics = [
    {
      label: "Active orders",
      value: String(totalOrders),
      detail: `${confirmedPayments} payment confirmed`,
      tone: "blue",
      icon: ShoppingBag,
    },
    {
      label: "Order value",
      value: fmtMoney(snapshot.revenue || gb.revenue, gb.currency),
      detail: "Across active member orders",
      tone: "navy",
      icon: Banknote,
    },
    {
      label: "Needs payment",
      value: String(pendingPayments),
      detail: pendingPayments ? "Follow-up queue is active" : "Payment queue is clear",
      tone: pendingPayments ? "amber" : "green",
      icon: AlertTriangle,
    },
    {
      label: "Ready to dispatch",
      value: String(dispatchReadyCount),
      detail: dispatchReadyCount ? "Packing can begin now" : "No orders waiting",
      tone: "green",
      icon: PackageCheck,
    },
  ] as const;

  const attentionItems = [
    {
      id: "payments",
      severity: pendingPayments ? "urgent" : "clear",
      icon: AlertTriangle,
      title: pendingPayments ? `${pendingPayments} payment${pendingPayments === 1 ? "" : "s"} awaiting action` : "Payment queue is clear",
      detail: pendingPayments ? "Review proof or send a member reminder." : "Every submitted payment has been handled.",
      action: "Review orders",
      tab: "orders",
    },
    {
      id: "dispatch",
      severity: dispatchReadyCount ? "attention" : "clear",
      icon: Truck,
      title: dispatchReadyCount ? `${dispatchReadyCount} order${dispatchReadyCount === 1 ? "" : "s"} ready to pack` : "Dispatch queue is up to date",
      detail: dispatchReadyCount ? "Parcel stock is available for fulfilment." : "Nothing is waiting for a packing session.",
      action: "Open dispatch",
      tab: "dispatch",
    },
    {
      id: "quality",
      severity: "clear",
      icon: FlaskConical,
      title: "Quality documents",
      detail: "Review COAs and testing records for this group buy.",
      action: "Review quality",
      tab: "labtests",
    },
  ] as const;

  return (
    <div className="ov2-overview ov2-command-center approved-command-overview">
      <section className="ov2-command-hero" aria-labelledby="ov2-command-title">
        <div className="ov2-command-hero-copy">
          <span className="ov2-command-eyebrow">{statusHero.live ? <i aria-hidden="true" /> : null} {statusHero.eyebrow}</span>
          <h1 id="ov2-command-title">{gb.name}</h1>
          <p>One operational view for payments, fulfilment, member demand, and the work that needs attention next.</p>
          <div className="ov2-command-meta">
            <span><CalendarClock aria-hidden="true" /> {closeLabel}</span>
            <span><Users aria-hidden="true" /> {memberCount} member{memberCount === 1 ? "" : "s"}</span>
            <span><CheckCircle2 aria-hidden="true" /> {gb.status}</span>
          </div>
        </div>

        <div className="ov2-command-hero-side">
          {memberLimit ? (
            <>
              <div className="ov2-command-capacity">
                <div><span>Member capacity</span><strong>{memberCount}<small> / {memberLimit}</small></strong></div>
                <b>{capacityPercentage}%</b>
              </div>
              <div className="ov2-command-progress" role="progressbar" aria-label="Member capacity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={capacityPercentage}>
                <span style={{ width: `${capacityPercentage}%` }} />
              </div>
            </>
          ) : (
            <div className="ov2-command-capacity">
              <div><span>Members</span><strong>{memberCount}<small> · no limit</small></strong></div>
            </div>
          )}
          <div className="ov2-command-actions">
            <button type="button" onClick={() => onGoto("orders")}>Review orders <ArrowRight aria-hidden="true" /></button>
            <button type="button" onClick={() => onGoto("dispatch")}>Open dispatch</button>
            <button
              type="button"
              style={{ gridColumn: "1 / -1" }}
              onClick={() => window.open(`/order?gbId=${encodeURIComponent(selectedGbId)}&preview=1`, "_blank", "noopener")}
            >
              <EyeIcon aria-hidden="true" /> Preview as buyer
            </button>
          </div>
        </div>
      </section>

      <section className="ov2-command-metrics" aria-label="Group buy summary">
        {metrics.map(metric => {
          const Icon = metric.icon;
          return (
            <article className="ov2-command-metric" data-tone={metric.tone} key={metric.label}>
              <span className="ov2-command-metric-icon"><Icon aria-hidden="true" /></span>
              <div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>
            </article>
          );
        })}
      </section>

      <div className="ov2-command-grid">
        <section className="ov2-card ov2-attention-panel">
          <header>
            <div><span className="ov2-section-kicker">Action centre</span><h2>Needs your attention</h2></div>
            <button type="button" onClick={() => onGoto("todos")}>View todos <ArrowRight aria-hidden="true" /></button>
          </header>
          <div className="ov2-attention-list">
            {attentionItems.map(item => {
              const Icon = item.icon;
              return (
                <button type="button" className="ov2-attention-row" data-severity={item.severity} key={item.id} onClick={() => onGoto(item.tab)}>
                  <span className="ov2-attention-icon"><Icon aria-hidden="true" /></span>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <em>{item.action}<ArrowRight aria-hidden="true" /></em>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ov2-card ov2-pulse-panel">
          <header><div><span className="ov2-section-kicker">Live workflow</span><h2>Fulfilment pulse</h2></div><strong>{totalOrders}<small> active</small></strong></header>
          <div className="ov2-pulse-stages">
            {snapshot.board.map(column => (
              <div className="ov2-pulse-stage" data-tone={laneMeta[column.id].tone} key={column.id}>
                <div><span>{column.label}</span><strong>{column.orders.length}</strong></div>
                <div className="ov2-pulse-track"><span style={{ width: `${Math.max(8, (column.orders.length / Math.max(1, totalOrders)) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <footer><span><i /> Intake</span><span><i /> Paid</span><span><i /> Packing</span><span><i /> Dispatched</span></footer>
        </section>
      </div>

      <section className="ov2-pipeline-section">
        <div className="ov2-pipeline-heading">
          <div><span className="ov2-section-kicker">Order workspace</span><h2>Live order pipeline</h2><p>Move from member intake to dispatch without losing context.</p></div>
          <div className="ov2-board-toolbar">
            <ViewSwitcher options={VIEW_OPTIONS} active={activeView} onChange={value => setActiveView(value as (typeof VIEW_OPTIONS)[number])} />
            <button type="button" className="ov2-toolbar-action"><SlidersHorizontal aria-hidden="true" /> Widgets</button>
            <button type="button" className="ov2-toolbar-action"><Filter aria-hidden="true" /> Filter</button>
          </div>
        </div>

        {activeView === "Board" ? (
          <div className="ov2-order-board">
            {snapshot.board.map(column => {
              const LaneIcon = laneMeta[column.id].icon;
              return (
                <section className="ov2-board-column" key={column.id} data-tone={laneMeta[column.id].tone}>
                  <header><LaneIcon aria-hidden="true" /><h2>{column.label}</h2><span>{column.orders.length}</span><button type="button" aria-label={`More ${column.label} actions`}>•••</button></header>
                  {column.id === "packing" && dispatchReadyCount > 0 ? (
                    <button type="button" className="ov2-dispatch-note" onClick={() => onGoto("dispatch")}>
                      <Truck aria-hidden="true" /><span><strong>{dispatchReadyCount} ready to dispatch</strong><small>Review selected parcel stock</small></span>
                    </button>
                  ) : null}
                  <div className="ov2-column-orders">
                    {column.orders.length ? column.orders.map((order, index) => (
                      <article className="ov2-order-card" key={order.id}>
                        <div className="ov2-order-meta"><span><Link2 aria-hidden="true" /> {order.id}</span><span data-priority={index === 0 ? "urgent" : "normal"}><Flag aria-hidden="true" />{index === 0 ? "Urgent" : "Normal"}</span></div>
                        <h3>{order.memberName}</h3>
                        <p>{order.products.join(" · ")}</p>
                        <div className="ov2-order-due"><CalendarDays aria-hidden="true" /> Added {formatDate(order.createdAt)}</div>
                        <footer><span className="ov2-member-dot" aria-hidden="true">{order.memberName.slice(0, 1)}</span><span><MessageCircle aria-hidden="true" /> {index + 1}</span><strong>{fmtMoney(order.total, gb.currency)}</strong></footer>
                      </article>
                    )) : <div className="ov2-empty-column">No orders in this stage.</div>}
                  </div>
                </section>
              );
            })}
          </div>
        ) : activeView === "Spreadsheet" ? (
          <div className="ov2-card ov2-overview-table-wrap">
            <table className="ov2-overview-table">
              <thead><tr><th>Order</th><th>Member</th><th>Products</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>{overviewOrders.map(order => <tr key={order.id}><td>{order.id}</td><td>{order.memberName}</td><td>{order.products.join(", ")}</td><td>{order.status}</td><td>{fmtMoney(order.total, gb.currency)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <div className="ov2-card ov2-alt-view">
            {activeView === "Calendar" ? <CalendarDays aria-hidden="true" /> : <CircleDollarSign aria-hidden="true" />}
            <div><h2>{activeView} view</h2><p>{activeView === "Calendar" ? "Order intake and due dates are grouped by day." : "Order progress is arranged from intake through delivery."}</p></div>
          </div>
        )}
      </section>

      <div className="sr-only" aria-live="polite">{activeView} view selected for {selectedGbId}</div>
    </div>
  );
}
