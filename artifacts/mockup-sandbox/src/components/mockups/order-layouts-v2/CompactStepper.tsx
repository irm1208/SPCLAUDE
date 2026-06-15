import { ChevronDown, Plus, Trash2, Package, MessageCircle, Heart, ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const STEPS = ["Customer", "Products", "Delivery", "Extras"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1 flex-1">
          <div className="flex items-center gap-1.5 flex-1">
            <div
              className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
              style={{
                background: i <= current ? "#4A7BA7" : "#E8EDF2",
                color: i <= current ? "#fff" : "#8A9AAA",
              }}
            >
              {i + 1}
            </div>
            <span
              className="text-[10px] font-semibold truncate"
              style={{ color: i <= current ? "#1A2B3C" : "#8A9AAA" }}
            >
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-4 h-px mx-0.5" style={{ background: i < current ? "#4A7BA7" : "#D0DAE4" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export function CompactStepper() {
  const [step, setStep] = useState(0);

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

      <StepIndicator current={step} />

      <main className="flex-1 px-4 pb-32">
        {step === 0 && (
          <div className="space-y-3 py-4">
            <h2 className="text-lg font-bold" style={{ color: "#1A2B3C" }}>Who is this order for?</h2>
            <p className="text-xs" style={{ color: "#8A9AAA" }}>We'll use this to identify your order</p>
            <div className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#D0DAE4" }}>
              <label className="text-xs font-extrabold" style={{ color: "#1A2B3C" }}>Telegram Username</label>
              <input
                className="w-full h-11 rounded-xl border px-4 text-sm"
                style={{ borderColor: "#D0DAE4" }}
                placeholder="@username"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 py-4">
            <h2 className="text-lg font-bold" style={{ color: "#1A2B3C" }}>Add your products</h2>
            <p className="text-xs" style={{ color: "#8A9AAA" }}>Choose from 128+ peptide products</p>

            <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: "#D0DAE4" }}>
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
            </div>

            <button className="w-full h-11 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
              <Plus className="w-4 h-4" /> Add another product
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-4">
            <h2 className="text-lg font-bold" style={{ color: "#1A2B3C" }}>How should we deliver?</h2>
            <p className="text-xs" style={{ color: "#8A9AAA" }}>Choose your preferred delivery method</p>

            {[
              { name: "Royal Mail", price: "$10.00", selected: true },
              { name: "InPost", price: "$3.00", selected: false },
            ].map(m => (
              <label
                key={m.name}
                className="flex items-center justify-between p-4 rounded-xl border-2 bg-white cursor-pointer"
                style={{ borderColor: m.selected ? "#4A7BA7" : "#D0DAE4", background: m.selected ? "#4A7BA710" : "#fff" }}
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
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold" style={{ color: "#1A2B3C" }}>Finishing touches</h2>

            <button
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-dashed text-sm font-semibold"
              style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Add a tip?</span>
                <span className="text-xs font-normal">(optional)</span>
              </div>
            </button>

            <div className="bg-white rounded-xl border p-4" style={{ borderColor: "#D0DAE4" }}>
              <label className="text-xs font-extrabold block mb-2" style={{ color: "#1A2B3C" }}>Additional Notes</label>
              <textarea
                className="w-full rounded-xl border p-3 text-sm min-h-[80px] resize-none"
                style={{ borderColor: "#D0DAE4" }}
                placeholder="Any special instructions? (Optional)"
              />
            </div>

            <a href="#" className="flex items-center gap-3 p-3.5 rounded-xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
                <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
                <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Message us on Telegram for help</p>
              </div>
            </a>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t" style={{ borderColor: "#D0DAE4" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="h-12 px-5 rounded-xl border-2 text-sm font-bold"
                style={{ borderColor: "#D0DAE4", color: "#5A6E7F" }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => setStep(s => Math.min(s + 1, 3))}
              className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: "#1A2B3C" }}
            >
              {step < 3 ? "Continue" : "Review Order"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: "#8A9AAA" }}>
            Grand Total: <span className="font-bold" style={{ color: "#1A2B3C" }}>$10.00</span>
          </p>
        </div>
      </div>
    </div>
  );
}
