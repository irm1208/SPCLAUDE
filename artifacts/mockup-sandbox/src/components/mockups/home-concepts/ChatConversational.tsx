import { Send, ShoppingBag, Search, Wallet, FileText, MessageCircle } from "lucide-react";

function Bubble({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
        style={{
          background: align === "right" ? "#4A7BA7" : "#FFFFFF",
          color: align === "right" ? "#FFFFFF" : "#1A2B3C",
          borderBottomLeftRadius: align === "left" ? "4px" : undefined,
          borderBottomRightRadius: align === "right" ? "4px" : undefined,
          border: align === "left" ? "1px solid #D0DAE4" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function QuickReply({ icon: Icon, label, highlight }: { icon: typeof ShoppingBag; label: string; highlight?: boolean }) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
      style={{
        background: highlight ? "#1A2B3C" : "#FFFFFF",
        color: highlight ? "#FFFFFF" : "#1A2B3C",
        border: highlight ? "none" : "1px solid #D0DAE4",
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export function ChatConversational() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3 bg-white border-b" style={{ borderColor: "#D0DAE4" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#1A2B3C" }}>
          <span className="text-xs font-bold text-white">PA</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Peps Anonymous</p>
          <p className="text-[10px]" style={{ color: "#22C55E" }}>● Online</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0F4F8", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
        <div className="text-center">
          <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: "#E8EDF2", color: "#8A9AAA" }}>Today</span>
        </div>

        <Bubble>
          <p className="leading-relaxed">
            Hey! 👋 Welcome to <span className="font-bold">Peps Anonymous</span>. What would you like to do?
          </p>
        </Bubble>

        <div className="pl-2 space-y-3">
          <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #D0DAE4" }}>
            <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "#E8EDF2" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: "#1A2B3C" }}>You have a draft order</p>
                <p className="text-[10px]" style={{ color: "#8A9AAA" }}>1 item · No username</p>
              </div>
            </div>
            <button className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold" style={{ color: "#4A7BA7" }}>
              <FileText className="w-3.5 h-3.5" />
              Resume Draft
            </button>
          </div>
        </div>

        <Bubble>
          <p className="leading-relaxed">Or pick one of these:</p>
        </Bubble>

        <div className="flex flex-wrap gap-2 pl-2">
          <QuickReply icon={ShoppingBag} label="New Order" highlight />
          <QuickReply icon={Search} label="Find Order" />
          <QuickReply icon={Wallet} label="Pay" />
        </div>

        <div className="pt-2">
          <Bubble>
            <p className="text-xs leading-relaxed" style={{ color: "#5A6E7F" }}>
              🔒 To look up an order, you'll need your Telegram username and 4-digit PIN. Default PIN is 0000.
            </p>
          </Bubble>
        </div>
      </main>

      <div className="bg-white border-t px-4 py-3 space-y-3" style={{ borderColor: "#D0DAE4" }}>
        <a href="#" className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "#2AABEE" }}>
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="font-semibold">@urbanblend789</span>
          <span style={{ color: "#8A9AAA" }}>· Need help?</span>
        </a>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 rounded-full border px-4 flex items-center text-sm" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
            Type a message...
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#4A7BA7" }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
