import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ChevronLeft, Syringe, RefreshCw, Clock, Thermometer,
  Activity, BookOpen, AlertTriangle,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  ExternalLink, Zap, Shield, TrendingUp,
  MapPin, Timer, ArrowRight, Globe, Pill
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { MED_PROTOCOLS, type MedProtocol, type ResearchIndication, type IndianBrand } from "@/data/medication-protocols";
import { T } from "@/lib/theme";

const BG      = "var(--t-bg)";
const CARD_BG = T.surface;
const CARD2   = T.surface2;
const BORDER  = T.border;
const TEXT    = T.text;
const MUTED   = T.muted;
const MUTED2  = T.subtle;

function lightenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const STATUS_CONFIG = {
  avoid:      { label: "AVOID",              color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
  caution:    { label: "UNKNOWN",            color: "#9CA3AF", bg: "rgba(156,163,175,0.10)" },
  compatible: { label: "COMPATIBLE",         color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
  monitor:    { label: "MONITOR COMBINATION",color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  timing:     { label: "SYNERGISTIC",        color: "#10B981", bg: "rgba(16,185,129,0.08)" },
};

const EFFECTIVENESS_CONFIG = {
  "Most Effective": { color: "#10B981", ring: "rgba(16,185,129,0.12)", dot: "#10B981" },
  "Effective":      { color: "#3B82F6", ring: "rgba(59,130,246,0.12)",  dot: "#3B82F6" },
  "Moderate":       { color: "#9CA3AF", ring: "rgba(156,163,175,0.12)", dot: "#9CA3AF" },
  "Limited":        { color: "#6B7280", ring: "rgba(107,114,128,0.12)", dot: "#6B7280" },
};

const LEVEL_CONFIG = {
  "Extensively Studied": { color: "#10B981", bg: "rgba(16,185,129,0.10)", dark: "rgba(16,185,129,0.18)" },
  "Well Researched":     { color: "var(--t-blue)", bg: "var(--t-blue-10)", dark: "var(--t-blue-18)" },
  "Limited Research":    { color: "#F59E0B", bg: "rgba(245,158,11,0.10)", dark: "rgba(245,158,11,0.18)" },
  "Early Research":      { color: "#A78BFA", bg: "rgba(167,139,250,0.10)", dark: "rgba(167,139,250,0.18)" },
  "Foundational":        { color: "#94A3B8", bg: "rgba(148,163,184,0.10)", dark: "rgba(148,163,184,0.18)" },
};

const QUAL_ICONS = {
  pass: <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#10B981" }} />,
  warn: <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />,
  fail: <XCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />,
};

const TRIAL_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "Completed":          { color: "#10B981", bg: "rgba(16,185,129,0.10)" },
  "Active":             { color: "var(--t-blue)", bg: "var(--t-blue-10)" },
  "Recruiting":         { color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  "Not yet recruiting": { color: "#A78BFA", bg: "rgba(167,139,250,0.10)" },
  "Terminated":         { color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
};

const REG_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "Approved":       { color: "#10B981", bg: "rgba(16,185,129,0.10)" },
  "Approved (Rx)":  { color: "#10B981", bg: "rgba(16,185,129,0.10)" },
  "Approved (OTC)": { color: "#059669", bg: "rgba(5,150,105,0.10)" },
  "Research Only":  { color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  "Not Approved":   { color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  "Pending":        { color: "#60A5FA", bg: "rgba(96,165,250,0.10)" },
  "Controlled":     { color: "#A78BFA", bg: "rgba(167,139,250,0.10)" },
};

function Card({ children, className = "", style = {}, accentColor }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; accentColor?: string;
}) {
  const cardBg = accentColor
    ? `linear-gradient(135deg, ${CARD_BG} 40%, color-mix(in srgb, ${accentColor} 14%, ${CARD_BG}))`
    : CARD_BG;
  return (
    <div className={`rounded-xl relative overflow-hidden ${className}`}
      style={{ background: cardBg, border: `1px solid ${BORDER}`, ...style }}>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ title, id }: { title: string; id?: string }) {
  return (
    <div className="mb-4" id={id}>
      <h2 className="text-base font-bold tracking-tight" style={{ color: TEXT }}>{title}</h2>
      <div className="mt-1.5 h-px" style={{ background: BORDER }} />
    </div>
  );
}

function SectionNav({ sections, accent }: { sections: Array<{ id: string; label: string }>; accent: string }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => {
            const el = document.getElementById(s.id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: MUTED2 }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function IndicationsSection({ indications, accent }: { indications: ResearchIndication[]; accent: string }) {
  const [expanded, setExpanded] = useState<number | null>(0);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      {indications.map((ind, i) => {
        const cfg = EFFECTIVENESS_CONFIG[ind.effectiveness] ?? EFFECTIVENESS_CONFIG["Moderate"];
        const open = expanded === i;
        return (
          <div key={i} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
              style={{ background: CARD_BG }}
              onClick={() => setExpanded(open ? null : i)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                <span className="font-semibold text-sm leading-snug" style={{ color: TEXT }}>{ind.category}</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0"
                  style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: cfg.ring }}
                >
                  {ind.effectiveness.toUpperCase()}
                </span>
              </div>
              {open
                ? <ChevronUp size={14} className="flex-shrink-0" style={{ color: MUTED2 }} />
                : <ChevronDown size={14} className="flex-shrink-0" style={{ color: MUTED2 }} />}
            </button>
            {open && (
              <div className="px-4 pb-4 pt-0 space-y-3" style={{ background: CARD2, borderTop: `1px solid ${BORDER}` }}>
                {ind.items.map((item, j) => (
                  <div key={j} className="pt-3">
                    <p className="text-sm font-semibold mb-1" style={{ color: TEXT }}>{item.title}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type DosRow = NonNullable<MedProtocol["researchProtocols"]>[number];

function ProtocolCards({ protocols, accent }: { protocols: DosRow[]; accent: string }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${BORDER}` }}>
      <table className="w-full text-[12px]" style={{ minWidth: 420 }}>
        <thead>
          <tr style={{ background: CARD2, borderBottom: `1px solid ${BORDER}` }}>
            {["Goal", "Dose", "Frequency", "Route"].map(h => (
              <th key={h} className="text-left px-3 py-2.5 section-label">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {protocols.map((p, i) => (
            <tr key={i} style={{ background: CARD_BG, borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
              <td className="px-3 py-2.5 font-medium text-[12px]" style={{ color: TEXT }}>{p.goal}</td>
              <td className="px-3 py-2.5 font-semibold tabular-nums text-[12px]" style={{ color: TEXT }}>{p.dose}</td>
              <td className="px-3 py-2.5 text-[12px]" style={{ color: MUTED }}>{p.frequency}</td>
              <td className="px-3 py-2.5 text-[12px]" style={{ color: MUTED }}>{p.route}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type BrandEntry = { brand: string; manufacturer?: string; notes?: string };

function BrandTable({ brands }: { brands: BrandEntry[]; accent?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ minWidth: 360 }}>
        <thead>
          <tr style={{ background: CARD2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            {["Brand Name", "Manufacturer", "Notes"].map(h => (
              <th key={h} className="px-5 py-2.5 section-label">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brands.map((b, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? CARD_BG : CARD2, borderBottom: `1px solid ${BORDER}` }}>
              <td className="px-5 py-3 text-[13px] font-semibold" style={{ color: TEXT }}>{b.brand}</td>
              <td className="px-5 py-3 text-[13px]" style={{ color: MUTED }}>{b.manufacturer ?? "—"}</td>
              <td className="px-5 py-3 text-[12px]" style={{ color: MUTED2 }}>{b.notes ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BrandsSection({ med, accent }: { med: MedProtocol; accent: string }) {
  const regions = [
    { id: "india",  label: "India",  flag: "🇮🇳", hasData: med.indianBrands && med.indianBrands.length > 0 },
    { id: "uk",     label: "UK",     flag: "🇬🇧", hasData: med.ukBrands && med.ukBrands.length > 0 },
    { id: "us",     label: "US",     flag: "🇺🇸", hasData: med.usBrands && med.usBrands.length > 0 },
    { id: "canada", label: "Canada", flag: "🇨🇦", hasData: med.canadaBrands && med.canadaBrands.length > 0 },
  ].filter(r => r.hasData);

  const [activeRegion, setActiveRegion] = useState(regions[0]?.id ?? "india");

  if (regions.length === 0) return null;

  return (
    <section id="sec-indianbrands">
      <Card className="overflow-hidden" accentColor={accent}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <SectionTitle title="Brand Names" id="sec-indianbrands" />
          {regions.length > 1 && (
            <div className="flex gap-1.5">
              {regions.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveRegion(r.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    background: activeRegion === r.id ? accent : CARD2,
                    color: activeRegion === r.id ? "#fff" : MUTED,
                    border: `1px solid ${activeRegion === r.id ? accent : BORDER}`,
                  }}
                >
                  <span>{r.flag}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {activeRegion === "india" && med.indianBrands && (
          <BrandTable brands={med.indianBrands} />
        )}
        {activeRegion === "uk" && med.ukBrands && (
          <BrandTable brands={med.ukBrands} />
        )}
        {activeRegion === "us" && med.usBrands && (
          <BrandTable brands={med.usBrands} />
        )}
        {activeRegion === "canada" && med.canadaBrands && (
          <BrandTable brands={med.canadaBrands} />
        )}
        <div className="px-5 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[11px] leading-relaxed" style={{ color: MUTED2 }}>
            Brand information is for reference only. Availability, scheduling, and approval status vary by country. Verify with your local pharmacy.
          </p>
        </div>
      </Card>
    </section>
  );
}

type Interaction = NonNullable<MedProtocol["interactions"]>[number];

function InteractionsSection({
  interactions, accent,
}: {
  interactions: Interaction[];
  accent: string;
  setLocation: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <Card className="overflow-hidden" accentColor={accent}>
      <div className="px-5 pt-5 pb-2">
        <SectionTitle title="Drug Interactions" id="sec-interactions" />
      </div>
      <div className="pb-2">
        {interactions.map((interaction, j) => {
          const cfg = STATUS_CONFIG[interaction.status] ?? STATUS_CONFIG["compatible"];
          const isOpen = expanded === j;
          return (
            <div key={j} style={{ borderTop: j > 0 ? `1px solid ${BORDER}` : undefined }}>
              <button
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:opacity-90"
                style={{ background: CARD_BG }}
                onClick={() => setExpanded(isOpen ? null : j)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                  <span className="text-sm font-medium" style={{ color: TEXT }}>{interaction.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
                    style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                  {isOpen
                    ? <ChevronUp size={13} style={{ color: MUTED2 }} />
                    : <ChevronDown size={13} style={{ color: MUTED2 }} />}
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-2" style={{ background: CARD2, borderTop: `1px solid ${BORDER}` }}>
                  <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
                    {interaction.status === "avoid" && "This combination should be avoided. The interaction may produce harmful or unpredictable effects."}
                    {interaction.status === "caution" && "Interaction data is limited or conflicting. Exercise caution and consult a healthcare provider before combining."}
                    {interaction.status === "compatible" && "Generally considered safe to combine. Monitor for additive therapeutic effects."}
                    {interaction.status === "monitor" && "Combination requires active monitoring. Track relevant biomarkers and watch for unexpected effects."}
                    {interaction.status === "timing" && "Synergistic potential when timed correctly. Separate doses or coordinate timing to maximise benefit."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StudyDeepDiveCard({ study, accent, defaultOpen }: {
  study: NonNullable<MedProtocol["studyDeepDives"]>[number];
  accent: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <button className="w-full flex items-start justify-between px-4 py-3.5 text-left"
        style={{ background: CARD_BG }} onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-semibold leading-snug mb-0.5" style={{ color: TEXT }}>{study.title}</p>
          <p className="text-[11px]" style={{ color: accent }}>{study.journal} · {study.year}</p>
        </div>
        {open ? <ChevronUp size={14} className="flex-shrink-0 mt-1" style={{ color: MUTED2 }} />
          : <ChevronDown size={14} className="flex-shrink-0 mt-1" style={{ color: MUTED2 }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ background: CARD2, borderTop: `1px solid ${BORDER}` }}>
          {[
            { label: "Methodology", value: study.methodology },
            { label: "Sample Size", value: study.sampleSize },
            { label: "Endpoints", value: study.endpoints },
            { label: "Key Findings", value: study.keyFindings },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="section-label mb-1" style={{ color: accent }}>{label}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{value}</p>
            </div>
          ))}
          {study.url && (
            <a href={study.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-1"
              style={{ color: accent }}>
              <ExternalLink size={11} /> View publication
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function FAQItem({ item }: { item: NonNullable<MedProtocol["faq"]>[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      <button className="w-full flex items-center justify-between px-0 py-3.5 text-left"
        onClick={() => setOpen(o => !o)}>
        <span className="text-sm font-medium pr-4 leading-snug" style={{ color: TEXT }}>{item.question}</span>
        {open ? <ChevronUp size={14} className="flex-shrink-0" style={{ color: MUTED2 }} />
          : <ChevronDown size={14} className="flex-shrink-0" style={{ color: MUTED2 }} />}
      </button>
      {open && (
        <div className="pb-3">
          <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{item.answer}</p>
        </div>
      )}
    </div>
  );
}

function parseToHours(str: string): number | null {
  if (!str) return null;
  const clean = str.replace(/\(.*?\)/g, '').replace(/[~≈≤≥+]/g, '').trim();
  const UNIT = '(week(?:s)?|day(?:s)?|hours?|hrs?|min(?:utes?)?)';
  const toH = (val: number, unit: string) => {
    const u = unit.toLowerCase();
    if (u.startsWith('week')) return val * 168;
    if (u.startsWith('day'))  return val * 24;
    if (u.startsWith('min'))  return val / 60;
    return val;
  };
  const rangeMatch = clean.match(new RegExp(`(\\d+\\.?\\d*)\\s*[-–]\\s*(\\d+\\.?\\d*)\\s*${UNIT}`, 'i'));
  if (rangeMatch) {
    const avg = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    return toH(avg, rangeMatch[3]);
  }
  const singleMatch = clean.match(new RegExp(`(\\d+\\.?\\d*)\\s*${UNIT}`, 'i'));
  if (singleMatch) return toH(parseFloat(singleMatch[1]), singleMatch[2]);
  return null;
}

function fmtH(h: number): string {
  if (h < 1 / 60) return '<1m';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  const d = h / 24;
  return `${d % 1 === 0 ? d : d.toFixed(1)}d`;
}

const PK_RANGES_BASE: { label: string; h: number }[] = [
  { label: "24h", h: 24 },
  { label: "7d",  h: 168 },
  { label: "14d", h: 336 },
];

function HalfLifeChart({ peak, halfLife, cleared, accent }: {
  peak?: string; halfLife?: string; cleared?: string; accent: string;
}) {
  const [cursorRatio, setCursorRatio] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(320);

  const peakH  = peak     ? parseToHours(peak)     : null;
  const halfH  = halfLife ? parseToHours(halfLife)  : null;
  const clearH = cleared  ? parseToHours(cleared)   : null;

  const PK_RANGES = halfH !== null && halfH < 168 ? PK_RANGES_BASE.slice(0, 2) : PK_RANGES_BASE;

  const defaultRangeIdx = (() => {
    if (!clearH) return 0;
    for (let i = 0; i < PK_RANGES.length; i++) {
      if (clearH <= PK_RANGES[i].h) return i;
    }
    return PK_RANGES.length - 1;
  })();
  const [rangeIdx, setRangeIdx] = useState(defaultRangeIdx);
  const safeRangeIdx = Math.min(rangeIdx, PK_RANGES.length - 1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0) setChartWidth(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!peakH || !halfH || !clearH || peakH >= clearH) return null;

  const pH = peakH as number;
  const cHrs = PK_RANGES[safeRangeIdx].h;
  const W = chartWidth;
  const H = Math.round(Math.max(150, Math.min(260, W * 0.54)));
  const PL = 8, PR = 8, PT = 18, PB = 42;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const λ = Math.LN2 / halfH;

  function getConc(t: number): number {
    if (t < 0) return 0;
    if (t <= pH) return t / pH;
    return Math.exp(-λ * (t - pH));
  }

  function buildPath(fn: (t: number) => number): string {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * cHrs;
      pts.push(`${i === 0 ? 'M' : 'L'}${(PL + (t / cHrs) * cW).toFixed(2)},${(PT + cH - fn(t) * cH).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  const singlePath = buildPath(getConc);
  const singleFill = `${singlePath} L${(PL + cW).toFixed(2)},${(PT + cH).toFixed(2)} L${PL},${(PT + cH).toFixed(2)} Z`;
  const peakX = PL + Math.min(peakH / cHrs, 1) * cW;
  const halfPeakT = peakH + halfH;
  const halfX = halfPeakT <= cHrs ? PL + (halfPeakT / cHrs) * cW : null;
  const halfConc = Math.exp(-λ * halfH);
  const halfDotY = PT + cH - halfConc * cH;
  const showCleared = clearH <= cHrs;
  const clearedX = PL + Math.min(clearH / cHrs, 1) * cW;
  const markers = [
    { x: peakX, label: "Peak", value: peak! },
    ...(halfX !== null ? [{ x: halfX, label: "½ Life", value: halfLife! }] : []),
    ...(showCleared ? [{ x: clearedX, label: "Cleared", value: cleared! }] : []),
  ];

  const svgX     = cursorRatio !== null ? Math.max(PL, Math.min(PL + cW, cursorRatio * W)) : null;
  const cursorT  = svgX !== null ? ((svgX - PL) / cW) * cHrs : null;
  const cSingle  = cursorT !== null ? getConc(cursorT) : null;
  const cSingleY = cSingle !== null ? PT + cH - cSingle * cH : null;
  const ttW = 72, ttH = 30;
  const ttX = svgX !== null ? (svgX + 10 + ttW > W - PR ? svgX - ttW - 6 : svgX + 10) : 0;
  const ttY = cSingleY !== null ? Math.max(PT + 2, Math.min(cSingleY - 12, PT + cH - ttH - 2)) : PT;

  function anchor(i: number) { return i === 0 ? 'start' : i === markers.length - 1 ? 'end' : 'middle'; }

  const MIN_LABEL_PX = 48;
  const labelVisible = markers.map((m, i) => {
    if (i === 0) return true;
    for (let j = 0; j < i; j++) {
      if (Math.abs(m.x - markers[j].x) < MIN_LABEL_PX) return false;
    }
    return true;
  });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setCursorRatio((e.clientX - r.left) / r.width);
  };
  const onTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setCursorRatio((e.touches[0].clientX - r.left) / r.width);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Concentration–Time Curve</p>
        <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
          {PK_RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
              style={safeRangeIdx === i ? { background: accent, color: 'white' } : { color: MUTED }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="rounded-xl overflow-hidden" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair"
          style={{ display: 'block', touchAction: 'none' }}
          onMouseMove={onMove} onMouseLeave={() => setCursorRatio(null)}
          onTouchMove={onTouch} onTouchEnd={() => setCursorRatio(null)}>
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v} x1={PL} y1={(PT + cH - v * cH).toFixed(2)}
              x2={PL + cW} y2={(PT + cH - v * cH).toFixed(2)}
              stroke="var(--t-border)" strokeWidth="0.6" strokeDasharray="3,3" />
          ))}
          <path d={singleFill} fill={`${accent}10`} />
          <path d={singlePath} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {markers.map((m, i) => (
            <line key={i} x1={m.x.toFixed(2)} y1={PT}
              x2={m.x.toFixed(2)} y2={(PT + cH).toFixed(2)}
              stroke={accent} strokeWidth="0.75" strokeDasharray="3,2" opacity="0.25" />
          ))}
          <circle cx={peakX.toFixed(2)} cy={PT} r="3" fill={accent} />
          {halfX !== null && <circle cx={halfX.toFixed(2)} cy={halfDotY.toFixed(2)} r="2.5" fill={accent} />}
          <line x1={PL} y1={(PT + cH).toFixed(2)} x2={PL + cW} y2={(PT + cH).toFixed(2)} stroke="var(--t-border)" strokeWidth="0.8" />
          <text x={PL + 2} y={PT + 8} fontSize="6.5" style={{ fill: 'var(--t-subtle)' }} fontWeight="600" fontFamily="system-ui,sans-serif">100%</text>
          <text x={PL + 2} y={(PT + cH * 0.5 + 3).toFixed(2)} fontSize="6.5" style={{ fill: 'var(--t-subtle)' }} fontWeight="600" fontFamily="system-ui,sans-serif">50%</text>
          {markers.map((m, i) => labelVisible[i] && (
            <g key={i}>
              <text x={m.x.toFixed(2)} y={(PT + cH + 14).toFixed(2)} textAnchor={anchor(i)} fontSize="7" style={{ fill: 'var(--t-muted)' }} fontWeight="600" fontFamily="system-ui,sans-serif">{m.label}</text>
              <text x={m.x.toFixed(2)} y={(PT + cH + 25).toFixed(2)} textAnchor={anchor(i)} fontSize="6.5" style={{ fill: 'var(--t-muted)' }} fontWeight="700" fontFamily="system-ui,sans-serif">{m.value}</text>
            </g>
          ))}
          {svgX !== null && cursorT !== null && cSingle !== null && cSingleY !== null && (
            <g>
              <line x1={svgX.toFixed(2)} y1={PT} x2={svgX.toFixed(2)} y2={(PT + cH).toFixed(2)}
                stroke={accent} strokeWidth="1" opacity="0.35" strokeDasharray="2,2" />
              <circle cx={svgX.toFixed(2)} cy={cSingleY.toFixed(2)} r="4.5"
                style={{ fill: 'var(--t-surface)' }} stroke={accent} strokeWidth="2" />
              <g transform={`translate(${ttX.toFixed(2)},${ttY.toFixed(2)})`}>
                <rect x="0" y="0" width={ttW} height={ttH} rx="5"
                  style={{ fill: 'var(--t-surface)', stroke: 'var(--t-border)' }} strokeWidth="0.8" />
                <text x="7" y="12" fontSize="7" style={{ fill: 'var(--t-muted)' }} fontWeight="600" fontFamily="system-ui,sans-serif">{fmtH(cursorT)}</text>
                <text x="7" y="24" fontSize="8.5" fill={accent} fontWeight="800" fontFamily="system-ui,sans-serif">{(cSingle * 100).toFixed(0)}% conc.</text>
              </g>
            </g>
          )}
        </svg>
      </div>
      <p className="text-[9px] italic mt-1.5" style={{ color: MUTED2 }}>
        Hover to explore. Approximate profile — varies by dose, route &amp; individual metabolism.
      </p>
    </div>
  );
}

export default function MedDetail() {
  const [, params] = useRoute("/medications/:slug");
  const [, setLocation] = useLocation();

  const slug = params?.slug ?? "";
  const med  = MED_PROTOCOLS.find(p => p.slug === slug) as MedProtocol | undefined;

  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.dataset.theme === 'dark')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  if (!med) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <Pill size={48} className="mb-4" style={{ color: MUTED2 }} />
          <p className="text-lg font-bold mb-2" style={{ color: TEXT }}>Medication Not Found</p>
          <p className="text-sm mb-6" style={{ color: MUTED }}>We couldn't find a medication with that identifier.</p>
          <button onClick={() => setLocation("/medications")}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}>
            ← Back to Medical Protocols
          </button>
        </div>
      </PageLayout>
    );
  }

  const accent = isDark ? lightenHex(med.color, 100) : med.color;
  const level  = med.researchLevel ?? "Well Researched";
  const levelCfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG["Well Researched"];

  const hasBrands = (med.indianBrands && med.indianBrands.length > 0)
    || (med.ukBrands && med.ukBrands.length > 0)
    || (med.usBrands && med.usBrands.length > 0)
    || (med.canadaBrands && med.canadaBrands.length > 0);

  const sections = useMemo(() => {
    const s: Array<{ id: string; label: string }> = [];
    if (med.overview)                  s.push({ id: "sec-overview",    label: "Overview" });
    if (med.pharmacokinetics)          s.push({ id: "sec-pk",          label: "PK" });
    if (med.researchIndications?.length) s.push({ id: "sec-indications", label: "Indications" });
    if (med.researchProtocols?.length)   s.push({ id: "sec-protocols",   label: "Dosing" });
    if (hasBrands)                     s.push({ id: "sec-indianbrands", label: "Brands" });
    if (med.qualityIndicators?.length)   s.push({ id: "sec-quality",     label: "Quality" });
    if (med.expectTimeline?.length)      s.push({ id: "sec-timeline",    label: "Timeline" });
    if (med.sideEffectNotes?.length)     s.push({ id: "sec-effects",     label: "Side Effects" });
    if (med.interactions?.length)        s.push({ id: "sec-interactions", label: "Interactions" });
    if (med.references?.length)          s.push({ id: "sec-references",  label: "References" });
    if (med.studyDeepDives?.length)      s.push({ id: "sec-studies",     label: "Studies" });
    if (med.clinicalTrials?.length)      s.push({ id: "sec-trials",      label: "Trials" });
    if (med.regulatoryStatus?.length)    s.push({ id: "sec-regulatory",  label: "Regulatory" });
    if (med.faq?.length)                 s.push({ id: "sec-faq",         label: "FAQ" });
    return s;
  }, [med, hasBrands]);

  const quickStart = med.quickStart;
  const qsRows = quickStart ? [
    { icon: <Syringe size={13} />,      label: "Typical Dose",     value: quickStart.dose },
    { icon: <RefreshCw size={13} />,    label: "How Often",        value: quickStart.frequency },
    { icon: <MapPin size={13} />,       label: "How to Take",      value: quickStart.injectionSite },
    { icon: <Timer size={13} />,        label: "Best Timing",      value: quickStart.timing },
    { icon: <TrendingUp size={13} />,   label: "Effects Timeline", value: quickStart.timeline },
    { icon: <Thermometer size={13} />,  label: "Storage",          value: quickStart.storage },
    { icon: <Clock size={13} />,        label: "Duration",         value: quickStart.cycleLength },
  ].filter(r => r.value) : [];

  const statCards = [
    { label: "Typical Dose",   value: med.typicalDose ?? med.startDose },
    { label: "Route",          value: med.route.split(/[,(]/)[0].trim() },
    { label: "Frequency",      value: med.frequency },
    { label: "Storage",        value: med.storageShort ?? med.storage.split('.')[0] },
  ];

  const abbrev = med.abbreviation.slice(0, 6);
  const abbrevFontSize = abbrev.length <= 3 ? '16px' : abbrev.length <= 4 ? '13px' : abbrev.length <= 5 ? '11px' : '9.5px';

  return (
    <PageLayout>
      <div style={{ background: BG, minHeight: "100%" }}>

        {/* ══ HERO HEADER ══ */}
        <div className="relative overflow-hidden" style={{ background: "#0f1729" }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(ellipse at 60% 40%, ${accent}28 0%, transparent 70%)`
          }} />

          <div className="relative px-4 pt-3 pb-5 max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <button
              onClick={() => setLocation("/medications")}
              className="flex items-center gap-1.5 text-[11px] font-medium mb-4 hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <ChevronLeft size={13} />
              Medical Protocols
            </button>

            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-white leading-none"
                style={{ background: `${accent}30`, border: `1.5px solid ${accent}50`, fontSize: abbrevFontSize }}
              >
                {abbrev}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: levelCfg.dark, color: levelCfg.color, border: `1px solid ${levelCfg.color}35` }}>
                    {level}
                  </span>
                  {med.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="text-[26px] sm:text-3xl font-black text-white leading-tight tracking-tight">{med.name}</h1>
                <p className="text-[13px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{med.tagline}</p>
              </div>
            </div>

            {/* Section Nav */}
            <div className="mb-4">
              <SectionNav sections={sections} accent={accent} />
            </div>

            {/* Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {statCards.map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: 'rgba(255,255,255,0.42)' }}>{label}</p>
                  <p className="text-[13px] font-bold text-white leading-tight">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ CONTENT ══ */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">

            {/* Main column */}
            <div className="space-y-5">

              {/* ── Overview ── */}
              {med.overview && (
                <section id="sec-overview">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Overview" id="sec-overview" />
                    <div className="space-y-3.5">
                      <div>
                        <p className="section-label mb-1" style={{ color: accent }}>What is it?</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{med.overview.whatIsIt}</p>
                      </div>
                      <div>
                        <p className="section-label mb-1" style={{ color: accent }}>Key Benefits</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{med.overview.keyBenefits}</p>
                      </div>
                      <div>
                        <p className="section-label mb-1" style={{ color: accent }}>Mechanism of Action</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{med.overview.mechanismOfAction}</p>
                      </div>
                    </div>
                  </Card>
                </section>
              )}

              {/* ── Pharmacokinetics ── */}
              {med.pharmacokinetics && (
                <section id="sec-pk">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Pharmacokinetics" id="sec-pk" />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Peak Plasma", value: med.pharmacokinetics.peak },
                        { label: "Half-Life",   value: med.pharmacokinetics.halfLife },
                        { label: "Cleared",     value: med.pharmacokinetics.cleared },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-3 text-center"
                          style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                          <p className="section-label mb-1">{label}</p>
                          <p className="text-[14px] font-bold" style={{ color: accent }}>{value ?? "N/A"}</p>
                        </div>
                      ))}
                    </div>
                    <HalfLifeChart
                      peak={med.pharmacokinetics.peak}
                      halfLife={med.pharmacokinetics.halfLife}
                      cleared={med.pharmacokinetics.cleared}
                      accent={accent}
                    />
                  </Card>
                </section>
              )}

              {/* ── Research Indications ── */}
              {med.researchIndications && med.researchIndications.length > 0 && (
                <section id="sec-indications">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Research Indications" id="sec-indications" />
                    <IndicationsSection indications={med.researchIndications} accent={accent} />
                  </Card>
                </section>
              )}

              {/* ── Dosing Protocols ── */}
              {med.researchProtocols && med.researchProtocols.length > 0 && (
                <section id="sec-protocols">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Dosing Protocols" id="sec-protocols" />
                    <ProtocolCards protocols={med.researchProtocols} accent={accent} />
                    {med.protocolTiming && (
                      <div className="mt-3 rounded-xl p-3.5"
                        style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}>
                        <div className="flex items-start gap-2">
                          <Timer size={13} className="flex-shrink-0 mt-0.5" style={{ color: accent }} />
                          <p className="text-[12px] leading-snug" style={{ color: MUTED }}>
                            <span className="font-semibold" style={{ color: accent }}>Timing Note: </span>
                            {med.protocolTiming}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                </section>
              )}

              {/* ── Brand Names ── */}
              {hasBrands && (
                <BrandsSection med={med} accent={accent} />
              )}

              {/* ── Quick Start (from quickStart field if present) ── */}
              {qsRows.length > 0 && (
                <section id="sec-quickstart">
                  <Card className="overflow-hidden" accentColor={accent}>
                    <div className="px-4 py-3 flex items-center gap-2"
                      style={{ background: `${accent}0c`, borderBottom: `1px solid ${BORDER}` }}>
                      <Zap size={13} style={{ color: accent }} />
                      <p className="section-label" style={{ color: accent }}>Quick Start Guide</p>
                    </div>
                    {qsRows.map((row, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-2.5"
                        style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                        <div className="flex-shrink-0 mt-0.5" style={{ color: accent }}>{row.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="section-label mb-0.5">{row.label}</p>
                          <p className="text-xs leading-snug" style={{ color: TEXT }}>{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </Card>
                </section>
              )}

              {/* ── Quality Indicators ── */}
              {med.qualityIndicators && med.qualityIndicators.length > 0 && (
                <section id="sec-quality">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Quality Indicators" id="sec-quality" />
                    <div className="space-y-3">
                      {med.qualityIndicators.map((q, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl p-3.5"
                          style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                          {QUAL_ICONS[q.type as keyof typeof QUAL_ICONS] ?? QUAL_ICONS.warn}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold mb-0.5" style={{ color: TEXT }}>{q.title}</p>
                            <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>{q.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* ── Expected Timeline ── */}
              {med.expectTimeline && med.expectTimeline.length > 0 && (
                <section id="sec-timeline">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Expected Timeline" id="sec-timeline" />
                    <div className="space-y-2.5 relative">
                      <div className="absolute left-[11px] top-1 bottom-1 w-px" style={{ background: `${accent}30` }} />
                      {med.expectTimeline.map((item, i) => (
                        <div key={i} className="flex items-start gap-3.5 relative">
                          <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 z-10 mt-0.5"
                            style={{ background: CARD_BG, borderColor: accent }} />
                          <div className="flex-1 rounded-xl p-3"
                            style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                            <p className="text-[11px] font-bold mb-0.5" style={{ color: accent }}>{item.timeframe}</p>
                            <p className="text-[12px] leading-snug" style={{ color: MUTED }}>{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* ── Side Effects ── */}
              {med.sideEffectNotes && med.sideEffectNotes.length > 0 && (
                <section id="sec-effects">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Side Effects & Safety" id="sec-effects" />
                    <div className="space-y-2">
                      {med.sideEffectNotes.map((note, i) => (
                        <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                          style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                          <p className="text-[13px] leading-snug" style={{ color: MUTED }}>{note}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* ── Drug Interactions ── */}
              {med.interactions && med.interactions.length > 0 && (
                <section id="sec-interactions">
                  <InteractionsSection
                    interactions={med.interactions}
                    accent={accent}
                    setLocation={setLocation}
                  />
                </section>
              )}

              {/* ── References ── */}
              {med.references && med.references.length > 0 && (
                <section id="sec-references">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Key References" id="sec-references" />
                    <div className="space-y-3">
                      {med.references.map((ref, i) => (
                        <div key={i} className="rounded-xl p-4" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold leading-snug" style={{ color: TEXT }}>{ref.title}</p>
                            {ref.url && (
                              <a href={ref.url} target="_blank" rel="noopener noreferrer"
                                className="flex-shrink-0" style={{ color: accent }}>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {ref.context && (
                            <p className="text-[10px] font-semibold mb-1.5 px-2 py-0.5 rounded-full inline-block"
                              style={{ background: `${accent}12`, color: accent }}>
                              {ref.context}
                            </p>
                          )}
                          <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>{ref.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* ── Study Deep Dives ── */}
              {med.studyDeepDives && med.studyDeepDives.length > 0 && (
                <section id="sec-studies">
                  <Card className="p-5" accentColor={accent}>
                    <SectionTitle title="Study Deep Dives" id="sec-studies" />
                    <div className="space-y-3">
                      {med.studyDeepDives.map((study, i) => (
                        <StudyDeepDiveCard key={i} study={study} accent={accent} defaultOpen={i === 0} />
                      ))}
                    </div>
                  </Card>
                </section>
              )}

              {/* ── Clinical Trials ── */}
              {med.clinicalTrials && med.clinicalTrials.length > 0 && (
                <section id="sec-trials">
                  <Card className="overflow-hidden" accentColor={accent}>
                    <div className="px-5 pt-5 pb-2">
                      <SectionTitle title="Clinical Trial Tracker" id="sec-trials" />
                    </div>
                    {med.clinicalTrials.map((trial, i) => {
                      const statusCfg = TRIAL_STATUS_CONFIG[trial.status] ?? { color: MUTED2, bg: CARD2 };
                      return (
                        <div key={i} className="px-5 py-5"
                          style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-snug" style={{ color: TEXT }}>{trial.name}</p>
                              <p className="text-[11px] mt-0.5" style={{ color: MUTED2 }}>NCT: {trial.nct} · {trial.phase}</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                              style={{ color: statusCfg.color, background: statusCfg.bg }}>
                              {trial.status}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{trial.outcomeSummary}</p>
                        </div>
                      );
                    })}
                  </Card>
                </section>
              )}

              {/* ── Regulatory Status ── */}
              {med.regulatoryStatus && med.regulatoryStatus.length > 0 && (
                <section id="sec-regulatory">
                  <Card className="overflow-hidden" accentColor={accent}>
                    <div className="px-5 pt-5 pb-4">
                      <SectionTitle title="Regulatory Status" id="sec-regulatory" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {med.regulatoryStatus.map((reg, i) => {
                          const statusCfg = REG_STATUS_CONFIG[reg.status] ?? { color: MUTED2, bg: CARD2 };
                          return (
                            <div key={i} className="rounded-xl p-4" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{reg.region}</p>
                                  <p className="text-[11px]" style={{ color: MUTED2 }}>{reg.agency}</p>
                                </div>
                                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                                  style={{ color: statusCfg.color, background: statusCfg.bg }}>
                                  {reg.status}
                                </span>
                              </div>
                              {reg.notes && <p className="text-[12px] leading-snug" style={{ color: MUTED }}>{reg.notes}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </section>
              )}

              {/* ── FAQ ── */}
              {med.faq && med.faq.length > 0 && (
                <section id="sec-faq">
                  <Card className="px-5 pt-5 pb-3" accentColor={accent}>
                    <SectionTitle title="Frequently Asked Questions" id="sec-faq" />
                    {med.faq.map((item, i) => (
                      <FAQItem key={i} item={item} />
                    ))}
                  </Card>
                </section>
              )}

            </div>{/* end main column */}

            {/* ══ Sidebar ══ */}
            <div className="mt-6 md:mt-0">
              <div className="space-y-4 md:sticky md:top-4">

                {/* Research level info */}
                <div className="rounded-xl p-4"
                  style={{ background: levelCfg.bg, border: `1px solid ${levelCfg.color}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: levelCfg.color }} />
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: levelCfg.color }}>{level}</p>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
                    {level === "Extensively Studied"
                      ? "Multiple large-scale clinical trials with consistent results across populations."
                      : level === "Well Researched"
                      ? "Solid body of clinical and pre-clinical research supporting key indications."
                      : level === "Limited Research"
                      ? "Some promising early data; larger controlled studies are still needed."
                      : "Early preclinical or anecdotal data. Use with additional caution."}
                  </p>
                </div>

              </div>
            </div>{/* end sidebar */}

          </div>{/* end two-column grid */}
        </div>
      </div>
    </PageLayout>
  );
}
