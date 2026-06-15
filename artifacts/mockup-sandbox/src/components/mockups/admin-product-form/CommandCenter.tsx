export function CommandCenter() {
  const sans = "'Inter', system-ui, sans-serif";

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.35)",
    marginBottom: "5px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "34px",
    background: "#0A0A1C",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "6px",
    color: "#E0E7FF",
    fontFamily: sans,
    fontSize: "12px",
    fontWeight: "500",
    padding: "0 10px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236366F1'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: "28px",
  };

  return (
    <div style={{ background: "#080818", minHeight: "100vh", fontFamily: sans }}>
      {/* Header */}
      <div style={{
        background: "#0C0C22",
        borderBottom: "1px solid rgba(99,102,241,0.2)",
        padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: "#fff", fontSize: "13px", fontWeight: "800", letterSpacing: "-0.01em" }}>ADMIN PANEL</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", marginTop: "2px", letterSpacing: "0.06em" }}>PEPS ANONYMOUS</div>
        </div>
        <button style={{
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "6px",
          color: "#A5B4FC",
          fontSize: "10px", fontWeight: "700",
          padding: "6px 12px", cursor: "pointer",
          fontFamily: sans, letterSpacing: "0.06em",
        }}>
          SIGN OUT
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{
        background: "#0A0A1C",
        borderBottom: "1px solid rgba(99,102,241,0.15)",
        display: "flex", padding: "0 16px",
      }}>
        {["Products", "Orders", "Discounts", "Vendors"].map((t, i) => (
          <button key={t} style={{
            padding: "10px 14px",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            color: i === 0 ? "#6366F1" : "rgba(255,255,255,0.2)",
            background: "transparent",
            border: "none",
            borderBottom: i === 0 ? "2px solid #6366F1" : "2px solid transparent",
            cursor: "pointer",
            fontFamily: sans,
          }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "6px", height: "6px",
              background: "#6366F1",
              borderRadius: "50%",
            }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", letterSpacing: "0.04em" }}>
              3 PRODUCTS
            </span>
          </div>
          <button style={{
            background: "#6366F1",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "10px", fontWeight: "800",
            padding: "7px 14px",
            cursor: "pointer",
            fontFamily: sans,
            letterSpacing: "0.08em",
          }}>
            + ADD PRODUCT
          </button>
        </div>

        {/* Form card */}
        <div style={{
          background: "rgba(99,102,241,0.05)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "14px",
        }}>
          {/* Form header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(99,102,241,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "3px", height: "16px", background: "#6366F1", borderRadius: "2px" }} />
              <span style={{ color: "#fff", fontSize: "12px", fontWeight: "800", letterSpacing: "0.04em" }}>NEW PRODUCT</span>
            </div>
            <button style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} defaultValue="BPC-157 Acetate" />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{
                ...inputStyle, height: "50px", resize: "none",
                padding: "8px 10px", lineHeight: "1.5",
              }} defaultValue="5mg lyophilised peptide, purity ≥98%" />
            </div>

            <div>
              <label style={labelStyle}>Category</label>
              <select style={selectStyle}>
                <option style={{ background: "#0A0A1C" }}>Peptides</option>
                <option style={{ background: "#0A0A1C" }}>Supplies</option>
                <option style={{ background: "#0A0A1C" }}>Filters</option>
                <option style={{ background: "#0A0A1C" }}>Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Mg Size</label>
              <input style={inputStyle} defaultValue="5mg" />
            </div>

            <div>
              <label style={labelStyle}>Price ($) *</label>
              <input style={inputStyle} type="number" defaultValue="34.00" />
            </div>

            <div>
              <label style={labelStyle}>Stock (vials)</label>
              <input style={inputStyle} type="number" defaultValue="12" />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Vendor</label>
              <select style={selectStyle}>
                <option style={{ background: "#0A0A1C" }}>— No vendor —</option>
                <option style={{ background: "#0A0A1C" }} selected>Uther</option>
                <option style={{ background: "#0A0A1C" }}>Axiom Labs</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Batch Number</label>
              <input style={inputStyle} defaultValue="BPC-2401" />
            </div>

            <div>
              <label style={labelStyle}>Sort Order</label>
              <input style={inputStyle} type="number" defaultValue="1" />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Lab Report URL</label>
              <input style={inputStyle} defaultValue="https://janoshik.com/results/bpc-2401" />
            </div>

            {/* Active toggle */}
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
              <div style={{
                width: "38px", height: "20px",
                background: "#4338CA",
                borderRadius: "4px",
                display: "flex", alignItems: "center",
                padding: "2px",
                border: "1px solid rgba(99,102,241,0.6)",
              }}>
                <div style={{
                  width: "16px", height: "16px",
                  background: "#6366F1",
                  borderRadius: "2px",
                  marginLeft: "auto",
                  boxShadow: "0 0 6px rgba(99,102,241,0.6)",
                }} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: "800", color: "#A5B4FC", letterSpacing: "0.1em" }}>ACTIVE</span>
            </div>
          </div>

          {/* Section divider */}
          <div style={{ height: "1px", background: "rgba(99,102,241,0.15)", margin: "16px 0" }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{
              background: "#6366F1", border: "none",
              borderRadius: "6px",
              color: "#fff", fontSize: "11px", fontWeight: "800",
              padding: "9px 22px", cursor: "pointer",
              fontFamily: sans, letterSpacing: "0.06em",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}>
              SAVE
            </button>
            <button style={{
              background: "transparent",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "6px",
              color: "rgba(255,255,255,0.3)", fontSize: "11px", fontWeight: "700",
              padding: "9px 16px", cursor: "pointer",
              fontFamily: sans, letterSpacing: "0.06em",
            }}>
              CANCEL
            </button>
          </div>
        </div>

        {/* Existing rows */}
        {[
          { name: "Tirzepatide 5mg", price: "$68.00", stock: 4, batch: "TIR-2312" },
          { name: "Semaglutide 1mg", price: "$42.00", stock: 0, batch: "SEM-2401" },
        ].map(p => (
          <div key={p.name} style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(99,102,241,0.1)",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "8px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#E0E7FF" }}>{p.name}</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: "2px", letterSpacing: "0.06em" }}>{p.batch}</div>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#A5B4FC" }}>{p.price}</span>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: p.stock > 0 ? "#22C55E" : "#EF4444",
              boxShadow: p.stock > 0 ? "0 0 6px rgba(34,197,94,0.5)" : "0 0 6px rgba(239,68,68,0.5)",
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}
