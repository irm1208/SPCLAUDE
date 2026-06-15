import React, { useState, useMemo, useRef } from "react";
import { Activity } from "lucide-react";
import { T } from "@/lib/theme";

const CARD: React.CSSProperties = {
  background: T.surface,
  border: "1px solid var(--t-border)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const DIVIDER: React.CSSProperties = { borderColor: "var(--t-border)" };

const SPLIT_OPTIONS = [
  { key: "single", label: "Single" },
  { key: "24",     label: "Daily"  },
  { key: "12",     label: "2×/day" },
  { key: "8",      label: "3×/day" },
  { key: "48",     label: "EOD"    },
  { key: "168",    label: "Weekly" },
  { key: "custom", label: "Custom" },
] as const;

function niceStep(rough: number): number {
  const c = [0.25, 0.5, 1, 2, 4, 6, 12, 24, 48, 72, 168, 336];
  return c.find(v => v >= rough) ?? 336;
}

export function PharmaPlot({ halfLifeH, tPeakH, color, name, compact = false }: {
  halfLifeH: number; tPeakH: number; color: string; name: string; compact?: boolean;
}) {
  const [splitKey, setSplitKey] = useState<string>("single");
  const [customH, setCustomH] = useState(() => Math.max(4, Math.round(halfLifeH)));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const intervalH = splitKey === "single" ? 0
    : splitKey === "custom" ? customH
    : parseInt(splitKey, 10);

  const ke = Math.log(2) / halfLifeH;
  const ka = 4 / Math.max(tPeakH, 0.01);
  const N = 400;

  const { tEnd, cumPts, doseCurves } = useMemo(() => {
    const singleC = (u: number) => u >= 0 ? Math.max(0, Math.exp(-ke * u) - Math.exp(-ka * u)) : 0;

    if (splitKey === "single") {
      const tEnd = tPeakH + 4.5 * halfLifeH;
      const raw = Array.from({ length: N + 1 }, (_, i) => singleC((i / N) * tEnd));
      const mx = Math.max(...raw, 1e-6);
      return {
        tEnd,
        cumPts: raw.map((c, i) => ({ t: (i / N) * tEnd, c: c / mx })),
        doseCurves: [] as { t: number; c: number }[][],
      };
    }

    const numDoses = Math.min(Math.ceil((5.5 * halfLifeH) / intervalH) + 1, 12);
    const tEnd = intervalH * numDoses;
    const raw = new Array(N + 1).fill(0);
    const doseCurves: { t: number; c: number }[][] = [];

    for (let d = 0; d < numDoses; d++) {
      const start = d * intervalH;
      const curve: { t: number; c: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * tEnd;
        const c = singleC(t - start);
        raw[i] += c;
        curve.push({ t, c });
      }
      doseCurves.push(curve);
    }

    const mx = Math.max(...raw, 1e-6);
    return {
      tEnd,
      cumPts: raw.map((c, i) => ({ t: (i / N) * tEnd, c: c / mx })),
      doseCurves: doseCurves.map(curve => curve.map(p => ({ t: p.t, c: p.c / mx }))),
    };
  }, [halfLifeH, tPeakH, splitKey, intervalH, ke, ka]);

  const W = 320, H = 170;
  const PL = 38, PR = 16, PT = 22, PB = 36;
  const cW = W - PL - PR, cH = H - PT - PB;

  const toX = (t: number) => PL + (t / tEnd) * cW;
  const toY = (c: number) => PT + (1 - c) * cH;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const svgX = frac * W;
    const t = ((svgX - PL) / cW) * tEnd;
    if (t >= 0 && t <= tEnd) {
      setHoverIdx(Math.max(0, Math.min(N, Math.round((t / tEnd) * N))));
    } else {
      setHoverIdx(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || !e.touches[0]) return;
    const rect = svgRef.current.getBoundingClientRect();
    const frac = (e.touches[0].clientX - rect.left) / rect.width;
    const svgX = frac * W;
    const t = ((svgX - PL) / cW) * tEnd;
    if (t >= 0 && t <= tEnd) {
      setHoverIdx(Math.max(0, Math.min(N, Math.round((t / tEnd) * N))));
    } else {
      setHoverIdx(null);
    }
  };

  const hoverPt = hoverIdx !== null ? cumPts[hoverIdx] ?? null : null;

  const pathD = cumPts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.c).toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${toX(tEnd).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z`;
  const gradId = `pkgrad-${name.replace(/\W/g, "")}`;

  const inDays = tEnd >= 72;
  const unit = inDays ? 24 : 1;
  const step = niceStep((tEnd / unit) / 5);
  const xTicks: { t: number; label: string }[] = [];
  for (let v = 0; v * unit <= tEnd + step * unit * 0.5; v += step) {
    if (v * unit <= tEnd) xTicks.push({ t: v * unit, label: inDays ? `${v}d` : `${v}h` });
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const hlMarks = splitKey === "single"
    ? [1, 2, 3, 4]
        .map(n => ({ t: tPeakH + n * halfLifeH, c: Math.pow(0.5, n), n }))
        .filter(m => m.t < tEnd * 0.97)
    : [];

  const fmtHL = halfLifeH >= 24
    ? `${(halfLifeH / 24).toFixed(halfLifeH % 24 === 0 ? 0 : 1)}d`
    : halfLifeH >= 1 ? `${halfLifeH}h` : `${Math.round(halfLifeH * 60)}m`;
  const fmtPeak = tPeakH >= 1 ? `${tPeakH}h` : `${Math.round(tPeakH * 60)}m`;

  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={DIVIDER}>
        <Activity className="w-4 h-4 shrink-0" style={{ color }} />
        <span className="text-sm font-bold text-slate-700">Plasma Profile</span>
        <div className="flex gap-3 text-xs text-slate-500 ml-2">
          <span>Peak <span className="font-semibold text-slate-700">{fmtPeak}</span></span>
          <span>t½ <span className="font-semibold text-slate-700">{fmtHL}</span></span>
        </div>
      </div>

      {!compact && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Dosing</span>
            {SPLIT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSplitKey(opt.key)}
                className="h-6 px-2.5 rounded-full text-[10px] font-semibold border transition-all"
                style={splitKey === opt.key
                  ? { background: color, color: "white", borderColor: color }
                  : { background: T.surface2, color: "var(--t-subtle)", borderColor: "var(--t-border)" }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {splitKey === "custom" && (
            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-[10px] text-slate-500 shrink-0 w-12">Interval</span>
              <input
                type="range"
                min="4" max="168" step="4"
                value={customH}
                onChange={e => setCustomH(Number(e.target.value))}
                className="flex-1 h-1 rounded-full"
                style={{ accentColor: color }}
              />
              <span
                className="text-[10px] font-bold w-10 text-right rounded-md px-1.5 py-0.5"
                style={{ color, background: `${color}15` }}
              >
                {customH >= 24 ? `${(customH / 24).toFixed(customH % 24 === 0 ? 0 : 1)}d` : `${customH}h`}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="px-3 pt-1 pb-3" style={compact ? { maxHeight: 110, overflow: "hidden" } : undefined}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ overflow: "visible", cursor: "crosshair", touchAction: "none" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.20" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yTicks.map(y => (
            <g key={y}>
              <line x1={PL} y1={toY(y)} x2={PL + cW} y2={toY(y)}
                stroke="var(--t-border)" strokeWidth="1"
                strokeDasharray={y === 0 ? "none" : "3,3"} />
              <text x={PL - 4} y={toY(y) + 4} textAnchor="end" fontSize="9" style={{ fill: "var(--t-subtle)" }}>
                {y === 0 ? "" : y === 1 ? "100%" : `${y * 100}%`}
              </text>
            </g>
          ))}

          {doseCurves.map((curve, di) => {
            const d = curve.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.c).toFixed(1)}`).join(" ");
            return (
              <path key={di} d={d} fill="none"
                stroke={color} strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />
            );
          })}

          {doseCurves.map((_, di) => {
            const doseT = di * intervalH;
            if (doseT > tEnd * 1.01) return null;
            return (
              <g key={di}>
                <line x1={toX(doseT)} y1={toY(0)} x2={toX(doseT)} y2={toY(0) - 7}
                  stroke={color} strokeWidth="1.5" strokeOpacity="0.55" />
                <circle cx={toX(doseT)} cy={toY(0) - 7} r="2"
                  fill={color} fillOpacity="0.55" />
              </g>
            );
          })}

          {hlMarks.map(m => (
            <g key={m.n}>
              <line x1={toX(m.t)} y1={PT} x2={toX(m.t)} y2={PT + cH}
                stroke={color} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4,3" />
              <circle cx={toX(m.t)} cy={toY(m.c)} r="2.5" fill={color} fillOpacity="0.65" />
              <text x={toX(m.t)} y={PT - 5} textAnchor="middle" fontSize="8" fill={color} fillOpacity="0.75">
                t½×{m.n}
              </text>
            </g>
          ))}

          <path d={fillD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />

          {splitKey === "single" && (
            <>
              <circle cx={toX(tPeakH)} cy={toY(1)} r="4" fill={color} />
              <text x={toX(tPeakH) + 6} y={toY(1) - 4} fontSize="9" fill={color} fontWeight="bold">Peak</text>
            </>
          )}

          <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} style={{ stroke: "var(--t-border)" }} strokeWidth="1" />

          {xTicks.map(tick => (
            <text key={tick.t} x={toX(tick.t)} y={PT + cH + 14}
              textAnchor="middle" fontSize="9" style={{ fill: "var(--t-subtle)" }}>
              {tick.label}
            </text>
          ))}

          <text x={PL + cW / 2} y={H - 2} textAnchor="middle" fontSize="8" style={{ fill: "var(--t-subtle)" }}>
            {splitKey === "single" ? "Time after dose" : "Time — steady-state simulation"}
          </text>

          {hoverPt && (
            <g>
              <line x1={toX(hoverPt.t)} y1={PT} x2={toX(hoverPt.t)} y2={PT + cH}
                stroke={color} strokeWidth="1" strokeOpacity="0.45" strokeDasharray="3,2" />
              <circle cx={toX(hoverPt.t)} cy={toY(hoverPt.c)} r="4.5"
                fill={color} stroke="white" strokeWidth="1.5" />
              {(() => {
                const cx = toX(hoverPt.t);
                const cy = toY(hoverPt.c);
                const t = hoverPt.t;
                const tLbl = t >= 24
                  ? `${(t / 24).toFixed(1)}d`
                  : t >= 1 ? `${t.toFixed(1)}h` : `${Math.round(t * 60)}m`;
                const cLbl = `${Math.round(hoverPt.c * 100)}%`;
                const tipW = 56, tipH = 26;
                const tipX = cx > PL + cW * 0.65 ? cx - tipW - 4 : cx + 6;
                const tipY = cy < PT + 32 ? cy + 6 : cy - tipH - 4;
                return (
                  <g>
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="5"
                      fill="rgba(15,23,42,0.88)" />
                    <text x={tipX + tipW / 2} y={tipY + 10} textAnchor="middle"
                      fontSize="8.5" style={{ fill: "var(--t-subtle)" }}>
                      {tLbl}
                    </text>
                    <text x={tipX + tipW / 2} y={tipY + 20} textAnchor="middle"
                      fontSize="9" fontWeight="bold" fill={color}>
                      {cLbl}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>

        {splitKey !== "single" && (
          <div className="flex items-center gap-4 mt-0.5 mb-1">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
              <svg width="20" height="6">
                <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Cumulative
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
              <svg width="20" height="6">
                <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="1"
                  strokeOpacity="0.35" strokeLinecap="round" />
              </svg>
              Each dose
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <line x1="6" y1="0" x2="6" y2="6" stroke={color} strokeWidth="1.5" strokeOpacity="0.55" />
                <circle cx="6" cy="2" r="2" fill={color} fillOpacity="0.55" />
              </svg>
              Injection
            </span>
          </div>
        )}

        <p className="text-[10px] leading-relaxed mt-1 text-slate-400">
          Illustrative steady-state model — not clinical data. Individual response varies.
        </p>
      </div>
    </div>
  );
}
