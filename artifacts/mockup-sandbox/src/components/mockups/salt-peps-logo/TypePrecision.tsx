// Concept 5 — PHARMACEUTICAL PRECISION
// Ultra-wide tracking, clinical weight, all one register.
// The brand name becomes a measured, scientific statement.
// Inspired by lab labeling, clinical trial identifiers, compound naming conventions.

export default function TypePrecision() {
  const PrecisionMark = ({ textColor, accentColor }: { textColor: string; accentColor: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", userSelect: "none" }}>
      {/* Main wordmark — ultra-tracked */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 62,
        letterSpacing: "0.38em",
        color: textColor,
        textTransform: "uppercase",
        lineHeight: 1,
        paddingRight: "0.38em", // compensate for trailing space from letter-spacing
      }}>
        SALT&amp;PEPS
      </div>
      {/* Precision rule */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 14, width: "100%" }}>
        <div style={{ flex: 1, height: 1, background: accentColor, opacity: 0.8 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, margin: "0 8px", flexShrink: 0 }} />
        <div style={{ flex: 1, height: 1, background: accentColor, opacity: 0.8 }} />
      </div>
      {/* Descriptor */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
        fontSize: 10,
        letterSpacing: "0.5em",
        color: textColor,
        opacity: 0.45,
        textTransform: "uppercase",
        marginTop: 10,
        paddingRight: "0.5em",
      }}>
        PEPTIDE · SCIENCE
      </div>
    </div>
  );

  const CompactMark = ({ textColor, accentColor }: { textColor: string; accentColor: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, userSelect: "none" }}>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: "0.28em",
        color: textColor,
        textTransform: "uppercase",
        paddingRight: "0.28em",
      }}>SALT&amp;PEPS</div>
      <div style={{ height: 1.5, width: "100%", background: accentColor, opacity: 0.7 }} />
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
        fontSize: 8,
        letterSpacing: "0.4em",
        color: textColor,
        opacity: 0.35,
        textTransform: "uppercase",
        paddingRight: "0.4em",
      }}>PEPTIDE SCIENCE</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
      {/* Section 1 — Deep clinical dark */}
      <div style={{
        flex: "0 0 50vh",
        background: "#060D1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "0 64px",
      }}>
        <div style={{ position: "absolute", top: 28, left: 40, fontSize: 9, letterSpacing: "0.3em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
          PHARMACEUTICAL PRECISION
        </div>
        {/* Grid lines for clinical feel */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(45,107,204,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(45,107,204,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <PrecisionMark textColor="#FFFFFF" accentColor="#4A8FE8" />
      </div>

      {/* Section 2 — Clean white */}
      <div style={{
        flex: "0 0 38vh",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 22, right: 36, fontSize: 9, letterSpacing: "0.25em", color: "#CBD5E1", textTransform: "uppercase" }}>
          REVERSED
        </div>
        <PrecisionMark textColor="#060D1A" accentColor="#2D6BCC" />
      </div>

      {/* Section 3 — Navy usage strip */}
      <div style={{
        flex: 1,
        background: "#0F2044",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        borderTop: "2px solid #2D6BCC",
      }}>
        <CompactMark textColor="#FFFFFF" accentColor="#4A8FE8" />
        <div style={{ display: "flex", gap: 32 }}>
          {[["#060D1A","#000"], ["#2D6BCC","#007"], ["#4A8FE8","#48E"], ["#F0F4F8","#F4F"]].map(([hex]) => (
            <div key={hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: hex, border: hex === "#F0F4F8" ? "1px solid rgba(255,255,255,0.1)" : "none" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 7.5, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>{hex}</span>
            </div>
          ))}
        </div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          EST. 2024
        </span>
      </div>
    </div>
  );
}
