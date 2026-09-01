import "./_group.css";
import { CheckCircle2, ExternalLink, Info } from "lucide-react";

export function Current() {
  return (
    <main className="min-h-screen p-5 sm:p-7" style={{ background: "#fbfaf7" }}>
      <section
        className="mx-auto max-w-[520px] rounded-2xl p-5 sm:p-6"
        style={{
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(245,158,11,0.28)",
          boxShadow: "0 18px 45px rgba(91,68,32,0.09)",
        }}
      >
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "#766e63" }}>
          Pay using
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-bold"
            style={{ background: "#fff", color: "#4b5563", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
          >
            USDC
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-extrabold"
            style={{ background: "#f59e0b", color: "#111827", border: "2px solid #2563eb", boxShadow: "0 2px 0 rgba(37,99,235,0.13)" }}
          >
            AnonPay
          </button>
        </div>

        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: "linear-gradient(145deg, #fff7e6 0%, #ffedd5 100%)",
            border: "1px solid rgba(245,158,11,0.32)",
            boxShadow: "0 10px 28px rgba(120,72,16,0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#334155", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
            >
              <span className="text-[10px] font-black tracking-tight text-white">AP</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold" style={{ color: "#1f2937" }}>Pay with AnonPay</p>
              <p className="text-xs" style={{ color: "#64748b" }}>USDC via Trocador</p>
            </div>
            <div className="ml-auto shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#9a6b18" }}>Amount due</p>
              <p className="text-base font-black" style={{ color: "#1f2937" }}>24.50 USDC</p>
            </div>
          </div>

          <div
            className="mt-4 flex items-start gap-2 rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(245,158,11,0.22)" }}
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#d97706" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "#5f5547" }}>
              Open the secure Trocador page, pay with your preferred cryptocurrency, then return here to confirm you initiated the payment.
            </p>
          </div>

          <button
            type="button"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white transition-all hover:brightness-105"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 7px 18px rgba(245,158,11,0.24)" }}
          >
            <ExternalLink className="h-4 w-4" />
            Open AnonPay payment page
          </button>
          <p className="mt-2 text-center text-[10px]" style={{ color: "#8a7a66" }}>Opens securely on trocador.app in a new tab</p>

          <button
            type="button"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:brightness-105"
            style={{ background: "#f59e0b", color: "#111827", border: "1px solid #d97706" }}
          >
            <CheckCircle2 className="h-4 w-4" />
            I've initiated the payment
          </button>
        </div>
      </section>
    </main>
  );
}