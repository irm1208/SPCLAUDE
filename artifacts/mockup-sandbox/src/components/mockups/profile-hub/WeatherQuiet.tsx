import { Flame, Clock4, HeartPulse, Moon } from "lucide-react";

// Vibe: QUIET / CLINICAL. Preserves the Weather layout exactly —
// forecast strip, 3 tiles (dose countdown / adherence / weight),
// energy band + 3 mini-stats — but strips warmth. Paper background,
// hairline rules in lieu of shadows, single ink color with oxblood
// accents for emphasis. Thin type, generous tracking, abundant whitespace.

const INK = "#0F1115";
const MUTE = "#8A8F98";
const LINE = "#E4E2DD";
const PAPER = "#F6F4EE";
const CARD = "#FDFCF8";
const ACCENT = "#6E1E22"; // oxblood
const MOSS = "#3E5F3A"; // deep moss
const SLATE = "#45505A";

export function WeatherQuiet() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: PAPER,
        color: INK,
        fontFamily:
          "'Inter', 'Neue Haas Grotesk', system-ui, sans-serif",
        fontFeatureSettings: "'ss01','cv11'",
      }}
    >
      <Chrome>
        <section className="px-10 pb-10 flex flex-col gap-8">
          {/* Forecast strip — no gradient, just type and a rule */}
          <div>
            <div
              className="text-[9px] tracking-[0.35em] uppercase"
              style={{ color: MUTE }}
            >
              Today's outlook
            </div>
            <h2
              className="mt-3 tracking-[-0.01em] leading-[1.15] font-light"
              style={{ fontSize: 28 }}
            >
              Steady. A dose is due this evening.
            </h2>
            <p
              className="mt-3 text-[12px] leading-[1.7] max-w-[560px]"
              style={{ color: SLATE }}
            >
              Eight weeks into semaglutide · 2.5 mg. Adherence holding, sleep
              good this week, weight trend gentle.
            </p>
            <div
              className="mt-6"
              style={{ borderTop: `1px solid ${LINE}` }}
            />
          </div>

          {/* Three tiles — hairline boxes, no shadows */}
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "1.1fr 1fr 1fr" }}
          >
            <Card>
              <Label color={ACCENT}>Next dose</Label>
              <Kicker>in 9h 14m</Kicker>
              <div className="mt-4 flex items-center justify-center">
                <Ring pct={0.62} accent={ACCENT} label="9h" subtext="14m" />
              </div>
              <Footnote>
                2.5 mg semaglutide · Tuesday schedule · last logged Sat 8:12 pm
              </Footnote>
            </Card>

            <Card>
              <Label color={MOSS}>Adherence</Label>
              <Kicker>7-day streak</Kicker>
              <div className="mt-4 flex items-center justify-center">
                <Flame
                  className="w-4 h-4 mr-2"
                  style={{ color: MOSS }}
                />
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: "repeat(12, 6px)",
                    gap: 3,
                  }}
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const missed = i === 17;
                    const inStreak = i >= 17 && !missed;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 10,
                          background: missed
                            ? ACCENT
                            : inStreak
                            ? MOSS
                            : "transparent",
                          border: `1px solid ${
                            missed
                              ? ACCENT
                              : inStreak
                              ? MOSS
                              : LINE
                          }`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <Footnote>
                21 of 24 scheduled doses · missed on day 18
              </Footnote>
            </Card>

            <Card>
              <Label color={SLATE}>Weight</Label>
              <Kicker>−2.3 kg / 30d</Kicker>
              <div className="mt-4">
                <QuietSparkline
                  values={[
                    101.2, 101.0, 100.6, 100.3, 99.9, 99.8, 99.5, 99.3, 99.1,
                    99.0, 98.8, 98.7, 98.5, 98.3, 98.1, 97.9, 97.7, 97.5, 97.4,
                    97.2, 97.0, 96.9, 96.8, 96.6, 96.4, 96.3, 96.1, 95.9, 95.8,
                    95.7,
                  ]}
                />
              </div>
              <Footnote>
                95.7 kg today · trending into your target band
              </Footnote>
            </Card>
          </div>

          {/* Energy band + mini stats */}
          <div>
            <div className="flex items-center justify-between">
              <Label color={MUTE}>Last 14 days · how you felt</Label>
              <span className="text-[11px]" style={{ color: SLATE }}>
                avg energy <b style={{ color: INK }}>7.1</b>
                <span style={{ color: MUTE }}> / 10</span>
              </span>
            </div>
            <QuietEnergyBand values={[5,6,6,5,6,7,7,8,7,7,8,8,7,7]} />

            <div
              className="mt-8 pt-6 grid gap-8"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                borderTop: `1px solid ${LINE}`,
              }}
            >
              <MiniStat
                icon={<HeartPulse className="w-3 h-3" />}
                label="Next blood test"
                value="in 10 days"
                detail="47d since last panel"
              />
              <MiniStat
                icon={<Clock4 className="w-3 h-3" />}
                label="Supply on hand"
                value="3 weeks"
                detail="2 vials · GB covers next block"
              />
              <MiniStat
                icon={<Moon className="w-3 h-3" />}
                label="Sleep · 7d avg"
                value="7h 22m"
                detail="+18m vs previous week"
              />
            </div>
          </div>
        </section>
      </Chrome>
    </div>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside
        className="flex flex-col items-center py-6"
        style={{
          width: 56,
          borderRight: `1px solid ${LINE}`,
          background: CARD,
        }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center text-[10px] tracking-[0.1em] font-semibold"
          style={{
            border: `1px solid ${INK}`,
            color: INK,
          }}
        >
          S&amp;P
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div
          className="flex items-center justify-between px-10 py-5 text-[10px] tracking-[0.3em] uppercase"
          style={{ color: MUTE, borderBottom: `1px solid ${LINE}` }}
        >
          <span>Profile · @iam0121</span>
          <span>Wednesday, 16 April — 7.42</span>
        </div>
        <header className="px-10 pt-8 pb-2">
          <div
            className="text-[9px] tracking-[0.35em] uppercase"
            style={{ color: MUTE }}
          >
            Profile hub
          </div>
          <h1
            className="mt-2 font-light tracking-[-0.01em]"
            style={{ fontSize: 32, color: INK }}
          >
            Good morning,{" "}
            <span style={{ fontStyle: "italic", color: ACCENT }}>
              @iam0121
            </span>
            .
          </h1>
        </header>
        {children}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-5 flex flex-col"
      style={{
        background: CARD,
        border: `1px solid ${LINE}`,
      }}
    >
      {children}
    </div>
  );
}

