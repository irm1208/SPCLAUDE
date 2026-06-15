// Axis: every metric as an analog weather instrument. Barometer,
// thermometer, wind-rose, rain gauge, hygrometer, sundial. No
// sparklines, no bar charts — only dials and scales. Scientific,
// calm, tactile.

const CREAM = "#EDE6D3";
const PAPER = "#F7F1DC";
const INK = "#1D1B17";
const MUTE = "#837C6C";
const LINE = "#9A927E";
const BRASS = "#A97E3A";
const CRIMSON = "#A23B2B";
const FOREST = "#3E5F3A";
const COBALT = "#355C8A";

export function WeatherInstruments() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: CREAM,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: INK,
      }}
    >
      <Chrome>
        <section className="px-8 pb-8 flex flex-col gap-5">
          {/* Station header */}
          <div
            className="rounded-xl p-5"
            style={{
              background: PAPER,
              border: `1px solid ${LINE}`,
              boxShadow: "inset 0 0 0 4px " + PAPER + ", inset 0 0 0 5px " + LINE,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="text-[10px] tracking-[0.4em] uppercase"
                  style={{ color: MUTE }}
                >
                  Station · @iam0121
                </div>
                <h2
                  className="mt-1 tracking-[-0.01em]"
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontSize: 26,
                    color: INK,
                    fontWeight: 500,
                  }}
                >
                  Body atmospheric report, 16 Apr 2026.
                </h2>
              </div>
              <div
                className="text-right text-[11px]"
                style={{ color: MUTE }}
              >
                <div>reading at 7:42 pm</div>
                <div className="mt-0.5" style={{ color: INK }}>
                  — fair, dose front incoming
                </div>
              </div>
            </div>
          </div>

          {/* Top row — three large instruments */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            <Instrument
              label="Barometer · dose pressure"
              reading="rising"
              detail="next dose in 9h 14m"
            >
              <Barometer pct={0.62} />
            </Instrument>

            <Instrument
              label="Thermometer · weight"
              reading="95.7 kg"
              detail="−2.3 kg / 30d · target band shaded"
            >
              <Thermo
                values={[
                  101.2, 101, 100.6, 100.3, 99.9, 99.5, 99.2, 99, 98.8, 98.5,
                  98.2, 97.9, 97.6, 97.3, 97, 96.7, 96.4, 96.1, 95.9, 95.7,
                ]}
              />
            </Instrument>

            <Instrument
              label="Wind rose · adherence"
              reading="NNE · steady"
              detail="21 of 24 doses logged this month"
            >
              <WindRose />
            </Instrument>
          </div>

          {/* Bottom row — four smaller */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
          >
            <SmallInstrument
              label="Rain gauge · missed"
              reading="3 mm"
              detail="3 missed doses this block"
            >
              <RainGauge mm={3} />
            </SmallInstrument>
            <SmallInstrument
              label="Hygrometer · sleep"
              reading="7h 22m"
              detail="avg last 7 nights"
            >
              <Hygrometer pct={0.74} />
            </SmallInstrument>
            <SmallInstrument
              label="Chronograph · blood"
              reading="47 d"
              detail="since last panel · re-test in 10"
            >
              <Chronograph pastPct={0.82} />
            </SmallInstrument>
            <SmallInstrument
              label="Sundial · protocol"
              reading="Wk 8 / 12"
              detail="noon of the course"
            >
              <Sundial pct={8 / 12} />
            </SmallInstrument>
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
        className="flex items-center justify-between px-8 py-4 text-[10px] tracking-[0.3em] uppercase"
        style={{ color: INK, borderBottom: `1px solid ${LINE}` }}
      >
        <span className="flex items-center gap-2">
          <div
            className="w-7 h-7 flex items-center justify-center text-[10px] font-bold"
            style={{ border: `1px solid ${INK}`, color: INK }}
          >
            S&amp;P
          </div>
          <span>Profile hub · @iam0121</span>
        </span>
        <span>Wed · 16 Apr · 2026 · 7:42 pm</span>
      </div>
      {children}
    </div>
  );
}

