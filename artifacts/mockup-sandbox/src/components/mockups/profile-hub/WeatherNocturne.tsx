import { Flame, Clock4, HeartPulse, Moon, Scale } from "lucide-react";

// Vibe: NOCTURNE / GLASS. Same layout as Weather, different tonal
// register — deep ink background, luminous translucent cards, gold
// and cyan accents. Watch-face calm; formal and premium.

const BG = "#070A10";
const GLASS = "rgba(255,255,255,0.035)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#E6EAF0";
const DIM = "#8A94A6";
const GOLD = "#E8C36A";
const CYAN = "#6AD6F0";
const MINT = "#67E4B3";
const LILAC = "#B8A1FF";

export function WeatherNocturne() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 20% -10%, #122036 0%, #070A10 55%), #070A10",
        color: TEXT,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <Chrome>
        <section className="px-8 pb-8 flex flex-col gap-5">
          {/* Forecast — dark glass with a subtle luminous moon */}
          <div
            className="relative rounded-2xl p-6 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(90,105,160,0.20), rgba(20,30,50,0.20))",
              border: `1px solid ${GLASS_BORDER}`,
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 88% 40%, rgba(232,195,106,0.18), transparent 40%)",
              }}
            />
            <div className="relative z-10 flex items-start justify-between">
              <div className="max-w-[480px]">
                <div
                  className="text-[10px] tracking-[0.35em] uppercase"
                  style={{ color: GOLD }}
                >
                  Tonight's outlook
                </div>
                <h2
                  className="mt-3 tracking-[-0.02em] leading-[1.08] font-normal"
                  style={{
                    fontSize: 30,
                    fontFamily: "'Newsreader', Georgia, serif",
                    color: TEXT,
                  }}
                >
                  Steady, with a dose due this evening.
                </h2>
                <p
                  className="mt-3 text-[12px] leading-[1.65]"
                  style={{ color: DIM }}
                >
                  Eight weeks into semaglutide · 2.5 mg. Adherence holding,
                  sleep good this week, weight trend gentle.
                </p>
              </div>
              <MoonArt />
            </div>
          </div>

          {/* Three tiles — glass */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "1.1fr 1fr 1fr" }}
          >
            <GlassCard>
              <TileHead color={CYAN} title="Next dose" kicker="in 9h 14m" />
              <div className="mt-3 flex items-center justify-center">
                <LumRing pct={0.62} accent={CYAN} label="9h" subtext="14m" />
              </div>
              <Foot>
                2.5 mg semaglutide · Tue schedule · last logged Sat 8:12 pm
              </Foot>
            </GlassCard>

            <GlassCard>
              <TileHead color={MINT} title="Adherence" kicker="7-day streak" />
              <div className="mt-3 flex items-center justify-center">
                <Flame
                  className="w-4 h-4 mr-2"
                  style={{ color: MINT }}
                />
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: "repeat(12, 7px)",
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
                          width: 7,
                          height: 9,
                          background: missed
                            ? "#FF7AA1"
                            : inStreak
                            ? MINT
                            : "rgba(255,255,255,0.06)",
                          boxShadow:
                            inStreak && !missed
                              ? `0 0 6px ${MINT}AA`
                              : undefined,
                          borderRadius: 1,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <Foot>21 of 24 doses · missed on day 18</Foot>
            </GlassCard>

            <GlassCard>
              <TileHead color={LILAC} title="Weight" kicker="−2.3 kg · 30d" />
              <NocSparkline
                values={[
                  101.2, 101.0, 100.6, 100.3, 99.9, 99.8, 99.5, 99.3, 99.1,
                  99.0, 98.8, 98.7, 98.5, 98.3, 98.1, 97.9, 97.7, 97.5, 97.4,
                  97.2, 97.0, 96.9, 96.8, 96.6, 96.4, 96.3, 96.1, 95.9, 95.8,
                  95.7,
                ]}
              />
              <Foot>95.7 kg today · trending into target band</Foot>
            </GlassCard>
          </div>

          {/* Energy + mini-stats */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div
                className="text-[10px] tracking-[0.3em] uppercase"
                style={{ color: DIM }}
              >
                Last 14 days · how you felt
              </div>
              <div className="text-[11px]" style={{ color: DIM }}>
                avg energy{" "}
                <b style={{ color: TEXT }}>7.1</b>
                <span style={{ color: DIM }}> / 10</span>
              </div>
            </div>
            <NocEnergy values={[5, 6, 6, 5, 6, 7, 7, 8, 7, 7, 8, 8, 7, 7]} />

            <div
              className="mt-6 pt-5 grid gap-6"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                borderTop: `1px solid ${GLASS_BORDER}`,
              }}
            >
              <Mini
                icon={<HeartPulse className="w-3 h-3" />}
                color={GOLD}
                label="Next blood test"
                value="in 10 days"
                detail="47d since last panel"
              />
              <Mini
                icon={<Clock4 className="w-3 h-3" />}
                color={CYAN}
                label="Supply on hand"
                value="3 weeks"
                detail="2 vials · GB covers next block"
              />
              <Mini
                icon={<Moon className="w-3 h-3" />}
                color={LILAC}
                label="Sleep · 7d avg"
                value="7h 22m"
                detail="+18m vs previous week"
              />
            </div>
          </GlassCard>
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
          borderRight: `1px solid ${GLASS_BORDER}`,
        }}
      >
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-semibold"
          style={{
            background: "rgba(232,195,106,0.1)",
            color: GOLD,
            border: `1px solid ${GOLD}66`,
          }}
        >
          S&amp;P
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div
          className="flex items-center justify-between px-8 py-4 text-[10px] tracking-[0.3em] uppercase"
          style={{
            color: DIM,
            borderBottom: `1px solid ${GLASS_BORDER}`,
          }}
        >
          <span>@iam0121</span>
          <span>Wed · 16 apr · 7.42 pm</span>
        </div>
        <header className="px-8 pt-7 pb-2">
          <div
            className="text-[10px] tracking-[0.35em] uppercase"
            style={{ color: DIM }}
          >
            Profile
          </div>
          <h1
            className="mt-1 tracking-[-0.02em]"
            style={{
              fontSize: 32,
              fontFamily: "'Newsreader', Georgia, serif",
              fontWeight: 400,
              color: TEXT,
            }}
          >
            Good evening,{" "}
            <span style={{ color: GOLD, fontStyle: "italic" }}>
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

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
      style={{
        background: GLASS,
        border: `1px solid ${GLASS_BORDER}`,
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 40%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function TileHead({
  color,
  title,
  kicker,
}: {
  color: string;
  title: string;
  kicker: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[10px] tracking-[0.3em] uppercase"
        style={{ color }}
      >
        {title}
      </span>
      <span className="text-[11px]" style={{ color: TEXT }}>
        {kicker}
      </span>
    </div>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 pt-3 text-[11px] leading-[1.55]"
      style={{
        color: DIM,
        borderTop: `1px solid ${GLASS_BORDER}`,
      }}
    >
      {children}
    </div>
  );
}

function LumRing({
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
    <svg width="108" height="108" viewBox="0 0 100 100">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="6"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="6"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        filter="url(#glow)"
      />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontFamily="Inter"
        fontSize="22"
        fontWeight="300"
        fill={TEXT}
      >
        {label}
      </text>
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontFamily="Inter"
        fontSize="10"
        fill={DIM}
      >
        {subtext}
      </text>
    </svg>
  );
}

function NocSparkline({ values }: { values: number[] }) {
  const W = 220;
  const H = 70;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const toX = (i: number) =>
    (i / (values.length - 1)) * (W - 6) + 3;
  const toY = (v: number) =>
    H - 8 - ((v - min) / (max - min)) * (H - 16);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  return (
    <div className="mt-3 flex items-center justify-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="nocf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LILAC} stopOpacity="0.3" />
            <stop offset="1" stopColor={LILAC} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L${toX(values.length - 1)},${H - 6} L${toX(0)},${H - 6} Z`}
          fill="url(#nocf)"
        />
        <path d={d} fill="none" stroke={LILAC} strokeWidth="1.5" />
        <circle
          cx={toX(values.length - 1)}
          cy={toY(values[values.length - 1])}
          r="3.5"
          fill={LILAC}
          stroke={BG}
          strokeWidth="2"
        />
      </svg>
      <Scale className="ml-2 w-3 h-3" style={{ color: DIM }} />
    </div>
  );
}

function NocEnergy({ values }: { values: number[] }) {
  const color = (v: number) => {
    if (v <= 4) return "#FF7AA1";
    if (v <= 6) return "#E8C36A";
    if (v <= 7) return "#67E4B3";
    return "#9EEDC9";
  };
  return (
    <div className="mt-3 flex items-end gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            style={{
              width: "100%",
              height: 24 + v * 2,
              background: `linear-gradient(180deg, ${color(v)} 0%, ${color(
                v,
              )}55 100%)`,
              borderRadius: 3,
              boxShadow: `0 0 8px ${color(v)}44`,
            }}
          />
          <span className="text-[9px] font-mono" style={{ color: DIM }}>
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

function Mini({
  icon,
  color,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase"
        style={{ color }}
      >
        {icon}
        {label}
      </div>
      <div
        className="mt-2 tracking-[-0.02em] font-light"
        style={{ fontSize: 22, color: TEXT }}
      >
        {value}
      </div>
      <div className="text-[11px] mt-1" style={{ color: DIM }}>
        {detail}
      </div>
    </div>
  );
}

function MoonArt() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="moon" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FAE9B8" />
          <stop offset="0.7" stopColor="#D8B25E" />
          <stop offset="1" stopColor="#7A5420" />
        </radialGradient>
      </defs>
      <circle cx="54" cy="48" r="36" fill="url(#moon)" />
      <circle cx="68" cy="42" r="36" fill={BG} opacity="0.82" />
      {[
        [42, 38, 2],
        [48, 56, 1.3],
        [38, 60, 2.4],
        [56, 62, 1.8],
      ].map(([cx, cy, r], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="#B88A34"
          opacity="0.55"
        />
      ))}
    </svg>
  );
}
