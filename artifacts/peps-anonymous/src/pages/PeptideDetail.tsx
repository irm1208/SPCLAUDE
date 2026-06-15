import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Syringe, RefreshCw, Clock, Thermometer,
  FlaskConical, Dna, Activity, BookOpen, AlertTriangle,
  CheckCircle2, XCircle, Info, ChevronDown, ChevronUp,
  ExternalLink, Zap, Shield, TrendingUp, Star, ShoppingBag,
  Calculator, MapPin, Timer, ArrowRight, Microscope, TestTube2,
  Globe, GitBranch, BarChart3, Users, HelpCircle,
  ListChecks, BarChart2
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { PROTOCOLS, type Protocol, type ResearchIndication } from "@/data/protocols";
import { T } from "@/lib/theme";
import { LabReportPopup } from "@/components/LabTestsPopup";

const BG       = "var(--t-bg)";
const CARD_BG  = T.surface;
const CARD2    = T.surface2;
const BORDER   = T.border;
const TEXT     = T.text;
const MUTED    = T.muted;
const MUTED2   = T.subtle;

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
  "Extensively Studied": { color: "#10B981", bg: "rgba(16,185,129,0.10)",  dark: "rgba(16,185,129,0.18)" },
  "Well Researched":     { color: "var(--t-blue)", bg: "var(--t-blue-10)",  dark: "var(--t-blue-18)" },
  "Limited Research":    { color: "#F59E0B", bg: "rgba(245,158,11,0.10)",  dark: "rgba(245,158,11,0.18)" },
  "Early Research":      { color: "#A78BFA", bg: "rgba(167,139,250,0.10)", dark: "rgba(167,139,250,0.18)" },
};

const QUAL_ICONS = {
  pass: <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#10B981" }} />,
  warn: <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />,
  fail: <XCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />,
};

const TRIAL_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "Completed":           { color: "#10B981", bg: "rgba(16,185,129,0.10)" },
  "Active":              { color: "var(--t-blue)", bg: "var(--t-blue-10)" },
  "Recruiting":          { color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  "Not yet recruiting":  { color: "#A78BFA", bg: "rgba(167,139,250,0.10)" },
  "Terminated":          { color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
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

function Card({ children, className = "", style = {}, accentColor }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; accentColor?: string }) {
  const cardBg = accentColor
    ? `linear-gradient(135deg, ${CARD_BG} 40%, color-mix(in srgb, ${accentColor} 14%, ${CARD_BG}))`
    : CARD_BG;
  return (
    <div className={`rounded-xl relative overflow-hidden ${className}`} style={{ background: cardBg, border: `1px solid ${BORDER}`, ...style }}>
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

function parseDoseIntervalH(frequency: string): number {
  const f = frequency.toLowerCase();
  if (f.includes('every other day') || f.includes('eod') || f.includes('every 2 day')) return 48;
  if (f.includes('3') && (f.includes('daily') || f.includes('day'))) return 8;
  if (f.includes('twice daily') || f.includes('2× daily') || f.includes('2x daily')) return 12;
  if (f.includes('twice weekly') || f.includes('2×/week') || f.includes('2x/week') || f.includes('twice weekly')) return 84;
  if (f.includes('3') && f.includes('week')) return 56;
  if (f.includes('once daily') || f === 'daily' || f.includes('once a day') || (f.includes('daily') && !f.includes('twice'))) return 24;
  if (f.includes('once weekly') || f.includes('weekly')) return 168;
  if (f.includes('every 2') || f.includes('every two')) return 48;
  return 24;
}

const NONPEPTIDE_CATS = new Set(['trt', 'aas', 'oral', 'sarm', 'ancillary']);

function fmtH(h: number): string {
  if (h < 1 / 60) return '<1m';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  const d = h / 24;
  return `${d % 1 === 0 ? d : d.toFixed(1)}d`;
}

const PK_RANGES_BASE: { label: string; h: number }[] = [
  { label: "24h",  h: 24   },
  { label: "7d",   h: 168  },
  { label: "14d",  h: 336  },
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

  const PK_RANGES = halfH !== null && halfH < 168
    ? PK_RANGES_BASE.slice(0, 2)
    : PK_RANGES_BASE;

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

  const pH   = peakH  as number;
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

  const peakX    = PL + Math.min(peakH / cHrs, 1) * cW;
  const halfPeakT = peakH + halfH;
  const halfX    = halfPeakT <= cHrs ? PL + (halfPeakT / cHrs) * cW : null;
  const halfConc = Math.exp(-λ * halfH);
  const halfDotY = PT + cH - halfConc * cH;

  const showCleared = clearH <= cHrs;
  const clearedX = PL + Math.min(clearH / cHrs, 1) * cW;
  const markers = [
    { x: peakX,    label: "Peak",    value: peak! },
    ...(halfX !== null ? [{ x: halfX, label: "½ Life", value: halfLife! }] : []),
    ...(showCleared ? [{ x: clearedX, label: "Cleared", value: cleared! }] : []),
  ];

  const svgX    = cursorRatio !== null ? Math.max(PL, Math.min(PL + cW, cursorRatio * W)) : null;
  const cursorT = svgX !== null ? ((svgX - PL) / cW) * cHrs : null;
  const cSingle = cursorT !== null ? getConc(cursorT) : null;
  const cSingleY = cSingle !== null ? PT + cH - cSingle * cH : null;

  const ttW = 72;
  const ttH = 30;
  const ttX = svgX !== null
    ? (svgX + 10 + ttW > W - PR ? svgX - ttW - 6 : svgX + 10)
    : 0;
  const ttY = cSingleY !== null
    ? Math.max(PT + 2, Math.min(cSingleY - 12, PT + cH - ttH - 2))
    : PT;

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
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
              style={safeRangeIdx === i
                ? { background: accent, color: 'white' }
                : { color: MUTED }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="rounded-xl overflow-hidden" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ display: 'block', touchAction: 'none' }}
          onMouseMove={onMove}
          onMouseLeave={() => setCursorRatio(null)}
          onTouchMove={onTouch}
          onTouchEnd={() => setCursorRatio(null)}
        >
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v}
              x1={PL} y1={(PT + cH - v * cH).toFixed(2)}
              x2={PL + cW} y2={(PT + cH - v * cH).toFixed(2)}
              stroke="var(--t-border)" strokeWidth="0.6" strokeDasharray="3,3"
            />
          ))}

          <path d={singleFill} fill={`${accent}10`} />
          <path d={singlePath} fill="none" stroke={accent} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />

          {markers.map((m, i) => (
            <line key={i}
              x1={m.x.toFixed(2)} y1={PT}
              x2={m.x.toFixed(2)} y2={(PT + cH).toFixed(2)}
              stroke={accent} strokeWidth="0.75" strokeDasharray="3,2" opacity="0.25"
            />
          ))}

          <circle cx={peakX.toFixed(2)} cy={PT} r="3" fill={accent} />
          {halfX !== null && (
            <circle cx={halfX.toFixed(2)} cy={halfDotY.toFixed(2)} r="2.5" fill={accent} />
          )}

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

