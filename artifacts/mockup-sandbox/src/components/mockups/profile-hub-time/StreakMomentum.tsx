import React, { useState } from "react";

const WEEKS = 8;
const COLS = 7;

function generateActivity() {
  const grid: number[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const row: number[] = [];
    for (let d = 0; d < COLS; d++) {
      if (w === WEEKS - 1 && d > 3) {
        row.push(-1);
      } else if (w < 3 && Math.random() < 0.3) {
        row.push(0);
      } else {
        row.push(Math.floor(Math.random() * 3) + 1);
      }
    }
    grid.push(row);
  }
  return grid;
}

const ACTIVITY = generateActivity();

const ACTIVITY_COLORS = ["#e8e4f8", "#c4b5fd", "#8b5cf6", "#5b21b6"];

const RINGS = [
  { label: "Protocol", value: 90, color: "#8b5cf6", max: 100, unit: "%" },
  { label: "Tests logged", value: 2, color: "#3b82f6", max: 4, unit: "/4 this Q" },
  { label: "Order cadence", value: 47, color: "#10b981", max: 60, unit: " day avg" },
];

function Ring({ value, max, color, size = 80, stroke = 8 }: { value: number; max: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e4f8" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function StreakMomentum() {
  const [tab, setTab] = useState<"overview" | "protocol" | "tests">("overview");

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0d0d1a", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#7c6bdc", textTransform: "uppercase" }}>@iam0121</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>Your Momentum</div>
        </div>
        <div style={{ textAlign: "center", background: "#1a0a2e", border: "1px solid #4c1d95", borderRadius: 14, padding: "10px 18px" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, letterSpacing: "0.08em" }}>STREAK</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#f59e0b", lineHeight: 1 }}>21</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>days</div>
        </div>
      </div>

      {/* Activity grid */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Logging activity — last 8 weeks</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#4b5563", fontWeight: 600, marginBottom: 2 }}>{d}</div>
          ))}
          {ACTIVITY.map((week, wi) =>
            week.map((level, di) => (
              <div
                key={wi + "-" + di}
                style={{
                  height: 28,
                  borderRadius: 6,
                  background: level === -1 ? "transparent" : ACTIVITY_COLORS[level] || ACTIVITY_COLORS[0],
                  opacity: level === -1 ? 0 : 1,
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "20px 24px 0", display: "flex", gap: 6 }}>
        {(["overview", "protocol", "tests"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              background: tab === t ? "#8b5cf6" : "#1e1b2e",
              color: tab === t ? "#fff" : "#6b7280",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rings */}
      {tab === "overview" && (
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {RINGS.map((r) => (
              <div key={r.label} style={{ background: "#12101e", border: "1px solid #2d2b42", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Ring value={r.value} max={r.max} color={r.color} />
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: r.color }}>{r.value}{r.unit}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 600 }}>{r.label}</div>
              </div>
            ))}
          </div>

          {/* Active protocol */}
          <div style={{ background: "#12101e", border: "1px solid #2d2b42", borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Active Protocol</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>BPC-157 + TB-500</span>
              <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>Week 4 of 12</span>
            </div>
            <div style={{ height: 6, background: "#2d2b42", borderRadius: 3, marginBottom: 12 }}>
              <div style={{ height: 6, borderRadius: 3, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)", width: "33%" }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { c: "BPC-157", d: "2mg / EOD" },
                { c: "TB-500", d: "2.5mg / week" },
                { c: "Ipamorelin", d: "200mcg / ED" },
              ].map((item) => (
                <div key={item.c} style={{ background: "#1e1b2e", border: "1px solid #3d3b52", borderRadius: 10, padding: "7px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e2d9f3" }}>{item.c}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{item.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "protocol" && (
        <div style={{ padding: "20px 24px" }}>
          {[
            { week: "Week 1", done: true },
            { week: "Week 2", done: true },
            { week: "Week 3", done: true },
            { week: "Week 4", done: false, current: true },
            { week: "Week 5–12", done: false },
          ].map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: w.done ? "#8b5cf6" : w.current ? "#1e1b2e" : "#12101e", border: w.current ? "2px solid #8b5cf6" : "2px solid #2d2b42", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {w.done && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
                {w.current && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6" }} />}
              </div>
              <div style={{ fontWeight: 600, color: w.done ? "#a78bfa" : w.current ? "#fff" : "#4b5563", fontSize: 14 }}>{w.week}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "tests" && (
        <div style={{ padding: "20px 24px" }}>
          {[
            { label: "IGF-1", date: "Feb 12", status: "Optimal", color: "#10b981" },
            { label: "Testosterone Total", date: "Feb 12", status: "Elevated", color: "#f59e0b" },
            { label: "Cortisol", date: "Feb 12", status: "Normal", color: "#10b981" },
            { label: "Fasting Glucose", date: "Feb 12", status: "Optimal", color: "#10b981" },
          ].map((t, i) => (
            <div key={i} style={{ background: "#12101e", border: "1px solid #2d2b42", borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Last: {t.date}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.color, background: t.color + "22", padding: "4px 10px", borderRadius: 8 }}>{t.status}</div>
            </div>
          ))}
          <div style={{ background: "#1a0a2e", border: "1px dashed #4c1d95", borderRadius: 12, padding: 16, textAlign: "center", color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>
            Next panel recommended in ~3 weeks
          </div>
        </div>
      )}
    </div>
  );
}
