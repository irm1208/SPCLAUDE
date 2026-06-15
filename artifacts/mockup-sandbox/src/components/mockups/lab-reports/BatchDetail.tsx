import {
  FlaskConical, ChevronLeft, ShieldCheck, Download, QrCode, Share2,
  Calendar, Microscope, ExternalLink, Star, Building2, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight,
} from "lucide-react";
import "./_group.css";

/* Mock batch data — same domain as Browse */
const BATCH = {
  code: "B-2026-031-A",
  compound: "Tirzepatide",
  dose: "10mg",
  vendor: "Uther",
  vendorColor: "#1B3A7A",
  groupBuy: "GB-031",
  groupBuyTitle: "Group Buy 031 · GLP-1 series",
  closed: "Apr 19 2026",
  lab: "Janoshik",
  testDate: "Apr 24 2026",
  uploaded: "Apr 25 2026",
  verifiedBy: "@martin (PoolLeader)",
  isThirdParty: true,
  purity: 99.4,
  purityHistory: [98.6, 99.0, 98.8, 99.2, 99.1, 99.4, 99.0, 99.3, 99.4],
  sterility: "pass" as const,
  endotoxin: 0.4,
  endotoxinLimit: 17.5,
  mass: 10.1,
  massUnit: "mg",
  heavy: { As: "<0.1 ppm", Cd: "<0.05 ppm", Pb: "<0.05 ppm", Hg: "<0.01 ppm" },
};

const SOURCES = [
  { kind: "3rd party", lab: "Janoshik Analytical",  date: "Apr 24 2026", id: "JS-2026-04-2241", primary: true  },
  { kind: "Vendor",    lab: "Uther in-house QC",     date: "Apr 19 2026", id: "UTH-031A-MS",     primary: false },
  { kind: "3rd party", lab: "Uzorak Lab",            date: "Apr 26 2026", id: "UZ-2026-431",     primary: false },
];

const SIBLINGS = [
  { code: "B-2026-031-B", compound: "Retatrutide", purity: 99.1, sterility: "pass" },
  { code: "B-2026-031-C", compound: "Semaglutide", purity: 98.7, sterility: "pass" },
  { code: "B-2026-031-D", compound: "Cagrilintide", purity: 99.5, sterility: "pass" },
];

const TIMELINE = [
  { label: "Group buy closed",   date: "Apr 19 2026", done: true },
  { label: "Vials received",     date: "Apr 22 2026", done: true },
  { label: "Lab tested",         date: "Apr 24 2026", done: true },
  { label: "CoA uploaded",       date: "Apr 25 2026", done: true },
  { label: "Verified by leader", date: "Apr 25 2026", done: true },
];

function purityTier(pct: number) {
  if (pct >= 99) return { color: "#10B981", glow: "rgba(16,185,129,0.45)", label: "PASS" };
  if (pct >= 95) return { color: "#F59E0B", glow: "rgba(245,158,11,0.45)", label: "LOW" };
  return { color: "#EF4444", glow: "rgba(239,68,68,0.45)", label: "FAIL" };
}
function endoTier(eu: number) {
  if (eu <= 1) return { color: "#10B981", label: "Excellent" };
  if (eu <= 5) return { color: "#60A5FA", label: "Acceptable" };
  return { color: "#EF4444", label: "High" };
}

/* Sparkline (light surface) */
function Sparkline({ data }: { data: number[] }) {
  const w = 220, h = 56, pad = 4;
  const min = Math.min(...data) - 0.2, max = Math.max(...data) + 0.2;
  const pts = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = pad + (h - pad * 2) * (1 - (v - min) / (max - min));
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14">
      <path d={fill} className="spark-fill" />
      <path d={d} className="spark" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 2.4 : 1.2} fill="var(--t-blue)" />
      ))}
    </svg>
  );
}

