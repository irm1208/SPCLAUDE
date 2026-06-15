import { FlaskConical, TestTube, BookOpen, Package, Calculator, Search, Zap, Plus, ChevronRight, Activity, Shield, Cpu } from "lucide-react";

const NAV = [
  { label: "Home", active: true },
  { label: "The Lonely Vial", group: "SHOP" },
  { label: "Accessories", group: false },
  { label: "Lab Reports", group: "TOOLS" },
  { label: "Protocols", group: false },
  { label: "Safety Calc", group: false },
  { label: "Dose Calc", group: false },
];

const PRODUCTS = [
  { name: "Semaglutide 10mg", mg: "10", price: "55.00", stock: true },
  { name: "Tirzepatide 15mg", mg: "15", price: "80.00", stock: true },
  { name: "BPC 157 10mg", mg: "10", price: "45.00", stock: true },
  { name: "TB500 (TB4) 10mg", mg: "10", price: "85.00", stock: true },
  { name: "Retatrutide 10mg", mg: "10", price: "95.00", stock: true },
  { name: "Epitalon 10mg", mg: "10", price: "45.00", stock: false },
];

const SECTIONS = [
  { label: "Single Vials", sub: "The Lonely Vial", icon: FlaskConical, tag: "SHOP" },
  { label: "Essential Kit", sub: "Accessories", icon: Package, tag: "SUPPLY" },
  { label: "Quality Assurance", sub: "Lab Reports", icon: TestTube, tag: "352 TESTS" },
  { label: "Pepedia", sub: "Protocols", icon: BookOpen, tag: "DOCS" },
];

