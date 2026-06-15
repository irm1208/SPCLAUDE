import React, { useState } from "react";
import {
  Home,
  ShoppingBag,
  TestTubes,
  BookOpen,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Gem,
  Pill,
  Fingerprint
} from "lucide-react";

export function TabbedHub() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "home" && <HomeTab setActiveTab={setActiveTab} />}
        {activeTab === "shop" && <PlaceholderTab title="Shop" icon={<ShoppingBag className="w-12 h-12 text-violet-500 mb-4" />} />}
        {activeTab === "lab" && <PlaceholderTab title="Lab Reports" icon={<TestTubes className="w-12 h-12 text-teal-500 mb-4" />} />}
        {activeTab === "protocols" && <PlaceholderTab title="Protocols" icon={<BookOpen className="w-12 h-12 text-indigo-500 mb-4" />} />}
        {activeTab === "tools" && <PlaceholderTab title="Tools" icon={<Wrench className="w-12 h-12 text-zinc-500 mb-4" />} />}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-50">
        <TabItem id="home" label="Home" icon={Home} activeTab={activeTab} onClick={setActiveTab} />
        <TabItem id="shop" label="Shop" icon={ShoppingBag} activeTab={activeTab} onClick={setActiveTab} />
        <TabItem id="lab" label="Lab" icon={TestTubes} activeTab={activeTab} onClick={setActiveTab} />
        <TabItem id="protocols" label="Protocols" icon={BookOpen} activeTab={activeTab} onClick={setActiveTab} />
        <TabItem id="tools" label="Tools" icon={Wrench} activeTab={activeTab} onClick={setActiveTab} />
      </div>
    </div>
  );
}

function HomeTab({ setActiveTab }: { setActiveTab: (id: string) => void }) {
  return (
    <div className="flex flex-col min-h-full p-4 pt-12">
      {/* Brand Mark */}
      <div className="flex flex-col items-center justify-center mb-8 space-y-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-900 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-violet-500/20">
          <span className="font-bold text-white tracking-widest text-lg">PA</span>
        </div>
        <h1 className="text-zinc-200 text-[10px] tracking-[0.3em] font-medium uppercase">Peps Anonymous</h1>
      </div>

      {/* Stat Chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <StatChip icon={Pill} text="52 Vials In Stock" delay="0" />
        <StatChip icon={TestTubes} text="352 Lab Reports" delay="100" />
        <StatChip icon={BookOpen} text="30+ Peptides Documented" delay="200" />
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Tile 
          title="Shop" 
          description="Vials & Kits" 
          icon={ShoppingBag} 
          colorClass="from-violet-500/20 to-violet-900/10 text-violet-400 border-violet-500/20" 
          glowClass="shadow-[0_0_30px_rgba(139,92,246,0.1)]"
          onClick={() => setActiveTab("shop")}
        />
        <Tile 
          title="Lab Reports" 
          description="Janoshik verified" 
          icon={TestTubes} 
          colorClass="from-teal-500/20 to-teal-900/10 text-teal-400 border-teal-500/20" 
          glowClass="shadow-[0_0_30px_rgba(20,184,166,0.1)]"
          onClick={() => setActiveTab("lab")}
        />
        <Tile 
          title="Protocols" 
          description="Dosing guides" 
          icon={BookOpen} 
          colorClass="from-indigo-500/20 to-indigo-900/10 text-indigo-400 border-indigo-500/20" 
          glowClass="shadow-[0_0_30px_rgba(99,102,241,0.1)]"
          onClick={() => setActiveTab("protocols")}
        />
        <Tile 
          title="Accessories" 
          description="Water & Supplies" 
          icon={Gem} 
          colorClass="from-amber-500/20 to-amber-900/10 text-amber-400 border-amber-500/20" 
          glowClass="shadow-[0_0_30px_rgba(245,158,11,0.1)]"
          onClick={() => setActiveTab("shop")}
        />
      </div>

      {/* Trust Signals */}
      <div className="mt-auto mb-4 bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-zinc-400 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
          <span>100% Janoshik Tested</span>
        </div>
        <div className="h-px w-full bg-white/5" />
        <div className="flex items-center gap-3 text-zinc-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-blue-400/80" />
          <span>BAC Safe & Verified</span>
        </div>
        <div className="h-px w-full bg-white/5" />
        <div className="flex items-center gap-3 text-zinc-400 text-xs font-medium">
          <Fingerprint className="w-4 h-4 text-violet-400/80" />
          <span>Discreet USDT Payments</span>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, text, delay }: { icon: any; text: string; delay: string }) {
  return (
    <div 
      className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
      <span className="text-[10px] font-medium text-zinc-300">{text}</span>
    </div>
  );
}

function Tile({ title, description, icon: Icon, colorClass, glowClass, onClick }: { title: string; description: string; icon: any; colorClass: string; glowClass: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative aspect-square flex flex-col items-start justify-between p-4 rounded-[24px] bg-gradient-to-br border text-left transition-all active:scale-[0.98] ${colorClass} ${glowClass}`}
    >
      <div className="p-2.5 rounded-full bg-black/20 border border-white/10 backdrop-blur-md">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm mb-0.5">{title}</h3>
        <p className="text-white/60 text-[10px] line-clamp-1">{description}</p>
      </div>
    </button>
  );
}

function TabItem({ id, label, icon: Icon, activeTab, onClick }: { id: string; label: string; icon: any; activeTab: string; onClick: (id: string) => void }) {
  const isActive = activeTab === id;
  return (
    <button 
      onClick={() => onClick(id)}
      className="flex flex-col items-center justify-center w-16 h-full gap-1"
    >
      <div className={`relative p-1 transition-colors duration-300 ${isActive ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
        <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} />
        {isActive && (
          <span className="absolute -top-0.5 right-0 w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
        )}
      </div>
      <span className={`text-[9px] font-medium transition-colors duration-300 ${isActive ? 'text-violet-400' : 'text-zinc-600'}`}>
        {label}
      </span>
    </button>
  );
}

function PlaceholderTab({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] opacity-60 px-6 text-center animate-in fade-in duration-500">
      {icon}
      <h2 className="text-xl font-semibold text-zinc-200 mb-2">{title}</h2>
      <p className="text-xs text-zinc-500">This is a placeholder for the {title.toLowerCase()} section. In the real app, this tab would own the full screen.</p>
    </div>
  );
}