/* Hero CoA card — larger version of the card from Browse (matches LabTests.tsx aesthetic) */
function HeroCoACard() {
  const pTier = purityTier(BATCH.purity);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col relative"
      style={{ background: "var(--coa-bg)", border: "1px solid var(--coa-border)", boxShadow: "var(--coa-shadow)" }}
    >
      {/* Vendor glow */}
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: `${BATCH.vendorColor}40`, filter: "blur(64px)", transform: "translate(30%,-30%)" }}
      />

      <div className="relative flex flex-col p-5 sm:p-6 gap-4">
        {/* Header strip */}
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold tracking-[0.16em] uppercase" style={{ color: "var(--coa-faint)" }}>
            Certificate of Analysis
          </span>
          <div className="flex items-center gap-2">
            <button className="w-6 h-6 rounded-full flex items-center justify-center transition hover:bg-white/15" title="Share">
              <Share2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.65)" }} />
            </button>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Vendor + 3rd party row (right-aligned) */}
        <div className="flex items-center gap-2 self-end flex-wrap justify-end">
          <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{ background: "rgba(250,204,21,0.18)", color: "#FCD34D", border: "1px solid rgba(250,204,21,0.35)" }}>
            <Star className="w-2.5 h-2.5" /> 3rd Party
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "var(--coa-pill-bg)", border: "1px solid var(--coa-pill-border)" }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: BATCH.vendorColor }} />
            <span className="text-[12px] font-semibold text-white leading-none">{BATCH.vendor}</span>
          </div>
        </div>

        {/* Compound + dose */}
        <div>
          <h2 className="font-bold text-white text-2xl sm:text-3xl leading-tight">
            {BATCH.compound} <span style={{ color: "rgba(255,255,255,0.65)" }}>{BATCH.dose}</span>
          </h2>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            from <span className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{BATCH.groupBuyTitle}</span>
          </p>
        </div>

        {/* Hero stats — purity + actual mass */}
        <div className="flex items-stretch justify-between gap-3 py-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Purity
            </span>
            <div className="leading-none">
              <span className="font-black text-white tracking-tight text-[44px] sm:text-[52px]"
                style={{ textShadow: `0 0 22px ${pTier.glow}` }}>
                {BATCH.purity.toFixed(1)}
              </span>
              <span className="text-3xl font-black ml-1" style={{ color: pTier.color }}>%</span>
            </div>
            <span className="mt-1 inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
              style={{ color: pTier.color, border: `1px solid ${pTier.color}66`, background: `${pTier.color}1F` }}>
              {pTier.label}
            </span>
          </div>
          <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[9px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: "rgba(96,165,250,0.7)" }}>
              Actual Mass
            </span>
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="font-black text-white text-[44px] sm:text-[52px]">{BATCH.mass}</span>
              <span className="text-3xl font-black ml-0.5" style={{ color: "rgba(96,165,250,0.85)" }}>{BATCH.massUnit}</span>
            </div>
            <span className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>nominal {BATCH.dose}</span>
          </div>
        </div>

        {/* Label rows */}
        <div className="flex flex-col gap-1.5 pt-3" style={{ borderTop: "1px solid var(--coa-divider)" }}>
          {[
            ["Batch",     <span className="mono text-[12px] font-semibold text-white">{BATCH.code}</span>],
            ["Group Buy", <span className="mono text-[11px] font-semibold text-white">{BATCH.groupBuy}</span>],
            ["Tested",    <span className="text-[11px] font-medium text-white">{BATCH.testDate} · {BATCH.lab}</span>],
            ["Verified",  <span className="text-[11px] font-medium text-white">{BATCH.verifiedBy}</span>],
          ].map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--coa-label)" }}>{k as string}</span>
              <div className="text-right">{v}</div>
            </div>
          ))}
        </div>

        {/* Bottom: QR + actions */}
        <div className="flex items-stretch gap-3 pt-3" style={{ borderTop: "1px solid var(--coa-divider)" }}>
          <div className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <QrCode className="w-12 h-12" style={{ color: "#0F2044" }} />
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:bg-white/20"
              style={{ background: "rgba(96,165,250,0.25)", border: "1px solid rgba(96,165,250,0.4)" }}>
              <Download className="w-4 h-4" /> Download CoA
            </button>
            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:bg-white/20"
              style={{ background: "var(--coa-button-bg)", border: "1px solid var(--coa-button-border)" }}>
              <Share2 className="w-4 h-4" /> Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Light info tile (for results detail / heavy metals / source docs) */
