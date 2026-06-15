import { useState } from "react";
import { Plus, Trash2, ArrowRight, Check, Clock, ChevronDown } from "lucide-react";

const PRODUCTS = [
  { id: "1", name: "BPC-157", spec: "10mg · repair peptide", price: 38 },
  { id: "2", name: "Semaglutide", spec: "3mg · GLP-1 agonist", price: 55 },
  { id: "3", name: "TB-500", spec: "5mg · thymosin beta-4", price: 42 },
  { id: "4", name: "Tirzepatide", spec: "10mg · GLP-1/GIP dual", price: 68 },
  { id: "5", name: "Ipamorelin", spec: "5mg · GH secretagogue", price: 32 },
  { id: "6", name: "CJC-1295", spec: "2mg · GHRH analogue", price: 29 },
];

const DELIVERY = [
  { id: "rm", name: "Royal Mail", meta: "Tracked · 3–5 days", price: 10 },
  { id: "ip", name: "InPost Locker", meta: "Next day · locker drop", price: 3 },
];

type Item = { id: string; productId: string; qty: number };
const uid = () => Math.random().toString(36).slice(2);

/* ─── Editorial Swiss palette ─── */
const C = {
  paper: "#f3ede3",         // warm off-white
  ink: "#0d1f1a",           // near-black with green tint
  accent: "#1f5c38",        // deep forest green
  accentLight: "#2d7a4f",
  accentPaper: "#e6ede8",   // very light green tint for selected
  rule: "#d4ccbe",          // warm rule lines
  muted: "#7a7060",
  faint: "#c2baa8",
  header: "#0d1f1a",
  headerText: "#f3ede3",
  red: "#8b2020",
};

