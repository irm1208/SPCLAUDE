import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, User, ShoppingBag, Truck, FileText, ChevronRight } from "lucide-react";
import { useState } from "react";

function SectionCard({ icon: Icon, title, subtitle, color, expanded, onToggle, children }: {
  icon: typeof User; title: string; subtitle: string; color: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: expanded ? color : "#D0DAE4" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "#1A2B3C" }}>{title}</p>
          <p className="text-[10px]" style={{ color: "#8A9AAA" }}>{subtitle}</p>
        </div>
        <ChevronRight
          className="w-4 h-4 transition-transform"
          style={{ color: "#D0DAE4", transform: expanded ? "rotate(90deg)" : "none" }}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "#E8EDF2" }}>
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

export function CardStack() {
  const [expanded, setExpanded] = useState<string | null>("customer");
  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3 bg-white border-b" style={{ borderColor: "#D0DAE4" }}>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F0F4F8" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#1A2B3C" }} />
        </button>
        <span className="text-sm font-bold flex-1" style={{ color: "#1A2B3C" }}>New Order</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0F4F8", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 pb-36 space-y-3">
        <SectionCard
          icon={User}
          title="Customer Details"
          subtitle="Who is this order for?"
          color="#3B82F6"
          expanded={expanded === "customer"}
          onToggle={() => toggle("customer")}
        >
          <div className="space-y-2">
            <label className="text-xs font-extrabold" style={{ color: "#1A2B3C" }}>Telegram Username</label>
            <input
              className="w-full h-11 rounded-xl border px-4 text-sm"
              style={{ borderColor: "#D0DAE4" }}
              placeholder="@username"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={ShoppingBag}
          title="Your Products"
          subtitle="0 items · $0.00"
          color="#8B5CF6"
          expanded={expanded === "products"}
          onToggle={() => toggle("products")}
        >
          <div className="space-y-3">
            <div className="relative">
              <select className="w-full appearance-none h-11 rounded-xl border px-4 pr-10 text-sm" style={{ borderColor: "#D0DAE4" }}>
                <option>Select a product...</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 w-5 h-5" style={{ color: "#8A9AAA" }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center h-10 border rounded-xl overflow-hidden" style={{ borderColor: "#D0DAE4" }}>
                <button className="px-3 h-full text-lg" style={{ color: "#8A9AAA" }}>−</button>
                <span className="w-10 text-center text-sm font-semibold">0.5</span>
                <button className="px-3 h-full text-lg" style={{ color: "#8A9AAA" }}>+</button>
              </div>
              <span className="font-bold text-sm" style={{ color: "#1A2B3C" }}>$0.00</span>
            </div>
            <button className="w-full h-10 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center gap-2" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
              <Plus className="w-3 h-3" /> Add another product
            </button>
          </div>
        </SectionCard>

        <SectionCard
          icon={Truck}
          title="Delivery Method"
          subtitle="Choose how we ship"
          color="#EA580C"
          expanded={expanded === "delivery"}
          onToggle={() => toggle("delivery")}
        >
          <div className="space-y-2">
            {[
              { name: "Royal Mail", price: "$10.00", selected: true },
              { name: "InPost", price: "$3.00", selected: false },
            ].map(m => (
              <label
                key={m.name}
                className="flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer"
                style={{ borderColor: m.selected ? "#4A7BA7" : "#D0DAE4", background: m.selected ? "#4A7BA710" : "transparent" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: m.selected ? "#4A7BA7" : "#8A9AAA80" }}>
                    {m.selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4A7BA7" }} />}
                  </div>
                  <Package className="w-4 h-4" style={{ color: "#8A9AAA" }} />
                  <span className="font-semibold text-sm" style={{ color: m.selected ? "#4A7BA7" : "#1A2B3C" }}>{m.name}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: m.selected ? "#4A7BA7" : "#8A9AAA" }}>{m.price}</span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={FileText}
          title="Extras & Notes"
          subtitle="Tips, instructions, help"
          color="#059669"
          expanded={expanded === "extras"}
          onToggle={() => toggle("extras")}
        >
          <div className="space-y-3">
            <button
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-semibold"
              style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}
            >
              <Heart className="w-4 h-4" />
              <span>Add a tip?</span>
              <span className="text-xs font-normal">(optional)</span>
            </button>

            <textarea
              className="w-full rounded-xl border p-3 text-sm min-h-[70px] resize-none"
              style={{ borderColor: "#D0DAE4" }}
              placeholder="Any special instructions? (Optional)"
            />

            <a href="#" className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "#D0DAE4" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
                <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
                <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help?</p>
              </div>
            </a>
          </div>
        </SectionCard>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t" style={{ borderColor: "#D0DAE4" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#8A9AAA" }}>Grand Total</p>
              <p className="text-xl font-bold" style={{ color: "#1A2B3C" }}>$10.00</p>
              <p className="text-[10px]" style={{ color: "#8A9AAA" }}>incl. Royal Mail</p>
            </div>
            <button className="h-12 px-7 rounded-xl text-sm font-bold text-white" style={{ background: "#1A2B3C" }}>
              Review Order
            </button>
          </div>
          <p className="text-[10px] text-center border-t pt-2" style={{ borderColor: "#E8EDF2", color: "#8A9AAA" }}>
            Payments are to be made through the website once sleeping pep confirms
          </p>
        </div>
      </div>
    </div>
  );
}
