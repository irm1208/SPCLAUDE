import {
  Syringe,
  Beaker,
  Truck,
  Boxes,
  Flag,
  ArrowUpRight,
} from "lucide-react";
import { Shell } from "./Shell";

// Axis: TIME. Treats the hub as a horizontal protocol timeline instead
// of a grid of counts. Past doses are filled nodes, upcoming are empty.
// Blood tests, deliveries, GB cutoffs, and protocol milestones all sit
// on the same line. Counts become annotations derived from the timeline.

type Event = {
  day: number; // 0 = today; negative = past; positive = future
  kind: "dose" | "dose-missed" | "blood" | "delivery" | "gb-cutoff" | "milestone";
  label?: string;
};

export function ProfileHubTimeline() {
  const events: Event[] = [
    { day: -42, kind: "dose" },
    { day: -39, kind: "dose" },
    { day: -35, kind: "blood", label: "Last panel" },
    { day: -32, kind: "dose" },
    { day: -28, kind: "dose-missed", label: "Missed" },
    { day: -25, kind: "dose" },
    { day: -21, kind: "dose" },
    { day: -18, kind: "dose" },
    { day: -14, kind: "delivery", label: "Order #1179" },
    { day: -11, kind: "dose" },
    { day: -7, kind: "dose" },
    { day: -4, kind: "dose" },
    { day: -2, kind: "delivery", label: "Order #1182" },
    { day: 0, kind: "dose", label: "Today" },
    { day: 3, kind: "dose" },
    { day: 4, kind: "gb-cutoff", label: "Tirz GB closes" },
    { day: 7, kind: "dose" },
    { day: 10, kind: "blood", label: "Re-test due" },
    { day: 11, kind: "dose" },
    { day: 14, kind: "dose" },
    { day: 18, kind: "dose" },
    { day: 21, kind: "milestone", label: "Wk 12 · end of block" },
  ];

  return (
    <Shell>
      <section className="px-6 pb-6 flex flex-col gap-5">
        {/* Protocol summary strip */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400">
                Current protocol
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <h2
                  className="font-semibold tracking-tight text-slate-900"
                  style={{ fontSize: 24 }}
                >
                  Semaglutide · 2.5 mg
                </h2>
                <span className="text-[13px] text-slate-500">
                  Tuesday / Saturday schedule
                </span>
              </div>
              <div className="mt-1 text-[12px] text-slate-500">
                Started <b className="text-slate-700">19 Feb 2026</b> · 56 days
                in · <b style={{ color: "#2E5BFF" }}>week 8 of 12</b>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div
                className="text-[11px] font-semibold"
                style={{ color: "#047857" }}
              >
                ● on track · 88% adherence
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                21 of 24 scheduled doses
              </div>
            </div>
          </div>

          {/* Week progress bar */}
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const past = i < 8;
              const now = i === 7;
              return (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full relative"
                  style={{
                    background: past ? "#2E5BFF" : "#E5E7EB",
                  }}
                >
                  {now && (
                    <div
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white"
                      style={{ background: "#2E5BFF" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>wk 1</span>
            <span className="text-[#2E5BFF] font-semibold">wk 8 · today</span>
            <span>wk 12</span>
          </div>
        </div>

        {/* Timeline card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400">
              Timeline · 6 weeks either side
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <LegendDot color="#2E5BFF" label="dose" />
              <LegendDot color="#B45309" label="blood" />
              <LegendDot color="#047857" label="delivery" />
              <LegendDot color="#8B5CF6" label="GB" />
              <LegendDot color="#0F172A" label="milestone" />
            </div>
          </div>

          <TimelineTrack events={events} />

          {/* Up next list */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid #F1F5F9" }}>
            <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400 mb-2">
              Up next
            </div>
            <ul className="divide-y divide-slate-100">
              <UpNext
                icon={<Syringe className="w-3.5 h-3.5" />}
                color="#2E5BFF"
                title="Log today's dose"
                meta="2.5 mg semaglutide · overdue by 3h"
                when="today"
              />
              <UpNext
                icon={<Boxes className="w-3.5 h-3.5" />}
                color="#8B5CF6"
                title="Tirzepatide GB closes"
                meta="Uther · 47 members · you're in"
                when="in 4 days"
              />
              <UpNext
                icon={<Beaker className="w-3.5 h-3.5" />}
                color="#B45309"
                title="Blood panel re-test"
                meta="HbA1c + fasting glucose · home kit"
                when="in 10 days"
              />
            </ul>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function TimelineTrack({ events }: { events: Event[] }) {
  const minDay = -42;
  const maxDay = 21;
  const pct = (d: number) => ((d - minDay) / (maxDay - minDay)) * 100;
  const todayPct = pct(0);

  return (
    <div className="relative mt-6 pb-10">
      {/* Axis */}
      <div
        className="absolute left-0 right-0 top-[58px] h-px"
        style={{ background: "#E5E7EB" }}
      />
      {/* Past shading */}
      <div
        className="absolute top-[46px] h-6 rounded-sm"
        style={{
          left: 0,
          width: `${todayPct}%`,
          background:
            "linear-gradient(90deg, rgba(46,91,255,0.04), rgba(46,91,255,0.10))",
        }}
      />
      {/* Today line */}
      <div
        className="absolute top-[34px] bottom-[8px]"
        style={{
          left: `${todayPct}%`,
          width: 2,
          background: "#2E5BFF",
          transform: "translateX(-1px)",
        }}
      />
      <div
        className="absolute text-[9px] font-semibold uppercase tracking-[0.18em]"
        style={{
          left: `${todayPct}%`,
          top: 0,
          transform: "translateX(-50%)",
          color: "#2E5BFF",
        }}
      >
        Today
      </div>

      {/* Week gridlines */}
      {[-6, -4, -2, 0, 2].map(w => (
        <div
          key={w}
          className="absolute"
          style={{
            left: `${pct(w * 7)}%`,
            top: 52,
            bottom: 10,
            width: 1,
            background: "#F1F5F9",
          }}
        />
      ))}
      {[-6, -4, -2, 2].map(w => (
        <div
          key={`lbl${w}`}
          className="absolute text-[10px] text-slate-400 font-mono"
          style={{
            left: `${pct(w * 7)}%`,
            bottom: -2,
            transform: "translateX(-50%)",
          }}
        >
          wk {8 + w}
        </div>
      ))}

      {/* Events */}
      {events.map((e, i) => (
        <EventNode key={i} e={e} left={pct(e.day)} />
      ))}
    </div>
  );
}

function EventNode({ e, left }: { e: Event; left: number }) {
  const colors: Record<Event["kind"], string> = {
    dose: "#2E5BFF",
    "dose-missed": "#EF4444",
    blood: "#B45309",
    delivery: "#047857",
    "gb-cutoff": "#8B5CF6",
    milestone: "#0F172A",
  };
  const color = colors[e.kind];
  const isFuture = e.day > 0;
  const isToday = e.day === 0;
  const big = ["blood", "delivery", "gb-cutoff", "milestone"].includes(e.kind);

  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: 50,
        transform: "translateX(-50%)",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: big ? 12 : 8,
          height: big ? 12 : 8,
          background: isFuture ? "#FFFFFF" : color,
          border: `${isFuture || isToday ? 2 : 1.5}px solid ${color}`,
          boxShadow: isToday
            ? "0 0 0 4px rgba(46,91,255,0.15)"
            : "0 0 0 2px #fff",
        }}
      />
      {e.label && big && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold tracking-wide"
          style={{
            color,
            [e.kind === "milestone" || e.kind === "gb-cutoff"
              ? "bottom"
              : "top"]: 18,
          }}
        >
          {e.label}
        </div>
      )}
    </div>
  );
}

function UpNext({
  icon,
  color,
  title,
  meta,
  when,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  meta: string;
  when: string;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}14`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-slate-900 leading-tight">
          {title}
        </div>
        <div className="text-[11px] text-slate-500">{meta}</div>
      </div>
      <div className="text-[11px] font-semibold tabular-nums" style={{ color }}>
        {when}
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
    </li>
  );
}

// keep icon imports warm
void Truck;
void Flag;
