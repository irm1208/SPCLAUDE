import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";

export function ProgressiveReveal() {
  const [username, setUsername] = useState("");
  const [productPicked, setProductPicked] = useState(false);
  const [deliveryPicked, setDeliveryPicked] = useState(false);

  const step1Done = username.length > 0;
  const step2Done = productPicked;
  const step3Done = deliveryPicked;

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

      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #1E293B, #1A2B3C)" }}>
        {[step1Done, step2Done, step3Done].map((done, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: done ? "100%" : "0%", background: "linear-gradient(90deg, #3B82F6, #8B5CF6)" }} />
            </div>
          </div>
        ))}
        <span className="text-[10px] font-bold text-white/40 ml-1">{[step1Done, step2Done, step3Done].filter(Boolean).length}/3</span>
      </div>

      <main className="flex-1 px-4 py-5 pb-36 space-y-4">
        <div className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: step1Done ? "rgba(34,197,94,0.3)" : "#D0DAE4", background: step1Done ? "rgba(34,197,94,0.03)" : "#fff" }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: step1Done ? "#22C55E" : "#E8EDF2", color: step1Done ? "#fff" : "#8A9AAA" }}>
                  {step1Done ? <Check className="w-3.5 h-3.5" /> : "1"}
                </div>
                <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Customer</span>
              </div>
              {step1Done && <span className="text-[10px] font-bold text-green-600">{username}</span>}
            </div>
            <input
              className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ borderColor: "#D0DAE4" }}
              placeholder="@telegram_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: step2Done ? "rgba(34,197,94,0.3)" : "#D0DAE4", opacity: 1 }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: step2Done ? "#22C55E" : "#E8EDF2", color: step2Done ? "#fff" : "#8A9AAA" }}>
                  {step2Done ? <Check className="w-3.5 h-3.5" /> : "2"}
                </div>
                <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Products</span>
              </div>
            </div>

            <div className="bg-white rounded-xl space-y-3">
              <div className="relative">
                <select
                  className="w-full appearance-none h-11 rounded-xl border px-4 pr-10 text-sm"
                  style={{ borderColor: "#D0DAE4" }}
                  onChange={e => setProductPicked(e.target.value !== "")}
                >
                  <option value="">Select a product...</option>
                  <option value="bpc">BPC-157 5mg — $28.00</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-5 h-5" style={{ color: "#8A9AAA" }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center h-10 border rounded-xl overflow-hidden" style={{ borderColor: "#D0DAE4" }}>
                  <button className="px-3.5 h-full text-lg" style={{ color: "#8A9AAA" }}>−</button>
                  <span className="w-10 text-center text-sm font-semibold">0.5</span>
                  <button className="px-3.5 h-full text-lg" style={{ color: "#8A9AAA" }}>+</button>
                </div>
                <span className="font-bold" style={{ color: "#1A2B3C" }}>$0.00</span>
              </div>
              <button className="w-full h-10 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center gap-2" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
                <Plus className="w-3 h-3" /> Add another
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: step3Done ? "rgba(34,197,94,0.3)" : "#D0DAE4" }}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: step3Done ? "#22C55E" : "#E8EDF2", color: step3Done ? "#fff" : "#8A9AAA" }}>
                {step3Done ? <Check className="w-3.5 h-3.5" /> : "3"}
              </div>
              <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Delivery</span>
            </div>
            <div className="space-y-2">
              {[
                { name: "Royal Mail", price: "$10.00", sel: false },
                { name: "InPost", price: "$3.00", sel: false },
              ].map(m => (
                <label key={m.name} className="flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer" style={{ borderColor: "#D0DAE4" }} onClick={() => setDeliveryPicked(true)}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#8A9AAA80" }} />
                    <Package className="w-4 h-4" style={{ color: "#8A9AAA" }} />
                    <span className="font-semibold text-sm" style={{ color: "#1A2B3C" }}>{m.name}</span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "#8A9AAA" }}>{m.price}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#D0DAE4" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" style={{ color: "#8A9AAA" }} />
              <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Tip & Notes</span>
            </div>
            <span className="text-[10px]" style={{ color: "#8A9AAA" }}>Optional</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="h-9 px-3 rounded-lg border text-xs font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>$0</button>
            <button className="h-9 px-3 rounded-lg border text-xs font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>$2</button>
            <button className="h-9 px-3 rounded-lg border text-xs font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>$5</button>
            <input className="flex-1 h-9 rounded-lg border px-3 text-xs" style={{ borderColor: "#D0DAE4" }} placeholder="Notes..." />
          </div>
        </div>

        <a href="#" className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help?</p>
          </div>
        </a>
      </main>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t" style={{ background: "rgba(15,23,42,0.95)", borderColor: "#1E293B" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Grand Total</p>
              <p className="text-xl font-bold text-white">$10.00</p>
            </div>
            <button
              className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", opacity: (step1Done && step2Done && step3Done) ? 1 : 0.4 }}
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
