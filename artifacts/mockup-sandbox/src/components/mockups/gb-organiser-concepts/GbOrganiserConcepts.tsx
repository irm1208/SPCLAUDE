import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  FlaskConical,
  Grid2X2,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Upload,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import "./_group.css";

type ConceptId = "atlas" | "signal" | "ledger";
type ViewId = "overview" | "orders" | "dispatch";

const CONCEPTS: Array<{ id: ConceptId; number: string; name: string; description: string; note: string }> = [
  {
    id: "atlas",
    number: "01",
    name: "Atlas Clear",
    description: "Calm, structured and immediately legible.",
    note: "Best all-rounder",
  },
  {
    id: "signal",
    number: "02",
    name: "Signal Room",
    description: "A live fulfilment cockpit for active group buys.",
    note: "Most distinctive",
  },
  {
    id: "ledger",
    number: "03",
    name: "Ledger Studio",
    description: "Warm, exact and built around operational trust.",
    note: "Most premium",
  },
];

const VIEWS: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "dispatch", label: "Dispatch", icon: Truck },
];

const NAV_GROUPS: Array<{ label: string; items: Array<{ id: ViewId | string; label: string; icon: LucideIcon; count?: number }> }> = [
  {
    label: "Workspace",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "tasks", label: "Todo list", icon: ListChecks, count: 4 },
      { id: "orders", label: "Orders", icon: ShoppingBag, count: 4 },
      { id: "members", label: "Members", icon: Users, count: 42 },
    ],
  },
  {
    label: "Fulfilment",
    items: [
      { id: "products", label: "Products", icon: Box },
      { id: "dispatch", label: "Parcels & dispatch", icon: Truck, count: 2 },
      { id: "coas", label: "Vendor COAs", icon: ShieldCheck, count: 2 },
      { id: "testing", label: "Lab testing pool", icon: FlaskConical },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "broadcast", label: "Broadcast", icon: Send },
      { id: "tickets", label: "Tickets", icon: MessageSquareText, count: 3 },
    ],
  },
  {
    label: "Group buy",
    items: [
      { id: "finance", label: "Profit & loss", icon: CircleDollarSign },
      { id: "settings", label: "Settings & rules", icon: Settings2 },
    ],
  },
];

const ORDERS = [
  { id: "ORD-001", date: "10 Jul · 14:30", name: "John D.", user: "john_doe", initials: "JD", products: "Semaglutide 5mg × 2", secondary: "BPC-157 5mg × 1", status: "Paid", tone: "success", payment: "USDT (TRC20)", proof: "TXID verified", shipping: "UK Standard", tracking: "Tracking assigned", total: "£120", country: "United Kingdom" },
  { id: "ORD-002", date: "11 Jul · 09:15", name: "Sarah M.", user: "sarah_m", initials: "SM", products: "Tirzepatide 10mg × 1", secondary: "Single product order", status: "Pending", tone: "warning", payment: "Revolut", proof: "No proof received", shipping: "EU Tracked", tracking: "France", total: "£65", country: "France" },
  { id: "ORD-003", date: "8 Jul · 11:00", name: "Mike F.", user: "mike_fitness", initials: "MF", products: "Semaglutide 5mg × 3", secondary: "Batch SEM-0726", status: "Shipped", tone: "info", payment: "USDT (ERC20)", proof: "TXID verified", shipping: "UK Standard", tracking: "Tracking sent", total: "£135", country: "United Kingdom" },
  { id: "ORD-004", date: "9 Jul · 16:20", name: "Anna P.", user: "anna_p", initials: "AP", products: "BPC-157 5mg × 2", secondary: "Batch BPC-0711", status: "Processing", tone: "blue", payment: "PayPal", proof: "Screenshot proof", shipping: "EU Tracked", tracking: "Germany", total: "£60", country: "Germany" },
];

const MOMENTUM = [
  { day: "15 Jun", paid: 2, fulfilled: 0 },
  { day: "21 Jun", paid: 4, fulfilled: 2 },
  { day: "27 Jun", paid: 7, fulfilled: 4 },
  { day: "3 Jul", paid: 9, fulfilled: 6 },
  { day: "9 Jul", paid: 14, fulfilled: 9 },
  { day: "14 Jul", paid: 18, fulfilled: 13 },
];

const PIPELINE = [
  { label: "Awaiting payment", count: 1, value: "£65", tone: "warning" },
  { label: "Payment confirmed", count: 1, value: "£120", tone: "blue" },
  { label: "Preparing", count: 1, value: "£60", tone: "violet" },
  { label: "Dispatched", count: 1, value: "£135", tone: "success" },
];