export function Glassmorphism() {
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
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'Helvetica Neue', 'Arial', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── bold nav header ── */}
      <div style={{ background: C.header, color: C.headerText }}>
        <div style={{ padding: "18px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(243,237,227,0.5)", marginBottom: 3 }}>
                PEPS ANONYMOUS / GROUP BUY
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: C.headerText }}>
                Summer Round III
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(243,237,227,0.4)", marginBottom: 3 }}>CLOSES</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8c97a", fontVariantNumeric: "tabular-nums" }}>4d 12h 33m</div>
            </div>
          </div>

          {/* capacity bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(243,237,227,0.4)" }}>Capacity</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(243,237,227,0.7)", letterSpacing: "0.05em" }}>62 / 100 kits claimed</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.1)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, right: "38%", background: C.accentLight }} />
            </div>
          </div>
        </div>

        {/* bold section label strip */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex" }}>
          <div style={{ flex: 1, padding: "8px 20px", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(243,237,227,0.35)" }}>Order Form</div>
          </div>
          <div style={{ padding: "8px 20px" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(243,237,227,0.35)" }}>Season 2026</div>
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ flex: 1, paddingBottom: 150 }}>

        {/* products table */}
        <div style={{ borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent }}>Products</span>
            <div style={{ flex: 1, height: 1, background: C.rule, marginBottom: 2 }} />
          </div>

          {/* column heads */}
          <div style={{ display: "flex", padding: "0 20px 8px", gap: 8 }}>
            <div style={{ flex: 1, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint }}>Compound</div>
            <div style={{ width: 80, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint, textAlign: "center" }}>Qty</div>
            <div style={{ width: 60, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint, textAlign: "right" }}>Amount</div>
          </div>

          {/* rows */}
          {items.map((item, idx) => {
            const prod = PRODUCTS.find(p => p.id === item.productId);
            const odd = idx % 2 === 0;
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: odd ? "rgba(0,0,0,0.02)" : "transparent", borderTop: `1px solid ${C.rule}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ position: "relative" }}>
                    <select
                      value={item.productId}
                      onChange={e => update(item.id, "productId", e.target.value)}
                      style={{
                        width: "100%",
                        appearance: "none",
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${item.productId ? C.accent : C.rule}`,
                        color: item.productId ? C.ink : C.faint,
                        fontSize: 13,
                        fontWeight: item.productId ? 600 : 400,
                        padding: "3px 20px 3px 0",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="" disabled>Choose compound…</option>
                      {PRODUCTS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {p.spec}</option>
                      ))}
                    </select>
                    <ChevronDown style={{ position: "absolute", right: 0, top: 4, width: 14, height: 14, color: C.faint, pointerEvents: "none" }} />
                  </div>
                  {prod && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{prod.spec}</div>}
                </div>

                {/* qty stepper */}
                <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {prod ? (
                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.rule}`, height: 28 }}>
                      <button onClick={() => update(item.id, "qty", Math.max(0.5, item.qty - 1))} style={{ width: 24, background: "none", border: "none", fontSize: 14, cursor: "pointer", color: C.accent, fontWeight: 700 }}>−</button>
                      <span style={{ width: 22, textAlign: "center", fontSize: 12, fontWeight: 700, color: C.ink, borderLeft: `1px solid ${C.rule}`, borderRight: `1px solid ${C.rule}`, lineHeight: "28px" }}>
                        {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(1)}
                      </span>
                      <button onClick={() => update(item.id, "qty", item.qty + 1)} style={{ width: 24, background: "none", border: "none", fontSize: 14, cursor: "pointer", color: C.accent, fontWeight: 700 }}>+</button>
                    </div>
                  ) : <div />}
                </div>

                {/* price */}
                <div style={{ width: 60, textAlign: "right", fontSize: 13, fontWeight: 700, color: prod ? C.ink : C.faint, fontVariantNumeric: "tabular-nums" }}>
                  {prod ? `£${(prod.price * item.qty).toFixed(2)}` : "—"}
                </div>

                {items.length > 1 && (
                  <button onClick={() => remove(item.id)} style={{ marginLeft: 4, background: "none", border: "none", color: C.faint, cursor: "pointer", padding: 0 }}>
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ borderTop: `1px solid ${C.rule}` }}>
            <button
              onClick={addItem}
              style={{ width: "100%", background: "none", border: "none", padding: "12px 20px", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textAlign: "left", letterSpacing: "0.04em" }}
            >
              <Plus style={{ width: 13, height: 13 }} /> Add compound
            </button>
          </div>
        </div>

        {/* delivery */}
        <div style={{ borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent }}>Dispatch</span>
            <div style={{ flex: 1, height: 1, background: C.rule, marginBottom: 2 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {DELIVERY.map((d, idx) => {
              const sel = delivery === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDelivery(d.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 20px",
                    background: sel ? C.accentPaper : "transparent",
                    border: "none",
                    borderTop: idx === 0 ? "none" : `1px solid ${C.rule}`,
                    cursor: "pointer",
                    textAlign: "left",
                    borderLeft: sel ? `3px solid ${C.accent}` : "3px solid transparent",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ width: 18, height: 18, border: `2px solid ${sel ? C.accent : C.faint}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? C.ink : C.muted }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{d.meta}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sel ? C.accent : C.muted, fontVariantNumeric: "tabular-nums" }}>
                    £{d.price}.00
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* notes */}
        <div>
          <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.faint }}>Notes</span>
            <div style={{ flex: 1, height: 1, background: C.rule, marginBottom: 2 }} />
            <span style={{ fontSize: 9, color: C.faint }}>optional</span>
          </div>
          <div style={{ padding: "0 20px 20px" }}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Special instructions, allergy info, preferred locker…"
              rows={3}
              style={{
                width: "100%",
                background: "transparent",
                border: `1px solid ${C.rule}`,
                borderTop: `2px solid ${C.faint}`,
                color: C.ink,
                fontSize: 13,
                padding: "10px 12px",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── fixed bottom ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.paper, borderTop: `3px solid ${C.ink}` }}>
        {/* summary row */}
        {total > 0 && (
          <div style={{ padding: "10px 20px 0", display: "flex", flexDirection: "column", gap: 3, borderBottom: `1px solid ${C.rule}` }}>
            {items.filter(i => i.productId).map(item => {
              const prod = PRODUCTS.find(p => p.id === item.productId)!;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  <span>{prod.name} × {item.qty}</span>
                  <span>£{(prod.price * item.qty).toFixed(2)}</span>
                </div>
              );
            })}
            {delivery && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                <span>{DELIVERY.find(d => d.id === delivery)?.name}</span>
                <span>£{ship}.00</span>
              </div>
            )}
            <div style={{ height: 6 }} />
          </div>
        )}
        <div style={{ padding: "12px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted }}>Grand Total</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: total > 0 ? C.ink : C.faint, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 2 }}>
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
              border: `2px solid ${ready ? C.accent : C.faint}`,
              color: ready ? "#f3ede3" : C.faint,
              padding: "12px 20px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: ready ? "pointer" : "not-allowed",
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
