import { useState } from "react";
import { ChevronDown, ArrowUpRight } from "lucide-react";

// Hypothesis: progressive disclosure. The default state is a tiny pill
// carrying only the 3 signals you scan for (compound, strength, purity/pass).
// Tapping any pill expands it inline into the full summary — so the list
// stays short and you only "pay" for the detail when you ask for it.
// Shown here with 3 pills, the middle one expanded.

export function Disclosure() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-2 p-6"
      style={{ background: "#F3F4F6", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Item
        compound="BPC-157"
        strength="5 mg"
        purity={98.41}
        supplier="Peptide Sciences"
        source="Vendor"
        batch="BP11-0284"
        lab="Janoshik"
        date="02 Apr 26"
        initialOpen={false}
      />
      <Item
        compound="Tirzepatide"
        strength="10 mg"
        purity={99.89}
        supplier="Uther"
        source="3P"
        batch="ZE30-0319"
        lab="Janoshik"
        date="10 Apr 26"
        initialOpen={true}
      />
      <Item
        compound="Semaglutide"
        strength="5 mg"
        purity={94.6}
        supplier="Direct Peptides"
        source="3P"
        batch="SE08-0277"
        lab="Janoshik"
        date="28 Mar 26"
        initialOpen={false}
      />
    </div>
  );
}

function Item({
  compound,
  strength,
  purity,
  supplier,
  source,
  batch,
  lab,
  date,
  initialOpen,
}: {
  compound: string;
  strength: string;
  purity: number;
  supplier: string;
  source: "Vendor" | "3P";
  batch: string;
  lab: string;
  date: string;
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const status =
    purity >= 98 ? "ok" : purity >= 95 ? "low" : "fail";
  const dot =
    status === "ok" ? "#10B981" : status === "low" ? "#F59E0B" : "#EF4444";

  return (
    <div
      className="w-[300px]"
      style={{
        background: "#FFFFFF",
        borderRadius: 14,
        boxShadow: open
          ? "0 16px 32px rgba(15,23,42,0.12)"
          : "0 2px 4px rgba(15,23,42,0.04)",
        transition: "box-shadow 200ms",
      }}
    >
      {/* Pill header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: dot }}
        />
        <span className="font-semibold text-[13px] text-slate-900 truncate">
          {compound}
        </span>
        <span className="text-[11px] text-slate-500">{strength}</span>
        <span className="ml-auto text-[12px] font-semibold tabular-nums text-slate-900">
          {purity.toFixed(2)}%
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 text-slate-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          {/* Supplier + source row */}
          <div className="flex items-center gap-1.5 pt-2.5 text-[11px] text-slate-600">
            <span className="truncate">{supplier}</span>
            <span
              className="text-[8px] font-bold tracking-wider px-1 rounded"
              style={{
                background: source === "3P" ? "#EDE9FE" : "#DBEAFE",
                color: source === "3P" ? "#6D28D9" : "#1D4ED8",
              }}
            >
              {source}
            </span>
          </div>

          {/* Key-value rows */}
          <div
            className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]"
          >
            <span className="text-slate-400">Batch</span>
            <span className="font-mono text-slate-800">{batch}</span>
            <span className="text-slate-400">Lab</span>
            <span className="text-slate-800">{lab}</span>
            <span className="text-slate-400">Tested</span>
            <span className="text-slate-800">{date}</span>
            <span className="text-slate-400">Spec</span>
            <span className="text-slate-800">
              ≥ 98.0% ·{" "}
              <span style={{ color: dot, fontWeight: 600 }}>
                {status === "ok"
                  ? "conforms"
                  : status === "low"
                  ? "below spec"
                  : "fails"}
              </span>
            </span>
          </div>

          <button
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold"
            style={{ background: "#0F172A", color: "#fff" }}
          >
            Open full report
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
