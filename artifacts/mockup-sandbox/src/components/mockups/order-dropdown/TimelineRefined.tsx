import './_group.css';
import './TimelineRefined.css';
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
    { value: 'AB123456789GB' },
    { value: 'JD0002284410GB' },
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
      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors"
      style={{ background: 'var(--t-surface2)', color: 'var(--t-subtle)', border: '1px solid var(--t-border)' }}
    >
      {done ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function EditButton({ tone = 'muted' }: { tone?: 'muted' | 'blue' }) {
  const blue = tone === 'blue';
  return (
    <button
      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors"
      style={
        blue
          ? { background: 'rgba(45,107,204,0.06)', color: 'var(--t-blue)', border: '1px solid rgba(45,107,204,0.2)' }
          : { background: 'var(--t-surface2)', color: 'var(--t-subtle)', border: '1px solid var(--t-border)' }
      }
    >
      <Pencil className="w-3.5 h-3.5 shrink-0" /> Edit
    </button>
  );
}

function SectionLabel({ children, tone = 'muted', icon: Icon }: { children: React.ReactNode; tone?: 'muted' | 'blue' | 'subtle'; icon?: React.ComponentType<{ className?: string }> }) {
  const color = tone === 'blue' ? 'var(--t-blue)' : tone === 'subtle' ? 'var(--t-subtle)' : 'var(--t-muted)';
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] flex items-center gap-2 whitespace-nowrap" style={{ color }}>
      {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
      {children}
    </p>
  );
}

