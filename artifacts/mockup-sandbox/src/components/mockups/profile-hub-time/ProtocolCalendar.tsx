import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = 3;

const PROTOCOL_EVENTS = [
  { day: 0, type: "dose", label: "BPC-157", sub: "2mg — Day 22" },
  { day: 0, type: "dose", label: "TB-500", sub: "2.5mg — Week 4" },
  { day: 1, type: "dose", label: "BPC-157", sub: "2mg — Day 23" },
  { day: 2, type: "dose", label: "BPC-157", sub: "2mg — Day 24" },
  { day: 3, type: "delivery", label: "Order #FS-9921", sub: "Arriving today" },
  { day: 3, type: "dose", label: "BPC-157", sub: "2mg — Day 25" },
  { day: 4, type: "dose", label: "BPC-157", sub: "2mg — Day 26" },
  { day: 5, type: "test", label: "Test window opens", sub: "IGF-1 panel" },
  { day: 6, type: "dose", label: "TB-500", sub: "2.5mg — Week 4" },
];

const UPCOMING = [
  { label: "Tirzepatide group buy closes", days: 8, color: "#f59e0b" },
  { label: "BPC-157 protocol ends", days: 14, color: "#8b5cf6" },
  { label: "Quarterly blood panel due", days: 21, color: "#3b82f6" },
];

const TYPE_COLORS: Record<string, string> = {
  dose: "#8b5cf6",
  delivery: "#10b981",
  test: "#3b82f6",
};
const TYPE_BG: Record<string, string> = {
  dose: "#f3f0ff",
  delivery: "#ecfdf5",
  test: "#eff6ff",
};

export default function ProtocolCalendar() {
  const [selectedDay, setSelectedDay] = useState(TODAY_IDX);

  const dayEvents = PROTOCOL_EVENTS.filter((e) => e.day === selectedDay);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8f7ff", minHeight: "100vh", color: "#1a1a2e" }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e4f8", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "#8b5cf6", textTransform: "uppercase" }}>Protocol Calendar</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>Week 4 of 12 — BPC-157 + TB-500</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Protocol progress</div>
          <div style={{ position: "relative", width: 120, height: 8, background: "#e8e4f8", borderRadius: 4 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: "33%", background: "#8b5cf6", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6" }}>33%</div>
        </div>
      </div>

      {/* Week strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e4f8", padding: "12px 24px", display: "flex", gap: 8 }}>
        {DAYS.map((d, i) => {
          const hasEvent = PROTOCOL_EVENTS.some((e) => e.day === i);
          const isToday = i === TODAY_IDX;
          const isSelected = i === selectedDay;
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(i)}
              style={{
                flex: 1,
                padding: "10px 4px",
                borderRadius: 10,
                border: isSelected ? "2px solid #8b5cf6" : "2px solid transparent",
                background: isSelected ? "#8b5cf6" : isToday ? "#f3f0ff" : "#f9f9fb",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#fff" : "#6b7280", textTransform: "uppercase" }}>{d}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: isSelected ? "#fff" : isToday ? "#8b5cf6" : "#1a1a2e" }}>{3 + i}</span>
              {hasEvent && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : "#8b5cf6" }} />
              )}
              {!hasEvent && <span style={{ width: 6, height: 6 }} />}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 0, height: "calc(100vh - 165px)" }}>
        {/* Day detail */}
        <div style={{ padding: 24, overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {DAYS[selectedDay]}{selectedDay === TODAY_IDX ? " — Today" : ""}
          </div>

          {dayEvents.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              No events scheduled
            </div>
          )}

          {dayEvents.map((ev, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8e4f8", borderRadius: 14, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: TYPE_BG[ev.type], display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18 }}>
                  {ev.type === "dose" ? "💊" : ev.type === "delivery" ? "📦" : "🧪"}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{ev.label}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{ev.sub}</div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[ev.type] }} />
            </div>
          ))}

          {selectedDay === TODAY_IDX && (
            <div style={{ marginTop: 8 }}>
              <Button style={{ width: "100%", background: "#8b5cf6", color: "#fff", borderRadius: 12, fontWeight: 600 }}>
                Log today's doses
              </Button>
            </div>
          )}
        </div>

        {/* Upcoming sidebar */}
        <div style={{ borderLeft: "1px solid #e8e4f8", padding: 24, background: "#fff", overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Upcoming</div>

          {UPCOMING.map((u, i) => (
            <div key={i} style={{ marginBottom: 18, padding: "14px 16px", background: "#f8f7ff", borderRadius: 12, border: "1px solid #e8e4f8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", lineHeight: 1.4, flex: 1, paddingRight: 8 }}>{u.label}</div>
                <Badge style={{ background: u.color + "22", color: u.color, border: "none", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{u.days}d</Badge>
              </div>
              <div style={{ height: 4, background: "#e8e4f8", borderRadius: 2 }}>
                <div style={{ height: 4, borderRadius: 2, background: u.color, width: Math.max(4, 100 - (u.days / 30) * 100) + "%" }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: "14px 16px", background: "#ecfdf5", borderRadius: 12, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Order arriving today</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>Order #FS-9921</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>BPC-157 × 2 vials, TB-500 × 1 vial</div>
          </div>
        </div>
      </div>
    </div>
  );
}
