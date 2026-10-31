import { useEffect, useRef, useState } from "react";
import { adminAuth } from "../../lib/admin-auth";

type Wallet = {
  id: string;
  currency: string;
  network: string;
  address: string;
  label?: string;
};
type Order = {
  id: string;
  reference: string;
  status: string;
  stale: boolean;
  totalCost: string | number;
  paymentId: string | null;
};
type Payment = {
  id: string;
  txid: string;
  cryptoAmount: string;
  usdAmount: string | number;
  currency: string;
  network: string;
  walletSnapshot: Omit<Wallet, "id">;
  orders: { submissionId: string; reference: string; amountUsd: string }[];
  paidAt: string;
  recordedAt: string;
  recordedBy: string;
  voidedAt: string | null;
  voidReason: string | null;
  note?: string;
};
type Data = {
  vendors: { id: string; name: string }[];
  vendorId: string;
  wallets: Wallet[];
  orders: Order[];
  payments: Payment[];
};
type Draft = {
  vendorId: string;
  walletId: string;
  walletSnapshot: { currency: string; network: string; address: string };
  submissionIds: string[];
  txid: string;
  cryptoAmount: string;
  paidAt?: string;
  note?: string;
};
const card = {
  background: "var(--t-surface)",
  border: "1px solid var(--t-border)",
};
const field = "w-full rounded-xl px-3 py-2 text-sm border";
const button =
  "rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed";
