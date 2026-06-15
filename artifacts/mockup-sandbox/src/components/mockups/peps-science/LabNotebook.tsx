import React, { useState } from "react";
import { ArrowRight, Check, Search } from "lucide-react";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", mechanism: "GLP-1 / GIP / glucagon tri-agonist", category: "Weight Management", mg: "10", price: "$20.00", inStock: true, janoshikId: "26WQNEWELZ5T", testDate: "Mar 2026", purity: ">98%", batchId: "32342" },
  { id: "8a3f21", name: "Semaglutide 5mg", mechanism: "GLP-1 receptor agonist", category: "Weight Management", mg: "5", price: "$18.00", inStock: true, janoshikId: "84KQMRWELX2P", testDate: "Mar 2026", purity: ">97%", batchId: "31189" },
  { id: "c7d849", name: "BPC-157 5mg", mechanism: "Peptide body protection compound", category: "Repair & Recovery", mg: "5", price: "$15.00", inStock: true, janoshikId: "91HLPTWENY7R", testDate: "Feb 2026", purity: ">99%", batchId: "30041" },
  { id: "e1b293", name: "TB-500 5mg", mechanism: "Thymosin beta-4 fragment", category: "Repair & Recovery", mg: "10", price: "$22.00", inStock: false, janoshikId: "73JQNSWENZ4T", testDate: "Jan 2026", purity: ">98%", batchId: "29870" },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mechanism: "GLP-1 7-36 amide fragment", category: "Weight Management", mg: "2", price: "$12.00", inStock: true, janoshikId: "55RQPTWELO9S", testDate: "Mar 2026", purity: ">97%", batchId: "31654" },
  { id: "a91c55", name: "Ipamorelin 5mg", mechanism: "Growth hormone secretagogue", category: "Growth & Performance", mg: "5", price: "$16.00", inStock: true, janoshikId: "62TQVSWELN3U", testDate: "Feb 2026", purity: ">99%", batchId: "30887" },
];

