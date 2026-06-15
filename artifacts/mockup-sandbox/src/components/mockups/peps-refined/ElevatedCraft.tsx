import React, { useState } from "react";
import {
  Droplets, ClipboardList, BookMarked, Box,
  ArrowRight, MessageCircle, Hash, Search, ShieldAlert,
  Plus, Minus, Home, ReceiptText, User, Sun, Moon
} from "lucide-react";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", mg: "10", price: "$20.00", inStock: true },
  { id: "8a3f21", name: "Semaglutide 5mg", mg: "5", price: "$18.00", inStock: true },
  { id: "c7d849", name: "BPC-157 5mg", mg: "5", price: "$15.00", inStock: true },
  { id: "e1b293", name: "TB-500 10mg", mg: "10", price: "$22.00", inStock: false },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mg: "2", price: "$12.00", inStock: true },
  { id: "a91c55", name: "Ipamorelin 5mg", mg: "5", price: "$16.00", inStock: true },
];

const RESOURCES = [
  { icon: Droplets,     label: "The Lonely Vial", sub: "Single-vial, no minimums", path: "/shop" },
  { icon: Box,          label: "Accessories",     sub: "BAC water, prep kits",     path: "/accessories" },
  { icon: ClipboardList,label: "Lab Reports",     sub: "352+ Janoshik CoAs",       path: "/tests" },
  { icon: BookMarked,   label: "Protocols",       sub: "30+ peptide guides",       path: "/protocols" },
];

const UTILITIES = [
  { icon: Hash,   label: "Dose Calculator",      sub: "Reconstitution volumes",   path: "/calculator" },
  { icon: ShieldAlert, label: "Endotoxin Calc",   sub: "EU/kg safety threshold",   path: "/endotoxin" },
  { icon: Search, label: "Order Lookup",         sub: "Track by order code",      path: "/lookup" },
];

const C = {
  bg:          "#FAFAFA",
  surface:     "#FFFFFF",
  border:      "#E5E7EB",
  borderFaint: "#F3F4F6",
  borderStrong:"#D1D5DB",
  text:        "#111827",
  textMid:     "#4B5563",
  textMuted:   "#6B7280",
  textGhost:   "#9CA3AF",
  iconBg:      "rgba(45,107,204,0.08)",
  iconColor:   "#2D6BCC",
  gold:        "#2D6BCC",
  error:       "#DC2626",
  tagBg:       "rgba(34,197,94,0.1)",
  tagText:     "#16A34A",
  tagBorder:   "rgba(34,197,94,0.25)",
  addBtn:      "#2D6BCC",
  addBtnText:  "#FFFFFF",
  disabledBg:  "#F3F4F6",
  disabledText:"#9CA3AF",
  brandBlue:   "#2D6BCC",
  darkBlue:    "#1B3A7A",
};

