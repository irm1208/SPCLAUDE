import React, { useState } from "react";
import { 
  FlaskConical, 
  Microscope, 
  ClipboardList, 
  ShieldCheck, 
  ExternalLink, 
  ArrowRight, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertCircle,
  MessageCircle,
  ChevronRight
} from "lucide-react";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", mechanism: "GLP-1 / GIP / glucagon tri-agonist", category: "Weight Management", mg: "10", price: "$20.00", inStock: true, janoshikId: "26WQNEWELZ5T", testDate: "Mar 2026", purity: ">98%", batchId: "32342" },
  { id: "8a3f21", name: "Semaglutide 5mg", mechanism: "GLP-1 receptor agonist", category: "Weight Management", mg: "5", price: "$18.00", inStock: true, janoshikId: "84KQMRWELX2P", testDate: "Mar 2026", purity: ">97%", batchId: "31189" },
  { id: "c7d849", name: "BPC-157 5mg", mechanism: "Peptide body protection compound", category: "Repair & Recovery", mg: "5", price: "$15.00", inStock: true, janoshikId: "91HLPTWENY7R", testDate: "Feb 2026", purity: ">99%", batchId: "30041" },
  { id: "e1b293", name: "TB-500 5mg", mechanism: "Thymosin beta-4 fragment", category: "Repair & Recovery", mg: "10", price: "$22.00", inStock: false, janoshikId: "73JQNSWENZ4T", testDate: "Jan 2026", purity: ">98%", batchId: "29870" },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mechanism: "GLP-1 7-36 amide fragment", category: "Weight Management", mg: "2", price: "$12.00", inStock: true, janoshikId: "55RQPTWELO9S", testDate: "Mar 2026", purity: ">97%", batchId: "31654" },
  { id: "a91c55", name: "Ipamorelin 5mg", mechanism: "Growth hormone secretagogue", category: "Growth & Performance", mg: "5", price: "$16.00", inStock: true, janoshikId: "62TQVSWELN3U", testDate: "Feb 2026", purity: ">99%", batchId: "30887" },
];