function Tile({ label, children, color, footer }: { label: string; children: React.ReactNode; color?: string; footer?: React.ReactNode }) {
  return (
    <div className="surface p-3.5 flex flex-col gap-2">
      <span className="section-label">{label}</span>
      <div style={{ color: color ?? "var(--t-text)" }}>{children}</div>
      {footer && <div className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{footer}</div>}
    </div>
  );
}

export default function BatchDetail() {
  const eTier = endoTier(BATCH.endotoxin);
  const pTier = purityTier(BATCH.purity);

  return (
    <div className="peps-lab pb-12">
      {/* Header */}
      <div style={{ background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--t-blue-10)" }}>
            <FlaskConical className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--t-text)" }}>Lab Reports</h1>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>
              Batch detail · {SOURCES.length} source documents
            </p>
          </div>
          <button className="ml-auto chip">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to all reports
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 pt-4">
        <div className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: "var(--t-subtle)" }}>
          <span>Lab Reports</span>
          <span>/</span>
          <span className="mono font-semibold" style={{ color: "var(--t-blue)" }}>{BATCH.groupBuy}</span>
          <span>/</span>
          <span className="mono font-semibold" style={{ color: "var(--t-text)" }}>{BATCH.code}</span>
        </div>
      </div>

      {/* Two-column layout: hero CoA on left, results detail on right (stacks on mobile) */}
      <div className="px-4 pt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-4">
        {/* Hero card */}
        <HeroCoACard />

        {/* Right-side test results detail panel */}
        <div className="flex flex-col gap-3">
          <div className="surface p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="section-label">Test Results</span>
              <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{BATCH.testDate}</span>
            </div>

            {/* Purity row + sparkline */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Purity (HPLC)</span>
              <span className="text-base font-bold" style={{ color: pTier.color }}>{BATCH.purity.toFixed(1)}%</span>
            </div>
            <Sparkline data={BATCH.purityHistory} />
            <p className="text-[11px] mb-3" style={{ color: "var(--t-subtle)" }}>
              {BATCH.vendor}'s last {BATCH.purityHistory.length} {BATCH.compound} batches
            </p>

            {/* Sterility row */}
            <div className="flex items-center justify-between py-2.5"
              style={{ borderTop: "1px solid var(--t-border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Sterility</span>
              <span className="inline-flex items-center gap-1 text-sm font-bold"
                style={{ color: BATCH.sterility === "pass" ? "var(--pass)" : "var(--fail)" }}>
                {BATCH.sterility === "pass"
                  ? <><CheckCircle2 className="w-4 h-4" /> Pass</>
                  : <><XCircle className="w-4 h-4" /> Fail</>}
              </span>
            </div>

            {/* Endotoxin row + meter */}
            <div className="py-2.5" style={{ borderTop: "1px solid var(--t-border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Endotoxin</span>
                <span className="text-sm font-bold" style={{ color: eTier.color }}>{BATCH.endotoxin} EU/Vial</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-surface2)" }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (BATCH.endotoxin / BATCH.endotoxinLimit) * 100)}%`,
                    background: eTier.color,
                  }} />
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--t-subtle)" }}>
                USP &lt;161&gt; limit: {BATCH.endotoxinLimit} EU/Vial — {eTier.label.toLowerCase()}
              </p>
            </div>

            {/* Mass row */}
            <div className="flex items-center justify-between py-2.5"
              style={{ borderTop: "1px solid var(--t-border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Mass per vial</span>
              <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                {BATCH.mass} {BATCH.massUnit} <span className="text-xs font-medium" style={{ color: "var(--t-subtle)" }}>(nominal {BATCH.dose})</span>
              </span>
            </div>
          </div>

          {/* Heavy metals tile */}
          <div className="surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="section-label">Heavy Metals (ICP-MS)</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: "rgba(5,150,105,0.10)", color: "var(--pass)", border: "1px solid rgba(5,150,105,0.28)" }}>
                <CheckCircle2 className="w-3 h-3" /> All under limit
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(BATCH.heavy).map(([el, val]) => (
                <div key={el} className="rounded-lg px-2 py-2 text-center"
                  style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>{el}</div>
                  <div className="mono text-xs font-semibold mt-0.5" style={{ color: "var(--t-text)" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Source documents */}
      <div className="px-4 pt-5">
        <h3 className="section-label mb-2">Source documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOURCES.map(s => (
            <div key={s.id} className="surface p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide`}
                  style={s.kind === "3rd party"
                    ? { background: "rgba(250,204,21,0.18)", color: "#92400e", border: "1px solid rgba(250,204,21,0.35)" }
                    : { background: "rgba(100,116,139,0.10)", color: "#64748b", border: "1px solid rgba(100,116,139,0.20)" }}>
                  {s.kind === "3rd party" ? <Star className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                  {s.kind}
                </span>
                {s.primary && (
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--t-blue)" }}>Primary</span>
                )}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{s.lab}</div>
              <div className="text-xs flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
                <Calendar className="w-3 h-3" /> {s.date}
                <span className="mx-1">·</span>
                <span className="mono">{s.id}</span>
              </div>
              <button className="mt-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "var(--t-blue-08)", color: "var(--t-blue-deep)", border: "1px solid var(--t-blue-15)" }}>
                <ExternalLink className="w-3.5 h-3.5" /> Open report
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sibling batches */}
      <div className="px-4 pt-5">
        <h3 className="section-label mb-2">Other batches in {BATCH.groupBuy}</h3>
        <div className="surface overflow-hidden">
          {SIBLINGS.map((s, i) => (
            <button key={s.code} type="button"
              className="w-full text-left flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 bg-transparent border-0"
              style={{ borderTop: i === 0 ? "0" : "1px solid var(--t-border)" }}>
              <span className="mono text-xs font-semibold px-2 py-1 rounded"
                style={{ background: "var(--t-blue-08)", color: "var(--t-blue-deep)", border: "1px solid var(--t-blue-15)" }}>
                {s.code}
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{s.compound}</span>
              <span className="ml-auto flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color: purityTier(s.purity).color }}>
                  {s.purity.toFixed(1)}%
                </span>
                <span className="text-xs font-bold inline-flex items-center gap-1"
                  style={{ color: s.sterility === "pass" ? "var(--pass)" : "var(--fail)" }}>
                  {s.sterility === "pass" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                </span>
                <ChevronLeft className="w-4 h-4 rotate-180" style={{ color: "var(--t-subtle)" }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Provenance timeline */}
      <div className="px-4 pt-5">
        <h3 className="section-label mb-2">Provenance</h3>
        <div className="surface p-4">
          <ol className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
            {TIMELINE.map((step, i) => (
              <li key={step.label} className="flex sm:flex-col items-start gap-2 sm:flex-1 relative">
                <div className="flex sm:flex-col items-center gap-2 sm:gap-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0 sm:mb-2"
                    style={{
                      background: step.done ? "var(--t-blue)" : "var(--t-surface2)",
                      border: `1px solid ${step.done ? "var(--t-blue)" : "var(--t-border)"}`,
                      color: step.done ? "#fff" : "var(--t-subtle)",
                    }}>
                    {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className="hidden sm:block absolute top-3 left-[calc(50%+12px)] right-0 h-px"
                      style={{ background: "var(--t-border)" }} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{step.label}</span>
                  <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{step.date}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
