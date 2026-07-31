export default function ApothecaryFx() {
  return (
    <div className="min-h-screen overflow-hidden flex flex-col bg-[#060E1A]">
      {/* SECTION 1 — HERO */}
      <section 
        className="relative flex-shrink-0 flex flex-col items-center justify-center"
        style={{ 
          height: '65vh',
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, #0D2044 0%, #060E1A 100%)'
        }}
      >
        {/* Concept label */}
        <div className="absolute top-8 left-10 text-[9px] tracking-[0.25em] text-[#4A6FA5] uppercase font-semibold">
          APOTHECARY RX
        </div>

        {/* Blue glow behind mark */}
        <div 
          className="absolute"
          style={{
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(45,107,204,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />

        {/* Amber glow offset */}
        <div 
          className="absolute"
          style={{
            width: '300px',
            height: '300px',
            bottom: '10%',
            right: '20%',
            background: 'radial-gradient(circle, rgba(233,160,32,0.08) 0%, transparent 70%)',
            filter: 'blur(80px)',
            pointerEvents: 'none'
          }}
        />

        {/* Amber accent bar */}
        <div className="w-10 h-[2px] bg-[#E9A020] mb-10" />

        {/* Main mark */}
        <svg 
          width="160" 
          height="160" 
          viewBox="0 0 64 64" 
          className="relative z-10"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(45,107,204,0.3))' }}
        >
          <defs>
            <linearGradient id="rxGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2D6BCC" />
              <stop offset="100%" stopColor="#1B3164" />
            </linearGradient>
          </defs>
          <text 
            x="8" 
            y="52" 
            fontFamily="Georgia, serif" 
            fontSize="54" 
            fontWeight="bold" 
            fill="url(#rxGrad)"
          >
            ℞
          </text>
          <line 
            x1="4" 
            y1="58" 
            x2="60" 
            y2="58" 
            stroke="#E9A020" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
          <circle cx="57" cy="14" r="5" fill="#E9A020" />
        </svg>

        {/* Brand name */}
        <h1 
          className="mt-6 text-white font-black text-[50px] leading-none"
          style={{ 
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            letterSpacing: '-0.02em'
          }}
        >
          SALT & PEPS
        </h1>

        {/* Descriptor */}
        <p 
          className="mt-3 text-[14px] italic"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          Pure. Precise. Pharmaceutical.
        </p>
      </section>

      {/* SECTION 2 — LIGHT LOCKUP */}
      <section 
        className="flex-shrink-0 bg-[#F1F5F9] flex items-center px-16 gap-10"
        style={{ height: '20vh' }}
      >
        {/* Horizontal lockup */}
        <div className="flex-1 flex items-center gap-6">
          <svg 
            width="72" 
            height="72" 
            viewBox="0 0 64 64"
          >
            <defs>
              <linearGradient id="rxGrad2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2D6BCC" />
                <stop offset="100%" stopColor="#1B3164" />
              </linearGradient>
            </defs>
            <text 
              x="8" 
              y="52" 
              fontFamily="Georgia, serif" 
              fontSize="54" 
              fontWeight="bold" 
              fill="url(#rxGrad2)"
            >
              ℞
            </text>
            <line 
              x1="4" 
              y1="58" 
              x2="60" 
              y2="58" 
              stroke="#E9A020" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <circle cx="57" cy="14" r="5" fill="#E9A020" />
          </svg>
          <div className="flex flex-col">
            <span 
              className="text-[28px] text-[#0B1829] font-extrabold"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}
            >
              Salt & Peps
            </span>
            <div className="w-[60px] h-[2px] bg-[#E9A020] mt-1" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-16 bg-slate-200" />

        {/* Vertical lockup */}
        <div className="flex-1 flex flex-col items-start">
          <svg 
            width="56" 
            height="56" 
            viewBox="0 0 64 64"
            className="mb-3"
          >
            <defs>
              <linearGradient id="rxGrad3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2D6BCC" />
                <stop offset="100%" stopColor="#1B3164" />
              </linearGradient>
            </defs>
            <text 
              x="8" 
              y="52" 
              fontFamily="Georgia, serif" 
              fontSize="54" 
              fontWeight="bold" 
              fill="url(#rxGrad3)"
            >
              ℞
            </text>
            <line 
              x1="4" 
              y1="58" 
              x2="60" 
              y2="58" 
              stroke="#E9A020" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <circle cx="57" cy="14" r="5" fill="#E9A020" />
          </svg>
          <span 
            className="text-[18px] text-[#1B3A7A] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
          >
            SALT & PEPS
          </span>
          <span 
            className="text-[10px] text-[#94A3B8] tracking-widest mt-1 uppercase"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Pharmaceutical Grade
          </span>
        </div>
      </section>

      {/* SECTION 3 — GOLD BAR */}
      <section 
        className="flex-1 bg-[#E9A020] px-16 py-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 64 64"
          >
            <text 
              x="8" 
              y="52" 
              fontFamily="Georgia, serif" 
              fontSize="54" 
              fontWeight="bold" 
              fill="white"
            >
              ℞
            </text>
            <line 
              x1="4" 
              y1="58" 
              x2="60" 
              y2="58" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <circle cx="57" cy="14" r="5" fill="white" />
          </svg>
          <span 
            className="text-white text-[20px] font-bold"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
          >
            Salt & Peps
          </span>
        </div>

        <span 
          className="text-[13px] font-bold tracking-[0.2em]"
          style={{ 
            fontFamily: 'Inter, sans-serif', 
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)'
          }}
        >
          EST. 2024
        </span>
      </section>
    </div>
  );
}
