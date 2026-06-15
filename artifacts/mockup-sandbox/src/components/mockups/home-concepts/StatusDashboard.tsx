import { Package, Clock, Plus, ChevronRight, MessageCircle, ShoppingBag, RefreshCw } from "lucide-react";

export function StatusDashboard() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Peps Anonymous</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#E8EDF2", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 space-y-4">
        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2B3C 0%, #2D4A5E 100%)" }}>
          <div className="relative z-10">
            <p className="text-xs font-medium opacity-70 mb-1">YOUR DRAFT ORDER</p>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-lg font-bold">1 item</p>
                <p className="text-xs opacity-60">No username set</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.15)" }}>
                <Clock className="w-3 h-3" />
                Draft
              </div>
            </div>
            <button className="w-full h-10 rounded-lg text-sm font-bold flex items-center justify-center gap-2" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              <RefreshCw className="w-4 h-4" />
              Resume Draft
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: "rgba(74,123,167,0.3)", transform: "translate(40%, -40%)" }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-white border p-4 text-left" style={{ borderColor: "#D0DAE4" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "#E8F0FE" }}>
              <ShoppingBag className="w-4 h-4" style={{ color: "#4A7BA7" }} />
            </div>
            <p className="text-sm font-bold mb-0.5" style={{ color: "#1A2B3C" }}>New Order</p>
            <p className="text-[10px] leading-tight" style={{ color: "#8A9AAA" }}>Browse 128+ products</p>
          </button>

          <button className="rounded-xl bg-white border p-4 text-left" style={{ borderColor: "#D0DAE4" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "#FFF3E0" }}>
              <Package className="w-4 h-4" style={{ color: "#E67E22" }} />
            </div>
            <p className="text-sm font-bold mb-0.5" style={{ color: "#1A2B3C" }}>Track Order</p>
            <p className="text-[10px] leading-tight" style={{ color: "#8A9AAA" }}>Check status & pay</p>
          </button>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider px-1 mb-2.5" style={{ color: "#8A9AAA" }}>Quick Actions</p>
          <div className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: "#D0DAE4" }}>
            {[
              { label: "Pay with USDT", desc: "Complete crypto payment", color: "#22C55E" },
              { label: "Upload InPost QR", desc: "Add your locker QR code", color: "#8B5CF6" },
              { label: "Change PIN", desc: "Update your security PIN", color: "#EC4899" },
            ].map((action, i) => (
              <button key={i} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i < 2 ? "border-b" : ""}`} style={{ borderColor: "#E8EDF2" }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: action.color }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#1A2B3C" }}>{action.label}</p>
                  <p className="text-[10px]" style={{ color: "#8A9AAA" }}>{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "#D0DAE4" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: "#E8EDF2" }}>
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#4A7BA7" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#5A6E7F" }}>
            You'll need your Telegram username and 4-digit PIN to access orders. Default PIN is 0000.
          </p>
        </div>

        <a href="#" className="flex items-center gap-3 p-3.5 rounded-xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Message us on Telegram for help</p>
          </div>
        </a>
      </main>
    </div>
  );
}
