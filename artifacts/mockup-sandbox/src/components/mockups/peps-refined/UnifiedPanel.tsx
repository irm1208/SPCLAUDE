import React, { useState } from "react";
import {
  Home,
  Droplets,
  ClipboardList,
  BookMarked,
  ShieldAlert,
  Box,
  Hash,
  User,
  ReceiptText,
  MessageCircle,
  ArrowRight,
  Sun,
  Moon,
  Search,
  Plus,
  Minus,
  ChevronRight,
  Check
} from "lucide-react";

// --- Types & Mocks ---

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
}

const NAV_ITEMS_SHOP: NavItem[] = [
  { id: "shop", label: "Lonely Vial", icon: Droplets, active: true },
  { id: "accessories", label: "Accessories", icon: Box },
];

const NAV_ITEMS_TOOLS: NavItem[] = [
  { id: "lab", label: "Lab Reports", icon: ClipboardList },
  { id: "protocols", label: "Protocols", icon: BookMarked },
  { id: "safety", label: "Safety Calc", icon: ShieldAlert },
];

const NAV_ITEMS_EXTRA: NavItem[] = [
  { id: "calculator", label: "Dose Calc", icon: Hash },
];

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", mg: "10", price: "$20.00", inStock: true },
  { id: "8a3f21", name: "Semaglutide 5mg", mg: "5", price: "$18.00", inStock: true },
  { id: "c7d849", name: "BPC-157 5mg", mg: "5", price: "$15.00", inStock: true },
  { id: "e1b293", name: "TB-500 10mg", mg: "10", price: "$22.00", inStock: false },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mg: "2", price: "$12.00", inStock: true },
  { id: "a91c55", name: "Ipamorelin 5mg", mg: "5", price: "$16.00", inStock: true },
];

const RESOURCES = [
  { icon: Droplets, label: "The Lonely Vial", sub: "Single-vial, no minimums" },
  { icon: Box, label: "Accessories", sub: "BAC water, prep kits" },
  { icon: ClipboardList, label: "Lab Reports", sub: "352+ Janoshik CoAs" },
  { icon: BookMarked, label: "Protocols", sub: "30+ peptide guides" },
];

const UTILITIES = [
  { icon: Hash, label: "Dose Calc" },
  { icon: ShieldAlert, label: "Endotoxin" },
  { icon: Search, label: "Lookup" },
];

// --- Tokens ---
const C = {
  bg: "#ffffff",
  surface: "#ffffff",
  surface2: "#f8fafc",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  text: "#0f172a",
  textMid: "#475569",
  textMuted: "#64748b",
  textGhost: "#94a3b8",
  blue: "#2D6BCC",
  blueBg: "rgba(45,107,204,0.08)",
  darkBlue: "#1B3A7A",
  green: "#16A34A",
  greenBg: "rgba(34,197,94,0.1)",
  greenBorder: "rgba(34,197,94,0.25)",
  red: "#dc2626",
};

// --- Components ---

