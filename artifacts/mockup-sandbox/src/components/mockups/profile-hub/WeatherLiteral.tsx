import {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Sunrise,
  Sunset,
  Moon,
  Syringe,
  Beaker,
  Boxes,
  Truck,
} from "lucide-react";

// Axis: commit to the weather metaphor. This reads like iOS Weather
// or Carrot — feels-like hero, hourly strip (next 24h of protocol
// events), 7-day forecast row (week icons + adherence), and metric
// tiles mapped to actual weather-app tiles (wind / humidity / UV /
// visibility / sunrise / sunset) repurposed for body state.

const SKY_A = "#F6C37A";
const SKY_B = "#F18A5E";
const SKY_C = "#8AB6E5";
const INK = "#1A1F2E";
const MUTE = "#6B7280";

export function WeatherLiteral() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #FFE9CC 0%, #FDD9B2 35%, #D8E3F0 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: INK,
      }}
    >
      <Chrome>
        <section className="px-8 pb-8 flex flex-col gap-5">
          {/* Hero — feels-like */}
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, #FFC78A 0%, #F28B5D 50%, #B98ACF 100%)",
              color: "#1A0F25",
              boxShadow: "0 20px 60px rgba(180,100,60,0.25)",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] tracking-[0.25em] uppercase font-semibold opacity-70">
                  @iam0121 · right now
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span
                    className="font-light tracking-[-0.03em] leading-[0.9]"
                    style={{ fontSize: 84 }}
                  >
                    Fair
                  </span>
                  <span className="text-[14px] opacity-75">
                    feels like <b>steady</b>
                  </span>
                </div>
                <div className="mt-2 text-[13px] opacity-80 max-w-[380px]">
                  Light tailwind on adherence. Dose front moving in this
                  evening. Clear overnight, re-test band in 10d.
                </div>
              </div>
              <SceneArt />
            </div>

            {/* H/L bar */}
            <div className="mt-5 flex items-center gap-6 text-[12px] opacity-85">
              <span>
                <b>H:</b> 8/10 energy · Mon
              </span>
              <span>
                <b>L:</b> 5/10 · Sun
              </span>
              <span>
                next dose <b>9h 14m</b>
              </span>
              <span className="ml-auto">sunrise 6:42 · sunset 7:58</span>
            </div>
          </div>

          {/* Hourly — next 24h as protocol events */}
          <Panel title="Next 24 hours">
            <div className="flex items-end justify-between gap-1 overflow-hidden">
              {hourly.map((h, i) => (
                <Hour key={i} {...h} />
              ))}
            </div>
          </Panel>

          {/* 7-day forecast */}
          <Panel title="7-day forecast">
            <ul className="flex flex-col gap-2.5">
              {week.map((d, i) => (
                <Day key={i} {...d} isToday={i === 3} />
              ))}
            </ul>
          </Panel>

          {/* Weather-tiles grid */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <TileW
              icon={<CloudDrizzle className="w-4 h-4" />}
              label="Chance of missed dose"
              value="12%"
              detail="next 7 days · low"
              accent={SKY_C}
            />
            <TileW
              icon={<Wind className="w-4 h-4" />}
              label="Adherence wind"
              value="NNE · 7d"
              detail="consistent tailwind"
              accent="#60A5FA"
            />
            <TileW
              icon={<Thermometer className="w-4 h-4" />}
              label="Weight"
              value="95.7 kg"
              detail="falling · −2.3 kg / 30d"
              accent="#A78BFA"
            />
            <TileW
              icon={<Droplets className="w-4 h-4" />}
              label="Supply humidity"
              value="3 wk"
              detail="2 vials on hand"
              accent="#34D399"
            />
            <TileW
              icon={<Eye className="w-4 h-4" />}
              label="Blood visibility"
              value="47d old"
              detail="re-test in 10d"
              accent="#F59E0B"
            />
            <TileW
              icon={<Moon className="w-4 h-4" />}
              label="Sleep · 7d avg"
              value="7h 22m"
              detail="+18m vs prev. week"
              accent="#8B5CF6"
            />
            <TileW
              icon={<Sunrise className="w-4 h-4" />}
              label="Protocol sunrise"
              value="Wk 8"
              detail="of 12 · 67% in"
              accent="#F97316"
            />
            <TileW
              icon={<Sunset className="w-4 h-4" />}
              label="Block ends"
              value="21d"
              detail="then re-evaluate"
              accent="#EC4899"
            />
          </div>
        </section>
      </Chrome>
    </div>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div
        className="flex items-center justify-between px-8 py-4 text-[11px] tracking-[0.2em] uppercase font-semibold"
        style={{ color: INK }}
      >
        <span className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: INK }}
          >
            S&amp;P
          </div>
          <span>Profile · @iam0121</span>
        </span>
        <span>Wed · 16 Apr · 7:42 pm</span>
      </div>
      {children}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 10px 30px rgba(40,50,80,0.08)",
      }}
    >
      <div
        className="text-[10px] tracking-[0.28em] uppercase font-semibold mb-3"
        style={{ color: MUTE }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

type HourPt = {
  time: string;
  icon: React.ReactNode;
  label: string;
  level: number; // 0..1 — visual intensity
  highlight?: boolean;
};
const hourly: HourPt[] = [
  { time: "now", icon: <Sun className="w-4 h-4" />, label: "steady", level: 0.4 },
  { time: "8p", icon: <Syringe className="w-4 h-4" />, label: "dose", level: 0.95, highlight: true },
  { time: "9p", icon: <Sun className="w-4 h-4" />, label: "settling", level: 0.55 },
  { time: "10p", icon: <Moon className="w-4 h-4" />, label: "sleep", level: 0.35 },
  { time: "12a", icon: <Moon className="w-4 h-4" />, label: "clear", level: 0.2 },
  { time: "3a", icon: <Moon className="w-4 h-4" />, label: "clear", level: 0.15 },
  { time: "6a", icon: <Sunrise className="w-4 h-4" />, label: "rise", level: 0.5 },
  { time: "8a", icon: <Sun className="w-4 h-4" />, label: "fasting", level: 0.7 },
  { time: "12p", icon: <Sun className="w-4 h-4" />, label: "lunch", level: 0.6 },
  { time: "3p", icon: <Truck className="w-4 h-4" />, label: "#1182", level: 0.8, highlight: true },
  { time: "5p", icon: <Sun className="w-4 h-4" />, label: "steady", level: 0.45 },
  { time: "7p", icon: <Sunset className="w-4 h-4" />, label: "set", level: 0.35 },
];

function Hour({ time, icon, label, level, highlight }: HourPt) {
  const bar = 40 + level * 48;
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className="text-[10px]" style={{ color: MUTE }}>
        {time}
      </div>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: highlight ? "#1A1F2E" : "rgba(255,255,255,0.7)",
          color: highlight ? "#FFD58A" : INK,
          border: highlight ? undefined : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          height: bar,
          width: 6,
          borderRadius: 3,
          background: highlight
            ? "linear-gradient(180deg, #F18A5E, #B98ACF)"
            : "linear-gradient(180deg, #FFD58A, #8AB6E5)",
          opacity: 0.7 + level * 0.3,
        }}
      />
      <div
        className="text-[9px] truncate max-w-full"
        style={{ color: highlight ? "#B35A2E" : MUTE, fontWeight: highlight ? 600 : 400 }}
      >
        {label}
      </div>
    </div>
  );
}

