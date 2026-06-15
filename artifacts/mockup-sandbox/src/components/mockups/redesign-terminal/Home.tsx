import React, { useState, useEffect } from "react";
import { Terminal, ShieldAlert, Cpu, Activity, FlaskConical, CircleDot, ChevronRight, Clock, FileText, Fingerprint } from "lucide-react";
import "./_group.css";

export function Home() {
  const [time, setTime] = useState("");
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal-theme min-h-screen text-[14px] leading-relaxed relative pb-20">
      <div className="scanline"></div>
      
      <div className="max-w-[1280px] mx-auto px-6 pt-6">
        
        {/* Header */}
        <header className="flex items-end justify-between border-b-2 border-muted pb-4 mb-12">
          <div>
            <div className="flex items-center gap-3 text-green mb-1">
              <Terminal size={18} />
              <span className="font-bold tracking-widest uppercase">SALT_&_PEPS_SYS</span>
            </div>
            <div className="text-muted text-[12px]">Peps Anonymous / Research Terminal</div>
          </div>
          
          <nav className="flex gap-8 text-[13px] uppercase tracking-wider">
            <a href="#" className="hover:text-green transition-colors">Group Buy</a>
            <a href="#" className="hover:text-green transition-colors">Vials</a>
            <a href="#" className="hover:text-green transition-colors">Lab Reports</a>
            <a href="#" className="hover:text-green transition-colors">Testing Pools</a>
            <a href="#" className="hover:text-green transition-colors">Learn</a>
            <a href="#" className="text-green hover:bg-green hover:text-black px-2 py-0.5 transition-colors">[Login]</a>
          </nav>
        </header>

        {/* Hero */}
        <section className="mb-16">
          <div className="text-muted mb-2">root@peps-anon:~$ ./init_session</div>
          <h1 className="text-[48px] font-bold leading-none mb-6 cursor-blink uppercase tracking-tight">
            Join the next<br/>group buy
          </h1>
          <p className="text-[16px] text-muted max-w-2xl mb-8">
            {"> "}SECURE, ANONYMOUS SOURCING FOR RESEARCH PEPTIDES.<br/>
            {"> "}NO KYC REQUIRED. USDT PAYMENTS ONLY.<br/>
            {"> "}ACCESS MEMBER-ONLY PRICING ON BULK SYNTHESIS BATCHES.
          </p>
          <div className="flex gap-6">
            <button className="bg-green text-black font-bold uppercase tracking-wider px-6 py-3 flex items-center gap-2 hover:opacity-90 transition-opacity">
              <ChevronRight size={18} /> View Group Buy
            </button>
            <button className="border border-muted text-fg hover:border-green hover:text-green font-bold uppercase tracking-wider px-6 py-3 transition-colors">
              Browse Single Vials
            </button>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="border-y border-muted py-4 flex justify-between text-[13px] uppercase tracking-wide mb-16">
          <div className="flex items-center gap-2"><FlaskConical size={14} className="text-green"/> Jano/MZ Biolabs Tested</div>
          <div className="text-muted">|</div>
          <div className="flex items-center gap-2"><Cpu size={14} className="text-green"/> USDT TRC-20</div>
          <div className="text-muted">|</div>
          <div className="flex items-center gap-2"><Fingerprint size={14} className="text-green"/> Zero KYC</div>
          <div className="text-muted">|</div>
          <div className="flex items-center gap-2"><Activity size={14} className="text-green"/> 8,492 Active Members</div>
          <div className="text-muted">|</div>
          <div className="flex items-center gap-2"><Clock size={14} className="text-green"/> {time}</div>
        </section>

        {/* Single Vials */}
        <section className="mb-20">
          <div className="text-muted mb-6">root@peps-anon:~$ ls -l /vials/in-stock</div>
          
          <div className="border border-muted">
            <div className="grid grid-cols-12 gap-4 p-3 border-b border-muted text-muted text-[12px] uppercase tracking-wider bg-[#111]">
              <div className="col-span-1">ID</div>
              <div className="col-span-4">Compound</div>
              <div className="col-span-2">Mass</div>
              <div className="col-span-2">Purity</div>
              <div className="col-span-2">Price_USDT</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            
            {[
              { id: "BPC-01", name: "BPC-157", mass: "5mg", purity: "99.4%", price: "32.00" },
              { id: "TB-02", name: "TB-500", mass: "5mg", purity: "99.1%", price: "35.00" },
              { id: "RET-01", name: "Retatrutide", mass: "10mg", purity: "98.9%", price: "115.00" },
              { id: "TIR-03", name: "Tirzepatide", mass: "15mg", purity: "99.5%", price: "85.00" },
              { id: "SEM-02", name: "Semaglutide", mass: "10mg", purity: "99.2%", price: "65.00" },
              { id: "GHK-01", name: "GHK-Cu", mass: "100mg", purity: "98.7%", price: "45.00" }
            ].map((vial, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-3 border-b border-muted hover:bg-[#111] transition-colors items-center group cursor-pointer">
                <div className="col-span-1 text-muted text-[12px]">{vial.id}</div>
                <div className="col-span-4 font-bold group-hover:text-green transition-colors">{vial.name}</div>
                <div className="col-span-2">{vial.mass}</div>
                <div className="col-span-2">{vial.purity}</div>
                <div className="col-span-2 text-green font-bold">${vial.price}</div>
                <div className="col-span-1 text-right"><CircleDot size={12} className="inline text-green" fill="currentColor" /></div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-12 mb-20">
          {/* How it works */}
          <section>
            <div className="text-muted mb-6">root@peps-anon:~$ cat /docs/protocol.txt</div>
            <div className="border border-muted p-6 h-full bg-[#0a0a0a]">
              <h2 className="text-green text-xl font-bold uppercase tracking-wider mb-6 border-b border-muted pb-4">Standard Operating Procedure</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="text-muted font-bold text-lg mt-[-2px]">01</div>
                  <div>
                    <div className="font-bold text-white uppercase mb-1">Join Syndicate</div>
                    <div className="text-muted">Register anonymously. Access upcoming bulk synthesis runs for GLPs and peptides.</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-muted font-bold text-lg mt-[-2px]">02</div>
                  <div>
                    <div className="font-bold text-white uppercase mb-1">Fund Allocation</div>
                    <div className="text-muted">Deposit USDT. Minimums apply. Group buys trigger once target allocation is met.</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-muted font-bold text-lg mt-[-2px]">03</div>
                  <div>
                    <div className="font-bold text-white uppercase mb-1">Synthesis & Transit</div>
                    <div className="text-muted">Manufacturing takes 3-4 weeks. Stealth shipping routes bypass standard customs flags.</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-muted font-bold text-lg mt-[-2px]">04</div>
                  <div>
                    <div className="font-bold text-white uppercase mb-1">Independent Verification</div>
                    <div className="text-muted">Random samples sent to Jano/MZ for blind testing. COAs published before distribution.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testing Pools */}
          <section>
            <div className="text-muted mb-6">root@peps-anon:~$ ./view_pools --active</div>
            <div className="border border-green p-6 h-full relative">
              <div className="absolute top-0 right-0 bg-green text-black text-[11px] font-bold px-2 py-1 uppercase tracking-wider">
                COMMUNITY_DRIVEN
              </div>
              <h2 className="text-green text-xl font-bold uppercase tracking-wider mb-2">Testing Pools</h2>
              <p className="text-muted mb-8">
                Crowdfund analytical testing for obscure compounds or specific vendor batches. Don't trust. Verify.
              </p>
              
              <div className="flex justify-between items-end border-b border-muted pb-4 mb-6">
                <div>
                  <div className="text-[32px] text-white font-bold leading-none mb-1">14</div>
                  <div className="text-muted uppercase text-[12px] tracking-wider">Active Pools</div>
                </div>
                <div className="text-right">
                  <div className="text-[20px] text-green font-bold leading-none mb-1">89%</div>
                  <div className="text-muted uppercase text-[12px] tracking-wider">Avg Funding Rate</div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-[12px] mb-2 uppercase">
                  <span>SS-31 (Qingdao Batch 4)</span>
                  <span className="text-green">$280 / $350</span>
                </div>
                <div className="w-full bg-[#222] h-2 mb-4">
                  <div className="bg-green h-full" style={{ width: '80%' }}></div>
                </div>

                <div className="flex justify-between text-[12px] mb-2 uppercase">
                  <span>Ipamorelin (Vendor X)</span>
                  <span className="text-green">$150 / $350</span>
                </div>
                <div className="w-full bg-[#222] h-2">
                  <div className="bg-green h-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <button className="w-full border border-green text-green font-bold uppercase tracking-wider py-3 hover:bg-green hover:text-black transition-colors">
                Join a Testing Pool
              </button>
            </div>
          </section>
        </div>

        {/* COAs / Lab Reports */}
        <section className="mb-20">
          <div className="flex justify-between items-end mb-6">
            <div className="text-muted">root@peps-anon:~$ find /lab-reports -name "*.pdf"</div>
            <a href="#" className="text-green text-[12px] uppercase tracking-wider hover:underline">[View Database]</a>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            {[
              { compound: "Retatrutide 10mg", batch: "RT-8921", date: "2024-03-12", lab: "Janoshik", purity: "99.8%" },
              { compound: "BPC-157 5mg", batch: "BP-4412", date: "2024-03-08", lab: "MZ Biolabs", purity: "99.4%" },
              { compound: "Tirzepatide 15mg", batch: "TZ-9002", date: "2024-02-28", lab: "Janoshik", purity: "99.1%" },
              { compound: "MOTS-c 10mg", batch: "MC-1109", date: "2024-02-15", lab: "MZ Biolabs", purity: "98.9%" }
            ].map((coa, i) => (
              <div key={i} className="border border-muted p-4 hover:border-white transition-colors cursor-pointer group">
                <FileText className="text-muted mb-3 group-hover:text-green transition-colors" size={24} />
                <div className="font-bold uppercase mb-1">{coa.compound}</div>
                <div className="text-muted text-[12px] mb-4">Batch: {coa.batch}</div>
                <div className="flex justify-between items-end border-t border-muted pt-3 mt-3">
                  <div>
                    <div className="text-[10px] text-muted uppercase">Purity</div>
                    <div className="text-green font-bold">{coa.purity}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted uppercase">{coa.lab}</div>
                    <div className="text-[11px]">{coa.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <div className="text-muted mb-6">root@peps-anon:~$ man FAQ</div>
          <div className="grid grid-cols-2 gap-8 border-t border-muted pt-6">
            <div>
              <h3 className="text-white font-bold uppercase mb-2">{"> "}Is my identity secure?</h3>
              <p className="text-muted">We operate on a zero-knowledge basis. No KYC. No credit cards. No trace. Use ProtonMail and Monero/USDT. We purge shipping details 48h after delivery confirmation.</p>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase mb-2">{"> "}What if customs seizes my order?</h3>
              <p className="text-muted">Domestic reshipping points mitigate 99% of risk. For direct international routing, we offer a 50% reship policy on documented seizures. Keep your stealth comms active.</p>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase mb-2">{"> "}Are these for human use?</h3>
              <p className="text-muted">Negative. All compounds are synthesized and distributed strictly for in-vitro laboratory research purposes. Review the TOS before initialization.</p>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase mb-2">{"> "}Refund policy?</h3>
              <p className="text-muted">Immutable ledger transactions mean no refunds post-synthesis. If third-party blind testing fails our {">"}98% purity standard, the syndicate rejects the batch and the manufacturer remakes it.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-muted pt-8 text-[12px] flex justify-between items-start text-muted">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-white mb-2">
              <ShieldAlert size={14} className="text-alert-color" />
              <span className="font-bold uppercase tracking-wider text-alert-color">CRITICAL NOTICE</span>
            </div>
            <p className="mb-4">
              All products on this terminal are for laboratory research only. Not for human use, consumption, or diagnostic purposes. Keep out of reach of biological entities.
            </p>
            <div>© {new Date().getFullYear()} SALT & PEPS_SYS. ALL RIGHTS RESERVED.</div>
          </div>
          
          <div className="text-right">
            <div className="uppercase tracking-wider font-bold text-white mb-3">SYSTEM_LINKS</div>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-green">PGP PUBLIC KEY</a></li>
              <li><a href="#" className="hover:text-green">TOR ONION ROUTE</a></li>
              <li><a href="#" className="hover:text-green">TOS_v4.2.txt</a></li>
            </ul>
          </div>
        </footer>
        
      </div>
    </div>
  );
}