import "./_group.css";
import { ArrowRight, Check, CreditCard, ShieldCheck, WalletCards } from "lucide-react";

export function Current() {
  return (
    <main className="min-h-screen p-5 sm:p-8" style={{ background: "#0b1424" }}>
      <section
        className="mx-auto max-w-[520px] overflow-hidden rounded-[24px]"
        style={{
          background: "#111d30",
          border: "1px solid #263b58",
          boxShadow: "0 22px 55px rgba(2,10,24,0.42)",
        }}
      >
        <header className="flex items-start justify-between p-6 pb-5 sm:p-7 sm:pb-6">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "#8fa9c7" }}>Order balance</p>
            <h1 className="mt-2 text-[25px] font-black tracking-[-0.04em]" style={{ color: "#eaf3ff" }}>Complete your payment</h1>
            <p className="mt-1 text-xs" style={{ color: "#8da3bd" }}>Order #11337 · one payment step remaining</p>
          </div>
           <span className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: "#19355b", color: "#a9d1ff" }}>
            Due now
          </span>
        </header>

        <div className="mx-6 rounded-2xl p-5 sm:mx-7 sm:p-6" style={{ background: "linear-gradient(120deg, #122b52 0%, #1b3a7a 48%, #2d6bcc 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#adc0d0" }}>Outstanding balance</p>
            <WalletCards className="h-5 w-5" style={{ color: "#9bcbff" }} />
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-black tracking-[-0.055em] text-[#fffaf2]">24.50</span>
            <span className="pb-1 text-sm font-bold text-[#c1d0dc]">USDC</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: "#c1d0dc" }}>
             <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#9bcbff" }} />
            Secure payment · no change to your order
          </div>
        </div>

        <div className="p-6 pt-6 sm:p-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold" style={{ color: "#e4efff" }}>Choose a payment method</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#8298b4" }}>Required</p>
          </div>

          <div className="space-y-2">
             {[
               { title: "Cryptocurrency", detail: "Pay from your preferred wallet", icon: WalletCards, selected: true },
              { title: "Card payment", detail: "Visa or Mastercard", icon: CreditCard, selected: false },
            ].map(({ title, detail, icon: Icon, selected }) => (
              <button
                key={title}
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all"
                style={{
                    background: selected ? "#173967" : "#152337",
                    border: `1px solid ${selected ? "#4e8ed5" : "#2a3d58"}`,
                    boxShadow: selected ? "0 5px 14px rgba(45,107,204,0.24)" : "none",
                }}
              >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: selected ? "#2d6bcc" : "#22344d", color: selected ? "#ffffff" : "#9ab0ca" }}>
                  <Icon className="h-4 w-4" />
                </span>
                  <span className="min-w-0 flex-1">
                   <span className="block text-xs font-extrabold" style={{ color: "#e3efff" }}>{title}</span>
                   <span className="mt-0.5 block text-[11px]" style={{ color: "#91a7c1" }}>{detail}</span>
                </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: selected ? "#2d6bcc" : "transparent", border: `1.5px solid ${selected ? "#66a3ec" : "#526983"}` }}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition-all hover:brightness-105"
             style={{ background: "linear-gradient(135deg, #245aa8, #347bd4)", boxShadow: "0 8px 18px rgba(9,53,119,0.34)" }}
          >
            Continue to payment
            <ArrowRight className="h-4 w-4" />
          </button>
           <button type="button" className="mt-3 w-full text-xs font-bold" style={{ color: "#8eafd3" }}>I’ve already paid</button>
           <p className="mt-5 text-center text-[10px] leading-relaxed" style={{ color: "#7589a2" }}>You’ll be able to review the final amount before confirming.</p>
        </div>
      </section>
    </main>
  );
}