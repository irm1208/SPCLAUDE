import './_group.css';
import { useState } from 'react';
import {
  Package, MapPin, QrCode, Pencil, Upload, ChevronUp, Copy, Check,
  FileText, CreditCard, Box, Truck, Home, Clock,
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
const progressPct = (currentStepIndex / (steps.length - 1)) * 100;

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap shrink-0"
      style={{ background: 'var(--t-surface2)', color: 'var(--t-subtle)', border: '1px solid var(--t-border)' }}
    >
      {done ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function EditButton({ tone = 'muted' }: { tone?: 'muted' | 'blue' }) {
  const blue = tone === 'blue';
  return (
    <button
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap shrink-0"
      style={
        blue
          ? { background: 'rgba(45,107,204,0.1)', color: 'var(--t-blue)', border: '1px solid rgba(45,107,204,0.25)' }
          : { background: 'var(--t-surface2)', color: 'var(--t-subtle)', border: '1px solid var(--t-border)' }
      }
    >
      <Pencil className="w-3 h-3 shrink-0" /> Edit
    </button>
  );
}

function SectionLabel({ children, tone = 'muted', icon: Icon }: { children: React.ReactNode; tone?: 'muted' | 'blue' | 'subtle'; icon?: React.ComponentType<{ className?: string }> }) {
  const color = tone === 'blue' ? 'var(--t-blue)' : tone === 'subtle' ? 'var(--t-subtle)' : 'var(--t-muted)';
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] flex items-center gap-1.5 whitespace-nowrap" style={{ color }}>
      {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" /> : null}
      {children}
    </p>
  );
}

export function TimelineElevated() {
  return (
    <div className="sp-order-scope min-h-screen p-4 flex justify-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[420px]">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', boxShadow: '0 10px 30px -12px rgba(27,58,122,0.18)' }}
        >
          {/* Collapsed summary row */}
          <div className="px-4 py-3 flex items-center gap-3 cursor-pointer">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold whitespace-nowrap" style={{ color: 'var(--t-muted)' }}>{order.code}</span>
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--t-text)' }}>@{order.telegramUsername}</span>
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>
                  <Check className="w-2.5 h-2.5 shrink-0" /> {order.paymentStatus}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold tabular-nums whitespace-nowrap" style={{ color: 'var(--t-text)' }}>{sym}{fmt(order.grandTotal)}</span>
                <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--t-subtle)' }}>{order.createdAt}</span>
              </div>
            </div>
            <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--t-muted)' }} />
          </div>

          {/* HERO: Elevated status */}
          <div className="px-5 pt-5 pb-6" style={{ background: 'var(--t-gradient)' }}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.6)' }}>Delivery status</p>
                <p className="text-[26px] font-extrabold leading-tight text-white mt-0.5">{order.status}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-white/80">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-medium whitespace-nowrap">Est. delivery <span className="font-bold text-white">21–22 Jun</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 mt-1" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <Truck className="w-3 h-3 text-white shrink-0" />
                <span className="text-[10px] font-bold text-white">In transit</span>
              </div>
            </div>

            {/* Slim continuous segmented progress bar */}
            <div className="flex items-center gap-1 mb-3">
              {steps.slice(0, -1).map((_, i) => {
                const filled = i < currentStepIndex;
                const active = i === currentStepIndex - 1;
                return (
                  <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: filled ? '100%' : '0%',
                        background: '#FFFFFF',
                        boxShadow: active ? '0 0 8px rgba(255,255,255,0.7)' : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Step labels with current node emphasized */}
            <div className="flex justify-between">
              {steps.map((step, i) => {
                const done = i < currentStepIndex;
                const current = i === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ width: `${100 / steps.length}%` }}>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={
                        current
                          ? { background: '#FFFFFF', boxShadow: '0 0 0 4px rgba(255,255,255,0.25)' }
                          : done
                            ? { background: 'rgba(255,255,255,0.9)' }
                            : { background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)' }
                      }
                    >
                      {done
                        ? <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--t-blue-deep)' }} />
                        : <Icon className="w-3 h-3 shrink-0" style={{ color: current ? 'var(--t-blue-deep)' : 'rgba(255,255,255,0.8)' }} />}
                    </div>
                    <span
                      className="text-[8px] font-bold text-center leading-none whitespace-nowrap"
                      style={{ color: current ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PRIMARY: Tracking + QR */}
          <div className="px-3 py-3 space-y-3" style={{ background: 'var(--t-surface)' }}>
            {/* Tracking numbers */}
            <div className="rounded-xl p-3.5" style={{ background: 'rgba(45,107,204,0.05)', border: '1px solid rgba(45,107,204,0.2)' }}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <SectionLabel tone="blue" icon={Truck}>Tracking numbers</SectionLabel>
                <EditButton tone="blue" />
              </div>
              <div className="space-y-1.5">
                {detail.trackingNumbers.map((tn, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--t-surface)', border: '1px solid rgba(45,107,204,0.18)' }}>
                    <span className="font-mono text-[11px] font-semibold truncate" style={{ color: 'var(--t-blue-deep)' }}>{tn.value}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md" style={{ background: 'rgba(45,107,204,0.1)', color: 'var(--t-blue)' }}>{tn.courier}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Codes */}
            <div className="rounded-xl p-3.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <SectionLabel tone="muted" icon={QrCode}>Courier QR codes</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                {['InPost', 'Royal Mail'].map(label => (
                  <label key={label} className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-lg cursor-pointer" style={{ background: 'var(--t-surface2)', border: '1px dashed var(--t-border)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                      <QrCode className="w-5 h-5" style={{ color: 'var(--t-subtle)' }} />
                    </div>
                    <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'var(--t-text)' }}>{label}</span>
                    <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: 'rgba(45,107,204,0.1)', color: 'var(--t-blue)' }}>
                      <Upload className="w-2.5 h-2.5 shrink-0" /> Upload
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECONDARY: Order details */}
          <div className="px-3 pb-3 pt-1 space-y-2" style={{ background: 'var(--t-surface2)' }}>
            <p className="pt-2 px-0.5 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--t-subtle)' }}>Order details</p>

            {/* Items */}
            <div className="rounded-xl px-3.5 py-3" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <SectionLabel tone="subtle" icon={Package}>{totalQty} items</SectionLabel>
                <span className="text-[11px] font-bold tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--t-text)' }}>{sym}{fmt(subtotal)}</span>
              </div>
              <div className="space-y-1">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="truncate" style={{ color: 'var(--t-subtle)' }}>{item.quantity}× {item.productName}</span>
                    <span className="tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--t-muted)' }}>{sym}{fmt(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            <div className="rounded-xl px-3.5 py-3 flex items-start justify-between gap-2" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="min-w-0">
                <SectionLabel tone="subtle" icon={MapPin}>Ship to</SectionLabel>
                <p className="text-[10px] leading-snug mt-1" style={{ color: 'var(--t-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--t-text)' }}>{detail.shippingName}</span>, {detail.shippingAddress}, {detail.shippingCity} {detail.shippingPostcode}
                </p>
              </div>
              <EditButton tone="muted" />
            </div>

            {/* Transaction ID */}
            <div className="rounded-xl px-3.5 py-3" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <SectionLabel tone="subtle" icon={CreditCard}>Transaction ID</SectionLabel>
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