export function VerificationTheater() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-['Inter'] selection:bg-[#2D6BCC] selection:text-white">
      {/* TOP NAV BAR */}
      <header className="h-12 border-b border-[#E2E8F0] bg-white flex items-center px-6 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-[#2D6BCC]" />
          <span className="font-bold tracking-tight">Salt & Peps</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]">
          <a href="#" className="text-[#0F172A] hover:text-[#2D6BCC] transition-colors">Vials</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors">Lab Reports</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors">Protocols</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors">Calculators</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors">My Orders</a>
        </nav>

        <div className="flex items-center">
          <a href="#" className="flex items-center gap-2 text-sm font-medium text-[#2D6BCC] hover:opacity-80 transition-opacity">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Telegram</span>
          </a>
        </div>
      </header>

      {/* ZONE 1 — VERIFICATION BANNER */}
      <section className="bg-[#0F172A] border-t-4 border-[#22C55E] text-white py-10 px-6 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-[1280px] mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#22C55E] animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]"></div>
            <span className="font-['Space_Mono'] text-sm tracking-wider text-[#22C55E] uppercase font-bold">
              ALL ACTIVE BATCHES VERIFIED
            </span>
          </div>
          
          <div className="text-center">
            <div className="font-['Space_Mono'] text-[#94A3B8] text-sm">
              352 CoAs on file <span className="mx-2 px-2 py-0.5 rounded bg-white/10 text-white">Last test: March 2026</span>
            </div>
          </div>
          
          <div>
            <a href="#" className="inline-flex items-center gap-2 text-[#22C55E] hover:text-white transition-colors font-['Space_Mono'] text-sm group">
              View all reports <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-[1280px] mx-auto px-6 py-12 space-y-16">
        
        {/* ZONE 2 — PRODUCT TABLE */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Verified Vials</h1>
              <p className="text-[#64748B]">All batches tested by Janoshik Analytical. Click ID to view official CoA.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-[#64748B] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-md shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>Independent UK Lab</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A]">Compound</th>
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A]">MG</th>
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A]">Price</th>
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A]">Test ID (Janoshik)</th>
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A]">Verified</th>
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A]">Result</th>
                  <th className="py-4 px-5 font-semibold text-xs text-[#64748B] uppercase tracking-wider border-b-2 border-[#0F172A] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {PRODUCTS.map((product, idx) => {
                  const qty = quantities[product.id] || 0;
                  
                  return (
                    <tr key={product.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/50'} hover:bg-slate-50 transition-colors group`}>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-[#0F172A]">{product.name}</div>
                        <div className="text-xs text-[#64748B] mt-0.5">{product.category}</div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-[#64748B]">
                          {product.mg}mg
                        </span>
                      </td>
                      <td className="py-4 px-5 font-['Space_Mono'] font-bold tabular-nums text-[15px]">
                        {product.price}
                      </td>
                      <td className="py-4 px-5">
                        <a 
                          href={`https://verify.janoshik.com/tests/75944-${product.name.replace(' ', '_')}_${product.janoshikId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-['Space_Mono'] text-sm text-[#2D6BCC] hover:text-[#1e4a8f] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors border border-blue-100"
                        >
                          <Microscope className="w-3.5 h-3.5" />
                          {product.janoshikId}
                        </a>
                      </td>
                      <td className="py-4 px-5 text-sm text-[#64748B]">
                        {product.testDate}
                      </td>
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16A34A] text-white font-['Space_Mono'] text-xs font-bold tracking-wide shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PASS
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-1 ml-1 font-['Space_Mono']">
                          {product.purity} Purity
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {!product.inStock ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
                            <AlertCircle className="w-4 h-4" />
                            Restocking
                          </span>
                        ) : qty > 0 ? (
                          <div className="inline-flex items-center border border-[#0F172A] rounded-md overflow-hidden h-9 shadow-sm justify-end float-right">
                            <button 
                              onClick={() => updateQuantity(product.id, -1)}
                              className="px-3 h-full hover:bg-slate-100 transition-colors flex items-center justify-center border-r border-[#0F172A]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-10 text-center font-['Space_Mono'] font-bold text-sm">
                              {qty}
                            </span>
                            <button 
                              onClick={() => updateQuantity(product.id, 1)}
                              className="px-3 h-full hover:bg-slate-100 transition-colors flex items-center justify-center border-l border-[#0F172A]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => updateQuantity(product.id, 1)}
                            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-[#0F172A] text-white text-sm font-medium hover:bg-slate-800 transition-all shadow-sm active:scale-95 float-right"
                          >
                            Add
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ZONE 3 — TRUST ARCHITECTURE */}
        <section className="grid md:grid-cols-3 gap-8">
          
          {/* LEFT: How We Verify */}
          <div className="md:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="w-6 h-6 text-[#2D6BCC]" />
              <h2 className="text-xl font-bold tracking-tight">How We Verify</h2>
            </div>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#E2E8F0] before:via-[#E2E8F0] before:to-transparent">
              
              <div className="relative flex items-start md:justify-center">
                <div className="hidden md:block w-1/2 pr-8 text-right pt-1.5">
                  <h3 className="font-bold text-[#0F172A]">Raw Material Sourcing</h3>
                  <p className="text-sm text-[#64748B] mt-1">Compound received in raw lyophilized format from trusted global manufacturing partners.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 flex h-11 w-11 -translate-x-0 md:-translate-x-1/2 items-center justify-center rounded-full bg-white border-4 border-[#F8FAFC]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2D6BCC] text-white font-bold font-['Space_Mono'] text-sm shadow-[0_0_0_4px_rgba(45,107,204,0.1)]">
                    1
                  </div>
                </div>
                <div className="ml-16 md:ml-0 md:w-1/2 pl-0 md:pl-8 pt-1.5">
                  <h3 className="font-bold text-[#0F172A] md:hidden">Raw Material Sourcing</h3>
                  <p className="text-sm text-[#64748B] mt-1 md:hidden">Compound received in raw lyophilized format from trusted global manufacturing partners.</p>
                  <div className="hidden md:block text-sm font-['Space_Mono'] text-[#64748B] mt-1 px-4 py-2 bg-slate-50 rounded border border-slate-100 w-fit">Status: Pending verification</div>
                </div>
              </div>

              <div className="relative flex items-start md:justify-center">
                <div className="hidden md:block w-1/2 pr-8 text-right pt-1.5">
                  <div className="text-sm font-['Space_Mono'] text-[#2D6BCC] mt-1 px-4 py-2 bg-blue-50 rounded border border-blue-100 w-fit ml-auto">Janoshik Analytical</div>
                </div>
                <div className="absolute left-0 md:left-1/2 flex h-11 w-11 -translate-x-0 md:-translate-x-1/2 items-center justify-center rounded-full bg-white border-4 border-[#F8FAFC]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2D6BCC] text-white font-bold font-['Space_Mono'] text-sm shadow-[0_0_0_4px_rgba(45,107,204,0.1)]">
                    2
                  </div>
                </div>
                <div className="ml-16 md:ml-0 md:w-1/2 pl-0 md:pl-8 pt-1.5">
                  <h3 className="font-bold text-[#0F172A]">Independent Testing</h3>
                  <p className="text-sm text-[#64748B] mt-1">Random samples from every batch sent to Janoshik Analytical (independent UK lab) for HPLC purity analysis.</p>
                </div>
              </div>

              <div className="relative flex items-start md:justify-center">
                <div className="hidden md:block w-1/2 pr-8 text-right pt-1.5">
                  <h3 className="font-bold text-[#0F172A]">Public Verification</h3>
                  <p className="text-sm text-[#64748B] mt-1">Certificate of Analysis (CoA) published. Test ID linked permanently to the product lot for public audit.</p>
                </div>
                <div className="absolute left-0 md:left-1/2 flex h-11 w-11 -translate-x-0 md:-translate-x-1/2 items-center justify-center rounded-full bg-white border-4 border-[#F8FAFC]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A] text-white font-bold font-['Space_Mono'] text-sm shadow-[0_0_0_4px_rgba(22,163,74,0.1)]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="ml-16 md:ml-0 md:w-1/2 pl-0 md:pl-8 pt-1.5">
                  <h3 className="font-bold text-[#0F172A] md:hidden">Public Verification</h3>
                  <p className="text-sm text-[#64748B] mt-1 md:hidden">Certificate of Analysis (CoA) published. Test ID linked permanently to the product lot for public audit.</p>
                  <div className="hidden md:flex items-center gap-2 text-sm font-['Space_Mono'] text-[#16A34A] mt-1 px-4 py-2 bg-green-50 rounded border border-green-200 w-fit">
                    <ShieldCheck className="w-4 h-4" />
                    Status: Verified
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: Resources */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-slate-50 flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-[#0F172A]" />
              <h2 className="text-lg font-bold tracking-tight">Resources</h2>
            </div>
            
            <div className="flex-1 flex flex-col p-2">
              <a href="#" className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-[#2D6BCC]">
                    <Microscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Lab Reports</div>
                    <div className="text-xs text-[#64748B]">All historical CoAs</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
              </a>

              <div className="h-px bg-slate-100 mx-4" />

              <a href="#" className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Protocols</div>
                    <div className="text-xs text-[#64748B]">Research guidelines</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
              </a>

              <div className="h-px bg-slate-100 mx-4" />

              <a href="#" className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center text-purple-600">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Dose Calculator</div>
                    <div className="text-xs text-[#64748B]">Reconstitution math</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
              </a>

              <div className="h-px bg-slate-100 mx-4" />

              <a href="#" className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Order Lookup</div>
                    <div className="text-xs text-[#64748B]">Track your shipment</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
            
            <div className="p-6 bg-slate-50 mt-auto border-t border-[#E2E8F0]">
              <div className="flex items-center gap-3 text-sm text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p>For research purposes only. Not for human consumption.</p>
              </div>
            </div>
          </div>
          
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#64748B]">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#cbd5e1]" />
            <span>&copy; {new Date().getFullYear()} Salt & Peps</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>UK</span>
            <span className="w-1 h-1 rounded-full bg-[#cbd5e1]"></span>
            <span>USDT</span>
            <span className="w-1 h-1 rounded-full bg-[#cbd5e1]"></span>
            <span>Discreet dispatch</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#0F172A] transition-colors flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> Telegram
            </a>
            <a href="#" className="hover:text-[#0F172A] transition-colors font-medium">
              Member access
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
