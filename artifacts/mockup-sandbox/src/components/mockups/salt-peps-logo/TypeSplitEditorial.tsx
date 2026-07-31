// Concept 4 — SPLIT EDITORIAL
// Magazine masthead tension: "SALT" flush-left / "PEPS" flush-right,
// a hairline rule in between, the "&" as a floating central accent.

export default function TypeSplitEditorial() {
  const EditorialMark = ({ textColor, ruleColor, ampColor }: { textColor: string; ruleColor: string; ampColor: string }) => (
    <div style={{ width: "100%", maxWidth: 680, userSelect: "none", padding: "0 8px" }}>
      {/* Top word — left aligned */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 800,
        fontSize: 100,
        letterSpacing: "-0.04em",
        color: textColor,
        textTransform: "uppercase",
        lineHeight: 0.9,
        textAlign: "left",
        opacity: 0.4,
      }}>SALT</div>

      {/* Rule with & accent */}
      <div style={{ display: "flex", alignItems: "center", margin: "12px 0" }}>
        <div style={{ flex: 1, height: 1.5, background: ruleColor, opacity: 0.3 }} />
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 200,
          fontSize: 28,
          color: ampColor,
          letterSpacing: "0.1em",
          padding: "0 18px",
          lineHeight: 1,
        }}>&amp;</span>
        <div style={{ flex: 1, height: 1.5, background: ruleColor, opacity: 0.3 }} />
      </div>

      {/* Bottom word — right aligned */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 900,
        fontSize: 100,
        letterSpacing: "-0.04em",
        color: textColor,
        textTransform: "uppercase",
        lineHeight: 0.9,
        textAlign: "right",
      }}>PEPS</div>
    </div>
  );

  const HorizLockup = ({ textColor, dotColor }: { textColor: string; dotColor: string }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 0, fontFamily: "'Inter', sans-serif", userSelect: "none" }}>
      <span style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em", color: textColor }}>SALT</span>
      <span style={{ fontWeight: 300, fontSize: 20, color: dotColor, margin: "0 8px", lineHeight: 1 }}>&amp;</span>
      <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em", color: textColor }}>PEPS</span>
      <span style={{ fontWeight: 200, fontSize: 10, color: textColor, opacity: 0.4, letterSpacing: "0.2em", marginLeft: 12, textTransform: "uppercase", alignSelf: "flex-end", marginBottom: 4 }}>®</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
      {/* Section 1 — Pure white, editorial mark */}
      <div style={{ flex: "0 0 56vh", background: "#FAFBFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "0 64px" }}>
        <div style={{ position: "absolute", top: 28, left: 40, fontSize: 9, letterSpacing: "0.3em", color: "#94A3B8", textTransform: "uppercase" }}>
          SPLIT EDITORIAL
        </div>
        <EditorialMark textColor="#0A1628" ruleColor="#0A1628" ampColor="#2D6BCC" />
      </div>

      {/* Section 2 — Dark with horizontal lockup */}
      <div style={{ flex: "0 0 34vh", background: "#0A1628", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <HorizLockup textColor="#FFFFFF" dotColor="#4A8FE8" />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.2)" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.4em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
            ADVANCED PEPTIDE SCIENCE
          </span>
          <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.2)" }} />
        </div>
      </div>

      {/* Section 3 — Tight footer strip */}
      <div style={{ flex: 1, background: "#2D6BCC", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.9)", textTransform: "uppercase" }}>
          SALT &amp; PEPS
        </span>
        <div style={{ height: 18, width: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.35em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
          PHARMACEUTICAL GRADE
        </span>
        <div style={{ height: 18, width: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.25em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
          EST. 2024
        </span>
      </div>
    </div>
  );
}