function Status({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className="gbc-status" data-tone={tone}><i />{children}</span>;
}

function Avatar({ initials, tone = 0 }: { initials: string; tone?: number }) {
  return <span className="gbc-avatar" data-tone={tone}>{initials}</span>;
}

function ConceptPicker({ concept, onChange }: { concept: ConceptId; onChange: (concept: ConceptId) => void }) {
  return (
    <header className="gbc-gallery-head">
      <div className="gbc-gallery-intro">
        <span>Fresh GB Organiser directions</span>
        <h1>Choose the operating system for your next group buy.</h1>
        <p>Same workflows and group-buy data. Three different ideas about clarity, density and personality.</p>
      </div>
      <div className="gbc-concept-picker" aria-label="Choose concept">
        {CONCEPTS.map(item => (
          <button key={item.id} type="button" data-active={concept === item.id || undefined} onClick={() => onChange(item.id)}>
            <span>{item.number}</span>
            <div><strong>{item.name}</strong><small>{item.description}</small></div>
            <em>{item.note}</em>
            <Check aria-hidden="true" />
          </button>
        ))}
      </div>
    </header>
  );
}

function Sidebar({ view, onView }: { view: ViewId; onView: (view: ViewId) => void }) {
  return (
    <aside className="gbc-sidebar">
      <div className="gbc-brand">
        <span className="gbc-brand-mark"><span /><span /></span>
        <div><small>Peps Anonymous</small><strong>GB Organiser</strong></div>
        <button type="button" aria-label="Collapse navigation"><PanelLeftClose aria-hidden="true" /></button>
      </div>
      <div className="gbc-side-scroll">
        <button type="button" className="gbc-buy-switcher">
          <span>W25</span>
          <div><small>Active group buy</small><strong>Winter Peptide Run 2025</strong></div>
          <ChevronDown aria-hidden="true" />
        </button>
        <nav aria-label="Organiser sections">
          {NAV_GROUPS.map(group => (
            <section className="gbc-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              <div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const selectable = item.id === "overview" || item.id === "orders" || item.id === "dispatch";
                  return (
                    <button
                      type="button"
                      key={item.id}
                      data-active={view === item.id || undefined}
                      onClick={() => selectable && onView(item.id as ViewId)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.count ? <em>{item.count}</em> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </div>
      <div className="gbc-sidebar-foot">
        <button type="button"><ArrowLeft aria-hidden="true" />Back to main dashboard</button>
        <div className="gbc-organiser"><Avatar initials="AM" /><div><strong>Alex Morgan</strong><small>Lead organiser</small></div><MoreHorizontal aria-hidden="true" /></div>
      </div>
    </aside>
  );
}

function Topbar({ view, onSearch }: { view: ViewId; onSearch: () => void }) {
  const title = VIEWS.find(item => item.id === view)?.label ?? "Overview";
  return (
    <header className="gbc-topbar">
      <button type="button" className="gbc-mobile-menu" aria-label="Open navigation"><Menu aria-hidden="true" /></button>
      <nav aria-label="Breadcrumb"><strong>GB Organiser</strong><span>/</span><span>Winter Peptide Run 2025</span><span>/</span><strong>{title}</strong></nav>
      <button type="button" className="gbc-global-search" onClick={onSearch}><Search aria-hidden="true" /><span>Search this group buy</span><kbd>⌘ K</kbd></button>
      <button type="button" className="gbc-top-icon" aria-label="Help"><HelpCircle aria-hidden="true" /></button>
      <button type="button" className="gbc-top-icon" aria-label="Notifications"><Bell aria-hidden="true" /><i /></button>
      <div className="gbc-top-profile"><Avatar initials="AM" /><div><strong>Alex Morgan</strong><small>Lead organiser</small></div></div>
    </header>
  );
}

function PageHeading({
  view,
  onPrimary,
}: {
  view: ViewId;
  onPrimary?: () => void;
}) {
  const copy = view === "overview"
    ? { title: "Good morning, Alex", detail: "Here’s what needs your attention across Winter Peptide Run 2025.", primary: "Add order" }
    : view === "orders"
      ? { title: "Orders", detail: "Manage payment, products, shipping and fulfilment for this group buy.", primary: "Add order" }
      : { title: "Dispatch desk", detail: "Receive parcels, prepare orders and record the final hand-off.", primary: "Start session" };
  return (
    <div className="gbc-page-head">
      <div><h1>{copy.title}</h1><p>{copy.detail}</p></div>
      <Status tone="success">Active · 4 days left</Status>
      <div className="gbc-page-actions">
        <button type="button"><Download aria-hidden="true" />Export</button>
        <button type="button" className="primary" onClick={onPrimary}><Plus aria-hidden="true" />{copy.primary}</button>
      </div>
    </div>
  );
}

function SummaryStrip({ mode = "overview" }: { mode?: ViewId }) {
  const data = mode === "orders"
    ? [
      { label: "Order value", value: "£380", detail: "4 orders · £95 average", icon: WalletCards, tone: "primary" },
      { label: "All orders", value: "4", detail: "Across 3 countries", icon: ShoppingBag, tone: "blue" },
      { label: "Awaiting payment", value: "1", detail: "£65 outstanding", icon: Clock3, tone: "warning" },
      { label: "Ready or shipped", value: "3", detail: "75% progressing", icon: PackageCheck, tone: "success" },
    ]
    : mode === "dispatch"
      ? [
        { label: "Dispatch readiness", value: "74%", detail: "Based on paid orders", icon: Zap, tone: "primary" },
        { label: "Parcels received", value: "3", detail: "48 items available", icon: Box, tone: "blue" },
        { label: "Ready to pack", value: "2", detail: "Addresses verified", icon: ClipboardCheck, tone: "success" },
        { label: "Blocked", value: "1", detail: "Waiting for payment", icon: AlertCircle, tone: "warning" },
      ]
      : [
        { label: "Collected revenue", value: "£925", detail: "↑ 12.4% from last week", icon: WalletCards, tone: "primary" },
        { label: "Members", value: "42", detail: "70% of capacity", icon: Users, tone: "blue" },
        { label: "Active orders", value: "7", detail: "Across four stages", icon: ShoppingBag, tone: "warning" },
        { label: "Ready to send", value: "2", detail: "Payment verified", icon: Truck, tone: "success" },
      ];
  return (
    <section className="gbc-summary-strip" aria-label="Group-buy summary">
      {data.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.article key={item.label} data-tone={item.tone} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }}>
            <div><span>{item.label}</span><Icon aria-hidden="true" /></div>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </motion.article>
        );
      })}
    </section>
  );
}

function MomentumChart({ concept }: { concept: ConceptId }) {
  return (
    <section className="gbc-panel gbc-chart-panel">
      <header className="gbc-panel-head"><div><h2>Order momentum</h2><p>Payment and fulfilment activity</p></div><div className="gbc-segment"><button type="button">7 days</button><button type="button" data-active>30 days</button><button type="button">All time</button></div></header>
      <div className="gbc-chart-summary"><strong>18 orders</strong><span>↑ 4 this week</span><div><i className="paid" />Paid<i className="fulfilled" />Fulfilled</div></div>
      <div className="gbc-chart" aria-label="Orders increased from two to eighteen over the last 30 days">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOMENTUM} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id={`paid-${concept}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--concept-primary)" stopOpacity={0.28} />
                <stop offset="1" stopColor="var(--concept-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--concept-grid)" strokeDasharray="3 3" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--concept-subtle)", fontSize: 9 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--concept-subtle)", fontSize: 9 }} />
            <Tooltip contentStyle={{ border: 0, borderRadius: 10, background: "var(--concept-tooltip)", color: "var(--concept-tooltip-text)", fontSize: 10, boxShadow: "0 10px 25px rgba(0,0,0,.15)" }} />
            <Area type="monotone" dataKey="paid" stroke="var(--concept-primary)" strokeWidth={2.6} fill={`url(#paid-${concept})`} />
            <Line type="monotone" dataKey="fulfilled" stroke="var(--concept-positive)" strokeWidth={2.2} strokeDasharray="5 5" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function AttentionPanel({ onDispatch }: { onDispatch: () => void }) {
  const items = [
    { icon: FileCheck2, title: "Verify vendor COA", detail: "Batch WPR-04 · Quality", time: "Today", tone: "danger" },
    { icon: WalletCards, title: "Chase pending payment", detail: "ORD-002 · Sarah M.", time: "2h", tone: "warning" },
  ];
  return (
    <section className="gbc-panel gbc-attention-panel">
      <header className="gbc-panel-head"><div><h2>Needs your attention</h2><p>Prioritised by operational impact</p></div><button type="button">View todo <ArrowRight aria-hidden="true" /></button></header>
      <div className="gbc-attention-summary"><strong>4</strong><span>open actions</span></div>
      <div className="gbc-attention-list">
        {items.map(item => {
          const Icon = item.icon;
          return <button type="button" key={item.title} data-tone={item.tone}><span><Icon aria-hidden="true" /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.time}</time></button>;
        })}
      </div>
      <button type="button" className="gbc-dispatch-callout" onClick={onDispatch}><Truck aria-hidden="true" /><div><strong>Two orders ready to dispatch</strong><span>Addresses and payment verified</span></div><ArrowRight aria-hidden="true" /></button>
    </section>
  );
}

function Overview({ concept, onView }: { concept: ConceptId; onView: (view: ViewId) => void }) {
  return (
    <motion.div className="gbc-page" key="overview" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
      <PageHeading view="overview" onPrimary={() => onView("orders")} />
      <SummaryStrip />
      <div className="gbc-main-grid"><MomentumChart concept={concept} /><AttentionPanel onDispatch={() => onView("dispatch")} /></div>
      <div className="gbc-bottom-grid">
        <section className="gbc-panel gbc-small-panel"><header className="gbc-panel-head"><div><h2>Next best actions</h2><p>Prioritised for today</p></div><button type="button">Open list <ArrowRight /></button></header><div className="gbc-todo-list"><article><span /><div><strong>Verify vendor COA batch WPR-04</strong><small>Lab & compliance · High priority</small></div><time>Today</time></article><article><span /><div><strong>Print two packing slips</strong><small>Dispatch · Orders are cleared</small></div><time>Ready</time></article></div></section>
        <section className="gbc-panel gbc-small-panel"><header className="gbc-panel-head"><div><h2>Member activity</h2><p>Latest group-buy events</p></div><button type="button">See all <ArrowRight /></button></header><div className="gbc-activity-list"><article><Avatar initials="JD" tone={0} /><div><strong>Jamie D. paid £145</strong><small>Order ORD-005</small></div><time>8m</time></article><article><Avatar initials="SK" tone={2} /><div><strong>Sam K. joined the buy</strong><small>Member #42</small></div><time>36m</time></article></div></section>
        <section className="gbc-panel gbc-readiness"><div><span>Dispatch readiness</span><strong>74%</strong><p>Two paid orders are cleared to pack.</p></div><div className="gbc-readiness-bar"><i /></div><button type="button" onClick={() => onView("dispatch")}>Open dispatch desk <ArrowRight /></button></section>
      </div>
    </motion.div>
  );
}

function Orders({ onOpenOrder }: { onOpenOrder: (order: typeof ORDERS[number]) => void }) {
  const [selected, setSelected] = useState(["ORD-001", "ORD-003"]);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => ORDERS.filter(order => [order.id, order.name, order.user, order.products].some(value => value.toLowerCase().includes(query.toLowerCase()))), [query]);
  const toggleSelected = (id: string) => setSelected(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  return (
    <motion.div className="gbc-page" key="orders" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
      <PageHeading view="orders" />
      <SummaryStrip mode="orders" />
      <section className="gbc-orders-panel">
        <div className="gbc-view-row"><div><button type="button" data-active>All orders <b>4</b></button><button type="button">Needs action <b>1</b></button><button type="button">Ready to dispatch <b>1</b></button></div><button type="button" className="gbc-save-view"><Plus />Save current view</button><div className="gbc-layout-toggle"><button type="button" data-active aria-label="Table view"><Grid2X2 /></button><button type="button" aria-label="Board view"><LayoutDashboard /></button></div></div>
        <div className="gbc-control-row"><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search member, order ID or TXID" /></label><button type="button">Status <ChevronDown /></button><button type="button">Country <ChevronDown /></button><button type="button"><Filter />More filters <b>2</b></button><span>{visible.length} results</span><button type="button" className="push"><Settings2 />Columns</button><button type="button">Newest first <ChevronDown /></button></div>
        <div className="gbc-table-wrap">
          <table aria-label="Group-buy orders"><thead><tr><th><span className="gbc-check" data-on={selected.length === ORDERS.length || undefined} /></th><th>Order</th><th>Member</th><th>Products</th><th>Status</th><th>Payment</th><th>Shipping</th><th>Total</th><th /></tr></thead><tbody>
            {visible.map((order, index) => <tr key={order.id} data-selected={selected.includes(order.id) || undefined} onClick={() => onOpenOrder(order)}><td onClick={event => { event.stopPropagation(); toggleSelected(order.id); }}><span className="gbc-check" data-on={selected.includes(order.id) || undefined} /></td><td><strong>{order.id}</strong><small>{order.date}</small></td><td><div className="gbc-member"><Avatar initials={order.initials} tone={index} /><div><strong>{order.name}</strong><small>@{order.user}</small></div></div></td><td><div className="gbc-products"><strong>{order.products}</strong><small>{order.secondary}</small></div></td><td><Status tone={order.tone}>{order.status}</Status></td><td><strong>{order.payment}</strong><small>{order.proof}</small></td><td><strong>{order.shipping}</strong><small>{order.tracking}</small></td><td><strong className="gbc-total">{order.total}</strong></td><td><MoreHorizontal /></td></tr>)}
          </tbody></table>
        </div>
        <footer className="gbc-table-footer"><span>Showing 1–{visible.length} of {ORDERS.length} group-buy orders</span><div><button type="button">‹</button><button type="button" data-active>1</button><button type="button">›</button></div></footer>
      </section>
      <AnimatePresence>{selected.length ? <motion.div className="gbc-bulk-bar" initial={{ opacity: 0, y: 20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 15, x: "-50%" }}><strong>{selected.length} orders selected</strong><button type="button"><ClipboardCheck />Create task</button><button type="button"><Download />Export</button><button type="button"><Check />Mark paid</button><button type="button" className="primary"><Truck />Mark dispatched</button><button type="button" aria-label="Clear selection" onClick={() => setSelected([])}><X /></button></motion.div> : null}</AnimatePresence>
    </motion.div>
  );
}

function Dispatch() {
  const [stage, setStage] = useState<"receive" | "prepare" | "dispatch">("prepare");
  return (
    <motion.div className="gbc-page" key="dispatch" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
      <PageHeading view="dispatch" />
      <SummaryStrip mode="dispatch" />
      <div className="gbc-dispatch-shell">
        <div className="gbc-stage-rail" role="tablist" aria-label="Dispatch stages">
          {([
            ["receive", "01", "Receive", "Confirm supplier parcels", Box],
            ["prepare", "02", "Prepare", "Match stock to orders", ClipboardCheck],
            ["dispatch", "03", "Dispatch", "Record final hand-off", Truck],
          ] as const).map(([id, number, label, detail, Icon]) => <button type="button" key={id} role="tab" aria-selected={stage === id} onClick={() => setStage(id)}><span>{number}</span><Icon /><div><strong>{label}</strong><small>{detail}</small></div>{stage === id ? <CheckCircle2 /> : <ChevronRight />}</button>)}
        </div>
        <section className="gbc-dispatch-workspace">
          <header><div><span>Current stage · {stage}</span><h2>{stage === "receive" ? "Receive supplier parcels" : stage === "prepare" ? "Prepare dispatch-ready orders" : "Confirm carrier hand-off"}</h2><p>{stage === "prepare" ? "Everything below has verified payment, address and available parcel stock." : "The desk keeps every change recorded against this group buy."}</p></div><button type="button" className="primary"><Zap />Run readiness check</button></header>
          <div className="gbc-work-grid">
            <section className="gbc-queue-panel"><div className="gbc-queue-head"><div><h3>Ready orders</h3><p>Selected automatically from available stock</p></div><Status tone="success">2 cleared</Status></div><div className="gbc-ready-orders">{ORDERS.filter(order => order.id === "ORD-001" || order.id === "ORD-003").map((order, index) => <article key={order.id}><span className="gbc-check" data-on /><Avatar initials={order.initials} tone={index} /><div><strong>{order.name}</strong><small>{order.id} · {order.products}</small></div><Status tone="success">Ready</Status><strong>{order.total}</strong></article>)}</div><button type="button" className="gbc-wide-action"><PackageCheck />Generate two packing slips<ArrowRight /></button></section>
            <aside className="gbc-stock-panel"><header><h3>Parcel stock</h3><span>48 items received</span></header><div className="gbc-stock-list"><article><span>SEM</span><div><strong>Semaglutide 5mg</strong><small>24 received · 5 allocated</small></div><b>19</b></article><article><span>BPC</span><div><strong>BPC-157 5mg</strong><small>14 received · 1 allocated</small></div><b>13</b></article><article><span>TIR</span><div><strong>Tirzepatide 10mg</strong><small>10 received · payment pending</small></div><b>10</b></article></div><div className="gbc-stock-total"><span>Available units</span><strong>42</strong><small>6 allocated to paid orders</small></div></aside>
          </div>
          <footer className="gbc-desk-footer"><div><Avatar initials="AM" /><span>Readiness checked by Alex Morgan · just now</span></div><button type="button">Save session</button><button type="button" className="primary">Continue to dispatch<ArrowRight /></button></footer>
        </section>
      </div>
    </motion.div>
  );
}

function OrderDrawer({ order, onClose }: { order: typeof ORDERS[number] | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {order ? (
        <motion.div className="gbc-drawer-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="gbc-drawer-scrim" aria-label="Close order details" onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" aria-label={`${order.id} details`} initial={{ x: 50 }} animate={{ x: 0 }} exit={{ x: 50 }} transition={{ type: "spring", damping: 28, stiffness: 280 }}>
            <header><Avatar initials={order.initials} /><div><strong>{order.name} · {order.id}</strong><span>@{order.user} · {order.date}</span></div><button type="button" onClick={onClose} aria-label="Close details"><X /></button></header>
            <div className="gbc-drawer-body"><section className="gbc-drawer-total"><div><span>Order total</span><strong>{order.total}</strong></div><Status tone={order.tone}>{order.status}</Status></section><section><h2>Products</h2><article className="gbc-drawer-product"><span>SEM</span><div><strong>{order.products}</strong><small>Current group-buy allocation</small></div><b>{order.total}</b></article></section><section><h2>Group-buy fulfilment</h2><dl><div><dt>Payment</dt><dd>{order.payment}<br />{order.proof}</dd></div><div><dt>Shipping</dt><dd>{order.shipping}<br />{order.tracking}</dd></div><div><dt>Country</dt><dd>{order.country}</dd></div><div><dt>Tracking</dt><dd>{order.status === "Shipped" ? "1Z999AA101…" : "Not dispatched"}</dd></div></dl></section><section><h2>Internal note</h2><p className="gbc-note-card">Payment, stock and delivery context stays attached to the order while you move through the organiser.</p></section></div>
            <footer><button type="button">Edit order</button><button type="button" className="primary">Open full details</button></footer>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CommandDialog({ open, onClose, onView }: { open: boolean; onClose: () => void; onView: (view: ViewId) => void }) {
  return (
    <AnimatePresence>
      {open ? <motion.div className="gbc-command-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button type="button" className="gbc-command-scrim" aria-label="Close search" onClick={onClose} /><motion.section role="dialog" aria-modal="true" aria-label="Search this group buy" initial={{ opacity: 0, y: -18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: .98 }}><label><Search /><input autoFocus placeholder="Search orders, members, parcels or actions" /></label><div><span>Quick navigation</span>{VIEWS.map(item => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => { onView(item.id); onClose(); }}><Icon /><div><strong>{item.label}</strong><small>Open the {item.label.toLowerCase()} workspace</small></div><kbd>↵</kbd></button>; })}</div></motion.section></motion.div> : null}
    </AnimatePresence>
  );
}

export default function GbOrganiserConcepts() {
  const [concept, setConcept] = useState<ConceptId>("atlas");
  const [view, setView] = useState<ViewId>("overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openOrder, setOpenOrder] = useState<typeof ORDERS[number] | null>(null);

  return (
    <div className="gbc-gallery" data-concept={concept}>
      <ConceptPicker concept={concept} onChange={setConcept} />
      <section className="gbc-browser-frame">
        <div className="gbc-browser-bar"><span><i /><i /><i /></span><div>pepsanonymous.com / gborganiser-v2 / {view}</div><MoreHorizontal /></div>
        <div className="gbc-app-shell">
          <Sidebar view={view} onView={setView} />
          <div className="gbc-main-shell">
            <Topbar view={view} onSearch={() => setSearchOpen(true)} />
            <AnimatePresence mode="wait">
              {view === "overview" ? <Overview concept={concept} onView={setView} /> : view === "orders" ? <Orders onOpenOrder={setOpenOrder} /> : <Dispatch />}
            </AnimatePresence>
          </div>
        </div>
      </section>
      <footer className="gbc-gallery-note"><Sparkles aria-hidden="true" /><span><strong>Explore the mockup.</strong> Switch concepts above, use the organiser navigation, click an order row, and compare all three directions before choosing.</span></footer>
      <OrderDrawer order={openOrder} onClose={() => setOpenOrder(null)} />
      <CommandDialog open={searchOpen} onClose={() => setSearchOpen(false)} onView={setView} />
    </div>
  );
}