export function LabNotebook() {
  const [activeTab, setActiveTab] = useState("02. VIALS");

  return (
    <div 
      className="min-h-screen w-full flex bg-[#FEFDF8] text-[#1A1A2E] font-['DM_Sans'] overflow-x-hidden selection:bg-[#2D6BCC] selection:text-white"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(180,200,220,0.15) 27px, rgba(180,200,220,0.15) 28px), 
          repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(180,200,220,0.15) 27px, rgba(180,200,220,0.15) 28px)
        `
      }}
    >
      {/* Sidebar - The Notebook Cover/Index */}
      <aside className="w-64 shrink-0 bg-[#F5F2EA] border-r border-[#CBD5E1] flex flex-col h-screen sticky top-0 relative z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
        {/* Notebook Binding Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#1A1A2E]/5 border-r border-[#1A1A2E]/10" />
        
        <div className="p-8 pt-12 flex-1 pl-10">
          <div className="mb-12">
            <h1 className="font-['Space_Mono'] font-bold text-2xl tracking-tight leading-none mb-1">
              Salt &<br />Peps
            </h1>
            <p className="font-['DM_Mono'] text-[10px] text-[#1A1A2E]/60 uppercase tracking-widest mt-4 border-t border-[#1A1A2E] pt-2">
              Vol. IV — 2026
            </p>
          </div>

          <div className="mb-8 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest border-b-2 border-[#1A1A2E] pb-2">
            Notebook Index
          </div>

          <nav className="space-y-4 font-['DM_Mono'] text-sm tracking-tight flex flex-col items-start">
            {["01. HOME", "02. VIALS", "03. KITS", "04. ACCESSORIES", "05. LAB TESTS", "06. ARCHIVE"].map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`text-left hover:text-[#2D6BCC] transition-colors relative ${
                  activeTab === item ? "text-[#1A1A2E] font-medium" : "text-[#1A1A2E]/70"
                }`}
              >
                {item}
                {activeTab === item && (
                  <div className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-[#1A1A2E] w-[95%] transform -rotate-1" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8 pl-10 border-t border-[#CBD5E1] mt-auto">
          <p className="font-['DM_Mono'] text-[10px] text-[#1A1A2E]/60 uppercase tracking-widest">
            BATCH RECORD: APR 2026<br/>
            RESEARCH PURPOSES ONLY
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-16 border-b-2 border-[#1A1A2E] flex items-center justify-between px-10 bg-[#FEFDF8]/90 backdrop-blur-sm sticky top-0 z-20">
          <div className="font-['DM_Mono'] text-[10px] uppercase tracking-widest text-[#1A1A2E]/70">
            Laboratory Inventory / Vol. IV / Page 042
          </div>
          <div className="flex items-center gap-6 font-['DM_Mono'] text-xs">
            <span>APRIL 2026</span>
            <div className="flex items-center gap-2 border border-[#CBD5E1] p-1 rounded-sm bg-white">
              <button className="px-2 py-0.5 bg-[#F5F2EA] rounded-sm shadow-sm font-medium">USD</button>
              <button className="px-2 py-0.5 text-[#1A1A2E]/60 hover:text-[#1A1A2E]">EUR</button>
            </div>
            <button className="w-8 h-8 flex items-center justify-center border border-[#1A1A2E] hover:bg-[#F5F2EA] transition-colors rounded-sm">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-10 flex gap-12 max-w-7xl w-full mx-auto">
          
          {/* Left Column - Hero & Table */}
          <div className="flex-1 min-w-0">
            
            {/* Hero Section */}
            <div className="mb-12 max-w-2xl">
              <div className="font-['DM_Mono'] text-[9px] uppercase tracking-widest text-[#1A1A2E]/60 mb-4 inline-block border border-[#CBD5E1] px-2 py-1 bg-white">
                Compound Registry — Active Batch
              </div>
              <h2 className="font-['Space_Mono'] text-3xl font-bold mb-4 tracking-tight leading-tight">
                Salt & Peps Analytical
              </h2>
              <p className="text-[#1A1A2E]/80 text-sm leading-relaxed mb-6 font-['DM_Sans']">
                Independent CoA verification on all active compounds. All results verified by Janoshik Analytical, United Kingdom. Values represent current tested batch inventory.
              </p>
              
              {/* Trust Strip */}
              <div className="flex flex-wrap gap-6 font-['DM_Mono'] text-xs border-y border-[#CBD5E1] py-3 bg-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-[#1A1A2E] flex items-center justify-center bg-white transform -rotate-2">
                    <Check className="w-3 h-3 text-[#1A1A2E]" strokeWidth={3} />
                  </div>
                  <span>CoA verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-[#1A1A2E] flex items-center justify-center bg-white transform rotate-1">
                    <Check className="w-3 h-3 text-[#1A1A2E]" strokeWidth={3} />
                  </div>
                  <span>Batch tested</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-[#1A1A2E] flex items-center justify-center bg-white">
                    <Check className="w-3 h-3 text-[#1A1A2E]" strokeWidth={3} />
                  </div>
                  <span>Discreet dispatch</span>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white/80 border border-[#CBD5E1] shadow-sm mb-6">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b-2 border-[#1A1A2E] font-['Space_Mono'] text-xs uppercase tracking-widest bg-[#F5F2EA]">
                    <th className="py-4 px-4 font-normal">Registry ID</th>
                    <th className="py-4 px-4 font-normal">Compound</th>
                    <th className="py-4 px-4 font-normal">Batch</th>
                    <th className="py-4 px-4 font-normal">Purity</th>
                    <th className="py-4 px-4 font-normal text-right">Price</th>
                    <th className="py-4 px-4 font-normal text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="font-['DM_Mono'] text-xs">
                  {PRODUCTS.map((p, i) => (
                    <tr 
                      key={p.id} 
                      className={`border-b border-dashed border-[#CBD5E1] hover:bg-[#F0EDE4] transition-colors ${!p.inStock ? 'opacity-70' : ''}`}
                    >
                      <td className="py-4 px-4 uppercase tracking-wider">{p.id}</td>
                      <td className="py-4 px-4">
                        <div className="font-['DM_Sans'] font-medium text-sm text-[#1A1A2E]">{p.name}</div>
                        <div className="text-[10px] text-[#1A1A2E]/60 mt-0.5">{p.category}</div>
                      </td>
                      <td className="py-4 px-4">{p.batchId}</td>
                      <td className={`py-4 px-4 font-bold ${p.inStock ? 'text-[#16A34A]' : 'text-[#1A1A2E]/40'}`}>
                        {p.purity}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums">{p.price}</td>
                      <td className="py-4 px-4 text-center">
                        {p.inStock ? (
                          <button className="bg-[#2D6BCC] text-white px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] hover:bg-[#20519E] transition-colors w-20">
                            Add
                          </button>
                        ) : (
                          <div className="inline-block border-2 border-[#DC2626] text-[#DC2626] font-bold px-2 py-1 text-[10px] transform -rotate-6 uppercase tracking-wider w-20">
                            UNAVL
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button className="font-['DM_Mono'] text-xs text-[#2D6BCC] hover:underline flex items-center gap-1">
              <ArrowRight className="w-3 h-3 transform -rotate-45" />
              Full registry
            </button>
          </div>

          {/* Right Column - Reference Info */}
          <div className="w-80 shrink-0 flex flex-col gap-10 border-l-2 border-[#1A1A2E] pl-10 py-2">
            
            {/* Section 1 */}
            <section>
              <h3 className="font-['Space_Mono'] text-xs font-bold uppercase tracking-widest border-b border-[#CBD5E1] pb-2 mb-4">
                Verification
              </h3>
              <div className="border border-[#1A1A2E] p-4 bg-white mb-4 shadow-[2px_2px_0_#1A1A2E]">
                <div className="font-['Space_Mono'] font-bold text-sm tracking-tight text-center border-b border-dashed border-[#CBD5E1] pb-3 mb-3">
                  JANOSHIK<br/>ANALYTICAL
                </div>
                <p className="font-['DM_Sans'] text-xs text-center text-[#1A1A2E]/80">
                  Independent testing partner
                </p>
              </div>
              <p className="font-['DM_Mono'] text-xs leading-relaxed mb-3">
                352 Certificate of Analysis documents on file.
              </p>
              <button className="font-['DM_Mono'] text-xs text-[#2D6BCC] hover:underline flex items-center gap-1 group">
                View archive <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </section>

            {/* Section 2 */}
            <section>
              <h3 className="font-['Space_Mono'] text-xs font-bold uppercase tracking-widest border-b border-[#CBD5E1] pb-2 mb-4">
                Reference Materials
              </h3>
              <ul className="font-['DM_Mono'] text-xs space-y-3">
                <li className="flex gap-3 hover:text-[#2D6BCC] cursor-pointer transition-colors">
                  <span className="text-[#1A1A2E]/40">01.</span>
                  <span className="underline decoration-[#CBD5E1] underline-offset-4">The Lonely Vial</span>
                </li>
                <li className="flex gap-3 hover:text-[#2D6BCC] cursor-pointer transition-colors">
                  <span className="text-[#1A1A2E]/40">02.</span>
                  <span className="underline decoration-[#CBD5E1] underline-offset-4">Accessories</span>
                </li>
                <li className="flex gap-3 hover:text-[#2D6BCC] cursor-pointer transition-colors">
                  <span className="text-[#1A1A2E]/40">03.</span>
                  <span className="underline decoration-[#CBD5E1] underline-offset-4">Storage Protocols</span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h3 className="font-['Space_Mono'] text-xs font-bold uppercase tracking-widest border-b border-[#CBD5E1] pb-2 mb-4">
                Instruments
              </h3>
              <ul className="font-['DM_Mono'] text-xs space-y-3">
                <li className="flex gap-3 hover:text-[#2D6BCC] cursor-pointer transition-colors">
                  <span className="text-[#1A1A2E]/40">01.</span>
                  <span className="underline decoration-[#CBD5E1] underline-offset-4">Dose Calculator</span>
                </li>
                <li className="flex gap-3 hover:text-[#2D6BCC] cursor-pointer transition-colors">
                  <span className="text-[#1A1A2E]/40">02.</span>
                  <span className="underline decoration-[#CBD5E1] underline-offset-4">Reconstitution Guide</span>
                </li>
              </ul>
            </section>

            <div className="mt-auto pt-6 border-t border-[#1A1A2E]">
              <p className="font-['DM_Mono'] text-[10px] uppercase tracking-widest">
                Contact: <a href="#" className="hover:text-[#2D6BCC] hover:underline">t.me/urbanblend789</a>
              </p>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
