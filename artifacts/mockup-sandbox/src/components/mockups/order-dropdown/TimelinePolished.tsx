import './_group.css';
import { useState } from 'react';
import {
  Package, MapPin, QrCode, Pencil, Upload, ChevronUp, Copy, Check,
  FileText, CreditCard, Box, Truck, Home,
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
  trackingNumbers: [
    { value: 'AB123456789GB', courier: 'Royal Mail' },
    { value: 'JD0002284410GB', courier: 'InPost' },
  ],
};

const sym = '£';
const fmt = (n: number) => n.toFixed(2);
const subtotal = lineItems.reduce((s, it) => s + it.lineTotal, 0);
const totalQty = lineItems.reduce((s, it) => s + it.quantity, 0);

const steps = [
  { key: 'submitted', label: 'Submitted', icon: FileText, date: '18 Jun' },
  { key: 'paid', label: 'Paid', icon: CreditCard, date: '18 Jun' },
  { key: 'packed', label: 'Packed', icon: Box, date: '19 Jun' },
  { key: 'shipped', label: 'Shipped', icon: Truck, date: '20 Jun' },
  { key: 'delivered', label: 'Delivered', icon: Home, date: null },
];
const currentStepIndex = 3;

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md shrink-0 whitespace-nowrap"
      style={{ background: 'var(--t-surface2)', color: 'var(--t-subtle)', border: '1px solid var(--t-border)' }}
    >
      {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function EditButton({ tone = 'muted' }: { tone?: 'muted' | 'blue' }) {
  const styles = tone === 'blue'
    ? { background: 'rgba(45,107,204,0.1)', color: 'var(--t-blue)', border: '1px solid rgba(45,107,204,0.25)' }
    : { background: 'var(--t-surface2)', color: 'var(--t-subtle)', border: '1px solid var(--t-border)' };
  return (
    <button
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md shrink-0 whitespace-nowrap"
      style={styles}
    >
      <Pencil className="w-3 h-3" /> Edit
    </button>
  );
}

export function TimelinePolished() {
  // Stepper geometry: nodes are centered within equal-width columns.
  // First node center sits at 10%, last at 90% (with 5 steps), so the
  // connector track lives between 10% and 90% and the fill grows evenly.
  const colCenter = 100 / steps.length / 2; // 10%
  const trackSpan = 100 - colCenter * 2;     // 80%
  const fillWidth = (currentStepIndex / (steps.length - 1)) * trackSpan;

  return (
    <div className="sp-order-scope min-h-screen p-4 flex justify-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
          {/* Collapsed summary row */}
          <div className="px-4 py-3 flex items-center gap-3 cursor-pointer">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold shrink-0" style={{ color: 'var(--t-muted)' }}>{order.code}</span>
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--t-text)' }}>@{order.telegramUsername}</span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                  style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}
                >
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--t-text)' }}>{sym}{fmt(order.grandTotal)}</span>
                <span className="text-[10px]" style={{ color: 'var(--t-subtle)' }}>{order.createdAt}</span>
              </div>
            </div>
            <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--t-muted)' }} />
          </div>

          {/* HERO: Status timeline */}
          <div className="px-4 pt-4 pb-6" style={{ background: 'var(--t-gradient)' }}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.6)' }}>Status</p>
                <p className="text-2xl font-extrabold leading-tight text-white truncate">{order.status}</p>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap mt-0.5"
                style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <Truck className="w-3 h-3 text-white shrink-0" />
                <span className="text-[10px] font-bold text-white">In transit</span>
              </div>
            </div>

            {/* Horizontal stepper */}
            <div className="relative">
              {/* connector track */}
              <div
                className="absolute top-[15px] h-[3px] rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', left: `${colCenter}%`, width: `${trackSpan}%` }}
              />
              <div
                className="absolute top-[15px] h-[3px] rounded-full"
                style={{ background: '#FFFFFF', left: `${colCenter}%`, width: `${fillWidth}%` }}
              />
              <div className="relative flex">
                {steps.map((step, i) => {
                  const done = i < currentStepIndex;
                  const current = i === currentStepIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center px-0.5" style={{ width: `${100 / steps.length}%` }}>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={
                          current
                            ? { background: '#FFFFFF', boxShadow: '0 0 0 4px rgba(255,255,255,0.28)' }
                            : done
                              ? { background: 'rgba(255,255,255,0.95)' }
                              : { background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.32)' }
                        }
                      >
                        {done
                          ? <Check className="w-4 h-4" style={{ color: 'var(--t-blue-deep)' }} />
                          : <Icon className="w-4 h-4" style={{ color: current ? 'var(--t-blue-deep)' : 'rgba(255,255,255,0.85)' }} />}
                      </div>
                      <span
                        className="mt-2 h-[22px] text-[9px] font-bold text-center leading-[11px] flex items-center justify-center"
                        style={{ color: current ? '#FFFFFF' : 'rgba(255,255,255,0.72)' }}
                      >
                        {step.label}
                      </span>
                      <span className="text-[8px] tabular-nums leading-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {step.date ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tracking + QR — second priority */}
          <div className="px-3 py-3 space-y-3" style={{ background: 'var(--t-surface)' }}>
            {/* Tracking numbers */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(45,107,204,0.06)', border: '1px solid rgba(45,107,204,0.2)' }}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5 min-w-0" style={{ color: 'var(--t-blue)' }}>
                  <Truck className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Tracking numbers</span>
                </p>
                <EditButton tone="blue" />
              </div>
              <div className="space-y-1.5">
                {detail.trackingNumbers.map((tn, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg" style={{ background: 'var(--t-surface)', border: '1px solid rgba(45,107,204,0.18)' }}>
                    <span className="font-mono text-[11px] font-semibold truncate" style={{ color: 'var(--t-blue-deep)' }}>{tn.value}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" style={{ color: 'var(--t-blue)' }}>{tn.courier}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Codes */}
            <div className="rounded-xl p-3" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5 mb-2.5" style={{ color: 'var(--t-muted)' }}>
                <QrCode className="w-3.5 h-3.5 shrink-0" /> Courier QR codes
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['InPost', 'Royal Mail'].map(label => (
                  <label key={label} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg cursor-pointer" style={{ background: 'var(--t-surface2)', border: '1px dashed var(--t-border)' }}>
                    <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                      <QrCode className="w-5 h-5" style={{ color: 'var(--t-subtle)' }} />
                    </div>
                    <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'var(--t-text)' }}>{label}</span>
                    <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: 'rgba(45,107,204,0.1)', color: 'var(--t-blue)' }}>
                      <Upload className="w-3 h-3 shrink-0" /> Upload
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* DEMOTED: secondary "Order details" group */}
          <div className="px-3 pb-3 pt-1 space-y-2" style={{ background: 'var(--t-surface2)', borderTop: '1px solid var(--t-border)' }}>
            <p className="pt-2.5 pb-0.5 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-subtle)' }}>Order details</p>

            {/* Items — compact summary */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] font-semibold flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--t-muted)' }}>
                  <Package className="w-3.5 h-3.5 shrink-0" /> {totalQty} items
                </p>
                <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: 'var(--t-text)' }}>{sym}{fmt(subtotal)}</span>
              </div>
              <div className="space-y-1">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="truncate" style={{ color: 'var(--t-subtle)' }}>{item.quantity}× {item.productName}</span>
                    <span className="tabular-nums shrink-0" style={{ color: 'var(--t-muted)' }}>{sym}{fmt(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address — compact */}
            <div className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-2" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1 mb-1 whitespace-nowrap" style={{ color: 'var(--t-subtle)' }}>
                  <MapPin className="w-3 h-3 shrink-0" /> Ship to
                </p>
                <p className="text-[10px] leading-snug break-words" style={{ color: 'var(--t-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--t-text)' }}>{detail.shippingName}</span>, {detail.shippingAddress}, {detail.shippingCity} {detail.shippingPostcode}
                </p>
              </div>
              <EditButton />
            </div>

            {/* Transaction ID — compact */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--t-subtle)' }}>
                  <CreditCard className="w-3 h-3 shrink-0" /> Transaction ID
                </p>
                <CopyButton value={detail.paymentTxHash} />
              </div>
              <p className="font-mono text-[10px] break-all leading-relaxed" style={{ color: 'var(--t-subtle)' }}>{detail.paymentTxHash}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
