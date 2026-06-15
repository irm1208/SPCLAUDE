import { FlaskConical, TestTube, BookOpen, Package, Calculator, Shield, Search, ArrowRight, ChevronRight } from "lucide-react";

const PRODUCTS = [
  { code: "SEM-10", name: "Semaglutide", mg: "10mg", price: "55.00", stock: true, lot: "JAN-2406-01", current: true },
  { code: "TIR-15", name: "Tirzepatide", mg: "15mg", price: "80.00", stock: true, lot: "JAN-2406-02", current: false },
  { code: "BPC-10", name: "BPC 157", mg: "10mg", price: "45.00", stock: true, lot: "JAN-2406-03", current: false },
  { code: "TB5-10", name: "TB-500 (TB4)", mg: "10mg", price: "85.00", stock: true, lot: "JAN-2406-04", current: false },
  { code: "RET-10", name: "Retatrutide", mg: "10mg", price: "95.00", stock: true, lot: "JAN-2406-05", current: false },
  { code: "EPI-10", name: "Epitalon", mg: "10mg", price: "45.00", stock: false, lot: "—", current: false },
];

const RESOURCES = [
  { icon: FlaskConical, label: "The Lonely Vial", sub: "Single-vial shop, no minimums" },
  { icon: Package, label: "Accessories", sub: "BAC water, syringes, prep kits" },
  { icon: TestTube, label: "Lab Reports", sub: "352+ Janoshik CoA reports" },
  { icon: BookOpen, label: "Protocols", sub: "Dosing guides for 30+ peptides" },
];

const UTILITIES = [
  { icon: Calculator, label: "Dose Calculator", sub: "Reconstitution volumes" },
  { icon: Shield, label: "Endotoxin Calc", sub: "EU/kg safety threshold" },
  { icon: Search, label: "Order Lookup", sub: "Track by order code" },
];

