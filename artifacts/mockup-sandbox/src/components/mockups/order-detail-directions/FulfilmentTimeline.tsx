import React from "react";
import { ArrowLeft, Check, Package, Truck, MapPin, Receipt, ExternalLink, Download, Edit3, RotateCcw, XCircle } from "lucide-react";

export function FulfilmentTimeline() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-[#ff4f00] selection:text-white pb-24">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
        .timeline-line {
          position: absolute;
          left: 23px;
          top: 48px;
          bottom: -24px;
          width: 2px;
          background: #222;
          z-index: 0;
        }
        .timeline-line-active {
          position: absolute;
          left: 23px;
          top: 48px;
          bottom: -24px;
          width: 2px;
          background: #ff4f00;
          z-index: 1;
        }
        .timeline-line-glow {
          position: absolute;
          left: 23px;
          top: 48px;
          height: 100%;
          width: 2px;
          background: #ff4f00;
          box-shadow: 0 0 12px 2px rgba(255, 79, 0, 0.5);
          z-index: 1;
        }
      `}} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#222] px-4 py-4 flex items-center justify-between">
        <button className="flex items-center gap-2 text-sm font-medium text-[#888] hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span>Orders</span>
        </button>
        <div className="font-mono text-xs font-bold text-[#ff4f00] tracking-wider">SP-7K42</div>
      </header>

      {/* Hero context */}
      <div className="px-6 pt-10 pb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">In Transit</h1>
        <p className="text-[#888] font-mono text-sm">Placed 2 Jul 2026</p>
      </div>

      {/* Timeline */}
      <div className="px-4 relative">
        
        {/* Step 1: Placed */}
        <div className="relative mb-12">
          <div className="timeline-line-active"></div>
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#ff4f00] text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,79,0,0.3)]">
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div className="pt-2 w-full">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-lg text-white">Order Placed</h3>
                <span className="font-mono text-xs text-[#ff4f00]">2 Jul</span>
              </div>
              <div className="mt-3 bg-[#111] border border-[#222] rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[#888]">Order Code</span>
                  <span className="font-mono font-medium">SP-7K42</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-[#888]">Amount Due</span>
                  <span className="font-mono font-medium">$0.00</span>
                </div>
                <div className="h-px w-full bg-[#222] my-3"></div>
                <button className="w-full py-2 flex justify-between items-center group">
                  <span className="text-sm font-medium text-white group-hover:text-[#ff4f00] transition-colors">Save Receipt PDF</span>
                  <Download size={16} className="text-[#666] group-hover:text-[#ff4f00] transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Paid */}
        <div className="relative mb-12">
          <div className="timeline-line-active"></div>
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#ff4f00] text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,79,0,0.3)]">
              <Check size={20} strokeWidth={3} />
            </div>
            <div className="pt-2 w-full">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-lg text-white">Payment Confirmed</h3>
                <span className="font-mono text-xs text-[#ff4f00]">2 Jul</span>
              </div>
              <div className="mt-3 flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg p-4">
                <div className="w-8 h-8 rounded bg-[#1a1a1a] flex items-center justify-center font-mono text-xs font-bold text-[#22c55e]">USDT</div>
                <div>
                  <div className="text-sm font-medium">Crypto Payment</div>
                  <div className="text-xs font-mono text-[#888]">Network confirmed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Packed */}
        <div className="relative mb-12">
          <div className="timeline-line-active" style={{bottom: '-24px', background: 'linear-gradient(to bottom, #ff4f00 50%, #222 50%)', backgroundSize: '100% 200%'}}></div>
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#ff4f00] text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,79,0,0.3)]">
              <Package size={20} strokeWidth={2.5} />
            </div>
            <div className="pt-2 w-full">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-lg text-white">Order Packed</h3>
                <span className="font-mono text-xs text-[#ff4f00]">Done</span>
              </div>
              
              {/* Complex Sub-panel */}
              <div className="mt-3 bg-[#111] border border-[#222] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#222]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#666] mb-3">Manifest</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">BPC-157</div>
                        <div className="font-mono text-xs text-[#888]">5mg &times; 2</div>
                      </div>
                      <div className="font-mono text-sm">$70.00</div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">TB-500</div>
                        <div className="font-mono text-xs text-[#888]">5mg &times; 1</div>
                      </div>
                      <div className="font-mono text-sm">$42.00</div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">Semaglutide</div>
                        <div className="font-mono text-xs text-[#888]">5mg &times; 1</div>
                      </div>
                      <div className="font-mono text-sm">$58.00</div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">GHK-Cu</div>
                        <div className="font-mono text-xs text-[#888]">50mg &times; 1</div>
                      </div>
                      <div className="font-mono text-sm">$30.00</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-[#151515]">
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Products</span>
                      <span className="font-mono">$200.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Shipping</span>
                      <span className="font-mono">$18.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Tip</span>
                      <span className="font-mono">$10.00</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-[#2a2a2a]">
                    <span className="font-bold">Grand Total</span>
                    <span className="font-mono font-bold text-[#ff4f00]">$228.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Shipped (Active) */}
        <div className="relative mb-12">
          <div className="timeline-line"></div>
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#111] border-2 border-[#ff4f00] text-[#ff4f00] flex items-center justify-center shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[#ff4f00]/10 animate-pulse"></div>
              <Truck size={20} strokeWidth={2.5} className="relative z-10" />
            </div>
            <div className="pt-2 w-full">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-lg text-[#ff4f00]">Shipped</h3>
                <span className="font-mono text-xs text-[#ff4f00]">Now</span>
              </div>
              
              <div className="mt-3 bg-[#ff4f00] text-black rounded-lg p-4 shadow-[0_8px_30px_rgba(255,79,0,0.2)]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-70">Courier</div>
                    <div className="font-bold text-lg">DHL Express</div>
                  </div>
                  <ExternalLink size={20} className="opacity-70" />
                </div>
                
                <div className="bg-black/10 rounded p-3 mb-1">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Tracking Number</div>
                  <div className="font-mono text-lg font-bold tracking-widest">•••• •••• 7741</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Delivered */}
        <div className="relative mb-4">
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#111] border-2 border-[#333] text-[#444] flex items-center justify-center shrink-0">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <div className="pt-2 w-full">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-lg text-[#666]">Delivery</h3>
              </div>
              
              <div className="mt-3 border border-[#222] border-dashed rounded-lg p-4 opacity-50">
                <div className="text-sm leading-relaxed font-mono">
                  A. Rivera<br/>
                  148 Harbour Lane<br/>
                  Bristol BS1 4RN<br/>
                  United Kingdom
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="px-4 mt-12 space-y-3">
        <button className="w-full bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#333] py-4 px-6 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
          <RotateCcw size={18} />
          <span>Place Another Order</span>
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-[#111] hover:bg-[#1a1a1a] text-[#aaa] hover:text-white border border-[#222] py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
            <Edit3 size={16} />
            <span>Edit Order</span>
          </button>
          <button className="bg-[#111] hover:bg-[#1a0505] text-[#aaa] hover:text-[#ff4444] border border-[#222] hover:border-[#ff4444]/30 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
            <XCircle size={16} />
            <span>Cancel</span>
          </button>
        </div>
      </div>

    </div>
  );
}
