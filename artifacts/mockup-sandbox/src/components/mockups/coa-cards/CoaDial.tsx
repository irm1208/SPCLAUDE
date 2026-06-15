import React from 'react';
import { ChevronRight } from 'lucide-react';

export function CoaDial() {
  const radius = 70;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const purity = 99.892;
  const strokeDashoffset = circumference - (purity / 100) * circumference;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#1E2756] font-sans antialiased">
      <div className="w-[320px] rounded-3xl bg-[#1E2756] shadow-2xl overflow-hidden border border-white/5 relative">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-[10px] font-bold tracking-widest text-[#4A5D96] uppercase mb-1">
            Certificate
          </p>
          <h2 className="text-3xl font-semibold text-white tracking-tight">
            Tirzepatide
          </h2>
          <div className="h-px w-full bg-white/10 mt-4 rounded-full" />
        </div>

        {/* Dial Section */}
        <div className="relative flex justify-center items-center py-6">
          <svg height={radius * 2} width={radius * 2} className="-rotate-90">
            <defs>
              <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>

            {/* Tick marks around the rim */}
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = (i * 5 * Math.PI) / 180;
              const innerRadius = radius - 14;
              const outerRadius = radius - 10;
              const x1 = radius + innerRadius * Math.cos(angle);
              const y1 = radius + innerRadius * Math.sin(angle);
              const x2 = radius + outerRadius * Math.cos(angle);
              const y2 = radius + outerRadius * Math.sin(angle);
              
              // Only color tick marks that are within the purity percentage
              const tickPurity = (i / 72) * 100;
              const isActive = tickPurity <= purity;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isActive ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.1)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Background Arc */}
            <circle
              stroke="rgba(255, 255, 255, 0.05)"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />

            {/* Foreground Arc */}
            <circle
              stroke="url(#greenGradient)"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            
            {/* Start dot */}
            <circle
              cx={radius + normalizedRadius * Math.cos(0)}
              cy={radius + normalizedRadius * Math.sin(0)}
              r="3"
              fill="white"
            />
            
            {/* End dot */}
            <circle
              cx={radius + normalizedRadius * Math.cos((purity / 100) * 2 * Math.PI)}
              cy={radius + normalizedRadius * Math.sin((purity / 100) * 2 * Math.PI)}
              r="3"
              fill="white"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
              99.892<span className="text-sm">%</span>
            </span>
            <span className="text-[9px] font-bold text-[#4A5D96] tracking-widest mt-0.5">
              PURITY
            </span>
          </div>
        </div>

        {/* Info Rows */}
        <div className="px-6 pb-6 space-y-1">
          {[
            { label: 'Batch', value: 'ZE30-0319' },
            { label: 'Analysis', value: 'Mass & Purity' },
            { label: 'Lab', value: 'Janoshik Analytical' },
            { 
              label: 'Result', 
              value: (
                <div className="flex items-center gap-1.5 text-[#10B981]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  PASS
                </div>
              ) 
            }
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 group cursor-pointer border-b border-white/5 last:border-0">
              <span className="text-sm text-[#8BA1D3] font-medium">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{row.value}</span>
                <ChevronRight className="w-4 h-4 text-[#4A5D96] group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6 pt-2">
          <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2D6BCC] to-[#3B7DE3] text-white text-sm font-semibold tracking-wide shadow-[0_4px_14px_rgba(45,107,204,0.4)] hover:shadow-[0_6px_20px_rgba(45,107,204,0.6)] transition-all active:scale-[0.98]">
            View Report
          </button>
        </div>

      </div>
    </div>
  );
}
