import React from "react";
import { ArrowRight, ChevronRight, Play } from "lucide-react";

export function EditorialMagazine() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a2e] font-sans selection:bg-[#c9a84c] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a2e]/10 py-6 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-[#faf9f6]/90 backdrop-blur-sm z-50">
        <div className="flex gap-8 text-sm tracking-widest uppercase items-center">
          <span className="font-semibold hidden md:block">Issue No. 42</span>
          <span className="text-black/50 hidden md:block">May 2026</span>
        </div>
        <div className="text-2xl font-serif tracking-tight font-medium text-center absolute left-1/2 -translate-x-1/2">
          THE JOURNAL
        </div>
        <div className="flex gap-6 items-center text-sm font-medium tracking-wide uppercase">
          <button className="hover:text-[#c9a84c] transition-colors">Log In</button>
          <button className="bg-[#1a1a2e] text-[#faf9f6] px-5 py-2 hover:bg-[#1a1a2e]/90 transition-colors">
            Subscribe
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto">
        {/* Hero Section */}
        <section className="relative h-[80vh] min-h-[600px] w-full flex flex-col justify-end p-6 md:p-12 lg:p-24 overflow-hidden border-b border-[#1a1a2e]/10">
          <div className="absolute inset-0 bg-[#1a1a2e]">
            <img
              src="/__mockup/images/editorial-hero.png"
              alt="Atmospheric lab equipment"
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e]/40 to-transparent" />
          </div>
          
          <div className="relative z-10 max-w-4xl">
            <p className="text-[#c9a84c] tracking-widest uppercase text-sm font-semibold mb-6 flex items-center gap-4">
              <span className="h-px w-12 bg-[#c9a84c]"></span>
              This Month's Feature
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-[#faf9f6] leading-[1.1] tracking-tight mb-8">
              The Most Anticipated<br />Compound of Q2
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-8 sm:items-end justify-between mt-12 border-t border-white/20 pt-8">
              <div className="text-[#faf9f6]/80 max-w-md font-serif text-lg leading-relaxed">
                An exclusive first look at the BPC-157 + TB-500 synchronized release protocol. Limited allocation available for verified members.
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Allocation Price</p>
                  <p className="text-[#faf9f6] text-2xl font-serif">$145.00</p>
                </div>
                <button className="h-14 w-14 rounded-full border border-[#c9a84c] text-[#c9a84c] flex items-center justify-center hover:bg-[#c9a84c] hover:text-[#1a1a2e] transition-colors group">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 p-6 md:p-12 lg:p-24 border-b border-[#1a1a2e]/10">
          
          {/* Left Column: Editorial */}
          <article className="lg:col-span-8 lg:border-r border-[#1a1a2e]/10 lg:pr-24">
            <div className="flex items-center gap-4 mb-8">
              <span className="w-3 h-3 rounded-full bg-[#6b7a5c]"></span>
              <span className="text-xs uppercase tracking-widest font-semibold text-[#6b7a5c]">Active Group Buy</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-serif leading-tight mb-8">
              Why the BPC-157 + TB-500 Blend demands your attention this season.
            </h2>
            
            <div className="space-y-6 text-[#1a1a2e]/80 text-lg leading-relaxed font-serif">
              <p>
                <span className="float-left text-7xl font-serif leading-none pr-4 pt-2 text-[#1a1a2e]">F</span>
                or years, the research community has debated the optimal administration protocols for recovery compounds. While individual trials of BPC-157 and TB-500 have yielded substantial data, the synergistic application has remained largely theoretical—until now.
              </p>
              <p>
                This month's featured group buy introduces a precision-formulated blend, designed to eliminate the variables of sequential administration. The compounding process utilized by our partnered facility ensures equal distribution and unparalleled purity.
              </p>
              <p>
                "The literature has long suggested a compounding effect when these two structures are introduced simultaneously," notes our lead analyst. "What we're seeing in the preliminary spectroscopy confirms the stability of the bond."
              </p>
            </div>
            
            <div className="mt-12 p-8 bg-[#1a1a2e]/5 border-l-2 border-[#c9a84c]">
              <h3 className="text-xl font-serif mb-4">Protocol Specifications</h3>
              <ul className="space-y-3 text-sm text-[#1a1a2e]/70 font-sans uppercase tracking-wider">
                <li className="flex justify-between border-b border-[#1a1a2e]/10 pb-3">
                  <span>Volume</span> <span className="font-semibold text-[#1a1a2e]">5mg / 5mg</span>
                </li>
                <li className="flex justify-between border-b border-[#1a1a2e]/10 pb-3">
                  <span>Purity Standard</span> <span className="font-semibold text-[#1a1a2e]">&gt; 99.4%</span>
                </li>
                <li className="flex justify-between pb-3">
                  <span>Allocation Limit</span> <span className="font-semibold text-[#1a1a2e]">10 Vials per Member</span>
                </li>
              </ul>
            </div>
          </article>

          {/* Right Column: Sidebar */}
          <aside className="lg:col-span-4 space-y-16">
            
            {/* TOC */}
            <div>
              <h3 className="text-sm font-semibold tracking-widest uppercase mb-8 border-b border-[#1a1a2e] pb-4 flex justify-between items-center">
                <span>The Horizon</span>
                <span className="text-[#c9a84c]">Upcoming</span>
              </h3>
              <div className="space-y-6">
                {[
                  { title: "Tirzepatide 15mg", date: "June 12", category: "Metabolic" },
                  { title: "Retatrutide 10mg", date: "June 28", category: "Metabolic" },
                  { title: "Ipamorelin / CJC-1295", date: "July 05", category: "Recovery" }
                ].map((item, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-serif text-lg group-hover:text-[#c9a84c] transition-colors">{item.title}</h4>
                      <span className="text-xs text-[#1a1a2e]/50 font-serif italic">{item.date}</span>
                    </div>
                    <p className="text-xs uppercase tracking-widest text-[#6b7a5c]">{item.category}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Community Lab Results */}
            <div>
              <h3 className="text-sm font-semibold tracking-widest uppercase mb-8 border-b border-[#1a1a2e] pb-4 flex justify-between items-center">
                <span>Lab Results</span>
                <span className="text-[#6b7a5c]">Verified</span>
              </h3>
              <div className="space-y-8">
                <div className="bg-[#1a1a2e] text-[#faf9f6] p-6 relative overflow-hidden group cursor-pointer">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-[#c9a84c] mb-2">Janoshik Analytical</p>
                  <h4 className="font-serif text-2xl mb-4">GHK-Cu 50mg</h4>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-serif text-[#faf9f6]">99.8</span>
                    <span className="text-[#faf9f6]/60 pb-1">% Purity</span>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest hover:text-[#c9a84c] transition-colors">
                    View Certificate <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="border border-[#1a1a2e]/20 p-6 hover:bg-[#1a1a2e]/5 transition-colors cursor-pointer">
                   <p className="text-xs uppercase tracking-widest text-[#6b7a5c] mb-2">MZ Biolabs</p>
                  <h4 className="font-serif text-xl mb-3">Semaglutide 10mg</h4>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-serif">99.6</span>
                    <span className="text-[#1a1a2e]/60 pb-1">% Purity</span>
                  </div>
                </div>
              </div>
            </div>

          </aside>
        </section>

        {/* Footer / Catalog */}
        <section className="p-6 md:p-12 lg:p-24 bg-[#1a1a2e] text-[#faf9f6]">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-16 border-b border-white/20 pb-8">
            <h2 className="text-4xl md:text-5xl font-serif">The Archive</h2>
            <p className="text-sm uppercase tracking-widest text-[#c9a84c] mt-4 md:mt-0">Available for immediate dispatch</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { name: "Tesamorelin", desc: "10mg • Lyophilized", price: "$45.00" },
              { name: "MOTS-c", desc: "10mg • Lyophilized", price: "$65.00" },
              { name: "AOD-9604", desc: "2mg • Lyophilized", price: "$35.00" }
            ].map((item, i) => (
              <div key={i} className="group border-t border-white/10 pt-6 cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-serif group-hover:text-[#c9a84c] transition-colors">{item.name}</h3>
                  <span className="font-serif">{item.price}</span>
                </div>
                <p className="text-white/50 text-sm uppercase tracking-widest mb-6">{item.desc}</p>
                <button className="text-xs uppercase tracking-widest flex items-center gap-2 text-[#c9a84c] opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Request Allocation <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-32 text-center text-white/30 text-xs uppercase tracking-widest">
            <p>© 2026 The Journal. For academic research purposes only.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