function Instrument({
  label,
  reading,
  detail,
  children,
}: {
  label: string;
  reading: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 relative"
      style={{ background: PAPER, border: `1px solid ${LINE}` }}
    >
      <div
        className="text-[10px] tracking-[0.3em] uppercase mb-3"
        style={{ color: MUTE }}
      >
        {label}
      </div>
      <div className="flex items-center justify-center" style={{ minHeight: 160 }}>
        {children}
      </div>
      <div
        className="mt-3 pt-3 flex items-baseline justify-between text-[11px]"
        style={{ borderTop: `1px dashed ${LINE}` }}
      >
        <span
          className="font-semibold tracking-tight"
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 16,
            color: INK,
          }}
        >
          {reading}
        </span>
        <span style={{ color: MUTE }}>{detail}</span>
      </div>
    </div>
  );
}

function SmallInstrument({
  label,
  reading,
  detail,
  children,
}: {
  label: string;
  reading: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: PAPER, border: `1px solid ${LINE}` }}
    >
      <div
        className="text-[9px] tracking-[0.28em] uppercase"
        style={{ color: MUTE }}
      >
        {label}
      </div>
      <div className="mt-2 flex items-center justify-center" style={{ minHeight: 100 }}>
        {children}
      </div>
      <div
        className="mt-2 pt-2 flex items-baseline justify-between"
        style={{ borderTop: `1px dashed ${LINE}` }}
      >
        <span
          className="font-semibold"
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 14,
            color: INK,
          }}
        >
          {reading}
        </span>
        <span className="text-[10px]" style={{ color: MUTE }}>
          {detail}
        </span>
      </div>
    </div>
  );
}

/* --------------------- instruments --------------------- */

function Barometer({ pct }: { pct: number }) {
  // semicircular scale from LOW to HIGH, needle at pct
  const cx = 90;
  const cy = 100;
  const r = 72;
  const start = Math.PI; // left
  const end = 0; // right
  const a = start + (end - start) * pct;
  const nx = cx + Math.cos(a) * (r - 16);
  const ny = cy + Math.sin(a) * (r - 16);
  const ticks = Array.from({ length: 11 }).map((_, i) => i / 10);
  return (
    <svg width="190" height="120" viewBox="0 0 180 120">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={LINE}
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r - 8}
        fill="none"
        stroke={LINE}
        strokeWidth="0.6"
        strokeDasharray="1 2"
      />
      {ticks.map((t, i) => {
        const ang = start + (end - start) * t;
        const x1 = cx + Math.cos(ang) * r;
        const y1 = cy + Math.sin(ang) * r;
        const x2 = cx + Math.cos(ang) * (r - (i % 5 === 0 ? 12 : 6));
        const y2 = cy + Math.sin(ang) * (r - (i % 5 === 0 ? 12 : 6));
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={INK}
            strokeWidth={i % 5 === 0 ? 1.2 : 0.6}
          />
        );
      })}
      {/* labels */}
      <text
        x={20}
        y={108}
        fontSize="8"
        fill={MUTE}
        letterSpacing="1.5"
      >
        STORMY
      </text>
      <text
        x={88}
        y={28}
        textAnchor="middle"
        fontSize="8"
        fill={MUTE}
        letterSpacing="1.5"
      >
        CHANGE
      </text>
      <text
        x={160}
        y={108}
        textAnchor="end"
        fontSize="8"
        fill={MUTE}
        letterSpacing="1.5"
      >
        FAIR
      </text>
      {/* needle */}
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={CRIMSON}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="4" fill={BRASS} stroke={INK} strokeWidth="1" />
    </svg>
  );
}