type DayPt = {
  short: string;
  date: string;
  icon: React.ReactNode;
  summary: string;
  bar: [number, number]; // [lo, hi] 0..1 — adherence band
  tag?: string;
  tagColor?: string;
};
const week: DayPt[] = [
  { short: "Mon", date: "14", icon: <Sun className="w-4 h-4" />, summary: "Dose Tue", bar: [0.5, 0.9] },
  { short: "Tue", date: "15", icon: <Cloud className="w-4 h-4" />, summary: "Dose", bar: [0.55, 0.95] },
  { short: "Wed", date: "16", icon: <Sun className="w-4 h-4" />, summary: "Dose tonight", bar: [0.45, 0.9], tag: "today", tagColor: "#1A1F2E" },
  { short: "Thu", date: "17", icon: <Sun className="w-4 h-4" />, summary: "Steady", bar: [0.4, 0.85] },
  { short: "Fri", date: "18", icon: <Cloud className="w-4 h-4" />, summary: "Steady", bar: [0.35, 0.8] },
  { short: "Sat", date: "19", icon: <CloudRain className="w-4 h-4" />, summary: "Dose · GB closes Sun", bar: [0.5, 0.9], tag: "GB", tagColor: "#8B5CF6" },
  { short: "Sun", date: "20", icon: <Sun className="w-4 h-4" />, summary: "Tirz GB cutoff", bar: [0.45, 0.85], tag: "cutoff", tagColor: "#8B5CF6" },
];

