import "./_group.css";
import { ArrowRight, Check, CreditCard, ShieldCheck, WalletCards } from "lucide-react";

export function Current() {
  return (
    <main className="min-h-screen p-5 sm:p-8" style={{ background: "#f7f5f0" }}>
      <section
        className="mx-auto max-w-[520px] overflow-hidden rounded-[24px]"
        style={{
          background: "#fffdfa",
          border: "1px solid #e8e1d6",
          boxShadow: "0 22px 55px rgba(47,42,34,0.11)",
        }}
      >
        <header className="flex items-start justify-between p-6 pb-5 sm:p-7 sm:pb-6">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "#a08d75" }}>Order balance</p>
            <h1 className="mt-2 text-[25px] font-black tracking-[-0.04em]" style={{ color: "#24211d" }}>Complete your payment</h1>
            <p className="mt-1 text-xs" style={{ color: "#8b8176" }}>Order #11337 · one payment step remaining</p>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: "#fff1d9", color: "#b16816" }}>
            Due now
          </span>
        </header>

        <div className="mx-6 rounded-2xl p-5 sm:mx-7 sm:p-6" style={{ background: "#283c52" }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#adc0d0" }}>Outstanding balance</p>
            <WalletCards className="h-5 w-5" style={{ color: "#f7b267" }} />
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-black tracking-[-0.055em] text-[#fffaf2]">24.50</span>
            <span className="pb-1 text-sm font-bold text-[#c1d0dc]">USDC</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: "#c1d0dc" }}>
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#8fd0ae" }} />
            Secure payment · no change to your order
          </div>
        </div>

        <div className="p-6 pt-6 sm:p-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold" style={{ color: "#312d27" }}>Choose a payment method</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#aa9b89" }}>Required</p>
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
                  background: selected ? "#fff5e6" : "#fffdfa",
                  border: `1px solid ${selected ? "#efb56b" : "#e8e1d6"}`,
                  boxShadow: selected ? "0 5px 14px rgba(196,123,38,0.09)" : "none",
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: selected ? "#f5a94e" : "#f3eee7", color: selected ? "#fffaf2" : "#84786a" }}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold" style={{ color: "#3c362f" }}>{title}</span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: "#968a7c" }}>{detail}</span>
                </span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: selected ? "#e99232" : "transparent", border: `1.5px solid ${selected ? "#e99232" : "#d7cec2"}` }}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition-all hover:brightness-105"
            style={{ background: "#e58b32", boxShadow: "0 8px 18px rgba(204,112,25,0.2)" }}
          >
            Continue to payment
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" className="mt-3 w-full text-xs font-bold" style={{ color: "#907e69" }}>I’ve already paid</button>
          <p className="mt-5 text-center text-[10px] leading-relaxed" style={{ color: "#aaa092" }}>You’ll be able to review the final amount before confirming.</p>
        </div>
      </section>
    </main>
  );
}