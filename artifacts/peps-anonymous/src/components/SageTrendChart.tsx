import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceArea, ReferenceLine,
} from "recharts";
import type { DiscussChart } from "@/hooks/use-blood-tests";

const BLUE = "#2D6BCC";

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

/** Compact inline trend chart for a single biomarker, used in Sage chat bubbles (SageChat + DiscussView). */
export function SageTrendChart({ chart }: { chart: DiscussChart }) {
  const points = chart.points;
  if (!points || points.length < 2) return null;

  const data = points.map((p) => ({ date: formatShortDate(p.date), rawDate: p.date, value: p.value }));
  const values = points.map((p) => p.value);
  const refLow = chart.refRangeLow;
  const refHigh = chart.refRangeHigh;
  const maxVal = Math.max(...values);
  const domainMin = 0;
  const hi = refHigh ?? maxVal * 1.2;
  const displayMax = Math.max(hi * 1.35, maxVal > hi ? maxVal * 1.15 : hi * 1.2);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)", background: "var(--t-panel, #fff)" }}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>{chart.marker}</span>
        <span className="text-[10px] font-medium" style={{ color: "var(--t-subtle)" }}>{chart.unit}</span>
      </div>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: -18 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--t-subtle)" }} tickLine={false} axisLine={false} />
            <YAxis domain={[domainMin, displayMax]} tick={{ fontSize: 9, fill: "var(--t-subtle)" }} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", padding: "4px 10px" }}
              formatter={(v: number) => [`${v} ${chart.unit}`, ""]}
              labelStyle={{ color: "#64748b", fontWeight: 600 }}
            />
            {refLow != null && refHigh != null && (
              <ReferenceArea y1={refLow} y2={refHigh} fill="rgba(74,222,128,0.12)" fillOpacity={1} />
            )}
            {refHigh != null && (
              <ReferenceLine y={refHigh} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" strokeWidth={1} />
            )}
            {refLow != null && (
              <ReferenceLine y={refLow} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" strokeWidth={1} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={BLUE}
              strokeWidth={2.5}
              dot={(props: { cx?: number; cy?: number; payload?: { value: number } }) => {
                const { cx, cy, payload } = props;
                const val = payload?.value ?? 0;
                const inRange = refLow != null && refHigh != null ? val >= refLow && val <= refHigh : null;
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill={inRange === false ? "#DC2626" : BLUE} stroke="#fff" strokeWidth={1.5} />;
              }}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
