import { FlaskConical, ArrowRight, ChevronDown } from "lucide-react";

const FEATURED = {
  name: "Semaglutide",
  mg: "10mg",
  code: "SEM-10",
  price: "55.00",
  lot: "JAN-2406-01",
  desc: "GLP-1 receptor agonist. Research compound. Lyophilised powder, 10 mg per vial. Reconstitute with BAC water.",
  tags: ["Janoshik CoA", "Lyophilised", "10 mg / vial"],
};

const OTHERS = [
  { name: "Tirzepatide", mg: "15mg", price: "80.00" },
  { name: "BPC 157", mg: "10mg", price: "45.00" },
  { name: "Retatrutide", mg: "10mg", price: "95.00" },
  { name: "TB-500 (TB4)", mg: "10mg", price: "85.00" },
];

export function SingleFocus() {
  return (
    <div className="min-h-screen font-['Inter',sans-serif]" style={{ background: "#080E1C" }}>

      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span className="text-[12px] tracking-[0.15em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>Salt & Peps</span>
        <div className="flex items-center gap-5">
          <button className="text-[12px]" style={{ color: "rgba(255,255,255,0.2)" }}>The Lonely Vial</button>
          <button className="text-[12px]" style={{ color: "rgba(255,255,255,0.2)" }}>Login</button>
        </div>
      </header>

      {/* Full-bleed featured compound */}
      <div className="px-8 pt-12 pb-16 max-w-[700px]">

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(234,88,12,0.15)", border: "1px solid rgba(234,88,12,0.2)" }}>
            <FlaskConical className="w-3 h-3" style={{ color: "#EA580C" }} />
          </div>
          <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: "rgba(234,88,12,0.7)" }}>Featured Compound</span>
        </div>

        {/* Giant name */}
        <h1 className="font-['Outfit',sans-serif] leading-none mb-2" style={{ fontSize: "72px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
          {FEATURED.name}
        </h1>
        <div className="text-[16px] font-light mb-8" style={{ color: "rgba(255,255,255,0.25)" }}>{FEATURED.mg} vial · lot {FEATURED.lot}</div>

        {/* Description — generous, full-width */}
        <p className="text-[18px] leading-[1.7] mb-10" style={{ color: "rgba(255,255,255,0.5)", maxWidth: "520px" }}>
          {FEATURED.desc}
        </p>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap mb-12">
          {FEATURED.tags.map(t => (
            <span key={t} className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
              {t}
            </span>
          ))}
        </div>

        {/* Price + CTA — the only action on the page */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>Price</div>
            <div className="font-['Outfit',sans-serif] text-[40px] font-bold tabular-nums" style={{ color: "#FFFFFF" }}>£{FEATURED.price}</div>
          </div>
          <button className="flex-1 max-w-[220px] py-4 rounded-xl font-semibold text-[15px] transition-opacity hover:opacity-90" style={{ background: "#EA580C", color: "#FFFFFF" }}>
            Add to order
          </button>
        </div>

        {/* Subtle COA link */}
        <div className="mt-6">
          <button className="text-[12px] flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
            View Janoshik CoA <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Divider with scroll hint */}
      <div className="flex items-center gap-4 px-8 mb-10" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="py-5 flex items-center gap-2">
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.15)" }} />
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>Other compounds</span>
        </div>
      </div>

      {/* Secondary — minimal other products, subordinate to featured */}
      <div className="px-8 pb-16">
        <div className="grid grid-cols-4 gap-3 max-w-[680px]">
          {OTHERS.map(p => (
            <button key={p.name} className="text-left rounded-2xl p-4 transition-colors" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-[13px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>{p.name}</div>
              <div className="text-[11px] mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>{p.mg}</div>
              <div className="text-[15px] font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.6)" }}>£{p.price}</div>
            </button>
          ))}
        </div>
        <div className="mt-5">
          <button className="text-[12px] flex items-center gap-1.5" style={{ color: "rgba(234,88,12,0.5)" }}>
            Full catalogue — 128 compounds <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Absolute minimal footer */}
      <div className="px-8 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>@urbanblend789</span>
          <div className="flex items-center gap-4">
            {["Lab Reports", "Protocols", "Dose Calc"].map(l => (
              <button key={l} className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
