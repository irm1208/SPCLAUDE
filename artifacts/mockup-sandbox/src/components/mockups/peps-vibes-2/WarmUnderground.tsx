import { FlaskConical, TestTube, BookOpen, Package, Calculator, Search, Zap, Plus, ArrowRight, ShieldCheck, Flame } from "lucide-react";

const PRODUCTS = [
  { name: "Semaglutide 10mg", mg: "10", price: "55.00", stock: true },
  { name: "Tirzepatide 15mg", mg: "15", price: "80.00", stock: true },
  { name: "BPC 157 10mg", mg: "10", price: "45.00", stock: true },
  { name: "TB500 (TB4) 10mg", mg: "10", price: "85.00", stock: true },
  { name: "Retatrutide 10mg", mg: "10", price: "95.00", stock: true },
  { name: "Epitalon 10mg", mg: "10", price: "45.00", stock: false },
];

const SECTIONS = [
  { label: "The Lonely Vial", eyebrow: "Single Vials", icon: FlaskConical, bg: "bg-[#1C0F07]", border: "border-[#4A2010]", accent: "#D97706" },
  { label: "Accessories", eyebrow: "Essential Kit", icon: Package, bg: "bg-[#170D04]", border: "border-[#3D1E08]", accent: "#B45309" },
  { label: "Lab Reports", eyebrow: "Quality Assurance", icon: TestTube, bg: "bg-[#131009]", border: "border-[#352810]", accent: "#92400E" },
  { label: "Protocols", eyebrow: "Pepedia", icon: BookOpen, bg: "bg-[#120B0A]", border: "border-[#3D1A14]", accent: "#C2410C" },
];

