import {
  FlaskConical, Search, Filter, ShieldCheck, ScanLine, Calendar,
  ChevronRight, ArrowRight, Microscope, Share2, Building2, Star,
} from "lucide-react";
import "./_group.css";

/* ── Mock data ─────────────────────────────────────────────────────────────── */
type Batch = {
  code: string;
  compound: string;
  dose: string;
  vendor: string;
  vendorColor: string;
  lab: string;
  testDate: string;
  reports: number;
  isThirdParty: boolean;
  purity: number;
  sterility: "pass" | "fail" | null;
  endotoxin: number;
  mass: number;
  massUnit: string;
};

type GroupBuy = {
  id: string;
  title: string;
  status: "Verified" | "Testing" | "In progress";
  closed: string;
  batches: Batch[];
};

const GROUPS: GroupBuy[] = [
  {
    id: "GB-031",
    title: "Group Buy 031 · GLP-1 series",
    status: "Verified",
    closed: "Apr 19 2026",
    batches: [
      { code: "B-2026-031-A", compound: "Tirzepatide", dose: "10mg",  vendor: "Uther", vendorColor: "#1B3A7A", lab: "Janoshik",   testDate: "Apr 24 2026", reports: 3, isThirdParty: true,  purity: 99.4, sterility: "pass", endotoxin: 0.4, mass: 10.1, massUnit: "mg" },
      { code: "B-2026-031-B", compound: "Retatrutide", dose: "10mg",  vendor: "Uther", vendorColor: "#1B3A7A", lab: "Janoshik",   testDate: "Apr 24 2026", reports: 3, isThirdParty: true,  purity: 99.1, sterility: "pass", endotoxin: 0.6, mass: 9.9,  massUnit: "mg" },
      { code: "B-2026-031-C", compound: "Semaglutide", dose: "5mg",   vendor: "WWB",   vendorColor: "#B45309", lab: "Uzorak",     testDate: "Apr 25 2026", reports: 2, isThirdParty: true,  purity: 98.7, sterility: "pass", endotoxin: 1.1, mass: 5.0,  massUnit: "mg" },
    ],
  },
  {
    id: "GB-029",
    title: "Group Buy 029 · Healing & growth",
    status: "Verified",
    closed: "Mar 28 2026",
    batches: [
      { code: "B-2026-029-A", compound: "BPC-157",     dose: "5mg",   vendor: "Uther", vendorColor: "#1B3A7A", lab: "Janoshik",   testDate: "Apr 02 2026", reports: 3, isThirdParty: true,  purity: 99.6, sterility: "pass", endotoxin: 0.2, mass: 5.1,  massUnit: "mg" },
      { code: "B-2026-029-B", compound: "TB-500",      dose: "10mg",  vendor: "Uther", vendorColor: "#1B3A7A", lab: "Peptidetest",testDate: "Apr 02 2026", reports: 2, isThirdParty: false, purity: 98.2, sterility: "pass", endotoxin: 1.6, mass: 10.2, massUnit: "mg" },
      { code: "B-2026-029-D", compound: "CJC-1295",    dose: "5mg",   vendor: "WWB",   vendorColor: "#B45309", lab: "Janoshik",   testDate: "Apr 04 2026", reports: 2, isThirdParty: true,  purity: 97.4, sterility: "pass", endotoxin: 2.4, mass: 5.0,  massUnit: "mg" },
      { code: "B-2026-029-E", compound: "Ipamorelin",  dose: "5mg",   vendor: "WWB",   vendorColor: "#B45309", lab: "Uzorak",     testDate: "Apr 04 2026", reports: 2, isThirdParty: true,  purity: 99.0, sterility: "pass", endotoxin: 0.9, mass: 5.0,  massUnit: "mg" },
    ],
  },
  {
    id: "GB-027",
    title: "Group Buy 027 · GLP-1 winter",
    status: "Verified",
    closed: "Feb 16 2026",
    batches: [
      { code: "B-2026-027-A", compound: "Tirzepatide", dose: "10mg",  vendor: "Uther", vendorColor: "#1B3A7A", lab: "testides",   testDate: "Feb 22 2026", reports: 2, isThirdParty: true,  purity: 95.3, sterility: "fail", endotoxin: 6.1, mass: 9.6,  massUnit: "mg" },
      { code: "B-2026-027-B", compound: "Semaglutide", dose: "5mg",   vendor: "WWB",   vendorColor: "#B45309", lab: "Janoshik",   testDate: "Feb 22 2026", reports: 3, isThirdParty: true,  purity: 99.2, sterility: "pass", endotoxin: 0.5, mass: 5.0,  massUnit: "mg" },
    ],
  },
];

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function purityTier(pct: number) {
  if (pct >= 99) return { color: "#10B981", glow: "rgba(16,185,129,0.35)", label: "PASS" };
  if (pct >= 95) return { color: "#F59E0B", glow: "rgba(245,158,11,0.35)", label: "LOW" };
  return { color: "#EF4444", glow: "rgba(239,68,68,0.35)", label: "FAIL" };
}
function endoTier(eu: number) {
  if (eu <= 1) return { color: "#10B981", label: "Excellent" };
  if (eu <= 5) return { color: "#60A5FA", label: "Acceptable" };
  return { color: "#EF4444", label: "High" };
}

