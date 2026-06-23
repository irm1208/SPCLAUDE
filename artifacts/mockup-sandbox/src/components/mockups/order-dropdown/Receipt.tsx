import './Receipt.css';
import { useState } from 'react';
import {
  MapPin, QrCode, Pencil, Upload, Copy, Check, Scissors,
} from 'lucide-react';

const order = {
  code: 'SP-4F9A2',
  telegramUsername: 'mara_k',
  status: 'Shipped',
  paymentStatus: 'Paid',
  grandTotal: 184.5,
  createdAt: '18 Jun 2026',
};

const lineItems = [
  { quantity: 2, productName: 'SEMAGLUTIDE 5MG', lineTotal: 96.0 },
  { quantity: 1, productName: 'BPC-157 5MG', lineTotal: 38.0 },
  { quantity: 1, productName: 'TB-500 5MG', lineTotal: 42.0 },
];

const detail = {
  paymentTxHash: '0x9f3c2a7b1e4d8c6f0a5b9e2d7c4f1a8b3e6d9c2f5a8b1e4d7c0f3a6b9e2d5c8f',
  shippingName: 'Mara Kensington',
  shippingAddress: '14 Wellfield Road',
  shippingCity: 'Cardiff',
  shippingPostcode: 'CF24 3PB',
  trackingNumbers: ['AB123456789GB', 'JD0002284410GB'],
  couriers: ['InPost', 'Royal Mail'],
};

const sym = '£';
const fmt = (n: number) => n.toFixed(2);
const subtotal = lineItems.reduce((s, it) => s + it.lineTotal, 0);