function Label({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="text-[9px] tracking-[0.3em] uppercase"
      style={{ color }}
    >
      {children}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-1.5 text-[12px] tracking-[-0.005em]"
      style={{ color: SLATE }}
    >
      {children}
    </div>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-4 pt-3 text-[11px] leading-[1.55]"
      style={{ color: SLATE, borderTop: `1px solid ${LINE}` }}
    >
      {children}
    </div>
  );
}

function Ring({
  pct,
  accent,
  label,
  subtext,
}: {
  pct: number;
  accent: string;
  label: string;
  subtext: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <svg width="104" height="104" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={LINE} strokeWidth="1" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontFamily="Inter"
        fontSize="20"
        fontWeight="300"
        fill={INK}
      >
        {label}
      </text>
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontFamily="Inter"
        fontSize="9"
        fill={MUTE}
        letterSpacing="2"
      >
        {subtext}
      </text>
    </svg>
  );
}

function QuietSparkline({ values }: { values: number[] }) {
  const W = 220;
  const H = 70;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const toX = (i: number) =>
    (i / (values.length - 1)) * (W - 4) + 2;
  const toY = (v: number) =>
    H - 8 - ((v - min) / (max - min)) * (H - 16);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Baseline */}
      <line
        x1={2}
        x2={W - 2}
        y1={H - 8}
        y2={H - 8}
        stroke={LINE}
      />
      <path d={d} fill="none" stroke={INK} strokeWidth="1.1" />
      <circle
        cx={toX(values.length - 1)}
        cy={toY(values[values.length - 1])}
        r="2.5"
        fill={INK}
      />
    </svg>
  );
}

function QuietEnergyBand({ values }: { values: number[] }) {
  return (
    <div className="mt-4 flex items-end gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div
            style={{
              width: "100%",
              height: 36 * (v / 10) + 6,
              background: INK,
              opacity: 0.08 + (v / 10) * 0.35,
            }}
          />
          <span
            className="text-[9px] font-mono"
            style={{ color: MUTE }}
          >
            {i + 1}
          </span>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 text-[9px] tracking-[0.3em] uppercase"
        style={{ color: MUTE }}
      >
        {icon}
        {label}
      </div>
      <div
        className="mt-2 font-light tracking-[-0.01em]"
        style={{ fontSize: 22, color: INK }}
      >
        {value}
      </div>
      <div className="text-[11px] mt-1" style={{ color: SLATE }}>
        {detail}
      </div>
    </div>
  );
}
