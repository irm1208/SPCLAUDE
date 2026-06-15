// V1 — THE CARD KNOWS WHAT YOU NEED TO DO
// Each status stage surfaces a single prominent action.
// "Submitted" → upload proof. "Shipped" → track it. "Delivered" → confirm receipt.
// The card morphs around the one thing that needs doing right now.

import { useState } from "react";

const S = {
  bg: "#0a1120", surface: "#0f1a2e", surface2: "#162035",
  border: "rgba(255,255,255,0.07)", text: "#e2e8f0",
  muted: "#94a3b8", subtle: "#475569",
};

type Stage = "submitted" | "processing" | "shipped" | "delivered";

const STAGES: { id: Stage; label: string; action: string; actionColor: string; actionBg: string; prompt: string; icon: string }[] = [
  { id: "submitted",  label: "Submitted",  icon: "⏳", action: "Upload payment proof", actionColor: "#f59e0b", actionBg: "rgba(245,158,11,0.15)", prompt: "Your order is waiting on payment confirmation." },
  { id: "processing", label: "Processing", icon: "⚙️", action: "Nothing to do",        actionColor: "#3b82f6", actionBg: "rgba(59,130,246,0.12)", prompt: "Organiser is preparing your package. Sit tight." },
  { id: "shipped",    label: "Shipped",    icon: "🚚", action: "Track shipment",        actionColor: "#34d399", actionBg: "rgba(52,211,153,0.12)", prompt: "Tracking: GBM0041209UK — last scanned London." },
  { id: "delivered",  label: "Delivered",  icon: "✅", action: "Confirm receipt",       actionColor: "#a78bfa", actionBg: "rgba(167,139,250,0.12)", prompt: "Arrived? Confirm so the organiser can close this order." },
];

export function ActionState() {
  const [stageIdx, setStageIdx] = useState(0);
  const stage = STAGES[stageIdx];

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "20px 16px 40px", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Stage switcher (demo only) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {STAGES.map((s, i) => (
          <button key={s.id} onClick={() => setStageIdx(i)}
            style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, cursor: "pointer", background: i === stageIdx ? "#1d4ed8" : S.surface2, color: i === stageIdx ? "#fff" : S.muted, border: `1px solid ${S.border}` }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, overflow: "hidden" }}>
        {/* Compact header */}
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: S.muted, background: S.surface2, padding: "2px 7px", borderRadius: 6, border: `1px solid ${S.border}` }}>#2845</span>
            <span style={{ fontSize: 11, color: S.subtle }}>BPC-157 Summer GB</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 900, color: S.text }}>£12.00</span>
        </div>

        {/* Action zone — this is the hero */}
        <div style={{ padding: "16px", background: stage.actionBg, borderBottom: `1px solid ${stage.actionColor}22` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{stage.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: S.text }}>{stage.label}</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: S.muted, lineHeight: 1.4 }}>{stage.prompt}</p>
              {stage.id !== "processing" && (
                <button style={{ fontSize: 12, fontWeight: 700, padding: "8px 18px", borderRadius: 10, background: stage.actionColor, color: "#fff", border: "none", cursor: "pointer" }}>
                  {stage.action} →
                </button>
              )}
              {stage.id === "processing" && (
                <span style={{ fontSize: 11, color: S.subtle }}>Usually 2–4 working days</span>
              )}
            </div>
          </div>
        </div>

        {/* Items — always shown, secondary */}
        <div style={{ padding: "12px 16px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#34d399" }}>Items</p>
          {[{ qty: 2, name: "BPC-157 5mg", total: "£10.00" }, { qty: 1, name: "Shipping", total: "£2.00" }].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i === 0 ? `1px solid ${S.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.12)", padding: "1px 6px", borderRadius: 4 }}>{item.qty}×</span>
                <span style={{ fontSize: 12, color: S.muted }}>{item.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: S.text }}>{item.total}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: S.text }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#34d399" }}>£12.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
