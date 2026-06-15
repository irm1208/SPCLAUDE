import { Check } from "lucide-react";

export function CoaDarkMinimal() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 antialiased font-sans" 
      style={{ backgroundColor: '#0A0A0F' }}
    >
      <div
        className="w-[320px] rounded-[32px] flex flex-col p-6 relative overflow-hidden"
        style={{
          backgroundColor: '#111118',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Subtle top glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#2D6BCC] uppercase">
            COA
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2D6BCC' }} />
            <span className="text-[10px] font-medium text-white/50">Uther</span>
          </div>
        </div>

        {/* Title */}
        <div className="relative z-10">
          <h2 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
            Tirzepatide
          </h2>
        </div>

        {/* Prominent Number */}
        <div className="mt-8 mb-7 relative z-10">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[56px] font-bold text-white tracking-tighter leading-none">
              99.892
            </span>
            <span className="text-[28px] font-semibold text-white/40 leading-none">
              %
            </span>
          </div>
          <div className="text-[11px] text-white/40 uppercase tracking-[0.15em] font-semibold mt-3">
            Purity
          </div>
        </div>

        {/* Stat Chips */}
        <div className="grid grid-cols-3 gap-2 relative z-10">
          <div className="flex flex-col gap-1.5 rounded-[14px] p-3" style={{ backgroundColor: '#1A1A25' }}>
            <span className="text-[8px] text-white/40 uppercase tracking-widest font-semibold">Batch</span>
            <span className="text-[11px] font-medium text-white/90 truncate">ZE30-0319</span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[14px] p-3" style={{ backgroundColor: '#1A1A25' }}>
            <span className="text-[8px] text-white/40 uppercase tracking-widest font-semibold">Mass</span>
            <span className="text-[11px] font-medium text-white/90 truncate">4,512 Da</span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[14px] p-3" style={{ backgroundColor: '#1A1A25' }}>
            <span className="text-[8px] text-white/40 uppercase tracking-widest font-semibold">Status</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-emerald-400">PASS</span>
              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-white/5 my-6 relative z-10" />

        {/* Info Rows */}
        <div className="flex flex-col gap-3.5 relative z-10">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-white/40">Analysis</span>
            <span className="text-white/80 tracking-tight">Mass & Purity</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-white/40">Date</span>
            <span className="text-white/80 tracking-tight">10 Apr 2026</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-white/40">Lab</span>
            <span className="text-white/80 tracking-tight">Janoshik Analytical</span>
          </div>
        </div>

        {/* Button */}
        <button
          className="mt-8 w-full py-3.5 rounded-[14px] text-[13px] font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98] relative z-10"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          View Report
        </button>
      </div>
    </div>
  );
}
