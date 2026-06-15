import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight, User, ShoppingBag, Truck, FileText, Check } from "lucide-react";
import { useState } from "react";

function Section({ icon: Icon, label, color, num, done, expanded, onToggle, children }: {
  icon: typeof User; label: string; color: string; num: number; done: boolean; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: expanded ? `2px solid ${color}30` : "2px solid transparent" }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 rounded-2xl text-white relative overflow-hidden" style={{ background: expanded ? `linear-gradient(135deg, ${color}, ${color}CC)` : "linear-gradient(135deg, #1A2B3C, #2D4A5E)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 relative z-10" style={{ background: done ? "#22C55E" : "rgba(255,255,255,0.15)" }}>
          {done ? <Check className="w-4 h-4" /> : num}
        </div>
        <span className="text-sm font-bold relative z-10">{label}</span>
        <Icon className="w-4 h-4 ml-auto opacity-40 relative z-10" />
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5" style={{ transform: "translate(30%, -30%)" }} />
      </button>
      {expanded && (
        <div className="bg-white px-4 py-4 rounded-b-2xl -mt-2 pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

export function GradientAccordion() {
  const [expanded, setExpanded] = useState(0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-sm font-bold flex-1 text-white">New Order</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 pb-36 space-y-2.5">
        <Section icon={User} label="Customer Details" color="#3B82F6" num={1} done={false} expanded={expanded === 0} onToggle={() => setExpanded(expanded === 0 ? -1 : 0)}>
          <div className="space-y-2">
            <label className="text-xs font-extrabold" style={{ color: "#1A2B3C" }}>Telegram Username</label>
            <input className="w-full h-11 rounded-xl border px-4 text-sm" style={{ borderColor: "#D0DAE4" }} placeholder="@username" />
          </div>
        </Section>

        <Section icon={ShoppingBag} label="Your Products" color="#8B5CF6" num={2} done={false} expanded={expanded === 1} onToggle={() => setExpanded(expanded === 1 ? -1 : 1)}>
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
              <span className="font-bold" style={{ color: "#1A2B3C" }}>$0.00</span>
            </div>
            <button className="w-full h-10 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center gap-2" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
              <Plus className="w-3 h-3" /> Add another
            </button>
          </div>
        </Section>

        <Section icon={Truck} label="Delivery Method" color="#EA580C" num={3} done={false} expanded={expanded === 2} onToggle={() => setExpanded(expanded === 2 ? -1 : 2)}>
          <div className="space-y-2">
            {[
              { name: "Royal Mail", price: "$10.00", sel: true },
              { name: "InPost", price: "$3.00", sel: false },
            ].map(m => (
              <label key={m.name} className="flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer" style={{ borderColor: m.sel ? "#4A7BA7" : "#D0DAE4", background: m.sel ? "#4A7BA710" : "transparent" }}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: m.sel ? "#4A7BA7" : "#8A9AAA80" }}>
                    {m.sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4A7BA7" }} />}
                  </div>
                  <Package className="w-4 h-4" style={{ color: "#8A9AAA" }} />
                  <span className="font-semibold text-sm" style={{ color: m.sel ? "#4A7BA7" : "#1A2B3C" }}>{m.name}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: m.sel ? "#4A7BA7" : "#8A9AAA" }}>{m.price}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section icon={FileText} label="Extras & Notes" color="#059669" num={4} done={false} expanded={expanded === 3} onToggle={() => setExpanded(expanded === 3 ? -1 : 3)}>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
              <Heart className="w-4 h-4" /> Add a tip? <span className="text-xs font-normal">(optional)</span>
            </button>
            <textarea className="w-full rounded-xl border p-3 text-sm min-h-[70px] resize-none" style={{ borderColor: "#D0DAE4" }} placeholder="Any special instructions? (Optional)" />
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
        </Section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t" style={{ background: "rgba(15,23,42,0.95)", borderColor: "#1E293B" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Grand Total</p>
              <p className="text-xl font-bold text-white">$10.00</p>
              <p className="text-[10px] text-white/40">incl. Royal Mail</p>
            </div>
            <button className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
