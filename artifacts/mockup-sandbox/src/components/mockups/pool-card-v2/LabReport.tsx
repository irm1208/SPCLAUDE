export function LabReport() {
  const navy = "#1B3A7A";
  const mono = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";

  const fields = [
    { label: "COMPOUND", value: "Retatrutide" },
    { label: "BATCH ID", value: "RE40-0228" },
    { label: "VENDOR", value: "Uther" },
    { label: "DOSAGE", value: "40 mg / vial" },
    { label: "STATUS", value: "COLLECTING", highlight: true },
    { label: "GOAL", value: "$480.00 USD" },
    { label: "RAISED", value: "$40.00 USD" },
    { label: "PROGRESS", value: "8.3%" },
    { label: "BACKERS", value: "1 contributor" },
    { label: "POOL ID", value: "pool/retatrutide-uther-re40" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#F0EBE3", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 400, background: "#fff", borderRadius: 4, boxShadow: "0 2px 20px rgba(27,58,122,0.08)", border: "1px solid #CBD5E1", overflow: "hidden" }}>

        {/* Document header */}
        <div style={{ background: navy, padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, fontFamily: mono, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", marginBottom: 3 }}>PEPS ANONYMOUS / TESTING POOL</div>
              <div style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>POOL REPORT</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, fontFamily: mono, color: "rgba(255,255,255,0.4)" }}>ISSUED</div>
              <div style={{ fontSize: 10, fontFamily: mono, color: "rgba(255,255,255,0.75)" }}>2026-04-26</div>
            </div>
          </div>
        </div>

        {/* Divider rule */}
        <div style={{ borderBottom: "2px solid #1B3A7A", margin: "0" }} />
        <div style={{ borderBottom: "1px solid #E2E8F0", margin: "0 0 0" }} />

        {/* Data table */}
        <div style={{ padding: "4px 0 0" }}>
          {fields.map((f, i) => (
            <div key={f.label} style={{ display: "flex", alignItems: "stretch", borderBottom: i < fields.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div style={{ width: 130, padding: "8px 16px", background: i % 2 === 0 ? "#F8FAFC" : "#fff", borderRight: "1px solid #E2E8F0", display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>{f.label}</span>
              </div>
              <div style={{ flex: 1, padding: "8px 16px", background: i % 2 === 0 ? "#fff" : "#FAFBFF", display: "flex", alignItems: "center" }}>
                {f.highlight ? (
                  <span style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 2, padding: "1px 6px", letterSpacing: "0.06em" }}>{f.value}</span>
                ) : f.label === "PROGRESS" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <div style={{ flex: 1, height: 3, background: "#E2E8F0", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: f.value, background: "#2D6BCC", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: mono, color: "#2D6BCC", fontWeight: 700 }}>{f.value}</span>
                  </div>
                ) : f.label === "POOL ID" ? (
                  <span style={{ fontSize: 9, fontFamily: mono, color: "#94a3b8", wordBreak: "break-all" }}>{f.value}</span>
                ) : (
                  <span style={{ fontSize: 11, fontFamily: mono, color: navy, fontWeight: 500 }}>{f.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stage tracker */}
        <div style={{ padding: "12px 20px", borderTop: "2px solid #F1F5F9", background: "#FAFBFF" }}>
          <div style={{ fontSize: 9, fontFamily: mono, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 8 }}>PIPELINE STAGE</div>
          <div style={{ display: "flex", gap: 0 }}>
            {["COLLECTING", "FUNDED", "AT LAB", "RESULTS"].map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: "center", padding: "5px 2px", background: i === 0 ? navy : "transparent", border: `1px solid ${i === 0 ? navy : "#E2E8F0"}`, marginRight: i < 3 ? -1 : 0 }}>
                <span style={{ fontSize: 8, fontFamily: mono, fontWeight: 700, color: i === 0 ? "#fff" : "#CBD5E1", letterSpacing: "0.04em" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #F1F5F9" }}>
          <button style={{ width: "100%", padding: "11px 0", background: navy, color: "#fff", fontFamily: mono, fontWeight: 700, fontSize: 12, borderRadius: 2, border: "none", cursor: "pointer", letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            VIEW POOL DETAILS →
          </button>
        </div>
      </div>
    </div>
  );
}