function Leader() {
  return <span className="leader" aria-hidden />;
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
      style={{ color: 'var(--ink-soft)', border: '1px dashed var(--rule)' }}
    >
      {done ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export function Receipt() {
  return (
    <div
      className="sp-receipt min-h-screen w-full flex justify-center items-start py-8 px-4"
      style={{ background: '#E7E0D2' }}
    >
      <div className="w-full max-w-[400px]">
        {/* perforated top edge */}
        <div className="sp-receipt-perf-top" />

        <div className="sp-receipt-paper px-6 pt-5 pb-2" style={{ color: 'var(--ink)' }}>
          {/* Merchant header */}
          <div className="text-center pb-3" style={{ borderBottom: '2px solid var(--ink)' }}>
            <div className="text-xl font-bold tracking-[0.35em] pl-[0.35em]">SALT&amp;PEPS</div>
            <div className="text-[10px] tracking-[0.25em] mt-1" style={{ color: 'var(--ink-soft)' }}>
              PEPTIDE SUPPLY CO.
            </div>
            <div className="text-[10px] mt-2" style={{ color: 'var(--ink-faint)' }}>
              — PROOF OF PURCHASE —
            </div>
          </div>

          {/* Order meta */}
          <div className="py-3 text-[11px] space-y-1" style={{ borderBottom: '1px dashed var(--rule)' }}>
            <div className="flex items-center">
              <span style={{ color: 'var(--ink-soft)' }}>ORDER</span>
              <Leader />
              <span className="font-bold tracking-wider">{order.code}</span>
            </div>
            <div className="flex items-center">
              <span style={{ color: 'var(--ink-soft)' }}>CUSTOMER</span>
              <Leader />
              <span className="font-bold">@{order.telegramUsername}</span>
            </div>
            <div className="flex items-center">
              <span style={{ color: 'var(--ink-soft)' }}>DATE</span>
              <Leader />
              <span className="font-bold">{order.createdAt}</span>
            </div>
            <div className="flex items-center">
              <span style={{ color: 'var(--ink-soft)' }}>STATUS</span>
              <Leader />
              <span className="font-bold uppercase">{order.status}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3" style={{ borderBottom: '1px dashed var(--rule)' }}>
            <div className="flex items-center justify-between text-[9px] font-bold tracking-[0.2em] mb-2" style={{ color: 'var(--ink-faint)' }}>
              <span>QTY  ITEM</span>
              <span>GBP</span>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-baseline text-[11px]">
                  <span className="font-bold w-7 tabular-nums">{item.quantity}×</span>
                  <span className="font-bold tracking-wide">{item.productName}</span>
                  <Leader />
                  <span className="font-bold tabular-nums">{sym}{fmt(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal + Total */}
          <div className="py-3 space-y-1.5 text-[11px]">
            <div className="flex items-center">
              <span style={{ color: 'var(--ink-soft)' }}>SUBTOTAL</span>
              <Leader />
              <span className="font-bold tabular-nums">{sym}{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center">
              <span style={{ color: 'var(--ink-soft)' }}>SHIPPING</span>
              <Leader />
              <span className="font-bold tabular-nums">{sym}{fmt(order.grandTotal - subtotal)}</span>
            </div>
          </div>

          {/* Ruled TOTAL */}
          <div
            className="flex items-center justify-between px-1 py-2 mb-3"
            style={{ borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)' }}
          >
            <span className="text-sm font-bold tracking-[0.2em]">TOTAL</span>
            <span className="text-xl font-bold tabular-nums">{sym}{fmt(order.grandTotal)}</span>
          </div>

          {/* Payment / Tx */}
          <div className="pb-3" style={{ borderBottom: '1px dashed var(--rule)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: 'var(--ink-soft)' }}>
                  PAYMENT
                </span>
                <span
                  className="sp-receipt-stamp inline-block text-[10px] font-bold tracking-[0.15em] px-2 py-0.5"
                >
                  {order.paymentStatus.toUpperCase()}
                </span>
              </div>
              <CopyButton value={detail.paymentTxHash} />
            </div>
            <div className="text-[9px] tracking-wider mb-1" style={{ color: 'var(--ink-faint)' }}>TXN ID</div>
            <p className="text-[10px] break-all leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              {detail.paymentTxHash}
            </p>
          </div>

          {/* Barcode */}
          <div className="py-4 flex flex-col items-center gap-2">
            <div className="sp-receipt-barcode w-full" />
            <span className="text-[10px] tracking-[0.4em] pl-[0.4em]" style={{ color: 'var(--ink-soft)' }}>
              {order.code}
            </span>
          </div>
        </div>

        {/* Tear line — "stubs" below */}
        <div className="relative">
          <div className="sp-receipt-tear" />
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 text-[8px] font-bold tracking-[0.3em]"
            style={{ background: 'var(--paper)', color: 'var(--ink-faint)' }}
          >
            <Scissors className="w-2.5 h-2.5" /> DETACH STUBS
          </div>
        </div>

        {/* STUB: Shipping address */}
        <div className="sp-receipt-paper px-6 py-4 mt-px" style={{ color: 'var(--ink)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em]">
              <MapPin className="w-3 h-3" style={{ color: 'var(--stamp)' }} /> SHIP TO
            </div>
            <button
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
              style={{ color: 'var(--ink-soft)', border: '1px dashed var(--rule)' }}
            >
              <Pencil className="w-2.5 h-2.5" /> Edit
            </button>
          </div>
          <div className="text-[12px] leading-relaxed">
            <div className="font-bold tracking-wide">{detail.shippingName}</div>
            <div style={{ color: 'var(--ink-soft)' }}>{detail.shippingAddress}</div>
            <div style={{ color: 'var(--ink-soft)' }}>{detail.shippingCity} {detail.shippingPostcode}</div>
          </div>
        </div>

        <div className="sp-receipt-tear" />

        {/* STUB: Tracking */}
        <div className="sp-receipt-paper px-6 py-4 mt-px" style={{ color: 'var(--ink)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold tracking-[0.2em]">TRACKING NOS.</div>
            <button
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
              style={{ color: 'var(--ink-soft)', border: '1px dashed var(--rule)' }}
            >
              <Pencil className="w-2.5 h-2.5" /> Edit
            </button>
          </div>
          <div className="space-y-1.5">
            {detail.trackingNumbers.map((tn, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[12px] font-bold tracking-wider px-2 py-1.5"
                style={{ border: '1px dashed var(--rule)' }}
              >
                <span style={{ color: 'var(--ink-faint)' }}>›</span> {tn}
              </div>
            ))}
          </div>
        </div>

        <div className="sp-receipt-tear" />

        {/* STUB: QR codes */}
        <div className="sp-receipt-paper px-6 py-4 mt-px" style={{ color: 'var(--ink)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] mb-3">
            <QrCode className="w-3 h-3" /> COURIER QR LABELS
          </div>
          <div className="grid grid-cols-2 gap-3">
            {detail.couriers.map(label => (
              <div
                key={label}
                className="flex flex-col items-center text-center px-2 py-3"
                style={{ border: '1px dashed var(--rule)' }}
              >
                <div
                  className="sp-receipt-qr w-14 h-14 mb-2"
                  style={{ border: '1px solid var(--rule)' }}
                />
                <div className="text-[10px] font-bold tracking-wide mb-2">{label}</div>
                <label
                  className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                  style={{ color: 'var(--stamp)', border: '1px solid var(--stamp)', background: 'var(--stamp-bg)' }}
                >
                  <Upload className="w-2.5 h-2.5" /> Upload
                </label>
              </div>
            ))}
          </div>
          <div className="text-center text-[8px] tracking-[0.25em] mt-4" style={{ color: 'var(--ink-faint)' }}>
            * NO LABELS UPLOADED YET *
          </div>
        </div>

        {/* perforated bottom edge */}
        <div className="sp-receipt-perf-bottom" />

        <div className="text-center text-[9px] tracking-[0.3em] mt-3" style={{ color: '#8C8270' }}>
          THANK YOU — KEEP THIS RECEIPT
        </div>
      </div>
    </div>
  );
}
