import React from 'react';
import { ArrowLeft, Download, Edit, RefreshCw, X } from 'lucide-react';

export function EnterpriseConsole() {
  return (
    <div 
      className="min-h-[100dvh] w-full bg-[#e8ecef] text-[#1a1d21] flex flex-col relative"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .hairline-b { border-bottom: 1px solid #cdd3d8; }
        .hairline-t { border-top: 1px solid #cdd3d8; }
        .hairline-r { border-right: 1px solid #cdd3d8; }
        .hairline-l { border-left: 1px solid #cdd3d8; }
        .hairline { border: 1px solid #cdd3d8; }
        
        .btn-console {
          transition: all 0.15s ease;
        }
        .btn-console:hover {
          background-color: #d1d7dc;
        }
        .btn-console-primary {
          background-color: #1a1d21;
          color: #ffffff;
        }
        .btn-console-primary:hover {
          background-color: #2f343a;
        }
      `}} />

      {/* Top Bar */}
      <header className="h-12 hairline-b bg-white flex items-center px-4 shrink-0 sticky top-0 z-10">
        <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#555f68] hover:text-[#1a1d21] transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Back to Orders
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 gap-4 max-w-[600px] mx-auto w-full">
        
        {/* Record Header */}
        <div className="bg-white hairline shadow-sm">
          <div className="p-4 flex justify-between items-start hairline-b">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555f68] mb-1">Order Record</div>
              <h1 className="text-2xl font-semibold mono tracking-tight">SP-7K42</h1>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-2 py-0.5 bg-[#dcfce7] text-[#0f766e] border border-[#a7f3d0] text-xs font-bold uppercase tracking-wider mb-1">
                Paid
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-[#555f68]">
                2 Jul 2026
              </div>
            </div>
          </div>

          {/* Highlights Strip */}
          <div className="flex text-sm">
            <div className="flex-1 p-3 hairline-r flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555f68] mb-1">Status</span>
              <span className="font-semibold text-[#0369a1]">Shipped</span>
            </div>
            <div className="flex-1 p-3 hairline-r flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555f68] mb-1">Tracking</span>
              <span className="font-semibold mono">•••• •••• 7741</span>
            </div>
            <div className="flex-1 p-3 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555f68] mb-1">Total</span>
              <span className="font-semibold mono">$228.00</span>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white hairline p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555f68] mb-4">Fulfilment Progress</div>
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#e8ecef] -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 w-[75%] h-[2px] bg-[#1a1d21] -translate-y-1/2 z-0 transition-all duration-500"></div>
            
            <div className="relative z-10 flex justify-between">
              {['Ordered', 'Paid', 'Packed', 'Shipped', 'Delivered'].map((step, idx) => (
                <div key={step} className="flex flex-col items-center gap-2">
                  <div className={`w-3 h-3 rounded-full border-2 ${idx <= 3 ? 'bg-[#1a1d21] border-[#1a1d21]' : 'bg-white border-[#cdd3d8]'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${idx <= 3 ? 'text-[#1a1d21]' : 'text-[#8895a1]'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white hairline shadow-sm">
            <div className="px-3 py-2 hairline-b bg-[#f8fafc]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555f68]">Payment</div>
            </div>
            <div className="p-3 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-[#555f68]">Method</span>
                <span className="font-semibold">Crypto (USDT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#555f68]">Network Status</span>
                <span className="font-semibold text-[#0f766e]">Confirmed</span>
              </div>
            </div>
          </div>

          <div className="bg-white hairline shadow-sm">
            <div className="px-3 py-2 hairline-b bg-[#f8fafc]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555f68]">Delivery</div>
            </div>
            <div className="p-3 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-[#555f68]">Courier</span>
                <span className="font-semibold">Express (DHL)</span>
              </div>
              <div className="mt-3 text-[#1a1d21] leading-snug">
                <div className="font-semibold">A. Rivera</div>
                <div>148 Harbour Lane</div>
                <div>Bristol BS1 4RN</div>
                <div>United Kingdom</div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white hairline shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 hairline-b bg-[#f8fafc]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555f68]">Order Manifest</div>
          </div>
          
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="hairline-b text-[#555f68]">
                <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider w-[50%]">Item</th>
                <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-right">Qty</th>
                <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-right">Ext</th>
              </tr>
            </thead>
            <tbody className="mono text-[13px]">
              <tr className="hairline-b hover:bg-[#f8fafc]">
                <td className="py-2.5 px-3">BPC-157 <span className="text-[#8895a1] ml-1">5mg</span></td>
                <td className="py-2.5 px-3 text-right">2</td>
                <td className="py-2.5 px-3 text-right">$70.00</td>
              </tr>
              <tr className="hairline-b hover:bg-[#f8fafc]">
                <td className="py-2.5 px-3">TB-500 <span className="text-[#8895a1] ml-1">5mg</span></td>
                <td className="py-2.5 px-3 text-right">1</td>
                <td className="py-2.5 px-3 text-right">$42.00</td>
              </tr>
              <tr className="hairline-b hover:bg-[#f8fafc]">
                <td className="py-2.5 px-3">Semaglutide <span className="text-[#8895a1] ml-1">5mg</span></td>
                <td className="py-2.5 px-3 text-right">1</td>
                <td className="py-2.5 px-3 text-right">$58.00</td>
              </tr>
              <tr className="hairline-b hover:bg-[#f8fafc]">
                <td className="py-2.5 px-3">GHK-Cu <span className="text-[#8895a1] ml-1">50mg</span></td>
                <td className="py-2.5 px-3 text-right">1</td>
                <td className="py-2.5 px-3 text-right">$30.00</td>
              </tr>
            </tbody>
          </table>

          {/* Ledger Totals */}
          <div className="bg-[#f8fafc] p-3 text-sm mono w-full self-end ml-auto">
            <div className="flex justify-between py-1 text-[#555f68]">
              <span>Products</span>
              <span>$200.00</span>
            </div>
            <div className="flex justify-between py-1 text-[#555f68]">
              <span>Shipping</span>
              <span>$18.00</span>
            </div>
            <div className="flex justify-between py-1 text-[#555f68]">
              <span>Tip</span>
              <span>$10.00</span>
            </div>
            <div className="flex justify-between py-2 mt-1 hairline-t font-semibold text-[15px] text-[#1a1d21]">
              <span>Grand Total</span>
              <span>$228.00</span>
            </div>
            <div className="flex justify-between py-1 mt-1 font-bold text-[#0f766e]">
              <span>Amount Due</span>
              <span>$0.00</span>
            </div>
          </div>
        </div>

        {/* Console Actions */}
        <div className="bg-white hairline shadow-sm mt-2 mb-8">
           <div className="px-3 py-2 hairline-b bg-[#f8fafc]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555f68]">Actions</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-[#cdd3d8] md:divide-x border-b border-[#cdd3d8]">
            <button className="btn-console flex flex-col items-center justify-center gap-2 p-4 text-[#1a1d21]">
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Save PDF</span>
            </button>
            <button className="btn-console flex flex-col items-center justify-center gap-2 p-4 text-[#1a1d21]">
              <Edit className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Edit Order</span>
            </button>
            <button className="btn-console-primary flex flex-col items-center justify-center gap-2 p-4 col-span-2 md:col-span-1">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Reorder</span>
            </button>
            <button className="btn-console flex flex-col items-center justify-center gap-2 p-4 text-[#dc2626] col-span-2 md:col-span-1">
              <X className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Cancel</span>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
