export default function ApothecaryFx() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-12 flex flex-col gap-8">
      {/* Row 1: Two side-by-side cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        {/* Card A: Stacked vertical */}
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center justify-center gap-4">
          <svg viewBox="0 0 64 64" className="w-[72px] h-[72px]">
            {/* Mortar bowl */}
            <path
              d="M 16 40 Q 16 52 32 52 Q 48 52 48 40"
              stroke="#1B3A7A"
              strokeWidth="2.5"
              fill="rgba(27, 58, 122, 0.05)"
              strokeLinecap="round"
            />
            
            {/* Pestle */}
            <line
              x1="32"
              y1="18"
              x2="32"
              y2="42"
              stroke="#2D6BCC"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx="32"
              cy="18"
              r="3"
              fill="#2D6BCC"
            />
            
            {/* S&P Text */}
            <text
              x="32"
              y="34"
              fontFamily="Georgia, serif"
              fontSize="18"
              fontWeight="bold"
              fill="#1B3A7A"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              S&P
            </text>
            
            {/* Base lines (gold) */}
            <line
              x1="20"
              y1="54"
              x2="44"
              y2="54"
              stroke="#E9A020"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="22"
              y1="58"
              x2="42"
              y2="58"
              stroke="#E9A020"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="flex flex-col items-center gap-1">
            <h2 className="font-inter font-bold text-[28px] text-[#0F1F38] leading-none">
              Salt & Peps
            </h2>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A9AAA] font-medium">
              Pharmaceutical Grade
            </p>
          </div>
        </div>

        {/* Card B: Horizontal lockup */}
        <div className="bg-white rounded-2xl shadow-md p-8 flex items-center justify-center gap-5">
          <svg viewBox="0 0 64 64" className="w-[48px] h-[48px] flex-shrink-0">
            {/* Mortar bowl */}
            <path
              d="M 16 40 Q 16 52 32 52 Q 48 52 48 40"
              stroke="#1B3A7A"
              strokeWidth="2.5"
              fill="rgba(27, 58, 122, 0.05)"
              strokeLinecap="round"
            />
            
            {/* Pestle */}
            <line
              x1="32"
              y1="18"
              x2="32"
              y2="42"
              stroke="#2D6BCC"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx="32"
              cy="18"
              r="3"
              fill="#2D6BCC"
            />
            
            {/* S&P Text */}
            <text
              x="32"
              y="34"
              fontFamily="Georgia, serif"
              fontSize="18"
              fontWeight="bold"
              fill="#1B3A7A"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              S&P
            </text>
            
            {/* Base lines (gold) */}
            <line
              x1="20"
              y1="54"
              x2="44"
              y2="54"
              stroke="#E9A020"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="22"
              y1="58"
              x2="42"
              y2="58"
              stroke="#E9A020"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          
          <h2 className="font-inter font-extrabold text-[20px] text-[#1B3A7A] tracking-[0.12em] uppercase">
            Salt & Peps
          </h2>
        </div>
      </div>

      {/* Row 2: Wide showcase card (navy bg) */}
      <div className="bg-[#1B3A7A] rounded-2xl shadow-lg p-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <svg viewBox="0 0 64 64" className="w-[48px] h-[48px] flex-shrink-0">
            {/* Mortar bowl - white version */}
            <path
              d="M 16 40 Q 16 52 32 52 Q 48 52 48 40"
              stroke="white"
              strokeWidth="2.5"
              fill="rgba(255, 255, 255, 0.1)"
              strokeLinecap="round"
            />
            
            {/* Pestle - lighter blue */}
            <line
              x1="32"
              y1="18"
              x2="32"
              y2="42"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx="32"
              cy="18"
              r="3"
              fill="rgba(255, 255, 255, 0.9)"
            />
            
            {/* S&P Text - white */}
            <text
              x="32"
              y="34"
              fontFamily="Georgia, serif"
              fontSize="18"
              fontWeight="bold"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              S&P
            </text>
            
            {/* Base lines - gold */}
            <line
              x1="20"
              y1="54"
              x2="44"
              y2="54"
              stroke="#E9A020"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="22"
              y1="58"
              x2="42"
              y2="58"
              stroke="#E9A020"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          
          <h2 className="font-inter font-bold text-[24px] text-white tracking-tight">
            Salt & Peps
          </h2>
          
          <div className="hidden md:block w-[1px] h-12 bg-[#E9A020] opacity-40"></div>
          
          <p className="text-[14px] italic text-white/75 tracking-wide">
            Pure. Precise. Pharmaceutical.
          </p>
        </div>
      </div>
    </div>
  );
}
