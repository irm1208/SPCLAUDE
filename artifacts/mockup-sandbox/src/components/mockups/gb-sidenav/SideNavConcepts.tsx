import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileText,
  FlaskConical,
  Globe,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  Plus,
  QrCode,
  Search,
  SendHorizonal,
  Settings,
  Shield,
  ShoppingBag,
  Truck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

/* ── Real nav structure from organiser-v2/nav.ts ─────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "todos", label: "Todo List", icon: ListTodo, count: 4 },
      { id: "members", label: "Members", icon: UserRound, count: 42 },
    ],
  },
  {
    label: "Orders",
    items: [
      { id: "orders", label: "Orders", icon: ShoppingBag, count: 12 },
      { id: "broadcast", label: "Broadcast", icon: SendHorizonal },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { id: "parcels", label: "Parcels", icon: Truck, count: 3 },
      { id: "dispatch", label: "Dispatch", icon: FileText },
      { id: "qrcodes", label: "QR Codes", icon: QrCode },
      { id: "reshippers", label: "Package Forwarders", icon: Users },
      { id: "legs", label: "Intl Forwarding", icon: Globe },
      { id: "shipping", label: "Shipping Rates", icon: Globe },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "pnl", label: "Profit & Loss", icon: BarChart3 },
      { id: "labtests", label: "Vendor COAs", icon: FileCheck },
      { id: "testinggroups", label: "Lab Testing Pool", icon: FlaskConical },
      { id: "summary", label: "Summary", icon: ClipboardList },
    ],
  },
  {
    label: "Support",
    items: [{ id: "tickets", label: "Tickets", icon: MessageSquare, count: 5 }],
  },
  {
    label: "Settings",
    items: [
      { id: "settings", label: "GB Settings", icon: Settings },
      { id: "products", label: "Products", icon: Package },
      { id: "rules", label: "Rules", icon: Shield },
    ],
  },
];

const MOBILE_TABS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag, count: 12 },
  { id: "dispatch", label: "Dispatch", icon: FileText },
  { id: "members", label: "Members", icon: UserRound },
];

/* ── Regrouped IA options for Navy Command ───────────────────────────────────
   Same 19 destinations, categorised by what the organiser is doing rather than
   by feature name. An unlabelled first group renders as pinned items. */

// Option A — "Daily essentials pinned, grouped by job"
const GROUPS_A: NavGroup[] = [
  {
    label: "", // pinned, no header
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "todos", label: "Todo List", icon: ListTodo, count: 4 },
    ],
  },
  {
    label: "Group buy",
    items: [
      { id: "orders", label: "Orders", icon: ShoppingBag, count: 12 },
      { id: "members", label: "Members", icon: UserRound, count: 42 },
      { id: "products", label: "Products", icon: Package },
    ],
  },
  {
    label: "Shipping",
    items: [
      { id: "parcels", label: "Parcels", icon: Truck, count: 3 },
      { id: "dispatch", label: "Dispatch", icon: FileText },
      { id: "qrcodes", label: "QR Codes", icon: QrCode },
      { id: "reshippers", label: "Package Forwarders", icon: Users },
      { id: "legs", label: "Intl Forwarding", icon: Globe },
      { id: "shipping", label: "Shipping Rates", icon: ClipboardList },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "broadcast", label: "Broadcast", icon: SendHorizonal },
      { id: "tickets", label: "Tickets", icon: MessageSquare, count: 5 },
    ],
  },
  {
    label: "Money & testing",
    items: [
      { id: "pnl", label: "Profit & Loss", icon: BarChart3 },
      { id: "summary", label: "Supplier Summary", icon: ClipboardList },
      { id: "labtests", label: "Vendor COAs", icon: FileCheck },
      { id: "testinggroups", label: "Lab Testing Pool", icon: FlaskConical },
    ],
  },
  {
    label: "Setup",
    items: [
      { id: "settings", label: "GB Settings", icon: Settings },
      { id: "rules", label: "Rules", icon: Shield },
    ],
  },
];

