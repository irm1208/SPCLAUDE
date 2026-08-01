export default function LowercaseWordmark() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 40, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Main wordmark */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
        <span style={{ fontSize: 68, fontWeight: 600, color: "#0F0F0E", letterSpacing: "-2px" }}>salt</span>
        <span style={{
          fontSize: 68, fontWeight: 300, color: "#2A5CE6",
          letterSpacing: "-1px", margin: "0 6px",
        }}>&amp;</span>
        <span style={{ fontSize: 68, fontWeight: 600, color: "#0F0F0E", letterSpacing: "-2px" }}>peps</span>
      </div>

      {/* With tagline */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{ fontSize: 44, fontWeight: 600, color: "#0F0F0E", letterSpacing: "-1.5px" }}>salt</span>
          <span style={{
            fontSize: 44, fontWeight: 300, color: "#2A5CE6",
            letterSpacing: "-1px", margin: "0 4px",
          }}>&amp;</span>
          <span style={{ fontSize: 44, fontWeight: 600, color: "#0F0F0E", letterSpacing: "-1.5px" }}>peps</span>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 500, letterSpacing: "5px",
          color: "#BBBBB0", textTransform: "uppercase",
        }}>group buy collective</div>
      </div>

      {/* Compact / app icon feel */}
      <div style={{
        background: "#0F0F0E", borderRadius: 16, padding: "18px 28px",
        display: "flex", alignItems: "baseline", gap: 0,
      }}>
        <span style={{ fontSize: 36, fontWeight: 600, color: "#FAFAF8", letterSpacing: "-1.5px" }}>salt</span>
        <span style={{
          fontSize: 36, fontWeight: 300, color: "#5B8FE8",
          letterSpacing: "-1px", margin: "0 4px",
        }}>&amp;</span>
        <span style={{ fontSize: 36, fontWeight: 600, color: "#FAFAF8", letterSpacing: "-1.5px" }}>peps</span>
      </div>
    </div>
  );
}