function Sidebar() {
  const NavButton = ({ item }: { item: NavItem }) => (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors text-left ${
        item.active ? "font-semibold" : "font-medium hover:bg-slate-50"
      }`}
      style={{
        background: item.active ? C.blueBg : "transparent",
        color: item.active ? C.darkBlue : C.textMid,
      }}
    >
      <item.icon
        className="w-4 h-4 shrink-0"
        strokeWidth={item.active ? 2.25 : 1.75}
        style={{ color: item.active ? C.blue : C.textGhost }}
      />
      {item.label}
    </button>
  );

  const NavDivider = () => <div className="h-px mx-2 my-1.5" style={{ background: C.border }} />;

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 w-[240px] flex-col z-30"
      style={{ background: "#f8fafc", borderRight: `1px solid ${C.border}` }}
    >
      {/* User profile block */}
      <button
        className="flex items-center gap-3 px-4 py-4 shrink-0 text-left transition-colors hover:bg-black/[0.02]"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-white text-[11px] select-none"
          style={{ background: `linear-gradient(135deg, ${C.darkBlue} 0%, ${C.blue} 100%)` }}
        >
          SP
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight truncate" style={{ color: C.text }}>Salt &amp; Peps</p>
          <p className="text-[11px] leading-tight" style={{ color: C.textGhost }}>@pepanon</p>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2.5">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left hover:bg-slate-50"
          style={{ color: C.textMid }}
        >
          <Home className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: C.textGhost }} />
          Home
        </button>

        <NavDivider />
        {NAV_ITEMS_SHOP.map(item => <NavButton key={item.id} item={item} />)}

        <NavDivider />
        {NAV_ITEMS_TOOLS.map(item => <NavButton key={item.id} item={item} />)}

        <NavDivider />
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left hover:bg-slate-50"
          style={{ color: C.textMid }}
        >
          <ReceiptText className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: C.textGhost }} />
          My Orders
        </button>
        {NAV_ITEMS_EXTRA.map(item => <NavButton key={item.id} item={item} />)}
      </nav>

      {/* Promo card */}
      <div className="px-3 pb-4 shrink-0">
        <div
          className="rounded-xl p-4 mb-1"
          style={{ background: `linear-gradient(135deg, ${C.darkBlue} 0%, ${C.blue} 100%)` }}
        >
          <p className="text-[12px] font-bold text-white leading-tight mb-0.5">Join the Group Buy</p>
          <p className="text-[10px] text-white/70 mb-3 leading-snug">6 months remaining · exclusive access</p>
          <button
            className="w-full h-7 rounded-lg bg-white text-[11px] font-bold flex items-center justify-center gap-1 transition-opacity hover:opacity-90"
            style={{ color: C.blue }}
          >
            Get access &rarr;
          </button>
        </div>

        {/* Telegram link */}
        <a
          href="#"
          className="flex items-center gap-2 px-1 py-2.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "#0088CC" }}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          @urbanblend789
        </a>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header
      className="hidden md:flex items-center gap-4 px-6 shrink-0 sticky top-0 z-20 bg-white"
      style={{
        height: "60px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div className="flex-1" />
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
          style={{
            background: C.surface2,
            color: C.textMuted,
            borderColor: C.border,
          }}
        >
          $ USD
        </button>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
          style={{ background: C.surface2, borderColor: C.border }}
        >
          <Sun className="w-4 h-4" style={{ color: C.textMuted }} />
        </button>
      </div>
    </header>
  );
}

export function UnifiedPanel() {
  const [cart, setCart] = useState<Record<string, number>>({});

  const updateCart = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900 font-['Inter'] w-full min-w-[1024px]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:pl-[240px] min-h-screen min-w-0 max-w-full">
        <Header />

        <main className="flex-1 flex flex-row min-h-0 bg-white">
          {/* LEFT COLUMN: 60% */}
          <div
            className="flex flex-col w-[60%] overflow-y-auto"
            style={{
              padding: "36px 40px",
              borderRight: `1px solid ${C.border}`,
            }}
          >
            {/* Hero */}
            <div className="mb-10 pb-8 border-b border-slate-200">
              <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-4">
                Quality &middot; Tested &middot; Discreet
              </p>
              <div className="flex items-baseline gap-4 flex-wrap mb-4">
                <h1 className="font-['Plus_Jakarta_Sans'] font-extrabold text-[44px] text-slate-900 tracking-tight leading-none">
                  Salt &amp; Peps
                </h1>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-600">
                  Peps Anonymous
                </span>
              </div>
              <p className="text-[14px] leading-relaxed text-slate-600 max-w-[420px] mb-5">
                UK peptide compounds &mdash; Janoshik CoA on every batch. USDT payments. Discreet dispatch.
              </p>
              <div className="flex gap-5 flex-wrap">
                {["CoA tested", "BAC-safe", "USDT"].map(t => (
                  <span
                    key={t}
                    className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-500"
                  >
                    <Check className="w-3.5 h-3.5 text-slate-800" strokeWidth={3} /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Product Table */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-[2px] h-4 bg-blue-600 rounded-full"></div>
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800">
                  Current Inventory
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Headers */}
                <div
                  className="grid items-center px-5 py-3 border-b border-slate-200 bg-slate-50"
                  style={{ gridTemplateColumns: "60px 1fr 70px 90px 90px 70px" }}
                >
                  {["CODE", "COMPOUND", "MG", "PRICE", "LOT", ""].map(col => (
                    <span key={col} className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      {col}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {PRODUCTS.map(p => {
                    const qty = cart[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className={`grid items-center px-5 py-3.5 transition-colors hover:bg-slate-50 ${!p.inStock ? 'opacity-40 grayscale-[0.2]' : ''}`}
                        style={{ gridTemplateColumns: "60px 1fr 70px 90px 90px 70px" }}
                      >
                        {/* Code */}
                        <span className="font-['Space_Mono'] text-[10px] text-slate-400">
                          {p.id.toUpperCase()}
                        </span>

                        {/* Name */}
                        <div>
                          <span className={`text-[13px] font-semibold ${p.inStock ? 'text-slate-900' : 'text-slate-500'}`}>
                            {p.name}
                          </span>
                          {!p.inStock && (
                            <div className="text-[10px] font-medium text-red-500 mt-0.5">
                              Out of stock
                            </div>
                          )}
                        </div>

                        {/* mg */}
                        <span className="text-[12px] text-slate-500">
                          {p.mg}
                        </span>

                        {/* Price */}
                        <span className="text-[14px] font-bold text-slate-900 tabular-nums">
                          {p.price}
                        </span>

                        {/* Lot */}
                        <div>
                          <span className="font-['Space_Mono'] text-[9px] px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200/60 font-semibold tracking-wide">
                            TESTED
                          </span>
                        </div>

                        {/* Action */}
                        <div className="flex justify-end">
                          {p.inStock ? (
                            qty === 0 ? (
                              <button
                                onClick={() => updateCart(p.id, 1)}
                                className="text-[11px] font-bold px-3.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors active:scale-95"
                              >
                                Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-slate-100 rounded-md p-1">
                                <button
                                  onClick={() => updateCart(p.id, -1)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-white shadow-sm text-slate-600 hover:text-slate-900"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-[12px] font-bold w-4 text-center tabular-nums text-slate-900">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateCart(p.id, 1)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-white shadow-sm text-slate-600 hover:text-slate-900"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          ) : (
                            <button
                              disabled
                              className="text-[11px] font-bold px-3.5 py-1.5 rounded-md bg-slate-100 text-slate-400 cursor-not-allowed"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* View all */}
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-center">
                  <button className="text-[12px] font-semibold text-slate-600 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-all">
                    View all products
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 40% (Unified Panel) */}
          <div className="w-[40%] bg-slate-50 overflow-y-auto p-8 relative">
            <div className="max-w-[400px] border border-slate-200 rounded-2xl bg-[#F8FAFC] shadow-sm flex flex-col relative overflow-hidden">
              
              {/* Trust Signal */}
              <div className="p-6 relative group">
                <div className="absolute left-0 top-6 bottom-6 w-1 bg-green-600 rounded-r-full"></div>
                <div className="pl-3">
                  <h3 className="text-[12px] font-bold text-slate-900 mb-2">About this batch</h3>
                  <p className="text-[12.5px] leading-relaxed text-slate-600 mb-4">
                    Every compound in this inventory has been independently tested by Janoshik Analytical. Certificate of Analysis available for every lot.
                  </p>
                  <a href="#" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    View lab reports <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="h-px bg-slate-200 w-full" />

              {/* Resources */}
              <div className="p-6">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Resources</h3>
                <div className="flex flex-col">
                  {RESOURCES.map((r, i) => (
                    <a
                      key={i}
                      href="#"
                      className="flex items-center gap-3 py-2.5 group hover:bg-slate-100/50 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <r.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{r.label}</div>
                        {/* <div className="text-[11px] text-slate-500">{r.sub}</div> */}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-200 w-full" />

              {/* Quick Utilities */}
              <div className="p-6">
                <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-4">Quick Utilities</h3>
                <div className="grid grid-cols-3 gap-2">
                  {UTILITIES.map((u, i) => (
                    <a
                      key={i}
                      href="#"
                      className="flex flex-col items-center justify-center gap-2 py-3 px-2 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <u.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-700 text-center leading-tight">
                        {u.label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer pinned below the unified panel */}
            <div className="max-w-[400px] mt-6 flex items-center justify-between px-2">
              <a
                href="#"
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0088CC] hover:opacity-80 transition-opacity"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                @urbanblend789
              </a>
              <button className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
                Member access
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
