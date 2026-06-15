import { ArrowUpRight } from "lucide-react";

// Hypothesis: "Purity ring" — a single circular gauge turns the assay into a
// quickly-readable visual. In a scrolling list the ring's fill tells the eye
// "pure / impure" before text is even processed. Pharma-soft, almost UI-kit
// clean. One accent.

export function Editorial() {
  const purity = 99.89;
  const size = 128;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = purity / 100;
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#F3F4F6", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 340,
          height: 420,
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(15,23,42,0.08)",
          padding: 24,
        }}
      >
        {/* Top meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#14B8A6" }}
            />
            <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-500">
              GLP-1
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">ZE30-0319</span>
        </div>

        {/* Ring + center text */}
        <div className="mt-4 flex items-center justify-center">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#EEF2F7"
                strokeWidth={stroke}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="url(#puritygrad)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${c * pct} ${c}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
              <defs>
                <linearGradient id="puritygrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" />
                  <stop offset="100%" stopColor="#0F766E" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
                Purity
              </div>
              <div className="text-[26px] font-semibold leading-none tracking-tight text-slate-900 mt-1">
                99.89<span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="mt-4 text-center">
          <h1 className="text-[20px] font-semibold tracking-tight leading-none text-slate-900">
            Tirzepatide
          </h1>
          <div className="text-[12px] text-slate-500 mt-1">
            10 mg · Uther · 3rd-party
          </div>
        </div>

        {/* Quiet footer */}
        <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
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
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-900 leading-tight">
                Passed
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                Janoshik · 10 Apr
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "#0F172A", color: "#fff" }}
          >
            Open <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
