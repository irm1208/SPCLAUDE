export default function CircleMonogram() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 56, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Filled circle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "#0F0F0E",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 42, fontWeight: 700, color: "#FAFAF8",
            letterSpacing: "-1px", lineHeight: 1,
          }}>S·P</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "5px",
          color: "#999", textTransform: "uppercase",
        }}>Salt &amp; Peps</span>
      </div>

      {/* Outlined circle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          border: "2.5px solid #0F0F0E",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 42, fontWeight: 700, color: "#0F0F0E",
            letterSpacing: "-1px", lineHeight: 1,
          }}>S·P</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "5px",
          color: "#999", textTransform: "uppercase",
        }}>Salt &amp; Peps</span>
      </div>

      {/* Blue accent */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "#2A5CE6",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 42, fontWeight: 700, color: "#fff",
            letterSpacing: "-1px", lineHeight: 1,
          }}>S·P</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "5px",
          color: "#999", textTransform: "uppercase",
        }}>Salt &amp; Peps</span>
      </div>
    </div>
  );
}