function SteadyStateChart({
  halfLifeH, tPeakH, dosingIntervalH, totalWeeks = 12, color, name,
}: {
  halfLifeH: number; tPeakH: number; dosingIntervalH: number;
  totalWeeks?: number; color: string; name: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(320);
  const [cursorRatio, setCursorRatio] = useState<number | null>(null);

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

  const { path, fillPath, peaks, maxC, steadyStart, svgW, svgH, PL, PR, PT, PB, cW, cH, totalH } = useMemo(() => {
    const totalH = totalWeeks * 168;
    const λ = Math.LN2 / halfLifeH;
    const doses: number[] = [];
    for (let t = 0; t <= totalH; t += dosingIntervalH) doses.push(t);

    function getConc(t: number): number {
      return doses.reduce((acc, dn) => {
        const dt = t - dn;
        if (dt < 0) return acc;
        const c = dt <= tPeakH ? (dt / tPeakH) : Math.exp(-λ * (dt - tPeakH));
        return acc + c;
      }, 0);
    }

    const W = chartWidth;
    const H = Math.round(Math.max(120, Math.min(200, W * 0.42)));
    const PL = 36, PR = 8, PT = 14, PB = 32;
    const cW = W - PL - PR;
    const cH = H - PT - PB;

    const STEPS = 300;
    const samples = Array.from({ length: STEPS + 1 }, (_, i) => {
      const t = (i / STEPS) * totalH;
      return { t, c: getConc(t) };
    });
    const maxC = Math.max(...samples.map(s => s.c), 0.001);

    const toX = (t: number) => PL + (t / totalH) * cW;
    const toY = (c: number) => PT + cH - (c / maxC) * cH;

    const pts = samples.map(({ t, c }) => `${toX(t).toFixed(1)},${toY(c).toFixed(1)}`);
    const path = 'M' + pts.join(' L');
    const fillPath = path + ` L${toX(totalH).toFixed(1)},${(PT + cH).toFixed(1)} L${PL},${(PT + cH).toFixed(1)} Z`;

    const peaks: { x: number; y: number; t: number; c: number }[] = [];
    const troughs: { x: number; y: number; t: number; c: number }[] = [];
    doses.forEach((dn, idx) => {
      const peakT = dn + tPeakH;
      if (peakT <= totalH && idx > 0) {
        const c = getConc(peakT);
        peaks.push({ x: toX(peakT), y: toY(c), t: peakT, c });
      }
      if (idx > 0) {
        const troughT = dn;
        const c = getConc(troughT);
        troughs.push({ x: toX(troughT), y: toY(c), t: troughT, c });
      }
    });

    let steadyStart = -1;
    for (let i = 2; i < peaks.length - 1; i++) {
      const ratio = Math.abs(peaks[i].c - peaks[i - 1].c) / (peaks[i - 1].c || 1);
      if (ratio < 0.03) { steadyStart = peaks[i - 1].t; break; }
    }

    return { path, fillPath, peaks, troughs, maxC, steadyStart, svgW: W, svgH: H, PL, PR, PT, PB, cW, cH, totalH };
  }, [halfLifeH, tPeakH, dosingIntervalH, totalWeeks, chartWidth]);

  const λ = Math.LN2 / halfLifeH;
  function getConcAt(t: number): number {
    let acc = 0;
    for (let dn = 0; dn <= t; dn += dosingIntervalH) {
      const dt = t - dn;
      if (dt < 0) continue;
      acc += dt <= tPeakH ? (dt / tPeakH) : Math.exp(-λ * (dt - tPeakH));
    }
    return acc;
  }

  const toX2 = (t: number) => PL + (t / totalH) * cW;
  const toY2 = (c: number) => PT + cH - (c / maxC) * cH;

  const svgX = cursorRatio !== null ? Math.max(PL, Math.min(PL + cW, cursorRatio * svgW)) : null;
  const cursorT = svgX !== null ? ((svgX - PL) / cW) * totalH : null;
  const cursorC = cursorT !== null ? getConcAt(cursorT) : null;
  const cursorY = cursorC !== null ? toY2(cursorC) : null;

  const weekLabels = Array.from({ length: totalWeeks + 1 }, (_, i) => i).filter(
    w => totalWeeks <= 12 ? w % 2 === 0 : w % 4 === 0
  );

  return (
    <div className="mt-3" ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Multi-dose Plasma Accumulation</p>
        {steadyStart > 0 && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${color}12`, color }}>
            Steady-state ~wk {Math.ceil(steadyStart / 168)}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          width={svgW} height={svgH}
          onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setCursorRatio((e.clientX - r.left) / r.width); }}
          onMouseLeave={() => setCursorRatio(null)}
          style={{ cursor: 'crosshair', display: 'block', userSelect: 'none' }}
        >
          <defs>
            <linearGradient id="ssg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
            {steadyStart > 0 && (
              <pattern id="ssp" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="0.8" opacity="0.15" />
              </pattern>
            )}
          </defs>

          {steadyStart > 0 && (() => {
            const sx = toX2(steadyStart);
            return (
              <rect x={sx} y={PT} width={PL + cW - sx} height={cH}
                fill="url(#ssp)" opacity="0.6" />
            );
          })()}

          <line x1={PL} y1={(PT + cH).toFixed(1)} x2={PL + cW} y2={(PT + cH).toFixed(1)}
            style={{ stroke: 'var(--t-border)' }} strokeWidth="0.8" />

          {weekLabels.map(w => {
            const x = toX2(w * 168);
            return (
              <g key={w}>
                <line x1={x.toFixed(1)} y1={PT} x2={x.toFixed(1)} y2={(PT + cH).toFixed(1)}
                  style={{ stroke: 'var(--t-border)' }} strokeWidth="0.5" />
                <text x={x.toFixed(1)} y={(PT + cH + 12).toFixed(1)} textAnchor="middle"
                  fontSize="6.5" style={{ fill: 'var(--t-muted)' }} fontWeight="600" fontFamily="system-ui,sans-serif">
                  {w === 0 ? 'Start' : `Wk ${w}`}
                </text>
              </g>
            );
          })}

          {[0, 0.5, 1].map(pct => {
            const y = PT + cH - pct * cH;
            return (
              <g key={pct}>
                <line x1={PL} y1={y.toFixed(1)} x2={PL + cW} y2={y.toFixed(1)}
                  style={{ stroke: 'var(--t-border)' }} strokeWidth={pct === 0 ? 0 : "0.4"} />
                <text x={(PL - 4).toFixed(1)} y={(y + 2.5).toFixed(1)} textAnchor="end"
                  fontSize="6" style={{ fill: 'var(--t-muted)' }} fontWeight="600" fontFamily="system-ui,sans-serif">
                  {pct === 0 ? '0' : pct === 0.5 ? '50%' : '100%'}
                </text>
              </g>
            );
          })}

          <path d={fillPath} fill="url(#ssg)" />
          <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

          {peaks.slice(-3).map((p, i) => (
            <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2" fill={color} opacity="0.6" />
          ))}

          {svgX !== null && cursorT !== null && cursorC !== null && cursorY !== null && (
            <g>
              <line x1={svgX.toFixed(1)} y1={PT} x2={svgX.toFixed(1)} y2={(PT + cH).toFixed(1)}
                stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="2,2" />
              <circle cx={svgX.toFixed(1)} cy={cursorY.toFixed(1)} r="4" style={{ fill: 'var(--t-surface)' }} stroke={color} strokeWidth="2" />
              <g transform={`translate(${(svgX + 8 + 80 > svgW - PR ? svgX - 88 : svgX + 8).toFixed(1)},${Math.max(PT + 2, cursorY - 28).toFixed(1)})`}>
                <rect x="0" y="0" width="80" height="30" rx="5" style={{ fill: 'var(--t-surface)', stroke: 'var(--t-border)' }} strokeWidth="0.8" />
                <text x="6" y="11" fontSize="6.5" style={{ fill: 'var(--t-muted)' }} fontWeight="600" fontFamily="system-ui,sans-serif">
                  Wk {(cursorT / 168).toFixed(1)}
                </text>
                <text x="6" y="24" fontSize="8.5" fill={color} fontWeight="800" fontFamily="system-ui,sans-serif">
                  {((cursorC / maxC) * 100).toFixed(0)}% level
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
      <p className="text-[9px] italic mt-1" style={{ color: MUTED2 }}>
        Simulated plasma accumulation over {totalWeeks} weeks. Relative units — actual levels vary by individual.
      </p>
    </div>
  );
}

type ResearchProtocol = NonNullable<Protocol["researchProtocols"]>[number];

function ProtocolCards({
  protocols, accent, category, halfLifeH, tPeakH,
}: {
  protocols: ResearchProtocol[]; accent: string; category?: string;
  halfLifeH?: number; tPeakH?: number;
}) {
  const isNonPeptide = category && NONPEPTIDE_CATS.has(category);
  const first = protocols[0];

  const dosingIntervalH = useMemo(() => {
    return first ? parseDoseIntervalH(first.frequency) : 24;
  }, [first]);

  const totalWeeks = useMemo(() => {
    if (!isNonPeptide) return 8;
    const freq = dosingIntervalH;
    if (freq <= 12) return 6;
    if (freq <= 48) return 12;
    return 12;
  }, [isNonPeptide, dosingIntervalH]);

  return (
    <div className="space-y-3">
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
              <tr
                key={i}
                style={{
                  background: CARD_BG,
                  borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
                }}
              >
                <td className="px-3 py-2.5 font-medium text-[12px]" style={{ color: TEXT }}>{p.goal}</td>
                <td className="px-3 py-2.5 font-semibold tabular-nums text-[12px]" style={{ color: TEXT }}>{p.dose}</td>
                <td className="px-3 py-2.5 text-[12px]" style={{ color: MUTED }}>{p.frequency}</td>
                <td className="px-3 py-2.5 text-[12px]" style={{ color: MUTED }}>{p.route}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isNonPeptide && halfLifeH && tPeakH && (
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <SteadyStateChart
            halfLifeH={halfLifeH}
            tPeakH={tPeakH}
            dosingIntervalH={dosingIntervalH}
            totalWeeks={totalWeeks}
            color={accent}
            name={first?.goal ?? ''}
          />
        </div>
      )}
    </div>
  );
}

function QuickStartCard({ qs, accent }: {
  qs: NonNullable<Protocol["quickStart"]>;
  accent: string;
}) {
  const rows = [
    { icon: <Syringe size={13} />,    label: "Typical Dose",     value: qs.dose },
    { icon: <RefreshCw size={13} />,  label: "How Often",        value: qs.frequency },
    { icon: <MapPin size={13} />,     label: "How to Take",      value: qs.injectionSite },
    { icon: <Timer size={13} />,      label: "Best Timing",      value: qs.timing },
    { icon: <TrendingUp size={13} />, label: "Effects Timeline", value: qs.timeline },
    { icon: <Thermometer size={13} />,label: "Storage",          value: qs.storage },
    { icon: <Clock size={13} />,      label: "Cycle Length",     value: qs.cycleLength },
    { icon: <ArrowRight size={13} />, label: "Break Between",    value: qs.breakBetween },
  ].filter(r => r.value);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${accent}0c`, borderBottom: `1px solid ${BORDER}` }}>
        <Zap size={13} style={{ color: accent }} />
        <p className="section-label" style={{ color: accent }}>Quick Start Guide</p>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-2.5"
          style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
          <div className="flex-shrink-0 mt-0.5" style={{ color: accent }}>{row.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="section-label mb-0.5">{row.label}</p>
            <p className="text-xs leading-snug" style={{ color: TEXT }}>{row.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

type Interaction = NonNullable<Protocol["interactions"]>[number];

function InteractionsSection({
  interactions, accent, protocolSlugMap, setLocation,
}: {
  interactions: Interaction[];
  accent: string;
  protocolSlugMap: Record<string, string>;
  setLocation: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <Card className="overflow-hidden" accentColor={accent}>
      <div className="px-5 pt-5 pb-2">
        <SectionTitle title="Peptide Interactions" id="sec-interactions" />
      </div>
      <div className="pb-2">
        {interactions.map((interaction, j) => {
          const cfg = STATUS_CONFIG[interaction.status] ?? STATUS_CONFIG["compatible"];
          const targetSlug = protocolSlugMap[interaction.name];
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
                  <span className="text-sm font-medium" style={{ color: targetSlug ? accent : TEXT }}>
                    {interaction.name}
                  </span>
                  {targetSlug && <ArrowRight size={12} className="shrink-0" style={{ color: accent }} />}
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
                    {interaction.status === "compatible" && "Generally considered safe to combine. Many researchers stack these compounds for synergistic benefits."}
                    {interaction.status === "monitor" && "Combination requires active monitoring. Track relevant biomarkers and watch for unexpected effects."}
                    {interaction.status === "timing" && "Synergistic potential when timed correctly. Separate doses or coordinate timing to maximize benefit."}
                  </p>
                  {targetSlug && (
                    <button
                      onClick={() => setLocation(`/protocols/${targetSlug}`)}
                      className="mt-2 text-[11px] font-semibold flex items-center gap-1"
                      style={{ color: accent }}
                    >
                      View {interaction.name} protocol <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CommunityPoll({ peptideName, accent }: { peptideName: string; accent: string }) {
  const options = ["Yes, absolutely", "With caution", "Not yet"] as const;
  type Option = typeof options[number];
  const [selected, setSelected] = useState<Option | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const results: Record<Option, number> = { "Yes, absolutely": 72, "With caution": 21, "Not yet": 7 };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${accent}0c`, borderBottom: `1px solid ${BORDER}` }}>
        <BarChart2 size={13} style={{ color: accent }} />
        <p className="section-label" style={{ color: accent }}>Community Poll</p>
      </div>
      <div className="px-4 py-4">
        <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
          Would you recommend {peptideName}?
        </p>
        {!submitted ? (
          <>
            <div className="space-y-2 mb-3">
              {options.map(opt => (
                <label
                  key={opt}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                  style={{
                    border: `1px solid ${selected === opt ? accent + '50' : BORDER}`,
                    background: selected === opt ? `${accent}08` : CARD2,
                  }}
                >
                  <input
                    type="radio"
                    name="poll"
                    value={opt}
                    checked={selected === opt}
                    onChange={() => setSelected(opt)}
                    style={{ accentColor: accent }}
                  />
                  <span className="text-[13px]" style={{ color: selected === opt ? TEXT : MUTED }}>{opt}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => selected && setSubmitted(true)}
              className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: selected ? accent : CARD2,
                color: selected ? 'white' : MUTED2,
                opacity: selected ? 1 : 0.6,
                border: `1px solid ${selected ? 'transparent' : BORDER}`,
              }}
            >
              Submit vote
            </button>
          </>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {options.map(opt => {
                const pct = results[opt];
                return (
                  <div key={opt}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium" style={{ color: opt === selected ? TEXT : MUTED }}>{opt}</span>
                      <span className="text-[11px] font-semibold" style={{ color: opt === selected ? accent : MUTED2 }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: CARD2 }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent, opacity: opt === selected ? 1 : 0.45 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px]" style={{ color: MUTED2 }}>Based on 1,241 anonymous responses</p>
          </>
        )}
      </div>
    </div>
  );
}

function CommunityInsights({ peptide, accent }: { peptide: Protocol; accent: string }) {
  const rows = [
    { label: "Effectiveness",      value: "82%" },
    { label: "Would recommend",    value: "72%" },
    { label: "Common side effect", value: peptide.sideEffectNotes?.[0]?.split('.')[0] ?? "Mild injection site reaction" },
    { label: "Best results at",    value: peptide.cycle ?? "8–12 weeks" },
    { label: "Weight change",      value: (peptide.category as string) === 'weight' ? "−4.5 kg avg" : "Minimal change" },
  ];
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${accent}0c`, borderBottom: `1px solid ${BORDER}` }}>
        <Users size={13} style={{ color: accent }} />
        <p className="section-label" style={{ color: accent }}>Community Insights</p>
      </div>
      <div>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between px-4 py-3"
            style={{ borderTop: `1px solid ${BORDER}` }}>
            <span className="text-[12px]" style={{ color: MUTED }}>{label}</span>
            <span className="text-[12px] font-semibold text-right max-w-[55%] leading-snug" style={{ color: TEXT }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudyDeepDiveCard({ study, accent, defaultOpen }: {
  study: NonNullable<Protocol["studyDeepDives"]>[number];
  accent: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <button
        className="w-full flex items-start justify-between px-4 py-3.5 text-left"
        style={{ background: CARD_BG }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-semibold leading-snug mb-0.5" style={{ color: TEXT }}>{study.title}</p>
          <p className="text-[11px]" style={{ color: accent }}>{study.journal} · {study.year}</p>
        </div>
        {open ? <ChevronUp size={14} className="flex-shrink-0 mt-1" style={{ color: MUTED2 }} /> : <ChevronDown size={14} className="flex-shrink-0 mt-1" style={{ color: MUTED2 }} />}
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

function FAQItem({ item }: { item: NonNullable<Protocol["faq"]>[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      <button
        className="w-full flex items-center justify-between px-0 py-3.5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-medium pr-4 leading-snug" style={{ color: TEXT }}>{item.question}</span>
        {open ? <ChevronUp size={14} className="flex-shrink-0" style={{ color: MUTED2 }} /> : <ChevronDown size={14} className="flex-shrink-0" style={{ color: MUTED2 }} />}
      </button>
      {open && (
        <div className="pb-3">
          <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function PeptideDetail() {
  const [, params] = useRoute("/protocols/:slug");
  const [, setLocation] = useLocation();

  const slug    = params?.slug ?? "";
  const peptide = PROTOCOLS.find(p => p.slug === slug) as Protocol | undefined;

  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.dataset.theme === 'dark')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [hasShopProduct, setHasShopProduct] = useState<boolean | null>(null);
  const [hasLabTests, setHasLabTests] = useState<boolean | null>(null);
  const [showLabPopup, setShowLabPopup] = useState(false);

  useEffect(() => {
    if (!peptide) return;
    const name = peptide.name;
    setHasShopProduct(null);
    setHasLabTests(null);

    const controller = new AbortController();
    const { signal } = controller;

    fetch(`/api/lab-tests?peptide=${encodeURIComponent(name)}&limit=1`, { signal })
      .then(r => r.json())
      .then(data => setHasLabTests(Array.isArray(data) && data.length > 0))
      .catch(err => { if (err.name !== "AbortError") setHasLabTests(false); });

    fetch("/api/vial/products", { signal })
      .then(r => r.json())
      .then(data => {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const peptideNorm = norm(name);
        const found = Array.isArray(data) && data.some((p: { name: string }) =>
          norm(p.name).includes(peptideNorm) || peptideNorm.includes(norm(p.name))
        );
        setHasShopProduct(found);
      })
      .catch(err => { if (err.name !== "AbortError") setHasShopProduct(false); });

    return () => controller.abort();
  }, [peptide?.name]);

  if (!peptide) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <FlaskConical size={48} className="mb-4" style={{ color: MUTED2 }} />
          <p className="text-lg font-bold mb-2" style={{ color: TEXT }}>Peptide Not Found</p>
          <p className="text-sm mb-6" style={{ color: MUTED }}>We couldn't find a peptide with that identifier.</p>
          <button onClick={() => setLocation("/protocols")} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}>
            ← Back to Protocols
          </button>
        </div>
      </PageLayout>
    );
  }

  const accent   = isDark ? lightenHex(peptide.color, 100) : peptide.color;
  const level    = peptide.researchLevel ?? "Well Researched";
  const levelCfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG["Well Researched"];

  const protocolSlugMap = useMemo<Record<string, string>>(() =>
    Object.fromEntries(PROTOCOLS.map(p => [p.name, p.slug])),
    []
  );

  const sections = [
    peptide.overview              && { id: "sec-overview",    label: "Overview" },
    peptide.pharmacokinetics      && { id: "sec-pharma",      label: "Pharmacokinetics" },
    peptide.researchIndications?.length && { id: "sec-indications", label: "Indications" },
    peptide.researchProtocols?.length   && { id: "sec-protocols",   label: "Protocols" },
    peptide.interactions?.length        && { id: "sec-interactions", label: "Interactions" },
    peptide.reconSteps?.length          && { id: "sec-recon",        label: "Reconstitution" },
    peptide.qualityIndicators?.length   && { id: "sec-quality",      label: "Quality" },
    peptide.expectTimeline?.length      && { id: "sec-expect",       label: "Expectations" },
    peptide.sideEffectNotes?.length     && { id: "sec-safety",       label: "Side Effects" },
    peptide.references?.length          && { id: "sec-refs",         label: "References" },
    peptide.studyDeepDives?.length      && { id: "sec-deepdives",    label: "Deep Dives" },
    peptide.clinicalTrials?.length      && { id: "sec-trials",       label: "Trials" },
    peptide.regulatoryStatus?.length    && { id: "sec-regulatory",   label: "Regulatory" },
    peptide.developmentTimeline?.length && { id: "sec-devtimeline",  label: "Timeline" },
    peptide.comparisonTable             && { id: "sec-comparison",   label: "Comparison" },
    peptide.populationNotes?.length     && { id: "sec-population",   label: "Population" },
    peptide.labMarkers?.length          && { id: "sec-labmarkers",   label: "Lab Markers" },
    peptide.faq?.length                 && { id: "sec-faq",          label: "FAQ" },
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <PageLayout>
      <div className="min-h-screen" style={{ background: BG }}>

        {/* ── Page Header ── */}
        <div style={{ background: "#071640", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
          {/* Glass shine — top-right corner */}
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
            {/* Main glow orb */}
            <div style={{
              position: "absolute", top: "-60px", right: "-60px",
              width: "320px", height: "320px",
              background: "radial-gradient(ellipse at center, rgba(100,160,255,0.22) 0%, rgba(60,120,255,0.10) 45%, transparent 70%)",
              borderRadius: "50%",
            }} />
            {/* Specular highlight arc */}
            <div style={{
              position: "absolute", top: "-1px", right: "60px",
              width: "180px", height: "3px",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
              borderRadius: "999px",
              filter: "blur(1px)",
            }} />
            {/* Inner bright spot */}
            <div style={{
              position: "absolute", top: "-20px", right: "20px",
              width: "120px", height: "120px",
              background: "radial-gradient(ellipse at center, rgba(180,210,255,0.18) 0%, transparent 70%)",
              borderRadius: "50%",
            }} />
          </div>
          <div className="max-w-5xl mx-auto px-4 pt-4 pb-5" style={{ position: "relative", zIndex: 1 }}>

            {/* Breadcrumb */}
            <button
              onClick={() => setLocation("/protocols")}
              className="flex items-center gap-1.5 text-xs font-medium mb-4 -ml-0.5 transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <ChevronLeft size={14} /> Protocols
            </button>

            {/* Title row */}
            <div className="flex items-start gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black leading-none whitespace-nowrap"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1.5px solid rgba(255,255,255,0.22)",
                  color: "white",
                  fontSize: (() => {
                    const abbr = peptide.abbreviation.split(' ')[0].slice(0, 6);
                    return abbr.length <= 3 ? '13px' : abbr.length <= 4 ? '11px' : abbr.length <= 5 ? '9.5px' : '8px';
                  })(),
                }}
              >
                {peptide.abbreviation.split(' ')[0].slice(0, 6)}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-black leading-tight" style={{ color: "white" }}>{peptide.name}</h1>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.25)" }}>
                    {level}
                  </span>
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.72)" }}>{peptide.tagline}</p>
              </div>
            </div>

            {/* Tags */}
            {peptide.tags && (
              <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                {peptide.tags.map(tag => (
                  <span key={tag} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.82)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 4-up stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Typical Dose", value: peptide.typicalDose ?? peptide.startDose, sub: peptide.frequency },
                { label: "Route",        value: peptide.route.split(/[,(]/)[0].trim(),    sub: undefined },
                { label: "Cycle",        value: peptide.cycle ?? "See protocol",           sub: "Duration" },
                { label: "Storage",      value: peptide.storageShort ?? "Refrigerated",    sub: "After recon." },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-xl p-3 flex flex-col gap-0.5"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}>
                  <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
                  <p className="text-sm font-bold leading-tight" style={{ color: "white" }}>{value}</p>
                  {sub && <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.52)" }}>{sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile Order CTA (shown below banner on small screens) ── */}
        {(hasShopProduct || hasLabTests) && (
          <div className="md:hidden px-4 py-3 flex flex-col gap-2" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
            {hasShopProduct && (
              <button
                onClick={() => setLocation(`/shop?peptide=${encodeURIComponent(peptide.name)}`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: isDark ? accent : `linear-gradient(90deg, ${accent}, ${lightenHex(accent, 50)})` }}
              >
                <ShoppingBag size={15} /> Order {peptide.name}
              </button>
            )}
            {hasLabTests && (
              <button
                onClick={() => setShowLabPopup(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: MUTED }}
              >
                <FlaskConical size={14} /> Lab reports
              </button>
            )}
          </div>
        )}

        {/* ── Two-column body ── */}
        <div className="max-w-5xl mx-auto px-4 py-5 md:grid md:grid-cols-[1fr_240px] md:gap-4 md:items-start lg:grid-cols-[1fr_300px] lg:gap-6">

          {/* ══ Main column ══ */}
          <div className="min-w-0 space-y-6">

            {/* Section jump-nav */}
            {sections.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <SectionNav sections={sections} accent={accent} />
              </div>
            )}

            {/* ── Overview ── */}
            {peptide.overview && (
              <section id="sec-overview">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-4">
                    <SectionTitle title="Overview" id="sec-overview" />
                    <p className="text-sm font-semibold mb-1.5" style={{ color: TEXT }}>What is {peptide.name}?</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{peptide.overview.whatIsIt}</p>
                  </div>
                  <div className="grid sm:grid-cols-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <div className="px-5 py-4" style={{ borderRight: `1px solid ${BORDER}` }}>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: TEXT }}>Key Benefits</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{peptide.overview.keyBenefits}</p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold mb-1.5" style={{ color: TEXT }}>Mechanism of Action</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{peptide.overview.mechanismOfAction}</p>
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {/* ── Quick Start Guide (under Overview) ── */}
            {peptide.quickStart && (
              <QuickStartCard qs={peptide.quickStart} accent={accent} />
            )}

            {/* ── Pharmacokinetics ── */}
            {peptide.pharmacokinetics && (
              <section id="sec-pharma">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-4">
                    <SectionTitle title="Pharmacokinetics" id="sec-pharma" />

                    {/* PK stats row */}
                    {(peptide.pharmacokinetics.peak || peptide.pharmacokinetics.halfLife || peptide.pharmacokinetics.cleared) && (
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                          { label: "Peak",      value: peptide.pharmacokinetics.peak },
                          { label: "Half-Life", value: peptide.pharmacokinetics.halfLife },
                          { label: "Cleared",   value: peptide.pharmacokinetics.cleared },
                        ].filter(s => s.value).map(({ label, value }) => (
                          <div key={label} className="rounded-lg p-3" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                            <p className="section-label mb-1">{label}</p>
                            <p className="text-sm font-bold" style={{ color: TEXT }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <HalfLifeChart
                      key={`${peptide.slug}-pk`}
                      peak={peptide.pharmacokinetics.peak}
                      halfLife={peptide.pharmacokinetics.halfLife}
                      cleared={peptide.pharmacokinetics.cleared}
                      accent={accent}
                    />
                    <p className="text-[9px] italic mt-2" style={{ color: MUTED2 }}>Preclinical data only</p>
                  </div>

                  <div className="px-5 pb-5">
                    <button
                      onClick={() => setLocation(`/calculator?peptide=${encodeURIComponent(peptide.slug)}`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ background: CARD2, border: `1px solid ${BORDER}`, color: MUTED }}
                    >
                      <Calculator size={14} /> Calculate my dose
                    </button>
                  </div>
                </Card>
              </section>
            )}

            {/* ── Research Indications ── */}
            {peptide.researchIndications && peptide.researchIndications.length > 0 && (
              <section id="sec-indications">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-2">
                    <SectionTitle title="Research Indications" id="sec-indications" />
                  </div>
                  <div className="px-5 pb-5">
                    <IndicationsSection indications={peptide.researchIndications} accent={accent} />
                  </div>
                </Card>
              </section>
            )}

            {/* ── Research Protocols ── */}
            {peptide.researchProtocols && peptide.researchProtocols.length > 0 && (
              <section id="sec-protocols">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-4">
                    <SectionTitle title="Research Protocols" id="sec-protocols" />

                    {/* Disclaimer banner */}
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4"
                      style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-15)` }}>
                      <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--t-blue)' }} />
                      <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
                        These are commonly discussed research protocols and not medical advice. Consult a healthcare provider before use.
                      </p>
                    </div>

                    <ProtocolCards
                      protocols={peptide.researchProtocols}
                      accent={accent}
                      category={peptide.category}
                      halfLifeH={peptide.pharmacokinetics?.halfLife ? (parseToHours(peptide.pharmacokinetics.halfLife) ?? undefined) : undefined}
                      tPeakH={peptide.pharmacokinetics?.peak ? (parseToHours(peptide.pharmacokinetics.peak) ?? undefined) : undefined}
                    />

                    {peptide.protocolTiming && (
                      <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                        <p className="section-label mb-1">Timing Note</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{peptide.protocolTiming}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </section>
            )}

            {/* ── Peptide Interactions ── */}
            {peptide.interactions && peptide.interactions.length > 0 && (
              <section id="sec-interactions">
                <InteractionsSection
                  interactions={peptide.interactions}
                  accent={accent}
                  protocolSlugMap={protocolSlugMap}
                  setLocation={setLocation}
                />
              </section>
            )}

            {/* ── Reconstitution ── */}
            {peptide.reconSteps && peptide.reconSteps.length > 0 && (
              <section id="sec-recon">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold" style={{ color: TEXT }}>How to Reconstitute</h2>
                      <button
                        onClick={() => setLocation(`/calculator?peptide=${encodeURIComponent(peptide.slug)}`)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: CARD2, border: `1px solid ${BORDER}`, color: MUTED }}
                      >
                        <Calculator size={13} /> Calculator
                      </button>
                    </div>
                    <div className="h-px mb-4" style={{ background: BORDER }} />

                    {/* Important banner */}
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5"
                      style={{ background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.25)` }}>
                      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#D97706' }}>Important</p>
                        <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>Always use bacteriostatic water (BAC). Sterile technique is essential.</p>
                      </div>
                    </div>

                    {/* Numbered steps */}
                    <div className="space-y-3">
                      {peptide.reconSteps!.map((step, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5"
                            style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}25` }}>
                            {i + 1}
                          </div>
                          <p className="text-[13px] leading-relaxed pt-0.5" style={{ color: MUTED }}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {/* ── Quality Indicators ── */}
            {peptide.qualityIndicators && peptide.qualityIndicators.length > 0 && (
              <section id="sec-quality">
                <Card className="p-5" accentColor={accent}>
                  <SectionTitle title="Quality Indicators" id="sec-quality" />
                  <div className="space-y-3">
                    {peptide.qualityIndicators.map((qi, i) => (
                      <div key={i} className="flex items-start gap-3">
                        {QUAL_ICONS[qi.type]}
                        <div>
                          <p className="text-sm font-semibold mb-0.5" style={{ color: TEXT }}>{qi.title}</p>
                          <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{qi.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* ── Expectations ── */}
            {peptide.expectTimeline && peptide.expectTimeline.length > 0 && (
              <section id="sec-expect">
                <Card className="p-5" accentColor={accent}>
                  <SectionTitle title="What to Expect" id="sec-expect" />
                  <div className="space-y-4 pl-4 relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: `${accent}25` }} />
                    {peptide.expectTimeline.map((entry, i) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-2 top-1 w-3 h-3 rounded-full border-2"
                          style={{ background: CARD_BG, borderColor: accent }} />
                        <p className="section-label mb-0.5" style={{ color: accent }}>{entry.timeframe}</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{entry.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* ── Side Effects ── */}
            {peptide.sideEffectNotes && peptide.sideEffectNotes.length > 0 && (
              <section id="sec-safety">
                <Card className="p-5" accentColor={accent}>
                  <SectionTitle title="Side Effects & Safety" id="sec-safety" />
                  <div className="space-y-3">
                    {peptide.sideEffectNotes.map((note, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: accent }} />
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{note}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* ── References ── */}
            {peptide.references && peptide.references.length > 0 && (
              <section id="sec-refs">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-2">
                    <SectionTitle title="References" id="sec-refs" />
                  </div>
                  {peptide.references.map((ref, i) => (
                    <div key={i} className="px-5 py-5" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold leading-snug" style={{ color: TEXT }}>{ref.title}</p>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <ExternalLink size={13} style={{ color: accent }} />
                        </a>
                      </div>
                      <p className="text-[11px] font-semibold mb-1.5" style={{ color: accent }}>{ref.context}</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{ref.description}</p>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {/* ── Study Deep-Dives ── */}
            {peptide.studyDeepDives && peptide.studyDeepDives.length > 0 && (
              <section id="sec-deepdives">
                <div className="mb-3">
                  <h2 className="text-base font-bold" style={{ color: TEXT }}>Study Deep-Dives</h2>
                </div>
                <div className="space-y-2">
                  {peptide.studyDeepDives.map((study, i) => (
                    <StudyDeepDiveCard key={i} study={study} accent={accent} defaultOpen={i === 0} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Clinical Trials ── */}
            {peptide.clinicalTrials && peptide.clinicalTrials.length > 0 && (
              <section id="sec-trials">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-2">
                    <SectionTitle title="Clinical Trial Tracker" id="sec-trials" />
                  </div>
                  {peptide.clinicalTrials.map((trial, i) => {
                    const statusCfg = TRIAL_STATUS_CONFIG[trial.status] ?? { color: MUTED2, bg: CARD2 };
                    return (
                      <div key={i} className="px-5 py-5" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
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
            {peptide.regulatoryStatus && peptide.regulatoryStatus.length > 0 && (
              <section id="sec-regulatory">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-4">
                    <SectionTitle title="Regulatory Status" id="sec-regulatory" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {peptide.regulatoryStatus.map((reg, i) => {
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

            {/* ── Development Timeline ── */}
            {peptide.developmentTimeline && peptide.developmentTimeline.length > 0 && (
              <section id="sec-devtimeline">
                <Card className="p-5" accentColor={accent}>
                  <SectionTitle title="Development Timeline" id="sec-devtimeline" />
                  <div className="space-y-3 pl-4 relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: `${accent}25` }} />
                    {peptide.developmentTimeline.map((milestone, i) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-2 top-1.5 w-3 h-3 rounded-full border-2"
                          style={{ background: CARD_BG, borderColor: accent }} />
                        <div className="rounded-lg px-3 py-2.5" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                          <p className="section-label mb-0.5" style={{ color: accent }}>{milestone.year}</p>
                          <p className="text-[13px] leading-snug" style={{ color: MUTED }}>{milestone.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* ── Comparison Table ── */}
            {peptide.comparisonTable && (
              <section id="sec-comparison">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-4">
                    <SectionTitle title="Compound Comparison" id="sec-comparison" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ minWidth: 520 }}>
                      <thead>
                        <tr style={{ background: CARD2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                          {["Compound", "Half-life", "Dose", "Mechanism", "Effectiveness"].map(h => (
                            <th key={h} className="px-5 py-2.5 section-label">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[peptide.comparisonTable.thisCompound, ...peptide.comparisonTable.comparators].map((row, i) => {
                          const isThis = i === 0;
                          return (
                            <tr key={i} style={{
                              background: isThis ? `${accent}06` : CARD_BG,
                              borderBottom: `1px solid ${BORDER}`,
                            }}>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-semibold" style={{ color: isThis ? accent : TEXT }}>
                                  {row.compound}
                                  {isThis && <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${accent}18`, color: accent }}>THIS</span>}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{row.halfLife}</td>
                              <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: MUTED }}>{row.dose}</td>
                              <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{row.mechanism}</td>
                              <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{row.effectiveness}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}

            {/* ── Population Notes ── */}
            {peptide.populationNotes && peptide.populationNotes.length > 0 && (
              <section id="sec-population">
                <Card className="p-5" accentColor={accent}>
                  <SectionTitle title="Population-Specific Notes" id="sec-population" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {peptide.populationNotes.map((note, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ background: CARD2, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${accent}12`, color: accent }}>
                            <Users size={11} />
                          </div>
                          <p className="text-sm font-semibold" style={{ color: TEXT }}>{note.population}</p>
                        </div>
                        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>{note.consideration}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* ── Lab Markers ── */}
            {peptide.labMarkers && peptide.labMarkers.length > 0 && (
              <section id="sec-labmarkers">
                <Card className="overflow-hidden" accentColor={accent}>
                  <div className="px-5 pt-5 pb-2">
                    <SectionTitle title="Lab Markers to Monitor" id="sec-labmarkers" />
                  </div>
                  {peptide.labMarkers.map((marker, i) => (
                    <div key={i} className="px-5 py-5" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: TEXT }}>{marker.marker}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${accent}12`, color: accent }}>{marker.panel}</span>
                        </div>
                        <span className="text-[11px]" style={{ color: MUTED2 }}>{marker.retestFrequency}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {marker.targetRange && (
                          <div>
                            <p className="section-label mb-0.5">Target Range</p>
                            <p className="text-[13px]" style={{ color: MUTED }}>{marker.targetRange}</p>
                          </div>
                        )}
                        {marker.expectedChange && (
                          <div>
                            <p className="section-label mb-0.5">Expected Change</p>
                            <p className="text-[13px]" style={{ color: MUTED }}>{marker.expectedChange}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {/* ── FAQ ── */}
            {peptide.faq && peptide.faq.length > 0 && (
              <section id="sec-faq">
                <Card className="px-5 pt-5 pb-3" accentColor={accent}>
                  <SectionTitle title="Frequently Asked Questions" id="sec-faq" />
                  {peptide.faq.map((item, i) => (
                    <FAQItem key={i} item={item} />
                  ))}
                </Card>
              </section>
            )}

          </div>{/* end main column */}

          {/* ══ Sidebar ══ */}
          <div className="mt-6 md:mt-0">
          <div className="space-y-4 md:sticky md:top-4">

            {/* Order CTA — hidden on mobile (top CTA handles it) */}
            {(hasShopProduct || hasLabTests) && (
              <div className="hidden md:flex flex-col gap-2">
                {hasShopProduct && (
                  <button
                    onClick={() => setLocation(`/shop?peptide=${encodeURIComponent(peptide.name)}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: isDark ? accent : `linear-gradient(90deg, ${accent}, ${lightenHex(accent, 50)})` }}
                  >
                    <ShoppingBag size={15} /> Order {peptide.name}
                  </button>
                )}
                {hasLabTests && (
                  <button
                    onClick={() => setShowLabPopup(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: MUTED }}
                  >
                    <FlaskConical size={14} /> Lab reports
                  </button>
                )}
              </div>
            )}

            {/* Community Poll */}
            <CommunityPoll peptideName={peptide.name} accent={accent} />

            {/* Community Insights */}
            {peptide.slug !== "eloralintide" && <CommunityInsights peptide={peptide} accent={accent} />}

            {/* Research level info */}
            <div className="rounded-xl p-4" style={{ background: levelCfg.bg, border: `1px solid ${levelCfg.color}20` }}>
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

          </div>{/* end sticky wrapper */}
          </div>{/* end sidebar */}

        </div>{/* end two-column grid */}
      </div>

      <AnimatePresence>
        {showLabPopup && peptide && (
          <LabReportPopup
            productName={peptide.name}
            onClose={() => setShowLabPopup(false)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