// Option B — "People-first" (everything member-facing together) — CHOSEN
const GROUPS_B: NavGroup[] = [
  {
    label: "",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "todos", label: "Tasks", icon: ListTodo, count: 4 },
    ],
  },
  {
    label: "People",
    items: [
      { id: "members", label: "Members", icon: UserRound, count: 42 },
      { id: "tickets", label: "Tickets", icon: MessageSquare, count: 5 },
      { id: "broadcast", label: "Announcements", icon: SendHorizonal },
    ],
  },
  {
    label: "Orders & money",
    items: [
      { id: "orders", label: "Orders", icon: ShoppingBag, count: 12 },
      { id: "summary", label: "Supplier Summary", icon: ClipboardList },
      { id: "pnl", label: "Profit & Loss", icon: BarChart3 },
    ],
  },
  {
    label: "Shipping",
    items: [
      { id: "parcels", label: "Incoming Parcels", icon: Truck, count: 3 },
      { id: "dispatch", label: "Dispatch", icon: FileText },
      { id: "qrcodes", label: "Shipping Labels", icon: QrCode },
      { id: "reshippers", label: "Package Forwarders", icon: Users },
      { id: "legs", label: "International Routes", icon: Globe },
      { id: "shipping", label: "Shipping Rates", icon: ClipboardList },
    ],
  },
  {
    label: "Quality",
    items: [
      { id: "labtests", label: "Vendor COAs", icon: FileCheck },
      { id: "testinggroups", label: "Lab Testing Pool", icon: FlaskConical },
    ],
  },
  {
    label: "Setup",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "products", label: "Products", icon: Package },
      { id: "rules", label: "Rules & Info", icon: Shield },
    ],
  },
];

const ACTIVE = "overview";
const GB_NAME = "Winter Peptide Run 2025";

/* Salt & Peps brand mark — mirrors BrandMark in peps-anonymous PageLayout.tsx */
const BRAND_BLUE = "#0176D3";
function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center shrink-0 select-none text-white"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: BRAND_BLUE,
        fontFamily: "'DM Serif Display', Georgia, serif",
        fontSize: size * 0.3,
        letterSpacing: "-0.02em",
      }}
    >
      S&amp;P
    </div>
  );
}

/* ── Shared skeleton content (so focus stays on the nav) ─────────────────── */