export function WarmUnderground() {
  return (
    <div className="flex min-h-screen font-['Inter',sans-serif]" style={{ background: "#0D0804" }}>

      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r" style={{ background: "#0A0603", borderColor: "#1F1209" }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1F1209" }}>
          <div className="font-['Outfit',sans-serif] text-xl font-bold" style={{ color: "#F5E6C8" }}>Salt & Peps</div>
          <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: "#5C3D1E" }}>Peps Anonymous</div>
        </div>

        <div className="px-3 py-3 border-b" style={{ borderColor: "#1F1209" }}>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] border hover:opacity-80 transition-opacity" style={{ background: "#1C0F07", borderColor: "#3D1E08", color: "#8B6340" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#3D1E08" }} />
            Login / My Orders
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "#1C0F07", border: "1px solid #4A2010" }}>
            <Flame className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
            <span className="text-[12px] font-medium" style={{ color: "#F5E6C8" }}>Home</span>
          </div>

          <div className="pt-4 pb-1">
            <div className="text-[9px] tracking-widest uppercase px-3 pb-1 font-semibold" style={{ color: "#3D1E08" }}>Shop</div>
          </div>
          {["The Lonely Vial", "Accessories"].map(l => (
            <div key={l} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#5C3D1E" }} />
              <span className="text-[12px]" style={{ color: "#8B6340" }}>{l}</span>
            </div>
          ))}

          <div className="pt-4 pb-1">
            <div className="text-[9px] tracking-widest uppercase px-3 pb-1 font-semibold" style={{ color: "#3D1E08" }}>Tools</div>
          </div>
          {["Lab Reports", "Protocols", "Safety Calc", "Dose Calc"].map(l => (
            <div key={l} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#3D1E08" }} />
              <span className="text-[12px]" style={{ color: "#6B4A28" }}>{l}</span>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t flex items-center justify-between" style={{ borderColor: "#1F1209" }}>
          <span className="text-[11px]" style={{ color: "#5C3D1E" }}>@urbanblend789</span>
          <span className="text-[11px]" style={{ color: "#3D1E08" }}>$ USD</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">

        {/* Countdown Banner */}
        <div className="px-6 py-3 border-b flex items-center justify-between" style={{ background: "#0A0603", borderColor: "#1F1209" }}>
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4" style={{ color: "#D97706" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B6340" }}>Group Buy Closes</span>
            <span className="text-[11px]" style={{ color: "#D97706" }}>28 Oct 23:59</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: "#5C3D1E" }}>Remaining</span>
            <span className="text-[13px] font-bold" style={{ color: "#D97706" }}>6 months</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {/* Hero */}
          <div className="rounded-2xl p-8 border relative overflow-hidden" style={{ background: "#0F0804", borderColor: "#2E1A0A" }}>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: "radial-gradient(circle, #D97706, transparent)", transform: "translate(30%, -30%)" }} />
            <div className="text-[10px] tracking-[0.25em] uppercase font-semibold mb-4" style={{ color: "#8B6340" }}>Quality · Tested · Discreet</div>
            <h1 className="font-['Outfit',sans-serif] text-5xl font-extrabold mb-1" style={{ color: "#F5E6C8" }}>Salt & Peps</h1>
            <div className="text-[13px] tracking-widest uppercase mb-5 font-medium" style={{ color: "#5C3D1E" }}>Peps Anonymous</div>
            <p className="text-[14px] leading-relaxed max-w-md mb-8" style={{ color: "#8B6340" }}>
              Peptide single-vial shop, independent lab reports, and dosing tools — all in one place.
            </p>
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: FlaskConical, label: "Janoshik Tested" },
                { icon: ShieldCheck, label: "BAC Safe" },
                { icon: Zap, label: "USDT Payments" },
              ].map(chip => (
                <div key={chip.label} className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: "#1C0F07", borderColor: "#4A2010" }}>
                  <chip.icon className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
                  <span className="text-[11px] font-medium" style={{ color: "#A07040" }}>{chip.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "#D97706" }} />
                <span className="text-[13px] font-semibold" style={{ color: "#A07040" }}>Available Now</span>
              </div>
              <button className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#D97706" }}>
                Full shop <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border" style={{ background: "#0F0804", borderColor: "#2E1A0A" }}>
              {PRODUCTS.map((p, i) => (
                <div key={p.name} className={`flex items-center px-5 py-3.5 gap-4 ${i < PRODUCTS.length - 1 ? "border-b" : ""}`} style={{ borderColor: "#1C0F07" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1C0F07" }}>
                    <FlaskConical className="w-4 h-4" style={{ color: "#D97706" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: "#D4B896" }}>{p.name}</div>
                    <div className="text-[11px]" style={{ color: "#5C3D1E" }}>{p.mg}mg</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-bold tabular-nums" style={{ color: "#F5E6C8" }}>£{p.price}</div>
                    <div className="text-[10px] font-semibold" style={{ color: p.stock ? "#D97706" : "#3D1E08" }}>
                      {p.stock ? "In stock" : "Out of stock"}
                    </div>
                  </div>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border hover:opacity-80 transition-opacity" style={{ background: "#1C0F07", borderColor: "#4A2010" }}>
                    <Plus className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Explore Cards */}
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold mb-4" style={{ color: "#5C3D1E" }}>Explore</div>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map(s => (
                <div key={s.label} className={`rounded-2xl p-5 border cursor-pointer hover:opacity-90 transition-opacity ${s.bg} ${s.border}`} style={{ border: `1px solid`, borderColor: s.border.replace("border-[", "").replace("]", "") }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-[9px] tracking-widest uppercase font-semibold mb-1" style={{ color: s.accent, opacity: 0.7 }}>{s.eyebrow}</div>
                      <div className="text-[15px] font-bold font-['Outfit',sans-serif]" style={{ color: "#D4B896" }}>{s.label}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <s.icon className="w-4 h-4" style={{ color: s.accent }} />
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: s.accent }}>
                    Browse <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Utilities */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "#0F0804", borderColor: "#2E1A0A" }}>
            {[
              { icon: Calculator, label: "Dose Calculator", desc: "Reconstitution volumes and dosing" },
              { icon: FlaskConical, label: "Endotoxin Calc", desc: "EU/kg safety threshold" },
              { icon: Search, label: "Order Lookup", desc: "Track your order" },
            ].map((u, i, arr) => (
              <div key={u.label} className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:opacity-80 transition-opacity ${i < arr.length - 1 ? "border-b" : ""}`} style={{ borderColor: "#1C0F07" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1C0F07" }}>
                  <u.icon className="w-4 h-4" style={{ color: "#D97706" }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: "#D4B896" }}>{u.label}</div>
                  <div className="text-[11px]" style={{ color: "#5C3D1E" }}>{u.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4" style={{ color: "#3D1E08" }} />
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
