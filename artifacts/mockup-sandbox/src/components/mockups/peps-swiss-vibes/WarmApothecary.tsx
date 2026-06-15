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
  bg: "#F5EED8",
  surface: "#FBF6E9",
  border: "#DDD0A8",
  borderFaint: "#E8DEC0",
  borderStrong: "#7A5C28",
  text: "#3D2800",
  textMid: "#6B4E20",
  textMuted: "#A08040",
  accent: "#8B4513",
  accentSoft: "#E8D5B0",
  accentTag: "#F0E4C0",
  tagText: "#7A5020",
  ok: "#4A7C40",
  error: "#A02020",
};

export function WarmApothecary() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="h-11 flex items-center justify-between px-8" style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-10">
          <span className="text-[14px] font-bold" style={{ color: C.text, fontFamily: "'Outfit', sans-serif" }}>Salt & Peps</span>
          <nav className="flex items-center gap-6">
            {["Shop", "Lab Reports", "Protocols", "Calculators"].map(item => (
              <button key={item} className="text-[11.5px]" style={{ color: C.textMuted }}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px]" style={{ color: C.textMuted }}>Group buy · 6 months left</span>
          <button className="text-[11px] font-semibold px-4 py-1.5 rounded-full" style={{ background: C.accent, color: "#FBF6E9" }}>Login</button>
        </div>
      </header>

      <div className="flex" style={{ height: "calc(100vh - 44px)" }}>

        {/* LEFT */}
        <div className="flex flex-col" style={{ width: "60%", borderRight: `1px solid ${C.border}`, padding: "32px 36px 24px", overflow: "auto" }}>

          {/* Hero */}
          <div style={{ marginBottom: "28px", paddingBottom: "22px", borderBottom: `1px solid ${C.border}` }}>
            <p className="text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: C.textMuted }}>Quality · Tested · Discreet</p>
            <div className="flex items-baseline gap-3 mb-1">
              <h1 style={{ fontSize: "40px", fontWeight: 800, color: C.text, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>Salt & Peps</h1>
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: C.accent }}>Peps Anonymous</span>
            </div>
            <p className="text-[13px] leading-[1.7] mt-4" style={{ color: C.textMid, maxWidth: "380px" }}>
              UK-based single-vial compounds. Every batch independently verified by Janoshik Analytical. USDT. Discreet dispatch.
            </p>
            <div className="flex gap-5 mt-4">
              {["Janoshik CoA per batch", "BAC-safe", "USDT payments"].map(t => (
                <span key={t} className="text-[11px] flex items-center gap-1.5" style={{ color: C.textMuted }}>
                  <span style={{ color: C.ok, fontWeight: 700 }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Table */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
              <span className="text-[9px] font-semibold tracking-[0.3em] uppercase" style={{ color: C.textMuted }}>Current Inventory</span>
              <button className="text-[10.5px] flex items-center gap-1" style={{ color: C.textMid }}>Full catalogue <ArrowRight className="w-3 h-3" /></button>
            </div>

            <div className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 64px 90px 104px 48px", paddingBottom: "8px", borderBottom: `1.5px solid ${C.borderStrong}` }}>
              {["Code", "Compound", "Mg", "Price", "Lot", ""].map(col => (
                <span key={col} className="text-[9px] font-semibold tracking-[0.15em] uppercase" style={{ color: C.textMuted }}>{col}</span>
              ))}
            </div>

            {PRODUCTS.map((p, i) => (
              <div key={p.code} className="grid items-center" style={{ gridTemplateColumns: "52px 1fr 64px 90px 104px 48px", padding: "12px 0", borderBottom: i < PRODUCTS.length - 1 ? `1px solid ${C.borderFaint}` : "none" }}>
                <span className="text-[10px] font-mono" style={{ color: C.textMuted }}>{p.code}</span>
                <div>
                  <span className="text-[13px] font-semibold" style={{ color: p.stock ? C.text : C.textMuted, fontFamily: "'Outfit', sans-serif" }}>{p.name}</span>
                  {!p.stock && (
                    <div className="text-[10px] font-medium" style={{ color: C.error }}>Out of stock</div>
                  )}
                </div>
                <span className="text-[12px]" style={{ color: C.textMid }}>{p.mg}</span>
                <span className="text-[15px] font-bold tabular-nums" style={{ color: C.text, fontFamily: "'Outfit', sans-serif" }}>£{p.price}</span>
                <div>
                  {p.lot !== "—" ? (
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded" style={{ background: C.accentTag, color: C.tagText, border: `1px solid ${C.border}` }}>{p.lot}</span>
                  ) : (
                    <span className="text-[10px]" style={{ color: C.textMuted }}>—</span>
                  )}
                </div>
                <div>
                  {p.stock ? (
                    <button className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors" style={{ background: C.accent, color: "#FBF6E9" }}>Add</button>
                  ) : (
                    <button disabled className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: C.borderFaint, color: C.textMuted, cursor: "not-allowed" }}>Add</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col" style={{ width: "40%", padding: "32px 32px 24px", overflow: "auto" }}>

          <div style={{ marginBottom: "28px" }}>
            <span className="text-[9px] font-semibold tracking-[0.3em] uppercase" style={{ color: C.textMuted, display: "block", marginBottom: "14px", paddingBottom: "10px", borderBottom: `1px solid ${C.border}` }}>Resources</span>
            {RESOURCES.map((r, i) => (
              <div key={r.label} className="flex items-center gap-4 py-3.5 cursor-pointer" style={{ borderBottom: i < RESOURCES.length - 1 ? `1px solid ${C.borderFaint}` : "none" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.accentSoft }}>
                  <r.icon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold" style={{ color: C.text }}>{r.label}</div>
                  <div className="text-[11px]" style={{ color: C.textMuted }}>{r.sub}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: C.textMuted }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "28px" }}>
            <span className="text-[9px] font-semibold tracking-[0.3em] uppercase" style={{ color: C.textMuted, display: "block", marginBottom: "14px", paddingBottom: "10px", borderBottom: `1px solid ${C.border}` }}>Quick Utilities</span>
            {UTILITIES.map((u, i) => (
              <div key={u.label} className="flex items-center gap-4 py-3.5 cursor-pointer" style={{ borderBottom: i < UTILITIES.length - 1 ? `1px solid ${C.borderFaint}` : "none" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.accentSoft }}>
                  <u.icon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold" style={{ color: C.text }}>{u.label}</div>
                  <div className="text-[11px]" style={{ color: C.textMuted }}>{u.sub}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: C.textMuted }} />
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div className="p-5 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="text-[12px] font-bold mb-2" style={{ color: C.text, fontFamily: "'Outfit', sans-serif" }}>About this batch</div>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: C.textMid }}>
                Every compound is independently tested by Janoshik Analytical. CoA reports available for each lot number shown in the inventory.
              </p>
              <button className="text-[11px] font-semibold flex items-center gap-1" style={{ color: C.accent }}>
                Browse lab reports <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <span className="text-[11px]" style={{ color: C.textMuted }}>@urbanblend789</span>
              <span className="text-[11px]" style={{ color: C.textMuted }}>GBP · Member</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
