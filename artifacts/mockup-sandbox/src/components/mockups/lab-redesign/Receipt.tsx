import { ArrowUpRight } from "lucide-react";

// Hypothesis: "Vial silhouette" — a small clinical illustration of the actual
// vial carries identity at a glance; the card reads like a product thumbnail
// rather than a document. Minimal text, generous whitespace, one brand accent.

export function Receipt() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#EDEEF0", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 340,
          height: 420,
          background: "#FFFFFF",
          borderRadius: 18,
          boxShadow: "0 1px 0 rgba(15,23,42,0.04), 0 20px 40px rgba(15,23,42,0.08)",
        }}
      >
        {/* Soft top wash */}
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(20,184,166,0.14), transparent 70%)",
          }}
        />

        <div className="relative h-full flex flex-col p-5">
          {/* Top meta — small, balanced */}
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span className="tracking-[0.18em] uppercase font-semibold">
              COA · Uther
            </span>
            <span className="font-mono">10.04.26</span>
          </div>

          {/* Vial + identity */}
          <div className="mt-4 flex items-center gap-4">
            <Vial />
            <div>
              <div className="text-[9px] tracking-[0.22em] uppercase text-slate-400 font-semibold">
                GLP-1 · 10 mg
              </div>
              <h1 className="text-[22px] font-semibold leading-none tracking-tight text-slate-900 mt-1">
                Tirzepatide
              </h1>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                ZE30-0319
              </div>
            </div>
          </div>

          {/* Purity — the one number that matters */}
          <div className="mt-auto">
            <div className="text-[9px] tracking-[0.22em] uppercase text-slate-400 font-semibold">
              HPLC purity
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[52px] leading-[0.9] font-semibold tracking-tight text-slate-900">
                99.89
              </span>
              <span className="text-2xl font-semibold text-slate-400">%</span>
            </div>
          </div>

          {/* Footer — pass pill + open */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{ background: "#ECFDF5", color: "#047857" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#10B981" }}
                />
                <span className="text-[10px] font-semibold tracking-wide">
                  Passed
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Janoshik</span>
            </div>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#0F172A", color: "#fff" }}
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Vial() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      {/* cap */}
      <rect x="14" y="2" width="28" height="8" rx="1.5" fill="#0F172A" />
      <rect x="12" y="9" width="32" height="5" rx="1" fill="#94A3B8" />
      {/* body */}
      <rect
        x="10"
        y="14"
        width="36"
        height="54"
        rx="4"
        fill="#F1F5F9"
        stroke="#0F172A"
        strokeWidth="1.25"
      />
      {/* liquid */}
      <rect
        x="12"
        y="30"
        width="32"
        height="36"
        rx="2.5"
        fill="#14B8A6"
        opacity="0.18"
      />
      {/* label */}
      <rect
        x="10"
        y="34"
        width="36"
        height="20"
        fill="#fff"
        stroke="#E2E8F0"
        strokeWidth="0.75"
      />
      <rect x="14" y="38" width="20" height="2" fill="#0F172A" />
      <rect x="14" y="42" width="26" height="1.5" fill="#94A3B8" />
      <rect x="14" y="46" width="16" height="1.5" fill="#94A3B8" />
      {/* highlight */}
      <rect
        x="12"
        y="16"
        width="3"
        height="50"
        rx="1"
        fill="#fff"
        opacity="0.6"
      />
    </svg>
  );
}
