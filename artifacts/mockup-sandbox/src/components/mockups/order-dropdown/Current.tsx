import './_group.css';
import { useState } from 'react';
import {
  Package, MapPin, QrCode, Pencil, Upload, ChevronUp, Copy, Check,
} from 'lucide-react';

const order = {
  code: 'SP-4F9A2',
  telegramUsername: 'mara_k',
  status: 'Shipped',
  paymentStatus: 'Paid',
  grandTotal: 184.5,
  trackingNumber: 'AB123456789GB',
  createdAt: '2026-06-18',
};

const lineItems = [
  { quantity: 2, productName: 'Semaglutide 5mg', lineTotal: 96.0 },
  { quantity: 1, productName: 'BPC-157 5mg', lineTotal: 38.0 },
  { quantity: 1, productName: 'TB-500 5mg', lineTotal: 42.0 },
];

const detail = {
  paymentTxHash: '0x9f3c2a7b1e4d8c6f0a5b9e2d7c4f1a8b3e6d9c2f5a8b1e4d7c0f3a6b9e2d5c8f',
  shippingName: 'Mara Kensington',
  shippingAddress: '14 Wellfield Road',
  shippingCity: 'Cardiff',
  shippingPostcode: 'CF24 3PB',
  trackingNumbers: ['AB123456789GB', 'JD0002284410GB'],
  inpostQrCode: '',
  royalMailQrCode: '',
};

const sym = '£';
const fmt = (n: number) => n.toFixed(2);

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
      style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)', border: '1px solid var(--t-border)' }}
    >
      {done ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export function Current() {
  return (
    <div className="sp-order-scope min-h-screen p-4 flex justify-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
          {/* Row summary */}
          <div className="px-4 py-3 flex items-center gap-3 cursor-pointer">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--t-muted)' }}>{order.code}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--t-text)' }}>@{order.telegramUsername}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: '#1B3A7A', background: 'rgba(45,107,204,0.12)' }}>{order.status}</span>
                <span className="text-[10px] font-semibold" style={{ color: '#16A34A' }}>{order.paymentStatus}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--t-text)' }}>{sym}{fmt(order.grandTotal)}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--t-blue)' }}>#{order.trackingNumber}</span>
                <span className="text-[10px]" style={{ color: 'var(--t-subtle)' }}>18 Jun 2026</span>
              </div>
            </div>
            <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--t-muted)' }} />
          </div>

          {/* Expanded detail */}
          <div className="border-t px-3 py-3 space-y-3" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface2)' }}>
            {/* Line items */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="px-3 py-2 flex items-center gap-1.5 border-b" style={{ borderColor: 'var(--t-border)' }}>
                <Package className="w-3 h-3" style={{ color: 'var(--t-subtle)' }} />
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-subtle)' }}>Items</p>
              </div>
              <div>
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--t-border)' }}>
                    <span className="min-w-[1.75rem] h-6 px-1.5 rounded-md flex items-center justify-center text-[10px] font-bold tabular-nums shrink-0" style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)' }}>{item.quantity}×</span>
                    <span className="flex-1 text-[11px] font-medium" style={{ color: 'var(--t-text)' }}>{item.productName}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--t-text)' }}>{sym}{fmt(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--t-surface2)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--t-subtle)' }}>Subtotal</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--t-text)' }}>{sym}{fmt(lineItems.reduce((s, it) => s + it.lineTotal, 0))}</span>
              </div>
            </div>

            {/* Transaction ID */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-subtle)' }}>Transaction ID</p>
                <CopyButton value={detail.paymentTxHash} />
              </div>
              <p className="font-mono text-[11px] break-all leading-relaxed" style={{ color: 'var(--t-muted)' }}>{detail.paymentTxHash}</p>
            </div>

            {/* Tracking */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--t-blue)' }}>
                  <MapPin className="w-2.5 h-2.5" /> Tracking
                </p>
                <button className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--t-blue)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <Pencil className="w-2.5 h-2.5" /> Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.trackingNumbers.map((tn, i) => (
                  <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--t-blue)', border: '1px solid rgba(59,130,246,0.2)' }}>{tn}</span>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--t-subtle)' }}>
                  <MapPin className="w-2.5 h-2.5" /> Delivery Address
                </p>
                <button className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)', border: '1px solid var(--t-border)' }}>
                  <Pencil className="w-2.5 h-2.5" /> Edit
                </button>
              </div>
              <div className="text-[11px] leading-relaxed">
                <div className="font-semibold" style={{ color: 'var(--t-text)' }}>{detail.shippingName}</div>
                <div style={{ color: 'var(--t-muted)' }}>{detail.shippingAddress}, {detail.shippingCity} {detail.shippingPostcode}</div>
              </div>
            </div>

            {/* QR Codes */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.18)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: '#7C3AED' }}>
                <QrCode className="w-2.5 h-2.5" /> QR Codes
              </p>
              {['InPost', 'Royal Mail'].map(label => (
                <div key={label} className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold w-16 shrink-0" style={{ color: '#7C3AED' }}>{label}</span>
                  <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', color: '#7C3AED' }}>
                    <Upload className="w-2.5 h-2.5" /> Upload
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