export function StarkClinical() {
  return (
    <div className="flex min-h-screen bg-[#080D12] font-['Inter',sans-serif] text-[#94A3B8]">

      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-[#060A0F] border-r border-[#0F1D2B] flex flex-col">
        <div className="px-5 py-5 border-b border-[#0F1D2B]">
          <div className="text-[11px] font-mono tracking-[0.2em] text-[#2DD4BF] uppercase mb-0.5">SALT & PEPS</div>
          <div className="text-[10px] font-mono tracking-[0.15em] text-[#334155] uppercase">PEPS ANONYMOUS</div>
        </div>

        <div className="px-3 py-3 border-b border-[#0F1D2B]">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm bg-[#0F1D2B] border border-[#1E3A4F] text-[11px] font-mono text-[#64748B] hover:border-[#2DD4BF]/30 transition-colors">
            <div className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
            Login / My Orders
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { label: "HOME", active: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#0F1D2B] border border-[#1E3A4F]">
              <div className="w-1 h-4 bg-[#2DD4BF] rounded-full" />
              <span className="text-[11px] font-mono tracking-wider text-[#2DD4BF]">{item.label}</span>
            </div>
          ))}

          <div className="pt-3 pb-1">
            <div className="text-[9px] font-mono tracking-[0.25em] text-[#1E3A4F] uppercase px-3 pb-1">SHOP</div>
          </div>
          {["The Lonely Vial", "Accessories"].map(l => (
            <div key={l} className="flex items-center gap-2 px-3 py-1.5 rounded-sm hover:bg-[#0A1520] cursor-pointer transition-colors">
              <div className="w-1 h-1 rounded-full bg-[#1E3A4F]" />
              <span className="text-[11px] font-mono text-[#475569] hover:text-[#64748B]">{l}</span>
            </div>
          ))}

          <div className="pt-3 pb-1">
            <div className="text-[9px] font-mono tracking-[0.25em] text-[#1E3A4F] uppercase px-3 pb-1">TOOLS</div>
          </div>
          {["Lab Reports", "Protocols", "Safety Calc", "Dose Calc"].map(l => (
            <div key={l} className="flex items-center gap-2 px-3 py-1.5 rounded-sm hover:bg-[#0A1520] cursor-pointer transition-colors">
              <div className="w-1 h-1 rounded-full bg-[#1E3A4F]" />
              <span className="text-[11px] font-mono text-[#475569]">{l}</span>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#0F1D2B] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#334155]">@urbanblend789</span>
          <span className="text-[10px] font-mono text-[#1E3A4F]">$ USD</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">

        {/* Countdown Banner */}
        <div className="border-b border-[#0F1D2B] bg-[#060A0F] px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-3 h-3 text-[#2DD4BF]" />
            <span className="text-[10px] font-mono tracking-wider text-[#475569] uppercase">GROUP BUY CLOSES</span>
            <span className="text-[10px] font-mono text-[#2DD4BF]">28 Oct 23:59</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider text-[#334155] uppercase">REMAINING</span>
            <span className="text-[11px] font-mono font-bold text-[#2DD4BF]">6 MONTHS</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {/* Hero */}
          <div className="border border-[#0F1D2B] rounded-md bg-[#060A0F] p-8">
            <div className="text-[10px] font-mono tracking-[0.3em] text-[#2DD4BF] uppercase mb-4">QUALITY · TESTED · DISCREET</div>
            <h1 className="font-['Outfit',sans-serif] text-4xl font-extrabold text-white tracking-tight mb-1">Salt & Peps</h1>
            <div className="text-[12px] font-mono text-[#334155] tracking-widest uppercase mb-6">PEPS ANONYMOUS</div>
            <p className="text-[13px] text-[#475569] max-w-lg leading-relaxed mb-7">
              Peptide research compounds. Independent lab verification. Discreet UK dispatch.
            </p>
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: FlaskConical, label: "JANOSHIK TESTED" },
                { icon: Shield, label: "BAC SAFE" },
                { icon: Zap, label: "USDT PAYMENTS" },
              ].map(chip => (
                <div key={chip.label} className="flex items-center gap-2 border border-[#1E3A4F] bg-[#0A1520] px-3 py-1.5 rounded-sm">
                  <chip.icon className="w-3 h-3 text-[#2DD4BF]" />
                  <span className="text-[10px] font-mono tracking-[0.15em] text-[#64748B]">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Cpu className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase">Available Now</span>
              </div>
              <button className="flex items-center gap-1 text-[10px] font-mono text-[#2DD4BF] hover:text-[#5EEAD4] transition-colors">
                FULL CATALOG <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="border border-[#0F1D2B] rounded-md overflow-hidden bg-[#060A0F]">
              {PRODUCTS.map((p, i) => (
                <div key={p.name} className={`flex items-center px-4 py-3 gap-4 ${i < PRODUCTS.length - 1 ? "border-b border-[#0A1520]" : ""} hover:bg-[#0A1520] transition-colors`}>
                  <div className="w-6 h-6 rounded-sm bg-[#0F1D2B] border border-[#1E3A4F] flex items-center justify-center shrink-0">
                    <FlaskConical className="w-3 h-3 text-[#2DD4BF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-mono text-[#94A3B8] truncate">{p.name}</div>
                    <div className="text-[10px] font-mono text-[#334155]">MG: {p.mg}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-mono font-bold text-white tabular-nums">${p.price}</div>
                    <div className={`text-[9px] font-mono tracking-widest ${p.stock ? "text-[#2DD4BF]" : "text-[#334155]"}`}>
                      {p.stock ? "IN STOCK" : "OUT"}
                    </div>
                  </div>
                  <button className="w-6 h-6 border border-[#1E3A4F] rounded-sm flex items-center justify-center hover:border-[#2DD4BF]/50 hover:bg-[#0F1D2B] transition-colors shrink-0">
                    <Plus className="w-3 h-3 text-[#475569]" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Explore Cards */}
          <div>
            <div className="text-[9px] font-mono tracking-[0.25em] text-[#1E3A4F] uppercase mb-3">EXPLORE</div>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(s => (
                <div key={s.label} className="border border-[#0F1D2B] rounded-md bg-[#060A0F] p-4 hover:border-[#1E3A4F] transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] font-mono tracking-[0.2em] text-[#334155] uppercase">{s.tag}</div>
                    <s.icon className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  </div>
                  <div className="text-[12px] font-mono font-semibold text-[#64748B] mb-0.5">{s.sub}</div>
                  <div className="text-[11px] font-mono text-[#1E3A4F] group-hover:text-[#334155] transition-colors">{s.label} →</div>
                </div>
              ))}
            </div>
          </div>

          {/* Utilities */}
          <div className="border border-[#0F1D2B] rounded-md bg-[#060A0F] overflow-hidden">
            {[
              { icon: Calculator, label: "Dose Calculator", desc: "Compute reconstitution volumes" },
              { icon: Activity, label: "Endotoxin Calc", desc: "EU/kg safety threshold checker" },
              { icon: Search, label: "Order Lookup", desc: "Track your order by code" },
            ].map((u, i, arr) => (
              <div key={u.label} className={`flex items-center gap-3 px-4 py-3 hover:bg-[#0A1520] cursor-pointer transition-colors ${i < arr.length - 1 ? "border-b border-[#0A1520]" : ""}`}>
                <u.icon className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
                <div className="flex-1">
                  <div className="text-[12px] font-mono text-[#64748B]">{u.label}</div>
                  <div className="text-[10px] font-mono text-[#334155]">{u.desc}</div>
                </div>
                <ChevronRight className="w-3 h-3 text-[#1E3A4F]" />
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
