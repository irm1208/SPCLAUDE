import React from 'react';
import { ArrowRight, MoveRight, Beaker, Library, ShoppingCart, User, Cpu, CircleDashed } from 'lucide-react';

export function StarkPro() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-sans selection:bg-[#ccff00] selection:text-black">
      <style dangerouslySetInterInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Oswald:wght@400;500;600;700&display=swap');
          .font-display { font-family: 'Oswald', sans-serif; }
          .font-body { font-family: 'Inter', sans-serif; }
          
          /* Hairline grid background */
          .bg-grid {
            background-size: 100px 100px;
            background-image: 
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          }
        `
      }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-[#222]">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between font-body text-sm tracking-wide">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 font-display text-xl font-medium tracking-tight">
              <span className="w-6 h-6 bg-[#ededed] text-[#050505] flex items-center justify-center font-bold text-xs">S</span>
              <span className="w-6 h-6 bg-transparent border border-[#ededed] flex items-center justify-center font-bold text-xs">P</span>
              <span className="ml-2">SALT & PEPS</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-[#888]">
              <div className="group relative cursor-pointer hover:text-[#ededed] transition-colors">
                <span className="flex items-center gap-1">SHOP</span>
              </div>
              <div className="group relative cursor-pointer hover:text-[#ededed] transition-colors">
                <span className="flex items-center gap-1">RESEARCH</span>
              </div>
              <div className="group relative cursor-pointer hover:text-[#ededed] transition-colors">
                <span className="flex items-center gap-1">TOOLS</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-[#888] hover:text-[#ededed] transition-colors">LOG IN</button>
            <button className="bg-[#ccff00] text-[#050505] px-4 py-2 font-medium hover:bg-[#b3e600] transition-colors flex items-center gap-2">
              SIGN UP <MoveRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 max-w-[1280px] mx-auto px-6 font-body">
        
        {/* Hero Section */}
        <section className="mb-32 relative">
          <div className="absolute inset-0 bg-grid -z-10 opacity-30 mask-image-fade" style={{ WebkitMaskImage: 'radial-gradient(ellipse at top, black 40%, transparent 70%)' }}></div>
          
          <div className="max-w-4xl">
            <h1 className="font-display text-[7rem] leading-[0.9] tracking-tighter uppercase font-medium mb-8 text-[#ededed]">
              Precision <br />
              <span className="text-[#888]">Peptide</span> <br />
              Sourcing.
            </h1>
            <p className="text-xl text-[#888] max-w-xl leading-relaxed mb-12 font-light">
              Strictly vetted compounds for research. Group buy access, third-party lab verification, and uncompromising quality control.
            </p>
            
            <div className="flex items-center gap-4">
              <button className="bg-[#ededed] text-[#050505] px-8 py-4 font-medium text-sm tracking-wider uppercase hover:bg-white transition-colors flex items-center gap-3">
                Join a Group Buy <MoveRight className="w-4 h-4" />
              </button>
              <button className="border border-[#333] text-[#ededed] px-8 py-4 font-medium text-sm tracking-wider uppercase hover:border-[#ededed] hover:bg-[#111] transition-all flex items-center gap-3">
                Browse Lonely Vials
              </button>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-[#222] mb-24"></div>

        {/* Community Testing Pools */}
        <section className="mb-24 flex flex-col md:flex-row items-end justify-between gap-8">
          <div className="max-w-xl">
            <div className="text-[#ccff00] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
              <CircleDashed className="w-4 h-4 animate-[spin_4s_linear_infinite]" />
              Initiative
            </div>
            <h2 className="font-display text-4xl tracking-tight uppercase mb-4">Community Testing Pools</h2>
            <p className="text-[#888] text-lg font-light">Lab test peptides as a group — split the cost, share the results, verify the source together.</p>
          </div>
          <button className="group flex items-center gap-3 border border-[#333] px-6 py-3 hover:border-[#ccff00] hover:text-[#ccff00] transition-colors uppercase text-sm tracking-widest font-medium">
            View Pools 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-[#222] mb-24"></div>

        {/* Single Vials */}
        <section>
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-4xl tracking-tight uppercase mb-2">Single Vials</h2>
              <p className="text-[#888] font-light">In stock now. Ready to ship.</p>
            </div>
            <button className="text-[#888] hover:text-[#ededed] transition-colors uppercase text-sm tracking-widest font-medium flex items-center gap-2">
              Browse All Vials <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-l border-[#222]">
            {/* Table Header */}
            <div className="grid grid-cols-12 border-b border-[#222] bg-[#0a0a0a] text-xs uppercase tracking-widest text-[#555] font-medium">
              <div className="col-span-6 md:col-span-8 p-4 border-r border-[#222]">Product</div>
              <div className="col-span-3 md:col-span-2 p-4 border-r border-[#222]">Volume</div>
              <div className="col-span-3 md:col-span-2 p-4 border-r border-[#222]">Price / Action</div>
            </div>

            {/* Product 1 */}
            <div className="grid grid-cols-12 border-b border-[#222] group hover:bg-[#0a0a0a] transition-colors">
              <div className="col-span-6 md:col-span-8 p-6 border-r border-[#222] flex flex-col justify-center">
                <span className="text-lg font-medium tracking-tight mb-1">25x Genetek Bac Water Ampoules</span>
                <span className="text-sm text-[#555]">Sterile preparation</span>
              </div>
              <div className="col-span-3 md:col-span-2 p-6 border-r border-[#222] flex items-center text-[#888]">
                10ml / ea
              </div>
              <div className="col-span-3 md:col-span-2 p-6 border-r border-[#222] flex flex-col justify-between items-start">
                <span className="font-display text-xl mb-4">£12.50</span>
                <button className="text-[#ccff00] text-xs font-bold tracking-widest uppercase hover:text-white transition-colors flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            {/* Product 2 */}
            <div className="grid grid-cols-12 border-b border-[#222] group hover:bg-[#0a0a0a] transition-colors">
              <div className="col-span-6 md:col-span-8 p-6 border-r border-[#222] flex flex-col justify-center">
                <span className="text-lg font-medium tracking-tight mb-1">50x Genetek Bac Water Ampoules</span>
                <span className="text-sm text-[#555]">Bulk sterile preparation</span>
              </div>
              <div className="col-span-3 md:col-span-2 p-6 border-r border-[#222] flex items-center text-[#888]">
                10ml / ea
              </div>
              <div className="col-span-3 md:col-span-2 p-6 border-r border-[#222] flex flex-col justify-between items-start">
                <span className="font-display text-xl mb-4">£25.00</span>
                <button className="text-[#ccff00] text-xs font-bold tracking-widest uppercase hover:text-white transition-colors flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            {/* Product 3 */}
            <div className="grid grid-cols-12 border-b border-[#222] group hover:bg-[#0a0a0a] transition-colors">
              <div className="col-span-6 md:col-span-8 p-6 border-r border-[#222] flex flex-col justify-center">
                <span className="text-lg font-medium tracking-tight mb-1">Genetek BAC Water Ampoule</span>
                <span className="text-sm text-[#555]">Single sterile unit</span>
              </div>
              <div className="col-span-3 md:col-span-2 p-6 border-r border-[#222] flex items-center text-[#888]">
                10ml
              </div>
              <div className="col-span-3 md:col-span-2 p-6 border-r border-[#222] flex flex-col justify-between items-start">
                <span className="font-display text-xl mb-4">£1.50</span>
                <button className="text-[#ccff00] text-xs font-bold tracking-widest uppercase hover:text-white transition-colors flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="mt-32 pt-12 border-t border-[#222] flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-[#555]">
          <div className="flex items-center gap-2 font-display text-lg tracking-tight text-[#888] mb-4 md:mb-0">
            <span className="w-5 h-5 bg-[#555] text-[#050505] flex items-center justify-center font-bold text-[10px]">S</span>
            <span className="w-5 h-5 bg-transparent border border-[#555] flex items-center justify-center font-bold text-[10px]">P</span>
            <span className="ml-1">SALT & PEPS</span>
          </div>
          <div className="flex gap-8">
            <span className="hover:text-[#888] cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-[#888] cursor-pointer transition-colors">Research Only</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
