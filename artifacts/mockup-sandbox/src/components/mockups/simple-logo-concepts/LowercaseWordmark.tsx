export default function LowercaseWordmark() {
  const wordmark = (size: number, fg: string, accent: string) => (
    <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
      <span style={{ fontSize: size, fontWeight: 600, color: fg, letterSpacing: `${size * -0.03}px` }}>Salt</span>
      <span style={{ fontSize: size, fontWeight: 300, color: accent, letterSpacing: `${size * -0.01}px` }}>&amp;</span>
      <span style={{ fontSize: size, fontWeight: 600, color: fg, letterSpacing: `${size * -0.03}px` }}>Peps</span>
    </div>
  );

  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 44, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Large — on white */}
      {wordmark(72, "#0F0F0E", "#2A5CE6")}

      {/* Medium — on dark pill */}
      <div style={{
        background: "#0F0F0E", borderRadius: 16, padding: "20px 36px",
      }}>
        {wordmark(48, "#FAFAF8", "#5B8FE8")}
      </div>

      {/* Small — app badge */}
      <div style={{
        background: "#0F0F0E", borderRadius: 12, padding: "10px 18px",
      }}>
        {wordmark(28, "#FAFAF8", "#5B8FE8")}
      </div>
    </div>
  );
}
