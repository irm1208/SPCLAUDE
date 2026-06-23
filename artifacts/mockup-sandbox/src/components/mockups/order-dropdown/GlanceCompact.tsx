import './_group.css';
import './GlanceCompact.css';
import { useState } from 'react';
import {
  Package, MapPin, QrCode, Pencil, Plus, Copy, Check,
  ChevronDown, ChevronUp, FileText, ExternalLink, QrCode as QrCodeIcon,
  Truck
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

const stages = ['Submitted', 'Paid', 'Packed', 'Shipped', 'Delivered'];
const currentStage = 3; // Shipped (index 3)

export function GlanceCompact() {
  const [expanded, setExpanded] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const copyTx = () => {
    navigator.clipboard?.writeText(detail.paymentTxHash);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  return (
    <div className="sp-order-scope min-h-screen p-6 md:p-12 flex flex-col items-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[1200px] mb-4">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--t-text)' }}>Order Triage</h2>
        <p className="text-sm" style={{ color: 'var(--t-subtle)' }}>High-density view for rapid processing.</p>
      </div>

      <div className="w-full max-w-[1200px] bg-white rounded-lg shadow-sm border glance-compact-root" style={{ borderColor: 'var(--t-border)' }}>
        
        {/* Main Compact Row */}
        <div className="p-4 glance-compact-row hover:bg-gray-50/50 transition-colors">
          
          {/* Col 1: Identity & Status */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--t-blue-deep)' }}>{order.code}</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{order.status}</span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--t-subtle)' }}>
              <span>@{order.telegramUsername}</span>
              <span>•</span>
              <span>{order.createdAt}</span>
            </div>
          </div>

          {/* Col 2: Progress & Fulfillment */}
          <div className="flex flex-col gap-1.5 border-l pl-4" style={{ borderColor: 'var(--t-border)' }}>
            <div className="flex justify-between items-center text-xs mb-0.5">
              <span className="font-semibold" style={{ color: 'var(--t-text)' }}>Fulfillment</span>
              <span style={{ color: 'var(--t-subtle)' }}>4 items • £{order.grandTotal.toFixed(2)}</span>
            </div>
            <div className="glance-progress-track">
              <div className="glance-progress-fill" style={{ width: `${(currentStage / (stages.length - 1)) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider mt-0.5" style={{ color: 'var(--t-muted)' }}>
              {stages.map((s, i) => (
                <span key={s} className={i <= currentStage ? 'text-blue-700' : 'opacity-40'}>{s}</span>
              ))}
            </div>
          </div>

          {/* Col 3: Logistics summary */}
          <div className="flex flex-col gap-1.5 border-l pl-4" style={{ borderColor: 'var(--t-border)' }}>
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--t-subtle)' }} />
              <span className="font-medium truncate" style={{ color: 'var(--t-text)' }}>{detail.shippingCity}, {detail.shippingPostcode}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Truck className="w-3.5 h-3.5" style={{ color: 'var(--t-subtle)' }} />
              {detail.trackingNumbers.map(t => (
                <span key={t.value} className="glance-tracking-pill">{t.value}</span>
              ))}
            </div>
          </div>

          {/* Col 4: Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button className="glance-btn glance-btn-primary">
              <QrCodeIcon className="w-3.5 h-3.5" /> InPost
            </button>
            <button className="glance-btn glance-btn-primary">
              <QrCodeIcon className="w-3.5 h-3.5" /> Royal Mail
            </button>
            <button className="glance-btn">
              <Plus className="w-3.5 h-3.5" /> Tracking
            </button>
          </div>

          {/* Col 5: Expand */}
          <div className="flex justify-end pl-2">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Expanded Drawer */}
        {expanded && (
          <div className="border-t bg-gray-50/30 p-4 px-6 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ borderColor: 'var(--t-border)' }}>
            
            {/* Items Detail */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--t-muted)' }}>Line Items</h4>
              <div className="space-y-1.5">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--t-text)' }}><span className="font-medium">{item.quantity}×</span> {item.productName}</span>
                    <span style={{ color: 'var(--t-subtle)' }}>£{item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address Detail */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--t-muted)' }}>Shipping Address</h4>
                <button className="text-[10px] font-bold uppercase text-blue-600 hover:underline flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </div>
              <div className="text-xs space-y-0.5" style={{ color: 'var(--t-subtle)' }}>
                <p className="font-medium text-gray-900">{detail.shippingName}</p>
                <p>{detail.shippingAddress}</p>
                <p>{detail.shippingCity} {detail.shippingPostcode}</p>
              </div>
            </div>

            {/* Transaction Detail */}
            <div>
               <h4 className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--t-muted)' }}>Payment ({order.paymentStatus})</h4>
               <div className="flex items-center gap-2">
                 <div className="font-mono text-[10px] bg-white border p-1.5 rounded text-gray-500 truncate flex-1" title={detail.paymentTxHash}>
                   {detail.paymentTxHash.substring(0, 16)}...{detail.paymentTxHash.substring(detail.paymentTxHash.length - 16)}
                 </div>
                 <button onClick={copyTx} className="glance-btn shrink-0 !py-1.5">
                   {copiedTx ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                 </button>
               </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
