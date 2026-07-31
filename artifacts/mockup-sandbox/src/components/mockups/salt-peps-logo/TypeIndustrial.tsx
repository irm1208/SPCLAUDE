// Concept 3 — INDUSTRIAL CONDENSED
// Newspaper masthead energy: extreme condensed, architectural block letters.
// "S" and "P" as massive flanking anchors with "&" as a structural connector.

export default function TypeIndustrial() {
  const MastheadMark = ({ textColor, accentColor, bg }: { textColor: string; accentColor: string; bg: string }) => (
    <div style={{ background: bg, padding: "0 48px", display: "flex", flexDirection: "column", alignItems: "center", userSelect: "none" }}>
      {/* S & P masthead row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: 180,
          letterSpacing: "-0.06em",
          color: textColor,
          lineHeight: 0.85,
        }}>S</span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 200,
          fontSize: 80,
          color: accentColor,
          letterSpacing: 0,
          margin: "0 -4px 0 4px",
          lineHeight: 0.85,
          alignSelf: "center",
        }}>&amp;</span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: 180,
          letterSpacing: "-0.06em",
          color: textColor,
          lineHeight: 0.85,
        }}>P</span>
      </div>
      {/* Subtitle rule */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <div style={{ flex: 1, height: 1, background: textColor, opacity: 0.2, minWidth: 60 }} />
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          fontSize: 11,
          letterSpacing: "0.45em",
          color: textColor,
          opacity: 0.55,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>SALT &amp; PEPS</span>
        <div style={{ flex: 1, height: 1, background: textColor, opacity: 0.2, minWidth: 60 }} />
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
          fontSize: 9,
          letterSpacing: "0.35em",
          color: textColor,
          opacity: 0.3,
          textTransform: "uppercase",
        }}>ADVANCED PEPTIDE SCIENCE</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
      {/* Section 1 — Off-white */}
      <div style={{ flex: "0 0 52vh", background: "#F7F8FA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 28, left: 40, fontSize: 9, letterSpacing: "0.3em", color: "#94A3B8", textTransform: "uppercase" }}>
          INDUSTRIAL CONDENSED
        </div>
        <MastheadMark textColor="#080C14" accentColor="#2D6BCC" bg="transparent" />
      </div>

      {/* Section 2 — Black */}
      <div style={{ flex: "0 0 38vh", background: "#080C14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MastheadMark textColor="#FFFFFF" accentColor="#4A8FE8" bg="transparent" />
      </div>

      {/* Section 3 — Navy accent strip */}
      <div style={{ flex: 1, background: "#1B3A7A", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "-0.04em", color: "#FFF" }}>S&amp;P</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.3em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>PEPTIDES</span>
        </div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>EST. 2024</span>
      </div>
    </div>
  );
}
