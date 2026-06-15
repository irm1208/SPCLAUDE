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

const C = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  border: "#D0DAE6",
  borderFaint: "#E4EBF2",
  borderStrong: "#2C4A6E",
  text: "#1A2D42",
  textMid: "#4A6580",
  textMuted: "#8AA0B8",
  accent: "#1D6FA4",
  accentBg: "#E8F2FB",
  error: "#C0392B",
  tag: "#D9ECF9",
  tagText: "#1D6FA4",
};

export function ColdPrecision() {
  return (
    <div className="min-h-screen font-['Inter',sans-serif]" style={{ background: C.bg, color: C.text }}>

      {/* Header */}
      <header className="h-11 flex items-center justify-between px-8" style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-10">
          <span className="font-mono text-[12px] font-bold tracking-widest uppercase" style={{ color: C.text }}>SALT & PEPS</span>
          <nav className="flex items-center gap-6">
            {["Shop", "Lab Reports", "Protocols", "Calculators"].map(item => (
              <button key={item} className="font-mono text-[11px]" style={{ color: C.textMuted }}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px]" style={{ color: C.textMuted }}>GROUP BUY · 6 MONTHS</span>
          <button className="font-mono text-[10px] font-bold px-3 py-1.5" style={{ background: C.accent, color: "#FFFFFF" }}>LOGIN</button>
        </div>
      </header>

      <div className="flex" style={{ height: "calc(100vh - 44px)" }}>

        {/* LEFT */}
        <div className="flex flex-col" style={{ width: "60%", borderRight: `1px solid ${C.border}`, padding: "32px 36px 24px", overflow: "auto" }}>

          {/* Hero */}
          <div style={{ marginBottom: "28px", paddingBottom: "20px", borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: C.textMuted }}>ANALYTICAL GRADE · LYOPHILISED · UK DISPATCH</p>
                <h1 className="font-mono font-bold" style={{ fontSize: "32px", color: C.text, letterSpacing: "-0.01em", lineHeight: 1.1 }}>SALT & PEPS</h1>
                <p className="font-mono text-[10px] tracking-[0.2em] mt-1" style={{ color: C.accent }}>PEPS ANONYMOUS</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] tracking-wide" style={{ color: C.textMuted }}>CYCLE STATUS</div>
                <div className="font-mono text-[11px] font-bold" style={{ color: C.accent }}>ACTIVE</div>
                <div className="font-mono text-[9px]" style={{ color: C.textMuted }}>28 OCT CLOSE</div>
              </div>
            </div>
            <p className="font-mono text-[11.5px] leading-relaxed" style={{ color: C.textMid, maxWidth: "380px" }}>
              Research peptides. Janoshik CoA verification on every batch. USDT. Discreet UK dispatch.
            </p>
            <div className="flex gap-5 mt-3">
              {["JANOSHIK CoA", "BAC-SAFE", "USDT ONLY"].map(t => (
                <span key={t} className="font-mono text-[9px] font-bold tracking-widest" style={{ color: C.accent }}>/ {t}</span>
              ))}
            </div>
          </div>

          {/* Table */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
              <span className="font-mono text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: C.textMuted }}>CURRENT INVENTORY</span>
              <button className="font-mono text-[9.5px] flex items-center gap-1" style={{ color: C.accent }}>FULL CATALOGUE <ArrowRight className="w-3 h-3" /></button>
            </div>

            <div className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 64px 90px 104px 48px", paddingBottom: "6px", borderBottom: `1.5px solid ${C.borderStrong}` }}>
              {["CODE", "COMPOUND", "MG", "PRICE", "LOT", ""].map(col => (
                <span key={col} className="font-mono text-[8.5px] font-bold tracking-[0.2em] uppercase" style={{ color: C.textMuted }}>{col}</span>
              ))}
            </div>

            {PRODUCTS.map((p, i) => (
              <div key={p.code} className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 64px 90px 104px 48px", padding: "10px 0", borderBottom: i < PRODUCTS.length - 1 ? `1px solid ${C.borderFaint}` : "none" }}>
                <span className="font-mono text-[9px]" style={{ color: C.textMuted }}>{p.code}</span>
                <div>
                  <span className="font-mono text-[12.5px] font-semibold" style={{ color: p.stock ? C.text : C.textMuted }}>{p.name}</span>
                  {!p.stock && <div className="font-mono text-[9px] font-bold" style={{ color: C.error }}>OUT OF STOCK</div>}
                </div>
                <span className="font-mono text-[11px]" style={{ color: C.textMid }}>{p.mg}</span>
                <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: C.text }}>£{p.price}</span>
                <div>
                  {p.lot !== "—" ? (
                    <span className="font-mono text-[9px] px-2 py-0.5" style={{ background: C.tag, color: C.tagText }}>{p.lot}</span>
                  ) : (
                    <span className="font-mono text-[9px]" style={{ color: C.textMuted }}>—</span>
                  )}
                </div>
                <div>
                  {p.stock ? (
                    <button className="font-mono text-[9.5px] font-bold px-2.5 py-1.5" style={{ background: C.accent, color: "#FFFFFF" }}>ADD</button>
                  ) : (
                    <button disabled className="font-mono text-[9.5px] font-bold px-2.5 py-1.5" style={{ background: C.borderFaint, color: C.textMuted, cursor: "not-allowed" }}>ADD</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col" style={{ width: "40%", padding: "32px 32px 24px", overflow: "auto" }}>

          <div style={{ marginBottom: "28px" }}>
            <span className="font-mono text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: C.textMuted, display: "block", marginBottom: "12px", paddingBottom: "8px", borderBottom: `1px solid ${C.border}` }}>RESOURCES</span>
            {RESOURCES.map((r, i) => (
              <div key={r.label} className="flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: i < RESOURCES.length - 1 ? `1px solid ${C.borderFaint}` : "none" }}>
                <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ background: C.accentBg, border: `1px solid ${C.border}` }}>
                  <r.icon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[11.5px] font-semibold" style={{ color: C.text }}>{r.label}</div>
                  <div className="font-mono text-[10px]" style={{ color: C.textMuted }}>{r.sub}</div>
                </div>
                <ArrowRight className="w-3 h-3" style={{ color: C.textMuted }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "28px" }}>
            <span className="font-mono text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: C.textMuted, display: "block", marginBottom: "12px", paddingBottom: "8px", borderBottom: `1px solid ${C.border}` }}>QUICK UTILITIES</span>
            {UTILITIES.map((u, i) => (
              <div key={u.label} className="flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: i < UTILITIES.length - 1 ? `1px solid ${C.borderFaint}` : "none" }}>
                <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ background: C.accentBg, border: `1px solid ${C.border}` }}>
                  <u.icon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[11.5px] font-semibold" style={{ color: C.text }}>{u.label}</div>
                  <div className="font-mono text-[10px]" style={{ color: C.textMuted }}>{u.sub}</div>
                </div>
                <ArrowRight className="w-3 h-3" style={{ color: C.textMuted }} />
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div className="p-4" style={{ background: C.accentBg, border: `1px solid ${C.border}` }}>
              <div className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: C.accent }}>ANALYTICAL VERIFICATION</div>
              <p className="font-mono text-[10.5px] leading-relaxed mb-3" style={{ color: C.textMid }}>
                All compounds independently analysed by Janoshik Analytical. Certificate of Analysis available for every lot number in the inventory table.
              </p>
              <button className="font-mono text-[10px] font-bold flex items-center gap-1" style={{ color: C.accent }}>
                VIEW CoA REPORTS <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4" style={{ paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
              <span className="font-mono text-[10px]" style={{ color: C.textMuted }}>@urbanblend789</span>
              <span className="font-mono text-[10px]" style={{ color: C.textMuted }}>GBP · MEMBER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
