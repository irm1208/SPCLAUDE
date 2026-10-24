import { useEffect, useState } from "react";
import { COUNTRIES } from "@/data/countries";

type Contact = { name: string; address: string; country: string; email: string; phone: string };
const empty: Contact = { name: "", address: "", country: "", email: "", phone: "" };
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
export function SupplierDeliveryDetails({ request }: { request: Fetcher }) {
  const [draft, setDraft] = useState<Contact>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await request("/api/reshipper/supplier-delivery", { credentials: "include" });
      const data = await r.json(); if (!r.ok) throw new Error(data.error ?? "Could not load delivery details.");
      setDraft(data.contact ?? empty); setSaved(!!data.contact); setLoaded(true);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const r = await request("/api/reshipper/supplier-delivery", { method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error ?? "Could not save delivery details.");
      setDraft(data.contact); setSaved(true);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };
  const field = (key: keyof Contact) => ({
    value: draft[key], required: true,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft(d => ({ ...d, [key]: e.target.value })); setSaved(false);
    },
    className: "mt-1 w-full rounded-lg border p-2 text-sm",
    style: { color: "var(--t-text)", background: "var(--t-surface)", borderColor: "var(--t-border)" },
  });
  return <details className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)" }} open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
    <summary className="font-semibold cursor-pointer">Supplier delivery details — required for supplier downloads</summary>
    <p className="text-xs my-3" style={{ color: "var(--t-muted)" }}>Where the supplier sends your group-buy parcels. Save once to your reshipper account and reuse these details across your group buys. Admin uses them in supplier TXT downloads. They do not change your login email or members’ delivery addresses.</p>
    {loading ? <p role="status">Loading delivery details…</p> : loaded && <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Recipient name *<input {...field("name")} maxLength={200} /></label>
        <label className="text-xs">Country *<select {...field("country")}><option value="">Choose country</option>
          {!COUNTRIES.some(c => c === draft.country) && draft.country && <option value={draft.country}>{draft.country}</option>}
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <label className="block text-xs">Full delivery address, city and postcode *<textarea {...field("address")} rows={3} maxLength={2000} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Delivery email *<input type="email" {...field("email")} maxLength={200} /></label>
        <label className="text-xs">Phone, including country code *<input type="tel" {...field("phone")} maxLength={40} placeholder="+44…" /></label>
      </div>
      <button type="submit" disabled={saving} className="rounded-lg bg-[#1B3A7A] text-white px-4 py-2 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save delivery details"}</button>
      {saved && <p role="status" className="text-sm text-green-700">Supplier delivery details saved.</p>}
    </form>}
    {error && <p role="alert" className="text-sm text-red-600 mt-2">{error} <button type="button" onClick={load} className="underline">Reload</button></p>}
  </details>;
}
