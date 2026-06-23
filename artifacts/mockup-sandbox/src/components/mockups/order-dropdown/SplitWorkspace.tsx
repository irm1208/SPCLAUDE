import { useState } from 'react';
import './_group.css';
import './SplitWorkspace.css';
import {
  Package, MapPin, QrCode, Pencil, Upload, Copy, Check,
  FileText, CreditCard, Box, Truck, Home, Plus, ChevronRight, Hash, Hash as TxIcon
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

type Facet = 'status' | 'tracking' | 'qr' | 'items' | 'address' | 'tx';

export function SplitWorkspace() {
  const [activeFacet, setActiveFacet] = useState<Facet>('status');

  const navItems = [
    { id: 'status', label: 'Status & Timeline', icon: Box },
    { id: 'tracking', label: 'Tracking Numbers', icon: Truck },
    { id: 'qr', label: 'Courier QR Codes', icon: QrCode },
    { id: 'items', label: 'Order Items', icon: Package },
    { id: 'address', label: 'Delivery Address', icon: MapPin },
    { id: 'tx', label: 'Transaction ID', icon: TxIcon },
  ];

  return (
    <div className="sp-order-scope min-h-screen p-6 flex justify-center items-center" style={{ background: 'var(--t-bg)' }}>
      <div className="w-full max-w-[1000px] split-workspace-container">
        
        {/* LEFT RAIL */}
        <div className="w-[320px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--t-border)', background: '#FAFAFA' }}>
          
          {/* Header */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--t-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[14px] font-bold" style={{ color: 'var(--t-muted)' }}>{order.code}</span>
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>
                <Check className="w-3 h-3" /> {order.paymentStatus}
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-[18px] font-bold text-gray-900 truncate block">@{order.telegramUsername}</span>
            </div>
            
            <div className="flex flex-col gap-1 mt-3">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-gray-500">Order Total</span>
                <span className="font-bold text-gray-900">{sym}{fmt(order.grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-700">{order.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-2">Order Details</div>
            {navItems.map(item => {
              const active = activeFacet === item.id;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`sw-nav-item ${active ? 'sw-nav-item-active' : ''}`}
                  onClick={() => setActiveFacet(item.id as Facet)}
                >
                  <Icon className="w-5 h-5 opacity-70" />
                  <span className="font-medium text-[14px] flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 opacity-50" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE (DETAIL) */}
        <div className="flex-1 bg-white flex flex-col relative">
          
          <div className="absolute top-0 left-0 right-0 h-[120px] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)', zIndex: 1 }} />
          
          <div className="flex-1 overflow-y-auto p-10 z-10">
            {activeFacet === 'status' && <StatusFacet />}
            {activeFacet === 'tracking' && <TrackingFacet />}
            {activeFacet === 'qr' && <QRFacet />}
            {activeFacet === 'items' && <ItemsFacet />}
            {activeFacet === 'address' && <AddressFacet />}
            {activeFacet === 'tx' && <TransactionFacet />}
          </div>

        </div>

      </div>
    </div>
  );
}

// ==========================================
// FACETS
// ==========================================

function StatusFacet() {
  return (
    <div className="max-w-[480px]">
      <h2 className="text-[24px] font-black tracking-tight text-gray-900 mb-2">Status & Timeline</h2>
      <p className="text-[14px] text-gray-500 mb-8">Current order state and fulfilment progress.</p>
      
      <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 mb-10 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-blue-600/70 mb-1">Current Status</p>
          <p className="text-[20px] font-bold text-blue-900">{order.status}</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Truck className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      <div className="pl-2">
        {steps.map((step, i) => {
          const done = i < currentStepIndex;
          const current = i === currentStepIndex;
          const future = i > currentStepIndex;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="relative flex gap-6 pb-8">
              {!isLast && (
                <div className="sw-timeline-line">
                  {(done || current) && <div className="sw-timeline-line-filled" style={{ height: current ? '50%' : '100%' }} />}
                </div>
              )}
              
              <div
                className="sw-timeline-node mt-1"
                style={
                  current
                    ? { background: 'white', border: '3px solid var(--t-blue)' }
                    : done
                      ? { background: 'var(--t-blue)', border: 'none' }
                      : { background: 'white', border: '2px solid var(--t-border)' }
                }
              >
                {done && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[15px] ${current ? 'font-bold text-blue-900' : done ? 'font-semibold text-gray-800' : 'font-medium text-gray-400'}`}>
                    {step.label}
                  </span>
                  {step.date && (
                    <span className={`text-[13px] ${current ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                      {step.date}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrackingFacet() {
  return (
    <div className="max-w-[480px]">
      <h2 className="text-[24px] font-black tracking-tight text-gray-900 mb-2">Tracking Numbers</h2>
      <p className="text-[14px] text-gray-500 mb-8">Manage active shipments associated with this order.</p>

      <div className="space-y-4 mb-6">
        {detail.trackingNumbers.map((tn, i) => (
          <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                <Hash className="w-5 h-5 text-gray-400" />
              </div>
              <span className="font-mono text-[16px] font-semibold text-gray-900">{tn.value}</span>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-500">
                <Copy className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-500">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-all">
        <Plus className="w-5 h-5" />
        Add Tracking Number
      </button>
    </div>
  );
}

function QRFacet() {
  return (
    <div className="max-w-[560px]">
      <h2 className="text-[24px] font-black tracking-tight text-gray-900 mb-2">Courier QR Codes</h2>
      <p className="text-[14px] text-gray-500 mb-8">Upload shipping labels for quick warehouse access.</p>

      <div className="grid grid-cols-2 gap-6">
        {['InPost', 'Royal Mail'].map(label => (
          <div key={label} className="flex flex-col group cursor-pointer">
            <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 group-hover:bg-blue-50/50 group-hover:border-blue-200 transition-all mb-3 relative overflow-hidden">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                <QrCode className="w-8 h-8 text-gray-400 group-hover:text-blue-500" />
              </div>
              <span className="text-[13px] font-semibold text-gray-500 group-hover:text-blue-600">Click to upload image</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-gray-900">{label}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Required</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemsFacet() {
  return (
    <div className="max-w-[560px]">
      <h2 className="text-[24px] font-black tracking-tight text-gray-900 mb-2">Order Items</h2>
      <p className="text-[14px] text-gray-500 mb-8">Review requested inventory and subtotal.</p>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-5 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider w-20 text-center">Qty</th>
              <th className="px-5 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider w-24 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{item.productName}</div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-semibold rounded-md w-7 h-7 text-[13px]">{item.quantity}</span>
                </td>
                <td className="px-5 py-4 text-right font-medium text-gray-900 tabular-nums">
                  {sym}{fmt(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td className="px-5 py-4 font-semibold text-gray-600">Subtotal</td>
              <td className="px-5 py-4 text-center font-bold text-gray-900">{totalQty}</td>
              <td className="px-5 py-4 text-right font-bold text-gray-900 tabular-nums">{sym}{fmt(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function AddressFacet() {
  return (
    <div className="max-w-[480px]">
      <h2 className="text-[24px] font-black tracking-tight text-gray-900 mb-2">Delivery Address</h2>
      <p className="text-[14px] text-gray-500 mb-8">Where this order should be shipped.</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative group">
        <button className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-semibold text-[13px] border border-gray-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-5">
          <MapPin className="w-6 h-6" />
        </div>
        
        <div className="space-y-1">
          <p className="text-[18px] font-bold text-gray-900">{detail.shippingName}</p>
          <p className="text-[16px] text-gray-600">{detail.shippingAddress}</p>
          <p className="text-[16px] text-gray-600">{detail.shippingCity}</p>
          <p className="text-[16px] font-medium text-gray-900 mt-1">{detail.shippingPostcode}</p>
        </div>
      </div>
    </div>
  );
}

function TransactionFacet() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="max-w-[480px]">
      <h2 className="text-[24px] font-black tracking-tight text-gray-900 mb-2">Transaction Details</h2>
      <p className="text-[14px] text-gray-500 mb-8">Payment verification reference.</p>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-500">Payment Status</p>
              <p className="text-[16px] font-bold text-gray-900">{order.paymentStatus}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50/50">
          <p className="text-[13px] font-semibold text-gray-500 mb-2">Transaction Hash</p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3 items-start relative shadow-sm">
            <p className="font-mono text-[13px] text-gray-700 break-all leading-relaxed pr-10">
              {detail.paymentTxHash}
            </p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(detail.paymentTxHash);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 border border-gray-200 hover:bg-white hover:text-blue-600 transition-all"
              title="Copy hash"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
