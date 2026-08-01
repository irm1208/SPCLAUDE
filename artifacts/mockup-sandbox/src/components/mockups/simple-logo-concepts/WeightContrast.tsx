export default function WeightContrast() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 48, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Light on white */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 0.9 }}>
          <span style={{ fontSize: 64, fontWeight: 100, letterSpacing: "8px", color: "#0F0F0E" }}>SALT</span>
          <span style={{ fontSize: 64, fontWeight: 100, letterSpacing: "8px", color: "#0F0F0E", margin: "0 4px" }}>&amp;</span>
          <span style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-2px", color: "#0F0F0E" }}>PEPS</span>
        </div>
      </div>

      {/* Reverse — dark bg */}
      <div style={{
        background: "#0F0F0E", padding: "32px 48px", borderRadius: 12,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 0.9 }}>
          <span style={{ fontSize: 64, fontWeight: 100, letterSpacing: "8px", color: "#FAFAF8" }}>SALT</span>
          <span style={{ fontSize: 64, fontWeight: 100, letterSpacing: "8px", color: "#5B8FE8", margin: "0 4px" }}>&amp;</span>
          <span style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-2px", color: "#FAFAF8" }}>PEPS</span>
        </div>
      </div>
    </div>
  );
}
