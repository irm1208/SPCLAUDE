import { ShoppingBag, Search, ArrowRight, TestTube, ShieldCheck, FlaskConical, Users } from "lucide-react";

export function ElevatedCards() {
  const sections = [
    {
      id: "order",
      badge: "New Customer",
      icon: <ShoppingBag className="w-4 h-4" />,
      color: "#60A5FA",
      glow: "rgba(59,130,246,0.18)",
      border: "rgba(59,130,246,0.25)",
      bg: "linear-gradient(160deg, #131F35 0%, #1A2D4A 100%)",
      orb: "rgba(59,130,246,0.12)",
      title: "Place an order",
      desc: "Browse products and checkout",
      btn: { label: "Group Buy Login", icon: <Users className="w-4 h-4" />, bg: "linear-gradient(135deg, #3B82F6, #2563EB)" },
      btnSecondary: null,
    },
    {
      id: "manage",
      badge: "Returning",
      icon: <Search className="w-4 h-4" />,
      color: "#FCD34D",
      glow: "rgba(245,158,11,0.15)",
      border: "rgba(245,158,11,0.25)",
      bg: "linear-gradient(160deg, #1C2A1A 0%, #2D3D1C 100%)",
      orb: "rgba(245,158,11,0.10)",
      title: "Manage your order",
      desc: "Track, edit, pay, or upload your InPost QR code",
      btn: { label: "My Orders", icon: <Search className="w-4 h-4" />, bg: "linear-gradient(135deg, #EA580C, #C2410C)" },
      btnSecondary: "Find order by code",
    },
    {
      id: "lab",
      badge: "Quality Assurance",
      icon: <TestTube className="w-4 h-4" />,
      color: "#22D3EE",
      glow: "rgba(6,182,212,0.12)",
      border: "rgba(6,182,212,0.2)",
      bg: "linear-gradient(160deg, #091525 0%, #0C1E30 100%)",
      orb: "rgba(6,182,212,0.10)",
      title: "Lab Reports",
      desc: "Independent Janoshik CoA tests — 352+ reports from supplier Uther",
      btn: { label: "Browse Lab Results", icon: <TestTube className="w-4 h-4" />, bg: "linear-gradient(135deg, #0EA5E9, #0284C7)" },
      btnSecondary: null,
    },
    {
      id: "safety",
      badge: "Endotoxin & BAC Safety",
      icon: <ShieldCheck className="w-4 h-4" />,
      color: "#4ADE80",
      glow: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.2)",
      bg: "linear-gradient(160deg, #091A14 0%, #0D2118 100%)",
      orb: "rgba(34,197,94,0.10)",
      title: "Safety Calculator",
      desc: "Calculate endotoxin limits and BAC water safety for your reconstituted peptides",
      btn: { label: "Open Safety Calculator", icon: <ShieldCheck className="w-4 h-4" />, bg: "linear-gradient(135deg, #16A34A, #15803D)" },
      btnSecondary: null,
    },
    {
      id: "vial",
      badge: "Single Vials",
      icon: <FlaskConical className="w-4 h-4" />,
      color: "#A78BFA",
      glow: "rgba(139,92,246,0.14)",
      border: "rgba(139,92,246,0.25)",
      bg: "linear-gradient(160deg, #140B2E 0%, #1C0E3A 100%)",
      orb: "rgba(139,92,246,0.10)",
      title: "The Lonely Vial",
      desc: "Buy individual vials — no kits, no minimums. Pay with USDT.",
      btn: { label: "Browse the Shop", icon: <FlaskConical className="w-4 h-4" />, bg: "linear-gradient(135deg, #7C3AED, #6D28D9)" },
      btnSecondary: null,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#0B1120", fontFamily: "Inter, sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: "rgba(11,17,32,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-sm font-bold text-white tracking-tight">Salt & Peps</span>
        <div className="flex items-center gap-2">
          <button className="text-xs font-semibold text-white/70 flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            Login
          </button>
          <button className="text-xs font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/25 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            USD <span className="w-4 h-4 bg-blue-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white">S</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-3">
        <div className="pt-2 pb-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #E2E8F0 0%, #60A5FA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Salt & Peps
          </h1>
          <p className="text-sm mt-1 tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Peps Anonymous</p>
          <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
            Peptide group buys — quality tested, discreetly shipped.
          </p>
        </div>

        {sections.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl overflow-hidden flex flex-col relative"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow: `0 4px 24px ${s.glow}`,
            }}
          >
            <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ color: s.color, background: `${s.glow}`, border: `1px solid ${s.border}` }}
                >
                  {s.icon}
                  {s.badge}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1.5">{s.title}</h2>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{s.desc}</p>
              <button
                className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full text-white"
                style={{ background: s.btn.bg }}
              >
                {s.btn.icon} {s.btn.label} <ArrowRight className="w-4 h-4" />
              </button>
              {s.btnSecondary && (
                <button
                  className="mt-2 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Search className="w-3.5 h-3.5" /> {s.btnSecondary}
                </button>
              )}
            </div>
            <div
              className="absolute top-0 right-0 w-28 h-28 rounded-full"
              style={{ background: s.orb, transform: "translate(30%, -30%)" }}
            />
          </div>
        ))}

        <div className="flex items-center justify-between text-xs px-1 pt-1 pb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          <span>@urbanblend789</span>
          <span>Pay with USDT · Ethereum</span>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex pb-safe" style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {[
          { label: "Home", active: true },
          { label: "Protocols", active: false },
          { label: "Calc", active: false },
          { label: "Account", active: false },
        ].map((tab) => (
          <button key={tab.label} className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1">
            <div className={`w-5 h-5 rounded-md ${tab.active ? "bg-blue-500" : "bg-white/15"}`} />
            <span className={`text-[10px] font-semibold ${tab.active ? "text-blue-400" : "text-white/30"}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