function cents(value: string | number) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  return match
    ? BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0"))
    : null;
}
function dollars(value: bigint) {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
async function request(path: string, init?: RequestInit) {
  const response = await adminAuth.request(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
export default function VendorPaymentsAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [vendorId, setVendor] = useState("");
  const [walletId, setWallet] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const [voidId, setVoidId] = useState("");
  const [reason, setReason] = useState("");
  async function load(id: string) {
    const run = ++generation.current;
    setLoading(true);
    setDraft(null);
    try {
      const result = await request(
        `/api/admin/vendor-payments${id ? `?vendorId=${encodeURIComponent(id)}` : ""}`,
      );
      if (
        !result ||
        !["vendors", "wallets", "orders", "payments"].every((key) =>
          Array.isArray(result[key]),
        )
      ) {
        throw new Error(
          "Could not load payment details. Refresh and try again.",
        );
      }
      if (run === generation.current) {
        setData(result);
        setSelected([]);
        setWallet("");
      }
    } catch (error) {
      if (run === generation.current) {
        setData(null);
        setMessage({
          ok: false,
          text:
            error instanceof Error ? error.message : "Could not load payments",
        });
      }
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load(vendorId);
    return () => {
      generation.current++;
    };
  }, [vendorId]);
  const wallet = data?.wallets.find((w) => w.id === walletId);
  const chosen =
    data?.orders.filter(
      (o) => selected.includes(o.id) && !o.paymentId && !o.stale,
    ) || [];
  const validCosts = chosen.every((o) => cents(o.totalCost) !== null);
  const total = chosen.reduce((sum, o) => sum + (cents(o.totalCost) ?? 0n), 0n);
  const ready =
    !loading &&
    !!wallet &&
    chosen.length > 0 &&
    validCosts &&
    /^\d+(?:\.\d+)?$/.test(amount.trim()) &&
    /[1-9]/.test(amount) &&
    !!txid.trim();
  function review() {
    if (!ready || !wallet) return;
    setDraft({
      vendorId,
      walletId: wallet.id,
      walletSnapshot: {
        currency: wallet.currency,
        network: wallet.network,
        address: wallet.address,
      },
      submissionIds: chosen.map((o) => o.id),
      txid: txid.trim(),
      cryptoAmount: amount.trim(),
      ...(paidAt ? { paidAt: new Date(paidAt).toISOString() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setMessage(null);
  }
  async function mutate(isVoid = false) {
    if (lock.current || (isVoid ? !voidId || !reason.trim() : !draft)) return;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await request(
        isVoid
          ? `/api/admin/vendor-payments/${encodeURIComponent(voidId)}/void`
          : "/api/admin/vendor-payments",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(isVoid ? { reason: reason.trim() } : draft),
        },
      );
      setDraft(null);
      setAmount("");
      setTxid("");
      setPaidAt("");
      setNote("");
      setVoidId("");
      setReason("");
      setMessage({
        ok: true,
        text: isVoid ? "Payment record voided." : "Payment recorded.",
      });
      await load(vendorId);
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save payment",
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-2xl p-4 space-y-4"
      style={card}
      data-testid="vendor-payments-admin"
    >
      <div className="flex justify-between gap-3">
        <h3 className="font-bold">Vendor payments</h3>
        <button
          type="button"
          className={button}
          disabled={busy || loading}
          onClick={() => void load(vendorId)}
        >
          Refresh payments & wallets
        </button>
      </div>
      <p className="text-sm" style={{ color: "var(--t-muted)" }}>
        Record a payment already sent externally. This records your receipt; it
        does not send funds or verify a blockchain transaction.
      </p>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "text-green-700" : "text-red-600"}
        >
          {message.text}
        </p>
      )}
      <label className="block text-sm">
        Vendor
        <select
          className={field}
          data-testid="payment-vendor"
          value={vendorId}
          disabled={busy}
          onChange={(e) => {
            setVendor(e.target.value);
            setAmount("");
            setTxid("");
            setPaidAt("");
            setNote("");
            setVoidId("");
            setReason("");
            setData((previous) =>
              previous
                ? { ...previous, wallets: [], orders: [], payments: [] }
                : null,
            );
            setDraft(null);
            setSelected([]);
            setWallet("");
            setMessage(null);
          }}
        >
          <option value="">Select vendor</option>
          {data?.vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      {loading && <p role="status">Loading payments…</p>}
      {vendorId && data && !loading && (
        <>
          {!data.wallets.length && (
            <p>
              The vendor needs to add a payment wallet in their Settings before
              a payment can be recorded.
            </p>
          )}
          <fieldset disabled={busy || !!draft} className="space-y-3">
            <label className="block text-sm">
              Saved wallet
              <select
                className={field}
                data-testid="payment-wallet"
                value={walletId}
                onChange={(e) => setWallet(e.target.value)}
              >
                <option value="">Select wallet</option>
                {data.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label ? `${w.label} · ` : ""}
                    {w.currency} / {w.network} · {w.address}
                  </option>
                ))}
              </select>
            </label>
            {wallet && (
              <div className="text-sm break-all">
                <p>
                  {wallet.currency} / {wallet.network}
                </p>
                <code>{wallet.address}</code>{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(wallet.address)
                      .then(() =>
                        setMessage({
                          ok: true,
                          text: "Wallet address copied.",
                        }),
                      )
                      .catch(() =>
                        setMessage({
                          ok: false,
                          text: "Could not copy address. Select and copy the address above.",
                        }),
                      );
                  }}
                >
                  Copy address
                </button>
              </div>
            )}
            <h4 className="font-bold text-sm">Orders · vendor cost in USD</h4>
            {data.orders.length === 0 && (
              <p className="text-sm">No vendor orders.</p>
            )}
            {data.orders.map((o) => (
              <label
                key={o.id}
                className="flex flex-wrap gap-2 text-sm rounded-xl p-2"
                style={card}
              >
                <input
                  type="checkbox"
                  data-testid={`payment-order-${o.id}`}
                  checked={selected.includes(o.id)}
                  disabled={
                    !!o.paymentId || o.stale || cents(o.totalCost) === null
                  }
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, o.id]
                        : ids.filter((id) => id !== o.id),
                    )
                  }
                />
                <strong>{o.reference}</strong>
                <span>
                  $
                  {cents(o.totalCost) === null
                    ? "Unavailable"
                    : dollars(cents(o.totalCost)!)}
                </span>
                <span>Fulfillment: {o.status}</span>
                <span>Payment: {o.paymentId ? "Paid" : "Unpaid"}</span>
                {o.stale && (
                  <span className="text-amber-700">Stale — unavailable</span>
                )}
              </label>
            ))}
            <p className="font-bold">
              Selected order cost: ${dollars(total)} USD
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                Actual crypto amount sent
                <input
                  data-testid="payment-amount"
                  className={field}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Transaction ID (TXID)
                <input
                  data-testid="payment-txid"
                  className={field}
                  value={txid}
                  onChange={(e) => setTxid(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Payment date (optional, local time)
                <input
                  className={field}
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Note (optional)
                <input
                  className={field}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              data-testid="payment-review"
              disabled={!ready}
              className={`${button} text-white`}
              style={{ background: "#1B3A7A" }}
              onClick={review}
            >
              Review payment record
            </button>
          </fieldset>
          {draft && (
            <div className="rounded-xl p-4 space-y-2" style={card}>
              <h4 className="font-bold">Record a payment already sent</h4>
              <p>
                Only these orders: {chosen.map((o) => o.reference).join(", ")} ·
                ${dollars(total)} USD vendor cost
              </p>
              <p>
                {draft.cryptoAmount} {draft.walletSnapshot.currency} /{" "}
                {draft.walletSnapshot.network}
              </p>
              <p className="break-all">
                Address: {draft.walletSnapshot.address}
              </p>
              <p className="break-all">TXID: {draft.txid}</p>
              {draft.paidAt && (
                <p>Paid: {new Date(draft.paidAt).toLocaleString()}</p>
              )}
              {draft.note && <p>{draft.note}</p>}
              <button
                type="button"
                data-testid="payment-confirm"
                disabled={busy}
                className={`${button} text-white`}
                style={{ background: "#1B3A7A" }}
                onClick={() => void mutate()}
              >
                Confirm record
              </button>
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => setDraft(null)}
              >
                Edit
              </button>
            </div>
          )}
          <h4 className="font-bold">Payment history</h4>
          {!data.payments.length && (
            <p className="text-sm">No payment records.</p>
          )}
          {data.payments.map((p) => (
            <article
              key={p.id}
              className="rounded-xl p-3 space-y-1 text-sm"
              style={card}
            >
              <strong>
                {p.cryptoAmount} {p.currency} / {p.network}
              </strong>
              <p>
                Order cost: ${p.usdAmount} USD ·{" "}
                {p.orders.map((o) => o.reference).join(", ")}
              </p>
              <p className="break-all">TXID: {p.txid}</p>
              <p className="break-all">Address: {p.walletSnapshot.address}</p>
              <p>
                Paid: {new Date(p.paidAt).toLocaleString()} · Recorded:{" "}
                {new Date(p.recordedAt).toLocaleString()} by {p.recordedBy}
              </p>
              {p.note && <p>{p.note}</p>}
              {p.voidedAt ? (
                <p className="text-red-600">Voided: {p.voidReason}</p>
              ) : (
                <button
                  type="button"
                  disabled={busy || !!draft}
                  className={`${button} text-red-700`}
                  onClick={() => {
                    setVoidId(p.id);
                    setReason("");
                  }}
                >
                  Void record
                </button>
              )}
            </article>
          ))}
          {voidId && (
            <div className="rounded-xl p-3 space-y-2" style={card}>
              <p>Only corrects this record; does not reverse transfer.</p>
              <p className="break-all">
                TXID: {data.payments.find((p) => p.id === voidId)?.txid}
              </p>
              <label className="block text-sm">
                Required reason
                <input
                  data-testid="payment-void-reason"
                  className={field}
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                type="button"
                data-testid="payment-void-confirm"
                disabled={busy || !reason.trim()}
                className={`${button} text-red-700`}
                onClick={() => void mutate(true)}
              >
                Confirm void record
              </button>
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => setVoidId("")}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
