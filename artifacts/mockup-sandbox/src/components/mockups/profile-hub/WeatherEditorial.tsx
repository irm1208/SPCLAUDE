import { Flame, Clock4, HeartPulse, Moon } from "lucide-react";

// Vibe: EDITORIAL / RISO. Same Weather layout — newsprint cream
// paper, ink-block colour (salmon, teal, black), serif display, mixed
// sans captions, subtle paper grain, handwritten annotations. Warm,
// playful, magazine energy.

const PAPER = "#F3EADA";
const INK = "#1A1512";
const MUTE = "#8C7A66";
const RULE = "#1A1512";
const SALMON = "#E4614A";
const TEAL = "#1F7A7A";
const MUSTARD = "#D8A531";
const CARD = "#FBF4E4";

export function WeatherEditorial() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: PAPER,
        color: INK,
        fontFamily: "'Inter', system-ui, sans-serif",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0 0.05  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    >
      <Chrome>
        <section className="px-10 pb-10 flex flex-col gap-7">
          {/* Forecast — newspaper masthead */}
          <div className="relative">
            <div
              className="flex items-center justify-between text-[10px] tracking-[0.3em] uppercase"
              style={{ color: MUTE }}
            >
              <span>Vol. VIII · No. 56</span>
              <span>Today's outlook</span>
              <span>Ed. Wed</span>
            </div>
            <div
              className="mt-2"
              style={{ borderTop: `3px double ${RULE}` }}
            />
            <div className="mt-5 flex items-start justify-between gap-6">
              <div className="flex-1">
                <h2
                  className="font-bold tracking-[-0.02em] leading-[0.95]"
                  style={{
                    fontSize: 48,
                    fontFamily:
                      "'Newsreader', 'Playfair Display', Georgia, serif",
                    color: INK,
                  }}
                >
                  Steady —
                  <br />
                  <span style={{ color: SALMON, fontStyle: "italic" }}>
                    &amp; a dose is due
                  </span>{" "}
                  this evening.
                </h2>
                <p
                  className="mt-4 text-[13px] leading-[1.7] max-w-[460px]"
                  style={{ color: INK }}
                >
                  Eight weeks into semaglutide, two and a half milligrams.
                  Adherence holding, sleep good this week, weight trend
                  gentle.{" "}
                  <span style={{ color: MUTE }}>
                    — staff forecast
                  </span>
                </p>
              </div>
              <SunRiso />
            </div>
            <div
              className="mt-5"
              style={{ borderTop: `1px solid ${RULE}` }}
            />
          </div>

          {/* Three tiles — ink panels */}
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "1.1fr 1fr 1fr" }}
          >
            <RisoCard>
              <Section
                number="I."
                accent={SALMON}
                title="Next dose"
                kicker="in 9h 14m"
              />
              <div className="mt-4 flex items-center justify-center">
                <RisoRing pct={0.62} label="9h" subtext="14 min" />
              </div>
              <Note>
                handwritten: <i>remind me tonight at 8 ✏︎</i>
              </Note>
              <Foot>
                2.5 mg semaglutide · Tuesday schedule · last logged Sat
              </Foot>
            </RisoCard>

            <RisoCard>
              <Section
                number="II."
                accent={TEAL}
                title="Adherence"
                kicker="7-day streak"
              />
              <div className="mt-4 flex items-center justify-center">
                <Flame className="w-4 h-4 mr-2" style={{ color: TEAL }} />
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
                          height: 10,
                          background: missed
                            ? SALMON
                            : inStreak
                            ? TEAL
                            : "transparent",
                          border: `1px solid ${
                            missed ? SALMON : inStreak ? TEAL : RULE
                          }`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <Note>
                <span style={{ color: SALMON }}>·</span> one slip on day 18
              </Note>
              <Foot>21 of 24 scheduled doses</Foot>
            </RisoCard>

            <RisoCard>
              <Section
                number="III."
                accent={MUSTARD}
                title="Weight"
                kicker="−2.3 kg / 30d"
              />
              <RisoSparkline
                values={[
                  101.2, 101.0, 100.6, 100.3, 99.9, 99.8, 99.5, 99.3, 99.1,
                  99.0, 98.8, 98.7, 98.5, 98.3, 98.1, 97.9, 97.7, 97.5, 97.4,
                  97.2, 97.0, 96.9, 96.8, 96.6, 96.4, 96.3, 96.1, 95.9, 95.8,
                  95.7,
                ]}
              />
              <Note>
                <i>target band: 94–96 kg →</i>
              </Note>
              <Foot>95.7 kg today</Foot>
            </RisoCard>
          </div>

          {/* Energy band + mini stats */}
          <div
            className="p-6"
            style={{
              background: CARD,
              border: `1.5px solid ${RULE}`,
              boxShadow: `5px 5px 0 ${RULE}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="text-[10px] tracking-[0.3em] uppercase font-bold"
                style={{ color: INK }}
              >
                Last 14 days — how you felt
              </div>
              <div className="text-[11px]" style={{ color: INK }}>
                avg energy <b>7.1</b>
                <span style={{ color: MUTE }}> / 10</span>
              </div>
            </div>
            <RisoEnergy
              values={[5, 6, 6, 5, 6, 7, 7, 8, 7, 7, 8, 8, 7, 7]}
            />

            <div
              className="mt-6 pt-5 grid gap-6"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                borderTop: `1px dashed ${RULE}`,
              }}
            >
              <Mini
                icon={<HeartPulse className="w-3 h-3" />}
                color={SALMON}
                label="Next blood test"
                value="in 10 days"
                detail="47d since last panel"
              />
              <Mini
                icon={<Clock4 className="w-3 h-3" />}
                color={TEAL}
                label="Supply on hand"
                value="3 weeks"
                detail="2 vials · GB covers next block"
              />
              <Mini
                icon={<Moon className="w-3 h-3" />}
                color={MUSTARD}
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
          borderRight: `1.5px solid ${RULE}`,
        }}
      >
        <div
          className="w-9 h-9 flex items-center justify-center text-[11px] font-bold"
          style={{
            background: INK,
            color: PAPER,
          }}
        >
          S&amp;P
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div
          className="flex items-center justify-between px-10 py-4 text-[10px] tracking-[0.3em] uppercase font-semibold"
          style={{
            color: INK,
            borderBottom: `1.5px solid ${RULE}`,
          }}
        >
          <span>Profile · @iam0121</span>
          <span>— The Daily Peps —</span>
          <span>Wed · 16 Apr · 2026</span>
        </div>
        <header className="px-10 pt-8 pb-0">
          <div
            className="text-[11px] tracking-[0.3em] uppercase font-semibold"
            style={{ color: SALMON }}
          >
            Profile hub
          </div>
          <h1
            className="mt-1 leading-[0.98]"
            style={{
              fontSize: 48,
              fontFamily: "'Newsreader', Georgia, serif",
              fontWeight: 700,
              color: INK,
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back,{" "}
            <span style={{ fontStyle: "italic", color: TEAL }}>
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

function RisoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-5 flex flex-col relative"
      style={{
        background: CARD,
        border: `1.5px solid ${RULE}`,
        boxShadow: `4px 4px 0 ${RULE}`,
      }}
    >
      {children}
    </div>
  );
}

function Section({
  number,
  accent,
  title,
  kicker,
}: {
  number: string;
  accent: string;
  title: string;
  kicker: string;
}) {
  return (
    <>
      <div className="flex items-baseline gap-2">
        <span
          className="font-bold"
          style={{
            fontSize: 18,
            fontFamily: "'Newsreader', Georgia, serif",
            color: accent,
          }}
        >
          {number}
        </span>
        <span
          className="text-[11px] tracking-[0.3em] uppercase font-bold"
          style={{ color: INK }}
        >
          {title}
        </span>
      </div>
      <div
        className="mt-1 text-[12px]"
        style={{ color: MUTE, fontStyle: "italic" }}
      >
        {kicker}
      </div>
    </>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 text-[11px]"
      style={{
        color: MUTE,
        fontFamily:
          "'Caveat', 'Kalam', 'Bradley Hand', cursive",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-auto pt-3 text-[11px] leading-[1.55]"
      style={{ color: INK, borderTop: `1px dashed ${RULE}`, marginTop: 14 }}
    >
      {children}
    </div>
  );
}

function RisoRing({
  pct,
  label,
  subtext,
}: {
  pct: number;
  label: string;
  subtext: string;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <circle
        cx="52"
        cy="52"
        r={r}
        fill="none"
        stroke={SALMON}
        strokeWidth="10"
        opacity="0.35"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={RULE}
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontFamily="Newsreader, Georgia, serif"
        fontSize="22"
        fontWeight="700"
        fill={INK}
      >
        {label}
      </text>
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontFamily="Inter"
        fontSize="9"
        fill={MUTE}
      >
        {subtext}
      </text>
    </svg>
  );
}

function RisoSparkline({ values }: { values: number[] }) {
  const W = 230;
  const H = 74;
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
    <div className="mt-4 flex items-center justify-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Offset "risograph" second pass */}
        <path
          d={d}
          fill="none"
          stroke={MUSTARD}
          strokeWidth="3"
          opacity="0.7"
          transform="translate(2,2)"
        />
        <path d={d} fill="none" stroke={RULE} strokeWidth="1.5" />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={i === values.length - 1 ? 3.5 : 1.6}
            fill={i === values.length - 1 ? MUSTARD : RULE}
            stroke={i === values.length - 1 ? RULE : undefined}
            strokeWidth={i === values.length - 1 ? 1.5 : 0}
          />
        ))}
      </svg>
    </div>
  );
}

function RisoEnergy({ values }: { values: number[] }) {
  const color = (v: number) => {
    if (v <= 4) return SALMON;
    if (v <= 6) return MUSTARD;
    if (v <= 7) return "#95C7A0";
    return TEAL;
  };
  return (
    <div className="mt-4 flex items-end gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 relative">
          <div
            className="relative"
            style={{
              width: "100%",
              height: 20 + v * 3,
            }}
          >
            {/* Riso offset */}
            <div
              className="absolute inset-0"
              style={{
                background: color(v),
                opacity: 0.65,
                transform: "translate(2px,2px)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "transparent",
                border: `1.2px solid ${RULE}`,
              }}
            />
          </div>
          <span
            className="text-[9px] font-mono"
            style={{ color: INK }}
          >
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
        className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase font-bold"
        style={{ color }}
      >
        {icon}
        {label}
      </div>
      <div
        className="mt-2 font-bold tracking-[-0.01em]"
        style={{
          fontSize: 24,
          color: INK,
          fontFamily: "'Newsreader', Georgia, serif",
        }}
      >
        {value}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: MUTE }}>
        {detail}
      </div>
    </div>
  );
}

function SunRiso() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {/* Salmon offset */}
      <circle cx="62" cy="58" r="34" fill={SALMON} opacity="0.6" />
      {/* Mustard center */}
      <circle cx="60" cy="56" r="28" fill={MUSTARD} />
      {/* Ink outline */}
      <circle
        cx="60"
        cy="56"
        r="28"
        fill="none"
        stroke={RULE}
        strokeWidth="1.5"
      />
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={60 + Math.cos(a) * 34}
            y1={56 + Math.sin(a) * 34}
            x2={60 + Math.cos(a) * 44}
            y2={56 + Math.sin(a) * 44}
            stroke={RULE}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
