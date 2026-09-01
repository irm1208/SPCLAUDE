import "./_group.css";
import { useState } from "react";
import { ArrowRight, Check, CreditCard, ShieldCheck, WalletCards } from "lucide-react";

export function Current() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [method, setMethod] = useState<"crypto" | "card">("crypto");
  const [message, setMessage] = useState("");
  const dark = theme === "dark";
  const colors = dark
    ? {
        page: "#081323", card: "#101f34", border: "#29415f", heading: "#edf5ff", muted: "#91a9c5",
        panel: "linear-gradient(120deg, #102a52 0%, #1b3a7a 48%, #2d6bcc 100%)", soft: "#173967",
        softBorder: "#4e8ed5", iconMuted: "#22344d", iconText: "#9ab0ca", cta: "linear-gradient(135deg, #245aa8, #347bd4)",
        shadow: "0 22px 55px rgba(2,10,24,0.42)", note: "#7589a2",
      }
    : {
        page: "#f4f7fb", card: "#ffffff", border: "#dbe5f0", heading: "#1b3164", muted: "#70839a",
        panel: "linear-gradient(120deg, #1b3164 0%, #1b3a7a 45%, #2d6bcc 100%)", soft: "#eef5ff",
        softBorder: "#a5c5ed", iconMuted: "#edf2f7", iconText: "#71839a", cta: "linear-gradient(135deg, #1b3a7a, #2d6bcc)",
        shadow: "0 22px 55px rgba(27,58,122,0.12)", note: "#91a1b4",
      };

  return (
    <main className="min-h-screen p-5 sm:p-8 transition-colors" style={{ background: colors.page }}>
      <section
        className="mx-auto max-w-[520px] overflow-hidden rounded-[24px]"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          boxShadow: colors.shadow,
        }}
      >
        <header className="flex items-start justify-between p-6 pb-5 sm:p-7 sm:pb-6">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: dark ? "#8fa9c7" : "#6b7d93" }}>Order balance</p>
            <h1 className="mt-2 text-[25px] font-black tracking-[-0.04em]" style={{ color: colors.heading }}>Complete your payment</h1>
            <p className="mt-1 text-xs" style={{ color: colors.muted }}>Order #11337 · one payment step remaining</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: dark ? "#19355b" : "#e6effa", color: dark ? "#a9d1ff" : "#1b3a7a" }}>
              Due now
            </span>
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} className="text-[10px] font-bold underline underline-offset-2" style={{ color: colors.muted }}>
              {dark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

        <div className="mx-6 rounded-2xl p-5 sm:mx-7 sm:p-6" style={{ background: colors.panel, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
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
            <p className="text-sm font-extrabold" style={{ color: colors.heading }}>Choose a payment method</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.muted }}>Required</p>
          </div>

          <div className="space-y-2">
              {[
                { key: "crypto" as const, title: "Cryptocurrency", detail: "Pay from your preferred wallet", icon: WalletCards },
                { key: "card" as const, title: "Card payment", detail: "Visa or Mastercard", icon: CreditCard },
              ].map(({ key, title, detail, icon: Icon }) => {
                const selected = method === key;
                return (
              <button
                key={title}
                type="button"
                onClick={() => setMethod(key)}
                className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all"
                style={{
                    background: selected ? colors.soft : (dark ? "#152337" : "#ffffff"),
                    border: `1px solid ${selected ? colors.softBorder : colors.border}`,
                    boxShadow: selected ? "0 5px 14px rgba(45,107,204,0.18)" : "none",
                }}
              >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: selected ? "#2d6bcc" : colors.iconMuted, color: selected ? "#ffffff" : colors.iconText }}>
                  <Icon className="h-4 w-4" />
                </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-extrabold" style={{ color: dark ? "#e3efff" : "#29466f" }}>{title}</span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: dark ? "#91a7c1" : "#7d90a7" }}>{detail}</span>
                </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: selected ? "#2d6bcc" : "transparent", border: `1.5px solid ${selected ? "#66a3ec" : (dark ? "#526983" : "#c7d5e5")}` }}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </span>
              </button>
                );
              })}
          </div>

          <button
            type="button"
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition-all hover:brightness-105"
             onClick={() => setMessage(`Ready to continue with ${method === "crypto" ? "cryptocurrency" : "card payment"}.`)}
             style={{ background: colors.cta, boxShadow: "0 8px 18px rgba(9,53,119,0.28)" }}
          >
            Continue to payment
            <ArrowRight className="h-4 w-4" />
          </button>
           <button type="button" onClick={() => setMessage("We’ll help match your payment to this order.")} className="mt-3 w-full text-xs font-bold" style={{ color: dark ? "#8eafd3" : "#54709a" }}>I’ve already paid</button>
           {message && <p className="mt-3 text-center text-[11px] font-bold" style={{ color: dark ? "#9bcbff" : "#2d6bcc" }}>{message}</p>}
           <p className="mt-5 text-center text-[10px] leading-relaxed" style={{ color: colors.note }}>You’ll be able to review the final amount before confirming.</p>
        </div>
      </section>
    </main>
  );
}