import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Beaker, 
  Calculator, 
  Calendar, 
  ChevronRight, 
  Droplet, 
  FileText, 
  Search, 
  ShieldCheck, 
  CheckCircle2,
  Syringe,
  Moon,
  Zap
} from "lucide-react";

export function HealthCompanion() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-violet-500/30 pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-100">
              Good morning, <span className="font-medium text-violet-400">anon.</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">{currentDate}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-tr from-violet-600/20 to-emerald-600/20 backdrop-blur-sm" />
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Today Card */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-medium text-zinc-300 tracking-wide uppercase">Today's Protocol</h2>
          </div>
          
          <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm shadow-xl">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    BPC-157
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/20 font-normal rounded-full px-2 py-0.5 text-xs">
                      Active
                    </Badge>
                  </h3>
                  <p className="text-sm text-zinc-400 mt-0.5">250mcg / Daily / SubQ</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 mb-1">Next dose in</div>
                  <div className="text-sm font-mono text-emerald-400">04:12:00</div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Cycle Progress</span>
                  <span>Day 14 of 30</span>
                </div>
                <Progress value={46} className="h-1.5 bg-zinc-800" indicatorClassName="bg-violet-500" />
              </div>

              <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all">
                <Syringe className="w-4 h-4 mr-2" />
                Log Today's Dose
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Mini Dashboard */}
        <section className="grid grid-cols-2 gap-3">
          <Card className="bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <Activity className="w-5 h-5 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-medium text-zinc-200 mb-1">Last Blood Test</h4>
              <p className="text-xs text-zinc-500 mb-2">14 days ago</p>
              <div className="flex items-center text-xs text-emerald-400/90 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                All markers normal
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800/50">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <Moon className="w-4 h-4 text-indigo-400" />
              </div>
              <h4 className="text-sm font-medium text-zinc-200 mb-1">Subjective Log</h4>
              <p className="text-xs text-zinc-500 mb-2">Energy: 8/10 • Sleep: 7h</p>
              <div className="mt-auto pt-2">
                <button className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center">
                  Update log <ChevronRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="bg-zinc-800/50 my-2" />

        {/* Shop Section */}
        <section>
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-sm font-medium text-zinc-300 tracking-wide uppercase">Available in Shop</h2>
            <button className="text-xs text-violet-400 hover:text-violet-300">View all</button>
          </div>
          
          <div className="flex overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar gap-3">
            {[
              { name: "BPC-157", price: "$45.00", qty: "5mg", tag: "Restock" },
              { name: "TB-500", price: "$55.00", qty: "5mg", tag: "Popular" },
              { name: "CJC-1295", price: "$35.00", qty: "2mg", tag: "New Batch" },
              { name: "GHK-Cu", price: "$40.00", qty: "50mg", tag: "Cosmetic" }
            ].map((product, i) => (
              <Card key={i} className="min-w-[140px] bg-zinc-900/30 border-zinc-800/50 snap-start shrink-0 cursor-pointer hover:border-violet-500/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-6">
                    <Badge variant="outline" className="bg-zinc-800/50 text-zinc-400 border-zinc-700/50 text-[10px] px-1.5 py-0">
                      {product.tag}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-zinc-200 text-sm">{product.name}</h4>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-xs text-zinc-500">{product.qty}</span>
                    <span className="text-sm font-medium text-zinc-300">{product.price}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-zinc-900/50 to-zinc-900/20 border-zinc-800/50 cursor-pointer hover:border-zinc-700 transition-colors group">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-zinc-800/80 flex items-center justify-center group-hover:bg-violet-500/10 transition-colors">
                  <FileText className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">Protocols</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-zinc-900/50 to-zinc-900/20 border-zinc-800/50 cursor-pointer hover:border-zinc-700 transition-colors group">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-zinc-800/80 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                  <Droplet className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">Lab Reports</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Utility Tools */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 tracking-wide uppercase mb-3 px-2 mt-6">Utility Tools</h2>
          <Card className="bg-zinc-900/30 border-zinc-800/50 divide-y divide-zinc-800/50">
            <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <Calculator className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">Dose Calculator</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <Beaker className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">Endotoxin Calculator</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">Order Lookup</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </Card>
        </section>

        {/* Trust Signals */}
        <section className="pt-4 pb-8">
          <div className="flex justify-center items-center gap-6 opacity-60">
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Janoshik Tested</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Beaker className="w-5 h-5 text-violet-400" />
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">BAC Safe</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-emerald-400 text-[8px] font-bold">₮</div>
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">USDT Ready</span>
            </div>
          </div>
        </section>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
