import { ArrowUpRight } from "lucide-react";

// Hypothesis: "Vial label strip" — the card mimics the actual label wrapped
// around a peptide vial. Coloured header band = compound class (teal for
// GLP-1, amber for healing, etc.). Visual colour-coding makes the list
// scannable by category before the user even reads.

export function Passport() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#F4F5F7", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 340,
          height: 420,
          background: "#FFFFFF",
          borderRadius: 14,
          boxShadow: "0 1px 0 rgba(15,23,42,0.04), 0 18px 36px rgba(15,23,42,0.10)",
        }}
      >
        {/* Category band */}
        <div
          className="absolute inset-x-0 top-0 h-[72px] flex items-end justify-between px-5 pb-2"
          style={{
            background:
              "linear-gradient(100deg, #0D9488 0%, #14B8A6 60%, #2DD4BF 100%)",
          }}
        >
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase font-semibold text-white/70">
              GLP-1 · GIP
            </div>
            <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/90">
              Uther lot
            </div>
          </div>
          <span className="text-[10px] text-white/80 font-mono tracking-wider">
            ZE30-0319
          </span>
        </div>

        <div className="relative pt-[84px] h-full flex flex-col px-5 pb-5">
          {/* Identity */}
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight leading-none text-slate-900">
              Tirzepatide
            </h1>
            <div className="text-[12px] text-slate-500 mt-1">
              10 mg · lyophilised
            </div>
          </div>

          {/* Dual stat */}
          <div
            className="mt-4 grid grid-cols-2"
            style={{ borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}
          >
            <div className="py-3 pr-3" style={{ borderRight: "1px solid #E2E8F0" }}>
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
                Purity
              </div>
              <div className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 mt-1">
                99.89<span className="text-sm text-slate-400">%</span>
              </div>
            </div>
            <div className="py-3 pl-3">
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
                Actual mass
              </div>
              <div className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 mt-1">
                10.1<span className="text-sm text-slate-400">mg</span>
              </div>
            </div>
          </div>

          {/* Quiet meta */}
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tested by Janoshik</span>
            <span>10 Apr 2026</span>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between">
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-full"
              style={{ background: "#ECFDF5" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5.2 L4 7 L8 3"
                  stroke="#047857"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span className="text-[10px] font-semibold" style={{ color: "#047857" }}>
                Meets spec
              </span>
            </div>
            <button className="flex items-center gap-1 text-[11px] font-semibold text-slate-900">
              View <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
