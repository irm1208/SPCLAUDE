import { useState } from "react";
import { Plus, Trash2, ArrowRight, Clock } from "lucide-react";

const PRODUCTS = [
  { id: "1", name: "BPC-157", spec: "10mg / vial", price: 38 },
  { id: "2", name: "Semaglutide", spec: "3mg / vial", price: 55 },
  { id: "3", name: "TB-500", spec: "5mg / vial", price: 42 },
  { id: "4", name: "Tirzepatide", spec: "10mg / vial", price: 68 },
  { id: "5", name: "Ipamorelin", spec: "5mg / vial", price: 32 },
  { id: "6", name: "CJC-1295", spec: "2mg / vial", price: 29 },
];

const DELIVERY = [
  { id: "rm", label: "Royal Mail", sub: "3–5 working days", price: 10 },
  { id: "ip", label: "InPost Locker", sub: "Next day to locker", price: 3 },
];

type Item = { id: string; productId: string; qty: number };
const uid = () => Math.random().toString(36).slice(2);

/* ─── Apothecary palette ─── */
const C = {
  bg: "#07090a",
  card: "#0c1210",
  border: "#1b2620",
  borderHover: "#2c3e30",
  accent: "#c9923a",       // warm amber
  accentDim: "#7a4f15",
  accentGlow: "rgba(201,146,58,0.14)",
  text: "#c4bfb0",
  textMuted: "#5a6058",
  textFaint: "#2e3830",
  white: "#e8e4da",
  danger: "#7a2020",
  selected: "#131d14",
  selectedBorder: "#c9923a",
};

