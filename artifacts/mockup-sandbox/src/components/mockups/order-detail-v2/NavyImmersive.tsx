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
  ShieldCheck,
  ArrowRight
} from "lucide-react";

export function NavyImmersive() {
  return (
    <div className="min-h-screen bg-[#1B3164] text-white font-sans selection:bg-[#2D6BCC] selection:text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1B3164]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <button className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#E9A020] mb-0.5">Order Detail</div>
          <div className="font-medium text-sm">SP-7K42</div>
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-white/5 transition-colors">
          <MoreVertical className="w-5 h-5 text-white/70" />
        </button>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Status Hero */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2D6BCC]/30 to-[#1B3A7A]/30 rounded-3xl blur-xl" />
          <div className="relative bg-gradient-to-br from-[#1C2B3D] to-[#162231] rounded-3xl border border-white/10 p-6 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Package className="w-32 h-32" />
            </div>
            
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#E9A020]/20 flex items-center justify-center border border-[#E9A020]/30 shadow-[0_0_15px_rgba(233,160,32,0.3)]">
                <Truck className="w-5 h-5 text-[#E9A020]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Shipped</h1>
                <p className="text-sm text-white/60">Placed 2 Jul 2026</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8 relative z-10">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                <span>Ordered</span>
                <span className="text-[#E9A020]">Shipped</span>
                <span>Delivered</span>
              </div>
              <div className="h-1.5 bg-[#162231] rounded-full overflow-hidden border border-white/5">
                <div className="h-full w-[75%] bg-gradient-to-r from-[#2D6BCC] to-[#E9A020] rounded-full relative">
                  <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
                </div>
              </div>
              <div className="mt-4 flex gap-1">
                {['Ordered', 'Paid', 'Packed', 'Shipped', 'Delivered'].map((step, i) => (
                  <div key={step} className="flex-1 flex flex-col gap-1.5 items-center">
                    <div className={`w-full h-0.5 rounded-full ${i <= 3 ? 'bg-white/20' : 'bg-white/5'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Courier & Tracking */}
        <section className="bg-[#1C2B3D] rounded-2xl p-5 border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC] mb-1">Logistics</div>
              <div className="font-semibold text-white flex items-center gap-2">
                DHL Express
                <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div className="text-sm text-white/60 mt-1 flex items-center gap-2">
                Tracking: <span className="tracking-[0.2em] font-mono">••••</span> 7741
              </div>
            </div>
            <button className="text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white/90 transition-colors border border-white/5">
              Track
            </button>
          </div>
        </section>

        {/* Items List */}
        <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC]">Products</div>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { name: 'BPC-157', dose: '5mg', qty: 2, price: 70.00 },
              { name: 'TB-500', dose: '5mg', qty: 1, price: 42.00 },
              { name: 'Semaglutide', dose: '5mg', qty: 1, price: 58.00 },
              { name: 'GHK-Cu', dose: '50mg', qty: 1, price: 30.00 }
            ].map((item, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#162231] border border-white/5 flex items-center justify-center">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-[#2D6BCC]/20 to-[#1B3A7A]/20" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="text-xs text-white/50">{item.dose} × {item.qty}</div>
                  </div>
                </div>
                <div className="font-mono text-sm text-white/90">
                  ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Totals */}
        <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 shadow-lg p-5 space-y-3">
          <div className="flex justify-between text-sm text-white/60">
            <span>Products</span>
            <span className="font-mono text-white/90">$200.00</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>Shipping</span>
            <span className="font-mono text-white/90">$18.00</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>Tip</span>
            <span className="font-mono text-white/90">$10.00</span>
          </div>
          <div className="pt-3 border-t border-white/5 flex justify-between items-end">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC] mb-1">Grand Total</div>
              <div className="text-xl font-bold text-white">$228.00</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Amount Due</div>
              <div className="text-sm font-medium text-[#22c55e]">$0.00</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {/* Payment */}
          <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 p-4 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4 text-[#22c55e]" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Payment</div>
            <div className="font-medium text-sm text-white">Crypto (USDT)</div>
            <div className="text-xs text-[#22c55e] flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Confirmed
            </div>
          </section>

          {/* Delivery */}
          <section className="bg-[#1C2B3D] rounded-2xl border border-white/5 p-4 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-[#2D6BCC]/10 flex items-center justify-center mb-3">
              <MapPin className="w-4 h-4 text-[#2D6BCC]" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Ship To</div>
            <div className="font-medium text-sm text-white">A. Rivera</div>
            <div className="text-xs text-white/60 mt-1 leading-relaxed">
              148 Harbour Lane<br />
              Bristol BS1 4RN<br />
              UK
            </div>
          </section>
        </div>

        {/* Actions */}
        <section className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-[#1C2B3D] hover:bg-[#162231] border border-white/5 text-white/80 py-3.5 px-4 rounded-xl text-sm font-medium transition-all shadow-sm">
              <FileText className="w-4 h-4" />
              Receipt PDF
            </button>
            <button className="flex items-center justify-center gap-2 bg-[#1C2B3D] hover:bg-[#162231] border border-white/5 text-white/80 py-3.5 px-4 rounded-xl text-sm font-medium transition-all shadow-sm">
              <Edit2 className="w-4 h-4" />
              Edit Order
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2D6BCC] to-[#1B3A7A] hover:from-[#3B66C8] hover:to-[#224A9A] text-white py-4 px-4 rounded-xl text-sm font-bold transition-all shadow-lg border border-white/10">
            <RefreshCcw className="w-4 h-4" />
            Place Another Order
          </button>
          <button className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-[#ef4444] py-3 text-sm font-medium transition-colors">
            <XCircle className="w-4 h-4" />
            Cancel Order
          </button>
        </section>
      </main>
    </div>
  );
}
