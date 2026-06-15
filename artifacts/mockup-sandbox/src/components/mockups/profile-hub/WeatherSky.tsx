// Axis: the whole page is a single painted sky that IS the data.
// Sun height = where you are in today's dose window.
// Cloud density = stress / missed-dose pressure.
// Stars at twilight = adherence streak count.
// Raindrops = missed doses in the current block.
// A bird's flight arc = weight trajectory across 30 days.
// A distant mountain line = 12-week protocol, with a flag at today.
// Readouts are small annotations in the margins, like a naturalist's
// sketchbook.

const DEEP = "#0E1B33";
const DUSK = "#3B3F7A";
const ROSE = "#E07B73";
const PEACH = "#F7B37A";
const SUN = "#FFE19A";
const INK = "#11131A";
const PAPER_INK = "#F3ECD8";

export function WeatherSky() {
  const streakStars = 7;
  const missedDrops = 3;
  // Weight trajectory points (30 days, normalized)
  const weight = Array.from({ length: 30 }).map((_, i) => {
    const t = i / 29;
    return 0.15 + (1 - t) * 0.35 + Math.sin(t * 6) * 0.02;
  });
  // Mountain / protocol (12 weeks) — current at week 8
  const currentWeek = 8;
  const totalWeeks = 12;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        color: PAPER_INK,
        background: `
          radial-gradient(ellipse at 78% 28%, rgba(255,225,154,0.35) 0%, transparent 40%),
          linear-gradient(180deg, ${DEEP} 0%, ${DUSK} 45%, ${ROSE} 72%, ${PEACH} 92%, ${SUN} 100%)
        `,
      }}
    >
      {/* chrome */}
      <div
        className="flex items-center justify-between px-8 py-4 text-[10px] tracking-[0.3em] uppercase relative z-10"
        style={{
          color: PAPER_INK,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-semibold"
            style={{
              border: "1px solid rgba(255,255,255,0.35)",
              color: PAPER_INK,
            }}
          >
            S&amp;P
          </div>
          <span>@iam0121 · sky for 16 Apr</span>
        </span>
        <span style={{ opacity: 0.7 }}>
          painted from your last 30 days
        </span>
      </div>

      {/* headline in the upper margin */}
      <div className="px-8 pt-7 relative z-10">
        <div
          className="text-[10px] tracking-[0.35em] uppercase"
          style={{ color: PAPER_INK, opacity: 0.7 }}
        >
          Today's sky
        </div>
        <h1
          className="mt-1 tracking-[-0.015em]"
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 32,
            fontWeight: 400,
            color: PAPER_INK,
          }}
        >
          Dusk settling · a dose due at twilight.
        </h1>
      </div>

      {/* The painting itself */}
      <svg
        viewBox="0 0 900 520"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 520,
          display: "block",
          marginTop: -20,
        }}
      >
        <defs>
          <radialGradient id="sunHalo" cx="0.72" cy="0.28">
            <stop offset="0" stopColor="#FFF0B8" stopOpacity="0.9" />
            <stop offset="0.35" stopColor={SUN} stopOpacity="0.35" />
            <stop offset="1" stopColor={SUN} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mountains" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1A1E3A" stopOpacity="0.85" />
            <stop offset="1" stopColor="#1A1E3A" stopOpacity="0.95" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Sun halo */}
        <circle cx="648" cy="146" r="180" fill="url(#sunHalo)" />
        {/* Sun disc — position = today's dose window */}
        <circle cx="648" cy="146" r="44" fill={SUN} opacity="0.95" />
        <circle
          cx="648"
          cy="146"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
        />

        {/* Stars = adherence streak */}
        {Array.from({ length: streakStars }).map((_, i) => {
          const positions = [
            [90, 70],
            [180, 40],
            [260, 90],
            [380, 58],
            [470, 100],
            [120, 130],
            [310, 35],
            [510, 45],
          ];
          const [x, y] = positions[i % positions.length];
          return <Star key={i} x={x} y={y} />;
        })}

        {/* Clouds = stress (3 light clouds, calm) */}
        <Cloud x={120} y={170} scale={1} />
        <Cloud x={360} y={200} scale={0.75} />
        <Cloud x={540} y={250} scale={1.1} />

        {/* Rain (missed doses) — from the larger cloud */}
        {Array.from({ length: missedDrops }).map((_, i) => (
          <g
            key={i}
            transform={`translate(${540 + i * 18 - 18}, ${270})`}
          >
            <path
              d="M0 0 Q0 8 4 12 Q0 18 -4 12 Q0 8 0 0 Z"
              fill={ROSE}
              opacity="0.65"
            />
          </g>
        ))}

        {/* Mountain line = protocol length; flag = today */}
        <path
          d={mountainPath(totalWeeks, 0, 420, 900, 70)}
          fill="url(#mountains)"
          opacity="0.9"
        />
        {/* today flag */}
        {(() => {
          const x = (currentWeek / totalWeeks) * 900;
          const y = 420 - peakY(currentWeek, totalWeeks, 70) + 8;
          return (
            <g>
              <line x1={x} y1={y} x2={x} y2={y - 28} stroke={PAPER_INK} strokeWidth="1" />
              <polygon
                points={`${x},${y - 28} ${x + 14},${y - 24} ${x},${y - 20}`}
                fill={SUN}
                stroke={INK}
                strokeWidth="0.5"
              />
              <circle cx={x} cy={y} r="3" fill={PAPER_INK} />
            </g>
          );
        })()}
        {/* week tick marks on baseline */}
        {Array.from({ length: totalWeeks + 1 }).map((_, i) => {
          const x = (i / totalWeeks) * 900;
          return (
            <line
              key={i}
              x1={x}
              y1={488}
              x2={x}
              y2={492}
              stroke={PAPER_INK}
              strokeWidth="0.8"
              opacity="0.6"
            />
          );
        })}

        {/* Bird flight path = weight trajectory (downward gentle) */}
        {(() => {
          const pts = weight.map((w, i) => {
            const x = 40 + (i / (weight.length - 1)) * 820;
            const y = 310 - w * 200;
            return [x, y] as const;
          });
          const d = pts
            .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
            .join(" ");
          const [bx, by] = pts[pts.length - 1];
          return (
            <>
              <path
                d={d}
                fill="none"
                stroke={PAPER_INK}
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.65"
              />
              {/* bird glyph */}
              <g transform={`translate(${bx}, ${by})`}>
                <path
                  d="M -8 0 q 4 -5 8 0 q 4 -5 8 0"
                  fill="none"
                  stroke={PAPER_INK}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </g>
            </>
          );
        })()}

        {/* Horizon line */}
        <line
          x1="0"
          y1="490"
          x2="900"
          y2="490"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.5"
        />
      </svg>

      {/* Naturalist margin annotations */}
      <div
        className="absolute left-6 right-6 bottom-4 grid gap-x-6 gap-y-2 text-[11px] leading-snug"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          color: PAPER_INK,
          opacity: 0.92,
        }}
      >
        <Anno
          italic="sun"
          text="low on the horizon — 9h 14m until the evening dose window."
        />
        <Anno
          italic="seven stars"
          text="one for each day of your current adherence streak."
        />
        <Anno
          italic="three drops"
          text="three missed doses this block · last on day 18."
        />
        <Anno
          italic="the bird"
          text="weight trajectory across 30 days · now at 95.7 kg."
        />
      </div>

      {/* Small readouts in the upper-left sky, handwritten-feel */}
      <aside
        className="absolute top-[110px] left-8 text-[12px] leading-[1.5]"
        style={{
          color: PAPER_INK,
          opacity: 0.85,
          fontFamily: "'Newsreader', Georgia, serif",
          fontStyle: "italic",
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 2 }}>
          READINGS
        </div>
        <div className="mt-1">Energy · 7.1 / 10</div>
        <div>Sleep · 7h 22m</div>
        <div>Supply · 3 wk</div>
      </aside>
    </div>
  );
}

