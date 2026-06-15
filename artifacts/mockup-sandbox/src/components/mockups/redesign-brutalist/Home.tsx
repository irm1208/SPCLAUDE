import React from 'react';
import { ArrowRight, FlaskConical, Users, ShieldAlert, Package, ChevronRight, Lock } from 'lucide-react';
import './_group.css';

export function Home() {
  return (
    <div className="brutalist min-h-screen flex flex-col w-full selection:bg-[#FFD400] selection:text-black">
      {/* Top Nav */}
      <nav className="w-full flex items-center justify-between p-6 brut-border-b bg-white sticky top-0 z-50">
        <div className="text-3xl font-black tracking-tighter uppercase">
          Peps Anonymous
        </div>
        <div className="hidden md:flex items-center gap-8 font-bold uppercase text-sm tracking-wider">
          <a href="#" className="hover:text-[#0044FF] hover:underline decoration-2 underline-offset-4">Group Buy</a>
          <a href="#" className="hover:text-[#0044FF] hover:underline decoration-2 underline-offset-4">Single Vials</a>
          <a href="#" className="hover:text-[#0044FF] hover:underline decoration-2 underline-offset-4">Lab Reports</a>
          <a href="#" className="hover:text-[#0044FF] hover:underline decoration-2 underline-offset-4">Testing Pools</a>
          <a href="#" className="hover:text-[#0044FF] hover:underline decoration-2 underline-offset-4">Learn</a>
        </div>
        <div className="flex items-center">
          <button className="brut-border px-6 py-2 font-bold uppercase tracking-wider bg-[#FFD400] brut-shadow flex items-center gap-2">
            <Lock size={18} />
            Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="w-full flex flex-col pt-12 pb-24 px-6 md:px-12 bg-white relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto w-full z-10">
          <h1 className="text-[120px] md:text-[180px] leading-[0.85] font-black uppercase tracking-tighter mb-12 mix-blend-difference">
            WE BUY.<br />
            WE TEST.<br />
            NO FLUFF.
          </h1>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="max-w-xl text-2xl md:text-3xl font-bold uppercase leading-tight border-l-8 border-black pl-6 py-2">
              Join the next group buy. 40% lower prices. Member-only access. USDT paid. Zero KYC.
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0 mt-8 md:mt-0">
              <button className="brut-border bg-[#0044FF] text-white px-8 py-5 font-black text-2xl uppercase brut-shadow flex items-center justify-center gap-3">
                View Group Buy <ArrowRight size={28} />
              </button>
              <button className="brut-border bg-white text-black px-8 py-5 font-black text-xl uppercase brut-shadow flex items-center justify-center">
                Single Vials
              </button>
            </div>
          </div>
        </div>
        {/* Background decorative element */}
        <div className="absolute top-[-100px] right-[-100px] text-[#FFD400] opacity-20 pointer-events-none select-none z-0">
          <FlaskConical size={800} strokeWidth={0.5} />
        </div>
      </header>

      {/* Trust Strip */}
      <section className="w-full brut-border-y bg-[#FFD400] flex overflow-x-auto no-scrollbar">
        <div className="flex whitespace-nowrap min-w-max items-center divide-x-4 divide-black">
          <div className="px-12 py-6 font-black text-3xl uppercase tracking-wider flex items-center gap-4">
            <FlaskConical size={36} /> Tested by Janoshik
          </div>
          <div className="px-12 py-6 font-black text-3xl uppercase tracking-wider flex items-center gap-4">
            <ShieldAlert size={36} /> No KYC
          </div>
          <div className="px-12 py-6 font-black text-3xl uppercase tracking-wider">
            USDT ONLY
          </div>
          <div className="px-12 py-6 font-black text-3xl uppercase tracking-wider flex items-center gap-4">
            <Users size={36} /> 4,200+ Members
          </div>
          <div className="px-12 py-6 font-black text-3xl uppercase tracking-wider flex items-center gap-4">
            <FlaskConical size={36} /> Tested by Janoshik
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full bg-black text-white font-black uppercase text-4xl p-6 tracking-widest text-center">
        IN STOCK NOW
      </div>

      {/* Products */}
      <section className="w-full p-6 md:p-12 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1400px] mx-auto">
          {products.map((p, i) => (
            <div key={i} className="brut-border flex flex-col bg-white">
              <div className={`p-4 font-black uppercase text-xl ${p.color} brut-border-b`}>
                {p.category}
              </div>
              <div className="p-8 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-4xl uppercase tracking-tight mb-2">{p.name}</h3>
                  <div className="text-xl font-bold mb-8 opacity-60 uppercase">{p.size}</div>
                </div>
                <div>
                  <div className="font-black text-7xl tracking-tighter mb-6">${p.price}</div>
                  <button className="w-full brut-border bg-black text-white py-4 font-black uppercase text-xl brut-shadow hover:bg-[#FFD400] hover:text-black">
                    ADD TO CART
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Testing Pools */}
      <section className="w-full brut-border-y bg-[#0044FF] text-white flex flex-col md:flex-row">
        <div className="p-12 md:p-24 md:w-1/2 flex flex-col justify-center">
          <h2 className="font-black text-7xl md:text-[100px] uppercase leading-[0.85] tracking-tighter mb-8">
            COMMUNITY<br />
            TESTING<br />
            POOLS
          </h2>
          <p className="font-bold text-2xl uppercase mb-12 max-w-xl leading-snug">
            We don't trust. We verify. Members crowdfund blind analytical testing for every batch. 
            No vendor COAs allowed here.
          </p>
          <button className="brut-border bg-[#FFD400] text-black px-8 py-6 font-black text-3xl uppercase brut-shadow w-max flex items-center gap-4">
            Join a Pool <ChevronRight size={36} strokeWidth={3} />
          </button>
        </div>
        <div className="p-12 md:p-24 md:w-1/2 brut-border-l bg-white text-black flex flex-col justify-center items-center">
            <div className="text-center mb-12">
              <div className="text-[150px] font-black leading-none tracking-tighter">14</div>
              <div className="text-3xl font-black uppercase tracking-widest bg-[#FFD400] px-4 py-2 inline-block brut-border mt-4">OPEN POOLS</div>
            </div>
            <div className="w-full space-y-6">
              {[
                { name: "Tirzepatide 15mg - Janoshik", goal: 350, current: 280 },
                { name: "BPC-157 5mg - TrustPill", goal: 200, current: 200 },
                { name: "Retatrutide 10mg - MZ Biolabs", goal: 400, current: 150 }
              ].map((pool, i) => (
                <div key={i} className="w-full brut-border p-4 bg-gray-50 flex flex-col gap-2">
                  <div className="flex justify-between font-bold uppercase">
                    <span>{pool.name}</span>
                    <span>${pool.current} / ${pool.goal}</span>
                  </div>
                  <div className="w-full h-4 bg-white brut-border relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#0044FF]" 
                      style={{ width: `${(pool.current / pool.goal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full bg-[#FF4400] text-black font-black uppercase text-4xl p-6 tracking-widest text-center brut-border-b">
        HOW IT WORKS
      </div>

      {/* How it works */}
      <section className="w-full bg-white grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x-4 divide-black brut-border-b">
        {[
          { num: "01", title: "JOIN", desc: "Waitlist or invite only. We vet members to keep the community tight." },
          { num: "02", title: "FUND", desc: "Pay with USDT only. No credit cards. No trails. Complete privacy." },
          { num: "03", title: "SHIP", desc: "Bulk orders placed. Shipped to discrete locations worldwide." },
          { num: "04", title: "TEST", desc: "Random vials sent directly to Janoshik. Results published to all." }
        ].map((step, i) => (
          <div key={i} className="p-12 flex flex-col">
            <div className="text-[120px] font-black text-[#FFD400] leading-none mb-6" style={{ WebkitTextStroke: '3px black' }}>
              {step.num}
            </div>
            <h3 className="font-black text-4xl uppercase mb-4">{step.title}</h3>
            <p className="font-bold text-xl leading-snug">{step.desc}</p>
          </div>
        ))}
      </section>

      {/* Lab Reports */}
      <section className="w-full p-12 md:p-24 bg-gray-100 flex flex-col items-center">
        <h2 className="font-black text-6xl md:text-[100px] uppercase text-center mb-16 tracking-tighter">
          RADICAL TRANSPARENCY
        </h2>
        <div className="w-full max-w-5xl brut-border bg-white p-8 md:p-16 flex flex-col md:flex-row gap-12 relative brut-shadow">
          <div className="absolute -top-6 -right-6 bg-[#0044FF] text-white font-black px-6 py-2 text-2xl uppercase transform rotate-3 brut-border">
            PASSED
          </div>
          <div className="md:w-1/3 aspect-[3/4] bg-gray-200 brut-border flex items-center justify-center relative overflow-hidden">
             {/* Fake COA visual */}
             <div className="absolute inset-4 brut-border border-gray-400 bg-white p-4 flex flex-col">
                <div className="h-8 bg-gray-300 w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 w-1/2 mb-8"></div>
                <div className="flex-grow flex items-center justify-center">
                  <div className="w-full h-32 flex items-end justify-between px-2 opacity-50">
                     <div className="w-4 bg-black h-4"></div>
                     <div className="w-4 bg-black h-8"></div>
                     <div className="w-4 bg-black h-full"></div>
                     <div className="w-4 bg-black h-2"></div>
                  </div>
                </div>
                <div className="h-16 mt-8 flex justify-between">
                  <div className="w-16 h-16 rounded-full border-4 border-red-500 opacity-50 flex items-center justify-center transform -rotate-12"><span className="text-red-500 font-bold text-[10px]">VERIFIED</span></div>
                </div>
             </div>
          </div>
          <div className="md:w-2/3 flex flex-col justify-center">
            <div className="font-black text-2xl text-[#FF4400] mb-2 uppercase">LATEST BATCH RESULT</div>
            <h3 className="font-black text-5xl uppercase mb-6">Tirzepatide 15mg</h3>
            <div className="grid grid-cols-2 gap-6 mb-8 font-bold text-xl uppercase">
              <div className="flex flex-col">
                <span className="text-gray-500 text-sm">Purity</span>
                <span className="text-3xl text-green-600">99.8%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-sm">Quantity</span>
                <span className="text-3xl">15.2mg</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-sm">Lab</span>
                <span>Janoshik</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-sm">Date</span>
                <span>Oct 24, 2024</span>
              </div>
            </div>
            <button className="brut-border bg-black text-white px-8 py-4 font-black uppercase text-xl w-max hover:bg-white hover:text-black transition-colors">
              View Full Database
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full p-12 md:p-24 bg-white brut-border-y">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="font-black text-[80px] uppercase mb-16 tracking-tighter">NO BULLSHIT FAQ</h2>
          <div className="space-y-6">
            {[
              { q: "Is this legal?", a: "For laboratory research purposes only. Not for human consumption. If you don't know what that means, you don't belong here." },
              { q: "Why USDT only?", a: "Stripe and PayPal hate us. Banks hate us. Crypto guarantees we don't get shut down. Deal with it." },
              { q: "What about refunds?", a: "If the lab test fails, the batch is destroyed and everyone gets credited. If USPS loses your pack, we reship once. That's it." },
              { q: "How do I know you're not scammers?", a: "Look at the testing pools. We use independent third-party labs and the community verifies the results directly." }
            ].map((faq, i) => (
              <div key={i} className="brut-border bg-[#FFD400] p-8 flex flex-col gap-4">
                <h4 className="font-black text-3xl uppercase">{faq.q}</h4>
                <p className="font-bold text-xl bg-white p-6 brut-border">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-black text-white p-12 md:p-24 flex flex-col items-center text-center">
        <h2 className="font-black text-6xl uppercase tracking-tighter mb-8">PEPS ANONYMOUS</h2>
        <div className="font-bold text-2xl text-[#FF4400] max-w-3xl border-4 border-[#FF4400] p-8 uppercase mb-16">
          DISCLAIMER: All products listed on this website are for laboratory research use only. 
          Not for human consumption, therapeutic, or diagnostic use. 
        </div>
        <div className="flex flex-wrap justify-center gap-8 font-bold uppercase mb-16 opacity-60">
          <a href="#" className="hover:opacity-100 hover:text-[#FFD400]">Terms of Service</a>
          <a href="#" className="hover:opacity-100 hover:text-[#FFD400]">Privacy Policy</a>
          <a href="#" className="hover:opacity-100 hover:text-[#FFD400]">Contact</a>
          <a href="#" className="hover:opacity-100 hover:text-[#FFD400]">PGP Key</a>
        </div>
        <div className="font-bold uppercase opacity-40">
          © {new Date().getFullYear()} Salt & Peps. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const products = [
  { name: "BPC-157", size: "5MG VIAL", price: "32", category: "RECOVERY", color: "bg-[#FFD400]" },
  { name: "TB-500", size: "5MG VIAL", price: "38", category: "RECOVERY", color: "bg-[#FFD400]" },
  { name: "Retatrutide", size: "10MG VIAL", price: "115", category: "METABOLIC", color: "bg-[#0044FF] text-white" },
  { name: "Tirzepatide", size: "15MG VIAL", price: "95", category: "METABOLIC", color: "bg-[#0044FF] text-white" },
  { name: "Semaglutide", size: "10MG VIAL", price: "65", category: "METABOLIC", color: "bg-[#0044FF] text-white" },
  { name: "GHK-Cu", size: "100MG VIAL", price: "45", category: "LONGEVITY", color: "bg-[#FF4400] text-white" }
];