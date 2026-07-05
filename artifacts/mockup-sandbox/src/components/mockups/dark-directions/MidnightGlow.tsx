import React from "react";
import { ArrowRight, Beaker, FlaskConical, Droplet, ChevronRight, Activity, Search, ShieldCheck } from "lucide-react";

export function MidnightGlow() {
  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-white/20 font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        :root {
          --glow-primary: rgba(140, 150, 255, 0.15);
          --glow-secondary: rgba(100, 255, 200, 0.1);
        }

        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }

        .ambient-glow {
          position: fixed;
          top: -20vh;
          left: 50%;
          transform: translateX(-50%);
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at 50% 0%, var(--glow-primary) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .ambient-glow-bottom {
          position: fixed;
          bottom: -50vh;
          right: -20vw;
          width: 80vw;
          height: 80vh;
          background: radial-gradient(circle at 50% 50%, var(--glow-secondary) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .text-glow {
          text-shadow: 0 0 40px rgba(255,255,255,0.3);
        }
      `}} />

      <div className="ambient-glow" />
      <div className="ambient-glow-bottom" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 border-x-0 border-t-0 bg-[#050508]/60">
        <div className="max-w-[1280px] mx-auto px-8 h-20 flex items-center justify-between font-outfit">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#050508] font-bold tracking-tighter">
                S&P
              </div>
              <span className="font-medium tracking-wide text-sm opacity-90 group-hover:opacity-100 transition-opacity">Salt & Peps</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
              <div className="group relative cursor-pointer hover:text-white transition-colors">
                SHOP
                <div className="absolute top-full left-0 mt-4 w-48 glass-panel rounded-lg p-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all">
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Group Buy</div>
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Lonely Vial</div>
                </div>
              </div>
              <div className="group relative cursor-pointer hover:text-white transition-colors">
                RESEARCH
                <div className="absolute top-full left-0 mt-4 w-48 glass-panel rounded-lg p-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all">
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Protocols</div>
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Learning Hub</div>
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Lab Tests</div>
                </div>
              </div>
              <div className="group relative cursor-pointer hover:text-white transition-colors">
                TOOLS
                <div className="absolute top-full left-0 mt-4 w-48 glass-panel rounded-lg p-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all">
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Calculator</div>
                  <div className="p-2 hover:bg-white/5 rounded cursor-pointer">Feedback</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium font-outfit">
            <button className="text-white/60 hover:text-white transition-colors">Sign In</button>
            <button className="bg-white text-black px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors">
              Create Account
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-[1280px] mx-auto px-8 pt-48 pb-32 font-outfit">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-medium text-white/70 mb-8">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Group buy #42 closing in 3 days</span>
          </div>
          <h1 className="text-7xl md:text-[6rem] font-medium leading-[0.9] tracking-tighter mb-8 text-glow">
            Precision.<br/>
            Verified.<br/>
            Delivered.
          </h1>
          <p className="text-xl text-white/50 max-w-xl leading-relaxed mb-12 font-light">
            Research-grade compounds curated for the community. Independent lab tests. Transparent group buying.
          </p>
          <div className="flex items-center gap-4">
            <button className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-colors flex items-center gap-2">
              Explore Catalog <ArrowRight className="w-4 h-4" />
            </button>
            <button className="glass-panel px-8 py-4 rounded-full font-medium text-white hover:bg-white/5 transition-colors">
              View Lab Reports
            </button>
          </div>
        </div>

        {/* Community Testing Pools Callout */}
        <div className="mt-32 w-full">
          <div className="relative overflow-hidden rounded-2xl glass-panel p-10 flex items-center justify-between group cursor-pointer border border-white/10 hover:border-white/20 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-8">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-medium tracking-tight mb-2">Community Testing Pools</h3>
                <p className="text-white/50 text-lg font-light">Lab test peptides as a group — split the cost.</p>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
              View pools <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Single Vials Section */}
        <div className="mt-32">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-medium tracking-tight mb-2">Single vials</h2>
              <p className="text-white/50 text-lg font-light">In stock now, ready for immediate dispatch.</p>
            </div>
            <button className="text-sm font-medium text-white/50 hover:text-white flex items-center gap-1 transition-colors">
              Browse all vials <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "25x Genetek Bac Water Ampoules", price: "£12.50", vol: "10ml each", icon: Droplet },
              { title: "50x Genetek Bac Water Ampoules", price: "£25.00", vol: "10ml each", icon: Beaker },
              { title: "Genetek BAC Water 10ml Ampoule", price: "£1.50", vol: "10ml", icon: FlaskConical },
            ].map((product, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 flex flex-col justify-between h-64 group hover:bg-white/[0.03] transition-colors cursor-pointer border border-white/5 hover:border-white/10">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-white/50 group-hover:text-white transition-colors group-hover:scale-110 duration-500">
                    <product.icon className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="text-lg font-medium tracking-tight text-white/90 group-hover:text-white transition-colors">{product.title}</h4>
                  <p className="text-sm text-white/40 mt-1 font-light">{product.vol}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl font-medium">{product.price}</span>
                  <button className="px-4 py-2 rounded-full bg-white/10 text-sm font-medium hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300">
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-32 py-12 font-outfit">
        <div className="max-w-[1280px] mx-auto px-8 flex justify-between items-center text-sm text-white/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-[10px] font-bold">
              S&P
            </div>
            <span>© 2026 Salt & Peps.</span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
