import { FlaskConical, TestTube, BookOpen, Package, Calculator, Search, ArrowRight, Shield, ChevronRight } from "lucide-react";

const PRODUCTS = [
  { code: "SEM-10", name: "Semaglutide", mg: "10mg", price: "55.00", stock: true, lot: "JAN-2406-01" },
  { code: "TIR-15", name: "Tirzepatide", mg: "15mg", price: "80.00", stock: true, lot: "JAN-2406-02" },
  { code: "BPC-10", name: "BPC 157", mg: "10mg", price: "45.00", stock: true, lot: "JAN-2406-03" },
  { code: "TB5-10", name: "TB-500 (TB4)", mg: "10mg", price: "85.00", stock: true, lot: "JAN-2406-04" },
  { code: "RET-10", name: "Retatrutide", mg: "10mg", price: "95.00", stock: true, lot: "JAN-2406-05" },
  { code: "EPI-10", name: "Epitalon", mg: "10mg", price: "45.00", stock: false, lot: "—" },
];

const UTILITY_ROWS = [
  { icon: Calculator, label: "Dose Calculator", sub: "Reconstitution volume guide" },
  { icon: Shield, label: "Endotoxin Calc", sub: "EU/kg safety threshold" },
  { icon: Search, label: "Order Lookup", sub: "Track by order code" },
];

