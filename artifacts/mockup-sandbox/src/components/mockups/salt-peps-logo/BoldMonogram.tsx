export default function BoldMonogram() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D6BCC] to-[#1B3A7A] p-16 text-center shadow-2xl">
          <div className="relative z-10 flex flex-col items-center gap-6">
            <svg viewBox="0 0 64 64" className="w-24 h-24" aria-label="Salt & Peps Logo">
              {/* S letterform - bold geometric */}
              <path
                d="M 8 12 L 20 12 Q 24 12 24 16 Q 24 20 20 20 L 12 20 L 12 24 L 20 24 Q 28 24 28 32 Q 28 40 20 40 L 8 40 L 8 36 L 20 36 Q 24 36 24 32 Q 24 28 20 28 L 12 28 Q 8 28 8 24 L 8 20 Q 8 16 12 16 L 20 16 Q 20 12 16 12 L 8 12 Z"
                fill="white"
              />
              
              {/* Dot separator - brand blue circle */}
              <circle cx="32" cy="26" r="3.5" fill="white" opacity="0.9" />
              
              {/* P letterform - bold geometric */}
              <path
                d="M 36 12 L 48 12 Q 56 12 56 20 Q 56 28 48 28 L 40 28 L 40 40 L 36 40 Z M 40 16 L 40 24 L 48 24 Q 52 24 52 20 Q 52 16 48 16 L 40 16 Z"
                fill="white"
              />
            </svg>
            
            <div className="space-y-2">
              <h1 className="text-[32px] font-[800] text-white tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                Salt &amp; Peps
              </h1>
              <p className="text-white/60 text-[12px] tracking-[0.2em] uppercase font-medium">
                · Advanced Peptide Research ·
              </p>
            </div>
          </div>
          
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
        </div>

        {/* Size Demonstrations */}
        <div>
          <h2 className="text-lg font-bold text-[#1B3A7A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Scale Testing
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { size: 24, label: 'Small (24px)' },
              { size: 48, label: 'Medium (48px)' },
              { size: 80, label: 'Large (80px)' }
            ].map(({ size, label }) => (
              <div key={size} className="bg-white rounded-2xl p-8 shadow-lg flex flex-col items-center gap-4">
                <svg viewBox="0 0 64 64" style={{ width: size, height: size }} aria-label="Salt & Peps Mark">
                  <path
                    d="M 8 12 L 20 12 Q 24 12 24 16 Q 24 20 20 20 L 12 20 L 12 24 L 20 24 Q 28 24 28 32 Q 28 40 20 40 L 8 40 L 8 36 L 20 36 Q 24 36 24 32 Q 24 28 20 28 L 12 28 Q 8 28 8 24 L 8 20 Q 8 16 12 16 L 20 16 Q 20 12 16 12 L 8 12 Z"
                    fill="#1B3A7A"
                  />
                  <circle cx="32" cy="26" r="3.5" fill="#2D6BCC" />
                  <path
                    d="M 36 12 L 48 12 Q 56 12 56 20 Q 56 28 48 28 L 40 28 L 40 40 L 36 40 Z M 40 16 L 40 24 L 48 24 Q 52 24 52 20 Q 52 16 48 16 L 40 16 Z"
                    fill="#1B3A7A"
                  />
                </svg>
                <span className="text-xs font-semibold text-[#1B3A7A]/60 tracking-wide">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Variations */}
        <div>
          <h2 className="text-lg font-bold text-[#1B3A7A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Color Treatments
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { bg: '#1B3A7A', color: 'white', label: 'Navy Background' },
              { bg: 'white', color: '#1B3A7A', label: 'White Background' },
              { bg: 'linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)', color: 'white', label: 'Gradient' }
            ].map(({ bg, color, label }, idx) => (
              <div key={idx} className="flex flex-col items-center gap-4">
                <div
                  className="w-32 h-32 rounded-full shadow-xl flex items-center justify-center"
                  style={{ background: bg }}
                >
                  <svg viewBox="0 0 64 64" className="w-12 h-12" aria-label="Salt & Peps Mark">
                    <path
                      d="M 8 12 L 20 12 Q 24 12 24 16 Q 24 20 20 20 L 12 20 L 12 24 L 20 24 Q 28 24 28 32 Q 28 40 20 40 L 8 40 L 8 36 L 20 36 Q 24 36 24 32 Q 24 28 20 28 L 12 28 Q 8 28 8 24 L 8 20 Q 8 16 12 16 L 20 16 Q 20 12 16 12 L 8 12 Z"
                      fill={color === 'white' ? 'white' : color}
                    />
                    <circle cx="32" cy="26" r="3.5" fill={color === 'white' ? 'rgba(255,255,255,0.9)' : '#2D6BCC'} />
                    <path
                      d="M 36 12 L 48 12 Q 56 12 56 20 Q 56 28 48 28 L 40 28 L 40 40 L 36 40 Z M 40 16 L 40 24 L 48 24 Q 52 24 52 20 Q 52 16 48 16 L 40 16 Z"
                      fill={color === 'white' ? 'white' : color}
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#1B3A7A]/70">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Application */}
        <div>
          <h2 className="text-lg font-bold text-[#1B3A7A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Horizontal Lockup – Label Application
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="bg-[#F8FAFC] border-2 border-[#D0DAE4] rounded-xl p-6 inline-flex items-center gap-4">
              <svg viewBox="0 0 64 64" className="w-8 h-8" aria-label="Salt & Peps Mark">
                <path
                  d="M 8 12 L 20 12 Q 24 12 24 16 Q 24 20 20 20 L 12 20 L 12 24 L 20 24 Q 28 24 28 32 Q 28 40 20 40 L 8 40 L 8 36 L 20 36 Q 24 36 24 32 Q 24 28 20 28 L 12 28 Q 8 28 8 24 L 8 20 Q 8 16 12 16 L 20 16 Q 20 12 16 12 L 8 12 Z"
                  fill="#1B3A7A"
                />
                <circle cx="32" cy="26" r="3.5" fill="#2D6BCC" />
                <path
                  d="M 36 12 L 48 12 Q 56 12 56 20 Q 56 28 48 28 L 40 28 L 40 40 L 36 40 Z M 40 16 L 40 24 L 48 24 Q 52 24 52 20 Q 52 16 48 16 L 40 16 Z"
                  fill="#1B3A7A"
                />
              </svg>
              
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold text-[#1B3A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Salt &amp; Peps
                </span>
                <span className="text-[10px] font-semibold text-[#1B3A7A]/50 tracking-wider uppercase">
                  Est. 2023
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-bold text-[#1B3A7A] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Design Specifications
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between items-center border-b border-[#D0DAE4] pb-2">
              <span className="font-semibold text-[#1B3A7A]/60">Primary Navy</span>
              <code className="bg-[#F8FAFC] px-2 py-1 rounded text-xs font-mono text-[#1B3A7A]">#1B3A7A</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#D0DAE4] pb-2">
              <span className="font-semibold text-[#1B3A7A]/60">Brand Blue</span>
              <code className="bg-[#F8FAFC] px-2 py-1 rounded text-xs font-mono text-[#2D6BCC]">#2D6BCC</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#D0DAE4] pb-2">
              <span className="font-semibold text-[#1B3A7A]/60">Typeface</span>
              <code className="bg-[#F8FAFC] px-2 py-1 rounded text-xs font-mono">Inter</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#D0DAE4] pb-2">
              <span className="font-semibold text-[#1B3A7A]/60">ViewBox</span>
              <code className="bg-[#F8FAFC] px-2 py-1 rounded text-xs font-mono">64 × 64</code>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
