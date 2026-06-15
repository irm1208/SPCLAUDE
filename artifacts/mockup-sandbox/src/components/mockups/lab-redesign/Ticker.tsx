import { ArrowUpRight } from "lucide-react";

// Hypothesis: "Big number first" — in a list of 1000, purity is the scannable
// signal. Make the assay the hero; everything else is quiet supporting text.
// One accent colour tied to pass/fail status. Breathing room.

export function Ticker() {
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
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(15,23,42,0.08)",
        }}
      >
        {/* Status spine */}
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: "#10B981" }}
        />

        <div className="relative h-full flex flex-col p-6">
          {/* Top meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">
                Uther
              </span>
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "#CBD5E1" }}
              />
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">
                3P
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">ZE30-0319</span>
          </div>

          {/* The number */}
          <div className="mt-10">
            <div className="flex items-baseline">
              <span
                className="text-[96px] leading-[0.85] font-semibold tracking-[-0.04em]"
                style={{ color: "#0F172A" }}
              >
                99
              </span>
              <span
                className="text-[56px] leading-[0.85] font-semibold tracking-[-0.04em]"
                style={{ color: "#10B981" }}
              >
                .89
              </span>
              <span className="text-[28px] font-semibold text-slate-300 ml-1">
                %
              </span>
            </div>
            <div className="mt-2 text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              HPLC purity · spec ≥ 98%
            </div>
          </div>

          {/* Identity */}
          <div className="mt-auto">
            <h1 className="text-[20px] font-semibold tracking-tight text-slate-900 leading-none">
              Tirzepatide
            </h1>
            <div className="text-[12px] text-slate-500 mt-1">
              10 mg · tested 10 Apr · Janoshik
            </div>
          </div>

          {/* CTA row */}
          <div className="mt-4 flex items-center justify-between">
            <span
              className="text-[10px] font-semibold tracking-wide px-2 py-1 rounded"
              style={{ background: "#ECFDF5", color: "#047857" }}
            >
              Passes all specs
            </span>
            <button
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: "#0F172A" }}
            >
              Open
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
