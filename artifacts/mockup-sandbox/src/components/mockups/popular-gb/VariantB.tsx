export function VariantB() {
  const items = [
    { name: "GHK-CU 100mg", score: 100 },
    { name: "Retatrutide 40mg", score: 94 },
    { name: "BAC Water 10ml", score: 88 },
    { name: "Tirzepatide 60mg", score: 62 },
    { name: "BPC-157 10mg", score: 48 },
  ];

  const medals = ["🥇", "🥈", "🥉", "4", "5"];
  const barColor = (score: number) =>
    score >= 90 ? "#10B981" : score >= 65 ? "#3B82F6" : "#94A3B8";

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-2">

        <div className="flex items-center gap-2 px-1 mb-3">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
          </svg>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Most ordered</span>
        </div>

        {items.map((item, idx) => (
          <div
            key={item.name}
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-blue-100 hover:shadow-[0_2px_8px_rgba(59,130,246,0.08)] transition-all"
          >
            <span className="text-base leading-none w-5 text-center shrink-0">
              {medals[idx]}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-semibold text-slate-800 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.score}%`, background: barColor(item.score) }}
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: barColor(item.score) }}>
                  {item.score}%
                </span>
              </div>
            </div>

            <button className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        ))}

        <p className="text-[10px] text-slate-400 text-center pt-1">
          Anonymised · based on all submitted orders
        </p>
      </div>
    </div>
  );
}
