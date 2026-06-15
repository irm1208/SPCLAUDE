import { FlaskConical, TestTube, BookOpen, Package, Calculator, Shield, Search, ArrowRight } from "lucide-react";

const PRODUCTS = [
  { code: "SEM-10", name: "Semaglutide", mg: "10mg", price: "55.00", stock: true, lot: "JAN-2406-01" },
  { code: "TIR-15", name: "Tirzepatide", mg: "15mg", price: "80.00", stock: true, lot: "JAN-2406-02" },
  { code: "BPC-10", name: "BPC 157", mg: "10mg", price: "45.00", stock: true, lot: "JAN-2406-03" },
  { code: "TB5-10", name: "TB-500 (TB4)", mg: "10mg", price: "85.00", stock: true, lot: "JAN-2406-04" },
  { code: "RET-10", name: "Retatrutide", mg: "10mg", price: "95.00", stock: true, lot: "JAN-2406-05" },
  { code: "EPI-10", name: "Epitalon", mg: "10mg", price: "45.00", stock: false, lot: "—" },
];

const RESOURCES = [
  { icon: FlaskConical, label: "The Lonely Vial", sub: "Single-vial, no minimums" },
  { icon: Package, label: "Accessories", sub: "BAC water, prep kits" },
  { icon: TestTube, label: "Lab Reports", sub: "352+ Janoshik CoAs" },
  { icon: BookOpen, label: "Protocols", sub: "30+ peptide guides" },
];

const UTILITIES = [
  { icon: Calculator, label: "Dose Calculator", sub: "Reconstitution volumes" },
  { icon: Shield, label: "Endotoxin Calc", sub: "EU/kg threshold" },
  { icon: Search, label: "Order Lookup", sub: "Track by code" },
];

