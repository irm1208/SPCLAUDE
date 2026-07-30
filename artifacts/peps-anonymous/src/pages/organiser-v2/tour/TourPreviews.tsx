import { useEffect, useState } from "react";
import { Check, Copy, FlaskConical, Lock, MapPin, QrCode } from "lucide-react";

// ─── Tour previews ───────────────────────────────────────────────────────────
// Miniature "what members see" mockups shown on wizard tour steps, so a new
// organiser can visualise where each setting ends up on the member side.
// They are deliberately stylised (not the real member components, which are
// data-coupled) but echo the member UI's structure.

export type PreviewKind =
  | "gb-card"
  | "order-form"
  | "shipping-picker"
  | "pay-crypto"
  | "pay-anonpay"
  | "pay-revolut"
  | "pay-paypal"
  | "join-gate"
  | "rules-welcome";

/** Mirror the live value of a wizard input so previews update as you type. */
function useLiveInput(selector: string, fallback: string) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const read = () => {
      const element = document.querySelector(selector) as HTMLInputElement | null;
      setValue(element?.value ?? "");
    };
    read();
    document.addEventListener("input", read, true);
    return () => document.removeEventListener("input", read, true);
  }, [selector]);
  return value.trim() || fallback;
}

function GbCardPreview() {
  const name = useLiveInput('[data-tour="basics-name-input"]', "Winter Peptide Run");
  return (
    <div className="ov2-tour-mock is-dark">
      <div className="ov2-tour-mock-row">
        <span className="ov2-tour-mock-dark-icon"><FlaskConical aria-hidden="true" /></span>
        <span className="ov2-tour-mock-dark-kicker">Group Buy</span>
        <span className="ov2-tour-mock-pill is-dark-open">● Open</span>
      </div>
      <strong className="ov2-tour-mock-dark-title">{name}</strong>
      <p className="ov2-tour-mock-dark-sub">Your description appears here</p>
      <div className="ov2-tour-mock-dark-rows">
        <span>Organised by</span><span>you</span>
        <span>Closes</span><span>Your close date</span>
        <span>Products</span><span>3 · Your currency</span>
      </div>
      <span className="ov2-tour-mock-dark-button">View Group Buy ›</span>
    </div>
  );
}

function OrderFormPreview() {
  const name = useLiveInput('[data-tour="product-name-input"]', "Semaglutide 5mg");
  return (
    <div className="ov2-tour-mock">
      <div className="ov2-tour-mock-line">
        <span className="ov2-tour-mock-title">{name}</span>
        <span className="ov2-tour-mock-tag">12 left</span>
        <span className="ov2-tour-mock-qty">− 1 +</span>
      </div>
      <div className="ov2-tour-mock-line is-soldout">
        <span className="ov2-tour-mock-title">Tirzepatide 10mg</span>
        <span className="ov2-tour-mock-pill is-closed">Sold out</span>
        <span className="ov2-tour-mock-qty">—</span>
      </div>
      <p className="ov2-tour-mock-muted">Stock 0 = sold out, automatically.</p>
    </div>
  );
}

function ShippingPickerPreview() {
  return (
    <div className="ov2-tour-mock">
      <div className="ov2-tour-mock-line is-selected">
        <MapPin aria-hidden="true" />
        <span><strong>Tracked post</strong><br /><small>Member enters their address</small></span>
      </div>
      <div className="ov2-tour-mock-line">
        <QrCode aria-hidden="true" />
        <span><strong>Label / QR drop</strong><br /><small>Member uploads postage — you never see the address</small></span>
      </div>
    </div>
  );
}

function PayCryptoPreview() {
  return (
    <div className="ov2-tour-mock">
      <p className="ov2-tour-mock-muted">Member's payment screen:</p>
      <div className="ov2-tour-mock-line is-selected">
        <span className="ov2-tour-mock-title">Send USDT</span>
        <span className="ov2-tour-mock-tag">TRC20 · Tron</span>
      </div>
      <div className="ov2-tour-mock-address"><code>TQrf…9dKw</code> <Copy aria-hidden="true" /></div>
      <p className="ov2-tour-mock-warn">⚠ Send only on the TRC20 network</p>
    </div>
  );
}

function PayAnonpayPreview() {
  return (
    <div className="ov2-tour-mock">
      <p className="ov2-tour-mock-muted">Member picks any coin:</p>
      <div className="ov2-tour-mock-row">
        <span className="ov2-tour-mock-tag">BTC</span>
        <span className="ov2-tour-mock-tag">ETH</span>
        <span className="ov2-tour-mock-tag">LTC</span>
        <span className="ov2-tour-mock-tag">XMR</span>
        <span className="ov2-tour-mock-tag">…</span>
      </div>
      <p className="ov2-tour-mock-muted">→ converted automatically → you receive your chosen coin</p>
    </div>
  );
}

function PayRevolutPreview() {
  return (
    <div className="ov2-tour-mock">
      <p className="ov2-tour-mock-muted">Member's Revolut app:</p>
      <div className="ov2-tour-mock-line is-selected">
        <span className="ov2-tour-mock-title">Pay @your-revtag</span>
        <span className="ov2-tour-mock-pill is-open">Instant · Free</span>
      </div>
    </div>
  );
}

function PayPaypalPreview() {
  return (
    <div className="ov2-tour-mock">
      <p className="ov2-tour-mock-muted">Member follows your link:</p>
      <div className="ov2-tour-mock-address"><code>paypal.me/you/50</code></div>
      <div className="ov2-tour-mock-row">
        <span className="ov2-tour-mock-tag">Friends &amp; Family — free, no protection</span>
      </div>
      <div className="ov2-tour-mock-row">
        <span className="ov2-tour-mock-tag">Goods &amp; Services — protected, ~3% fee</span>
      </div>
    </div>
  );
}

function JoinGatePreview() {
  return (
    <div className="ov2-tour-mock">
      <div className="ov2-tour-mock-row">
        <Lock aria-hidden="true" />
        <span className="ov2-tour-mock-title">This group buy is invite-only</span>
      </div>
      <div className="ov2-tour-mock-pin"><i>•</i><i>•</i><i>•</i><i>•</i></div>
      <p className="ov2-tour-mock-muted">Entry fee (if set) is paid here, before joining.</p>
    </div>
  );
}

function RulesWelcomePreview() {
  return (
    <div className="ov2-tour-mock">
      <span className="ov2-tour-mock-title">Welcome 👋</span>
      <p className="ov2-tour-mock-muted">Your welcome message greets members here.</p>
      <ul className="ov2-tour-mock-rules">
        <li><Check aria-hidden="true" /> Payment due within 48h</li>
        <li><Check aria-hidden="true" /> No refunds after close</li>
      </ul>
      <span className="ov2-tour-mock-button">Agree &amp; join</span>
    </div>
  );
}

const PREVIEWS: Record<PreviewKind, () => React.ReactElement> = {
  "gb-card": GbCardPreview,
  "order-form": OrderFormPreview,
  "shipping-picker": ShippingPickerPreview,
  "pay-crypto": PayCryptoPreview,
  "pay-anonpay": PayAnonpayPreview,
  "pay-revolut": PayRevolutPreview,
  "pay-paypal": PayPaypalPreview,
  "join-gate": JoinGatePreview,
  "rules-welcome": RulesWelcomePreview,
};

export default function TourPreview({ kind }: { kind: PreviewKind }) {
  const Preview = PREVIEWS[kind];
  return (
    <aside className="ov2-tour-preview" aria-label="What members see">
      <header>
        <i /><i /><i />
        <span>What members see</span>
      </header>
      <Preview />
    </aside>
  );
}
