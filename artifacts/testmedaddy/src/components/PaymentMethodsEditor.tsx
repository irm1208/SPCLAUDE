import { Plus, Trash2 } from "lucide-react";
import type { PaymentMethods } from "@/lib/auth";
import { NETWORKS } from "@/lib/format";
import { Button, Field, Input, Select, Toggle } from "./ui";

/** Organiser's ways of getting paid. Crypto rails are verified on-chain automatically; the rest are manual. */
export function PaymentMethodsEditor({ value, onChange }: { value: PaymentMethods; onChange: (next: PaymentMethods) => void }) {
  const crypto = value.crypto ?? [];
  const setCrypto = (rails: PaymentMethods["crypto"]) => onChange({ ...value, crypto: rails && rails.length ? rails : undefined });
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between"><span className="label mb-0">Crypto wallets (auto-verified)</span>
          <Button type="button" tone="subtle" size="sm" onClick={() => setCrypto([...crypto, { currency: "USDT", network: "ethereum", address: "" }])}><Plus className="size-3.5" /> Add wallet</Button></div>
        {crypto.length === 0 && <p className="text-sm text-muted">USDT, USDC, ETH, SOL and BTC across Ethereum, Arbitrum, Polygon, BNB Chain, Solana, Tron and Bitcoin. Members paste a transaction hash and the platform confirms it on-chain. Add at least one stablecoin wallet if you can.</p>}
        <div className="space-y-2">
          {crypto.map((rail, i) => {
            const net = NETWORKS.find(n => n.value === rail.network) ?? NETWORKS[0];
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[160px_120px_1fr_auto]">
                <Select value={rail.network} onChange={e => { const n = NETWORKS.find(x => x.value === e.target.value)!; setCrypto(crypto.map((r, j) => j === i ? { ...r, network: n.value, currency: n.currencies.includes(r.currency) ? r.currency : n.currencies[0] } : r)); }}>
                  {NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </Select>
                <Select value={rail.currency} onChange={e => setCrypto(crypto.map((r, j) => j === i ? { ...r, currency: e.target.value } : r))}>
                  {net.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Input className="mono text-xs" placeholder="Wallet address" value={rail.address} onChange={e => setCrypto(crypto.map((r, j) => j === i ? { ...r, address: e.target.value.trim() } : r))} />
                <Button type="button" tone="ghost" size="sm" onClick={() => setCrypto(crypto.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-2 space-y-3 p-4">
          <Toggle checked={!!value.anonpay} onChange={on => onChange({ ...value, anonpay: on ? { wallet: value.crypto?.[0]?.address ?? "", ticker: "usdc", network: "ERC20" } : undefined })} label="AnonPay (card and any coin)" hint="Trocador converts whatever the member pays into your wallet. Confirmed automatically." />
          {value.anonpay && (
            <div className="grid gap-2">
              <Input className="mono text-xs" placeholder="Receiving wallet" value={value.anonpay.wallet} onChange={e => onChange({ ...value, anonpay: { ...value.anonpay!, wallet: e.target.value.trim() } })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ticker (usdc)" value={value.anonpay.ticker} onChange={e => onChange({ ...value, anonpay: { ...value.anonpay!, ticker: e.target.value.trim().toLowerCase() } })} />
                <Input placeholder="Network (ERC20)" value={value.anonpay.network} onChange={e => onChange({ ...value, anonpay: { ...value.anonpay!, network: e.target.value.trim() } })} />
              </div>
            </div>
          )}
        </div>
        <div className="card-2 space-y-3 p-4">
          <Toggle checked={!!value.revolut} onChange={on => onChange({ ...value, revolut: on ? { handle: "" } : undefined })} label="Revolut" hint="Members upload a screenshot; you confirm it." />
          {value.revolut && <Field><Input placeholder="@revtag" value={value.revolut.handle} onChange={e => onChange({ ...value, revolut: { handle: e.target.value.trim() } })} /></Field>}
          <Toggle checked={!!value.paypal} onChange={on => onChange({ ...value, paypal: on ? { email: "" } : undefined })} label="PayPal" hint="Friends and family. Screenshot confirmed by you." />
          {value.paypal && <Field><Input type="email" placeholder="paypal@email.com" value={value.paypal.email} onChange={e => onChange({ ...value, paypal: { email: e.target.value.trim() } })} /></Field>}
        </div>
      </div>
      <p className="text-xs text-dim">Everything above goes straight to you; Testmedaddy never holds the money. USDT and USDC are matched to the dollar share; ETH, SOL and BTC are quoted at the live price when the member pays and verified against that amount.</p>
    </div>
  );
}
