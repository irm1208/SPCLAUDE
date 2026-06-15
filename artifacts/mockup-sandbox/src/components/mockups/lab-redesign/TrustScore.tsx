import { ArrowUpRight, Info } from "lucide-react";

// Hypothesis: abstract the raw numbers into a single composite "Trust Score"
// (0–100) blending purity, source (3rd-party vs vendor), lab reputation, and
// test coverage. Most users cannot meaningfully interpret "99.892% HPLC";
// they can interpret "94 / Excellent". The score is the unit; a small
// breakdown bar shows *why* without forcing the user to read it.

export function TrustScore() {
  const score = 94;
  // contribution breakdown (sum = score)
  const parts = [
    { label: "Purity", pts: 38, color: "#14B8A6" },
    { label: "3rd-party", pts: 24, color: "#3B82F6" },
    { label: "Lab reputation", pts: 18, color: "#8B5CF6" },
    { label: "Test coverage", pts: 14, color: "#F59E0B" },
  ];
  const grade =
    score >= 90
      ? { label: "Excellent", color: "#047857" }
      : score >= 75
      ? { label: "Good", color: "#0369A1" }
      : score >= 60
      ? { label: "Fair", color: "#B45309" }
      : { label: "Poor", color: "#B91C1C" };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#F3F4F6", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 300,
          height: 380,
          background: "#FFFFFF",
          borderRadius: 18,
          boxShadow: "0 16px 32px rgba(15,23,42,0.08)",
          padding: 20,
        }}
      >
        {/* Top meta */}
        <div className="flex items-center justify-between text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
          <span>Trust score</span>
          <Info className="w-3 h-3" />
        </div>

        {/* Score + grade */}
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="text-[64px] leading-none font-semibold tracking-[-0.03em]"
            style={{ color: "#0F172A" }}
          >
            {score}
          </span>
          <span className="text-[18px] font-semibold text-slate-300">
            / 100
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${grade.color}14`, color: grade.color }}
          >
            {grade.label}
          </span>
          <span className="text-[11px] text-slate-500">
            higher than 82% of Uther batches
          </span>
        </div>

        {/* Stacked breakdown bar */}
        <div className="mt-4">
          <div
            className="w-full h-2.5 rounded-full overflow-hidden flex"
            style={{ background: "#F1F5F9" }}
          >
            {parts.map(p => (
              <div
                key={p.label}
                style={{
                  width: `${p.pts}%`,
                  background: p.color,
                }}
              />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            {parts.map(p => (
              <div key={p.label} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: p.color }}
                />
                <span className="text-slate-600">{p.label}</span>
                <span className="ml-auto font-semibold text-slate-900 tabular-nums">
                  +{p.pts}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Identity — captioned under the score */}
        <div className="mt-auto pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
          <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
            Batch
          </div>
          <h1 className="text-[16px] font-semibold tracking-tight text-slate-900 leading-tight mt-0.5">
            Tirzepatide 10 mg
          </h1>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Uther · ZE30-0319 · 10 Apr 26
          </div>
        </div>

        {/* CTA */}
        <button
          className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold"
          style={{ background: "#0F172A", color: "#fff" }}
        >
          <span>How we score</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
