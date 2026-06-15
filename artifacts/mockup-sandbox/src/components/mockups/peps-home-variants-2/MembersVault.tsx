import React from "react";
import { 
  ArrowRight,
  Beaker,
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Droplet,
  FileText, 
  Fingerprint,
  Info,
  Lock, 
  Package, 
  ShieldCheck, 
  Sparkles, 
  Star, 
  TrendingUp, 
  Unlock 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Embed custom fonts for this specific component
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');
  
  .font-serif {
    font-family: 'Playfair Display', serif;
  }
  .font-sans {
    font-family: 'Inter', sans-serif;
  }
  
  .vault-gold-gradient {
    background: linear-gradient(135deg, #F9F1E6 0%, #D4AF37 50%, #A67C00 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .vault-glass {
    background: rgba(13, 18, 36, 0.65);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(212, 175, 55, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .vault-glass-subtle {
    background: rgba(13, 18, 36, 0.4);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

export function MembersVault() {
  return (
    <div className="min-h-[100dvh] bg-[#050811] text-slate-300 font-sans pb-24 relative overflow-x-hidden selection:bg-[#D4AF37]/30 selection:text-[#F9F1E6]">
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      {/* Deep, rich background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-[100%] bg-[#0F1C3F] opacity-50 blur-[120px]" />
        <div className="absolute top-[20%] right-[-20%] w-[50%] h-[60%] rounded-[100%] bg-[#241B08] opacity-30 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[70%] h-[40%] rounded-[100%] bg-[#080D1D] opacity-80 blur-[100px]" />
        
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.02] mix-blend-screen" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} 
        />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 70%)'
          }}
        />
      </div>

      <div className="relative z-10 max-w-md mx-auto sm:max-w-2xl lg:max-w-4xl px-5 pt-10">
        
        {/* Header / Identity */}
        <header className="flex justify-between items-start mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#D4AF37]/80">Secure Connection</span>
            </div>
            <h1 className="font-serif text-3xl text-white tracking-wide">
              PEPS <span className="opacity-40 italic">Anonymous</span>
            </h1>
          </div>
          <div className="flex flex-col items-end group cursor-pointer">
            <Avatar className="h-12 w-12 border-2 border-[#D4AF37]/20 group-hover:border-[#D4AF37]/60 transition-colors shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <AvatarFallback className="bg-[#0F1C3F] text-[#D4AF37] font-serif text-lg">UB</AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-slate-400 mt-2 font-medium tracking-wide group-hover:text-slate-200 transition-colors">@urbanblend789</span>
          </div>
        </header>

        {/* IA Section 1: The User (Member Status) */}
        <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <div className="vault-glass rounded-2xl p-7 relative overflow-hidden">
            {/* Decorative watermark */}
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none rotate-12">
              <Fingerprint className="w-64 h-64 text-white" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-1">Welcome back</h2>
              <p className="font-serif text-4xl text-white mb-8">UrbanBlend.</p>
              
              <div className="grid grid-cols-3 gap-6 relative">
                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Tenure
                  </p>
                  <p className="font-serif text-xl text-white">Jan '25</p>
                </div>
                <div className="pl-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Status
                  </p>
                  <p className="text-sm text-white flex items-center gap-2 mt-1.5 font-medium tracking-wide">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-40"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                    </span>
                    Verified
                  </p>
                </div>
                <div className="pl-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Requisitions
                  </p>
                  <p className="font-serif text-xl text-white">03</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IA Section 2: Your Orders (Active Order Hero) */}
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 ease-out fill-mode-both">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h3 className="font-serif text-2xl text-white">Active Order</h3>
              <p className="text-xs text-slate-400 mt-1">Requisition in progress</p>
            </div>
            <Button variant="ghost" className="text-[#D4AF37] hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/10 h-auto py-1 px-3 text-xs font-semibold uppercase tracking-wider rounded-full">
              Full History <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </div>
          
          <div className="vault-glass-subtle rounded-2xl border-t border-t-[#D4AF37]/30 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="text-[#D4AF37]">ID:</span> ORD-77A9X-26
                </p>
                <h4 className="font-serif text-xl text-white">Retatrutide 10mg <span className="text-[#D4AF37] text-sm ml-1 font-sans font-medium">x3</span></h4>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full">
                  In Transit
                </Badge>
                <span className="text-xs text-slate-400 font-medium">$60.00 USDT</span>
              </div>
            </div>
            
            <div className="bg-[#050811]/50 rounded-xl p-4 border border-white/5 mb-2 relative overflow-hidden">
              {/* Progress glow effect */}
              <div className="absolute top-0 left-[65%] w-32 h-full bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent -translate-x-1/2" />
              
              <div className="flex justify-between text-xs mb-3">
                <span className="text-slate-400">Dispatched: <span className="text-slate-300">Apr 24</span></span>
                <span className="font-medium text-[#D4AF37]">ETA: May 2</span>
              </div>
              
              {/* Custom segmented progress bar */}
              <div className="flex items-center gap-1.5 h-1.5">
                <div className="h-full flex-1 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]"></div>
                <div className="h-full flex-1 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]"></div>
                <div className="h-full flex-1 rounded-full bg-[#1E293B] relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-[30%] bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]"></div>
                </div>
                <div className="h-full flex-1 rounded-full bg-[#1E293B]"></div>
              </div>
              <div className="flex justify-between text-[9px] uppercase tracking-widest text-slate-500 mt-2 font-medium">
                <span>Ordered</span>
                <span>Tested</span>
                <span className="text-white">Shipping</span>
                <span>Delivered</span>
              </div>
            </div>
          </div>
        </section>

        {/* IA Section 3: Personalized Recommendations */}
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 ease-out fill-mode-both">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h3 className="font-serif text-2xl text-white">Recommended</h3>
              <p className="text-xs text-slate-400 mt-1">Based on your past research</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Compound 1 - Primary Recommendation */}
            <div className="group relative rounded-2xl border border-white/5 bg-[#0A1020] hover:bg-[#0F1C3F] transition-all duration-300 p-5 flex items-center gap-5 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
              
              <div className="w-14 h-14 rounded-xl bg-[#050811] flex items-center justify-center border border-white/10 group-hover:border-[#D4AF37]/30 transition-colors shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <Beaker className="w-6 h-6 text-[#D4AF37]" />
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-serif text-lg text-slate-200 group-hover:text-white transition-colors">Tirzepatide 10mg</h4>
                  <span className="font-sans font-medium text-white">$65.00</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">Next allocation: June</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] uppercase tracking-widest h-5 px-2">
                    Coming Soon
                  </Badge>
                </div>
              </div>
              
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]/30 transition-all bg-[#050811]">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Compound 2 - Secondary */}
            <div className="group relative rounded-2xl border border-white/5 bg-[#0A1020] hover:bg-[#0F1C3F] transition-all duration-300 p-5 flex items-center gap-5 cursor-pointer">
              <div className="w-14 h-14 rounded-xl bg-[#050811] flex items-center justify-center border border-white/10 group-hover:border-slate-500/30 transition-colors shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <Droplet className="w-6 h-6 text-slate-400" />
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-serif text-lg text-slate-200 group-hover:text-white transition-colors">BPC-157 5mg</h4>
                  <span className="font-sans font-medium text-white">$14.50</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">LOT 89012 • Synergy match</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase tracking-widest h-5 px-2">
                    Tested
                  </Badge>
                </div>
              </div>
              
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white transition-all bg-[#050811]">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <Button className="w-full mt-4 bg-transparent border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl h-14 text-xs font-semibold uppercase tracking-widest transition-all">
            Browse All Inventory
          </Button>
        </section>

        {/* IA Section 4: Browse & Utilities (Intelligence) */}
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 ease-out fill-mode-both">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Stats / Trust */}
            <div className="col-span-2 vault-glass-subtle rounded-xl p-5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Independent Testing</p>
                  <p className="font-serif text-xl text-white">352+ <span className="font-sans text-sm text-slate-400 italic">Janoshik CoAs</span></p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            
            <div className="vault-glass-subtle rounded-xl p-5 flex flex-col justify-between group cursor-pointer hover:bg-white/[0.03] transition-colors">
              <FileText className="w-5 h-5 text-[#D4AF37] mb-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              <div>
                <p className="font-serif text-lg text-white mb-1">Protocols</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">30+ Research Guides</p>
              </div>
            </div>
            
            <div className="vault-glass-subtle rounded-xl p-5 flex flex-col justify-between group cursor-pointer hover:bg-white/[0.03] transition-colors">
              <Beaker className="w-5 h-5 text-[#D4AF37] mb-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              <div>
                <p className="font-serif text-lg text-white mb-1">Calculators</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Dose & Endotoxin</p>
              </div>
            </div>
          </div>
          
          {/* Support / Help */}
          <div className="bg-[#050811] border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-400 font-medium tracking-wide">Need assistance with your order?</span>
            </div>
            <span className="text-xs text-slate-200 underline decoration-slate-600 underline-offset-4 cursor-pointer hover:text-white transition-colors">Contact Support</span>
          </div>
        </section>

      </div>
    </div>
  );
}