function SkeletonContent({ dark = false }: { dark?: boolean }) {
  const card = dark ? "bg-white/[0.06]" : "bg-white shadow-sm";
  const bar = dark ? "bg-white/10" : "bg-slate-200";
  return (
    <div className="flex-1 min-w-0 p-5 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className={`h-4 w-48 rounded ${bar}`} />
          <div className={`h-3 w-72 rounded ${bar} opacity-60`} />
        </div>
        <div className="h-8 w-28 rounded-lg bg-blue-600/80" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-20 rounded-xl ${card} p-3 space-y-2`}>
            <div className={`h-2.5 w-16 rounded ${bar} opacity-60`} />
            <div className={`h-5 w-12 rounded ${bar}`} />
          </div>
        ))}
      </div>
      <div className={`h-44 rounded-xl ${card} p-4 space-y-3`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-3 rounded ${bar} opacity-50`} style={{ width: `${85 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

function MobileSkeleton({ dark = false }: { dark?: boolean }) {
  const bar = dark ? "bg-white/10" : "bg-slate-200";
  const card = dark ? "bg-white/[0.06]" : "bg-white shadow-sm";
  return (
    <div className="flex-1 p-4 space-y-3 overflow-hidden">
      <div className={`h-4 w-40 rounded ${bar}`} />
      <div className="grid grid-cols-2 gap-2">
        <div className={`h-16 rounded-xl ${card}`} />
        <div className={`h-16 rounded-xl ${card}`} />
      </div>
      <div className={`h-40 rounded-xl ${card}`} />
    </div>
  );
}

/* ── Frames ──────────────────────────────────────────────────────────────── */

function DesktopFrame({ children, canvas = "bg-[#F4F6F9]" }: { children: React.ReactNode; canvas?: string }) {
  return (
    <div className={`w-full max-w-[860px] h-[560px] rounded-xl border border-slate-300 overflow-hidden flex ${canvas} shadow-lg shrink-0`}>
      {children}
    </div>
  );
}

function MobileFrame({ children, canvas = "bg-[#F4F6F9]" }: { children: React.ReactNode; canvas?: string }) {
  return (
    <div className={`w-[320px] h-[560px] rounded-[28px] border-[6px] border-slate-800 overflow-hidden relative flex flex-col ${canvas} shadow-lg shrink-0`}>
      {children}
    </div>
  );
}

function ConceptSection({
  number,
  name,
  blurb,
  children,
}: {
  number: string;
  name: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="flex items-baseline gap-3">
        <span className="text-sm font-mono text-blue-600 font-semibold">{number}</span>
        <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
        <p className="text-sm text-slate-500">{blurb}</p>
      </header>
      <div className="flex gap-6 items-start flex-wrap">{children}</div>
    </section>
  );
}

/* ── Concept 1 · Navy Command (approved shell, refined) ──────────────────── */

function NavyRow({ item, active }: { item: NavItem; active?: boolean }) {
  const Icon = item.icon;
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] relative ${
        active
          ? "bg-white text-[#1B3164] font-semibold before:absolute before:left-[-8px] before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-[#2D6BCC]"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.count ? (
        <em className={`ml-auto not-italic text-[11px] px-1.5 rounded-full ${active ? "bg-[#2D6BCC] text-white" : "bg-white/15 text-slate-200"}`}>
          {item.count}
        </em>
      ) : null}
    </button>
  );
}

function Concept1Sidebar({ groups = GROUPS_B }: { groups?: NavGroup[] }) {
  return (
    <aside className="w-[236px] shrink-0 flex flex-col text-white" style={{ background: "linear-gradient(180deg, #1B3164 0%, #1B3A7A 55%, #0F1F38 100%)" }}>
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <BrandMark size={30} />
        <div className="leading-tight">
          <strong className="block text-[14px]" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}>Salt &amp; Peps</strong>
          <span className="text-[11px] text-slate-300">GB Organiser</span>
        </div>
        <PanelLeftClose className="w-4 h-4 ml-auto text-slate-400" />
      </div>
      <button className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg bg-white/[0.08] border border-white/10 p-2.5 text-left">
        <span className="w-8 h-8 rounded-md bg-[#2D6BCC] grid place-items-center text-[10px] font-bold shrink-0">W25</span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Active group buy</span>
          <strong className="block text-[12px] truncate">{GB_NAME}</strong>
          <small className="flex items-center gap-1 text-[10px] text-emerald-300">
            <i className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Open · Closes 18 July
          </small>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-3 [scrollbar-width:thin]">
        {groups.map((g, gi) => (
          <div key={g.label || `pinned-${gi}`}>
            {g.label ? (
              <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 mb-1 flex items-center justify-between">
                {g.label} <ChevronDown className="w-3 h-3" />
              </p>
            ) : null}
            <div className={g.label ? "space-y-0.5 pl-2" : "space-y-0.5 pl-2 pt-1"}>
              {g.items.map(it => <NavyRow key={it.id} item={it} active={it.id === ACTIVE} />)}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-1">
        <button className="flex items-center gap-2 text-[12px] text-slate-300 px-2 h-7 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to main dashboard
        </button>
        <div className="flex items-center gap-2 px-2 pt-1">
          <span className="w-7 h-7 rounded-full bg-[#2D6BCC] grid place-items-center text-[10px] font-bold">AM</span>
          <span className="leading-tight min-w-0">
            <strong className="block text-[12px] truncate">Alex Morgan</strong>
            <small className="block text-[10px] text-slate-400">Organiser</small>
          </span>
          <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-400" />
        </div>
      </div>
    </aside>
  );
}

function Concept1Mobile() {
  return (
    <MobileFrame>
      {/* topbar */}
      <div className="h-12 shrink-0 flex items-center gap-3 px-3 text-white" style={{ background: "#1B3164" }}>
        <Menu className="w-5 h-5" />
        <BrandMark size={24} />
        <strong className="text-[13px] truncate">{GB_NAME}</strong>
        <Bell className="w-4 h-4 ml-auto" />
      </div>
      <MobileSkeleton />
      {/* drawer shown open */}
      <div className="absolute inset-0 bg-black/40">
        <div className="absolute left-0 top-0 bottom-0 w-[248px] flex flex-col text-white" style={{ background: "linear-gradient(180deg, #1B3164, #0F1F38)" }}>
          <div className="flex items-center gap-2 px-4 h-12 shrink-0">
            <BrandMark size={24} />
            <strong className="text-[13px]" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}>Salt &amp; Peps</strong>
            <X className="w-4 h-4 ml-auto text-slate-300" />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 space-y-3 pb-3 [scrollbar-width:thin]">
            {GROUPS_B.slice(0, 4).map((g, gi) => (
              <div key={g.label || `pinned-${gi}`}>
                {g.label ? <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 mb-1">{g.label}</p> : null}
                <div className="space-y-0.5">
                  {g.items.map(it => <NavyRow key={it.id} item={it} active={it.id === ACTIVE} />)}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </MobileFrame>
  );
}

/* ── Concept 2 · Ice Rail (light, soft-pill active) ──────────────────────── */

function Concept2Sidebar() {
  return (
    <aside className="w-[224px] shrink-0 flex flex-col bg-white border-r border-slate-200">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white grid place-items-center text-[11px] font-bold">PA</div>
        <div className="leading-tight">
          <strong className="block text-[13px] text-slate-900">GB Organiser</strong>
          <span className="text-[11px] text-emerald-600 flex items-center gap-1">
            <i className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {GB_NAME}
          </span>
        </div>
      </div>
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-slate-100 text-slate-400 text-[12px]">
          <Search className="w-3.5 h-3.5" /> Search… <kbd className="ml-auto text-[10px] border border-slate-300 rounded px-1 bg-white">⌘K</kbd>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 [scrollbar-width:thin]">
        {GROUPS.map(g => (
          <div key={g.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map(it => {
                const Icon = it.icon;
                const active = it.id === ACTIVE;
                return (
                  <button
                    key={it.id}
                    className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] ${
                      active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="truncate">{it.label}</span>
                    {it.count ? (
                      <em className={`ml-auto not-italic text-[11px] px-1.5 rounded-full ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{it.count}</em>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-slate-200 grid place-items-center text-[10px] font-bold text-slate-600">AM</span>
        <strong className="text-[12px] text-slate-800">Alex Morgan</strong>
        <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-400" />
      </div>
    </aside>
  );
}

function Concept2Mobile() {
  return (
    <MobileFrame canvas="bg-slate-50">
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 bg-white border-b border-slate-200">
        <strong className="text-[13px] text-slate-900 truncate">{GB_NAME}</strong>
        <span className="text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 ml-1">Open</span>
        <Search className="w-4 h-4 ml-auto text-slate-400" />
      </div>
      <MobileSkeleton />
      {/* "More" sheet open above bottom tabs */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-2 mb-1 rounded-2xl bg-white shadow-2xl border border-slate-200 p-4">
          <div className="w-9 h-1 rounded-full bg-slate-200 mx-auto mb-3" />
          <div className="grid grid-cols-4 gap-3">
            {[GROUPS[2].items, GROUPS[3].items].flat().slice(0, 8).map(it => {
              const Icon = it.icon;
              return (
                <div key={it.id} className="flex flex-col items-center gap-1 text-center">
                  <span className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-slate-600"><Icon className="w-4.5 h-4.5" /></span>
                  <span className="text-[9px] text-slate-600 leading-tight">{it.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white border-t border-slate-200 flex items-stretch h-14 pb-1">
          {MOBILE_TABS.map(t => {
            const Icon = t.icon;
            const active = t.id === ACTIVE;
            return (
              <button key={t.id} className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "text-blue-600 font-semibold" : "text-slate-400"}`}>
                <Icon className="w-5 h-5" />
                {t.label}
              </button>
            );
          })}
          <button className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-blue-600 font-semibold">
            <MoreHorizontal className="w-5 h-5" /> More
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}

/* ── Concept 3 · Dock & Panel (two-tier icon rail) ───────────────────────── */

const RAIL: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Workspace", icon: LayoutDashboard },
  { label: "Orders", icon: ShoppingBag },
  { label: "Fulfillment", icon: Truck },
  { label: "Insights", icon: BarChart3 },
  { label: "Support", icon: MessageSquare },
  { label: "Settings", icon: Settings },
];

function Concept3Sidebar() {
  return (
    <div className="flex shrink-0">
      <aside className="w-[60px] flex flex-col items-center py-3 gap-1 bg-[#0F1F38] text-slate-400">
        <div className="w-8 h-8 rounded-lg bg-[#2D6BCC] text-white grid place-items-center text-[11px] font-bold mb-2">PA</div>
        {RAIL.map((r, i) => {
          const Icon = r.icon;
          const active = i === 0;
          return (
            <button key={r.label} title={r.label} className={`w-10 h-10 rounded-xl grid place-items-center ${active ? "bg-[#2D6BCC] text-white" : "hover:bg-white/10 hover:text-white"}`}>
              <Icon className="w-4.5 h-4.5" />
            </button>
          );
        })}
        <span className="mt-auto w-8 h-8 rounded-full bg-white/10 grid place-items-center text-[10px] font-bold text-white">AM</span>
      </aside>
      <aside className="w-[190px] flex flex-col bg-white border-r border-slate-200">
        <div className="px-4 h-14 flex flex-col justify-center border-b border-slate-100 leading-tight">
          <strong className="text-[13px] text-slate-900">Workspace</strong>
          <span className="text-[11px] text-slate-500 truncate">{GB_NAME}</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {[...GROUPS[0].items, ...GROUPS[1].items].map(it => {
            const Icon = it.icon;
            const active = it.id === ACTIVE;
            return (
              <button key={it.id} className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] ${active ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="truncate">{it.label}</span>
                {it.count ? <em className="ml-auto not-italic text-[11px] text-slate-400">{it.count}</em> : null}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button className="w-full h-8 rounded-lg bg-[#2D6BCC] text-white text-[12px] font-semibold flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create order
          </button>
        </div>
      </aside>
    </div>
  );
}

function Concept3Mobile() {
  return (
    <MobileFrame>
      <div className="h-12 shrink-0 flex items-center gap-3 px-3 bg-[#0F1F38] text-white">
        <div className="w-7 h-7 rounded-lg bg-[#2D6BCC] grid place-items-center text-[10px] font-bold">PA</div>
        <strong className="text-[13px] truncate">{GB_NAME}</strong>
        <Bell className="w-4 h-4 ml-auto" />
      </div>
      {/* group chips */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-2 py-2 flex gap-1.5 overflow-x-auto">
        {RAIL.map((r, i) => {
          const Icon = r.icon;
          return (
            <button key={r.label} className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] whitespace-nowrap ${i === 0 ? "bg-[#0F1F38] text-white" : "bg-slate-100 text-slate-600"}`}>
              <Icon className="w-3.5 h-3.5" /> {r.label}
            </button>
          );
        })}
      </div>
      {/* items for active group */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-1.5 flex gap-4">
        {GROUPS[0].items.map(it => (
          <button key={it.id} className={`text-[12px] py-1.5 border-b-2 ${it.id === ACTIVE ? "border-[#2D6BCC] text-slate-900 font-semibold" : "border-transparent text-slate-500"}`}>
            {it.label}
          </button>
        ))}
      </div>
      <MobileSkeleton />
    </MobileFrame>
  );
}

/* ── Concept 4 · Floating Glass ──────────────────────────────────────────── */

function Concept4Sidebar() {
  return (
    <aside className="w-[240px] shrink-0 p-3">
      <div className="h-full rounded-2xl bg-white/70 backdrop-blur border border-white/60 shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 h-14">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center text-[11px] font-bold shadow">W25</div>
          <div className="leading-tight min-w-0">
            <strong className="block text-[13px] text-slate-900 truncate">{GB_NAME}</strong>
            <span className="text-[10px] text-emerald-600 flex items-center gap-1">
              <i className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open · Closes 18 July
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-4 [scrollbar-width:thin]">
          {GROUPS.map(g => (
            <div key={g.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-2 mb-1.5">{g.label}</p>
              <div className="space-y-1">
                {g.items.map(it => {
                  const Icon = it.icon;
                  const active = it.id === ACTIVE;
                  return (
                    <button
                      key={it.id}
                      className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-[13px] transition ${
                        active
                          ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold shadow-md shadow-blue-600/25"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{it.label}</span>
                      {it.count ? (
                        <em className={`ml-auto not-italic text-[11px] px-1.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-slate-200/70 text-slate-500"}`}>{it.count}</em>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-3 mt-0 rounded-xl bg-slate-900 text-white p-3 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-white/15 grid place-items-center text-[10px] font-bold">AM</span>
          <span className="leading-tight min-w-0">
            <strong className="block text-[12px]">Alex Morgan</strong>
            <small className="block text-[10px] text-slate-400">Organiser</small>
          </span>
          <Settings className="w-3.5 h-3.5 ml-auto text-slate-400" />
        </div>
      </div>
    </aside>
  );
}

function Concept4Mobile() {
  return (
    <MobileFrame canvas="bg-gradient-to-b from-indigo-50 via-slate-50 to-blue-50">
      <div className="h-12 shrink-0 flex items-center gap-2 px-4">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center text-[10px] font-bold shadow">W25</div>
        <strong className="text-[13px] text-slate-900 truncate">{GB_NAME}</strong>
        <Bell className="w-4 h-4 ml-auto text-slate-500" />
      </div>
      <MobileSkeleton />
      {/* floating dock */}
      <div className="absolute inset-x-4 bottom-4 h-14 rounded-2xl bg-white/85 backdrop-blur border border-white/70 shadow-2xl flex items-stretch px-1">
        {MOBILE_TABS.map(t => {
          const Icon = t.icon;
          const active = t.id === ACTIVE;
          return (
            <button key={t.id} className="flex-1 grid place-items-center relative">
              <span className={`w-10 h-10 rounded-xl grid place-items-center ${active ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-500"}`}>
                <Icon className="w-5 h-5" />
              </span>
              {t.count && !active ? <em className="absolute top-1 right-3 not-italic text-[9px] bg-rose-500 text-white rounded-full px-1">{t.count}</em> : null}
            </button>
          );
        })}
        <button className="flex-1 grid place-items-center text-slate-500"><MoreHorizontal className="w-5 h-5" /></button>
      </div>
    </MobileFrame>
  );
}

/* ── Concept 5 · Ledger Minimal (typographic) ────────────────────────────── */

function Concept5Sidebar() {
  return (
    <aside className="w-[228px] shrink-0 flex flex-col bg-[#FAF7F2] border-r border-[#E7E0D3]">
      <div className="px-5 pt-5 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8A7F6A]">Peps Anonymous</p>
        <h3 className="text-[17px] text-[#2A2418] leading-snug mt-1" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          {GB_NAME}
        </h3>
        <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1.5">
          <i className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" /> Open — closes 18 July
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 [scrollbar-width:thin]">
        {GROUPS.map(g => (
          <div key={g.label} className="border-t border-[#E7E0D3] pt-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8A7F6A] mb-1.5">{g.label}</p>
            <div>
              {g.items.map(it => {
                const active = it.id === ACTIVE;
                return (
                  <button
                    key={it.id}
                    className={`w-full flex items-baseline gap-2 py-[5px] text-left text-[13px] ${
                      active ? "text-[#2A2418] font-bold" : "text-[#5C523F] hover:text-[#2A2418]"
                    }`}
                  >
                    {active ? <span className="w-3 h-[2px] bg-[#B0421F] rounded-full self-center shrink-0" /> : <span className="w-3 shrink-0" />}
                    <span className="truncate">{it.label}</span>
                    {it.count ? <em className="ml-auto not-italic text-[11px] text-[#B0421F] font-semibold">{it.count}</em> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-[#E7E0D3] text-[12px] text-[#5C523F]">
        Alex Morgan · <span className="underline decoration-dotted">Account</span>
      </div>
    </aside>
  );
}

function Concept5Mobile() {
  return (
    <MobileFrame canvas="bg-[#FAF7F2]">
      <div className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-[#E7E0D3]">
        <strong className="text-[13px] text-[#2A2418]" style={{ fontFamily: "Georgia, serif" }}>W25 · Organiser</strong>
        <Menu className="w-5 h-5 text-[#5C523F]" />
      </div>
      {/* fullscreen typographic menu shown open */}
      <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
        {GROUPS.slice(0, 4).map(g => (
          <div key={g.label} className="border-b border-[#E7E0D3] py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8A7F6A] mb-1">{g.label}</p>
            {g.items.map(it => {
              const active = it.id === ACTIVE;
              return (
                <button key={it.id} className={`w-full flex items-center py-1.5 text-left text-[16px] ${active ? "text-[#2A2418] font-bold" : "text-[#5C523F]"}`} style={{ fontFamily: "Georgia, serif" }}>
                  {it.label}
                  {it.count ? <em className="ml-auto not-italic text-[12px] text-[#B0421F] font-sans font-semibold">{it.count}</em> : null}
                  {active ? <ChevronRight className="ml-2 w-4 h-4 text-[#B0421F]" /> : null}
                </button>
              );
            })}
          </div>
        ))}
        <p className="text-[11px] text-[#8A7F6A] pt-4">Alex Morgan · Organiser</p>
      </div>
    </MobileFrame>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function SideNavConcepts() {
  const [only, setOnly] = useState<number | null>(0);
  const concepts = [
    { n: "01", name: "Navy Command — final", blurb: "✓ Chosen — IA option B with renamed tabs: Tasks, Announcements, Incoming Parcels, Shipping Labels, International Routes, Settings, Rules & Info.", d: <DesktopFrame><Concept1Sidebar groups={GROUPS_B} /><SkeletonContent /></DesktopFrame>, m: <Concept1Mobile /> },
    { n: "01·A", name: "IA option A (not chosen)", blurb: "By job: Group buy / Shipping / Communication / Money & testing / Setup.", d: <DesktopFrame><Concept1Sidebar groups={GROUPS_A} /><SkeletonContent /></DesktopFrame>, m: null },
    { n: "02", name: "Ice Rail", blurb: "Light & airy with soft blue pills, inline search — bottom tabs + “More” sheet on mobile.", d: <DesktopFrame canvas="bg-slate-50"><Concept2Sidebar /><SkeletonContent /></DesktopFrame>, m: <Concept2Mobile /> },
    { n: "03", name: "Dock & Panel", blurb: "Two-tier: dark icon rail for groups, light panel for items — group chips + tabs on mobile.", d: <DesktopFrame><Concept3Sidebar /><SkeletonContent /></DesktopFrame>, m: <Concept3Mobile /> },
    { n: "04", name: "Floating Glass", blurb: "Floating frosted card with gradient active pill — floating dock on mobile.", d: <DesktopFrame canvas="bg-gradient-to-br from-indigo-50 via-slate-100 to-blue-50"><Concept4Sidebar /><SkeletonContent /></DesktopFrame>, m: <Concept4Mobile /> },
    { n: "05", name: "Ledger Minimal", blurb: "Warm, typographic, icon-free — serif headings, fullscreen menu on mobile.", d: <DesktopFrame canvas="bg-[#F5F1E8]"><Concept5Sidebar /><SkeletonContent /></DesktopFrame>, m: <Concept5Mobile /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-8">
      <div className="max-w-[1240px] mx-auto space-y-12">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Salt &amp; Peps · GB Organiser Side Nav</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Final: <strong>Navy Command with IA option B</strong> — pinned Overview &amp; Todos, then
            People / Orders &amp; money / Shipping / Quality / Setup. Same 19 destinations, no email in the profile block.
          </p>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setOnly(null)} className={`text-[12px] px-3 h-7 rounded-full border ${only === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300"}`}>All</button>
            {concepts.map((c, i) => (
              <button key={c.n} onClick={() => setOnly(i)} className={`text-[12px] px-3 h-7 rounded-full border ${only === i ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300"}`}>
                {c.n} {c.name}
              </button>
            ))}
          </div>
        </header>
        {concepts.map((c, i) =>
          only === null || only === i ? (
            <ConceptSection key={c.n} number={c.n} name={c.name} blurb={c.blurb}>
              {c.d}
              {c.m}
            </ConceptSection>
          ) : null,
        )}
      </div>
    </div>
  );
}
