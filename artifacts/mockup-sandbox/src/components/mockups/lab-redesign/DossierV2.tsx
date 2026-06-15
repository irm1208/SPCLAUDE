import { ArrowDown, ShieldCheck, Download, Share2 } from "lucide-react";

// Refinement of Dossier. Keeps full-viewport editorial hypothesis; fixes:
// - single hero: the compound name owns the left column; purity becomes
//   part of a measured caption row below, not a competing floating block
// - numeric scale is disciplined — one dominant display size, one
//   caption size; everything else aligns to the baseline
// - vial art refined: softer gradient, grounded by a drop shadow,
//   set against a subtle chromatogram baseline instead of a generic glow
// - top bar and bottom bar use the same rhythm so the page feels framed

export function DossierV2() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0A0D12",
        color: "#E6EAF0",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top frame */}
      <div
        className="flex items-center justify-between px-12 py-5 text-[10px] tracking-[0.3em] uppercase text-slate-500"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          <span>Salt &amp; Peps · Lab dossier</span>
        </div>
        <div>No. 0319 — Apr 2026</div>
      </div>

      {/* Hero */}
      <div
        className="relative grid items-end px-12"
        style={{
          gridTemplateColumns: "1fr 520px",
          minHeight: 520,
          gap: 48,
        }}
      >
        {/* Chromatogram baseline — subtle, contextual texture */}
        <Chromatogram />

        {/* Left — compound as single hero */}
        <div className="pt-24 pb-14 relative z-10">
          <div className="text-[10px] tracking-[0.3em] uppercase text-teal-300/90">
            Batch ZE30-0319 · third-party verified
          </div>
          <h1
            className="mt-6 font-semibold tracking-[-0.04em] leading-[0.92] text-white"
            style={{ fontSize: 112 }}
          >
            Tirzepatide
          </h1>
          <div
            className="mt-2 text-[22px] font-light tracking-[-0.015em] text-slate-400"
          >
            10&nbsp;mg · lyophilised · 1&nbsp;vial
          </div>

          <p className="mt-10 text-[16px] leading-[1.6] text-slate-300 max-w-[520px]">
            One of the cleanest assays we've logged from Uther this year.
            An independent lab verified identity, purity and mass on a vial
            pulled from the same lot members are buying this week.
          </p>
        </div>

        {/* Right — hero vial, grounded */}
        <div className="relative pb-14 flex items-end justify-center">
          <VialArt />
        </div>
      </div>

      {/* Caption row — disciplined measurement grid. Purity lives here. */}
      <div
        className="grid px-12 py-8"
        style={{
          gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1fr",
          gap: 40,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Measure label="HPLC purity" value="99.89%" detail="spec ≥ 98.0% · conforms" accent />
        <Measure label="Mass / vial" value="10.1 mg" detail="target 10.0 mg" />
        <Measure label="Identity" value="Confirmed" detail="by mass spectrometry" />
        <Measure label="Tested by" value="Janoshik" detail="independent · HPLC-UV" />
        <Measure label="Tested on" value="10 Apr 2026" detail="4 days after release" />
      </div>

      {/* Bottom frame — mirrors top */}
      <div
        className="flex items-center justify-between px-12 py-5 text-[10px] tracking-[0.3em] uppercase text-slate-500"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-1.5 text-teal-300">
            <Download className="w-3 h-3" />
            <span>Download PDF</span>
          </button>
          <button className="flex items-center gap-1.5">
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>
        </div>
        <div className="flex items-center gap-2 text-slate-400 normal-case tracking-normal text-[11px]">
          <span>Scroll for chromatogram &amp; mass trace</span>
          <ArrowDown className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

function Measure({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.3em] uppercase text-slate-500">
        {label}
      </div>
      <div
        className="mt-2 font-semibold tracking-[-0.02em] tabular-nums"
        style={{
          fontSize: 28,
          color: accent ? "#5EEAD4" : "#FFFFFF",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-1.5">{detail}</div>
    </div>
  );
}

function Chromatogram() {
  // Faint chromatogram silhouette as hero backdrop. Honors the lab
  // context without being loud; sits behind the type at low opacity.
  return (
    <svg
      className="absolute inset-x-0 bottom-0 pointer-events-none"
      style={{ height: 220, width: "100%" }}
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="trace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14B8A6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,210 L80,208 L160,206 L220,200 L260,205 L300,204 L340,202
           L380,198 L420,205 L450,208 L470,206
           L500,205 L520,200 L540,180 L560,120 L580,30 L600,10 L620,30
           L640,120 L660,180 L680,200 L700,205
           L740,208 L780,205 L820,208 L860,210 L900,206 L940,208
           L980,205 L1020,208 L1060,210 L1100,208 L1140,210 L1200,210
           L1200,220 L0,220 Z"
        fill="url(#trace)"
      />
      <path
        d="M0,210 L80,208 L160,206 L220,200 L260,205 L300,204 L340,202
           L380,198 L420,205 L450,208 L470,206
           L500,205 L520,200 L540,180 L560,120 L580,30 L600,10 L620,30
           L640,120 L660,180 L680,200 L700,205
           L740,208 L780,205 L820,208 L860,210 L900,206 L940,208
           L980,205 L1020,208 L1060,210 L1100,208 L1140,210 L1200,210"
        fill="none"
        stroke="#14B8A6"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
    </svg>
  );
}

function VialArt() {
  return (
    <svg width="300" height="440" viewBox="0 0 300 440">
      <defs>
        <linearGradient id="glass2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1A232C" />
          <stop offset="0.5" stopColor="#2A3744" />
          <stop offset="1" stopColor="#0F161C" />
        </linearGradient>
        <linearGradient id="cake2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#B8C2CC" />
        </linearGradient>
        <radialGradient id="ground" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#14B8A6" stopOpacity="0.18" />
          <stop offset="1" stopColor="#14B8A6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="150" cy="410" rx="110" ry="14" fill="#000" opacity="0.5" />
      <ellipse cx="150" cy="410" rx="140" ry="20" fill="url(#ground)" />

      {/* Cap stack */}
      <rect x="105" y="30" width="90" height="6" rx="2" fill="#CBD5E1" />
      <rect x="100" y="36" width="100" height="28" rx="4" fill="#94A3B8" />
      <rect x="103" y="40" width="94" height="3" fill="#64748B" />
      <rect x="103" y="46" width="94" height="3" fill="#64748B" />
      <rect x="103" y="52" width="94" height="3" fill="#64748B" />
      <rect x="110" y="64" width="80" height="12" rx="2" fill="#475569" />

      {/* Neck */}
      <rect x="122" y="76" width="56" height="18" fill="url(#glass2)" />

      {/* Shoulder + body */}
      <path
        d="M90,114 Q90,94 118,94 L182,94 Q210,94 210,114 L210,380 Q210,402 186,402 L114,402 Q90,402 90,380 Z"
        fill="url(#glass2)"
        stroke="rgba(255,255,255,0.1)"
      />

      {/* Inner highlight */}
      <path
        d="M104,120 Q98,200 108,370"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M198,120 Q204,220 196,370"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="3"
        fill="none"
      />

      {/* Lyophilised cake */}
      <path
        d="M102,262 Q112,244 150,244 Q188,244 198,262 L198,388 Q198,394 188,394 L112,394 Q102,394 102,388 Z"
        fill="url(#cake2)"
      />

      {/* Label */}
      <rect x="86" y="180" width="128" height="62" rx="2" fill="#F8FAFC" />
      <rect x="86" y="180" width="128" height="6" fill="#0F172A" />
      <text
        x="150"
        y="204"
        textAnchor="middle"
        fill="#0F172A"
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter"
        letterSpacing="2.5"
      >
        TIRZEPATIDE
      </text>
      <text
        x="150"
        y="219"
        textAnchor="middle"
        fill="#64748B"
        fontSize="9"
        fontFamily="Inter"
      >
        10 mg · lyophilised
      </text>
      <text
        x="150"
        y="233"
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="7"
        fontFamily="Inter"
        letterSpacing="1.5"
      >
        LOT ZE30-0319
      </text>
    </svg>
  );
}
