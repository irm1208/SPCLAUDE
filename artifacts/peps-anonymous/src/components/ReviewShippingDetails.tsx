import { useDraftStore } from "../hooks/use-draft-store";
import { COUNTRIES } from "../data/countries";

export function ReviewShippingDetails({ requireEuContact, countryLocked, onChangeDelivery }: {
  requireEuContact: boolean;
  countryLocked: boolean;
  onChangeDelivery: () => void;
}) {
  const draft = useDraftStore();
  const inputClass = "w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-400";
  const inputStyle = { background: "var(--t-bg)", color: "var(--t-text)", borderColor: "var(--t-border)" };
  const labelClass = "text-[11px] font-semibold uppercase tracking-wide mb-1 block";
  return <section aria-label="Shipping Details" className="space-y-2" style={{ color: "var(--t-text)" }}>
    <h2 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "var(--t-muted)" }}>Shipping Details</h2>
    <div className="rounded-xl p-4 border shadow-sm space-y-3" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Check your delivery details before placing your order.</p>
      <div>
        <label htmlFor="review-shipping-name" className={labelClass}>Full Name *</label>
        <input id="review-shipping-name" autoComplete="shipping name" required value={draft.shippingName}
          onChange={e => draft.setShippingName(e.target.value)} placeholder="Jane Smith" className={inputClass} style={inputStyle} />
      </div>
      <div>
        <label htmlFor="review-shipping-address" className={labelClass}>Street Address *</label>
        <textarea id="review-shipping-address" autoComplete="shipping street-address" required rows={3} value={draft.shippingAddress}
          onChange={e => draft.setShippingAddress(e.target.value)} placeholder={"123 Example Street\nCity, Postcode"}
          className={`${inputClass} resize-y`} style={inputStyle} />
      </div>
      <div>
        <label htmlFor="review-shipping-country" className={labelClass}>Country{requireEuContact && " *"}</label>
        {countryLocked ? <>
          <input id="review-shipping-country" readOnly value={draft.shippingCountry} className={inputClass} style={inputStyle} />
          <button type="button" onClick={onChangeDelivery} className="mt-2 text-xs font-semibold underline" style={{ color: "var(--t-blue)" }}>Change country and delivery option</button>
        </> : <select id="review-shipping-country" value={draft.shippingCountry} onChange={e => draft.setShippingCountry(e.target.value)}
          className={inputClass} style={inputStyle}>
          <option value="">Select country…</option>
          {COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
        </select>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="review-shipping-phone" className={labelClass}>Mobile{requireEuContact && " *"}</label>
          <input id="review-shipping-phone" type="tel" autoComplete="shipping tel" required={requireEuContact}
            value={draft.shippingPhone} onChange={e => draft.setShippingPhone(e.target.value)} placeholder="+39 123 456 7890"
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="review-shipping-email" className={labelClass}>Email{requireEuContact && " *"}</label>
          <input id="review-shipping-email" type="email" autoComplete="shipping email" required={requireEuContact}
            value={draft.shippingEmail} onChange={e => draft.setShippingEmail(e.target.value)} placeholder="jane@example.com"
            className={inputClass} style={inputStyle} />
        </div>
      </div>
    </div>
  </section>;
}
