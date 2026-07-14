import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Flag,
  Folder,
  Link2,
  MessageCircle,
  PanelTop,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { fmtMoney, type SampleGB } from "./data";
import { buildOverviewSnapshot } from "./overview-model";
import { AvatarStack, MetricCard, PageHeader, ViewSwitcher } from "./OrganiserUi";
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

export default function OverviewTabV3({
  selectedGbId,
  gb,
  dispatchReadyCount,
  onGoto,
}: {
  selectedGbId: string;
  gb: SampleGB;
  dispatchReadyCount: number;
  onGoto: (tab: string) => void;
}) {
  const [activeView, setActiveView] = useState<(typeof VIEW_OPTIONS)[number]>("Board");
  const storedOrders = useOrders();
  const overviewOrders = toOverviewOrders(storedOrders);
  const snapshot = buildOverviewSnapshot(overviewOrders, gb.members, gb.currency);
  const totalOrders = snapshot.board.reduce((total, column) => total + column.orders.length, 0);

  return (
    <div className="ov2-overview">
      <PageHeader
        title={gb.name}
        description="Monitor orders, payments, dispatch progress, and member activity. Keep the group buy moving from intake to final delivery."
        status={gb.status}
      >
        <AvatarStack />
      </PageHeader>

      <div className="ov2-analytics-grid">
        <section className="ov2-card ov2-status-card">
          <h2 className="ov2-card-title"><PanelTop aria-hidden="true" /> Order status</h2>
          <div className="ov2-status-values">
            {snapshot.board.map(column => (
              <div key={column.id}>
                <strong>{column.orders.length}</strong>
                <span>{column.label}</span>
              </div>
            ))}
          </div>
          <div className="ov2-segmented-bar" aria-label={`${totalOrders} active orders across four stages`}>
            {snapshot.board.map(column => (
              <span
                key={column.id}
                data-tone={laneMeta[column.id].tone}
                style={{ flexGrow: Math.max(1, column.orders.length) }}
              />
            ))}
          </div>
          <div className="ov2-card-range"><span>{totalOrders} active orders</span><span>{gb.maxMembers} member capacity</span></div>
        </section>

        <MetricCard title="Revenue" value={fmtMoney(snapshot.revenue || gb.revenue, gb.currency)} delta="12.4% this week">
          <div className="ov2-mini-bars" aria-hidden="true">
            {[12, 18, 10, 27, 39, 19, 25].map((height, index) => <span key={index} style={{ height }} data-accent={index === 4 || index === 5 || undefined} />)}
          </div>
        </MetricCard>

        <MetricCard title="Members" value={String(snapshot.members)} delta={`${Math.max(1, gb.members - 37)} new this week`}>
          <div className="ov2-mini-dots" aria-hidden="true">
            {[8, 17, 29, 43, 55, 69, 81].map((left, index) => <span key={left} style={{ left: `${left}%`, bottom: `${9 + index * 4}px` }} />)}
          </div>
        </MetricCard>

        <figure className="ov2-card ov2-trend-card">
          <div className="ov2-trend-heading">
            <h2 className="ov2-card-title"><BarChart3 aria-hidden="true" /> Fulfillment trend <small>(orders)</small></h2>
            <span className="ov2-trend-legend"><i /> Active <i /> Dispatched</span>
          </div>
          <div className="ov2-trend-chart" aria-hidden="true">
            <span className="ov2-axis-labels">60<br />45<br />30<br />15</span>
            <svg viewBox="0 0 560 190" preserveAspectRatio="none">
              <g className="ov2-grid-lines"><line x1="0" y1="24" x2="560" y2="24" /><line x1="0" y1="75" x2="560" y2="75" /><line x1="0" y1="126" x2="560" y2="126" /><line x1="0" y1="177" x2="560" y2="177" /></g>
              <polyline className="ov2-line-purple" points="0,18 78,18 78,31 145,31 145,44 220,44 220,76 278,76 278,101 344,101 344,132 414,132 414,157 490,157 490,181 560,181" />
              <polyline className="ov2-line-orange" points="0,29 65,29 65,41 138,41 138,35 212,35 212,62 292,62 292,91 375,91 375,119 448,119 448,148 522,148 522,177 560,177" />
            </svg>
          </div>
          <figcaption className="sr-only">Active orders trend downward as dispatched orders rise through the fulfillment period.</figcaption>
        </figure>
      </div>

      <div className="ov2-board-toolbar">
        <ViewSwitcher options={VIEW_OPTIONS} active={activeView} onChange={value => setActiveView(value as (typeof VIEW_OPTIONS)[number])} />
        <div>
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

      <div className="sr-only" aria-live="polite">{activeView} view selected</div>
      <div className="sr-only"><Users /> {snapshot.members} members</div>
    </div>
  );
}