export function EditorialTight() {
  return (
    <div className="min-h-screen font-['Inter',sans-serif]" style={{ background: "#F7F5F0", color: "#1C1C1C" }}>

      {/* Header */}
      <header className="h-11 flex items-center justify-between px-8 border-b" style={{ background: "#FFFFFF", borderColor: "#E8E4DC" }}>
        <div className="flex items-center gap-10">
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#1C1C1C", letterSpacing: "0.12em" }}>SALT & PEPS</span>
          <nav className="flex items-center gap-7">
            {["The Lonely Vial", "Accessories", "Lab Reports", "Protocols", "Calculators"].map(item => (
              <button key={item} className="text-[11.5px] transition-colors" style={{ color: "#888880" }}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "#F0EDE6", border: "1px solid #E0DDD5" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C9A84C" }} />
            <span className="text-[10px] font-medium tracking-wide" style={{ color: "#888880" }}>GROUP BUY · 6 MONTHS LEFT</span>
          </div>
          <button className="text-[11.5px] font-medium px-4 py-1.5 rounded-full transition-colors" style={{ background: "#1C1C1C", color: "#FFFFFF" }}>
            Login
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "44px 32px" }}>

        {/* Hero — typographic, more confident */}
        <div className="pb-8 mb-8" style={{ borderBottom: "1px solid #E0DDD5" }}>
          <p className="text-[9px] tracking-[0.35em] mb-4 font-medium" style={{ color: "#ABABAB", textTransform: "uppercase" }}>Quality · Tested · Discreet</p>
          <div className="flex items-baseline gap-4 mb-1">
            <h1 className="font-['Outfit',sans-serif] leading-none font-extrabold" style={{ fontSize: "54px", color: "#1C1C1C", letterSpacing: "-0.02em" }}>Salt & Peps</h1>
            <span className="text-[11px] tracking-[0.15em] font-medium" style={{ color: "#C9A84C", textTransform: "uppercase" }}>Peps Anonymous</span>
          </div>
          <p className="text-[14px] leading-[1.75] mt-5 mb-6" style={{ color: "#5A5A52", maxWidth: "500px" }}>
            UK-based single-vial peptide compounds. Independent Janoshik CoA on every batch. USDT. Discreet dispatch. Group buy cycle: 6 months.
          </p>
          <div className="flex gap-0" style={{ borderTop: "1px solid #E8E4DC", paddingTop: "16px" }}>
            {[
              ["Janoshik CoA", "every batch"],
              ["BAC-safe", "formulation"],
              ["USDT", "crypto payments"],
            ].map(([primary, secondary], i) => (
              <div key={primary} className="flex flex-col" style={{ paddingRight: "28px", marginRight: "28px", borderRight: i < 2 ? "1px solid #E0DDD5" : "none" }}>
                <span className="text-[12px] font-semibold" style={{ color: "#1C1C1C" }}>{primary}</span>
                <span className="text-[11px]" style={{ color: "#ABABAB" }}>{secondary}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product table */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "#ABABAB" }}>Current Inventory</span>
            <button className="text-[11px] flex items-center gap-1" style={{ color: "#5A5A52" }}>
              Full catalogue <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Column headers */}
          <div className="grid items-center" style={{ gridTemplateColumns: "56px 1fr 76px 104px 110px 56px", paddingBottom: "8px", borderBottom: "1.5px solid #1C1C1C" }}>
            {["CODE", "COMPOUND", "SIZE", "PRICE", "LOT / TESTED", ""].map(col => (
              <span key={col} className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#ABABAB" }}>{col}</span>
            ))}
          </div>

          {PRODUCTS.map((p, i) => (
            <div key={p.code} className="grid items-center" style={{ gridTemplateColumns: "56px 1fr 76px 104px 110px 56px", padding: "12px 0", borderBottom: `1px solid ${i < PRODUCTS.length - 1 ? "#ECEAE4" : "transparent"}` }}>
              <span className="font-mono text-[10px]" style={{ color: "#C0BDB5" }}>{p.code}</span>
              <div>
                <span className="text-[13px] font-semibold" style={{ color: p.stock ? "#1C1C1C" : "#ABABAB" }}>{p.name}</span>
                {!p.stock && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#E05050" }} />
                    <span className="text-[10px]" style={{ color: "#E05050" }}>Out of stock</span>
                  </div>
                )}
              </div>
              <span className="text-[12px]" style={{ color: "#888880" }}>{p.mg}</span>
              <span className="text-[15px] font-bold tabular-nums" style={{ color: "#1C1C1C" }}>£{p.price}</span>
              <div>
                {p.lot !== "—" ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "#EEF4E8", color: "#5A7A40", border: "1px solid #D4E8C0" }}>{p.lot}</span>
                ) : (
                  <span className="text-[10px] font-mono" style={{ color: "#C0BDB5" }}>—</span>
                )}
              </div>
              <div>
                {p.stock ? (
                  <button className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors" style={{ background: "#1C1C1C", color: "#FFFFFF" }}>
                    Add
                  </button>
                ) : (
                  <button disabled className="text-[11px] font-semibold px-3 py-1.5 rounded-md" style={{ background: "#F0EDE6", color: "#C0BDB5", cursor: "not-allowed" }}>
                    Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Resources — horizontal 4-up */}
        <div className="mb-10">
          <span className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "#ABABAB", display: "block", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #E0DDD5" }}>Resources</span>
          <div className="grid grid-cols-4 gap-0">
            {RESOURCES.map((r, i) => (
              <div key={r.label} className="flex flex-col" style={{ paddingRight: "20px", marginRight: "20px", borderRight: i < 3 ? "1px solid #ECEAE4" : "none" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3" style={{ background: "#ECEAE4" }}>
                  <r.icon className="w-3.5 h-3.5" style={{ color: "#5A5A52" }} />
                </div>
                <span className="text-[12px] font-semibold mb-1" style={{ color: "#1C1C1C" }}>{r.label}</span>
                <span className="text-[11px] leading-snug mb-3" style={{ color: "#888880" }}>{r.sub}</span>
                <button className="text-[11px] font-medium flex items-center gap-1 mt-auto" style={{ color: "#5A5A52" }}>
                  Open <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Utilities */}
        <div className="mb-8">
          <span className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "#ABABAB", display: "block", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #E0DDD5" }}>Quick Utilities</span>
          <div className="grid grid-cols-3 gap-0">
            {UTILITIES.map((u, i) => (
              <div key={u.label} className="flex items-start gap-3 cursor-pointer group" style={{ paddingRight: "20px", marginRight: "20px", borderRight: i < 2 ? "1px solid #ECEAE4" : "none" }}>
                <u.icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#ABABAB" }} />
                <div>
                  <div className="text-[12px] font-semibold mb-0.5" style={{ color: "#1C1C1C" }}>{u.label}</div>
                  <div className="text-[11px]" style={{ color: "#888880" }}>{u.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5" style={{ borderTop: "1px solid #E0DDD5" }}>
          <span className="text-[11px]" style={{ color: "#C0BDB5" }}>@urbanblend789</span>
          <span className="text-[11px]" style={{ color: "#C0BDB5" }}>Member access · GBP</span>
        </div>

      </div>
    </div>
  );
}
