import { useState } from "react";
import {
  Play,
  Download,
  Maximize2,
  MoreHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";

// OPPOSITE OF: curated, passive, single-batch editorial.
// This variant treats the report as a working scientific instrument
// panel. No verdict, no hero typography — the user is the analyst and
// gets raw signals (chromatogram, peak table, overlays) with controls
// to inspect and compare. The design aesthetic is deliberately tool-
// like: monospace, data rows, hover-ables, terminal palette.

type Peak = {
  rt: number;
  area: number;
  pct: number;
  id: string;
  highlighted?: boolean;
};

export function Analyst() {
  const peaks: Peak[] = [
    { rt: 2.41, area: 18422, pct: 0.21, id: "unknown-1" },
    { rt: 3.08, area: 94113, pct: 1.05, id: "impurity-A" },
    { rt: 4.62, area: 8921346, pct: 99.89, id: "tirzepatide", highlighted: true },
    { rt: 5.17, area: 42011, pct: 0.47, id: "unknown-2" },
    { rt: 6.03, area: 15022, pct: 0.17, id: "degradant-B" },
  ];
  const [showOverlay, setShowOverlay] = useState(true);
  const [hoverPeak, setHoverPeak] = useState<string | null>("tirzepatide");

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0D1117",
        color: "#C9D1D9",
        fontFamily:
          "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
      }}
    >
      {/* Top tool bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5 text-[11px]"
        style={{
          background: "#161B22",
          borderBottom: "1px solid #30363D",
        }}
      >
        <div className="flex items-center gap-4">
          <span className="font-semibold text-[#C9D1D9]">
            analyst.sandp.lab
          </span>
          <span className="text-[#8B949E]">
            /batch/ZE30-0319 &gt; tirzepatide-10mg.hplc
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
            style={{ background: "#0F2A1E", color: "#3FB950" }}
          >
            ● LIVE
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#8B949E]">
          <button className="hover:text-white flex items-center gap-1">
            <Play className="w-3 h-3" /> rerun
          </button>
          <button className="hover:text-white flex items-center gap-1">
            <Download className="w-3 h-3" /> export.csv
          </button>
          <button className="hover:text-white">
            <Maximize2 className="w-3 h-3" />
          </button>
          <button className="hover:text-white">
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "220px 1fr 280px",
          minHeight: 520,
        }}
      >
        {/* Left rail — method / inputs */}
        <aside
          className="p-4 text-[11px]"
          style={{ borderRight: "1px solid #30363D" }}
        >
          <SectionLabel>Method</SectionLabel>
          <KV k="technique" v="HPLC-UV" />
          <KV k="column" v="C18 150×4.6" />
          <KV k="flow" v="1.0 ml/min" />
          <KV k="λ" v="214 nm" />
          <KV k="injection" v="10 µl" />
          <KV k="duration" v="8.0 min" />

          <SectionLabel className="mt-5">Sample</SectionLabel>
          <KV k="analyte" v="tirzepatide" />
          <KV k="supplier" v="uther" />
          <KV k="batch" v="ZE30-0319" />
          <KV k="source" v="member-bought" />
          <KV k="lab" v="janoshik" />
          <KV k="run_at" v="2026-04-10T11:42Z" />

          <SectionLabel className="mt-5">Overlays</SectionLabel>
          <label className="flex items-center gap-2 cursor-pointer mt-1.5 text-[#8B949E] hover:text-[#C9D1D9]">
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={e => setShowOverlay(e.target.checked)}
              className="accent-[#58A6FF]"
            />
            <span>prev. batch ZE29-0310</span>
            {showOverlay ? (
              <Eye className="w-3 h-3 ml-auto" />
            ) : (
              <EyeOff className="w-3 h-3 ml-auto" />
            )}
          </label>
          <label className="flex items-center gap-2 cursor-pointer mt-1 text-[#8B949E] hover:text-[#C9D1D9]">
            <input type="checkbox" className="accent-[#58A6FF]" />
            <span>reference std.</span>
            <EyeOff className="w-3 h-3 ml-auto" />
          </label>
        </aside>

        {/* Center — chromatogram canvas */}
        <section className="relative p-5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#8B949E] mb-2">
            <span>chromatogram · absorbance vs time</span>
            <span className="font-mono normal-case tracking-normal">
              y: mAU · x: min
            </span>
          </div>
          <div
            className="relative"
            style={{
              height: 320,
              background:
                "linear-gradient(180deg,#0D1117 0%,#0B0E13 100%)",
              border: "1px solid #30363D",
              borderRadius: 4,
            }}
          >
            <Chromatogram
              peaks={peaks}
              showOverlay={showOverlay}
              hoverPeak={hoverPeak}
              setHoverPeak={setHoverPeak}
            />
          </div>

          {/* Footer status row */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-[#8B949E]">
            <div className="flex items-center gap-4">
              <span>
                peaks: <span className="text-[#C9D1D9]">{peaks.length}</span>
              </span>
              <span>
                s/n: <span className="text-[#C9D1D9]">412:1</span>
              </span>
              <span>
                resolution: <span className="text-[#C9D1D9]">2.8</span>
              </span>
              <span>
                theoretical plates:{" "}
                <span className="text-[#C9D1D9]">18,402</span>
              </span>
            </div>
            <div>
              <span className="text-[#3FB950]">● conforms</span> · spec ≥ 98.00%
            </div>
          </div>
        </section>

        {/* Right rail — peak table */}
        <aside
          className="p-4 text-[11px]"
          style={{ borderLeft: "1px solid #30363D" }}
        >
          <SectionLabel>Peak table</SectionLabel>
          <div
            className="mt-2 grid text-[10px] text-[#8B949E] tracking-wide uppercase"
            style={{
              gridTemplateColumns: "34px 1fr 52px 46px",
              gap: 6,
            }}
          >
            <span>rt</span>
            <span>id</span>
            <span className="text-right">area</span>
            <span className="text-right">%</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {peaks.map(p => {
              const active = hoverPeak === p.id;
              return (
                <button
                  key={p.id}
                  onMouseEnter={() => setHoverPeak(p.id)}
                  onMouseLeave={() => setHoverPeak(null)}
                  className="w-full grid text-left text-[11px] rounded px-1 py-1"
                  style={{
                    gridTemplateColumns: "34px 1fr 52px 46px",
                    gap: 6,
                    background: active ? "#1F2937" : "transparent",
                    color: p.highlighted
                      ? "#58A6FF"
                      : active
                      ? "#C9D1D9"
                      : "#8B949E",
                  }}
                >
                  <span className="tabular-nums">{p.rt.toFixed(2)}</span>
                  <span className="truncate">{p.id}</span>
                  <span className="text-right tabular-nums">
                    {p.area.toLocaleString()}
                  </span>
                  <span className="text-right tabular-nums font-semibold">
                    {p.pct.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>

          <SectionLabel className="mt-5">Identity (MS)</SectionLabel>
          <KV k="[M+H]+" v="4814.2412" />
          <KV k="expected" v="4814.2396" />
          <KV k="Δ ppm" v="0.33" />
          <KV k="match" v="tirzepatide" accent />

          <div
            className="mt-5 p-2 text-[10px]"
            style={{
              background: "#0F2A1E",
              border: "1px solid #1E4432",
              borderRadius: 4,
              color: "#3FB950",
            }}
          >
            assertion: main_peak_pct ≥ 98.00 → <b>true</b>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[9px] tracking-[0.22em] uppercase text-[#8B949E] font-semibold ${className}`}
    >
      {children}
    </div>
  );
}

function KV({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: boolean;
}) {
  return (
    <div
      className="grid mt-1.5"
      style={{
        gridTemplateColumns: "80px 1fr",
        gap: 8,
      }}
    >
      <span className="text-[#8B949E]">{k}</span>
      <span
        className={accent ? "text-[#58A6FF]" : "text-[#C9D1D9]"}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {v}
      </span>
    </div>
  );
}

function Chromatogram({
  peaks,
  showOverlay,
  hoverPeak,
  setHoverPeak,
}: {
  peaks: Peak[];
  showOverlay: boolean;
  hoverPeak: string | null;
  setHoverPeak: (p: string | null) => void;
}) {
  const W = 820;
  const H = 320;
  const xMin = 0;
  const xMax = 8;

  const toX = (rt: number) =>
    ((rt - xMin) / (xMax - xMin)) * (W - 60) + 40;

  // Synthesize a trace as sum of gaussians over the peaks
  const sample = (t: number, overlay = false) => {
    let y = 2;
    for (const p of peaks) {
      const sigma = p.id === "tirzepatide" ? 0.12 : 0.09;
      const amp =
        (p.pct / 100) * (p.id === "tirzepatide" ? 300 : 26) +
        (p.id === "tirzepatide" ? 0 : 8);
      const shift = overlay ? (p.id === "tirzepatide" ? -0.04 : 0) : 0;
      const ampShift = overlay ? 0.92 : 1;
      y +=
        amp *
        ampShift *
        Math.exp(-Math.pow(t - (p.rt + shift), 2) / (2 * sigma * sigma));
    }
    return y;
  };

  const yMax = 310;
  const toY = (v: number) => H - 30 - (v / yMax) * (H - 60);

  const path = (overlay = false) => {
    const pts: string[] = [];
    for (let i = 0; i <= 400; i++) {
      const t = xMin + ((xMax - xMin) * i) / 400;
      const y = sample(t, overlay);
      pts.push(`${i === 0 ? "M" : "L"}${toX(t).toFixed(2)},${toY(y).toFixed(2)}`);
    }
    return pts.join(" ");
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      {/* Gridlines */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = toX(i);
        return (
          <g key={`gx${i}`}>
            <line
              x1={x}
              x2={x}
              y1={10}
              y2={H - 30}
              stroke="#30363D"
              strokeDasharray="2 3"
              strokeWidth="0.5"
            />
            <text
              x={x}
              y={H - 14}
              fill="#6E7681"
              fontSize="9"
              textAnchor="middle"
            >
              {i}
            </text>
          </g>
        );
      })}
      {[0, 60, 120, 180, 240, 300].map(v => (
        <g key={`gy${v}`}>
          <line
            x1={40}
            x2={W - 20}
            y1={toY(v)}
            y2={toY(v)}
            stroke="#30363D"
            strokeDasharray="2 3"
            strokeWidth="0.5"
          />
          <text x={32} y={toY(v) + 3} fill="#6E7681" fontSize="9" textAnchor="end">
            {v}
          </text>
        </g>
      ))}

      {/* Spec threshold line */}
      <line
        x1={40}
        x2={W - 20}
        y1={toY(0) + 2}
        y2={toY(0) + 2}
        stroke="#30363D"
      />

      {/* Overlay trace (previous batch) */}
      {showOverlay && (
        <path
          d={path(true)}
          fill="none"
          stroke="#F85149"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      )}

      {/* Main trace */}
      <path
        d={path(false)}
        fill="none"
        stroke="#58A6FF"
        strokeWidth="1.4"
      />

      {/* Peak labels + hover rings */}
      {peaks.map(p => {
        const x = toX(p.rt);
        const y = toY(sample(p.rt));
        const active = hoverPeak === p.id;
        const isMain = p.highlighted;
        return (
          <g
            key={p.id}
            onMouseEnter={() => setHoverPeak(p.id)}
            onMouseLeave={() => setHoverPeak(null)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x}
              cy={y}
              r={active ? 5 : 3}
              fill={isMain ? "#58A6FF" : "#8B949E"}
              stroke="#0D1117"
              strokeWidth="1.5"
            />
            {(active || isMain) && (
              <>
                <line
                  x1={x}
                  x2={x}
                  y1={y - 8}
                  y2={y - 24}
                  stroke={isMain ? "#58A6FF" : "#8B949E"}
                  strokeWidth="0.6"
                />
                <text
                  x={x}
                  y={y - 28}
                  fill={isMain ? "#58A6FF" : "#C9D1D9"}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.id} · {p.pct.toFixed(2)}%
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${W - 220}, 14)`}>
        <rect width="200" height="36" fill="#161B22" stroke="#30363D" />
        <g transform="translate(10,14)">
          <line x1={0} x2={18} y1={0} y2={0} stroke="#58A6FF" strokeWidth="1.4" />
          <text x={24} y={3} fill="#C9D1D9" fontSize="10">
            ZE30-0319 (this batch)
          </text>
        </g>
        {showOverlay && (
          <g transform="translate(10,28)">
            <line
              x1={0}
              x2={18}
              y1={0}
              y2={0}
              stroke="#F85149"
              strokeOpacity="0.8"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <text x={24} y={3} fill="#8B949E" fontSize="10">
              ZE29-0310 (prev.)
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
