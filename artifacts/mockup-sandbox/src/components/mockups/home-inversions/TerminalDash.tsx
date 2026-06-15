import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Activity, Clock, Zap,
} from "lucide-react";

// INVERSION 2: Terminal dashboard
// Inverts: generous padding → maximum density; one-CTA-per-card → multiple actions in tight rows;
// feature isolation → unified command panel; scroll → everything visible at once.

const ROW_H = 44;

export function TerminalDash() {
  const [activeTab, setActiveTab] = useState("home");
  const [hover, setHover] = useState<string | null>(null);

  const row = (id: string) => ({
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover(null),
    style: {
      background: hover === id ? "rgba(255,255,255,0.05)" : "transparent",
      transition: "background 0.1s",
    } as React.CSSProperties,
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#060A0F",
        color: "#E2E8F0",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        maxWidth: 390,
        margin: "0 auto",
        fontSize: 12,
      }}
    >
      {/* Status bar — single tight line */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span style={{ color: "#4ADE80", letterSpacing: "0.05em" }}>SALT&PEPS</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
            <span style={{ color: "#64748B" }}>BUY OPEN</span>
          </div>
          <span style={{ color: "#64748B" }}>|</span>
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" style={{ color: "#60A5FA" }} />
            <span style={{ color: "#60A5FA" }}>217d left</span>
          </div>
          <span style={{ color: "#64748B" }}>|</span>
          <button style={{ color: "#94A3B8" }}>
            <User className="w-3 h-3" />
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col pb-20">

        {/* Section: ORDER */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex items-center px-4 py-1.5"
            style={{ background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.12)" }}
          >
            <ShoppingBag className="w-3 h-3 mr-2" style={{ color: "#60A5FA" }} />
            <span style={{ color: "#60A5FA", letterSpacing: "0.08em", fontSize: 10 }}>ORDER</span>
          </div>

          <button
            className="w-full flex items-center px-4 gap-3"
            style={{ height: ROW_H, ...row("group-buy").style }}
            {...row("group-buy")}
          >
            <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3B82F6" }} />
            <span className="flex-1 text-left font-bold" style={{ color: "#F1F5F9", fontSize: 13 }}>Group Buy Login</span>
            <span style={{ color: "#475569" }}>Place an order →</span>
          </button>

          <button
            className="w-full flex items-center px-4 gap-3"
            style={{ height: ROW_H, ...row("lonely").style }}
            {...row("lonely")}
          >
            <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#A78BFA" }} />
            <span className="flex-1 text-left font-bold" style={{ color: "#F1F5F9", fontSize: 13 }}>The Lonely Vial</span>
            <span style={{ color: "#475569" }}>Single vials, no kit →</span>
          </button>
        </div>

        {/* Section: MANAGE */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex items-center px-4 py-1.5"
            style={{ background: "rgba(234,88,12,0.08)", borderBottom: "1px solid rgba(234,88,12,0.12)" }}
          >
            <Search className="w-3 h-3 mr-2" style={{ color: "#FB923C" }} />
            <span style={{ color: "#FB923C", letterSpacing: "0.08em", fontSize: 10 }}>MANAGE</span>
          </div>

          <button
            className="w-full flex items-center px-4 gap-3"
            style={{ height: ROW_H, ...row("my-orders").style }}
            {...row("my-orders")}
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center font-bold flex-shrink-0" style={{ color: "#FB923C", fontSize: 10 }}>→</span>
            <span className="flex-1 text-left font-bold" style={{ color: "#F1F5F9", fontSize: 13 }}>My Orders</span>
            <span style={{ color: "#475569" }}>Track · Edit · Pay</span>
          </button>

          <button
            className="w-full flex items-center px-4 gap-3"
            style={{ height: ROW_H, ...row("lookup").style }}
            {...row("lookup")}
          >
            <Search className="w-3 h-3 flex-shrink-0" style={{ color: "#64748B" }} />
            <span className="flex-1 text-left" style={{ color: "#94A3B8", fontSize: 13 }}>Find order by code</span>
            <span style={{ color: "#334155" }}>InPost QR →</span>
          </button>

          <div
            className="flex items-center px-4 gap-3"
            style={{ height: 34, borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FBBF24" }} />
            <span style={{ color: "#64748B", fontSize: 11 }}>Draft waiting · 1 item</span>
            <button style={{ color: "#FBBF24", marginLeft: "auto", fontSize: 11 }} className="font-bold">Resume →</button>
          </div>
        </div>

        {/* Section: LAB */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex items-center px-4 py-1.5"
            style={{ background: "rgba(14,165,233,0.07)", borderBottom: "1px solid rgba(14,165,233,0.12)" }}
          >
            <TestTube className="w-3 h-3 mr-2" style={{ color: "#22D3EE" }} />
            <span style={{ color: "#22D3EE", letterSpacing: "0.08em", fontSize: 10 }}>QA · LAB REPORTS</span>
          </div>

          <button
            className="w-full flex items-center px-4 gap-3"
            style={{ height: ROW_H, ...row("lab").style }}
            {...row("lab")}
          >
            <Activity className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22D3EE" }} />
            <span className="flex-1 text-left font-bold" style={{ color: "#F1F5F9", fontSize: 13 }}>Browse Lab Results</span>
            <span style={{ color: "#475569" }}>352+ Janoshik CoA →</span>
          </button>
        </div>

        {/* Section: SAFETY */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex items-center px-4 py-1.5"
            style={{ background: "rgba(22,163,74,0.07)", borderBottom: "1px solid rgba(22,163,74,0.12)" }}
          >
            <ShieldCheck className="w-3 h-3 mr-2" style={{ color: "#4ADE80" }} />
            <span style={{ color: "#4ADE80", letterSpacing: "0.08em", fontSize: 10 }}>SAFETY · ENDOTOXIN & BAC</span>
          </div>

          <button
            className="w-full flex items-center px-4 gap-3"
            style={{ height: ROW_H, ...row("safety").style }}
            {...row("safety")}
          >
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4ADE80" }} />
            <span className="flex-1 text-left font-bold" style={{ color: "#F1F5F9", fontSize: 13 }}>Safety Calculator</span>
            <span style={{ color: "#475569" }}>Endotoxin · BAC →</span>
          </button>
        </div>

        {/* Meta footer row */}
        <div
          className="flex items-center justify-between px-4 mt-auto"
          style={{ height: 36, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}
        >
          <a
            href="#"
            className="flex items-center gap-1.5"
            style={{ color: "#2AABEE" }}
          >
            <MessageCircle className="w-3 h-3" />
            <span>@urbanblend789</span>
          </a>
          <span style={{ color: "#1E293B" }}>USDT · ETH</span>
        </div>
      </main>

      {/* Bottom tabs — minimal */}
      <nav
        className="fixed bottom-0 left-1/2"
        style={{
          transform: "translateX(-50%)",
          width: 390,
          background: "#0D1117",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: 12,
        }}
      >
        <div className="flex justify-around pt-2">
          {[
            { id: "home", icon: Home, label: "HOME" },
            { id: "protocols", icon: FileText, label: "PROTO" },
            { id: "calc", icon: Calculator, label: "CALC" },
            { id: "account", icon: User, label: "ACCT" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <t.icon
                className="w-4 h-4"
                style={{ color: activeTab === t.id ? "#3B82F6" : "#334155" }}
              />
              <span
                style={{
                  color: activeTab === t.id ? "#3B82F6" : "#334155",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                }}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