/* ── Source badge ──────────────────────────────────────────────────────────── */
function SourceBadge({ thirdParty }: { thirdParty: boolean }) {
  if (thirdParty) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wide"
        style={{ background: "rgba(250,204,21,0.18)", color: "#FCD34D", border: "1px solid rgba(250,204,21,0.35)" }}>
        <Star className="w-2.5 h-2.5" /> 3rd Party
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
      <Building2 className="w-2.5 h-2.5" /> Vendor
    </span>
  );
}

/* ── Dark CoA Card (matches existing TestCard from LabTests.tsx) ──────────── */
function CoACard({ b }: { b: Batch }) {
  const pTier = purityTier(b.purity);
  const eTier = endoTier(b.endotoxin);

  return (
    <div
      className="coa-card rounded-xl overflow-hidden flex flex-col relative"
      style={{ background: "var(--coa-bg)", border: "1px solid var(--coa-border)", boxShadow: "var(--coa-shadow)" }}
    >
      {/* Vendor glow top-right */}
      <div
        className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `${b.vendorColor}40`, filter: "blur(36px)", transform: "translate(30%,-30%)" }}
      />

      <div className="relative flex flex-col p-4 gap-2.5">
        {/* Header strip */}
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-bold tracking-[0.16em] uppercase" style={{ color: "var(--coa-faint)" }}>
            Certificate of Analysis
          </span>
          <div className="flex items-center gap-1.5">
            <button
              className="w-5 h-5 rounded-full flex items-center justify-center transition hover:bg-white/15"
              title="Copy share link"
            >
              <Share2 className="w-3 h-3" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Vendor pill + source badge — right-aligned above the compound name */}
        <div className="flex items-center gap-1.5 self-end flex-wrap justify-end">
          <SourceBadge thirdParty={b.isThirdParty} />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "var(--coa-pill-bg)", border: "1px solid var(--coa-pill-border)" }}
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: b.vendorColor }} />
            <span className="text-[12px] font-semibold text-white leading-none">{b.vendor}</span>
          </div>
        </div>

        {/* Compound */}
        <h3 className="font-bold text-white text-[20px] leading-tight">
          {b.compound} {b.dose}
        </h3>

        {/* Hero stat — purity */}
        <div className="py-0.5 flex items-stretch justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Purity
            </span>
            <div className="leading-none">
              <span className="font-black text-white tracking-tight text-[26px]"
                style={{ textShadow: `0 0 14px ${pTier.glow}` }}>
                {b.purity.toFixed(1)}
              </span>
              <span className="text-xl font-black ml-0.5" style={{ color: pTier.color }}>%</span>
            </div>
          </div>
          <div className="w-px self-stretch mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: "rgba(96,165,250,0.65)" }}>
              Actual Mass
            </span>
            <div className="flex items-baseline gap-0.5 leading-none mt-0.5">
              <span className="font-black text-white text-[26px]">{b.mass}</span>
              <span className="text-xl font-black" style={{ color: "rgba(96,165,250,0.85)" }}>{b.massUnit}</span>
            </div>
          </div>
        </div>

        {/* Label rows */}
        <div className="flex flex-col gap-1 pt-2" style={{ borderTop: "1px solid var(--coa-divider)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--coa-label)" }}>Batch</span>
            <span className="mono text-[11px] font-semibold text-white truncate ml-2 text-right">{b.code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--coa-label)" }}>Sterility</span>
            <span className="text-[11px] font-semibold text-right" style={{ color: b.sterility === "pass" ? "#10B981" : "#EF4444" }}>
              {b.sterility === "pass" ? "Pass" : "Fail"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--coa-label)" }}>Endotoxin</span>
            <span className="text-[11px] font-semibold text-right" style={{ color: eTier.color }}>
              {b.endotoxin} EU/Vial
            </span>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: "1px solid var(--coa-divider)" }}>
          <div className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wide"
            style={{ color: pTier.color, border: `1px solid ${pTier.color}66`, background: `${pTier.color}1F` }}>
            {pTier.label}
          </div>
          <div className="px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
            style={{ color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
            <Calendar className="w-2.5 h-2.5" style={{ color: "#A78BFA" }} />
            {b.testDate}
          </div>
        </div>

        {/* Lab footnote */}
        <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.32)" }}>
          Tested by {b.lab} · {b.reports} report{b.reports === 1 ? "" : "s"}
        </p>

        {/* View report */}
        <button
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition hover:bg-white/20"
          style={{ background: "var(--coa-button-bg)", border: "1px solid var(--coa-button-border)" }}
        >
          <Microscope className="w-3 h-3" style={{ color: "rgba(255,255,255,0.7)" }} />
          View Report
          <ArrowRight className="w-3 h-3" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function Browse() {
  const totalReports = GROUPS.reduce((sum, g) => sum + g.batches.reduce((s, b) => s + b.reports, 0), 0);

  return (
    <div className="peps-lab pb-12">
      {/* Header (matches existing LabTests.tsx) */}
      <div style={{ background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--t-blue-10)" }}>
            <FlaskConical className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--t-text)" }}>Lab Reports</h1>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>
              Independent &amp; vendor CoA tests · {totalReports} reports across {GROUPS.length} group buys
            </p>
          </div>
        </div>
        {/* Tab strip */}
        <div className="flex gap-1 px-4 pt-1 pb-2 overflow-x-auto no-scrollbar">
          {[
            { label: "Reports", active: true,  icon: <FlaskConical className="w-4 h-4" /> },
            { label: "Submit",  active: false, icon: <ChevronRight className="w-4 h-4" /> },
            { label: "Metrics", active: false, icon: <ChevronRight className="w-4 h-4" /> },
            { label: "Compare", active: false, icon: <ChevronRight className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.label} className={`tab-pill ${t.active ? "active" : ""}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search row */}
      <div className="px-4 pt-4">
        <div className="surface p-3 flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Search className="w-4 h-4 ml-1 shrink-0" style={{ color: "var(--t-subtle)" }} />
          <input
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium placeholder:text-slate-400"
            placeholder="Find a batch — paste batch code, scan QR, or search compound / vendor"
          />
          <button className="chip" title="Scan QR">
            <ScanLine className="w-3.5 h-3.5" /> Scan
          </button>
          <button className="chip" title="Filters">
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>

        {/* Filter chip row */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: "All groups", active: true },
            { label: "GB-031" },
            { label: "GB-029" },
            { label: "GB-027" },
            { label: "Tirzepatide" },
            { label: "Semaglutide" },
            { label: "Uther" },
            { label: "WWB" },
            { label: "3rd Party" },
            { label: "Failed only" },
          ].map(c => (
            <button key={c.label} className={`chip ${c.active ? "active" : ""}`}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* Group-buy sections */}
      <div className="px-4 pt-5 flex flex-col gap-7">
        {GROUPS.map(g => (
          <section key={g.id}>
            {/* Section heading */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: "var(--t-blue-08)", color: "var(--t-blue-deep)", border: "1px solid var(--t-blue-15)" }}>
                    {g.id}
                  </span>
                  <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>{g.title}</h2>
                </div>
                <span className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>
                  Closed {g.closed} · {g.batches.length} batches · {g.batches.reduce((s, b) => s + b.reports, 0)} reports
                </span>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "rgba(5,150,105,0.10)", color: "var(--pass)", border: "1px solid rgba(5,150,105,0.28)" }}>
                <ShieldCheck className="w-3 h-3" /> {g.status}
              </span>
            </div>

            {/* Batch cards grid: 1 → 2 → 3 cols */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.batches.map(b => <CoACard key={b.code} b={b} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
