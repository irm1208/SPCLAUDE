export function WarmStudio() {
  const sans = "'Inter', 'DM Sans', system-ui, sans-serif";

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "5px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: "600",
    color: "#92400E",
    letterSpacing: "0.01em",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "34px",
    background: "#FFFDF8",
    border: "1px solid #D6C4A0",
    borderRadius: "8px",
    color: "#1C1917",
    fontFamily: sans,
    fontSize: "12px",
    padding: "0 10px",
    outline: "none",
    boxSizing: "border-box" as const,
    boxShadow: "inset 0 1px 2px rgba(120,80,30,0.06)",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23A16207'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: "28px",
  };

  return (
    <div style={{ background: "#FAF6EF", minHeight: "100vh", fontFamily: sans }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #1C1410 0%, #2D1F0E 100%)",
        padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: "#FDE68A", fontSize: "13px", fontWeight: "700", letterSpacing: "-0.01em" }}>Admin Panel</div>
          <div style={{ color: "#78716C", fontSize: "10px", marginTop: "1px" }}>Peps Anonymous</div>
        </div>
        <button style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px", color: "rgba(255,255,255,0.6)",
          fontSize: "10px", fontWeight: "600", padding: "5px 12px", cursor: "pointer",
          fontFamily: sans,
        }}>
          Sign out
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{
        background: "#FDF8F0",
        borderBottom: "1px solid #E8D9BF",
        display: "flex", padding: "0 16px", gap: "2px",
        overflowX: "auto" as const,
      }}>
        {["Products", "Orders", "Discount Codes", "Vendors"].map((t, i) => (
          <button key={t} style={{
            padding: "10px 12px",
            fontSize: "11px", fontWeight: i === 0 ? "700" : "500",
            color: i === 0 ? "#92400E" : "#A8956D",
            background: i === 0 ? "#FEF3C7" : "transparent",
            border: "none",
            borderRadius: "8px 8px 0 0",
            borderBottom: i === 0 ? "2px solid #B45309" : "2px solid transparent",
            cursor: "pointer", whiteSpace: "nowrap" as const,
            fontFamily: sans,
          }}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <span style={{ color: "#A8956D", fontSize: "11px" }}>3 Products</span>
          <button style={{
            background: "#B45309", borderRadius: "10px",
            color: "#fff", fontSize: "11px", fontWeight: "700",
            padding: "7px 14px", border: "none", cursor: "pointer",
            fontFamily: sans, display: "flex", alignItems: "center", gap: "5px",
          }}>
            + Add Product
          </button>
        </div>

        {/* Form card */}
        <div style={{
          background: "#FFFDF8",
          border: "1px solid #E8D9BF",
          borderRadius: "16px",
          padding: "18px",
          marginBottom: "14px",
          boxShadow: "0 2px 12px rgba(120,80,30,0.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1C1917" }}>New Product</div>
              <div style={{ fontSize: "10px", color: "#A8956D", marginTop: "2px" }}>Fields marked * are required</div>
            </div>
            <button style={{
              background: "transparent", border: "none",
              color: "#C4A87A", fontSize: "18px", cursor: "pointer", lineHeight: 1,
            }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} defaultValue="BPC-157 Acetate" />
            </div>

            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{
                ...inputStyle, height: "52px", resize: "none",
                padding: "8px 10px", lineHeight: "1.5",
              }} defaultValue="5mg lyophilised peptide, purity ≥98%. Sourced from Uther." />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Category</label>
              <select style={selectStyle}>
                <option>Peptides</option>
                <option>Supplies</option>
                <option>Filters</option>
                <option>Other</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Mg Size</label>
              <input style={inputStyle} defaultValue="5mg" />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Price ($) *</label>
              <input style={inputStyle} type="number" defaultValue="34.00" />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Stock (vials)</label>
              <input style={inputStyle} type="number" defaultValue="12" />
            </div>

            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Vendor</label>
              <select style={selectStyle}>
                <option>— No vendor —</option>
                <option selected>Uther</option>
                <option>Axiom Labs</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Batch Number</label>
              <input style={inputStyle} defaultValue="BPC-2401" />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Sort Order</label>
              <input style={inputStyle} type="number" defaultValue="1" />
            </div>

            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Lab Report URL</label>
              <input style={inputStyle} defaultValue="https://janoshik.com/results/bpc-2401" />
            </div>

            {/* Active toggle */}
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
              <div style={{
                width: "38px", height: "20px",
                background: "#B45309",
                borderRadius: "99px",
                display: "flex", alignItems: "center",
                padding: "2px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
              }}>
                <div style={{
                  width: "16px", height: "16px",
                  background: "#FFFDF8",
                  borderRadius: "99px",
                  marginLeft: "auto",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400E" }}>Active</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#EDE4D3", margin: "16px 0" }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={{
              background: "#B45309", borderRadius: "10px",
              color: "#fff", fontSize: "12px", fontWeight: "700",
              padding: "9px 22px", border: "none", cursor: "pointer",
              fontFamily: sans, display: "flex", alignItems: "center", gap: "5px",
              boxShadow: "0 2px 8px rgba(180,83,9,0.30)",
            }}>
              ✓ Save
            </button>
            <button style={{
              background: "#F5EDE0", borderRadius: "10px",
              color: "#A8956D", fontSize: "12px", fontWeight: "600",
              padding: "9px 18px", border: "1px solid #DDD0B8", cursor: "pointer",
              fontFamily: sans,
            }}>
              Cancel
            </button>
          </div>
        </div>

        {/* Existing rows */}
        {[
          { name: "Tirzepatide 5mg", price: "$68.00", stock: 4, vendor: "Axiom Labs", active: true },
          { name: "Semaglutide 1mg", price: "$42.00", stock: 0, vendor: "Uther", active: false },
        ].map(p => (
          <div key={p.name} style={{
            background: "#FFFDF8",
            border: "1px solid #E8D9BF",
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "8px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#1C1917" }}>{p.name}</div>
              <div style={{ fontSize: "10px", color: "#A8956D", marginTop: "2px" }}>{p.vendor}</div>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#B45309" }}>{p.price}</span>
            <span style={{
              fontSize: "10px", fontWeight: "600",
              color: p.stock > 0 ? "#047857" : "#DC2626",
              background: p.stock > 0 ? "#D1FAE5" : "#FEE2E2",
              padding: "2px 7px", borderRadius: "99px",
            }}>{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
