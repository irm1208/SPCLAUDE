export default function AmpersandHero() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 56, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Light version */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "4px",
            color: "#888", textTransform: "uppercase", writingMode: "vertical-rl",
            textOrientation: "mixed", transform: "rotate(180deg)",
          }}>SALT</span>
          <span style={{
            fontSize: 140, fontWeight: 800, color: "#0F0F0E",
            lineHeight: 1, letterSpacing: "-6px",
          }}>&amp;</span>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "4px",
            color: "#888", textTransform: "uppercase", writingMode: "vertical-rl",
            textOrientation: "mixed",
          }}>PEPS</span>
        </div>
      </div>

      {/* Dark version */}
      <div style={{
        background: "#0F0F0E", padding: "32px 40px", borderRadius: 12,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "4px",
            color: "#555", textTransform: "uppercase", writingMode: "vertical-rl",
            textOrientation: "mixed", transform: "rotate(180deg)",
          }}>SALT</span>
          <span style={{
            fontSize: 140, fontWeight: 800, color: "#FAFAF8",
            lineHeight: 1, letterSpacing: "-6px",
          }}>&amp;</span>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "4px",
            color: "#555", textTransform: "uppercase", writingMode: "vertical-rl",
            textOrientation: "mixed",
          }}>PEPS</span>
        </div>
      </div>
    </div>
  );
}
