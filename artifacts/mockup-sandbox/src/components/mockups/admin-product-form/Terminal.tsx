export function Terminal() {
  const mono = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "30px",
    background: "#0A0A0A",
    border: "1px solid #2A2A2A",
    color: "#D1D5DB",
    fontFamily: mono,
    fontSize: "11px",
    padding: "0 8px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "9px",
    fontFamily: mono,
    fontWeight: "700",
    letterSpacing: "0.1em",
    color: "#4B5563",
    marginBottom: "4px",
    textTransform: "uppercase" as const,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    cursor: "pointer",
    paddingRight: "24px",
  };

  return (
    <div style={{ background: "#060606", minHeight: "100vh", fontFamily: mono }}>
      {/* Header */}
      <div style={{ background: "#0D0D0D", borderBottom: "1px solid #1A1A1A", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#F59E0B", fontSize: "11px", fontWeight: "700", letterSpacing: "0.12em" }}>⬡ ADMIN TERMINAL</div>
          <div style={{ color: "#374151", fontSize: "9px", marginTop: "2px", letterSpacing: "0.06em" }}>peps-anonymous.local / vial-shop</div>
        </div>
        <div style={{ background: "#0D0D0D", border: "1px solid #2A2A2A", color: "#4B5563", fontSize: "9px", padding: "5px 10px", letterSpacing: "0.08em", cursor: "pointer" }}>
          [LOGOUT]
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ background: "#090909", borderBottom: "1px solid #1A1A1A", display: "flex", padding: "0 14px", gap: "2px" }}>
        {["PRODUCTS", "ORDERS", "DISCOUNTS", "VENDORS"].map((t, i) => (
          <button key={t} style={{
            padding: "8px 10px",
            fontSize: "9px",
            fontWeight: "700",
            letterSpacing: "0.1em",
            color: i === 0 ? "#F59E0B" : "#374151",
            background: "transparent",
            border: "none",
            borderBottom: i === 0 ? "2px solid #F59E0B" : "2px solid transparent",
            cursor: "pointer",
            fontFamily: mono,
          }}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "12px 14px" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: "#374151", fontSize: "10px", letterSpacing: "0.06em" }}>
            <span style={{ color: "#F59E0B" }}>3</span> records
          </span>
          <button style={{ background: "#0D0D0D", border: "1px solid #F59E0B", color: "#F59E0B", fontSize: "9px", fontWeight: "700", padding: "5px 12px", letterSpacing: "0.1em", cursor: "pointer", fontFamily: mono }}>
            + NEW PRODUCT
          </button>
        </div>

        {/* Form card */}
        <div style={{ border: "1px solid #1E3A1E", background: "#080808", padding: "14px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1A1A1A" }}>
            <div style={{ color: "#22C55E", fontSize: "10px", fontWeight: "700", letterSpacing: "0.1em" }}>
              &gt; NEW_PRODUCT.create
            </div>
            <button style={{ background: "transparent", border: "none", color: "#374151", fontSize: "14px", cursor: "pointer", fontFamily: mono }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {/* Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>&gt; name *</label>
              <input style={inputStyle} defaultValue="BPC-157 Acetate" />
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>&gt; description</label>
              <textarea style={{
                ...inputStyle,
                height: "46px",
                resize: "none",
                padding: "6px 8px",
                lineHeight: "1.4",
              }} defaultValue="5mg lyophilised peptide, purity ≥98%" />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>&gt; category</label>
              <select style={selectStyle} defaultValue="Peptides">
                <option>Peptides</option>
                <option>Supplies</option>
                <option>Filters</option>
                <option>Other</option>
              </select>
            </div>

            {/* Mg Size */}
            <div>
              <label style={labelStyle}>&gt; mg_size</label>
              <input style={inputStyle} defaultValue="5mg" />
            </div>

            {/* Price */}
            <div>
              <label style={labelStyle}>&gt; price_usd *</label>
              <input style={inputStyle} defaultValue="34.00" type="number" />
            </div>

            {/* Stock */}
            <div>
              <label style={labelStyle}>&gt; stock</label>
              <input style={inputStyle} defaultValue="12" type="number" />
            </div>

            {/* Vendor */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>&gt; vendor_id</label>
              <select style={selectStyle} defaultValue="Uther">
                <option>— null —</option>
                <option>Uther</option>
                <option>Axiom Labs</option>
              </select>
            </div>

            {/* Batch */}
            <div>
              <label style={labelStyle}>&gt; batch_no</label>
              <input style={inputStyle} defaultValue="BPC-2401" />
            </div>

            {/* Sort */}
            <div>
              <label style={labelStyle}>&gt; sort_order</label>
              <input style={inputStyle} defaultValue="1" type="number" />
            </div>

            {/* Lab URL */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>&gt; lab_report_url</label>
              <input style={inputStyle} defaultValue="https://janoshik.com/results/bpc-2401" />
            </div>

            {/* Active toggle */}
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
              <div style={{
                width: "36px", height: "18px",
                background: "#14532D",
                border: "1px solid #22C55E",
                display: "flex", alignItems: "center",
                padding: "2px",
              }}>
                <div style={{ width: "14px", height: "14px", background: "#22C55E", marginLeft: "auto" }} />
              </div>
              <span style={{ color: "#22C55E", fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em" }}>ACTIVE=true</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #1A1A1A" }}>
            <button style={{
              background: "#F59E0B", border: "none", color: "#000",
              fontSize: "10px", fontWeight: "700", padding: "7px 18px",
              letterSpacing: "0.1em", cursor: "pointer", fontFamily: mono,
            }}>
              ✓ EXECUTE
            </button>
            <button style={{
              background: "transparent", border: "1px solid #2A2A2A",
              color: "#4B5563", fontSize: "10px", fontWeight: "700",
              padding: "7px 14px", letterSpacing: "0.1em", cursor: "pointer",
              fontFamily: mono,
            }}>
              CANCEL
            </button>
          </div>
        </div>

        {/* Existing product row hint */}
        <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: "10px" }}>
          {[
            { name: "Tirzepatide 5mg", price: "$68.00", stock: 4, batch: "TIR-2312" },
            { name: "Semaglutide 1mg", price: "$42.00", stock: 0, batch: "SEM-2401" },
          ].map(p => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: "1px solid #111" }}>
              <span style={{ color: "#6B7280", fontSize: "9px", fontFamily: mono }}>▸</span>
              <span style={{ color: "#D1D5DB", fontSize: "10px", flex: 1 }}>{p.name}</span>
              <span style={{ color: "#F59E0B", fontSize: "10px" }}>{p.price}</span>
              <span style={{ color: p.stock > 0 ? "#22C55E" : "#EF4444", fontSize: "10px" }}>{p.stock > 0 ? `${p.stock}u` : "0u"}</span>
              <span style={{ color: "#374151", fontSize: "9px", letterSpacing: "0.05em" }}>{p.batch}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
