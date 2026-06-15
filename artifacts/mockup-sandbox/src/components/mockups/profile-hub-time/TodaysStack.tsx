import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DOSES = [
  { id: 1, name: "BPC-157", amount: "2mg", time: "Morning", note: "Day 25 of 28", checked: false },
  { id: 2, name: "Ipamorelin", amount: "200mcg", time: "Pre-bed", note: "Subcut", checked: false },
  { id: 3, name: "Vitamin D3", amount: "5000 IU", time: "With food", note: "Daily", checked: true },
];

const URGENCY_CARDS = [
  {
    urgency: "arriving",
    icon: "📦",
    label: "Arriving today",
    title: "Order #FS-9921",
    sub: "BPC-157 × 2 vials, TB-500 × 1 vial",
    color: "#10b981",
    bg: "#ecfdf5",
    border: "#bbf7d0",
    cta: "Track shipment",
    ctaBg: "#10b981",
    progress: 95,
  },
  {
    urgency: "closing",
    icon: "⏳",
    label: "Closing soon",
    title: "Tirzepatide Q3 Group Buy",
    sub: "8 days left to join — 34 members confirmed",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    cta: "Join group buy",
    ctaBg: "#f59e0b",
    progress: 73,
  },
  {
    urgency: "overdue",
    icon: "🧪",
    label: "Overdue",
    title: "Quarterly blood panel",
    sub: "Last panel was 6 weeks ago — IGF-1, Testosterone, Cortisol",
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
    cta: "Find a lab",
    ctaBg: "#ef4444",
    progress: 0,
  },
];

export default function TodaysStack() {
  const [doses, setDoses] = useState(DOSES);

  function toggle(id: number) {
    setDoses((d) => d.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)));
  }

  const doneCount = doses.filter((d) => d.checked).length;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f7f6fb", minHeight: "100vh", color: "#1a1a2e" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ede9f8", padding: "20px 24px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#8b5cf6", textTransform: "uppercase", marginBottom: 4 }}>
          Thursday, April 3 — Protocol day 25
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>Today's Stack</div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Dose tracker */}
        <div style={{ background: "#fff", border: "1px solid #ede9f8", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Doses today</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6" }}>{doneCount}/{doses.length} logged</div>
          </div>

          {/* Progress */}
          <div style={{ height: 3, background: "#f3f0ff", marginBottom: 0 }}>
            <div style={{ height: 3, background: "#8b5cf6", width: (doneCount / doses.length) * 100 + "%", transition: "width 0.3s ease" }} />
          </div>

          {doses.map((d, i) => (
            <div
              key={d.id}
              onClick={() => toggle(d.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderTop: i > 0 ? "1px solid #f3f0ff" : undefined,
                cursor: "pointer",
                opacity: d.checked ? 0.55 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: d.checked ? "none" : "2px solid #d1d5db",
                  background: d.checked ? "#8b5cf6" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                {d.checked && <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, textDecoration: d.checked ? "line-through" : "none" }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600 }}>{d.amount}</span>
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{d.time} · {d.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Urgency cards */}
        {URGENCY_CARDS.map((card) => (
          <div
            key={card.urgency}
            style={{
              background: card.bg,
              border: "1px solid " + card.border,
              borderRadius: 16,
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{card.icon}</span>
              <Badge style={{ background: card.color + "22", color: card.color, border: "none", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {card.label}
              </Badge>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: card.progress > 0 ? 12 : 14 }}>{card.sub}</div>

            {card.progress > 0 && (
              <div style={{ height: 4, background: card.color + "33", borderRadius: 2, marginBottom: 14 }}>
                <div style={{ height: 4, borderRadius: 2, background: card.color, width: card.progress + "%" }} />
              </div>
            )}

            <Button
              style={{
                background: card.ctaBg,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              {card.cta}
            </Button>
          </div>
        ))}

        {/* Protocol phase footer */}
        <div style={{ background: "#fff", border: "1px solid #ede9f8", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active protocol</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginTop: 3 }}>BPC-157 + TB-500</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Week 4 of 12</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginTop: 1 }}>3 days left in cycle</div>
          </div>
        </div>

      </div>
    </div>
  );
}
