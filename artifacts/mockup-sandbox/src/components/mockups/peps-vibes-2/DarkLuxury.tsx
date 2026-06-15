import { FlaskConical, TestTube, BookOpen, Package, Calculator, Search, Zap, Plus, ArrowRight, Shield, Gem } from "lucide-react";

const PRODUCTS = [
  { name: "Semaglutide 10mg", mg: "10", price: "55.00", stock: true },
  { name: "Tirzepatide 15mg", mg: "15", price: "80.00", stock: true },
  { name: "BPC 157 10mg", mg: "10", price: "45.00", stock: true },
  { name: "TB500 (TB4) 10mg", mg: "10", price: "85.00", stock: true },
  { name: "Retatrutide 10mg", mg: "10", price: "95.00", stock: true },
  { name: "Epitalon 10mg", mg: "10", price: "45.00", stock: false },
];

const SECTIONS = [
  { label: "The Lonely Vial", eyebrow: "Single Vials", icon: FlaskConical, desc: "Buy individual vials. No kits, no minimums." },
  { label: "Accessories", eyebrow: "Essential Kit", icon: Package, desc: "BAC water, syringes, prep kits." },
  { label: "Lab Reports", eyebrow: "Quality Assurance", icon: TestTube, desc: "352+ independent Janoshik CoA reports." },
  { label: "Protocols", eyebrow: "Pepedia", icon: BookOpen, desc: "Dosing guides for 30+ peptides." },
];

