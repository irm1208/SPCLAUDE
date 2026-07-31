import React from 'react';

export default function CrystalPeptide() {
  // Hexagon points for flat-top orientation (radius 28 from center 32,32)
  // Angles: -90°, -30°, 30°, 90°, 150°, 210° in radians
  const hexPoints = [
    [32, 4],      // top
    [56.1, 18],   // top-right
    [56.1, 46],   // bottom-right
    [32, 60],     // bottom
    [7.9, 46],    // bottom-left
    [7.9, 18],    // top-left
  ].map(p => p.join(',')).join(' ');

  const Mark = ({ 
    size, 
    strokeColor = "#1B3A7A", 
    fillColor = "#2D6BCC",
    className = ""
  }: { 
    size: number; 
    strokeColor?: string; 
    fillColor?: string;
    className?: string;
  }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      className={className}
      style={{ filter: 'drop-shadow(0 2px 8px rgba(27, 58, 122, 0.15))' }}
    >
      {/* Hexagon stroke */}
      <polygon
        points={hexPoints}
        stroke={strokeColor}
        strokeWidth="4"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      
      {/* Peptide nodes */}
      <circle cx="22" cy="28" r="4.5" fill={fillColor} />
      <circle cx="32" cy="38" r="4.5" fill={fillColor} />
      <circle cx="42" cy="28" r="4.5" fill={fillColor} />
      
      {/* Connecting curves */}
      <path
        d="M 22 28 Q 24 36 32 38"
        stroke={fillColor}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 32 38 Q 40 36 42 28"
        stroke={fillColor}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div className="min-h-screen overflow-hidden flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* SECTION 1 - HERO */}
      <section 
        className="relative flex flex-col items-center justify-center"
        style={{
          height: '60vh',
          background: '#F8FAFC',
          backgroundImage: 'radial-gradient(circle at center, #E8F0FE 0%, transparent 60%)',
        }}
      >
        {/* Concept label */}
        <div 
          className="absolute top-8 left-10 uppercase tracking-widest"
          style={{
            fontSize: '9px',
            color: '#94A3B8',
            letterSpacing: '0.15em',
          }}
        >
          Crystal & Peptide
        </div>

        {/* Large centered mark with glow */}
        <div 
          className="relative"
          style={{
            filter: 'drop-shadow(0 8px 32px rgba(45, 107, 204, 0.12))',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle, rgba(45, 107, 204, 0.08) 0%, transparent 70%)',
              transform: 'scale(1.4)',
              filter: 'blur(40px)',
            }}
          />
          <Mark size={180} />
        </div>

        {/* Brand name */}
        <h1 
          className="mt-8"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            fontSize: '48px',
            color: '#0F1F38',
            letterSpacing: '-0.03em',
          }}
        >
          Salt & Peps
        </h1>

        {/* Tagline */}
        <p 
          className="uppercase tracking-widest mt-3"
          style={{
            fontSize: '13px',
            color: '#94A3B8',
            letterSpacing: '0.15em',
          }}
        >
          Advanced Peptide Science
        </p>
      </section>

      {/* SECTION 2 - DARK HERO */}
      <section 
        className="flex flex-col items-center justify-center"
        style={{
          height: '30vh',
          background: 'linear-gradient(135deg, #0F2044 0%, #1B3A7A 50%, #0F2044 100%)',
        }}
      >
        {/* Horizontal lockup */}
        <div className="flex items-center gap-6 mb-6">
          <Mark size={100} strokeColor="#7BB3F0" fillColor="#7BB3F0" />
          <h2 
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: '32px',
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            Salt & Peps
          </h2>
        </div>

        {/* Divider and details */}
        <div className="flex flex-col items-center">
          <div 
            style={{
              width: '200px',
              height: '1px',
              background: 'rgba(255, 255, 255, 0.2)',
              marginBottom: '12px',
            }}
          />
          <p 
            className="uppercase tracking-widest"
            style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.15em',
            }}
          >
            EST. 2024 · PHARMACEUTICAL GRADE
          </p>
        </div>
      </section>

      {/* SECTION 3 - COLOUR PALETTE */}
      <section 
        className="flex-1 flex items-center px-16 py-8"
        style={{
          background: 'white',
        }}
      >
        <div className="w-full">
          <div 
            className="uppercase tracking-widest mb-6"
            style={{
              fontSize: '9px',
              color: '#94A3B8',
              letterSpacing: '0.15em',
            }}
          >
            Brand Palette
          </div>
          
          <div className="flex gap-6">
            {[
              { hex: '#1B3A7A', name: 'Primary' },
              { hex: '#2D6BCC', name: 'Core' },
              { hex: '#4A8FE8', name: 'Light' },
              { hex: '#0F2044', name: 'Deep' },
            ].map(({ hex, name }) => (
              <div key={hex} className="flex flex-col items-center gap-3">
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '9999px',
                    background: hex,
                    boxShadow: `0 4px 12px ${hex}40`,
                  }}
                />
                <div className="flex flex-col items-center gap-1">
                  <span 
                    style={{
                      fontSize: '10px',
                      color: '#64748B',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {name}
                  </span>
                  <span 
                    style={{
                      fontSize: '11px',
                      color: '#94A3B8',
                      fontFamily: 'monospace',
                    }}
                  >
                    {hex}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
