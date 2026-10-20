import { useRef, useState } from "react";
import { onwardPayApi, newIdempotencyKey, fmtFiat, type Envelope } from "@/lib/onward-payments";

export function ImmediateDeliveryCheckout({ orderId, config, onReady }: {
  orderId: string; config: NonNullable<Envelope["immediate"]>; onReady: (env: Envelope) => void;
}) {
  const [contact, setContact] = useState(config.contact);
  const [method, setMethod] = useState(config.selectedMethod ?? config.options[0]?.method ?? "home");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reference = useRef(newIdempotencyKey());
  return (
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      try { onReady(await onwardPayApi.start(orderId, { ...contact, method, idempotencyKey: reference.current })); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not start delivery payment. Please retry."); }
      finally { setBusy(false); }
    }}>
      <p className="text-xs font-semibold">Pay your EU onward delivery now</p>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>Confirm your delivery details, then continue to payment. All five fields are required by your reshipper.</p>
      <label className="block text-xs space-y-1">
        <span>Delivery option</span>
        <select className="w-full rounded-lg border p-2 bg-transparent" value={method} onChange={e => setMethod(e.target.value as "pickup" | "home")} disabled={busy}>
          {config.options.map(option => <option key={option.method} value={option.method}>
            {option.method === "pickup" ? "Pickup point" : "Home delivery"} — {fmtFiat(option.amount, config.currency)}
          </option>)}
        </select>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(["shippingName", "shippingAddress", "shippingCountry", "shippingPhone", "shippingEmail"] as const).map(field => (
          <label key={field} className={`block text-xs space-y-1 ${field === "shippingAddress" ? "sm:col-span-2" : ""}`}>
            <span>{{ shippingName: "Full name", shippingAddress: "Address, city and postcode", shippingCountry: "Country", shippingPhone: "Mobile (with country code)", shippingEmail: "Email" }[field]} *</span>
            <input required data-testid={`input-eu-${field}`} readOnly={field === "shippingCountry"} disabled={busy}
              type={field === "shippingEmail" ? "email" : field === "shippingPhone" ? "tel" : "text"}
              maxLength={field === "shippingAddress" ? 1024 : field === "shippingPhone" ? 40 : field === "shippingName" ? 120 : 254}
              value={contact[field]} onChange={e => setContact({ ...contact, [field]: e.target.value })}
              className="w-full min-w-0 rounded-lg border p-2 bg-transparent" />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      <button type="submit" data-testid="button-eu-delivery-start" disabled={busy} className="w-full rounded-lg bg-[#2D6BCC] text-white text-sm font-semibold px-3 py-2.5 disabled:opacity-50">
        {busy ? "Preparing payment…" : "Continue to delivery payment"}
      </button>
      <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>No payment is taken by this button. Next, you can pay delivery alone or combine it with an unpaid product order when both wallets, tokens and networks match.</p>
    </form>
  );
}
