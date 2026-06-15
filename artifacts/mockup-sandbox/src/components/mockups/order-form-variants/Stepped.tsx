import { useState } from "react";
import { Plus, Trash2, ArrowRight, Check } from "lucide-react";

const PRODUCTS = [
  { id: "1", name: "BPC-157", spec: "10mg", price: 38 },
  { id: "2", name: "Semaglutide", spec: "3mg", price: 55 },
  { id: "3", name: "TB-500", spec: "5mg", price: 42 },
  { id: "4", name: "Tirzepatide", spec: "10mg", price: 68 },
  { id: "5", name: "Ipamorelin", spec: "5mg", price: 32 },
  { id: "6", name: "CJC-1295", spec: "2mg", price: 29 },
];

const DELIVERY = [
  { id: "rm", name: "ROYAL_MAIL", label: "Royal Mail", price: 10, eta: "3–5d" },
  { id: "ip", name: "INPOST", label: "InPost Locker", price: 3, eta: "1d" },
];

type Item = { id: string; productId: string; qty: number };
const uid = () => Math.random().toString(36).slice(2);

/* ─── Terminal Phosphor palette ─── */
const C = {
  void: "#000000",
  surface: "#0a0a0a",
  panel: "#0f0f0f",
  border: "#1f1f1f",
  grid: "#141414",
  cyan: "#00e5b4",         // phosphor teal
  cyanDim: "#00a882",
  cyanFaint: "rgba(0,229,180,0.08)",
  cyanBorder: "rgba(0,229,180,0.25)",
  text: "#d4d4d4",
  textMuted: "#555555",
  textFaint: "#2a2a2a",
  white: "#f0f0f0",
  mono: "'Courier New', 'Courier', monospace",
  ui: "12px",
};

