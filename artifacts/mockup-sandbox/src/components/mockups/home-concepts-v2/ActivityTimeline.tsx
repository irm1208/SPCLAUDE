import { ShoppingBag, Search, ArrowRight, MessageCircle, Wallet, Clock, CheckCircle2, AlertCircle, Package, ChevronRight } from "lucide-react";

function TimelineItem({ icon: Icon, color, title, desc, time, action }: {
  icon: typeof Clock; color: string; title: string; desc: string; time: string; action?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="w-px flex-1 mt-1" style={{ background: "#E8EDF2" }} />
      </div>
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: "#1A2B3C" }}>{title}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#8A9AAA" }}>{desc}</p>
          </div>
          <span className="text-[9px] font-medium shrink-0 mt-0.5" style={{ color: "#8A9AAA" }}>{time}</span>
        </div>
        {action && (
          <button className="mt-2.5 h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: color }}>
            {action} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ActivityTimeline() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3 bg-white border-b" style={{ borderColor: "#D0DAE4" }}>
        <span className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Peps Anonymous</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0F4F8", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-5 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "#8A9AAA" }}>Your activity</p>
            <h1 className="text-lg font-bold" style={{ color: "#1A2B3C" }}>Recent & Next Steps</h1>
          </div>
          <button className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            <ShoppingBag className="w-3.5 h-3.5" /> New Order
          </button>
        </div>

        <div className="rounded-xl bg-white border overflow-hidden p-4" style={{ borderColor: "#D0DAE4" }}>
          <TimelineItem
            icon={AlertCircle}
            color="#F59E0B"
            title="Draft order needs attention"
            desc="1 item added · No username set · Not submitted"
            time="Now"
            action="Resume"
          />
          <TimelineItem
            icon={Package}
            color="#8B5CF6"
            title="InPost QR not uploaded"
            desc="Upload your locker QR code when ready"
            time="Pending"
            action="Upload QR"
          />
          <TimelineItem
            icon={Wallet}
            color="#059669"
            title="Payment available"
            desc="Pay via USDT once your order is confirmed"
            time="Waiting"
          />
          <TimelineItem
            icon={CheckCircle2}
            color="#D0DAE4"
            title="Order shipped"
            desc="Tracking number will appear here"
            time="—"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Quick Links</p>
          {[
            { label: "Find My Order", desc: "By username or code" },
            { label: "Change PIN", desc: "Update security PIN" },
          ].map(item => (
            <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border text-left" style={{ borderColor: "#D0DAE4" }}>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#1A2B3C" }}>{item.label}</p>
                <p className="text-[10px]" style={{ color: "#8A9AAA" }}>{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "#D0DAE4" }} />
            </button>
          ))}
        </div>

        <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: "#E8EDF2" }}>
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#4A7BA7" }} />
          <p className="text-[10px] leading-relaxed" style={{ color: "#5A6E7F" }}>
            Access your orders with your Telegram username and 4-digit PIN. Default PIN is 0000.
          </p>
        </div>

        <a href="#" className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Telegram support</p>
          </div>
        </a>
      </main>
    </div>
  );
}