function Anno({ italic, text }: { italic: string; text: string }) {
  return (
    <div>
      <span
        style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontStyle: "italic",
          fontSize: 13,
          color: PAPER_INK,
        }}
      >
        {italic}
      </span>{" "}
      <span style={{ opacity: 0.8 }}>— {text}</span>
    </div>
  );
}

function Star({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="1.6" fill="#FFF5D1" />
      <circle r="0.6" fill="#FFFFFF" />
      <line x1="-4" y1="0" x2="4" y2="0" stroke="#FFF5D1" strokeWidth="0.3" opacity="0.6" />
      <line x1="0" y1="-4" x2="0" y2="4" stroke="#FFF5D1" strokeWidth="0.3" opacity="0.6" />
    </g>
  );
}

function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="44" ry="12" fill="rgba(255,255,255,0.35)" />
      <ellipse cx="-24" cy="-6" rx="22" ry="9" fill="rgba(255,255,255,0.45)" />
      <ellipse cx="18" cy="-4" rx="28" ry="10" fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

function peakY(i: number, total: number, amp: number) {
  // gentle dome centered at middle of protocol
  const t = i / total;
  return Math.sin(t * Math.PI) * amp + 10;
}

function mountainPath(total: number, x0: number, yBase: number, width: number, amp: number) {
  let d = `M ${x0} ${yBase} `;
  const steps = total * 4;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + t * width;
    // double-hump mountain range
    const y =
      yBase -
      (Math.sin(t * Math.PI) * amp +
        Math.sin(t * Math.PI * 3) * (amp * 0.35) +
        Math.sin(t * Math.PI * 7) * (amp * 0.12));
    d += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  d += `L ${x0 + width} ${yBase + 40} L ${x0} ${yBase + 40} Z`;
  return d;
}
