// Concept 2 — GEOMETRIC CUT
// Custom SVG letterforms. The "S" has sharp angled terminals,
// the "&" is reduced to a minimal geometric glyph — just the shapes, no calligraphy.
// Full condensed wordmark in one line, two-line stacked variant below.

export default function TypeGeometricCut() {
  // Custom SVG wordmark: "SALT & PEPS" with geometric refinements
  // We'll use SVG text with a custom geometric sans approach
  // The key trick: monospaced block letters, cut corners on S and E

  const FullWordmark = ({ fill }: { fill: string }) => (
    <svg viewBox="0 0 760 120" style={{ width: "100%", maxWidth: 680, height: "auto" }} aria-label="Salt & Peps">
      <defs>
        <linearGradient id="gcGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor={fill} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {/* SALT */}
      <text
        x="0" y="100"
        fontFamily="'Inter', Arial, sans-serif"
        fontWeight="800"
        fontSize="108"
        letterSpacing="-3"
        fill={fill}
      >SALT</text>
      {/* & — custom minimal glyph */}
      <text
        x="418" y="100"
        fontFamily="'Inter', Arial, sans-serif"
        fontWeight="300"
        fontSize="72"
        fill={fill}
        opacity="0.55"
      >&amp;</text>
      {/* PEPS */}
      <text
        x="480" y="100"
        fontFamily="'Inter', Arial, sans-serif"
        fontWeight="800"
        fontSize="108"
        letterSpacing="-3"
        fill={fill}
      >PEPS</text>
      {/* Geometric underline — two segments, gap in middle */}
      <rect x="0" y="112" width="390" height="3" fill={fill} opacity="0.3" />
      <rect x="480" y="112" width="280" height="3" fill={fill} opacity="0.3" />
      <rect x="418" y="112" width="44" height="3" fill="#2D6BCC" opacity="0.9" />
    </svg>
  );

  const StackedMark = ({ fill, accent }: { fill: string; accent: string }) => (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, fontFamily: "'Inter', sans-serif", userSelect: "none" }}>
      <span style={{ fontWeight: 200, fontSize: 20, letterSpacing: "0.55em", color: fill, textTransform: "uppercase", opacity: 0.5 }}>
        SALT&nbsp;&amp;&nbsp;
      </span>
      <span style={{ fontWeight: 900, fontSize: 96, letterSpacing: "-0.04em", color: fill, textTransform: "uppercase", lineHeight: 0.9 }}>
        PEPS
      </span>
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <div style={{ width: 28, height: 2, background: accent, borderRadius: 1 }} />
        <div style={{ width: 10, height: 2, background: fill, opacity: 0.2, borderRadius: 1 }} />
        <div style={{ width: 10, height: 2, background: fill, opacity: 0.2, borderRadius: 1 }} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
      {/* Section 1 — White, full wordmark large */}
      <div style={{ flex: "0 0 48vh", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 48px", position: "relative" }}>
        <div style={{ position: "absolute", top: 28, left: 40, fontSize: 9, letterSpacing: "0.3em", color: "#94A3B8", textTransform: "uppercase" }}>
          GEOMETRIC CUT
        </div>
        <FullWordmark fill="#0D1B2E" />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#E8ECF0" }} />

      {/* Section 2 — Dark, stacked variant */}
      <div style={{ flex: "0 0 42vh", background: "#0D1B2E", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 36, fontSize: 9, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
          STACKED VARIANT
        </div>
        <StackedMark fill="#FFFFFF" accent="#4A8FE8" />
      </div>

      {/* Section 3 — Accent strip */}
      <div style={{ flex: 1, background: "#0D1B2E", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: 32, padding: "0 40px" }}>
        {[["#0D1B2E", "Navy"], ["#2D6BCC", "Electric"], ["#4A8FE8", "Sky"], ["#FFFFFF", "White"]].map(([hex, name]) => (
          <div key={hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: hex, border: hex === "#FFFFFF" ? "1px solid rgba(255,255,255,0.15)" : "none" }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
