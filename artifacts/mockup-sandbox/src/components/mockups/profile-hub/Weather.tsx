import { Flame, Clock4, Scale, HeartPulse, Moon } from "lucide-react";
import { Shell } from "./Shell";

// Axis: EMBODIMENT. Instead of scalar counts, render the member as a
// qualitative "weather report" — their body's outlook for today.
// Large mood glyph, next dose as a countdown ring, adherence streak as
// a dial, weight as a 30-day sparkline, energy as a colour band. The
// whole thing speaks in shapes first, numbers second.

export function ProfileHubWeather() {
  return (
    <Shell>
      <section className="px-6 pb-6 flex flex-col gap-4">
        {/* Today's forecast */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #FFF9EB 0%, #FFE9C6 45%, #FFD3A8 100%)",
            border: "1px solid #F6E4BC",
          }}
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-amber-800/70">
                Today's outlook
              </div>
              <h2
                className="mt-2 font-semibold tracking-[-0.015em] leading-[1.05]"
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontSize: 30,
                  color: "#5A3B0A",
                }}
              >
                Steady, with a dose due this evening.
              </h2>
              <div className="mt-2 text-[13px] text-amber-900/75 leading-snug max-w-[420px]">
                Eight weeks into semaglutide · 2.5 mg. Adherence is holding,
                sleep has been good this week, weight trend gentle.
              </div>
            </div>
            <Sun />
          </div>
        </div>

        {/* Ambient metric tiles */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "1.1fr 1fr 1fr" }}
        >
          {/* Next dose — countdown ring */}
          <Tile accent="#2E5BFF" title="Next dose" kicker="in 9h 14m">
            <CountdownRing pct={0.62} label="9h" subtext="14m" />
            <div className="mt-3 text-[11px] text-slate-600">
              <b>2.5 mg semaglutide</b> · Tue schedule · last logged Sat 8:12pm
            </div>
          </Tile>

          {/* Adherence streak */}
          <Tile accent="#047857" title="Adherence" kicker="7-day streak">
            <StreakDots count={7} missed={1} />
            <div className="mt-3 text-[11px] text-slate-600">
              <b>21 of 24</b> scheduled doses · missed on day 18
            </div>
          </Tile>

          {/* Weight trend */}
          <Tile accent="#8B5CF6" title="Weight" kicker="−2.3 kg / 30d">
            <Sparkline values={[101.2,101.0,100.6,100.3,99.9,99.8,99.5,99.3,99.1,99.0,98.8,98.7,98.5,98.3,98.1,97.9,97.7,97.5,97.4,97.2,97.0,96.9,96.8,96.6,96.4,96.3,96.1,95.9,95.8,95.7]} />
            <div className="mt-3 text-[11px] text-slate-600">
              <b>95.7 kg</b> today · trending into your target band
            </div>
          </Tile>
        </div>

        {/* Mood / energy band + next blood + supply */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400">
              Last 14 days · how you felt
            </div>
            <div className="text-[11px] text-slate-500">
              avg energy <b className="text-slate-900">7.1/10</b>
            </div>
          </div>
          <EnergyBand
            values={[5,6,6,5,6,7,7,8,7,7,8,8,7,7]}
          />

          <div
            className="mt-5 pt-4 grid gap-4"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              borderTop: "1px solid #F1F5F9",
            }}
          >
            <MiniStat
              icon={<HeartPulse className="w-3.5 h-3.5" />}
              label="Next blood test"
              value="in 10 days"
              detail="47d since last panel"
              color="#B45309"
            />
            <MiniStat
              icon={<Clock4 className="w-3.5 h-3.5" />}
              label="Supply on hand"
              value="3 wk"
              detail="2 vials · GB covers next block"
              color="#0F172A"
            />
            <MiniStat
              icon={<Moon className="w-3.5 h-3.5" />}
              label="Sleep (7d avg)"
              value="7h 22m"
              detail="+18m vs prev. week"
              color="#6366F1"
            />
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Sun() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <defs>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE29A" />
          <stop offset="0.6" stopColor="#F5A623" />
          <stop offset="1" stopColor="#E28A10" />
        </radialGradient>
      </defs>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = 40;
        const r2 = 50;
        return (
          <line
            key={i}
            x1={55 + Math.cos(a) * r1}
            y1={55 + Math.sin(a) * r1}
            x2={55 + Math.cos(a) * r2}
            y2={55 + Math.sin(a) * r2}
            stroke="#F5A623"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
        );
      })}
      <circle cx="55" cy="55" r="28" fill="url(#sun)" />
    </svg>
  );
}

function Tile({
  title,
  kicker,
  accent,
  children,
}: {
  title: string;
  kicker: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col"
      style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] tracking-[0.22em] uppercase font-semibold"
          style={{ color: accent }}
        >
          {title}
        </span>
        <span className="text-[11px] font-semibold text-slate-900">
          {kicker}
        </span>
      </div>
      <div className="mt-3 flex-1 flex flex-col justify-center">
        {children}
      </div>
    </div>
  );
}

function CountdownRing({
  pct,
  label,
  subtext,
}: {
  pct: number;
  label: string;
  subtext: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#EEF2FF"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#2E5BFF"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          fontFamily="Inter"
          fontSize="22"
          fontWeight="600"
          fill="#0F172A"
        >
          {label}
        </text>
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontFamily="Inter"
          fontSize="10"
          fill="#64748B"
        >
          {subtext}
        </text>
      </svg>
    </div>
  );
}

function StreakDots({ count, missed }: { count: number; missed: number }) {
  void missed;
  const total = 24;
  return (
    <div className="flex items-center justify-center">
      <Flame className="w-5 h-5 text-emerald-600 mr-2" />
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(12, 8px)",
          gap: 4,
        }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const isMissed = i === 17;
          const inStreak = i >= total - count && !isMissed;
          return (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: inStreak
                  ? "#047857"
                  : isMissed
                  ? "#FCA5A5"
                  : "#E2E8F0",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 220;
  const H = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const toX = (i: number) =>
    (i / (values.length - 1)) * (W - 6) + 3;
  const toY = (v: number) =>
    H - 6 - ((v - min) / (max - min)) * (H - 12);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  return (
    <div className="flex items-center justify-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="wf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.25" />
            <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L${toX(values.length - 1)},${H - 6} L${toX(0)},${H - 6} Z`}
          fill="url(#wf)"
        />
        <path d={d} fill="none" stroke="#8B5CF6" strokeWidth="2" />
        <circle
          cx={toX(values.length - 1)}
          cy={toY(values[values.length - 1])}
          r="4"
          fill="#8B5CF6"
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>
      <Scale className="ml-2 w-4 h-4 text-slate-300" />
    </div>
  );
}

function EnergyBand({ values }: { values: number[] }) {
  // Heat band — each day is a cell, coloured by energy level
  const color = (v: number) => {
    if (v <= 4) return "#FCA5A5";
    if (v <= 6) return "#FDE68A";
    if (v <= 7) return "#A7F3D0";
    return "#6EE7B7";
  };
  return (
    <div className="mt-3 flex items-center gap-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1"
        >
          <div
            style={{
              width: "100%",
              height: 28,
              background: color(v),
              borderRadius: 4,
            }}
            title={`day ${i + 1}: ${v}/10`}
          />
          <span className="text-[9px] text-slate-400 font-mono">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}14`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-500">
          {label}
        </div>
        <div
          className="text-[16px] font-semibold mt-0.5 tracking-tight"
          style={{ color: "#0F172A" }}
        >
          {value}
        </div>
        <div className="text-[11px] text-slate-500 leading-snug">{detail}</div>
      </div>
    </div>
  );
}
