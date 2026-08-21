import { useState } from "react";
import { Loader2, CheckCircle2, Clock, Check, Copy, Plus, Trash2, Bitcoin, DollarSign } from "lucide-react";
import type { LeadCryptoOption } from "@/hooks/use-wholesale-shares";

export function FeeLine({ label, amount, paid, canConfirm, busy, onToggle }: {
  label: string; amount: string; paid: boolean; canConfirm: boolean; busy: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: "var(--t-muted)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{amount}</span>
        {canConfirm ? (
          <button
            onClick={onToggle}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold border disabled:opacity-50"
            style={paid
              ? { background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.30)", color: "#15803d" }
              : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : paid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {paid ? "Paid" : "Mark paid"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold"
            style={paid
              ? { background: "rgba(34,197,94,0.12)", color: "#15803d" }
              : { background: "rgba(234,179,8,0.12)", color: "#a16207" }}>
            {paid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {paid ? "Paid" : "Unpaid"}
          </span>
        )}
      </div>
    </div>
  );
}

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — ignore */ }
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>{label}</p>
        <p className="text-xs font-mono break-all" style={{ color: "var(--t-text)" }}>{value}</p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border"
        style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: copied ? "#15803d" : "var(--t-muted)" }}
        title={`Copy ${label}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

const CURRENCY_NETWORKS: Record<string, string[]> = {
  USDT: ["ERC-20", "TRC-20", "Arbitrum One", "Polygon", "Solana"],
  USDC: ["ERC-20", "Arbitrum One", "Polygon", "Solana"],
  BTC:  ["Bitcoin Mainnet"],
  ETH:  ["Ethereum"],
};
const CURRENCIES = Object.keys(CURRENCY_NETWORKS);

interface CryptoRowProps {
  opt: LeadCryptoOption;
  onChange: (o: LeadCryptoOption) => void;
  onRemove: () => void;
  field: React.CSSProperties;
}

function CryptoRow({ opt, onChange, onRemove, field }: CryptoRowProps) {
  const networks = CURRENCY_NETWORKS[opt.currency] ?? CURRENCY_NETWORKS["USDT"];
  const network = networks.includes(opt.network) ? opt.network : networks[0];

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
      <div className="flex items-center gap-2">
        <select
          value={opt.currency}
          onChange={e => {
            const cur = e.target.value;
            const nets = CURRENCY_NETWORKS[cur] ?? [];
            onChange({ currency: cur, network: nets[0] ?? "", walletAddress: opt.walletAddress });
          }}
          className="h-8 px-2 rounded-lg border text-sm outline-none"
          style={{ ...field, minWidth: 80 }}
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={network}
          onChange={e => onChange({ ...opt, network: e.target.value })}
          className="flex-1 h-8 px-2 rounded-lg border text-sm outline-none"
          style={field}
        >
          {networks.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border"
          style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "#ef4444" }}
          title="Remove wallet"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        value={opt.walletAddress}
        onChange={e => onChange({ ...opt, walletAddress: e.target.value })}
        placeholder="Wallet address"
        className="w-full h-8 px-3 rounded-lg border text-sm font-mono outline-none"
        style={field}
        maxLength={200}
      />
    </div>
  );
}

interface PaymentMethodEditorProps {
  revolut: string;
  onRevolutChange: (v: string) => void;
  paypal: string;
  onPaypalChange: (v: string) => void;
  anonPayWallet: string;
  onAnonPayWalletChange: (v: string) => void;
  cryptoOptions: LeadCryptoOption[];
  onCryptoChange: (v: LeadCryptoOption[]) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onAnyChange?: () => void;
  field: React.CSSProperties;
}

export function PaymentMethodEditor({
  revolut, onRevolutChange,
  paypal, onPaypalChange,
  anonPayWallet, onAnonPayWalletChange,
  cryptoOptions, onCryptoChange,
  notes, onNotesChange,
  onAnyChange,
  field,
}: PaymentMethodEditorProps) {
  const mark = () => onAnyChange?.();

  const addCrypto = () => {
    onCryptoChange([...cryptoOptions, { currency: "USDT", network: "ERC-20", walletAddress: "" }]);
    mark();
  };
  const updateCrypto = (i: number, opt: LeadCryptoOption) => {
    const next = [...cryptoOptions];
    next[i] = opt;
    onCryptoChange(next);
    mark();
  };
  const removeCrypto = (i: number) => {
    onCryptoChange(cryptoOptions.filter((_, idx) => idx !== i));
    mark();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>
          Revolut handle
        </label>
        <input
          value={revolut}
          onChange={e => { onRevolutChange(e.target.value); mark(); }}
          placeholder="@yourhandle"
          maxLength={200}
          className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
          style={field}
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>
          PayPal email / username
        </label>
        <input
          value={paypal}
          onChange={e => { onPaypalChange(e.target.value); mark(); }}
          placeholder="you@example.com"
          maxLength={200}
          className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
          style={field}
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>
          AnonPay wallet address
        </label>
        <input
          value={anonPayWallet}
          onChange={e => { onAnonPayWalletChange(e.target.value); mark(); }}
          placeholder="Wallet address for AnonPay"
          maxLength={200}
          className="w-full h-10 px-3 rounded-lg border text-sm font-mono outline-none"
          style={field}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
            Crypto wallets
          </label>
          <button
            type="button"
            onClick={addCrypto}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg border text-[11px] font-bold"
            style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          >
            <Plus className="w-3 h-3" /> Add wallet
          </button>
        </div>
        {cryptoOptions.length === 0 && (
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>No crypto wallets added yet.</p>
        )}
        {cryptoOptions.map((opt, i) => (
          <CryptoRow
            key={i}
            opt={opt}
            onChange={o => updateCrypto(i, o)}
            onRemove={() => removeCrypto(i)}
            field={field}
          />
        ))}
      </div>

      <div>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>
          Additional notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => { onNotesChange(e.target.value); mark(); }}
          placeholder="Any other payment instructions…"
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
          style={field}
        />
      </div>
    </div>
  );
}

interface PaymentMethodDisplayProps {
  organiserUsername: string;
  revolut: string | null;
  paypal: string | null;
  anonPayWallet: string | null;
  cryptoOptions: LeadCryptoOption[];
  notes: string | null;
}

export function PaymentMethodDisplay({ organiserUsername, revolut, paypal, anonPayWallet, cryptoOptions, notes }: PaymentMethodDisplayProps) {
  const hasAny = !!revolut || !!paypal || !!anonPayWallet || cryptoOptions.length > 0 || !!notes;

  if (!hasAny) {
    return (
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Payment details not provided yet — ask @{organiserUsername.replace(/^@/, "")}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>
        Pay @{organiserUsername.replace(/^@/, "")} directly — not part of your order.
      </p>
      <div className="space-y-2">
        {revolut && <CopyField label="Revolut" value={revolut} />}
        {paypal && <CopyField label="PayPal" value={paypal} />}
        {anonPayWallet && <CopyField label="AnonPay wallet" value={anonPayWallet} />}
        {cryptoOptions.map((opt, i) => (
          <CopyField key={i} label={`${opt.currency} · ${opt.network}`} value={opt.walletAddress} />
        ))}
        {notes && (
          <p className="whitespace-pre-line text-xs pt-1" style={{ color: "var(--t-muted)" }}>{notes}</p>
        )}
      </div>
    </div>
  );
}
