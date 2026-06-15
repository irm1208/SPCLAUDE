import { ArrowUpRight } from "lucide-react";

// Hypothesis: a single test doesn't mean much in isolation — a supplier's
// *consistency over time* does. Reframe the card as a node on the batch
// history line for Tirzepatide @ Uther. The eye learns "this supplier runs
// 99%+ consistently" in half a second, which the detail of one batch never
// conveys. Context over point data.

type Batch = {
  id: string;
  date: string;
  purity: number;
  current?: boolean;
};

export function Timeline() {
  const batches: Batch[] = [
    { id: "ZE24-0286", date: "Dec 25", purity: 99.12 },
    { id: "ZE26-0294", date: "Jan 26", purity: 98.87 },
    { id: "ZE27-0301", date: "Feb 26", purity: 99.44 },
    { id: "ZE29-0310", date: "Mar 26", purity: 99.06 },
    { id: "ZE30-0319", date: "Apr 26", purity: 99.89, current: true },
  ];
  const min = 98;
  const max = 100;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#F3F4F6", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 480,
          height: 380,
          background: "#FFFFFF",
          borderRadius: 18,
          boxShadow: "0 16px 32px rgba(15,23,42,0.08)",
          padding: 22,
        }}
      >
        {/* Top — identity */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              Batch history · Uther
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight text-slate-900 leading-tight mt-1">
              Tirzepatide 10 mg
            </h1>
            <div className="text-[11px] text-slate-500 mt-0.5">
              5 consecutive batches · third-party tested
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              Mean · 12 mo
            </div>
            <div className="text-[16px] font-semibold text-slate-900 leading-none mt-0.5">
              99.28%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">σ 0.37</div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-5 flex-1 flex flex-col">
          <div className="relative flex-1">
            {/* Spec line */}
            <div
              className="absolute inset-x-0 border-t border-dashed pointer-events-none"
              style={{
                top: `${(1 - (98 - min) / (max - min)) * 100}%`,
                borderColor: "#CBD5E1",
              }}
            />
            <div
              className="absolute text-[9px] text-slate-400 tracking-wider"
              style={{
                top: `${(1 - (98 - min) / (max - min)) * 100}%`,
                right: 0,
                transform: "translateY(-14px)",
              }}
            >
              spec 98%
            </div>

            {/* SVG line */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polyline
                points={batches
                  .map((b, i) => {
                    const x = (i / (batches.length - 1)) * 100;
                    const y = (1 - (b.purity - min) / (max - min)) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#14B8A6"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            {/* Nodes */}
            {batches.map((b, i) => {
              const xPct = (i / (batches.length - 1)) * 100;
              const yPct = (1 - (b.purity - min) / (max - min)) * 100;
              return (
                <div
                  key={b.id}
                  className="absolute"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: b.current ? 14 : 8,
                      height: b.current ? 14 : 8,
                      background: b.current ? "#0F172A" : "#14B8A6",
                      boxShadow: b.current
                        ? "0 0 0 4px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.2)"
                        : "0 0 0 3px #fff",
                    }}
                  />
                  {b.current && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{ bottom: "calc(100% + 8px)" }}
                    >
                      <div
                        className="px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap"
                        style={{ background: "#0F172A", color: "#fff" }}
                      >
                        {b.purity.toFixed(2)}%
                      </div>
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 -bottom-0.5"
                        style={{ background: "#0F172A" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X labels */}
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
            {batches.map(b => (
              <span
                key={b.id}
                className={b.current ? "text-slate-900 font-semibold" : ""}
              >
                {b.date}
              </span>
            ))}
          </div>
        </div>

        {/* Footer — current batch + CTA */}
        <div
          className="mt-4 pt-3 flex items-center justify-between"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          <div>
            <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              This batch
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[13px] font-mono font-semibold text-slate-900">
                ZE30-0319
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "#ECFDF5", color: "#047857" }}
              >
                Best in 12 mo
              </span>
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold"
            style={{ background: "#0F172A", color: "#fff" }}
          >
            Open batch
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
