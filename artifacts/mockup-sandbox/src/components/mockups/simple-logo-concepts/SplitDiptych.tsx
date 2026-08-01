export default function SplitDiptych() {
  const Mark = ({
    bg = "#FAFAF8",
    leftBg = "#FAFAF8",
    rightBg = "#0F0F0E",
    leftText = "#0F0F0E",
    rightText = "#FAFAF8",
    ruleColor = "#2A5CE6",
    ampColor = "#2A5CE6",
    size = 52,
    radius = 12,
  }: {
    bg?: string; leftBg?: string; rightBg?: string;
    leftText?: string; rightText?: string;
    ruleColor?: string; ampColor?: string;
    size?: number; radius?: number;
  }) => (
    <div style={{
      display: "inline-flex", alignItems: "stretch",
      borderRadius: radius, overflow: "hidden",
      boxShadow: bg === "#FAFAF8" ? "0 0 0 1.5px #E8E8E4" : "none",
      background: bg,
    }}>
      {/* SALT panel */}
      <div style={{
        background: leftBg,
        padding: `${size * 0.4}px ${size * 0.56}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: size, fontWeight: 700, color: leftText,
          letterSpacing: `${size * -0.02}px`, lineHeight: 1,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>SALT</span>
      </div>

      {/* Divider + & */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 1,
      }}>
        {/* vertical rule */}
        <div style={{
          width: 1.5,
          height: "100%",
          position: "absolute",
          background: ruleColor,
          opacity: 0.5,
        }} />
        {/* & badge */}
        <div style={{
          width: size * 0.7, height: size * 0.7,
          borderRadius: "50%",
          background: ampColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", zIndex: 2,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: size * 0.36, fontWeight: 300, color: "#fff",
            lineHeight: 1, fontFamily: "'Inter', system-ui, sans-serif",
          }}>&amp;</span>
        </div>
      </div>

      {/* PEPS panel */}
      <div style={{
        background: rightBg,
        padding: `${size * 0.4}px ${size * 0.56}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: size, fontWeight: 700, color: rightText,
          letterSpacing: `${size * -0.02}px`, lineHeight: 1,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>PEPS</span>
      </div>
    </div>
  );

  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#FAFAF8", gap: 36,
    }}>
      {/* Primary — split light/dark */}
      <Mark size={52} radius={14} />

      {/* All-dark variant */}
      <Mark
        leftBg="#161614" rightBg="#1E1E1B"
        leftText="#FAFAF8" rightText="#FAFAF8"
        ruleColor="#5B8FE8" ampColor="#2A5CE6"
        size={44} radius={12}
      />

      {/* Compact icon-size */}
      <Mark size={26} radius={8} />
    </div>
  );
}