export function TimelineRefined() {
  return (
    <div className="sp-order-scope min-h-screen p-4 flex justify-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[420px]">
        <div
          className="rounded-[20px] overflow-hidden timeline-refined-card"
          style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
        >
          {/* Collapsed summary row */}
          <div className="px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-black/5 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-mono text-[13px] font-bold whitespace-nowrap" style={{ color: 'var(--t-muted)' }}>{order.code}</span>
                <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--t-text)' }}>@{order.telegramUsername}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md whitespace-nowrap shrink-0" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>
                  <Check className="w-3 h-3 shrink-0" /> {order.paymentStatus}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-[15px] font-bold tabular-nums whitespace-nowrap" style={{ color: 'var(--t-text)' }}>{sym}{fmt(order.grandTotal)}</span>
                <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--t-subtle)' }}>{order.createdAt}</span>
              </div>
            </div>
            <ChevronUp className="w-5 h-5 shrink-0" style={{ color: 'var(--t-muted)' }} />
          </div>

          {/* HERO: Elevated status */}
          <div className="px-5 pt-6 pb-7 timeline-refined-hero">
            <div className="flex items-start justify-between gap-3 mb-8">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Order Status</p>
                <p className="text-[30px] font-black tracking-tight leading-none text-white drop-shadow-sm">{order.status}</p>
                <div className="mt-2.5 text-white/80">
                  <span className="text-[12px] font-medium whitespace-nowrap">Placed <span className="font-semibold text-white">{order.createdAt}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 mt-1 shadow-sm" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Truck className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="text-[11px] font-bold text-white">In transit</span>
              </div>
            </div>

            {/* Refined continuous segmented progress bar */}
            <div className="relative mb-4">
              <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full timeline-refined-stepper-track">
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-full timeline-refined-stepper-fill transition-all duration-700 ease-in-out"
                  style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />
              </div>

              {/* Step nodes */}
              <div className="relative flex justify-between">
                {steps.map((step, i) => {
                  const done = i < currentStepIndex;
                  const current = i === currentStepIndex;
                  const future = i > currentStepIndex;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-[14px] h-[14px] rounded-full flex items-center justify-center shrink-0 z-10 ${current ? 'timeline-refined-node-current' : ''}`}
                        style={
                          current
                            ? { background: '#FFFFFF' }
                            : done
                              ? { background: '#FFFFFF' }
                              : { background: 'var(--brand-blue)', border: '2px solid rgba(255,255,255,0.3)' }
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Step labels positioned below nodes */}
            <div className="flex justify-between px-0.5">
              {steps.map((step, i) => {
                const current = i === currentStepIndex;
                const future = i > currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1" style={{ width: `${100 / steps.length}%` }}>
                    <span
                      className={`text-[9px] font-bold text-center leading-tight ${current ? '' : 'tracking-wide'}`}
                      style={{ color: current ? '#FFFFFF' : future ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)' }}
                    >
                      {step.label}
                    </span>
                    {step.date && (
                      <span className="text-[8px] font-medium" style={{ color: current ? 'rgba(255,255,255,0.8)' : future ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)' }}>
                        {step.date}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PRIMARY: Tracking + QR */}
          <div className="p-4 space-y-4" style={{ background: 'var(--t-surface)' }}>
            {/* Tracking numbers */}
            <div className="rounded-[14px] p-4 timeline-refined-surface" style={{ border: '1px solid rgba(45,107,204,0.15)', boxShadow: '0 2px 8px -2px rgba(45,107,204,0.05)' }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <SectionLabel tone="blue" icon={Truck}>Tracking numbers</SectionLabel>
                <EditButton tone="blue" />
              </div>
              <div className="space-y-2">
                {detail.trackingNumbers.map((tn, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px]" style={{ background: '#FFFFFF', border: '1px solid rgba(45,107,204,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <span className="font-mono text-[13px] font-semibold tracking-tight" style={{ color: 'var(--t-text)' }}>{tn.value}</span>
                    <Copy className="w-3.5 h-3.5 text-blue-600/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* QR Codes */}
            <div className="rounded-[14px] p-4" style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
              <SectionLabel tone="muted" icon={QrCode}>Courier QR codes</SectionLabel>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {['InPost', 'Royal Mail'].map(label => (
                  <label key={label} className="flex flex-col items-center justify-center gap-2 py-4 rounded-[10px] cursor-pointer hover:bg-white transition-colors" style={{ background: '#FFFFFF', border: '1px dashed var(--t-border)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
                      <QrCode className="w-6 h-6" style={{ color: 'var(--t-subtle)' }} />
                    </div>
                    <span className="text-[12px] font-bold" style={{ color: 'var(--t-text)' }}>{label}</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap mt-0.5" style={{ background: 'rgba(45,107,204,0.08)', color: 'var(--t-blue)' }}>
                      <Upload className="w-3 h-3 shrink-0" /> Upload
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--t-border) 20%, var(--t-border) 80%, transparent)' }} />

          {/* SECONDARY: Order details */}
          <div className="p-4 space-y-3" style={{ background: 'var(--t-surface)' }}>
            <p className="px-1 mb-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--t-subtle)' }}>Order details</p>

            {/* Items */}
            <div className="rounded-[12px] px-4 py-3.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <SectionLabel tone="subtle" icon={Package}>{totalQty} items</SectionLabel>
                <span className="text-[13px] font-bold tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--t-text)' }}>{sym}{fmt(subtotal)}</span>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate font-medium" style={{ color: 'var(--t-subtle)' }}>
                      <span className="font-semibold" style={{ color: 'var(--t-muted)' }}>{item.quantity}×</span> {item.productName}
                    </span>
                    <span className="tabular-nums whitespace-nowrap shrink-0 font-medium" style={{ color: 'var(--t-muted)' }}>{sym}{fmt(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            <div className="rounded-[12px] px-4 py-3.5 flex items-start justify-between gap-3" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="min-w-0 mt-0.5">
                <SectionLabel tone="subtle" icon={MapPin}>Ship to</SectionLabel>
                <p className="text-[12px] leading-relaxed mt-2" style={{ color: 'var(--t-subtle)' }}>
                  <span className="font-semibold block mb-0.5" style={{ color: 'var(--t-text)' }}>{detail.shippingName}</span>
                  {detail.shippingAddress}, {detail.shippingCity} {detail.shippingPostcode}
                </p>
              </div>
              <EditButton tone="muted" />
            </div>

            {/* Transaction ID */}
            <div className="rounded-[12px] px-4 py-3.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <SectionLabel tone="subtle" icon={CreditCard}>Transaction ID</SectionLabel>
                <CopyButton value={detail.paymentTxHash} />
              </div>
              <p className="font-mono text-[11px] break-all leading-relaxed bg-gray-50 p-2 rounded-md border border-gray-100 mt-1" style={{ color: 'var(--t-subtle)' }}>{detail.paymentTxHash}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