function Thermo({ values }: { values: number[] }) {
  const H = 160;
  const W = 60;
  const min = 94;
  const max = 102;
  const cur = values[values.length - 1];
  const y = (v: number) =>
    18 + ((max - v) / (max - min)) * (H - 40);
  const band = { lo: 94, hi: 96 };
  return (
    <svg width={W + 70} height={H} viewBox={`0 0 ${W + 70} ${H}`}>
      {/* Target band shading */}
      <rect
        x="16"
        y={y(band.hi)}
        width="14"
        height={y(band.lo) - y(band.hi)}
        fill={FOREST}
        opacity="0.18"
      />
      {/* Tube */}
      <rect
        x="16"
        y="14"
        width="14"
        height={H - 38}
        fill="none"
        stroke={INK}
        strokeWidth="1"
        rx="6"
      />
      {/* Mercury */}
      <rect
        x="18"
        y={y(cur)}
        width="10"
        height={H - 28 - y(cur)}
        fill={CRIMSON}
      />
      {/* Bulb */}
      <circle cx="23" cy={H - 18} r="10" fill={CRIMSON} stroke={INK} strokeWidth="1" />
      {/* Ticks */}
      {[94, 96, 98, 100, 102].map((t) => (
        <g key={t}>
          <line
            x1="32"
            x2="40"
            y1={y(t)}
            y2={y(t)}
            stroke={INK}
            strokeWidth="0.8"
          />
          <text
            x="44"
            y={y(t) + 3}
            fontSize="9"
            fill={INK}
            fontFamily="Newsreader, Georgia, serif"
          >
            {t}
          </text>
        </g>
      ))}
      <text
        x="44"
        y={y(95) + 3}
        fontSize="8"
        fill={FOREST}
        fontStyle="italic"
      >
        target
      </text>
    </svg>
  );
}

