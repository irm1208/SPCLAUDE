import React from "react";
import { 
  ChevronLeft, Download, RefreshCw, X, Box, 
  MapPin, Truck, CreditCard, Receipt, Info, CheckCircle2
} from "lucide-react";
import "./_group.css";

export function ProgressJourney() {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = 75;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="pj-container pb-24 text-[var(--text-body)]">
      {/* Header / Hero Progress Area */}
      <div className="pj-gradient-header pt-12 px-6">
        <div className="flex items-center justify-between text-white mb-6">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
              Order
            </div>
            <div className="text-lg font-bold tracking-tight">SP-7K42</div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative flex justify-center items-center mt-4 mb-4">
          <svg className="w-56 h-56" viewBox="0 0 200 200">
            <circle
              className="pj-progress-circle-bg"
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              strokeWidth="6"
            />
            <circle
              className="pj-progress-circle-value"
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            />
            {/* Markers on the ring */}
            <circle cx="100" cy="10" r="4" fill="#E9A020" />
            <circle cx="190" cy="100" r="4" fill="#E9A020" />
            <circle cx="100" cy="190" r="4" fill="#E9A020" />
            <circle cx="10" cy="100" r="4" fill="rgba(255,255,255,0.3)" />
          </svg>

          {/* Inner Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Truck size={32} className="text-[var(--amber)] mb-2" strokeWidth={1.5} />
            <div className="text-2xl font-bold text-white tracking-tight">Shipped</div>
            <div className="text-xs text-white/70 mt-1 font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              Placed 2 Jul 2026
            </div>
          </div>
        </div>

        {/* Vertical Journey Summary */}
        <div className="flex justify-between items-start text-white mt-8 px-2">
          <div className="flex flex-col items-center text-center w-1/5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <CheckCircle2 size={12} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-white/80">Ordered</span>
          </div>
          <div className="h-px bg-white/20 w-full mt-3"></div>
          <div className="flex flex-col items-center text-center w-1/5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <CheckCircle2 size={12} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-white/80">Paid</span>
          </div>
          <div className="h-px bg-white/20 w-full mt-3"></div>
          <div className="flex flex-col items-center text-center w-1/5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <CheckCircle2 size={12} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-white/80">Packed</span>
          </div>
          <div className="h-px bg-[var(--amber)] w-full mt-3"></div>
          <div className="flex flex-col items-center text-center w-1/5">
            <div className="w-6 h-6 rounded-full bg-[var(--amber)] flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(233,160,32,0.6)]">
              <div className="w-2 h-2 bg-[var(--navy)] rounded-full"></div>
            </div>
            <span className="text-[9px] font-bold text-white">Shipped</span>
          </div>
          <div className="h-px bg-white/10 w-full mt-3 border-t border-dashed border-white/20"></div>
          <div className="flex flex-col items-center text-center w-1/5">
            <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center mb-2">
              <div className="w-1.5 h-1.5 bg-white/20 rounded-full"></div>
            </div>
            <span className="text-[9px] font-bold text-white/50">Delivered</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-[-16px] relative z-10 space-y-4">
        
        {/* Tracking Card */}
        <div className="pj-card p-5 flex items-center gap-4 border-l-4 border-l-[var(--amber)]">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-light)] flex items-center justify-center flex-shrink-0 text-[var(--navy)]">
            <MapPin size={20} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
              Tracking • DHL Express
            </div>
            <div className="font-mono font-medium text-[var(--text-heading)] tracking-wider">
              <span className="text-[var(--text-muted)]">••••</span> 7741
            </div>
          </div>
          <button className="text-[var(--blue)] text-xs font-bold px-3 py-1.5 bg-[rgba(45,107,204,0.1)] rounded-lg hover:bg-[rgba(45,107,204,0.2)] transition-colors">
            Track
          </button>
        </div>

        {/* Address Card */}
        <div className="pj-card p-5 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-light)] flex items-center justify-center flex-shrink-0 text-[var(--navy)]">
            <Box size={20} />
          </div>
          <div className="flex-1 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Delivery Address
            </div>
            <div className="text-sm font-semibold text-[var(--text-heading)]">A. Rivera</div>
            <div className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">
              148 Harbour Lane<br />
              Bristol BS1 4RN<br />
              United Kingdom
            </div>
          </div>
        </div>

        {/* Payment Card - Dark */}
        <div className="pj-card-dark p-5 text-white flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--input-dark)] flex items-center justify-center flex-shrink-0 text-[var(--amber)] border border-white/5">
            <CreditCard size={20} />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Payment Status
              </div>
              <div className="flex items-center gap-1.5 text-[var(--green)] bg-green-500/10 px-2 py-0.5 rounded text-xs font-bold">
                <CheckCircle2 size={12} />
                <span>Confirmed</span>
              </div>
            </div>
            <div className="text-sm font-semibold">Paid — Crypto (USDT)</div>
          </div>
        </div>

        {/* Items Card */}
        <div className="pj-card p-5">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--bg-light)]">
            <div className="flex items-center gap-2 text-[var(--navy)] font-bold">
              <Receipt size={18} />
              <span>Order Summary</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-heading)]">4 items</div>
          </div>
          
          <div className="space-y-4 mb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">BPC-157</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">5mg • Qty: 2</div>
              </div>
              <div className="text-sm font-medium">$70.00</div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">TB-500</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">5mg • Qty: 1</div>
              </div>
              <div className="text-sm font-medium">$42.00</div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">Semaglutide</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">5mg • Qty: 1</div>
              </div>
              <div className="text-sm font-medium">$58.00</div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">GHK-Cu</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">50mg • Qty: 1</div>
              </div>
              <div className="text-sm font-medium">$30.00</div>
            </div>
          </div>
          
          <div className="bg-[var(--bg-light)] rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Products</span>
              <span>$200.00</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Shipping</span>
              <span>$18.00</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Tip</span>
              <span>$10.00</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold text-[var(--text-heading)] text-base">
              <span>Grand Total</span>
              <span>$228.00</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--green)] pt-1">
              <span>Amount Due</span>
              <span>$0.00</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button className="pj-button-primary py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[rgba(27,58,122,0.2)]">
            <RefreshCw size={16} />
            Place Again
          </button>
          <button className="bg-white border border-[var(--navy)] text-[var(--navy)] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[var(--bg-light)] transition-colors">
            <Download size={16} />
            Save PDF
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-1 pb-8">
          <button className="pj-button-ghost py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
            <Info size={16} />
            Edit Order
          </button>
          <button className="border border-transparent text-[var(--red)] py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50">
            <X size={16} />
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
