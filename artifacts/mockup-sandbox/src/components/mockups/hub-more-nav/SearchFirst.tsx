import { useState } from "react";

const S = {
  bg: "#0a1120",
  surface: "#111827",
  surface2: "#1e2d45",
  border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  subtle: "#475569",
  blue: "#3b82f6",
  blueDeep: "#1d4ed8",
};

const items = [
  { id: "compounds",    label: "Compounds",      icon: "💉", desc: "Log & track your stack" },
  { id: "health",       label: "Health Insights", icon: "❤️", desc: "Biomarker overview" },
  { id: "glp1",         label: "GLP-1 Tracker",   icon: "⚖️", desc: "Weight & dose history" },
  { id: "plotter",      label: "Cycle Plotter",   icon: "📈", desc: "Visualise your cycles" },
  { id: "profile",      label: "Profile",         icon: "👤", desc: "Edit personal details" },
  { id: "telegram",     label: "Telegram",        icon: "✈️", desc: "Notifications & linking" },
  { id: "gborganiser",  label: "GB Organiser",    icon: "🏪", desc: "Manage your group buys" },
];

export function SearchFirst() {
  const [query, setQuery] = useState("");
  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ background: "rgba(0,0,0,0.5)", minHeight: "100vh", display: "flex", alignItems: "flex-end", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", borderRadius: "24px 24px 0 0", background: S.surface, border: `1px solid ${S.border}`, borderBottom: "none", paddingBottom: 16 }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: S.border }} />
        </div>

        {/* Search input */}
        <div style={{ padding: "12px 16px 10px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.45 }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search sections…"
              style={{
                width: "100%", height: 40, paddingLeft: 36, paddingRight: 12,
                borderRadius: 12, background: S.surface2, border: `1px solid ${S.border}`,
                color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: S.muted, padding: "2px 4px" }}
              >✕</button>
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: "0 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: S.subtle, fontSize: 13 }}>No sections match "{query}"</div>
          ) : (
            filtered.map((item, idx) => {
              const q = query.toLowerCase();
              const matchLabel = item.label.toLowerCase().includes(q);
              return (
                <button
                  key={item.id}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 10px", borderRadius: 12, background: "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${S.border}` : "none",
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: S.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: matchLabel && query ? S.blue : S.text }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: S.subtle, marginTop: 1 }}>{item.desc}</p>
                  </div>
                  <span style={{ fontSize: 12, color: S.subtle, flexShrink: 0 }}>›</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
