import './_group.css';
import './ActionConsole.css';
import { useState } from 'react';
import {
  Check, QrCode, Truck, MapPin, Copy, ExternalLink,
  ChevronRight, ArrowRight, Package, Receipt, Info,
  CircleDashed, Play, MoreHorizontal
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

const stages = [
  { label: 'Submitted', date: '18 Jun', done: true },
  { label: 'Paid', date: '18 Jun', done: true },
  { label: 'Packed', date: '19 Jun', done: true },
  { label: 'Shipped', date: '20 Jun', done: true },
  { label: 'Delivered', date: null, done: false },
];

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-subtle)] hover:text-[var(--t-text)] hover:border-[var(--t-subtle)] transition-colors active:scale-95"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label || 'Copy'}
    </button>
  );
}

export function ActionConsole() {
  const [tasks, setTasks] = useState([
    { id: 'address', title: 'Confirm delivery address', done: true, type: 'address' },
    { id: 'qr-inpost', title: 'Upload InPost QR label', done: false, type: 'upload' },
    { id: 'qr-rm', title: 'Upload Royal Mail QR label', done: false, type: 'upload' },
    { id: 'tracking', title: 'Add tracking numbers', done: true, type: 'tracking' },
  ]);

  const completedCount = tasks.filter(t => t.done).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  const toggleTask = (id: string) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  return (
    <div className="sp-order-scope min-h-screen w-full p-8 flex items-center justify-center bg-[#ECECF1]">
      <div className="w-full max-w-[1200px] flex flex-col md:flex-row bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E5E7EB] overflow-hidden">
        
        {/* PRIMARY COLUMN: ACTION QUEUE */}
        <div className="flex-1 flex flex-col border-r border-[#E5E7EB]">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Order {order.code}</h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide uppercase">Action Required</span>
            </div>
            <p className="text-[#6B7280] text-sm">Reshipper task queue for {order.telegramUsername}</p>
            
            {/* Fulfilment Progress */}
            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-gray-100 flex items-center justify-center relative shrink-0">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="24" cy="24" r="22"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="4"
                    strokeDasharray="138"
                    strokeDashoffset={138 - (138 * progressPercent) / 100}
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <span className="text-sm font-bold text-[#111827]">{completedCount}/{tasks.length}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111827] mb-1">Fulfilment Progress</p>
                <p className="text-xs text-[#6B7280]">{progressPercent === 100 ? 'All tasks complete. Ready for dispatch.' : 'Complete the pending tasks to fulfill this order.'}</p>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB]">
            {pendingTasks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] px-4 mb-3">Pending Actions</h3>
                <div className="space-y-2">
                  {pendingTasks.map(task => (
                    <div key={task.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm hover:border-blue-200 transition-colors flex items-start gap-4">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className="w-6 h-6 rounded-full border-2 border-[#D1D5DB] flex items-center justify-center hover:border-blue-500 shrink-0 mt-0.5"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 transition-opacity" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-semibold text-[#111827] mb-1">{task.title}</h4>
                        {task.type === 'upload' && (
                          <div className="mt-3">
                            <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors">
                              <QrCode className="w-4 h-4" /> Choose file...
                            </button>
                          </div>
                        )}
                        {task.type === 'address' && (
                          <div className="mt-2 text-sm text-[#4B5563] bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="font-medium text-gray-900">{detail.shippingName}</p>
                            <p>{detail.shippingAddress}</p>
                            <p>{detail.shippingCity} {detail.shippingPostcode}</p>
                            <button className="mt-2 text-blue-600 font-medium text-xs hover:underline">Edit address</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doneTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] px-4 mb-3">Completed Actions</h3>
                <div className="space-y-2">
                  {doneTasks.map(task => (
                    <div key={task.id} className="bg-transparent border border-transparent hover:border-gray-200 rounded-xl p-3 flex items-start gap-4 opacity-75 grayscale-[0.5] transition-all">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5 hover:bg-green-600 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-medium text-gray-700 line-through">{task.title}</h4>
                        
                        {task.type === 'tracking' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {detail.trackingNumbers.map(tn => (
                              <div key={tn} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600">
                                {tn} <CopyBtn value={tn} label="" />
                              </div>
                            ))}
                          </div>
                        )}
                        {task.type === 'address' && (
                          <div className="mt-1 text-sm text-gray-500 truncate">
                            Confirmed: {detail.shippingAddress}, {detail.shippingCity}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECONDARY COLUMN: CONTEXT & STATUS */}
        <div className="w-full md:w-[380px] flex flex-col bg-[#FFFFFF]">
          {/* Status Bar */}
          <div className="p-6 border-b border-[#F3F4F6] bg-gray-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-3">Order Status</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-[#111827]">{order.status}</span>
              <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded flex items-center gap-1">
                <Check className="w-3 h-3" /> Paid
              </span>
            </div>
            
            {/* Condensed Stages */}
            <div className="flex justify-between relative mt-6">
              <div className="absolute top-[7px] left-0 right-0 h-0.5 bg-gray-200" />
              <div className="absolute top-[7px] left-0 h-0.5 bg-blue-500" style={{ width: '75%' }} />
              {stages.map((stage, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center group">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 transition-colors ${stage.done ? 'bg-blue-500 text-white' : 'bg-gray-200 border-2 border-white'}`}>
                    {stage.done && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-[9px] font-medium text-gray-500 absolute -bottom-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Order Items */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-3 flex items-center gap-2">
                <Package className="w-3.5 h-3.5" /> Items
              </h3>
              <div className="space-y-3">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-start text-sm">
                    <div className="flex gap-2">
                      <span className="font-semibold text-gray-900">{item.quantity}×</span>
                      <span className="text-gray-700">{item.productName}</span>
                    </div>
                    <span className="text-gray-500 tabular-nums">£{item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center font-bold text-gray-900">
                  <span>Total</span>
                  <span>£{order.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Destination
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed">
                <span className="font-medium text-gray-900 block">{detail.shippingName}</span>
                {detail.shippingAddress}<br />
                {detail.shippingCity} {detail.shippingPostcode}
              </div>
            </div>

            {/* Payment Tx */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-3 flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5" /> Transaction
              </h3>
              <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2 border border-gray-100">
                <div className="flex-1 font-mono text-[10px] text-gray-500 truncate">
                  {detail.paymentTxHash}
                </div>
                <CopyBtn value={detail.paymentTxHash} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
