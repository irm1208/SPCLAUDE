import { ArrowUpRight } from "lucide-react";

// Refinement of Verdict. Keeps the human-voice hypothesis; fixes:
// - tighter hero sentence (shorter, cleaner measure, no inline color gimmick)
// - signals folded into a single inline row of neutral chips so they read
//   as evidence for the sentence, not a second list
// - identity unified at top as a single row (avatar + author + meta)
// - data footnote is now a single quiet strip, no dashed border
// - single primary CTA; like/comment moved to smaller utilities

export function VerdictV2() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: "#F3F4F6",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: 300,
          minHeight: 480,
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04), 0 18px 40px rgba(15,23,42,0.08)",
          padding: 22,
        }}
      >
        {/* Identity row */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
            style={{ background: "#0F172A" }}
          >
            SP
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-900 leading-tight">
              Salt &amp; Peps verdict
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              147 member reports · 5 batches tracked
            </div>
          </div>
          <div
            className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase shrink-0"
            style={{ background: "#ECFDF5", color: "#047857" }}
          >
            Buy
          </div>
        </div>

        {/* Hero sentence — tighter, one idea */}
        <blockquote
          className="mt-5 text-[19px] leading-[1.35] tracking-[-0.015em] font-medium text-slate-900"
          style={{ fontFeatureSettings: "'ss01'" }}
        >
          Uther's cleanest tirz batch this year, by a clear margin.
        </blockquote>
        <p className="mt-3 text-[12px] leading-[1.55] text-slate-600">
          Third-party tested on a vial pulled from the same lot members are
          buying — not one the supplier picked.
        </p>

        {/* Evidence chips — reads as support, not a second list */}
        <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
          <Chip>99.89% HPLC</Chip>
          <Chip>independent lab</Chip>
          <Chip>no bad-vial reports</Chip>
        </div>

        {/* Data strip */}
        <div
          className="mt-auto pt-4 text-[10px] text-slate-500 leading-snug"
          style={{ marginTop: 22 }}
        >
          <div className="font-semibold text-slate-700">
            Tirzepatide 10&nbsp;mg · Uther · ZE30-0319
          </div>
          <div>Janoshik · 10 Apr 2026 · mass 10.1&nbsp;mg</div>
        </div>

        {/* CTA */}
        <button
          className="mt-4 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] font-semibold"
          style={{ background: "#0F172A", color: "#fff" }}
        >
          <span>Read the report</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        {/* Utilities */}
        <div className="mt-2.5 flex items-center justify-center gap-4 text-[10px] text-slate-400">
          <span>84 agree</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>12 comments</span>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-full font-medium"
      style={{
        background: "#F1F5F9",
        color: "#334155",
      }}
    >
      {children}
    </span>
  );
}