export function LightPrecise() {
  return (
    <div className="min-h-screen font-['Inter',sans-serif] bg-[#FAFAF8] text-[#1A1A1A]">

      {/* Top Bar */}
      <header className="border-b border-[#E0DED8] bg-white px-8 py-0 flex items-center justify-between h-12">
        <div className="flex items-center gap-8">
          <span className="text-[13px] font-semibold tracking-wide text-[#1A1A1A]">SALT & PEPS</span>
          <nav className="flex items-center gap-6">
            {["The Lonely Vial", "Accessories", "Lab Reports", "Protocols", "Calculators"].map(item => (
              <button key={item} className="text-[12px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#999] tracking-wide">GROUP BUY CLOSES 28 OCT</span>
          <button className="text-[12px] font-medium text-[#1A1A1A] border border-[#1A1A1A] px-3 py-1 hover:bg-[#1A1A1A] hover:text-white transition-colors">
            Login
          </button>
        </div>
      </header>

      <div className="max-w-[820px] mx-auto px-8 py-10">

        {/* Title block — typographic only, no card */}
        <div className="border-b border-[#E0DED8] pb-8 mb-8">
          <p className="text-[10px] tracking-[0.3em] text-[#999] uppercase mb-3">Quality · Tested · Discreet</p>
          <h1 className="font-['Outfit',sans-serif] text-[44px] font-bold text-[#1A1A1A] leading-none mb-1">
            Salt & Peps
          </h1>
          <p className="text-[13px] text-[#999] tracking-[0.1em] mb-5">PEPS ANONYMOUS</p>
          <p className="text-[14px] text-[#4A4A4A] leading-[1.7] max-w-[540px]">
            UK-based single-vial peptide compounds with independent Janoshik CoA testing. USDT payments. Discreet dispatch. Group buy model: 6-month cycles.
          </p>
          <div className="flex gap-6 mt-5">
            {["Janoshik CoA on every batch", "BAC-safe formulation", "USDT / crypto payments"].map(t => (
              <span key={t} className="text-[11px] text-[#6B6B6B] flex items-center gap-1.5">
                <span className="text-[#1A1A1A] text-[10px]">✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Products — flat table, no card wrapper */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] tracking-[0.25em] text-[#999] uppercase font-medium">Current Inventory</h2>
            <button className="text-[11px] text-[#1A1A1A] flex items-center gap-1 hover:underline">
              Full catalogue <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[64px_1fr_80px_96px_100px_48px] gap-0 border-b border-[#E0DED8] pb-1 mb-0">
            {["CODE", "COMPOUND", "SIZE", "PRICE", "LOT / TESTED", ""].map(col => (
              <div key={col} className="text-[9px] tracking-[0.2em] text-[#ABABAB] uppercase font-medium pb-1">{col}</div>
            ))}
          </div>

          {/* Table rows */}
          {PRODUCTS.map((p, i) => (
            <div key={p.code} className={`grid grid-cols-[64px_1fr_80px_96px_100px_48px] gap-0 py-3 items-center ${i < PRODUCTS.length - 1 ? "border-b border-[#F0EEE9]" : ""}`}>
              <div className="text-[10px] font-mono text-[#ABABAB]">{p.code}</div>
              <div>
                <div className="text-[13px] font-medium text-[#1A1A1A]">{p.name}</div>
                {!p.stock && <div className="text-[10px] text-[#CC3333]">Out of stock</div>}
              </div>
              <div className="text-[12px] text-[#6B6B6B]">{p.mg}</div>
              <div className="text-[14px] font-semibold text-[#1A1A1A] tabular-nums">£{p.price}</div>
              <div className="text-[10px] font-mono text-[#ABABAB]">{p.lot}</div>
              <div>
                <button
                  className={`text-[11px] font-medium px-2.5 py-1 border transition-colors ${p.stock ? "border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white" : "border-[#E0DED8] text-[#ABABAB] cursor-not-allowed"}`}
                  disabled={!p.stock}
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Explore — plain list, no cards */}
        <div className="mb-10">
          <h2 className="text-[11px] tracking-[0.25em] text-[#999] uppercase font-medium mb-4 border-b border-[#E0DED8] pb-4">Resources</h2>
          <div className="grid grid-cols-2 gap-0">
            {[
              { icon: FlaskConical, label: "The Lonely Vial", sub: "Single-vial shop, no minimums", href: "shop" },
              { icon: Package, label: "Accessories", sub: "BAC water, syringes, prep kits", href: "accessories" },
              { icon: TestTube, label: "Lab Reports", sub: "352+ Janoshik CoA reports", href: "lab-reports" },
              { icon: BookOpen, label: "Protocols", sub: "Dosing guides for 30+ peptides", href: "protocols" },
            ].map((s, i) => (
              <div key={s.label} className={`flex items-start gap-4 py-5 ${i % 2 === 0 ? "pr-8 border-r border-[#F0EEE9]" : "pl-8"} ${i < 2 ? "border-b border-[#F0EEE9]" : ""}`}>
                <s.icon className="w-4 h-4 text-[#ABABAB] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-[#1A1A1A] mb-0.5">{s.label}</div>
                  <div className="text-[11px] text-[#6B6B6B] mb-2">{s.sub}</div>
                  <button className="text-[11px] text-[#1A1A1A] flex items-center gap-1 hover:underline">
                    Open <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Utilities — tight rows, no card wrapper */}
        <div className="mb-10">
          <h2 className="text-[11px] tracking-[0.25em] text-[#999] uppercase font-medium mb-4 border-b border-[#E0DED8] pb-4">Quick Utilities</h2>
          {UTILITY_ROWS.map((u, i) => (
            <div key={u.label} className={`flex items-center justify-between py-3.5 ${i < UTILITY_ROWS.length - 1 ? "border-b border-[#F0EEE9]" : ""} cursor-pointer group`}>
              <div className="flex items-center gap-4">
                <u.icon className="w-3.5 h-3.5 text-[#ABABAB]" />
                <div>
                  <div className="text-[13px] font-medium text-[#1A1A1A]">{u.label}</div>
                  <div className="text-[11px] text-[#6B6B6B]">{u.sub}</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#ABABAB] group-hover:text-[#1A1A1A] transition-colors" />
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="border-t border-[#E0DED8] pt-6 flex items-center justify-between">
          <span className="text-[11px] text-[#ABABAB]">@urbanblend789</span>
          <span className="text-[11px] text-[#ABABAB]">Member access · GBP</span>
        </div>

      </div>
    </div>
  );
}
