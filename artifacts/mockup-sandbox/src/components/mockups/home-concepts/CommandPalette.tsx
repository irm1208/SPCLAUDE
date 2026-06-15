import { useState } from "react";
import { Search, ArrowRight, ShoppingBag, FileText, Wallet, MessageCircle, Command } from "lucide-react";

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = [
    { icon: ShoppingBag, label: "New order", desc: "Start building a cart", shortcut: "new" },
    { icon: FileText, label: "Resume draft", desc: "1 item · No username", shortcut: "draft" },
    { icon: Search, label: "Look up order", desc: "By username or order code", shortcut: "@" },
    { icon: Wallet, label: "Pay for order", desc: "Complete USDT payment", shortcut: "pay" },
  ];

  const filtered = query
    ? suggestions.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.shortcut.toLowerCase().includes(query.toLowerCase())
      )
    : suggestions;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0E1117", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold" style={{ color: "#E2E8F0" }}>Peps Anonymous</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold" style={{ background: "#1A2332", color: "#64748B" }}>
          USD
        </div>
      </nav>

      <main className="flex-1 px-4 flex flex-col justify-center" style={{ marginTop: "-60px" }}>
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: "#1A2332", border: "1px solid #2D3748" }}>
            <Command className="w-5 h-5" style={{ color: "#64748B" }} />
          </div>
          <p className="text-xs" style={{ color: "#4A5568" }}>Type a command or pick an action</p>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "#1A2332", border: "1px solid #2D3748", boxShadow: "0 0 40px rgba(0,0,0,0.3)" }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#2D3748" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#4A5568" }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="What do you need?"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#E2E8F0" }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#2D3748", color: "#64748B" }}>
                ESC
              </button>
            )}
          </div>

          <div className="py-1">
            {filtered.map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ color: "#CBD5E1" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#243044")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <item.icon className="w-4 h-4 shrink-0" style={{ color: "#4A90D9" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs" style={{ color: "#4A5568" }}>{item.desc}</p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{ background: "#0E1117", color: "#4A5568" }}>
                  {item.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs" style={{ color: "#2D3748" }}>
          <span className="flex items-center gap-1">
            <span className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "#1A2332" }}>↑↓</span>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <span className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "#1A2332" }}>↵</span>
            select
          </span>
        </div>
      </main>

      <footer className="px-4 py-4 text-center">
        <a href="#" className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#2D3748" }}>
          <MessageCircle className="w-3.5 h-3.5" />
          @urbanblend789
        </a>
      </footer>
    </div>
  );
}
