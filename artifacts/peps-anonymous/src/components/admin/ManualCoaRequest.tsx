import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Card, Input } from "@/components/ui";
import { coaApi, type CoaAdminView } from "@/lib/coa-api";

export function ManualCoaRequest({ groupBuyId, organiserRoot, secret, orders, onSaved }: {
  groupBuyId: string; organiserRoot: string | null; secret: string;
  orders: CoaAdminView["orders"]; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState({ client: "", sample: "", manufacturer: "", batch: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    const ac = new AbortController(); abort.current = ac;
    try {
      await coaApi(organiserRoot ? `${organiserRoot}/manual` : `/admin/group-buys/${encodeURIComponent(groupBuyId)}/coa/manual`, {
        method: "POST", signal: ac.signal, body: JSON.stringify({ orderId, ...details }),
      }, secret);
      if (ac.signal.aborted) return;
      setSuccess("COA request added. Confirm any received payment using its existing Confirm payment action.");
      setOpen(false); setOrderId(""); setDetails({ client: "", sample: "", manufacturer: "", batch: "" });
      onSaved();
    } catch (cause) {
      if (!ac.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to add COA request.");
    } finally { if (!ac.signal.aborted) setBusy(false); }
  }
  return <Card className="p-4 space-y-3">
    <Button type="button" size="sm" variant="outline" onClick={() => { setOpen(value => !value); setError(""); setSuccess(""); }} disabled={busy}>
      {open ? "Close manual entry" : "Add COA manually"}
    </Button>
    {success && <p role="status" className="text-xs text-green-700">{success}</p>}
    {open && <form onSubmit={save} className="space-y-3">
      <p className="text-xs text-muted-foreground">For an existing order in this group buy only. Uses one COA place and the saved fee and payment terms. Adding a request does not confirm payment or change the product order.</p>
      <label className="block text-xs font-semibold">Group-buy order
        <select required value={orderId} onChange={event => setOrderId(event.target.value)} disabled={busy}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm" aria-label="Manual COA order">
          <option value="">Choose order and member</option>
          {orders.map(order => <option key={order.id} value={order.id}>#{order.code} · @{order.member}</option>)}
        </select>
      </label>
      {!orders.length && <p className="text-xs text-muted-foreground">No active group-buy orders are available.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["client", "sample", "manufacturer", "batch"] as const).map(field => <label key={field} className="block text-xs font-semibold">
          {field === "client" ? "Client name on report" : field[0].toUpperCase() + field.slice(1)}
          <Input className="mt-1" aria-label={`Manual COA ${field}`} required maxLength={300} value={details[field]} disabled={busy}
            onChange={event => setDetails(value => ({ ...value, [field]: event.target.value }))} />
        </label>)}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={busy || !orderId || Object.values(details).some(value => !value.trim())}>
        {busy ? "Adding COA…" : "Save manual COA"}
      </Button>
    </form>}
  </Card>;
}
