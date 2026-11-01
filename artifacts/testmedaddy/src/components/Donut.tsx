import { useId } from "react";
import { usd } from "@/lib/format";
import { cn } from "./ui";

/**
 * Funding donut: how much of the target is received, how much is awaiting confirmation,
 * and how much is still missing. One ring, three segments, the percentage in the middle.
 */
export type FundingSlices = { verified: number; submitted: number; target: number };

const COLORS = { verified: "var(--color-brand)", submitted: "#e0a84a", remaining: "var(--color-line)" };

export function fundingSlices({ verified, submitted, target }: FundingSlices) {
  const t = Math.max(0, target);
  const v = Math.min(Math.max(0, verified), t || verified);
  const s = Math.min(Math.max(0, submitted), Math.max(0, t - v));
  const remaining = Math.max(0, t - v - s);
  const pct = t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0;
  return { verified: v, submitted: s, remaining, target: t, pct, funded: t > 0 && v >= t };
}

export function FundingDonut({ verified, submitted, target, size = 160, stroke = 18, className, showLegend = true, label }: FundingSlices & { size?: number; stroke?: number; className?: string; showLegend?: boolean; label?: string }) {
  const id = useId();
  const d = fundingSlices({ verified, submitted, target });
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = d.target > 0 ? d.target : 1;
  const seg = (value: number) => (value / total) * c;
  const segments = [
    { key: "verified", value: d.verified, color: COLORS.verified, label: "Received" },
    { key: "submitted", value: d.submitted, color: COLORS.submitted, label: "Awaiting confirmation" },
    { key: "remaining", value: d.target > 0 ? d.remaining : 1, color: COLORS.remaining, label: "Still needed" },
  ];
  let offset = 0;
  const title = `${usd(d.verified)} received of ${usd(d.target)} target (${d.pct}%)${d.submitted ? `, ${usd(d.submitted)} awaiting confirmation` : ""}`;
  return (
    <div className={cn("flex items-center gap-5", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={`${id}-t`} className="shrink-0 -rotate-90">
        <title id={`${id}-t`}>{title}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.remaining} strokeWidth={stroke} />
        {segments.filter(s => s.value > 0 && s.key !== "remaining").map(s => {
          const len = seg(s.value);
          const el = <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap={len < c ? "butt" : "round"} style={{ transition: "stroke-dasharray .4s ease, stroke-dashoffset .4s ease" }} />;
          offset += len;
          return el;
        })}
        <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-fg" style={{ fontSize: size * 0.2, fontWeight: 600, letterSpacing: "-0.02em" }}>{d.pct}%</text>
          {label && <text x="50%" y={size / 2 + size * 0.17} textAnchor="middle" className="fill-muted" style={{ fontSize: size * 0.075 }}>{label}</text>}
        </g>
      </svg>
      {showLegend && (
        <dl className="grid gap-2 text-sm">
          {segments.map(s => (
            <div key={s.key} className="flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              <dt className="text-muted">{s.label}</dt>
              <dd className="mono ml-auto pl-4 font-medium">{usd(s.key === "remaining" && d.target === 0 ? 0 : s.value, 0)}</dd>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-2.5 border-t border-line pt-2"><dt className="text-muted">Target</dt><dd className="mono ml-auto pl-4 font-semibold">{usd(d.target, 0)}</dd></div>
        </dl>
      )}
    </div>
  );
}

/** Compact ring for lists: no legend, percentage only. */
export function MiniDonut(props: FundingSlices & { size?: number; className?: string }) {
  return <FundingDonut {...props} size={props.size ?? 44} stroke={6} showLegend={false} className={props.className} />;
}
