export default function DotMark() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 32, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Mark */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{
            fontSize: 72, fontWeight: 800, letterSpacing: "-3px", color: "#0F0F0E",
            lineHeight: 1,
          }}>S</span>
          {/* salt crystal dot */}
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#0F0F0E", margin: "0 3px 28px",
            flexShrink: 0, display: "block",
          }} />
          <span style={{
            fontSize: 72, fontWeight: 800, letterSpacing: "-3px", color: "#0F0F0E",
            lineHeight: 1,
          }}>P</span>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "6px", color: "#999",
          textTransform: "uppercase",
        }}>Salt &amp; Peps</div>
      </div>

      {/* dark variant */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        background: "#0F0F0E", padding: "28px 44px", borderRadius: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{
            fontSize: 72, fontWeight: 800, letterSpacing: "-3px", color: "#FAFAF8",
            lineHeight: 1,
          }}>S</span>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#E8D5A3", margin: "0 3px 28px",
            flexShrink: 0, display: "block",
          }} />
          <span style={{
            fontSize: 72, fontWeight: 800, letterSpacing: "-3px", color: "#FAFAF8",
            lineHeight: 1,
          }}>P</span>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "6px", color: "#666",
          textTransform: "uppercase",
        }}>Salt &amp; Peps</div>
      </div>
    </div>
  );
}