function Sidebar() {
  const [activeItem, setActiveItem] = useState("home");

  const NavItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => {
    const isActive = activeItem === id;
    return (
      <button
        onClick={() => setActiveItem(id)}
        className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-all text-left group relative`}
        style={{
          color: isActive ? C.darkBlue : C.textMuted,
          fontWeight: isActive ? 600 : 500,
          background: isActive ? "rgba(45,107,204,0.08)" : "transparent"
        }}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#2D6BCC]" />
        )}
        <Icon
          className="w-4 h-4 shrink-0 transition-colors"
          strokeWidth={isActive ? 2.25 : 1.75}
          style={{ color: isActive ? C.brandBlue : C.textGhost }}
        />
        <span className={isActive ? "" : "group-hover:text-gray-900"}>{label}</span>
      </button>
    );
  };

  const SectionLabel = ({ text }: { text: string }) => (
    <div className="px-3 mb-1.5 mt-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
      {text}
    </div>
  );

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 w-[240px] flex-col z-30 bg-[#F9FAFB]"
      style={{ borderRight: "1px solid #E5E7EB" }}
    >
      <button
        className="flex items-center gap-3 px-4 py-4 shrink-0 text-left transition-colors hover:bg-black/[0.02]"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-white text-[11px] select-none"
          style={{ background: "linear-gradient(135deg, #1B3A7A 0%, #2D6BCC 100%)" }}
        >
          SP
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight truncate text-gray-900">Salt &amp; Peps</p>
          <p className="text-[10px] leading-tight tracking-wide text-gray-500">@pepanon</p>
        </div>
      </button>

      <nav className="flex-1 overflow-y-auto py-2.5">
        <div className="px-2">
          <NavItem id="home" label="Home" icon={Home} />
        </div>

        <SectionLabel text="SHOP" />
        <div className="px-2">
          <NavItem id="vials" label="Lonely Vial" icon={Droplets} />
          <NavItem id="accessories" label="Accessories" icon={Box} />
        </div>

        <SectionLabel text="TOOLS" />
        <div className="px-2">
          <NavItem id="lab" label="Lab Reports" icon={ClipboardList} />
          <NavItem id="protocols" label="Protocols" icon={BookMarked} />
          <NavItem id="safety" label="Safety Calc" icon={ShieldAlert} />
        </div>

        <SectionLabel text="ACCOUNT" />
        <div className="px-2">
          <NavItem id="orders" label="My Orders" icon={ReceiptText} />
        </div>
      </nav>

      <div className="px-4 pb-4 shrink-0">
        <div
          className="rounded-xl p-3.5"
          style={{ background: "linear-gradient(135deg, #1B3A7A 0%, #2D6BCC 100%)" }}
        >
          <p className="text-[12px] font-bold text-white leading-tight mb-0.5">Group Buy</p>
          <p className="text-[10px] text-white/70 mb-3 leading-snug">6 months remaining</p>
          <button
            className="w-full h-7 rounded-lg bg-white text-[11px] font-bold flex items-center justify-center gap-1 transition-opacity hover:opacity-90"
            style={{ color: C.brandBlue }}
          >
            Join Group Buy →
          </button>
        </div>

        <a
          href="#"
          className="flex items-center gap-2 px-1 py-3 mt-1 text-[11px] font-medium hover:opacity-80 transition-opacity text-[#0088CC]"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          @urbanblend789
        </a>
      </div>
    </aside>
  );
}

function DesktopHeader() {
  const [showGBP, setShowGBP] = useState(false);
  const [dark, setDark] = useState(false);

  return (
    <header
      className="hidden md:flex items-center gap-4 px-6 shrink-0 sticky top-0 z-20 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]"
      style={{ height: "60px" }}
    >
      <div className="flex-1" />
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setShowGBP(!showGBP)}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
          style={{
            background: showGBP ? "rgba(45,107,204,0.08)" : "#F9FAFB",
            color: showGBP ? C.brandBlue : C.textMuted,
            borderColor: showGBP ? C.brandBlue : "#E5E7EB",
          }}
        >
          {showGBP ? "£ GBP" : "$ USD"}
        </button>
        <button
          onClick={() => setDark(!dark)}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-100"
        >
          {dark
            ? <Sun className="w-4 h-4 text-gray-500" />
            : <Moon className="w-4 h-4 text-gray-500" />
          }
        </button>
      </div>
    </header>
  );
}

export function ElevatedCraft() {
  const [cartItems, setCartItems] = useState<any[]>([]);

  const addToCart = (product: any) => {
    setCartItems([...cartItems, { ...product, quantity: 1 }]);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity: qty } : item));
    }
  };

  const AccentHeader = ({ text }: { text: string }) => (
    <div className="mb-4 border-b border-[#E5E7EB] pb-2">
      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-gray-900 inline-block border-b-[3px] border-[#2D6BCC] pb-[9px] -mb-[11px]">
        {text}
      </span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-['Inter']">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-[240px] min-h-screen min-w-0 max-w-full">
        <DesktopHeader />
        
        <main className="flex-1 flex flex-col lg:flex-row pb-24 md:pb-0 overflow-hidden">
          {/* LEFT COLUMN */}
          <div className="flex flex-col w-full lg:w-[60%] overflow-y-auto px-8 pt-8 pb-6 border-r border-[#E5E7EB]">
            {/* Hero */}
            <div className="mb-8 pb-7 border-b border-[#E5E7EB]">
              <p className="text-[9px] font-semibold tracking-[0.18em] text-gray-500 uppercase mb-3">
                Quality · Tested · Discreet
              </p>
              <div className="flex items-baseline gap-4 flex-wrap">
                <h1 className="font-['Inter'] font-[800] text-[40px] tracking-[-0.025em] text-gray-900 leading-none">
                  Salt &amp; Peps
                </h1>
                <span className="text-[10px] font-bold tracking-[0.15em] px-2 py-1 rounded-full uppercase"
                  style={{ background: "rgba(45,107,204,0.08)", color: C.brandBlue, border: `1px solid rgba(45,107,204,0.2)` }}>
                  Peps Anonymous
                </span>
              </div>
              <p className="text-[13px] leading-relaxed mt-4 text-gray-600 max-w-[400px]">
                UK peptide compounds. Every batch Janoshik-tested, every CoA published.
              </p>
              <div className="flex gap-5 mt-5 flex-wrap">
                {["CoA tested", "BAC-safe", "USDT"].map(t => (
                  <span key={t} className="text-[11px] font-medium flex items-center gap-1.5 text-gray-500">
                    <span className="text-[#16A34A] font-bold">✓</span> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-gray-900 inline-block border-b-[3px] border-[#2D6BCC] pb-[9px]">
                  Current Inventory
                </span>
                <button className="text-[11px] font-medium flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors">
                  Full catalogue <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="border-b border-[#E5E7EB] -mt-[1px] mb-2"></div>

              {/* Header Row */}
              <div className="hidden sm:grid items-center pb-2 border-b border-[#E5E7EB] text-[9px] font-semibold tracking-[0.12em] uppercase text-gray-400"
                style={{ gridTemplateColumns: "52px 1fr 64px 90px 96px 64px" }}>
                <span>CODE</span>
                <span>COMPOUND</span>
                <span>MG</span>
                <span>PRICE</span>
                <span>LOT</span>
                <span></span>
              </div>

              {PRODUCTS.map((p, i) => {
                const cartItem = cartItems.find(ci => ci.id === p.id);
                const qty = cartItem?.quantity ?? 0;
                return (
                  <div key={p.id} className="grid items-center py-[9px] border-b border-[#F3F4F6] last:border-0"
                    style={{ gridTemplateColumns: "52px 1fr 64px 90px 96px 64px" }}>
                    <span className="font-['Space_Mono'] text-[10px] text-gray-400 hidden sm:block">
                      {p.id.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-semibold ${p.inStock ? "text-gray-900" : "text-gray-400"}`}>
                        {p.name}
                      </span>
                      {!p.inStock && (
                        <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm">
                          OUT
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-gray-500 hidden sm:block">
                      {p.mg}
                    </span>
                    <span className={`text-[14px] font-bold tabular-nums ${p.inStock ? "text-gray-900" : "text-gray-400"}`}>
                      {p.price}
                    </span>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></div>
                      <span className="font-['Space_Mono'] text-[9.5px] font-bold text-[#16A34A]">
                        TESTED
                      </span>
                    </div>
                    <div>
                      {p.inStock ? (
                        qty === 0 ? (
                          <button
                            onClick={() => addToCart(p)}
                            className="w-full text-[11px] font-bold px-2 py-1.5 rounded-md bg-[#2D6BCC] text-white hover:bg-[#1B3A7A] transition-colors"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <button onClick={() => updateQty(p.id, qty - 1)}
                              className="w-5 h-5 rounded flex items-center justify-center bg-[rgba(45,107,204,0.08)] hover:bg-[rgba(45,107,204,0.15)] text-[#2D6BCC]">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[12px] font-bold w-4 text-center tabular-nums text-gray-900">{qty}</span>
                            <button onClick={() => updateQty(p.id, qty + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center bg-[#2D6BCC] hover:bg-[#1B3A7A] text-white">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      ) : (
                        <button disabled className="w-full text-[11px] font-bold px-2 py-1.5 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed">
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col w-full lg:w-[40%] overflow-y-auto px-7 pt-8 pb-6 bg-[#FAFAFA]">
            {/* Resources Card */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm mb-5">
              <AccentHeader text="Resources" />
              <div className="flex flex-col">
                {RESOURCES.map((r, i) => (
                  <button key={r.label} className="w-full flex items-center gap-3.5 py-2.5 group text-left border-b border-[#F3F4F6] last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[rgba(45,107,204,0.08)]">
                      <r.icon className="w-4 h-4 text-[#2D6BCC]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-gray-900 group-hover:text-[#2D6BCC] transition-colors">{r.label}</div>
                      <div className="text-[11px] text-gray-500">{r.sub}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#2D6BCC] transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Utilities Card */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm mb-5">
              <AccentHeader text="Quick Utilities" />
              <div className="flex flex-col">
                {UTILITIES.map((u, i) => (
                  <button key={u.label} className="w-full flex items-center gap-3.5 py-2.5 group text-left border-b border-[#F3F4F6] last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[rgba(45,107,204,0.08)]">
                      <u.icon className="w-4 h-4 text-[#2D6BCC]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-gray-900 group-hover:text-[#2D6BCC] transition-colors">{u.label}</div>
                      <div className="text-[11px] text-gray-500">{u.sub}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#2D6BCC] transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Block + Footer */}
            <div className="mt-auto pt-4">
              <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList className="w-4 h-4 text-[#2D6BCC]" />
                  <div className="text-[12px] font-bold text-gray-900">About this batch</div>
                </div>
                <p className="text-[11px] leading-relaxed mb-3 text-gray-600">
                  All compounds independently tested by Janoshik Analytical. CoA reports available for every lot number in the inventory.
                </p>
                <button className="text-[11.5px] font-medium flex items-center gap-1.5 text-gray-900 hover:text-[#2D6BCC] hover:underline transition-all underline-offset-4">
                  Browse lab reports <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-[#E5E7EB]">
                <a href="#" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0088CC] hover:opacity-80 transition-opacity">
                  <MessageCircle className="w-3.5 h-3.5" /> @urbanblend789
                </a>
                <button className="text-[10.5px] font-medium text-gray-400 hover:text-gray-900 transition-colors">
                  Member access
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
