export function Vibe3() {
  const items = [
    { name: "GHK-CU 100mg", score: 100 },
    { name: "Retatrutide 40mg", score: 94 },
    { name: "BAC Water 10ml", score: 88 },
    { name: "Tirzepatide 60mg", score: 62 },
    { name: "BPC-157 10mg", score: 48 },
  ];

  const accents = [
    { bg: "#FFF3E0", bar: "#FF6B00", num: "#FF6B00", btn: "#FF6B00" },
    { bg: "#F3E5F5", bar: "#9C27B0", num: "#9C27B0", btn: "#9C27B0" },
    { bg: "#E3F2FD", bar: "#1976D2", num: "#1976D2", btn: "#1976D2" },
    { bg: "#E8F5E9", bar: "#388E3C", num: "#388E3C", btn: "#388E3C" },
    { bg: "#FCE4EC", bar: "#C2185B", num: "#C2185B", btn: "#C2185B" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <span className="text-[13px] font-black text-slate-900 tracking-tight">What's hot 🔥</span>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const a = accents[idx]!;
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: a.bg }}
              >
                <span
                  className="text-[15px] font-black w-6 text-center shrink-0 tabular-nums"
                  style={{ color: a.num, fontVariantNumeric: "tabular-nums" }}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-slate-900 block truncate mb-1.5">
                    {item.name}
                  </span>
                  <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.score}%`, background: a.bar }}
                    />
                  </div>
                </div>

                <button
                  className="shrink-0 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all text-white"
                  style={{ background: a.btn }}
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-4">
          Based on all orders · anonymised
        </p>
      </div>
    </div>
  );
}
