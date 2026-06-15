import { ArrowDown, ShieldCheck, FlaskConical, Share2 } from "lucide-react";

// OPPOSITE OF: dense thumbnails optimised for a list of 1000.
// This inversion treats one batch as the entire viewport. Editorial
// typography, generous whitespace, a hero vial illustration, and
// detail panels placed as if on a landing page. The assumption being
// tested: what if each report deserved its own page, not a cell?

export function Dossier() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0B0F14",
        color: "#E6EAF0",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-10 py-5 text-[11px] tracking-[0.22em] uppercase"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Salt &amp; Peps · Lab dossier</span>
        </div>
        <div className="text-slate-500">No. 0319 / Apr 2026</div>
      </div>

      {/* Hero */}
      <div
        className="grid items-center px-10"
        style={{ gridTemplateColumns: "1.2fr 1fr", minHeight: 520 }}
      >
        {/* Left — manifesto */}
        <div className="py-16 pr-10">
          <div className="text-[11px] tracking-[0.3em] uppercase text-teal-300">
            Batch ZE30-0319 · third-party verified
          </div>
          <h1
            className="mt-5 font-semibold tracking-[-0.035em] leading-[0.95]"
            style={{
              fontSize: 96,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Tirzepatide
            <span
              className="block font-light text-slate-400"
              style={{ fontSize: 40, letterSpacing: "-0.02em", marginTop: 8 }}
            >
              10&nbsp;mg · 1 vial · lyophilised
            </span>
          </h1>

          <p className="mt-8 text-[17px] text-slate-300 leading-[1.55] max-w-[520px]">
            One of the cleanest assays we've logged from Uther this year. An
            independent lab — not the supplier — confirmed identity, purity
            and mass on a vial pulled from the same lot members are buying
            this week.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <button
              className="px-5 py-3 rounded-full text-[13px] font-semibold"
              style={{ background: "#14B8A6", color: "#0B0F14" }}
            >
              Download full PDF
            </button>
            <button
              className="px-5 py-3 rounded-full text-[13px] font-semibold flex items-center gap-2"
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#E6EAF0",
              }}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share dossier
            </button>
          </div>
        </div>

        {/* Right — hero vial artwork */}
        <div className="relative flex items-center justify-center h-full py-10">
          {/* Soft radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(20,184,166,0.22), transparent 55%)",
            }}
          />
          <VialArt />
          {/* Assay badge floating */}
          <div
            className="absolute"
            style={{ right: 30, top: 40 }}
          >
            <div className="text-right">
              <div className="text-[10px] tracking-[0.25em] uppercase text-teal-300">
                HPLC purity
              </div>
              <div
                className="font-semibold tracking-[-0.04em] leading-none"
                style={{ fontSize: 80, color: "#FFFFFF", marginTop: 4 }}
              >
                99.89
                <span className="text-teal-300" style={{ fontSize: 36 }}>
                  %
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                spec ≥ 98.0% · conforms
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail strip */}
      <div
        className="grid px-10 py-10"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 32,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Stat label="Identity" value="Tirzepatide" detail="confirmed by MS" />
        <Stat label="Mass per vial" value="10.1 mg" detail="target 10.0 mg" />
        <Stat label="Tested by" value="Janoshik Analytical" detail="indep. third-party" />
        <Stat label="Tested on" value="10 Apr 2026" detail="4 days after release" />
      </div>

      {/* Footer meta + scroll cue */}
      <div
        className="flex items-center justify-between px-10 py-6 text-[11px] text-slate-500"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Method: HPLC-UV · sample pulled from member-bought lot</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span>Scroll for chromatogram &amp; mass trace</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-white">
        {value}
      </div>
      <div className="text-[11px] text-slate-400 mt-1">{detail}</div>
    </div>
  );
}

function VialArt() {
  return (
    <svg width="260" height="380" viewBox="0 0 260 380" className="relative">
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F2A34" />
          <stop offset="1" stopColor="#0B0F14" />
        </linearGradient>
        <linearGradient id="cake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      {/* Cap */}
      <rect x="90" y="30" width="80" height="24" rx="4" fill="#94A3B8" />
      <rect x="92" y="34" width="76" height="4" fill="#64748B" />
      <rect x="95" y="54" width="70" height="10" rx="2" fill="#475569" />
      {/* Neck */}
      <rect x="105" y="64" width="50" height="18" fill="url(#glass)" />
      {/* Shoulder + body */}
      <path
        d="M80,100 Q80,82 105,82 L155,82 Q180,82 180,100 L180,330 Q180,350 160,350 L100,350 Q80,350 80,330 Z"
        fill="url(#glass)"
        stroke="rgba(255,255,255,0.12)"
      />
      {/* Highlight */}
      <path
        d="M95,110 Q90,180 100,320"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2"
        fill="none"
      />
      {/* Lyo cake */}
      <path
        d="M92,232 Q100,215 130,215 Q160,215 168,232 L168,335 Q168,340 160,340 L100,340 Q92,340 92,335 Z"
        fill="url(#cake)"
        opacity="0.95"
      />
      {/* Label */}
      <rect
        x="78"
        y="168"
        width="104"
        height="50"
        rx="2"
        fill="#F8FAFC"
      />
      <text
        x="130"
        y="188"
        textAnchor="middle"
        fill="#0B0F14"
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter"
        letterSpacing="2"
      >
        TIRZEPATIDE
      </text>
      <text
        x="130"
        y="202"
        textAnchor="middle"
        fill="#64748B"
        fontSize="9"
        fontFamily="Inter"
      >
        10 mg · lyophilised
      </text>
      <text
        x="130"
        y="213"
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="7"
        fontFamily="Inter"
        letterSpacing="1"
      >
        LOT ZE30-0319
      </text>
    </svg>
  );
}
