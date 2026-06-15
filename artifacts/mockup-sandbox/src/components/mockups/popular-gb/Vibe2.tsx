export function Vibe2() {
  const items = [
    { name: "GHK-CU 100mg", score: 100 },
    { name: "Retatrutide 40mg", score: 94 },
    { name: "BAC Water 10ml", score: 88 },
    { name: "Tirzepatide 60mg", score: 62 },
    { name: "BPC-157 10mg", score: 48 },
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">
            ORDER FREQUENCY
          </span>
          <span className="text-[9px] font-mono text-slate-300 uppercase tracking-wider">n=421</span>
        </div>

        <div className="space-y-0 border border-slate-200 rounded-sm overflow-hidden">
          {items.map((item, idx) => (
            <div
              key={item.name}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                borderBottom: idx < items.length - 1 ? "1px solid #F1F5F9" : "none",
                background: "white",
              }}
            >
              <span className="text-[11px] font-mono font-bold text-slate-300 w-4 shrink-0 tabular-nums">
                {String(idx + 1).padStart(2, "0")}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1.5">
                  <span className="text-[12px] font-medium text-slate-700 truncate font-mono">{item.name}</span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0 ml-auto">{item.score}%</span>
                </div>
                <div className="relative h-[2px] bg-slate-100 rounded-none overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-700"
                    style={{
                      width: `${item.score}%`,
                      background: idx === 0 ? "#0F172A" : "#CBD5E1",
                    }}
                  />
                </div>
              </div>

              <button
                className="shrink-0 text-[10px] font-mono font-bold px-2.5 py-1 rounded-none border transition-all"
                style={{
                  border: "1px solid #E2E8F0",
                  color: "#64748B",
                  background: "transparent",
                  letterSpacing: "0.04em",
                }}
              >
                ADD
              </button>
            </div>
          ))}
        </div>

        <p className="text-[9px] font-mono text-slate-300 text-right mt-3 tracking-wider uppercase">
          Anonymised data
        </p>
      </div>
    </div>
  );
}
