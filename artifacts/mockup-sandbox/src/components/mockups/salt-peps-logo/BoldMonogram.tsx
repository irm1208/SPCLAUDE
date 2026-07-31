export default function BoldMonogram() {
  return (
    <div className="min-h-screen overflow-hidden flex flex-col">
      {/* HERO SECTION - 58vh */}
      <section className="relative flex flex-col items-center justify-center bg-[#0B1829]" style={{ height: '58vh' }}>
        {/* Radial glow behind mark */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(45,107,204,0.2) 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />

        {/* Mark Badge - 200x200 */}
        <svg width="200" height="200" viewBox="0 0 64 64" className="relative z-10">
          <defs>
            <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1B3A7A" />
              <stop offset="100%" stopColor="#0F2044" />
            </linearGradient>
          </defs>
          
          {/* Rounded square badge background */}
          <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#badgeGrad)" />
          
          {/* Letter S */}
          <text 
            x="7" 
            y="44" 
            fontFamily="Inter,Arial,sans-serif" 
            fontSize="36" 
            fontWeight="900" 
            fill="white" 
            letterSpacing="-2"
          >
            S
          </text>
          
          {/* Separator dot */}
          <circle cx="34" cy="32" r="4" fill="#4A8FE8" />
          
          {/* Letter P */}
          <text 
            x="38" 
            y="44" 
            fontFamily="Inter,Arial,sans-serif" 
            fontSize="36" 
            fontWeight="900" 
            fill="white" 
            letterSpacing="-2"
          >
            P
          </text>
          
          {/* Subtle inner shadow/stroke */}
          <rect 
            x="2" 
            y="2" 
            width="60" 
            height="60" 
            rx="14" 
            fill="none" 
            stroke="rgba(255,255,255,0.08)" 
            strokeWidth="1.5" 
          />
        </svg>

        {/* Brand Name */}
        <h1 
          className="mt-8 text-white font-black"
          style={{ 
            fontFamily: 'Inter, sans-serif',
            fontSize: '46px',
            fontWeight: 900,
            letterSpacing: '-0.03em'
          }}
        >
          Salt &amp; Peps
        </h1>

        {/* Descriptor */}
        <p 
          className="mt-3 uppercase"
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.2em',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          · Advanced Peptide Science ·
        </p>
      </section>

      {/* WHITE SHOWCASE SECTION - 22vh */}
      <section 
        className="bg-white flex flex-row items-center justify-center gap-16"
        style={{ 
          height: '22vh',
          padding: '0 64px'
        }}
      >
        {/* Scale A - Small */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="badgeGradA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1B3A7A" />
                  <stop offset="100%" stopColor="#0F2044" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#badgeGradA)" />
              <text x="7" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">S</text>
              <circle cx="34" cy="32" r="4" fill="#4A8FE8" />
              <text x="38" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">P</text>
              <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            </svg>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, color: '#1B3A7A' }}>
              Salt &amp; Peps
            </span>
          </div>
          <span style={{ fontSize: '8px', color: '#94A3B8', letterSpacing: '0.15em', fontFamily: 'Inter, sans-serif' }}>
            FAVICON / APP ICON
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '80px', backgroundColor: '#E2E8F0' }} />

        {/* Scale B - Medium */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="badgeGradB" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1B3A7A" />
                  <stop offset="100%" stopColor="#0F2044" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#badgeGradB)" />
              <text x="7" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">S</text>
              <circle cx="34" cy="32" r="4" fill="#4A8FE8" />
              <text x="38" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">P</text>
              <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            </svg>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 800, color: '#0F1F38' }}>
              Salt &amp; Peps
            </span>
          </div>
          <span style={{ fontSize: '8px', color: '#94A3B8', letterSpacing: '0.15em', fontFamily: 'Inter, sans-serif' }}>
            STANDARD
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '80px', backgroundColor: '#E2E8F0' }} />

        {/* Scale C - Large */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-5">
            <svg width="96" height="96" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="badgeGradC" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1B3A7A" />
                  <stop offset="100%" stopColor="#0F2044" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#badgeGradC)" />
              <text x="7" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">S</text>
              <circle cx="34" cy="32" r="4" fill="#4A8FE8" />
              <text x="38" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">P</text>
              <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            </svg>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 900, color: '#0F1F38' }}>
              Salt &amp; Peps
            </span>
          </div>
          <span style={{ fontSize: '8px', color: '#94A3B8', letterSpacing: '0.15em', fontFamily: 'Inter, sans-serif' }}>
            HERO
          </span>
        </div>
      </section>

      {/* DARK STRIP SECTION - Remaining height */}
      <section 
        className="flex-1 flex flex-row items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, #1B3A7A 0%, #2D6BCC 100%)',
          padding: '28px 64px'
        }}
      >
        {/* Left - Logo + Name */}
        <div className="flex items-center gap-4">
          <svg width="48" height="48" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="badgeGradFooter" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1B3A7A" />
                <stop offset="100%" stopColor="#0F2044" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#badgeGradFooter)" />
            <text x="7" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">S</text>
            <circle cx="34" cy="32" r="4" fill="#4A8FE8" />
            <text x="38" y="44" fontFamily="Inter,Arial,sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="-2">P</text>
            <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          </svg>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white' }}>
            Salt &amp; Peps
          </span>
        </div>

        {/* Centre - Color Palette */}
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#4A8FE8' }} />
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif' }}>
              #4A8FE8
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#2D6BCC' }} />
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif' }}>
              #2D6BCC
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#1B3A7A' }} />
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif' }}>
              #1B3A7A
            </span>
          </div>
        </div>

        {/* Right - URL */}
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
          saltandpeps.co.uk
        </span>
      </section>
    </div>
  );
}
