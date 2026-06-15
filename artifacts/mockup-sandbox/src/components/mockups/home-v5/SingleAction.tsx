import React, { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Users, ShieldCheck, CreditCard, ChevronRight, Activity, Beaker } from "lucide-react";

export function SingleAction() {
  const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 22, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
          if (minutes < 0) {
            minutes = 59;
            hours--;
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (val: number) => val.toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-cyan-500/30">
      {/* SECTION 1: HERO - THE KIOSK */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 pb-12 px-6">
        {/* Tiny Nav */}
        <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tighter">
            <Beaker className="w-6 h-6 text-cyan-400" />
            <span>SYNTHESIS</span>
          </div>
          <a href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Member Login
          </a>
        </nav>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center space-y-12">
          {/* Active Group Buy Label */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-cyan-400 font-mono text-sm tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Active Group Buy
          </div>

          {/* Countdown Timer - Airport Flip Clock Vibe */}
          <div className="flex items-center justify-center gap-4 md:gap-8 text-7xl md:text-[9rem] font-black tracking-tighter tabular-nums leading-none">
            <div className="flex flex-col items-center">
              <span className="text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">{formatTime(timeLeft.hours)}</span>
              <span className="text-sm md:text-xl text-slate-500 font-mono tracking-widest uppercase mt-4">Hours</span>
            </div>
            <span className="text-slate-700 animate-pulse pb-12">:</span>
            <div className="flex flex-col items-center">
              <span className="text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">{formatTime(timeLeft.minutes)}</span>
              <span className="text-sm md:text-xl text-slate-500 font-mono tracking-widest uppercase mt-4">Mins</span>
            </div>
            <span className="text-slate-700 animate-pulse pb-12">:</span>
            <div className="flex flex-col items-center">
              <span className="text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]">{formatTime(timeLeft.seconds)}</span>
              <span className="text-sm md:text-xl text-cyan-900 font-mono tracking-widest uppercase mt-4">Secs</span>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Retatrutide 10mg</h1>
            <p className="text-3xl text-slate-400 font-light tracking-tight">$145.00 <span className="text-xl text-slate-600 line-through ml-2">$320.00</span></p>
          </div>

          {/* Single Enormous CTA */}
          <Button size="lg" className="w-full sm:w-auto text-xl md:text-2xl h-20 px-12 md:px-20 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-none uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)]">
            Join This Group Buy
          </Button>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-8 text-slate-400 font-medium">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-cyan-500" />
              <span>4,291 Members Joined</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-cyan-500" />
              <span>Janoshik Verified</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-cyan-500" />
              <span>USDT Payment Only</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: COMMUNITY TESTING POOLS */}
      <section className="bg-white text-slate-900 py-32 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-16 uppercase">Community Testing Pools</h2>
          
          {/* ONE Featured Pool */}
          <div className="w-full bg-slate-50 border-2 border-slate-900 p-8 md:p-16 mb-12 relative overflow-hidden group cursor-pointer transition-all hover:bg-slate-100">
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-xs font-bold px-4 py-2 uppercase tracking-widest">
              Funding Now
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-12 text-left">
              <div className="w-full md:w-1/2 space-y-6">
                <h3 className="text-4xl font-bold tracking-tight">BPC-157 5mg Blind Test</h3>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Independent Janoshik verification for Batch #892. We need 15 more contributors to fund this test.
                </p>
                
                <div className="space-y-4 pt-4">
                  <div className="flex justify-between text-sm font-bold uppercase tracking-widest">
                    <span>Funding Progress</span>
                    <span>85%</span>
                  </div>
                  <div className="h-4 w-full bg-slate-200 rounded-none overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[85%]"></div>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>$255 Raised</span>
                    <span>Goal: $300</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                <Button size="lg" className="w-full md:w-auto h-16 px-10 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-lg font-bold uppercase tracking-widest group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  Contribute $20
                </Button>
              </div>
            </div>
          </div>
          
          <a href="/pools" className="inline-flex items-center gap-2 text-xl font-bold border-b-2 border-slate-900 pb-1 hover:text-cyan-600 hover:border-cyan-600 transition-colors uppercase tracking-widest">
            View All Pools <ArrowRight className="w-6 h-6" />
          </a>
        </div>
      </section>

      {/* SECTION 3: SINGLE VIALS */}
      <section className="bg-slate-900 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-baseline justify-between mb-20 gap-8">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase">Single Vials</h2>
            <a href="/shop" className="inline-flex items-center gap-2 text-xl font-bold border-b-2 border-cyan-500 text-cyan-500 pb-1 hover:text-cyan-400 hover:border-cyan-400 transition-colors uppercase tracking-widest">
              Browse Inventory <ArrowRight className="w-6 h-6" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Tirzepatide 15mg", price: "$65.00", img: "vial-dark-1.png", tag: "Best Seller" },
              { name: "CJC-1295 5mg", price: "$35.00", img: "vial-dark-2.png", tag: "" },
              { name: "Tesamorelin 2mg", price: "$42.00", img: "vial-dark-3.png", tag: "New Batch" }
            ].map((product, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[3/4] bg-slate-800 mb-6 relative overflow-hidden">
                  {product.tag && (
                    <div className="absolute top-4 left-4 z-10 bg-cyan-500 text-slate-950 text-xs font-bold px-3 py-1 uppercase tracking-widest">
                      {product.tag}
                    </div>
                  )}
                  <img 
                    src={`/__mockup/images/${product.img}`} 
                    alt={product.name}
                    className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <Button variant="outline" className="w-full bg-white/10 border-white text-white hover:bg-white hover:text-slate-900 rounded-none uppercase tracking-widest backdrop-blur-sm">
                      Add to Cart
                    </Button>
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-white mb-2 group-hover:text-cyan-400 transition-colors">{product.name}</h3>
                <p className="text-xl text-slate-400 font-light">{product.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: JOIN THE COMMUNITY */}
      <section className="bg-white text-slate-900 py-32 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <Activity className="w-16 h-16 text-cyan-500 mx-auto" />
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">Access Required</h2>
            <p className="text-2xl text-slate-500 leading-relaxed font-light">
              Synthesis is a private sourcing collective. Enter your email and invite code to request membership.
            </p>
          </div>

          <form className="max-w-xl mx-auto space-y-4 pt-8" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col md:flex-row gap-4">
              <Input 
                type="email" 
                placeholder="Email Address" 
                className="h-16 text-lg px-6 rounded-none border-2 border-slate-200 focus-visible:border-slate-900 focus-visible:ring-0"
              />
              <Input 
                type="text" 
                placeholder="Invite Code" 
                className="h-16 text-lg px-6 rounded-none border-2 border-slate-200 focus-visible:border-slate-900 focus-visible:ring-0 md:w-48"
              />
            </div>
            <Button size="lg" className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-xl font-bold uppercase tracking-widest mt-4">
              Apply For Access
            </Button>
          </form>
          
          <p className="text-sm text-slate-400 font-medium uppercase tracking-widest pt-8">
            Current Application Wait Time: ~48 Hours
          </p>
        </div>
      </section>

      {/* Ultra Minimal Footer */}
      <footer className="bg-slate-950 text-slate-500 py-12 text-center text-sm font-mono tracking-widest uppercase">
        <p>© {new Date().getFullYear()} Synthesis Collective. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
