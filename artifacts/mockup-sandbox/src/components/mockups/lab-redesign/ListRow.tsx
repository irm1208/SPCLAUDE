import { ChevronRight, Share2 } from "lucide-react";

// Hypothesis: not a card at all. When you have 1000 reports, the right
// affordance is a dense horizontal row — like a financial trade blotter or
// a lab LIMS result table. Identity, assay, status, meta, and action fit
// on one line, so you can scroll vertically and eye-sweep columns.
// Shows 3 stacked rows to prove the pattern scans as a list.

export function ListRow() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#F3F4F6", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="w-full max-w-[680px]"
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Column header */}
        <div
          className="grid items-center px-4 py-2 text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400"
          style={{
            gridTemplateColumns: "5px 1.4fr 0.7fr 0.9fr 0.9fr 0.7fr 28px",
            gap: 12,
            borderBottom: "1px solid #E5E7EB",
            background: "#FAFBFC",
          }}
        >
          <span />
          <span>Compound · Supplier</span>
          <span className="text-right">Purity</span>
          <span>Batch</span>
          <span>Lab · Date</span>
          <span>Status</span>
          <span />
        </div>

        <Row
          category="#14B8A6"
          compound="Tirzepatide"
          strength="10 mg"
          supplier="Uther"
          source="3P"
          purity="99.89%"
          batch="ZE30-0319"
          lab="Janoshik"
          date="10 Apr 26"
          status="pass"
        />
        <Row
          category="#F59E0B"
          compound="BPC-157"
          strength="5 mg"
          supplier="Peptide Sciences"
          source="Vendor"
          purity="98.41%"
          batch="BP11-0284"
          lab="Janoshik"
          date="02 Apr 26"
          status="pass"
        />
        <Row
          category="#8B5CF6"
          compound="Semaglutide"
          strength="5 mg"
          supplier="Direct Peptides"
          source="3P"
          purity="94.60%"
          batch="SE08-0277"
          lab="Janoshik"
          date="28 Mar 26"
          status="low"
        />
      </div>
    </div>
  );
}

function Row({
  category,
  compound,
  strength,
  supplier,
  source,
  purity,
  batch,
  lab,
  date,
  status,
}: {
  category: string;
  compound: string;
  strength: string;
  supplier: string;
  source: "3P" | "Vendor";
  purity: string;
  batch: string;
  lab: string;
  date: string;
  status: "pass" | "low" | "fail";
}) {
  const statusColor =
    status === "pass" ? "#10B981" : status === "low" ? "#F59E0B" : "#EF4444";
  const statusBg =
    status === "pass" ? "#ECFDF5" : status === "low" ? "#FEF3C7" : "#FEE2E2";
  const statusLabel =
    status === "pass" ? "Pass" : status === "low" ? "Low" : "Fail";
  return (
    <div
      className="grid items-center px-4 py-3 text-[12px] hover:bg-slate-50 cursor-pointer group transition-colors"
      style={{
        gridTemplateColumns: "5px 1.4fr 0.7fr 0.9fr 0.9fr 0.7fr 28px",
        gap: 12,
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <span
        className="w-1 h-8 rounded-full"
        style={{ background: category }}
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-semibold text-slate-900 truncate">
            {compound}
          </span>
          <span className="text-[10px] text-slate-500">{strength}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
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
      </div>
      <div className="text-right">
        <div className="font-semibold text-slate-900 tabular-nums">{purity}</div>
      </div>
      <div className="text-[11px] font-mono text-slate-700 truncate">{batch}</div>
      <div className="text-[11px] text-slate-600 truncate leading-tight">
        <div>{lab}</div>
        <div className="text-slate-400 text-[10px]">{date}</div>
      </div>
      <div>
        <span
          className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: statusBg, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center gap-1 text-slate-400 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <Share2 className="w-3.5 h-3.5" />
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}