export function DarkLuxury() {
  return (
    <div className="flex min-h-screen font-['Inter',sans-serif]" style={{ background: "#08080C" }}>

      {/* Sidebar */}
      <aside className="w-[224px] shrink-0 flex flex-col border-r" style={{ background: "#06060A", borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Gem className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />
            <div className="font-['Outfit',sans-serif] text-[18px] font-light tracking-wide" style={{ color: "#F1F5F9" }}>Salt & Peps</div>
          </div>
          <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>Peps Anonymous</div>
        </div>

        <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[12px] border transition-colors" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            Login / My Orders
          </button>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.12)" }}>
            <div className="w-1 h-4 rounded-full" style={{ background: "#A78BFA" }} />
            <span className="text-[12px] font-medium" style={{ color: "#E2E8F0" }}>Home</span>
          </div>

          <div className="pt-5 pb-2">
            <div className="text-[9px] tracking-[0.25em] uppercase px-3 font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>Shop</div>
          </div>
          {["The Lonely Vial", "Accessories"].map(l => (
            <div key={l} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]">
              <div className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>{l}</span>
            </div>
          ))}

          <div className="pt-5 pb-2">
            <div className="text-[9px] tracking-[0.25em] uppercase px-3 font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>Tools</div>
          </div>
          {["Lab Reports", "Protocols", "Safety Calc", "Dose Calc"].map(l => (
            <div key={l} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]">
              <div className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</span>
            </div>
          ))}
        </nav>

        <div className="px-4 py-5 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>@urbanblend789</span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>$ USD</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">

        {/* Countdown */}
        <div className="px-8 py-3 border-b flex items-center justify-between" style={{ background: "#06060A", borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-4">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>Group Buy</span>
            <span className="text-[11px]" style={{ color: "rgba(167,139,250,0.6)" }}>Closes 28 Oct 23:59</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>Remaining</span>
            <span className="text-[12px] font-medium" style={{ color: "#C4B5FD" }}>6 months</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">

          {/* Hero */}
          <div className="rounded-[2rem] p-10 border relative overflow-hidden" style={{ background: "#0C0C12", borderColor: "rgba(255,255,255,0.04)", boxShadow: "0 0 80px rgba(124,58,237,0.04)" }}>
            <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(124,58,237,0.08), transparent 60%)" }} />
            <div className="relative">
              <div className="text-[10px] tracking-[0.3em] uppercase mb-6 font-medium" style={{ color: "rgba(167,139,250,0.5)" }}>
                Quality · Tested · Discreet
              </div>
              <h1 className="font-['Outfit',sans-serif] text-[52px] font-light tracking-wide leading-none mb-2" style={{ color: "#F1F5F9" }}>
                Salt & Peps
              </h1>
              <div className="text-[11px] tracking-[0.3em] uppercase mb-8" style={{ color: "rgba(255,255,255,0.2)" }}>
                Peps Anonymous
              </div>
              <p className="text-[14px] leading-relaxed max-w-sm mb-10" style={{ color: "rgba(255,255,255,0.3)", lineHeight: "1.8" }}>
                Peptide research compounds with independent laboratory verification and discreet UK dispatch.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { icon: FlaskConical, label: "Janoshik Tested" },
                  { icon: Shield, label: "BAC Safe" },
                  { icon: Zap, label: "USDT Payments" },
                ].map(chip => (
                  <div key={chip.label} className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                    <chip.icon className="w-3 h-3" style={{ color: "rgba(167,139,250,0.6)" }} />
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{chip.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-[12px] font-medium tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>Available Now</span>
              <button className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(167,139,250,0.6)" }}>
                Full shop <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="rounded-[1.5rem] overflow-hidden border" style={{ background: "#0C0C12", borderColor: "rgba(255,255,255,0.04)" }}>
              {PRODUCTS.map((p, i) => (
                <div key={p.name} className={`flex items-center px-6 py-4 gap-5 ${i < PRODUCTS.length - 1 ? "border-b" : ""}`} style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.08)" }}>
                    <FlaskConical className="w-4 h-4" style={{ color: "rgba(167,139,250,0.5)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-light truncate" style={{ color: "#E2E8F0" }}>{p.name}</div>
                    <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>{p.mg} mg</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[17px] font-light tabular-nums" style={{ color: "#F1F5F9" }}>£{p.price}</div>
                    <div className="text-[10px] font-medium" style={{ color: p.stock ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.15)" }}>
                      {p.stock ? "In stock" : "Out of stock"}
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                    <Plus className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Explore Cards */}
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase mb-5 font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>Explore</div>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map(s => (
                <div key={s.label} className="rounded-[1.5rem] p-6 border cursor-pointer transition-all hover:border-white/10 group" style={{ background: "#0C0C12", borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(167,139,250,0.4)" }}>{s.eyebrow}</div>
                    <s.icon className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.15)" }} />
                  </div>
                  <div className="font-['Outfit',sans-serif] text-[17px] font-light mb-2" style={{ color: "#E2E8F0" }}>{s.label}</div>
                  <div className="text-[11px] mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.2)", lineHeight: "1.7" }}>{s.desc}</div>
                  <button className="flex items-center gap-1.5 text-[11px] border border-transparent group-hover:border-white/10 px-3 py-1.5 rounded-full transition-all" style={{ color: "rgba(167,139,250,0.6)" }}>
                    Explore <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Utilities */}
          <div className="rounded-[1.5rem] border overflow-hidden" style={{ background: "#0C0C12", borderColor: "rgba(255,255,255,0.04)" }}>
            {[
              { icon: Calculator, label: "Dose Calculator", desc: "Reconstitution volumes and dosing intervals" },
              { icon: FlaskConical, label: "Endotoxin Calc", desc: "EU/kg safety threshold checking" },
              { icon: Search, label: "Order Lookup", desc: "Retrieve and track your order" },
            ].map((u, i, arr) => (
              <div key={u.label} className={`flex items-center gap-4 px-6 py-5 cursor-pointer transition-colors hover:bg-white/[0.01] ${i < arr.length - 1 ? "border-b" : ""}`} style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                <u.icon className="w-4 h-4 shrink-0" style={{ color: "rgba(167,139,250,0.4)" }} />
                <div className="flex-1">
                  <div className="text-[13px] font-light" style={{ color: "#E2E8F0" }}>{u.label}</div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>{u.desc}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.1)" }} />
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