function WindRose() {
  const cx = 80;
  const cy = 80;
  const dirs = ["N", "E", "S", "W"];
  // 8 petals with varying lengths for 8 directions of dose times
  const petals = [0.75, 0.5, 0.85, 0.4, 0.3, 0.65, 0.25, 0.55];
  return (
    <svg width="170" height="170" viewBox="0 0 160 160">
      {/* concentric */}
      {[60, 45, 30, 15].map((r, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={LINE}
          strokeWidth="0.6"
        />
      ))}
      {/* axes */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * 60}
            y1={cy + Math.sin(a) * 60}
            x2={cx - Math.cos(a) * 60}
            y2={cy - Math.sin(a) * 60}
            stroke={LINE}
            strokeWidth="0.6"
          />
        );
      })}
      {/* petals */}
      {petals.map((p, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const len = 14 + p * 44;
        const w = 0.3;
        const x1 = cx + Math.cos(a - w) * len;
        const y1 = cy + Math.sin(a - w) * len;
        const x2 = cx + Math.cos(a + w) * len;
        const y2 = cy + Math.sin(a + w) * len;
        const hi = i === 1; // NE = strongest
        return (
          <polygon
            key={i}
            points={`${cx},${cy} ${x1},${y1} ${x2},${y2}`}
            fill={hi ? COBALT : BRASS}
            opacity={hi ? 0.9 : 0.55}
            stroke={INK}
            strokeWidth="0.6"
          />
        );
      })}
      {/* labels */}
      {dirs.map((d, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        return (
          <text
            key={d}
            x={cx + Math.cos(a) * 72}
            y={cy + Math.sin(a) * 72 + 3}
            textAnchor="middle"
            fontSize="9"
            fill={INK}
            fontFamily="Newsreader, Georgia, serif"
          >
            {d}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r="3" fill={INK} />
    </svg>
  );
}

function RainGauge({ mm }: { mm: number }) {
  const H = 100;
  const max = 10;
  const h = (mm / max) * (H - 20);
  return (
    <svg width="70" height={H} viewBox={`0 0 70 ${H}`}>
      <rect
        x="24"
        y="6"
        width="22"
        height={H - 18}
        fill="none"
        stroke={INK}
        strokeWidth="1"
        rx="2"
      />
      <rect
        x="26"
        y={H - 12 - h}
        width="18"
        height={h}
        fill={COBALT}
        opacity="0.65"
      />
      {[0, 2, 4, 6, 8, 10].map((t) => (
        <g key={t}>
          <line
            x1="46"
            x2="52"
            y1={H - 12 - (t / max) * (H - 18)}
            y2={H - 12 - (t / max) * (H - 18)}
            stroke={INK}
            strokeWidth="0.8"
          />
          <text
            x="55"
            y={H - 12 - (t / max) * (H - 18) + 3}
            fontSize="7"
            fill={MUTE}
          >
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Hygrometer({ pct }: { pct: number }) {
  const cx = 60;
  const cy = 70;
  const r = 46;
  const start = Math.PI;
  const end = 0;
  const a = start + (end - start) * pct;
  const nx = cx + Math.cos(a) * (r - 10);
  const ny = cy + Math.sin(a) * (r - 10);
  return (
    <svg width="140" height="90" viewBox="0 0 120 90">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={INK}
        strokeWidth="1"
      />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const ang = start + (end - start) * t;
        return (
          <line
            key={t}
            x1={cx + Math.cos(ang) * r}
            y1={cy + Math.sin(ang) * r}
            x2={cx + Math.cos(ang) * (r - 8)}
            y2={cy + Math.sin(ang) * (r - 8)}
            stroke={INK}
            strokeWidth="0.8"
          />
        );
      })}
      <text x={cx - r + 2} y={cy + 10} fontSize="7" fill={MUTE}>
        5h
      </text>
      <text x={cx + r - 10} y={cy + 10} fontSize="7" fill={MUTE}>
        9h
      </text>
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={FOREST}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="3" fill={BRASS} stroke={INK} strokeWidth="1" />
    </svg>
  );
}

function Chronograph({ pastPct }: { pastPct: number }) {
  const cx = 55;
  const cy = 55;
  const r = 42;
  const a = -Math.PI / 2 + pastPct * Math.PI * 2;
  const nx = cx + Math.cos(a) * (r - 10);
  const ny = cy + Math.sin(a) * (r - 10);
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="1" />
      {Array.from({ length: 60 }).map((_, i) => {
        const ang = -Math.PI / 2 + (i / 60) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(ang) * r}
            y1={cy + Math.sin(ang) * r}
            x2={cx + Math.cos(ang) * (r - (i % 5 === 0 ? 6 : 3))}
            y2={cy + Math.sin(ang) * (r - (i % 5 === 0 ? 6 : 3))}
            stroke={INK}
            strokeWidth={i % 5 === 0 ? 0.9 : 0.4}
          />
        );
      })}
      {/* marker at re-test */}
      <circle
        cx={cx + Math.cos(-Math.PI / 2 + Math.PI * 2) * (r - 10)}
        cy={cy + Math.sin(-Math.PI / 2 + Math.PI * 2) * (r - 10)}
        r="3"
        fill={CRIMSON}
      />
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={CRIMSON}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="3" fill={BRASS} stroke={INK} strokeWidth="1" />
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fontSize="7"
        fill={MUTE}
        letterSpacing="1"
      >
        DAYS
      </text>
    </svg>
  );
}

function Sundial({ pct }: { pct: number }) {
  const cx = 60;
  const cy = 80;
  const r = 50;
  const a = Math.PI + Math.PI * pct; // from west to east across top
  const sx = cx + Math.cos(a) * r * 0.8;
  const sy = cy + Math.sin(a) * r * 0.8;
  // gnomon shadow falls opposite
  const shx = cx + Math.cos(a + Math.PI) * r * 0.9;
  const shy = cy + Math.sin(a + Math.PI) * r * 0.9;
  return (
    <svg width="140" height="90" viewBox="0 0 120 90">
      <line x1="10" y1={cy} x2="110" y2={cy} stroke={INK} strokeWidth="1" />
      {/* hour ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const ang = Math.PI + Math.PI * t;
        return (
          <line
            key={t}
            x1={cx + Math.cos(ang) * r}
            y1={cy + Math.sin(ang) * r}
            x2={cx + Math.cos(ang) * (r - 6)}
            y2={cy + Math.sin(ang) * (r - 6)}
            stroke={INK}
            strokeWidth="0.8"
          />
        );
      })}
      {/* dome */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={LINE}
        strokeWidth="0.6"
        strokeDasharray="1 2"
      />
      {/* sun */}
      <circle cx={sx} cy={sy} r="7" fill={BRASS} stroke={INK} strokeWidth="1" />
      {/* gnomon + shadow */}
      <line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - 18}
        stroke={INK}
        strokeWidth="1.2"
      />
      <line
        x1={cx}
        y1={cy}
        x2={shx}
        y2={shy}
        stroke={INK}
        strokeWidth="1"
        opacity="0.5"
      />
      <text x="10" y={cy + 10} fontSize="7" fill={MUTE} letterSpacing="1">
        WK 1
      </text>
      <text
        x="108"
        y={cy + 10}
        fontSize="7"
        fill={MUTE}
        letterSpacing="1"
        textAnchor="end"
      >
        WK 12
      </text>
    </svg>
  );
}
