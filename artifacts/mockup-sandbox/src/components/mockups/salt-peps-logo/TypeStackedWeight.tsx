// Concept 1 — STACKED WEIGHT
// Inspired by ACTIIV HYDRATE: radical weight contrast, stacked typographic lockup.
// "SALT &" thin / "PEPS" ultra-black, widths optically balanced.

export default function TypeStackedWeight() {
  const Mark = ({ bg, color, accentColor }: { bg: string; color: string; accentColor: string }) => (
    <div
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "0 48px",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
          fontSize: 52,
          letterSpacing: "0.32em",
          color,
          textTransform: "uppercase",
          opacity: 0.7,
          marginBottom: 4,
        }}
      >
        SALT &amp;
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: 148,
          letterSpacing: "-0.04em",
          color,
          textTransform: "uppercase",
          lineHeight: 0.88,
        }}
      >
        PEPS
      </div>
      <div
        style={{
          width: 48,
          height: 3,
          background: accentColor,
          marginTop: 22,
          borderRadius: 2,
        }}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Section 1 — Dark hero */}
      <div style={{ flex: "0 0 50vh", background: "#080C14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 28, left: 36, fontSize: 9, letterSpacing: "0.3em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
          STACKED WEIGHT
        </div>
        <Mark bg="transparent" color="#FFFFFF" accentColor="#2D6BCC" />
      </div>

      {/* Section 2 — Light hero */}
      <div style={{ flex: "0 0 42vh", background: "#F5F6F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mark bg="transparent" color="#080C14" accentColor="#2D6BCC" />
      </div>

      {/* Section 3 — Brand strip */}
      <div style={{ flex: 1, background: "#2D6BCC", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 300, fontSize: 11, letterSpacing: "0.3em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>SALT &amp;</span>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em", color: "#FFF", textTransform: "uppercase", lineHeight: 1 }}>PEPS</span>
        </div>
        <span style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>ADVANCED PEPTIDE SCIENCE</span>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>EST. 2024</span>
      </div>
    </div>
  );
}
