import { ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical, Users, ArrowRight, MessageCircle, ChevronRight, Wallet, TrendingUp } from "lucide-react";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider px-2 mb-1 mt-3" style={{ color: "#94A3B8" }}>{children}</p>
  );
}

function ActionRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  sub,
  badge,
  cta,
  ctaColor,
  last = false,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  sub: string;
  badge?: string;
  cta?: string;
  ctaColor?: string;
  last?: boolean;
}) {
  return (
    <button
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-white"
      style={{ borderBottom: last ? "none" : "1px solid rgba(0,0,0,0.05)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#D97706" }}>{badge}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-tight">{sub}</p>
      </div>
      {cta ? (
        <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: ctaColor ?? "#EFF6FF", color: "#2563EB" }}>
          {cta}
        </span>
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
      )}
    </button>
  );
}

export function SectionedRows() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>

      {/* Compact header */}
      <div className="pt-12 px-4 pb-4" style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#4B6EF5" }}>Peps Anonymous</p>
            <h1 className="text-xl font-black text-white leading-tight">Salt &amp; Peps</h1>
          </div>
          <button className="h-8 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5" style={{ background: "rgba(59,130,246,0.25)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.3)" }}>
            <Users className="w-3.5 h-3.5" /> My Account
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-4 pb-1">
          {[
            { label: "Active Orders", value: "3", color: "#60A5FA" },
            { label: "Group Buys", value: "1 open", color: "#34D399" },
            { label: "Lab Reports", value: "352+", color: "#A78BFA" },
          ].map(s => (
            <div key={s.label} className="flex flex-col">
              <span className="text-base font-black" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pt-2">

        {/* Orders section */}
        <SectionLabel>Orders</SectionLabel>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <ActionRow
            icon={ShoppingBag}
            iconBg="#EFF6FF"
            iconColor="#2563EB"
            label="Place New Order"
            sub="Join a group buy or browse products"
            cta="Start"
            ctaColor="#EFF6FF"
          />
          <ActionRow
            icon={Users}
            iconBg="#FFF7ED"
            iconColor="#EA580C"
            label="My Group Buy Orders"
            sub="Track &amp; manage your active orders"
            badge="3 active"
            last
          />
        </div>

        {/* Lookup section */}
        <SectionLabel>Quick Lookup</SectionLabel>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <ActionRow
            icon={Search}
            iconBg="#F0FDF4"
            iconColor="#16A34A"
            label="Find Order by Code"
            sub="Enter your 4-digit order code"
          />
          <ActionRow
            icon={Wallet}
            iconBg="#FFFBEB"
            iconColor="#D97706"
            label="Pay with USDT"
            sub="Submit payment on Ethereum blockchain"
            last
          />
        </div>

        {/* Resources section */}
        <SectionLabel>Resources</SectionLabel>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <ActionRow
            icon={TestTube}
            iconBg="#F0F9FF"
            iconColor="#0EA5E9"
            label="Lab Reports"
            sub="352+ Janoshik CoA tests from Uther"
          />
          <ActionRow
            icon={ShieldCheck}
            iconBg="#F0FDF4"
            iconColor="#16A34A"
            label="Safety Calculator"
            sub="Endotoxin limits &amp; BAC water safety"
          />
          <ActionRow
            icon={FlaskConical}
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            label="The Lonely Vial"
            sub="Single vials — no minimums, pay with USDT"
            badge="In stock"
            last
          />
        </div>

        {/* Telegram footer */}
        <div className="flex items-center justify-between px-2 mt-4 pb-2">
          <a href="#" className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "#2AABEE" }} />
            <span className="text-sm font-semibold" style={{ color: "#2AABEE" }}>@urbanblend789</span>
          </a>
          <span className="text-xs text-slate-400">Verified USDT · Ethereum</span>
        </div>
      </main>

      {/* Bottom tabs */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 px-2 bg-white" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { icon: ShoppingBag, label: "Home", active: true },
          { icon: Search, label: "Lookup", active: false },
          { icon: Users, label: "Account", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} className="flex flex-col items-center gap-1">
            <Icon className="w-5 h-5" style={{ color: active ? "#2563EB" : "#94A3B8" }} />
            <span className="text-[10px] font-semibold" style={{ color: active ? "#2563EB" : "#94A3B8" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