export function FullDark() {
  const [items, setItems] = useState<Item[]>([{ id: "a", productId: "", qty: 1 }]);
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const addItem = () => setItems(p => [...p, { id: uid(), productId: "", qty: 1 }]);
  const remove = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const update = (id: string, f: keyof Item, v: any) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i));

  const subtotal = items.reduce((s, it) => {
    const p = PRODUCTS.find(p => p.id === it.productId);
    return s + (p ? p.price * it.qty : 0);
  }, 0);
  const ship = DELIVERY.find(d => d.id === delivery)?.price ?? 0;
  const total = subtotal + ship;
  const ready = items.some(i => i.productId) && delivery;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Georgia', 'Times New Roman', serif", color: C.text, display: "flex", flexDirection: "column" }}>

      {/* ── header ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
          <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, fontFamily: "monospace" }}>
            GROUP BUY — SUMMER ROUND III
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 400, color: C.white, margin: 0, fontStyle: "italic" }}>
            Place Your Order
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "monospace", color: C.accent }}>
            <Clock style={{ width: 11, height: 11 }} />
            <span>4d 12h remaining</span>
          </div>
        </div>

        {/* kit gauge */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 2, background: C.border, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "62%", background: `linear-gradient(90deg, ${C.accentDim}, ${C.accent})` }} />
          </div>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: C.textMuted, whiteSpace: "nowrap" }}>62 / 100 kits</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 16px", paddingBottom: 160, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── products ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, fontFamily: "monospace" }}>I. Products</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => {
              const prod = PRODUCTS.find(p => p.id === item.productId);
              return (
                <div key={item.id} style={{ background: C.card, border: `1px solid ${item.productId ? C.borderHover : C.border}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={item.productId}
                      onChange={e => update(item.id, "productId", e.target.value)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${item.productId ? C.accent : C.border}`,
                        color: item.productId ? C.white : C.textMuted,
                        fontSize: 14,
                        padding: "4px 0",
                        outline: "none",
                        fontFamily: "'Georgia', serif",
                        appearance: "none",
                      }}
                    >
                      <option value="" disabled style={{ background: C.card }}>Select compound…</option>
                      {PRODUCTS.map(p => (
                        <option key={p.id} value={p.id} style={{ background: C.card, color: C.white }}>
                          {p.name} {p.spec}
                        </option>
                      ))}
                    </select>
                    {items.length > 1 && (
                      <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: "0 4px" }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>

                  {prod && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {/* amber quantity stepper */}
                      <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${C.border}` }}>
                        <button
                          onClick={() => update(item.id, "qty", Math.max(0.5, item.qty - 1))}
                          style={{ width: 32, height: 30, background: "none", border: "none", color: C.accent, fontSize: 16, cursor: "pointer", fontFamily: "monospace" }}
                        >−</button>
                        <span style={{ width: 28, textAlign: "center", fontFamily: "monospace", fontSize: 13, color: C.white, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, lineHeight: "30px" }}>
                          {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(1)}
                        </span>
                        <button
                          onClick={() => update(item.id, "qty", item.qty + 1)}
                          style={{ width: 32, height: 30, background: "none", border: "none", color: C.accent, fontSize: 16, cursor: "pointer", fontFamily: "monospace" }}
                        >+</button>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 15, color: C.accent, letterSpacing: "0.05em" }}>
                          £{(prod.price * item.qty).toFixed(2)}
                        </div>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: C.textMuted }}>
                          £{prod.price} each
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addItem}
            style={{ marginTop: 8, width: "100%", background: "none", border: `1px dashed ${C.border}`, color: C.textMuted, fontSize: 12, padding: "9px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Georgia', serif", letterSpacing: "0.05em" }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Add another compound
          </button>
        </section>

        {/* ── delivery ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, fontFamily: "monospace" }}>II. Dispatch</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DELIVERY.map(d => {
              const sel = delivery === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDelivery(d.id)}
                  style={{
                    background: sel ? C.selected : C.card,
                    border: `1px solid ${sel ? C.accent : C.border}`,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: sel ? `inset 0 0 24px ${C.accentGlow}` : "none",
                    transition: "all 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, color: sel ? C.white : C.text, fontFamily: "'Georgia', serif" }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontFamily: "monospace" }}>{d.sub}</div>
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 14, color: sel ? C.accent : C.textMuted, letterSpacing: "0.04em" }}>
                    £{d.price}.00
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── notes ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textMuted, fontFamily: "monospace" }}>III. Notes</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 9, color: C.textFaint, fontFamily: "monospace" }}>optional</span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special instructions…"
            rows={3}
            style={{
              width: "100%",
              background: C.card,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 13,
              padding: "10px 12px",
              resize: "none",
              outline: "none",
              fontFamily: "'Georgia', serif",
              boxSizing: "border-box",
            }}
          />
        </section>
      </div>

      {/* ── sticky bottom ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, padding: "14px 20px" }}>
        {/* running breakdown */}
        {total > 0 && (
          <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            {items.filter(i => i.productId).map(item => {
              const prod = PRODUCTS.find(p => p.id === item.productId)!;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", color: C.textMuted }}>
                  <span>{prod.name} × {item.qty}</span>
                  <span>£{(prod.price * item.qty).toFixed(2)}</span>
                </div>
              );
            })}
            {delivery && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", color: C.textMuted }}>
                <span>{DELIVERY.find(d => d.id === delivery)?.label}</span>
                <span>£{ship}.00</span>
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: C.textMuted, fontFamily: "monospace" }}>Total Due</div>
            <div style={{ fontFamily: "monospace", fontSize: 22, color: total > 0 ? C.accent : C.textFaint, letterSpacing: "0.04em", marginTop: 2 }}>
              £{total.toFixed(2)}
            </div>
          </div>
          <button
            disabled={!ready}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: ready ? C.accent : "transparent",
              border: `1px solid ${ready ? C.accent : C.border}`,
              color: ready ? C.bg : C.textMuted,
              padding: "11px 22px",
              fontSize: 12,
              letterSpacing: "0.08em",
              cursor: ready ? "pointer" : "not-allowed",
              fontFamily: "'Georgia', serif",
              transition: "all 0.15s",
            }}
          >
            Review Order <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
