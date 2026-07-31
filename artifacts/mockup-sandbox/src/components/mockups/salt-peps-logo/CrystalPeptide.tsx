export default function CrystalPeptide() {
  // Crystal & Peptide mark — hexagonal crystal with peptide chain
  const CrystalPeptideMark = ({ size = 64, className = "" }: { size?: number; className?: string }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="crystal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D6BCC" />
          <stop offset="100%" stopColor="#1B3A7A" />
        </linearGradient>
      </defs>
      
      {/* Hexagonal crystal outline */}
      <path
        d="M 32 8 L 50 20 L 50 44 L 32 56 L 14 44 L 14 20 Z"
        stroke="url(#crystal-gradient)"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Peptide chain — 3 amino acid residues connected by curved bonds */}
      {/* First residue */}
      <circle cx="24" cy="28" r="3" fill="url(#crystal-gradient)" />
      
      {/* Second residue (center) */}
      <circle cx="32" cy="32" r="3" fill="url(#crystal-gradient)" />
      
      {/* Third residue */}
      <circle cx="40" cy="28" r="3" fill="url(#crystal-gradient)" />
      
      {/* Peptide bonds — smooth curves connecting residues */}
      <path
        d="M 26.5 27 Q 29 29 29.5 31"
        stroke="url(#crystal-gradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 34.5 31 Q 37 29 37.5 27"
        stroke="url(#crystal-gradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );

  // White version for dark backgrounds
  const CrystalPeptideMarkWhite = ({ size = 64, className = "" }: { size?: number; className?: string }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hexagonal crystal outline */}
      <path
        d="M 32 8 L 50 20 L 50 44 L 32 56 L 14 44 L 14 20 Z"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Peptide chain */}
      <circle cx="24" cy="28" r="3" fill="white" />
      <circle cx="32" cy="32" r="3" fill="white" />
      <circle cx="40" cy="28" r="3" fill="white" />
      
      {/* Peptide bonds */}
      <path
        d="M 26.5 27 Q 29 29 29.5 31"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 34.5 31 Q 37 29 37.5 27"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1B3A7A] mb-2">Crystal & Peptide</h1>
          <p className="text-[#2D6BCC] text-lg">Salt & Peps Logo Concept</p>
        </div>

        {/* Lockup Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Lockup A — Stacked */}
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <CrystalPeptideMark size={60} />
              <div className="text-center">
                <div className="text-[22px] font-bold text-[#1B3A7A] leading-tight">Salt</div>
                <div className="text-[14px] text-[#2D6BCC]">& Peps</div>
              </div>
            </div>
          </div>

          {/* Lockup B — Horizontal */}
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <CrystalPeptideMark size={48} />
              <div className="text-[20px] font-semibold text-[#1B3A7A]">
                Salt & Peps
              </div>
            </div>
          </div>
        </div>

        {/* Hero / Full-bleed gradient version */}
        <div
          className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
          style={{
            background: "linear-gradient(135deg, #2D6BCC 0%, #1B3164 100%)",
            minHeight: "400px"
          }}
        >
          <CrystalPeptideMarkWhite size={80} className="mb-6" />
          <h2 className="text-[28px] font-bold text-white mb-2">Salt & Peps</h2>
          <p className="text-white/70 text-lg">Advanced Peptide Science</p>
        </div>

        {/* Mark showcase — isolated on white */}
        <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 flex items-center justify-center">
          <div className="text-center">
            <CrystalPeptideMark size={120} />
            <p className="text-sm text-gray-500 mt-6">Primary Mark</p>
          </div>
        </div>

        {/* Color specifications */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="w-full h-20 rounded-lg mb-3" style={{ background: "#2D6BCC" }} />
            <p className="text-sm font-mono text-gray-700">#2D6BCC</p>
            <p className="text-xs text-gray-500">Primary Blue</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="w-full h-20 rounded-lg mb-3" style={{ background: "#1B3A7A" }} />
            <p className="text-sm font-mono text-gray-700">#1B3A7A</p>
            <p className="text-xs text-gray-500">Navy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