function Day({
  short,
  date,
  icon,
  summary,
  bar,
  tag,
  tagColor,
  isToday,
}: DayPt & { isToday?: boolean }) {
  return (
    <li
      className="flex items-center gap-3"
      style={{ fontWeight: isToday ? 700 : 400 }}
    >
      <span className="w-10 text-[12px]" style={{ color: INK }}>
        {short}
      </span>
      <span className="w-6 text-[11px]" style={{ color: MUTE }}>
        {date}
      </span>
      <span style={{ color: INK }}>{icon}</span>
      <span className="flex-1 text-[12px]" style={{ color: INK }}>
        {summary}
      </span>
      <div
        className="relative"
        style={{
          width: 180,
          height: 6,
          borderRadius: 3,
          background: "rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            left: `${bar[0] * 100}%`,
            right: `${(1 - bar[1]) * 100}%`,
            background:
              "linear-gradient(90deg, #60A5FA, #F18A5E, #F59E0B)",
          }}
        />
      </div>
      {tag ? (
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{
            color: tagColor,
            background: `${tagColor}14`,
          }}
        >
          {tag}
        </span>
      ) : (
        <span className="w-[46px]" />
      )}
    </li>
  );
}

function TileW({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-center gap-1.5 text-[9px] tracking-[0.24em] uppercase font-semibold" style={{ color: accent }}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-[18px] font-semibold tracking-tight" style={{ color: INK }}>
        {value}
      </div>
      <div className="text-[10px]" style={{ color: MUTE }}>
        {detail}
      </div>
    </div>
  );
}

function SceneArt() {
  return (
    <svg width="160" height="110" viewBox="0 0 160 110">
      <defs>
        <radialGradient id="s" cx="0.5" cy="0.5">
          <stop offset="0" stopColor="#FFF0C2" />
          <stop offset="1" stopColor={SKY_A} />
        </radialGradient>
      </defs>
      <circle cx="112" cy="42" r="30" fill="url(#s)" />
      {/* Clouds */}
      <ellipse cx="50" cy="56" rx="30" ry="9" fill="#fff" opacity="0.8" />
      <ellipse cx="70" cy="50" rx="22" ry="8" fill="#fff" opacity="0.9" />
      <ellipse cx="36" cy="52" rx="18" ry="7" fill="#fff" opacity="0.7" />
      <ellipse cx="104" cy="80" rx="28" ry="7" fill="#fff" opacity="0.7" />
      {/* Bird (weight trajectory) */}
      <path
        d="M20 92 q8 -6 16 0 q8 -6 16 0"
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Keep used in case we tweak later
void Beaker;
void Boxes;
void SKY_B;
