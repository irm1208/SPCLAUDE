import React from "react";
import { 
  ChevronLeft, 
  Package, 
  CheckCircle2, 
  MapPin, 
  Truck, 
  CreditCard,
  FileText,
  Edit2,
  RefreshCcw,
  XCircle,
  MoreVertical,
  ShieldCheck
} from "lucide-react";

export function NavyImmersiveDesktop() {
  return (
    <div className="min-h-screen bg-[#1B3164] text-white font-sans selection:bg-[#2D6BCC] selection:text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1B3164]/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#E9A020] mb-0.5">Order Detail</div>
            <div className="font-medium text-lg flex items-center gap-3">
              SP-7K42
              <span className="px-2 py-0.5 text-xs bg-[#2D6BCC]/20 text-[#2D6BCC] rounded-md font-semibold border border-[#2D6BCC]/30">Shipped</span>
            </div>
          </div>
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-white/5 transition-colors">
          <MoreVertical className="w-5 h-5 text-white/70" />
        </button>
      </header>

      <main className="px-8 py-10 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN - Primary Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Status Hero */}
            <section className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2D6BCC]/20 to-[#1B3A7A]/20 rounded-3xl blur-2xl" />
              <div className="relative bg-gradient-to-br from-[#1C2B3D] to-[#162231] rounded-3xl border border-white/10 p-10 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Package className="w-48 h-48" />
                </div>
                
                <div className="flex items-center justify-between relative z-10 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-[#E9A020]/20 flex items-center justify-center border border-[#E9A020]/30 shadow-[0_0_20px_rgba(233,160,32,0.3)]">
                      <Truck className="w-7 h-7 text-[#E9A020]" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Shipped</h1>
                      <p className="text-base text-white/60">Placed 2 Jul 2026</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC] mb-1.5">Logistics</div>
                    <div className="font-semibold text-lg text-white flex items-center justify-end gap-2 mb-1">
                      DHL Express
                      <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
                    </div>
                    <div className="text-sm text-white/60 flex items-center justify-end gap-2">
                      Tracking: <span className="tracking-[0.2em] font-mono">••••</span> 7741
                    </div>
                    <button className="mt-3 text-xs font-medium bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-white/90 transition-colors border border-white/5 inline-flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      Track Shipment
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10 bg-[#162231]/50 p-6 rounded-2xl border border-white/5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-white/50 mb-4">
                    <span className="w-20 text-center">Ordered</span>
                    <span className="w-20 text-center">Paid</span>
                    <span className="w-20 text-center">Packed</span>
                    <span className="w-20 text-center text-[#E9A020]">Shipped</span>
                    <span className="w-20 text-center">Delivered</span>
                  </div>
                  
                  <div className="relative px-10">
                    <div className="absolute top-1.5 left-10 right-10 h-1.5 bg-[#162231] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full w-[75%] bg-gradient-to-r from-[#2D6BCC] to-[#E9A020] rounded-full relative">
                        <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-r from-transparent to-white/30" />
                      </div>
                    </div>
                    
                    <div className="relative flex justify-between">
                      {['Ordered', 'Paid', 'Packed', 'Shipped', 'Delivered'].map((step, i) => (
                        <div key={step} className="relative flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-4 border-[#1C2B3D] z-10 flex items-center justify-center
                            ${i < 3 ? 'bg-[#2D6BCC]' : i === 3 ? 'bg-[#E9A020] shadow-[0_0_10px_rgba(233,160,32,0.5)]' : 'bg-[#162231]'}`} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Items List */}
            <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="text-[12px] font-bold uppercase tracking-widest text-[#2D6BCC]">Order Products</div>
                <div className="text-sm font-medium text-white/60">4 Items</div>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { name: 'BPC-157', dose: '5mg', qty: 2, price: 70.00 },
                  { name: 'TB-500', dose: '5mg', qty: 1, price: 42.00 },
                  { name: 'Semaglutide', dose: '5mg', qty: 1, price: 58.00 },
                  { name: 'GHK-Cu', dose: '50mg', qty: 1, price: 30.00 }
                ].map((item, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-xl bg-[#162231] border border-white/5 flex items-center justify-center">
                        <div className="w-7 h-7 rounded bg-gradient-to-br from-[#2D6BCC]/20 to-[#1B3A7A]/20" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-white mb-1">{item.name}</div>
                        <div className="text-sm text-white/50 font-medium bg-white/5 inline-flex px-2 py-0.5 rounded text-white/70 border border-white/5">{item.dose}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="text-white/60 text-sm font-medium">Qty: {item.qty}</div>
                      <div className="font-mono text-lg text-white w-24 text-right">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
          </div>
          
          {/* RIGHT COLUMN - Secondary Content */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Totals */}
            <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 shadow-lg p-6 space-y-4">
              <div className="text-[12px] font-bold uppercase tracking-widest text-[#2D6BCC] mb-4">Summary</div>
              
              <div className="space-y-3 pb-4 border-b border-white/5">
                <div className="flex justify-between text-base text-white/70">
                  <span>Products</span>
                  <span className="font-mono text-white/90">$200.00</span>
                </div>
                <div className="flex justify-between text-base text-white/70">
                  <span>Shipping</span>
                  <span className="font-mono text-white/90">$18.00</span>
                </div>
                <div className="flex justify-between text-base text-white/70">
                  <span>Tip</span>
                  <span className="font-mono text-white/90">$10.00</span>
                </div>
              </div>
              
              <div className="pt-2 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC] mb-1">Grand Total</div>
                  <div className="text-3xl font-bold text-white">$228.00</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Amount Due</div>
                  <div className="text-lg font-medium text-[#22c55e]">$0.00</div>
                </div>
              </div>
            </section>

            {/* Payment & Delivery Split in Desktop (stacked in right column) */}
            <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 p-6 shadow-lg flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#22c55e]/10 flex items-center justify-center mt-1">
                <CreditCard className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Payment Method</div>
                <div className="font-medium text-base text-white">Crypto (USDT)</div>
                <div className="text-sm text-[#22c55e] flex items-center gap-1.5 mt-1.5 bg-[#22c55e]/10 inline-flex px-2 py-0.5 rounded-md border border-[#22c55e]/20">
                  <CheckCircle2 className="w-4 h-4" /> Confirmed
                </div>
              </div>
            </section>

            <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 p-6 shadow-lg flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#2D6BCC]/10 flex items-center justify-center mt-1">
                <MapPin className="w-5 h-5 text-[#2D6BCC]" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Shipping Address</div>
                <div className="font-medium text-base text-white mb-2">A. Rivera</div>
                <div className="text-sm text-white/60 leading-relaxed bg-[#162231] p-3 rounded-xl border border-white/5">
                  148 Harbour Lane<br />
                  Bristol BS1 4RN<br />
                  United Kingdom
                </div>
              </div>
            </section>

            {/* Actions */}
            <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 p-6 shadow-lg space-y-4">
              <div className="text-[12px] font-bold uppercase tracking-widest text-[#2D6BCC] mb-2">Order Actions</div>
              
              <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2D6BCC] to-[#1B3A7A] hover:from-[#3B66C8] hover:to-[#224A9A] text-white py-4 px-4 rounded-xl text-sm font-bold transition-all shadow-lg border border-white/10 group">
                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                Place Another Order
              </button>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button className="flex items-center justify-center gap-2 bg-[#162231] hover:bg-white/10 border border-white/5 text-white/80 py-3 px-4 rounded-xl text-sm font-medium transition-all">
                  <FileText className="w-4 h-4" />
                  Receipt PDF
                </button>
                <button className="flex items-center justify-center gap-2 bg-[#162231] hover:bg-white/10 border border-white/5 text-white/80 py-3 px-4 rounded-xl text-sm font-medium transition-all">
                  <Edit2 className="w-4 h-4" />
                  Edit Order
                </button>
              </div>
              
              <div className="pt-2">
                <button className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-[#ef4444] hover:bg-[#ef4444]/10 py-3 rounded-xl text-sm font-medium transition-colors">
                  <XCircle className="w-4 h-4" />
                  Cancel Order
                </button>
              </div>
            </section>
            
          </div>
          
        </div>
      </main>
    </div>
  );
}
