import { ThumbsUp, MessageCircle, ArrowUpRight } from "lucide-react";

// OPPOSITE OF: clinical, data-hero, silent cards.
// This variant uses a first-person community voice to interpret the
// result for the user. Numbers are demoted to a footnote; the card's
// hero is a sentence. Reads like a review thread summary rather than a
// certificate of analysis.

export function Verdict() {
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
          borderRadius: 18,
          boxShadow: "0 16px 32px rgba(15,23,42,0.08)",
          padding: 20,
        }}
      >
        {/* Header: tiny tag + thumbnail identity, not a data panel */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
            style={{ background: "#ECFDF5", color: "#047857" }}
          >
            Community verdict
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">10 Apr 26</span>
        </div>

        {/* Hero sentence */}
        <p
          className="mt-4 text-[18px] leading-[1.35] tracking-[-0.01em] font-medium text-slate-900"
          style={{ fontFeatureSettings: "'ss01'" }}
        >
          <span style={{ color: "#047857" }}>Buy with confidence.</span>{" "}
          Uther's latest tirz batch tested cleaner than their own 12-month
          average — and they're already one of the most consistent suppliers
          we track.
        </p>

        {/* Author / source */}
        <div className="mt-4 flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ background: "#0F172A" }}
          >
            SP
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-900 leading-tight">
              Salt &amp; Peps analysis
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              based on 147 member reports · 5 batches
            </div>
          </div>
        </div>

        {/* Signals bar — human sentences, not numbers */}
        <ul className="mt-4 space-y-1.5 text-[12px] text-slate-700">
          <Signal text="Third-party lab (not the supplier)" ok />
          <Signal text="Highest purity Uther has shipped this year" ok />
          <Signal text="No member has reported a bad vial from this lot" ok />
        </ul>

        {/* Footnote — the data is demoted to the bottom */}
        <div
          className="mt-auto pt-4 text-[10px] text-slate-400 leading-snug"
          style={{ borderTop: "1px dashed #E5E7EB", marginTop: 20 }}
        >
          Tirzepatide 10&nbsp;mg · batch ZE30-0319 · Janoshik HPLC 99.89% ·
          mass 10.1&nbsp;mg
        </div>

        {/* Community footer actions */}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
          <button className="flex items-center gap-1 hover:text-slate-900">
            <ThumbsUp className="w-3.5 h-3.5" /> 84
          </button>
          <button className="flex items-center gap-1 hover:text-slate-900">
            <MessageCircle className="w-3.5 h-3.5" /> 12
          </button>
          <button className="ml-auto flex items-center gap-1 font-semibold text-slate-900">
            See report <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Signal({ text, ok }: { text: string; ok: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: ok ? "#10B981" : "#EF4444" }}
      />
      <span>{text}</span>
    </li>
  );
}