export function SwissColumn() {
  return (
    <div className="min-h-screen font-['Inter',sans-serif]" style={{ background: "#F5F3EE", color: "#1A1A18" }}>

      {/* Header */}
      <header className="h-11 flex items-center justify-between px-8 border-b" style={{ background: "#FFFFFF", borderColor: "#E4E1D9" }}>
        <div className="flex items-center gap-10">
          <span className="text-[13px] font-extrabold tracking-widest uppercase" style={{ color: "#1A1A18" }}>Salt & Peps</span>
          <nav className="flex items-center gap-6">
            {["Shop", "Lab Reports", "Protocols", "Calculators"].map(item => (
              <button key={item} className="text-[11.5px]" style={{ color: "#888884" }}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-medium" style={{ color: "#ABABAB" }}>Group buy · 6 months left</span>
          <button className="text-[11px] font-semibold px-4 py-1.5 rounded-full" style={{ background: "#1A1A18", color: "#FFFFFF" }}>Login</button>
        </div>
      </header>

      {/* Two-column body — fills the viewport without scrolling */}
      <div className="flex" style={{ height: "calc(100vh - 44px)" }}>

        {/* LEFT: Hero + Products (60%) */}
        <div className="flex flex-col" style={{ width: "60%", borderRight: "1px solid #E4E1D9", padding: "36px 40px 28px", overflow: "auto" }}>

          {/* Hero — compact, horizontal */}
          <div style={{ marginBottom: "32px", paddingBottom: "24px", borderBottom: "1px solid #E4E1D9" }}>
            <div className="flex items-baseline gap-4">
              <h1 className="font-['Outfit',sans-serif] font-extrabold" style={{ fontSize: "42px", color: "#1A1A18", letterSpacing: "-0.02em", lineHeight: 1 }}>Salt & Peps</h1>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#C9A84C" }}>Peps Anonymous</span>
            </div>
            <p className="text-[13px] leading-relaxed mt-3" style={{ color: "#636360", maxWidth: "380px" }}>
              UK peptide compounds. Janoshik CoA on every batch. USDT. Discreet dispatch.
            </p>
            <div className="flex gap-5 mt-4">
              {["CoA tested", "BAC-safe", "USDT"].map(t => (
                <span key={t} className="text-[10px] font-semibold flex items-center gap-1.5" style={{ color: "#888884" }}>
                  <span style={{ color: "#1A1A18" }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Products table */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: "#ABABAB" }}>Current Inventory</span>
              <button className="text-[10px] flex items-center gap-1" style={{ color: "#636360" }}>Full catalogue <ArrowRight className="w-3 h-3" /></button>
            </div>

            {/* Table header row */}
            <div className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 64px 90px 96px 48px", paddingBottom: "8px", borderBottom: "1.5px solid #1A1A18" }}>
              {["CODE", "COMPOUND", "MG", "PRICE", "LOT", ""].map(col => (
                <span key={col} className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "#ABABAB" }}>{col}</span>
              ))}
            </div>

            {PRODUCTS.map((p, i) => (
              <div key={p.code} className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 64px 90px 96px 48px", padding: "11px 0", borderBottom: i < PRODUCTS.length - 1 ? "1px solid #ECEAE4" : "none" }}>
                <span className="font-mono text-[9.5px]" style={{ color: "#C0BDB5" }}>{p.code}</span>
                <div>
                  <span className="text-[13px] font-semibold" style={{ color: p.stock ? "#1A1A18" : "#B0ADA8" }}>{p.name}</span>
                  {!p.stock && <div className="text-[9.5px] font-medium" style={{ color: "#D05050" }}>Out of stock</div>}
                </div>
                <span className="text-[12px]" style={{ color: "#888884" }}>{p.mg}</span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: "#1A1A18" }}>£{p.price}</span>
                <span className="font-mono text-[9.5px]" style={{ color: "#C0BDB5" }}>{p.lot}</span>
                <div>
                  {p.stock ? (
                    <button className="text-[10.5px] font-bold px-2.5 py-1.5 rounded" style={{ background: "#1A1A18", color: "#FFFFFF" }}>Add</button>
                  ) : (
                    <button disabled className="text-[10.5px] font-bold px-2.5 py-1.5 rounded" style={{ background: "#ECEAE4", color: "#C0BDB5", cursor: "not-allowed" }}>Add</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Resources + Utilities + Footer (40%) */}
        <div className="flex flex-col" style={{ width: "40%", padding: "36px 36px 28px", overflow: "auto" }}>

          {/* Resources */}
          <div style={{ marginBottom: "32px" }}>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: "#ABABAB", display: "block", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #E4E1D9" }}>Resources</span>
            <div className="flex flex-col gap-0">
              {RESOURCES.map((r, i) => (
                <div key={r.label} className="flex items-center gap-4 py-3.5 group cursor-pointer" style={{ borderBottom: i < RESOURCES.length - 1 ? "1px solid #ECEAE4" : "none" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#ECEAE4" }}>
                    <r.icon className="w-3.5 h-3.5" style={{ color: "#5A5A52" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold" style={{ color: "#1A1A18" }}>{r.label}</div>
                    <div className="text-[11px]" style={{ color: "#888884" }}>{r.sub}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#C0BDB5" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Utilities */}
          <div style={{ marginBottom: "32px" }}>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: "#ABABAB", display: "block", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #E4E1D9" }}>Quick Utilities</span>
            <div className="flex flex-col gap-0">
              {UTILITIES.map((u, i) => (
                <div key={u.label} className="flex items-center gap-4 py-3.5 group cursor-pointer" style={{ borderBottom: i < UTILITIES.length - 1 ? "1px solid #ECEAE4" : "none" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#ECEAE4" }}>
                    <u.icon className="w-3.5 h-3.5" style={{ color: "#5A5A52" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold" style={{ color: "#1A1A18" }}>{u.label}</div>
                    <div className="text-[11px]" style={{ color: "#888884" }}>{u.sub}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#C0BDB5" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Spacer then trust block */}
          <div className="mt-auto">
            <div className="rounded-xl p-5" style={{ background: "#ECEAE4", border: "1px solid #E0DDD5" }}>
              <div className="text-[11px] font-bold mb-2" style={{ color: "#1A1A18" }}>About this batch</div>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: "#636360" }}>
                All compounds independently tested by Janoshik Analytical. CoA reports available for every lot number shown in the inventory table.
              </p>
              <button className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#1A1A18" }}>
                Browse lab reports <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-5 pt-5" style={{ borderTop: "1px solid #E4E1D9" }}>
              <span className="text-[11px]" style={{ color: "#C0BDB5" }}>@urbanblend789</span>
              <span className="text-[11px]" style={{ color: "#C0BDB5" }}>GBP · Member</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
