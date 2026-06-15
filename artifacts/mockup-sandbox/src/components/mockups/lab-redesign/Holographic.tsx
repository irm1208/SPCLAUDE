import { ArrowUpRight, Check } from "lucide-react";

// Hypothesis: "Trust-first" — for a list of 1000 reports, the single most
// valuable scan signal is "did this batch pass?" Dominant green check,
// compound + purity as caption. Pharma-sober (no holographic sparkle), but
// visually punchy enough to find in a long feed.

export function Holographic() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#EEF2F7", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="relative overflow-hidden flex flex-col"
        style={{
          width: 340,
          height: 420,
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 20px 44px rgba(15,23,42,0.10)",
        }}
      >
        {/* Seal area */}
        <div
          className="relative flex-1 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, #F0FDF4 0%, #FFFFFF 65%)",
          }}
        >
          {/* Concentric rings */}
          <div
            className="absolute"
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              border: "1px dashed #BBF7D0",
            }}
          />
          <div
            className="absolute"
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: "1px solid #D1FAE5",
            }}
          />
          {/* Check disc */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "#10B981",
              boxShadow:
                "0 10px 24px rgba(16,185,129,0.35), inset 0 -2px 4px rgba(4,120,87,0.3)",
            }}
          >
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
          {/* Floating purity chip */}
          <div
            className="absolute"
            style={{
              top: "50%",
              right: 40,
              transform: "translateY(-50%)",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 999,
              padding: "6px 10px",
              boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
            }}
          >
            <div className="text-[8px] tracking-[0.22em] uppercase font-semibold text-slate-400 leading-none">
              Purity
            </div>
            <div className="text-[14px] font-semibold leading-tight text-slate-900">
              99.89%
            </div>
          </div>
        </div>

        {/* Identity footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400">
                Batch passed · Janoshik 3P
              </div>
              <h1 className="text-[20px] font-semibold tracking-tight text-slate-900 leading-tight mt-1">
                Tirzepatide 10 mg
              </h1>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Uther · ZE30-0319 · 10 Apr 26
              </div>
            </div>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#0F172A", color: "#fff" }}
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
