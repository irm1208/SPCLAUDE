import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { Shell } from "./Shell";

// Axis: TIME. A literal month calendar where dose days, blood tests,
// deliveries, and GB cutoffs are plotted as colored dots. The "12
// orders / 3 active GBs" counts become legend subtotals derived from
// the calendar, not heroes. Treats the hub as a schedule.

type Kind = "dose" | "missed" | "blood" | "delivery" | "gb" | "milestone";
type Event = { day: number; kind: Kind; label?: string };

export function ProfileHubCalendar() {
  // April 2026 — 30 days, starts on Wednesday
  const monthStartsOn = 3; // Wed (Sun=0)
  const days = 30;
  const today = 16;

  const events: Event[] = [
    { day: 1, kind: "dose" },
    { day: 4, kind: "dose" },
    { day: 6, kind: "delivery", label: "#1179" },
    { day: 7, kind: "dose" },
    { day: 11, kind: "dose" },
    { day: 11, kind: "missed" },
    { day: 14, kind: "dose" },
    { day: 14, kind: "delivery", label: "#1182" },
    { day: 16, kind: "dose", label: "today" }, // today, dose due
    { day: 18, kind: "dose" },
    { day: 20, kind: "gb", label: "Tirz GB" },
    { day: 21, kind: "dose" },
    { day: 25, kind: "dose" },
    { day: 26, kind: "blood", label: "re-test" },
    { day: 28, kind: "dose" },
  ];

  const dotColors: Record<Kind, string> = {
    dose: "#2E5BFF",
    missed: "#EF4444",
    blood: "#B45309",
    delivery: "#047857",
    gb: "#8B5CF6",
    milestone: "#0F172A",
  };

  const cells = Array.from({ length: monthStartsOn + days }).map((_, i) => {
    if (i < monthStartsOn) return null;
    const day = i - monthStartsOn + 1;
    return day;
  });

  // Pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = events.reduce<Record<number, Event[]>>((acc, e) => {
    acc[e.day] = acc[e.day] ? [...acc[e.day], e] : [e];
    return acc;
  }, {});

  const counts = {
    dose: events.filter(e => e.kind === "dose").length,
    delivery: events.filter(e => e.kind === "delivery").length,
    gb: events.filter(e => e.kind === "gb").length,
    blood: events.filter(e => e.kind === "blood").length,
  };

  return (
    <Shell>
      <section className="px-6 pb-6 grid gap-5" style={{
        gridTemplateColumns: "1.7fr 1fr",
      }}>
        {/* Calendar */}
        <div
          className="rounded-2xl p-5 flex flex-col"
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400">
                April 2026
              </div>
              <h2
                className="mt-1 font-semibold tracking-tight text-slate-900"
                style={{ fontSize: 22 }}
              >
                Your month
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                className="px-3 h-8 rounded-lg text-[11px] font-semibold"
                style={{ background: "#0F172A", color: "#fff" }}
              >
                Today
              </button>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div
            className="mt-4 grid text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-400"
            style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="mt-1 grid"
            style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 6, flex: 1 }}
          >
            {cells.map((d, i) => {
              if (d === null)
                return (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{ background: "#FAFBFC", minHeight: 56 }}
                  />
                );
              const es = eventsByDay[d] ?? [];
              const isToday = d === today;
              const isPast = d < today;

              return (
                <div
                  key={i}
                  className="relative rounded-lg p-1.5 flex flex-col"
                  style={{
                    background: isToday ? "#EFF4FF" : "#FFFFFF",
                    border: isToday
                      ? "1.5px solid #2E5BFF"
                      : "1px solid #F1F5F9",
                    minHeight: 56,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: isToday
                          ? "#2E5BFF"
                          : isPast
                          ? "#CBD5E1"
                          : "#0F172A",
                      }}
                    >
                      {d}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1">
                    {es.map((e, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-0.5 text-[9px] font-semibold leading-none"
                        style={{ color: dotColors[e.kind] }}
                      >
                        <span
                          className="rounded-full"
                          style={{
                            width: 6,
                            height: 6,
                            background: isPast
                              ? dotColors[e.kind]
                              : "#FFFFFF",
                            border: isPast
                              ? undefined
                              : `1.5px solid ${dotColors[e.kind]}`,
                          }}
                        />
                        {e.label && (
                          <span
                            className="truncate"
                            style={{ maxWidth: 52 }}
                            title={e.label}
                          >
                            {e.label}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column — legend + derived counts + today focus */}
        <aside className="flex flex-col gap-5">
          {/* Today */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "#EFF4FF",
              border: "1px solid #C7D7FF",
            }}
          >
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[#2E5BFF]">
              Today · 16 April
            </div>
            <div className="mt-2 text-[15px] font-semibold text-slate-900 leading-snug">
              One dose due this evening. No other events scheduled.
            </div>
            <button
              className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-semibold"
              style={{ background: "#0F172A", color: "#fff" }}
            >
              <span>Log today's dose</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legend + derived counts */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              This month, so far
            </div>
            <ul className="mt-3 space-y-2">
              <LegendRow color="#2E5BFF" label="Doses scheduled" count={counts.dose} />
              <LegendRow color="#EF4444" label="Missed" count={1} />
              <LegendRow color="#047857" label="Deliveries" count={counts.delivery} />
              <LegendRow color="#8B5CF6" label="GB cutoffs" count={counts.gb} />
              <LegendRow color="#B45309" label="Blood tests" count={counts.blood} />
            </ul>
            <div
              className="mt-4 pt-3 text-[11px] text-slate-500"
              style={{ borderTop: "1px dashed #E5E7EB" }}
            >
              All-time · <b className="text-slate-900">12 orders</b> ·{" "}
              <b className="text-slate-900">3 active GBs</b>
            </div>
          </div>

          {/* Upcoming within 2 weeks */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              Next 14 days
            </div>
            <ul className="mt-2 divide-y divide-slate-100">
              <Upcoming color="#8B5CF6" day="Mon 20" title="Tirzepatide GB closes" />
              <Upcoming color="#B45309" day="Sun 26" title="Blood panel re-test" />
              <Upcoming color="#2E5BFF" day="Tue 28" title="Next scheduled dose" />
            </ul>
          </div>
        </aside>
      </section>
    </Shell>
  );
}

function LegendRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-[12px] text-slate-600 flex-1 truncate">
        {label}
      </span>
      <span
        className="text-[13px] font-semibold tabular-nums"
        style={{ color: "#0F172A" }}
      >
        {count}
      </span>
    </li>
  );
}

function Upcoming({
  color,
  day,
  title,
}: {
  color: string;
  day: string;
  title: string;
}) {
  return (
    <li className="flex items-center gap-2.5 py-2">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-[11px] font-mono text-slate-500 w-14 shrink-0">
        {day}
      </span>
      <span className="text-[12px] text-slate-800 truncate flex-1">
        {title}
      </span>
    </li>
  );
}
