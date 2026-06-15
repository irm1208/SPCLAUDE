import React from 'react';
import { Sparkles, Calendar, Package, MapPin, Building2, User, Info } from 'lucide-react';

export function HolographicCard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      {/* Holographic Border Wrapper */}
      <div 
        className="relative rounded-2xl p-[2px] w-full max-w-sm overflow-hidden group shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #F5C842 0%, #D89F3C 25%, #FFF3A1 50%, #D89F3C 75%, #F5C842 100%)',
          boxShadow: '0 0 40px rgba(245, 200, 66, 0.15)'
        }}
      >
        {/* Animated foil effect overlay on border */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0) 50%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 3s infinite linear'
          }}
        />

        {/* Card Content Base */}
        <div 
          className="relative rounded-[14px] p-6 h-full flex flex-col gap-6 overflow-hidden"
          style={{ backgroundColor: '#0D0D1A' }}
        >
          {/* Holographic Shimmer Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(255,0,0,0.4) 0%, 
                  rgba(255,154,0,0.4) 10%, 
                  rgba(208,222,33,0.4) 20%, 
                  rgba(79,220,74,0.4) 30%, 
                  rgba(63,218,216,0.4) 40%, 
                  rgba(47,201,226,0.4) 50%, 
                  rgba(28,127,238,0.4) 60%, 
                  rgba(95,21,242,0.4) 70%, 
                  rgba(186,12,248,0.4) 80%, 
                  rgba(251,7,217,0.4) 90%, 
                  rgba(255,0,0,0.4) 100%
                )
              `,
              backgroundSize: '200% 200%',
              animation: 'shimmer 8s infinite linear'
            }}
          />
          
          {/* Noise texture */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
            }}
          />

          {/* Top Bar */}
          <div className="relative flex justify-between items-center z-10">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#F5C842]">
              ◆ Peps Anonymous
            </div>
            <div className="text-[10px] font-mono text-[#F5C842]/80">
              SERIES 01 · #0042
            </div>
          </div>

          {/* Main Title Section */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center mt-4 mb-2 gap-3">
            <div 
              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold tracking-wider"
              style={{
                background: 'linear-gradient(90deg, rgba(255,0,0,0.2), rgba(0,0,255,0.2))',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(4px)'
              }}
            >
              <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                <Sparkles className="w-3 h-3 inline-block mr-1.5" />
                ACTIVE
              </span>
            </div>
            
            <h2 
              className="text-3xl font-black leading-tight tracking-tight mt-2"
              style={{
                background: 'linear-gradient(to right, #fff, #a5b4fc, #fbcfe8, #fff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% auto',
                animation: 'shimmer 4s infinite linear'
              }}
            >
              Uther April<br />Group Buy
            </h2>
          </div>

          {/* Holographic Chips */}
          <div className="relative z-10 flex flex-wrap justify-center gap-2 mt-2">
            <Chip icon={<Building2 className="w-3 h-3" />} text="Uther" hue="from-purple-500/20 to-blue-500/20" border="border-purple-500/30" />
            <Chip icon={<MapPin className="w-3 h-3" />} text="UK" hue="from-blue-500/20 to-cyan-500/20" border="border-blue-500/30" />
            <Chip icon={<User className="w-3 h-3" />} text="Admin" hue="from-cyan-500/20 to-emerald-500/20" border="border-cyan-500/30" />
            <Chip icon={<Package className="w-3 h-3" />} text="1 product" hue="from-emerald-500/20 to-yellow-500/20" border="border-emerald-500/30" />
            <Chip icon={<span className="font-bold font-serif text-[10px]">$</span>} text="USD" hue="from-yellow-500/20 to-orange-500/20" border="border-yellow-500/30" />
          </div>

          {/* Golden Date Badge */}
          <div className="relative z-10 mt-4 flex justify-center">
            <div 
              className="px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(245,200,66,0.2)]"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 200, 66, 0.15) 0%, rgba(216, 159, 60, 0.05) 100%)',
                border: '1px solid rgba(245, 200, 66, 0.4)',
                color: '#F5C842'
              }}
            >
              <Calendar className="w-4 h-4" />
              <span>APR 22</span>
              <span className="opacity-50 px-1">·</span>
              <span>8d left</span>
            </div>
          </div>

          {/* Info Snippet */}
          <div className="relative z-10 mt-auto pt-4 flex items-start gap-2 text-white/40 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Order will be made for peptides in stock. Payment due within 24h of invoice.</p>
          </div>

          {/* CTA Button */}
          <button 
            className="relative z-10 w-full mt-4 py-4 rounded-xl font-black text-[15px] tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,200,66,0.4)] overflow-hidden group/btn"
            style={{
              background: 'linear-gradient(90deg, #F5C842 0%, #FFF3A1 25%, #E6A32F 50%, #FFF3A1 75%, #F5C842 100%)',
              backgroundSize: '200% auto',
              animation: 'shimmer 3s infinite linear',
              color: '#0D0D1A'
            }}
          >
            <span className="relative z-10">Claim Order</span>
            <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-white/20 mix-blend-overlay" />
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}} />
    </div>
  );
}

function Chip({ icon, text, hue, border }: { icon: React.ReactNode, text: string, hue: string, border: string }) {
  return (
    <div 
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 bg-gradient-to-r ${hue} border ${border} backdrop-blur-md`}
    >
      <span className="opacity-70">{icon}</span>
      {text}
    </div>
  );
}
