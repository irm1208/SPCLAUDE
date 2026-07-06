import React from "react";
import { 
  ChevronLeft, Download, RefreshCw, X, Box, 
  MapPin, Truck, CreditCard, Receipt, Info, CheckCircle2
} from "lucide-react";
import "./_group.css";
import "./ProgressJourneyDesktop.css";

export function ProgressJourneyDesktop() {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = 75;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="pj-desktop-container pb-24 text-[var(--text-body)]">
      {/* Top Navigation */}
      <div className="bg-[var(--navy)] text-white px-8 py-4 flex items-center gap-4">
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2">
          <ChevronLeft size={24} />
        </button>
        <div className="font-medium text-white/70">Back to Orders</div>
      </div>

      {/* Hero Header */}
      <div className="pj-desktop-hero px-8 py-16 pb-24">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex-1 text-white">
            <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
              Order • Placed 2 Jul 2026
            </div>
            <div className="text-5xl font-bold tracking-tight mb-8">SP-7K42</div>
            
            {/* Horizontal Journey Summary */}
            <div className="flex items-center text-white mt-8 max-w-2xl">
              <div className="flex flex-col items-start w-1/5 relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold text-white/80">Ordered</span>
                <div className="absolute top-4 left-8 right-0 h-0.5 bg-white/20"></div>
              </div>
              
              <div className="flex flex-col items-start w-1/5 relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold text-white/80">Paid</span>
                <div className="absolute top-4 left-8 right-0 h-0.5 bg-white/20"></div>
              </div>
              
              <div className="flex flex-col items-start w-1/5 relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 relative z-10">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold text-white/80">Packed</span>
                <div className="absolute top-4 left-8 right-0 h-0.5 bg-[var(--amber)]"></div>
              </div>
              
              <div className="flex flex-col items-start w-1/5 relative">
                <div className="w-8 h-8 rounded-full bg-[var(--amber)] flex items-center justify-center mb-3 shadow-[0_0_16px_rgba(233,160,32,0.6)] relative z-10">
                  <div className="w-3 h-3 bg-[var(--navy)] rounded-full"></div>
                </div>
                <span className="text-xs font-bold text-white">Shipped</span>
                <div className="absolute top-4 left-8 right-0 h-0.5 bg-white/10 border-t border-dashed border-white/20"></div>
              </div>
              
              <div className="flex flex-col items-start w-1/5 relative">
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center mb-3 relative z-10">
                  <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                </div>
                <span className="text-xs font-bold text-white/50">Delivered</span>
              </div>
            </div>
          </div>

          {/* Circular Progress Ring */}
          <div className="relative flex justify-center items-center ml-12 shrink-0">
            <svg className="w-64 h-64" viewBox="0 0 200 200">
              <circle
                className="pj-progress-circle-bg"
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                strokeWidth="8"
              />
              <circle
                className="pj-progress-circle-value"
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
              {/* Markers on the ring */}
              <circle cx="100" cy="10" r="5" fill="#E9A020" />
              <circle cx="190" cy="100" r="5" fill="#E9A020" />
              <circle cx="100" cy="190" r="5" fill="#E9A020" />
              <circle cx="10" cy="100" r="5" fill="rgba(255,255,255,0.3)" />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Truck size={40} className="text-[var(--amber)] mb-3" strokeWidth={1.5} />
              <div className="text-3xl font-bold text-white tracking-tight">Shipped</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 mt-[-48px] relative z-10 flex gap-8 items-start">
        
        {/* Main Column - Order Items */}
        <div className="flex-1 space-y-6">
          <div className="pj-desktop-card p-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--bg-light)]">
              <div className="flex items-center gap-3 text-[var(--navy)] font-bold text-lg">
                <Receipt size={24} />
                <span>Order Summary</span>
              </div>
              <div className="text-base font-bold text-[var(--text-heading)]">4 items</div>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center group hover:bg-[var(--bg-light)] -mx-4 px-4 py-2 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-light)] rounded-lg flex items-center justify-center text-[var(--text-muted)] group-hover:bg-white transition-colors">
                    <Box size={24} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[var(--text-heading)]">BPC-157</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">5mg • Qty: 2</div>
                  </div>
                </div>
                <div className="text-base font-semibold">$70.00</div>
              </div>

              <div className="flex justify-between items-center group hover:bg-[var(--bg-light)] -mx-4 px-4 py-2 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-light)] rounded-lg flex items-center justify-center text-[var(--text-muted)] group-hover:bg-white transition-colors">
                    <Box size={24} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[var(--text-heading)]">TB-500</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">5mg • Qty: 1</div>
                  </div>
                </div>
                <div className="text-base font-semibold">$42.00</div>
              </div>

              <div className="flex justify-between items-center group hover:bg-[var(--bg-light)] -mx-4 px-4 py-2 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-light)] rounded-lg flex items-center justify-center text-[var(--text-muted)] group-hover:bg-white transition-colors">
                    <Box size={24} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[var(--text-heading)]">Semaglutide</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">5mg • Qty: 1</div>
                  </div>
                </div>
                <div className="text-base font-semibold">$58.00</div>
              </div>

              <div className="flex justify-between items-center group hover:bg-[var(--bg-light)] -mx-4 px-4 py-2 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-light)] rounded-lg flex items-center justify-center text-[var(--text-muted)] group-hover:bg-white transition-colors">
                    <Box size={24} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[var(--text-heading)]">GHK-Cu</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">50mg • Qty: 1</div>
                  </div>
                </div>
                <div className="text-base font-semibold">$30.00</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="w-96 shrink-0 space-y-6">
          
          {/* Tracking Card */}
          <div className="pj-desktop-card p-6 flex items-center gap-4 border-l-4 border-l-[var(--amber)]">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-light)] flex items-center justify-center flex-shrink-0 text-[var(--navy)]">
              <MapPin size={24} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Tracking • DHL Express
              </div>
              <div className="font-mono text-lg font-medium text-[var(--text-heading)] tracking-wider">
                <span className="text-[var(--text-muted)]">••••</span> 7741
              </div>
            </div>
            <button className="text-[var(--blue)] text-sm font-bold px-4 py-2 bg-[rgba(45,107,204,0.1)] rounded-lg hover:bg-[rgba(45,107,204,0.2)] transition-colors">
              Track
            </button>
          </div>

          {/* Payment Card - Dark */}
          <div className="pj-desktop-card-dark p-6 text-white flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-[var(--input-dark)] flex items-center justify-center flex-shrink-0 text-[var(--amber)] border border-white/5">
              <CreditCard size={24} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Payment Status
                </div>
                <div className="flex items-center gap-1.5 text-[var(--green)] bg-green-500/10 px-2 py-0.5 rounded text-xs font-bold">
                  <CheckCircle2 size={12} />
                  <span>Confirmed</span>
                </div>
              </div>
              <div className="text-base font-semibold">Paid — Crypto (USDT)</div>
            </div>
          </div>

          {/* Address Card */}
          <div className="pj-desktop-card p-6 flex gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-light)] flex items-center justify-center flex-shrink-0 text-[var(--navy)]">
              <Box size={24} />
            </div>
            <div className="flex-1 pt-1">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Delivery Address
              </div>
              <div className="text-base font-semibold text-[var(--text-heading)]">A. Rivera</div>
              <div className="text-base text-[var(--text-muted)] mt-1.5 leading-relaxed">
                148 Harbour Lane<br />
                Bristol BS1 4RN<br />
                United Kingdom
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="pj-desktop-card p-6 bg-[var(--bg-light)]">
            <div className="space-y-3 text-base">
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
              <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between font-bold text-[var(--text-heading)] text-xl">
                <span>Grand Total</span>
                <span>$228.00</span>
              </div>
              <div className="flex justify-between font-bold text-[var(--green)] pt-1 text-lg">
                <span>Amount Due</span>
                <span>$0.00</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <button className="pj-desktop-button-primary py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[rgba(27,58,122,0.2)] hover:-translate-y-0.5 transition-transform">
                <RefreshCw size={18} />
                Place Again
              </button>
              <button className="bg-white border-2 border-[var(--navy)] text-[var(--navy)] py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[var(--bg-light)] hover:-translate-y-0.5 transition-all">
                <Download size={18} />
                Save PDF
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="pj-desktop-button-ghost py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                <Info size={18} />
                Edit Order
              </button>
              <button className="border border-transparent text-[var(--red)] py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                <X size={18} />
                Cancel Order
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
