import React from "react";
import { ArrowRight, Beaker, FileText, ShieldCheck, Droplet, ArrowDownRight, ExternalLink } from "lucide-react";
import "./_group.css";

export function Home() {
  return (
    <div className="apoth-theme min-h-screen w-full flex flex-col items-center selection:bg-[#4a5d4e] selection:text-white">
      
      {/* Top Nav */}
      <header className="w-full max-w-[1280px] px-8 py-6 flex justify-between items-center apoth-border-b">
        <div className="apoth-display text-2xl tracking-tight">Salt &amp; Peps.</div>
        <nav className="hidden md:flex items-center gap-8 apoth-eyebrow">
          <a href="#" className="hover:text-[#2c2a26] transition-colors">Group Buy</a>
          <a href="#" className="hover:text-[#2c2a26] transition-colors">Single Vials</a>
          <a href="#" className="hover:text-[#2c2a26] transition-colors">Lab Reports</a>
          <a href="#" className="hover:text-[#2c2a26] transition-colors">Testing Pools</a>
          <a href="#" className="hover:text-[#2c2a26] transition-colors">Learn</a>
        </nav>
        <a href="#" className="apoth-eyebrow hover:text-[#2c2a26] transition-colors">Account</a>
      </header>

      {/* Hero */}
      <section className="w-full max-w-[1280px] px-8 pt-32 pb-24 grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-8 flex flex-col items-start">
          <span className="apoth-eyebrow mb-8">Chapter I. The Collective</span>
          <h1 className="apoth-display text-6xl md:text-8xl leading-[0.95] mb-8 text-[#2c2a26]">
            Join the next<br/>group buy.
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed text-[#6b6963] max-w-2xl mb-12 apoth-dropcap">
            A private collective for member-only sourcing of research compounds. 
            We pool our capital to secure wholesale pricing directly from verified synthesis laboratories. 
            Transactions are conducted entirely in USDT to preserve autonomy, with zero KYC required.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <a href="#" className="px-8 py-4 bg-[#2c2a26] text-white apoth-eyebrow tracking-widest hover:bg-[#4a5d4e] transition-colors flex items-center gap-3">
              View Group Buy <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#" className="apoth-eyebrow text-[#6b6963] hover:text-[#2c2a26] transition-colors border-b border-transparent hover:border-[#2c2a26] pb-1">
              Browse Single Vials
            </a>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="w-full apoth-border-y bg-[#ffffff]">
        <div className="max-w-[1280px] mx-auto px-8 py-6 flex flex-wrap justify-between items-center gap-8 apoth-eyebrow text-[0.65rem]">
          <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#4a5d4e]" /> Independently tested by Janoshik</span>
          <span className="flex items-center gap-2"><span className="text-[#4a5d4e]">₮</span> USDT exclusively</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#4a5d4e]"></span> Zero KYC</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#4a5d4e]"></span> 4,281 Active Members</span>
        </div>
      </section>

      {/* Single Vials */}
      <section className="w-full max-w-[1280px] px-8 py-32">
        <div className="flex justify-between items-end mb-16 apoth-border-b pb-8">
          <div>
            <span className="apoth-eyebrow block mb-4">Chapter II. The Dispensary</span>
            <h2 className="apoth-display text-5xl">Single Vials.</h2>
          </div>
          <p className="apoth-eyebrow text-right max-w-xs">
            Curated surplus from previous group buys. Available immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {/* Card 1 */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] bg-[#ffffff] apoth-border p-6 flex flex-col relative group cursor-pointer hover:border-[#4a5d4e] transition-colors">
              <div className="absolute top-4 right-4 apoth-eyebrow text-[0.6rem]">No. 01</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-32 border-x-2 border-b-2 border-t-[12px] border-[#e6e4df] rounded-b-xl rounded-t-sm flex flex-col justify-end p-2 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#2c2a26] rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-[#f8f7f4] border-t border-[#e6e4df] rounded-b-lg"></div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-[#e6e4df]">
                <h3 className="apoth-display text-2xl mb-1">BPC-157</h3>
                <div className="flex justify-between items-center">
                  <span className="apoth-eyebrow">5mg</span>
                  <span className="text-lg">$32.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] bg-[#ffffff] apoth-border p-6 flex flex-col relative group cursor-pointer hover:border-[#4a5d4e] transition-colors">
              <div className="absolute top-4 right-4 apoth-eyebrow text-[0.6rem]">No. 02</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-32 border-x-2 border-b-2 border-t-[12px] border-[#e6e4df] rounded-b-xl rounded-t-sm flex flex-col justify-end p-2 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#2c2a26] rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-[#f8f7f4] border-t border-[#e6e4df] rounded-b-lg"></div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-[#e6e4df]">
                <h3 className="apoth-display text-2xl mb-1">TB-500</h3>
                <div className="flex justify-between items-center">
                  <span className="apoth-eyebrow">5mg</span>
                  <span className="text-lg">$38.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] bg-[#ffffff] apoth-border p-6 flex flex-col relative group cursor-pointer hover:border-[#4a5d4e] transition-colors">
              <div className="absolute top-4 right-4 apoth-eyebrow text-[0.6rem]">No. 03</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-32 border-x-2 border-b-2 border-t-[12px] border-[#e6e4df] rounded-b-xl rounded-t-sm flex flex-col justify-end p-2 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#2c2a26] rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-[#f8f7f4] border-t border-[#e6e4df] rounded-b-lg"></div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-[#e6e4df]">
                <h3 className="apoth-display text-2xl mb-1">Retatrutide</h3>
                <div className="flex justify-between items-center">
                  <span className="apoth-eyebrow">10mg</span>
                  <span className="text-lg">$115.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] bg-[#ffffff] apoth-border p-6 flex flex-col relative group cursor-pointer hover:border-[#4a5d4e] transition-colors">
              <div className="absolute top-4 right-4 apoth-eyebrow text-[0.6rem]">No. 04</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-32 border-x-2 border-b-2 border-t-[12px] border-[#e6e4df] rounded-b-xl rounded-t-sm flex flex-col justify-end p-2 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#2c2a26] rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-[#f8f7f4] border-t border-[#e6e4df] rounded-b-lg"></div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-[#e6e4df]">
                <h3 className="apoth-display text-2xl mb-1">Tirzepatide</h3>
                <div className="flex justify-between items-center">
                  <span className="apoth-eyebrow">15mg</span>
                  <span className="text-lg">$95.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5 */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] bg-[#ffffff] apoth-border p-6 flex flex-col relative group cursor-pointer hover:border-[#4a5d4e] transition-colors">
              <div className="absolute top-4 right-4 apoth-eyebrow text-[0.6rem]">No. 05</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-32 border-x-2 border-b-2 border-t-[12px] border-[#e6e4df] rounded-b-xl rounded-t-sm flex flex-col justify-end p-2 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#2c2a26] rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-[#f8f7f4] border-t border-[#e6e4df] rounded-b-lg"></div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-[#e6e4df]">
                <h3 className="apoth-display text-2xl mb-1">Semaglutide</h3>
                <div className="flex justify-between items-center">
                  <span className="apoth-eyebrow">10mg</span>
                  <span className="text-lg">$68.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 6 */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] bg-[#ffffff] apoth-border p-6 flex flex-col relative group cursor-pointer hover:border-[#4a5d4e] transition-colors">
              <div className="absolute top-4 right-4 apoth-eyebrow text-[0.6rem]">No. 06</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-32 border-x-2 border-b-2 border-t-[12px] border-[#e6e4df] rounded-b-xl rounded-t-sm flex flex-col justify-end p-2 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#2c2a26] rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-[#4a5d4e] border-t border-[#e6e4df] rounded-b-lg opacity-80"></div>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-[#e6e4df]">
                <h3 className="apoth-display text-2xl mb-1">GHK-Cu</h3>
                <div className="flex justify-between items-center">
                  <span className="apoth-eyebrow">100mg</span>
                  <span className="text-lg">$45.00</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Community Testing Pools */}
      <section className="w-full bg-[#4a5d4e] text-[#f8f7f4] py-32">
        <div className="max-w-[1280px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="apoth-eyebrow text-[#e6e4df] block mb-8">Chapter III. The Assurance</span>
            <h2 className="apoth-display text-5xl mb-8">Community Testing Pools.</h2>
            <p className="text-xl leading-relaxed text-[#e6e4df] mb-8">
              Trust is earned through verification. Rather than relying on supplier assertions, 
              our members crowdfund independent analytical testing of specific batches. 
              Results are published immutably to the collective.
            </p>
            <div className="flex items-center gap-8 mb-12">
              <div>
                <div className="apoth-display text-4xl mb-2">12</div>
                <div className="apoth-eyebrow text-[0.65rem] text-[#e6e4df]">Open Pools</div>
              </div>
              <div className="w-px h-12 bg-[#2d3b30]"></div>
              <div>
                <div className="apoth-display text-4xl mb-2">148</div>
                <div className="apoth-eyebrow text-[0.65rem] text-[#e6e4df]">Tests Completed</div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-3 apoth-eyebrow border-b border-[#e6e4df] pb-1 hover:text-white hover:border-white transition-colors">
              Join a Pool <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="bg-[#2d3b30] p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-[#4a5d4e]">
              <Beaker className="w-32 h-32 opacity-20" />
            </div>
            <div className="relative z-10">
              <div className="apoth-eyebrow mb-4">Featured Pool</div>
              <h3 className="apoth-display text-3xl mb-2">Tirzepatide Batch #884</h3>
              <p className="text-[#e6e4df] mb-8 italic">Testing for purity and net mass via HPLC.</p>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Funded: $240 / $300</span>
                  <span>80%</span>
                </div>
                <div className="w-full h-1 bg-[#4a5d4e]">
                  <div className="w-[80%] h-full bg-[#f8f7f4]"></div>
                </div>
              </div>
              
              <button className="mt-8 px-6 py-3 border border-[#e6e4df] apoth-eyebrow hover:bg-[#f8f7f4] hover:text-[#2d3b30] transition-colors">
                Contribute $10
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-[1280px] px-8 py-32">
        <span className="apoth-eyebrow block mb-16 text-center">Chapter IV. The Protocol</span>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full apoth-border flex items-center justify-center mb-6 bg-[#ffffff]">
              <span className="apoth-display text-2xl text-[#4a5d4e]">I</span>
            </div>
            <h4 className="apoth-eyebrow mb-4 text-[#2c2a26]">Join</h4>
            <p className="text-[#6b6963]">Commit to the minimum quantity required for the current wholesale group buy.</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full apoth-border flex items-center justify-center mb-6 bg-[#ffffff]">
              <span className="apoth-display text-2xl text-[#4a5d4e]">II</span>
            </div>
            <h4 className="apoth-eyebrow mb-4 text-[#2c2a26]">Fund</h4>
            <p className="text-[#6b6963]">Transfer your contribution securely and anonymously via USDT.</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full apoth-border flex items-center justify-center mb-6 bg-[#ffffff]">
              <span className="apoth-display text-2xl text-[#4a5d4e]">III</span>
            </div>
            <h4 className="apoth-eyebrow mb-4 text-[#2c2a26]">Ship</h4>
            <p className="text-[#6b6963]">The collective order is processed, synthesized, and distributed globally.</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full apoth-border flex items-center justify-center mb-6 bg-[#ffffff]">
              <span className="apoth-display text-2xl text-[#4a5d4e]">IV</span>
            </div>
            <h4 className="apoth-eyebrow mb-4 text-[#2c2a26]">Test</h4>
            <p className="text-[#6b6963]">Samples are drawn from the batch and submitted for independent HPLC analysis.</p>
          </div>
        </div>
      </section>

      {/* Lab Reports (COA) */}
      <section className="w-full bg-[#ffffff] apoth-border-y py-32">
        <div className="max-w-[1280px] mx-auto px-8 grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-5">
            <span className="apoth-eyebrow block mb-8">Chapter V. Provenance</span>
            <h2 className="apoth-display text-5xl mb-8">Certificates of Analysis.</h2>
            <p className="text-xl text-[#6b6963] leading-relaxed mb-12">
              Every compound passing through our collective is subjected to rigorous 
              chromatography. We maintain an open archive of all historical test results.
            </p>
            <a href="#" className="apoth-eyebrow border-b border-[#2c2a26] pb-1 hover:text-[#4a5d4e] hover:border-[#4a5d4e] transition-colors inline-flex items-center gap-2">
              View the Archive <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="md:col-span-7 pl-0 md:pl-12 border-l-0 md:border-l border-[#e6e4df]">
            <div className="flex flex-col gap-6">
              {[
                { name: "Retatrutide", batch: "R-8892", purity: "99.8%", date: "Oct 24, 2024" },
                { name: "BPC-157", batch: "B-1140", purity: "99.5%", date: "Oct 12, 2024" },
                { name: "GHK-Cu", batch: "G-0091", purity: "99.9%", date: "Sep 28, 2024" }
              ].map((coa, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between py-6 apoth-border-b group cursor-pointer">
                  <div>
                    <h4 className="apoth-display text-2xl mb-1 group-hover:text-[#4a5d4e] transition-colors">{coa.name}</h4>
                    <span className="apoth-eyebrow text-[#6b6963]">Batch {coa.batch}</span>
                  </div>
                  <div className="flex items-center gap-8 mt-4 sm:mt-0 text-sm">
                    <span className="text-[#4a5d4e] italic">{coa.purity} Purity</span>
                    <span className="text-[#6b6963]">{coa.date}</span>
                    <FileText className="w-5 h-5 text-[#2c2a26] opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Objection Handling */}
      <section className="w-full max-w-[1280px] px-8 py-32">
        <span className="apoth-eyebrow block mb-16 text-center">Chapter VI. Inquiries</span>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-4xl mx-auto">
          <div>
            <h4 className="apoth-display text-2xl mb-4">Is my identity preserved?</h4>
            <p className="text-[#6b6963] leading-relaxed">
              We require zero identifying information beyond a shipping destination. 
              Payments are conducted solely via USDT on decentralized networks, ensuring 
              complete financial privacy.
            </p>
          </div>
          <div>
            <h4 className="apoth-display text-2xl mb-4">How is shipping handled?</h4>
            <p className="text-[#6b6963] leading-relaxed">
              Orders are dispatched via discrete, unmarked parcels. We utilize strategic 
              routing to minimize friction, with successful delivery rates documented in our 
              community ledgers.
            </p>
          </div>
          <div>
            <h4 className="apoth-display text-2xl mb-4">What if a test fails?</h4>
            <p className="text-[#6b6963] leading-relaxed">
              If community testing reveals a batch falls below our strict purity thresholds 
              (typically 99%+), the collective secures a replacement from the laboratory or 
              issues proportional credits.
            </p>
          </div>
          <div>
            <h4 className="apoth-display text-2xl mb-4">Are these for human use?</h4>
            <p className="text-[#6b6963] leading-relaxed">
              Strictly no. All compounds sourced through the collective are strictly 
              designated for in-vitro laboratory research purposes only. 
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#2c2a26] text-[#f8f7f4] py-16">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-5">
              <div className="apoth-display text-3xl tracking-tight mb-6">Salt &amp; Peps.</div>
              <p className="text-[#e6e4df] text-sm leading-relaxed max-w-md italic opacity-80">
                Notice: The products detailed within this platform are intended strictly for 
                laboratory research and development. They are not intended for human consumption, 
                diagnostic, therapeutic, or preventative purposes.
              </p>
            </div>
            
            <div className="md:col-span-2 md:col-start-8 flex flex-col gap-4 apoth-eyebrow">
              <a href="#" className="text-[#e6e4df] hover:text-white transition-colors">Group Buys</a>
              <a href="#" className="text-[#e6e4df] hover:text-white transition-colors">Single Vials</a>
              <a href="#" className="text-[#e6e4df] hover:text-white transition-colors">Lab Reports</a>
            </div>
            
            <div className="md:col-span-2 flex flex-col gap-4 apoth-eyebrow">
              <a href="#" className="text-[#e6e4df] hover:text-white transition-colors">Testing Pools</a>
              <a href="#" className="text-[#e6e4df] hover:text-white transition-colors">Manifesto</a>
              <a href="#" className="text-[#e6e4df] hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#4a5d4e] apoth-eyebrow text-[0.65rem] text-[#6b6963]">
            <span>&copy; {new Date().getFullYear()} The Collective. All rights reserved.</span>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#e6e4df] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[#e6e4df] transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
