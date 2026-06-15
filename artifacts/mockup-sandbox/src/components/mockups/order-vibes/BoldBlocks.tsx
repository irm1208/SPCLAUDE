import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

export function BoldBlocks() {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}>
        <nav className="flex items-center gap-3 px-4 py-3">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-sm font-bold flex-1 text-white">New Order</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
            USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
          </div>
        </nav>
      </div>

      <main className="flex-1 px-4 py-5 pb-36 space-y-4">
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Customer</p>
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "#D0DAE4" }}>
            <label className="text-xs font-extrabold block mb-2" style={{ color: "#1A2B3C" }}>Telegram Username</label>
            <input
              className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ borderColor: "#D0DAE4" }}
              placeholder="@username"
            />
            <p className="text-[10px] mt-1.5 px-1" style={{ color: "#8A9AAA" }}>Your Telegram handle so we know who you are</p>
          </div>
        </section>

        <div className="rounded-2xl text-white p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2B3C 0%, #2D4A5E 100%)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-3">Your Products</p>

          <div className="relative mb-3">
            <select className="w-full appearance-none h-12 rounded-xl px-4 pr-10 text-sm bg-white/10 border border-white/10 text-white focus:outline-none">
              <option>Select a product...</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-white/30" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center h-11 rounded-xl overflow-hidden border border-white/15">
              <button className="px-3.5 h-full text-lg text-white/50">−</button>
              <span className="w-10 text-center text-sm font-bold">0.5</span>
              <button className="px-3.5 h-full text-lg text-white/50">+</button>
            </div>
            <span className="text-xl font-bold">$0.00</span>
          </div>

          <button className="w-full h-10 mt-3 rounded-xl border border-dashed border-white/15 text-xs font-medium flex items-center justify-center gap-2 text-white/40">
            <Plus className="w-3 h-3" /> Add another product
          </button>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/10" style={{ transform: "translate(30%, -30%)" }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Royal Mail", price: "$10.00", sel: true, gradient: "linear-gradient(135deg, #DC2626, #B91C1C)" },
            { name: "InPost", price: "$3.00", sel: false, gradient: "linear-gradient(135deg, #EAB308, #CA8A04)" },
          ].map(m => (
            <button
              key={m.name}
              className="rounded-2xl p-4 text-left text-white relative overflow-hidden"
              style={{ background: m.gradient, opacity: m.sel ? 1 : 0.7 }}
            >
              <Package className="w-5 h-5 opacity-60 mb-2" />
              <p className="text-sm font-bold">{m.name}</p>
              <p className="text-lg font-bold mt-0.5">{m.price}</p>
              {m.sel && <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-white/80" />}
              <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5" style={{ transform: "translate(-30%, 30%)" }} />
            </button>
          ))}
        </div>

        <section>
          <button
            onClick={() => setShowTip(!showTip)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all text-sm font-semibold"
            style={{
              borderColor: showTip ? "rgba(59,130,246,0.3)" : "#D0DAE4",
              borderStyle: showTip ? "solid" : "dashed",
              background: showTip ? "rgba(59,130,246,0.03)" : "transparent",
              color: showTip ? "#3B82F6" : "#8A9AAA",
            }}
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" style={{ color: showTip ? "#3B82F6" : "#8A9AAA" }} />
              <span>{showTip ? "Tip added" : "Add a tip?"}</span>
              {!showTip && <span className="text-xs font-normal">(optional)</span>}
            </div>
            <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: showTip ? "rotate(180deg)" : "none" }} />
          </button>
          {showTip && (
            <div className="bg-white rounded-2xl border mt-2 p-4" style={{ borderColor: "#D0DAE4" }}>
              <div className="relative">
                <select className="w-full appearance-none h-11 rounded-xl border px-4 pr-10 text-sm" style={{ borderColor: "#D0DAE4" }}>
                  <option value="0">No tip</option>
                  <option value="1">$1.00</option>
                  <option value="2">$2.00</option>
                  <option value="3">$3.00</option>
                  <option value="5">$5.00</option>
                  <option value="10">$10.00</option>
                  <option value="15">$15.00</option>
                  <option value="20">$20.00</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-5 h-5" style={{ color: "#8A9AAA" }} />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Additional Notes</p>
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "#D0DAE4" }}>
            <textarea className="w-full text-sm resize-none border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[80px]" placeholder="Any special instructions? (Optional)" style={{ color: "#1A2B3C", borderColor: "#D0DAE4" }} />
          </div>
        </section>

        <a href="#" className="flex items-center gap-3 p-3.5 rounded-2xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help? Telegram us</p>
          </div>
        </a>
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
          <p className="text-[10px] text-center border-t pt-2 text-white/30" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            Payments confirmed through the website once sleeping pep approves
          </p>
        </div>
      </div>
    </div>
  );
}
