export function Vibe1() {
  const items = [
    { name: "GHK-CU 100mg", score: 100 },
    { name: "Retatrutide 40mg", score: 94 },
    { name: "BAC Water 10ml", score: 88 },
    { name: "Tirzepatide 60mg", score: 62 },
    { name: "BPC-157 10mg", score: 48 },
  ];

  const medals = ["🥇", "🥈", "🥉", null, null];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0F1623" }}>
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-2.5 mb-4 px-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#C9A84C" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>
            Most ordered
          </span>
        </div>

        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={item.name}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all"
              style={{
                background: idx === 0
                  ? "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))"
                  : "rgba(255,255,255,0.03)",
                border: idx === 0
                  ? "1px solid rgba(201,168,76,0.25)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-5 text-center shrink-0 text-sm leading-none">
                {medals[idx] ?? (
                  <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {idx + 1}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className="text-[13px] font-medium block truncate mb-1.5"
                  style={{ color: idx === 0 ? "#EDE0C4" : "rgba(255,255,255,0.65)" }}
                >
                  {item.name}
                </span>
                <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.score}%`,
                      background: idx === 0
                        ? "linear-gradient(90deg, #C9A84C, #E8C97A)"
                        : "rgba(255,255,255,0.18)",
                    }}
                  />
                </div>
              </div>

              <button
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-center mt-4" style={{ color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em" }}>
          Anonymised · all submitted orders
        </p>
      </div>
    </div>
  );
}
