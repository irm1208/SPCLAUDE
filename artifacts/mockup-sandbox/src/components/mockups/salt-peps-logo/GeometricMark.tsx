export default function GeometricMark() {
  const markPath = "M 164 0 C 188.301 0 208 19.7 208 44 C 208 45.417 207.93 46.818 207.799 48.2 C 209.182 48.07 210.583 48 212 48 C 236.301 48 256 67.7 256 92 C 256 106.883 248.609 120.037 237.3 128 C 248.609 135.963 256 149.117 256 164 C 256 188.301 236.301 208 212 208 C 210.583 208 209.182 207.93 207.799 207.799 C 207.93 209.182 208 210.583 208 212 C 208 236.301 188.301 256 164 256 C 149.117 256 135.963 248.609 128 237.3 C 120.037 248.609 106.883 256 92 256 C 67.7 256 48 236.301 48 212 C 48 210.583 48.07 209.182 48.2 207.799 C 46.804 207.932 45.402 207.999 44 208 C 19.7 208 0 188.301 0 164 C 0 149.118 7.39 135.963 18.7 128 C 7.39 120.037 0 106.882 0 92 C 0 67.7 19.7 48 44 48 C 45.417 48 46.818 48.07 48.2 48.2 C 48.07 46.818 48 45.417 48 44 C 48 19.7 67.7 0 92 0 C 106.882 0 120.037 7.39 128 18.7 C 135.963 7.39 149.118 0 164 0 Z M 128 69.3 C 120.037 80.61 106.883 88 92 88 C 90.583 88 89.182 87.93 87.799 87.799 C 87.932 89.195 87.999 90.597 88 92 C 88 106.883 80.61 120.037 69.3 128 C 80.61 135.963 88 149.117 88 164 C 88 165.417 87.93 166.818 87.799 168.2 C 89.182 168.069 90.583 168 92 168 C 106.882 168 120.037 175.39 128 186.699 C 135.963 175.39 149.118 168 164 168 C 165.417 168 166.818 168.069 168.2 168.2 C 168.067 166.804 168 165.402 168 164 C 168 149.118 175.39 135.963 186.699 128 C 175.39 120.037 168 106.882 168 92 C 168 90.583 168.069 89.182 168.2 87.799 C 166.804 87.932 165.402 87.999 164 88 C 149.117 88 135.963 80.61 128 69.3 Z";

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-10 flex flex-col items-center justify-center gap-8">
      <h1 className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-600">
        Geometric Mark
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-8">
        {/* Lockup 1: Light */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 flex items-center gap-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d={markPath} fill="#1B3A7A" />
            </svg>
            <div className="text-3xl font-inter">
              <span className="font-bold text-[#1B3A7A]">Salt</span>
              <span className="font-normal text-[#2D6BCC]"> & </span>
              <span className="font-bold text-[#1B3A7A]">Peps</span>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">
            Light
          </span>
        </div>

        {/* Lockup 2: Brand */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="rounded-2xl shadow-lg p-10 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d={markPath} fill="white" />
            </svg>
            <div className="text-3xl font-inter text-white">
              <span className="font-bold">Salt</span>
              <span className="font-normal"> & </span>
              <span className="font-bold">Peps</span>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">
            Brand
          </span>
        </div>

        {/* Lockup 3: Dark */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-[#0F1F38] rounded-2xl shadow-lg p-10 flex items-center gap-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="markGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#2D6BCC" />
                  <stop offset="100%" stopColor="#5A8FE8" />
                </linearGradient>
              </defs>
              <path d={markPath} fill="url(#markGradient)" />
            </svg>
            <div className="text-3xl font-inter text-white">
              <span className="font-bold">Salt</span>
              <span className="font-normal"> & </span>
              <span className="font-bold">Peps</span>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">
            Dark
          </span>
        </div>
      </div>
    </div>
  );
}