export function Stepped() {
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
    <div style={{ minHeight: "100vh", background: C.void, color: C.text, fontFamily: C.mono, display: "flex", flexDirection: "column" }}>

      {/* ── terminal header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: C.cyan, fontSize: 10, letterSpacing: "0.05em" }}>●</span>
          <span style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.08em" }}>PEPS_ANON:ORDER_FORM v2.4.1</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: C.textMuted, fontSize: 10 }}>TTY:mobile</span>
        </div>

        <div style={{ display: "flex", gap: 0 }}>
          <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, paddingRight: 14, paddingBottom: 4 }}>
            <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 3, letterSpacing: "0.1em" }}>GROUP_BUY_ID</div>
            <div style={{ fontSize: 13, color: C.cyan, letterSpacing: "0.04em" }}>SUMMER_R3_2026</div>
          </div>
          <div style={{ paddingLeft: 14, paddingBottom: 4 }}>
            <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 3, letterSpacing: "0.1em" }}>TTL</div>
            <div style={{ fontSize: 13, color: "#e8c97a", letterSpacing: "0.04em" }}>4:12:33:09</div>
          </div>
        </div>

        {/* ascii progress bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 4, letterSpacing: "0.1em" }}>
            CAPACITY [<span style={{ color: C.cyan }}>{"█".repeat(13)}</span>{"░".repeat(8)}] 62/100
          </div>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: 170 }}>

        {/* ── order lines section ── */}
        <div style={{ borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.cyan, fontSize: 10, letterSpacing: "0.05em" }}>┌─</span>
            <span style={{ fontSize: 9, color: C.cyan, letterSpacing: "0.18em", textTransform: "uppercase" }}>ORDER_LINES</span>
            <span style={{ color: C.textFaint, fontSize: 10 }}>─────────────────</span>
          </div>

          {items.map((item, idx) => {
            const prod = PRODUCTS.find(p => p.id === item.productId);
            return (
              <div key={item.id} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: C.textMuted, minWidth: 20 }}>#{String(idx + 1).padStart(2, "0")}</span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <select
                      value={item.productId}
                      onChange={e => update(item.id, "productId", e.target.value)}
                      style={{
                        width: "100%",
                        background: item.productId ? C.cyanFaint : "transparent",
                        border: `1px solid ${item.productId ? C.cyanBorder : C.border}`,
                        color: item.productId ? C.white : C.textMuted,
                        fontSize: 12,
                        padding: "6px 8px",
                        outline: "none",
                        fontFamily: C.mono,
                        appearance: "none",
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <option value="" disabled style={{ background: C.surface }}>_ SELECT_COMPOUND</option>
                      {PRODUCTS.map(p => (
                        <option key={p.id} value={p.id} style={{ background: C.surface, color: C.white }}>
                          {p.name.toUpperCase().replace(/[- ]/g, "_")} [{p.spec}]
                        </option>
                      ))}
                    </select>
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontSize: 10, pointerEvents: "none" }}>▼</span>
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => remove(item.id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", padding: "4px 6px", fontFamily: C.mono, fontSize: 10 }}>
                      DEL
                    </button>
                  )}
                </div>

                {prod && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 26 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${C.border}` }}>
                      <button
                        onClick={() => update(item.id, "qty", Math.max(0.5, item.qty - 1))}
                        style={{ width: 28, height: 26, background: "none", border: "none", color: C.cyan, fontSize: 14, cursor: "pointer", fontFamily: C.mono }}
                      >−</button>
                      <span style={{ width: 28, height: 26, textAlign: "center", fontFamily: C.mono, fontSize: 12, color: C.cyan, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, lineHeight: "26px", display: "inline-block" }}>
                        {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(1)}
                      </span>
                      <button
                        onClick={() => update(item.id, "qty", item.qty + 1)}
                        style={{ width: 28, height: 26, background: "none", border: "none", color: C.cyan, fontSize: 14, cursor: "pointer", fontFamily: C.mono }}
                      >+</button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: C.cyan, fontSize: 14, letterSpacing: "0.04em" }}>£{(prod.price * item.qty).toFixed(2)}</div>
                      <div style={{ color: C.textMuted, fontSize: 9, letterSpacing: "0.08em" }}>@£{prod.price}.00</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={addItem}
              style={{ width: "100%", background: "none", border: "none", padding: "10px 16px", color: C.textMuted, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: C.mono, letterSpacing: "0.08em" }}
            >
              <span style={{ color: C.cyanDim }}>+</span> ADD_LINE
            </button>
          </div>
        </div>

        {/* ── dispatch section ── */}
        <div style={{ borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.cyan, fontSize: 10 }}>├─</span>
            <span style={{ fontSize: 9, color: C.cyan, letterSpacing: "0.18em", textTransform: "uppercase" }}>DISPATCH_METHOD</span>
          </div>
          {DELIVERY.map((d, idx) => {
            const sel = delivery === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDelivery(d.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  background: sel ? C.cyanFaint : "transparent",
                  border: "none",
                  borderTop: `1px solid ${C.border}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <div style={{ width: 14, height: 14, border: `1px solid ${sel ? C.cyan : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {sel && <span style={{ color: C.cyan, fontSize: 8, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: sel ? C.cyan : C.text, letterSpacing: "0.06em" }}>{d.name}</div>
                  <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2, letterSpacing: "0.06em" }}>ETA: {d.eta}</div>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: sel ? C.cyan : C.textMuted, letterSpacing: "0.04em" }}>
                  £{d.price}.00
                </div>
              </button>
            );
          })}
        </div>

        {/* ── notes section ── */}
        <div>
          <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.textMuted, fontSize: 10 }}>└─</span>
            <span style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>NOTES</span>
            <span style={{ fontSize: 9, color: C.textFaint, letterSpacing: "0.06em" }}>// optional</span>
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="// type notes here…"
              rows={3}
              style={{
                width: "100%",
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 11,
                padding: "8px 10px",
                resize: "none",
                outline: "none",
                fontFamily: C.mono,
                letterSpacing: "0.04em",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── sticky bottom ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}` }}>
        {/* line items summary */}
        {total > 0 && (
          <div style={{ padding: "10px 16px 0", borderBottom: `1px solid ${C.border}` }}>
            {items.filter(i => i.productId).map(item => {
              const prod = PRODUCTS.find(p => p.id === item.productId)!;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMuted, marginBottom: 3, letterSpacing: "0.06em" }}>
                  <span>{prod.name.toUpperCase().replace(" ", "_")} ×{item.qty}</span>
                  <span>£{(prod.price * item.qty).toFixed(2)}</span>
                </div>
              );
            })}
            {delivery && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMuted, marginBottom: 3, letterSpacing: "0.06em" }}>
                <span>{DELIVERY.find(d => d.id === delivery)?.name.toUpperCase().replace(" ", "_")}</span>
                <span>£{ship}.00</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.cyanDim, marginTop: 4, paddingTop: 4, borderTop: `1px solid ${C.border}`, marginBottom: 6, letterSpacing: "0.08em" }}>
              <span>SUBTOTAL</span><span>£{total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div style={{ padding: "12px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.15em", marginBottom: 3 }}>TOTAL_DUE</div>
            <div style={{ fontFamily: C.mono, fontSize: 22, color: total > 0 ? C.cyan : C.textFaint, letterSpacing: "0.04em", lineHeight: 1 }}>
              £{total.toFixed(2)}
            </div>
          </div>
          <button
            disabled={!ready}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: `1px solid ${ready ? C.cyan : C.border}`,
              color: ready ? C.cyan : C.textFaint,
              padding: "10px 18px",
              fontSize: 11,
              letterSpacing: "0.1em",
              cursor: ready ? "pointer" : "not-allowed",
              fontFamily: C.mono,
              boxShadow: ready ? `0 0 12px rgba(0,229,180,0.2)` : "none",
              transition: "all 0.15s",
            }}
          >
            CONFIRM_REVIEW <ArrowRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
