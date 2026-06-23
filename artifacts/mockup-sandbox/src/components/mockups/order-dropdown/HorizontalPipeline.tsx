import React, { useState } from 'react';
import './_group.css';
import './HorizontalPipeline.css';
import {
  Package, MapPin, QrCode, Pencil, Upload, Copy, Check,
  FileText, CreditCard, Box, Truck, Home, Search, AlertCircle
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

const stages = [
  { key: 'submitted', label: 'Submitted', icon: FileText, date: '18 Jun' },
  { key: 'paid', label: 'Paid', icon: CreditCard, date: '18 Jun' },
  { key: 'packed', label: 'Packed', icon: Box, date: '19 Jun' },
  { key: 'shipped', label: 'Shipped', icon: Truck, date: '20 Jun' },
  { key: 'delivered', label: 'Delivered', icon: Home, date: null },
];

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded transition-colors hover:bg-black/5"
      style={{ color: 'var(--t-blue)' }}
    >
      {done ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export function HorizontalPipeline() {
  const currentStageIndex = 3;

  return (
    <div className="sp-order-scope sp-pipeline-layout">
      {/* HEADER BAND */}
      <header className="sp-pipeline-header">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--t-text)' }}>{order.code}</h1>
            <span className="text-[13px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--t-surface2)', color: 'var(--t-text)' }}>
              @{order.telegramUsername}
            </span>
          </div>
          <div className="text-[12px] font-medium flex items-center gap-4 mt-1" style={{ color: 'var(--t-subtle)' }}>
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Placed {order.createdAt}</span>
            <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> {order.paymentStatus} — {sym}{fmt(order.grandTotal)}</span>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Items Summary */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-muted)' }}>{totalQty} Items</span>
              <span className="text-[12px] font-bold">{sym}{fmt(subtotal)}</span>
            </div>
            <div className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--t-subtle)' }}>
              {lineItems.map(item => `${item.quantity}× ${item.productName}`).join(', ')}
            </div>
          </div>

          {/* Shipping Summary */}
          <div className="flex flex-col gap-1.5 min-w-[200px] pl-6 border-l" style={{ borderColor: 'var(--t-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-muted)' }}>Ship To</span>
              <button className="text-[11px] font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--t-blue)' }}>
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
            <div className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--t-subtle)' }}>
              <span className="font-semibold block" style={{ color: 'var(--t-text)' }}>{detail.shippingName}</span>
              {detail.shippingAddress}, {detail.shippingCity} {detail.shippingPostcode}
            </div>
          </div>
          
          {/* Txn Summary */}
          <div className="flex flex-col gap-1.5 min-w-[200px] pl-6 border-l" style={{ borderColor: 'var(--t-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-muted)' }}>Payment Tx</span>
            <div className="flex items-center gap-2">
              <div className="font-mono text-[10px] truncate max-w-[120px]" style={{ color: 'var(--t-subtle)' }}>
                {detail.paymentTxHash}
              </div>
              <CopyButton value={detail.paymentTxHash} />
            </div>
          </div>
        </div>
      </header>

      {/* PIPELINE BOARD */}
      <main className="sp-pipeline-board">
        {stages.map((stage, i) => {
          const isPast = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          const isFuture = i > currentStageIndex;

          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              className={`sp-pipeline-col ${isPast ? 'is-past' : ''} ${isCurrent ? 'is-current' : ''} ${isFuture ? 'is-future' : ''}`}
            >
              <div className="sp-pipeline-col-header">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-5 h-5 opacity-80" />
                  <span className="sp-pipeline-col-title">{stage.label}</span>
                </div>
                {isPast && (
                  <div className="sp-pipeline-check">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                {isCurrent && (
                  <div className="sp-pipeline-col-date text-white/90">
                    Active
                  </div>
                )}
                {!isCurrent && stage.date && (
                  <div className="sp-pipeline-col-date" style={{ color: 'var(--t-subtle)' }}>
                    {stage.date}
                  </div>
                )}
              </div>

              <div className="sp-pipeline-col-body">
                {isCurrent && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--t-muted)' }}>
                        Required Actions
                      </p>
                      
                      <div className="space-y-4">
                        {/* Tracking Input */}
                        <div className="rounded-lg p-3.5 border" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--t-text)' }}>
                              <Truck className="w-4 h-4 text-blue-600" /> Tracking Numbers
                            </span>
                            <button className="text-[11px] font-semibold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {detail.trackingNumbers.map((tn, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-gray-50 border border-gray-100">
                                <span className="font-mono text-[12px] font-medium">{tn.value}</span>
                                <div className="flex items-center gap-2">
                                  <CopyButton value={tn.value} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* QR Uploads */}
                        <div className="rounded-lg p-3.5 border" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--t-text)' }}>
                              <QrCode className="w-4 h-4 text-purple-600" /> Courier Labels
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {['InPost', 'Royal Mail'].map(label => (
                              <label key={label} className="flex flex-col items-center justify-center gap-2 py-4 rounded-md cursor-pointer hover:bg-gray-50 border border-dashed transition-colors" style={{ borderColor: 'var(--t-border)' }}>
                                <Upload className="w-5 h-5 text-gray-400" />
                                <div className="text-center">
                                  <span className="text-[11px] font-semibold block">{label}</span>
                                  <span className="text-[10px] text-gray-500">Upload QR</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--t-border)' }}>
                      <button className="w-full py-2.5 rounded-lg font-bold text-[13px] text-white transition-opacity hover:opacity-90" style={{ background: 'var(--t-blue)' }}>
                        Mark as Delivered
                      </button>
                    </div>
                  </div>
                )}

                {isPast && (
                  <div className="text-[12px] font-medium text-center py-8" style={{ color: 'var(--t-subtle)' }}>
                    Completed on {stage.date}
                  </div>
                )}

                {isFuture && (
                  <div className="text-[12px] font-medium text-center py-8" style={{ color: 'var(--t-subtle)' }}>
                    Awaiting {stage.label.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
