import './_group.css';
import { useState } from 'react';
import {
  Package, MapPin, QrCode, Pencil, Upload, ChevronUp, Copy, Check,
  CreditCard, Hash, Truck, User, CheckCircle2,
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
};

const sym = '£';
const fmt = (n: number) => n.toFixed(2);
const subtotal = lineItems.reduce((s, it) => s + it.lineTotal, 0);

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
      style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)', border: '1px solid var(--t-border)' }}
    >
      {done ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function RailBlock({
  icon, title, action, children,
}: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 border-b"
        style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface2)' }}
      >
        <span style={{ color: 'var(--t-subtle)' }}>{icon}</span>
        <p className="text-[9px] font-bold uppercase tracking-widest flex-1" style={{ color: 'var(--t-subtle)' }}>{title}</p>
        {action}
      </div>
      <div className="px-2.5 py-2">{children}</div>
    </div>
  );
}

export function Dense() {
  return (
    <div className="sp-order-scope min-h-screen p-4 flex items-start justify-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[860px]">
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>

          {/* Header / summary bar — dense, grid-aligned */}
          <div
            className="px-3 py-2.5 flex items-center gap-x-3 gap-y-1 flex-wrap"
            style={{ background: 'var(--t-gradient)' }}
          >
            <span className="font-mono text-sm font-bold text-white">{order.code}</span>
            <span className="text-xs font-semibold text-white/90">@{order.telegramUsername}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-white/15 text-white">
              <Truck className="w-2.5 h-2.5" /> {order.status}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.92)', color: '#15803D' }}>
              <CheckCircle2 className="w-2.5 h-2.5" /> {order.paymentStatus}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[10px] font-medium text-white/80">{order.createdAt}</span>
              <span className="text-base font-bold tabular-nums text-white">{sym}{fmt(order.grandTotal)}</span>
              <ChevronUp className="w-4 h-4 text-white/90" />
            </div>
          </div>

          {/* Two-column body */}
          <div
            className="grid gap-2.5 p-2.5"
            style={{ gridTemplateColumns: 'minmax(0,1fr)', background: 'var(--t-surface2)' }}
          >
            <div className="grid gap-2.5 sp-dense-grid">
              {/* LEFT — items table + subtotal */}
              <div className="rounded-lg overflow-hidden" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface2)' }}>
                  <Package className="w-3 h-3" style={{ color: 'var(--t-subtle)' }} />
                  <p className="text-[9px] font-bold uppercase tracking-widest flex-1" style={{ color: 'var(--t-subtle)' }}>Items</p>
                  <span className="text-[9px] font-semibold" style={{ color: 'var(--t-subtle)' }}>{lineItems.length} lines</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--t-surface)' }}>
                      <th className="text-left text-[8px] font-bold uppercase tracking-wider px-2.5 py-1" style={{ color: 'var(--t-subtle)' }}>Qty</th>
                      <th className="text-left text-[8px] font-bold uppercase tracking-wider px-1 py-1" style={{ color: 'var(--t-subtle)' }}>Product</th>
                      <th className="text-right text-[8px] font-bold uppercase tracking-wider px-2.5 py-1" style={{ color: 'var(--t-subtle)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--t-border)' }}>
                        <td className="px-2.5 py-1.5 align-middle">
                          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded text-[10px] font-bold tabular-nums" style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)' }}>{item.quantity}×</span>
                        </td>
                        <td className="px-1 py-1.5 text-[11px] font-medium align-middle" style={{ color: 'var(--t-text)' }}>{item.productName}</td>
                        <td className="px-2.5 py-1.5 text-[11px] font-bold tabular-nums text-right align-middle" style={{ color: 'var(--t-text)' }}>{sym}{fmt(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface2)' }}>
                      <td colSpan={2} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--t-subtle)' }}>Subtotal</td>
                      <td className="px-2.5 py-2 text-xs font-bold tabular-nums text-right" style={{ color: 'var(--t-text)' }}>{sym}{fmt(subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* RIGHT rail — stacked compact key-value blocks */}
              <div className="grid gap-2.5 content-start">
                {/* Payment + Transaction */}
                <RailBlock icon={<CreditCard className="w-3 h-3" />} title="Payment" action={<CopyButton value={detail.paymentTxHash} />}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--t-subtle)' }}>Status</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(22,163,74,0.1)', color: '#15803D' }}>{order.paymentStatus} · {sym}{fmt(order.grandTotal)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <Hash className="w-2.5 h-2.5" style={{ color: 'var(--t-subtle)' }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-subtle)' }}>Transaction ID</span>
                  </div>
                  <p className="font-mono text-[10px] break-all leading-snug" style={{ color: 'var(--t-muted)' }}>{detail.paymentTxHash}</p>
                </RailBlock>

                {/* Tracking */}
                <RailBlock
                  icon={<MapPin className="w-3 h-3" />}
                  title="Tracking"
                  action={
                    <button className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(45,107,204,0.1)', color: 'var(--t-blue)', border: '1px solid rgba(45,107,204,0.25)' }}>
                      <Pencil className="w-2.5 h-2.5" /> Edit
                    </button>
                  }
                >
                  <div className="flex flex-wrap gap-1.5">
                    {detail.trackingNumbers.map((tn, i) => (
                      <span key={i} className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(45,107,204,0.08)', color: 'var(--t-blue)', border: '1px solid rgba(45,107,204,0.2)' }}>{tn}</span>
                    ))}
                  </div>
                </RailBlock>

                {/* Delivery address */}
                <RailBlock
                  icon={<User className="w-3 h-3" />}
                  title="Delivery"
                  action={
                    <button className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)', border: '1px solid var(--t-border)' }}>
                      <Pencil className="w-2.5 h-2.5" /> Edit
                    </button>
                  }
                >
                  <div className="text-[11px] leading-snug">
                    <div className="font-semibold" style={{ color: 'var(--t-text)' }}>{detail.shippingName}</div>
                    <div style={{ color: 'var(--t-muted)' }}>{detail.shippingAddress}, {detail.shippingCity} {detail.shippingPostcode}</div>
                  </div>
                </RailBlock>

                {/* QR codes */}
                <RailBlock icon={<QrCode className="w-3 h-3" />} title="Courier QR">
                  <div className="grid grid-cols-2 gap-1.5">
                    {['InPost', 'Royal Mail'].map(label => (
                      <div key={label} className="rounded-md p-1.5 flex flex-col items-center gap-1" style={{ background: 'var(--t-surface2)', border: '1px dashed var(--t-border)' }}>
                        <span className="text-[9px] font-bold" style={{ color: 'var(--t-muted)' }}>{label}</span>
                        <label className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-semibold cursor-pointer w-full justify-center" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-blue)' }}>
                          <Upload className="w-2.5 h-2.5" /> Upload
                        </label>
                      </div>
                    ))}
                  </div>
                </RailBlock>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 700px) {
          .sp-dense-grid {
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}
