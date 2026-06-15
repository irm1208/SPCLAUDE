export function VariantA() {
  const items = [
    { name: "GHK-CU 100mg", score: 100 },
    { name: "Retatrutide 40mg", score: 94 },
    { name: "BAC Water 10ml", score: 88 },
    { name: "Tirzepatide 60mg", score: 62 },
    { name: "BPC-157 10mg", score: 48 },
  ];

  const rankColor = (i: number) =>
    i === 0 ? "#F59E0B" : i === 1 ? "#94A3B8" : i === 2 ? "#B45309" : "#CBD5E1";

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">

          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-slate-800 tracking-tight">Trending in this GB</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Live data</span>
          </div>

          <div className="divide-y divide-slate-50">
            {items.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3.5 px-5 py-3.5 group hover:bg-slate-50 transition-colors">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-black shrink-0"
                  style={{ background: `${rankColor(idx)}18`, color: rankColor(idx) }}
                >
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold text-slate-800 truncate leading-none">{item.name}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 ml-2 shrink-0">
                        #1
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${item.score}%`,
                        background: idx === 0
                          ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
                          : idx === 1
                          ? "linear-gradient(90deg, #6366F1, #8B5CF6)"
                          : idx === 2
                          ? "linear-gradient(90deg, #3B82F6, #60A5FA)"
                          : "linear-gradient(90deg, #94A3B8, #CBD5E1)",
                      }}
                    />
                  </div>
                </div>

                <button
                  className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/60">
            <p className="text-[10px] text-slate-400 text-center">Based on all orders in this group buy · anonymised</p>
          </div>
        </div>
      </div>
    </div>
  );
}
