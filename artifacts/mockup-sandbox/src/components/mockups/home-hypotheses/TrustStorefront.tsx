import React from "react";
import { 
  ArrowRight, 
  ShieldCheck, 
  TestTube, 
  FlaskConical, 
  Wallet,
  Star,
  Package,
  Activity,
  Calculator,
  Search,
  Droplets,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function TrustStorefront() {
  return (
    <div className="min-h-[100dvh] bg-[#fdfdfd] text-zinc-900 font-sans selection:bg-violet-200">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-[#fdfdfd]/80 backdrop-blur-md z-50 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-lg">
            P
          </div>
          <span className="font-semibold text-lg tracking-tight">Anonymous</span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Search className="w-5 h-5 text-zinc-600" />
        </Button>
      </header>

      <main className="pb-24">
        {/* Trust Hero */}
        <section className="px-5 pt-12 pb-10 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 px-3 py-1 text-xs font-medium border-violet-200 text-violet-700 bg-violet-50 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Verified Vendor
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-zinc-900 mb-6">
            <span className="text-violet-600">352</span> independent lab reports.<br />
            100% Janoshik verified.
          </h1>
          
          <p className="text-zinc-500 text-lg mb-8 max-w-lg">
            Discreet, premium peptides backed by transparent testing and secure payments.
          </p>

          <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg shadow-violet-600/25 transition-all w-full max-w-sm mb-10 group">
            Browse Verified Peptides
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Evidence Chips */}
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            <div className="flex items-center bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-100 shadow-sm">
              <TestTube className="w-3.5 h-3.5 mr-1.5" />
              Janoshik Tested
            </div>
            <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-100 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              BAC Safe
            </div>
            <div className="flex items-center bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-100 shadow-sm">
              <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
              Endotoxin Safe
            </div>
            <div className="flex items-center bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-100 shadow-sm">
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              USDT Accepted
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent my-4"></div>

        {/* Categories Scroll */}
        <section className="px-5 py-6">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5 snap-x">
            {[
              { icon: Droplets, label: "Single Vials" },
              { icon: Package, label: "Accessories" },
              { icon: TestTube, label: "Lab Reports" },
              { icon: Activity, label: "Protocols" },
            ].map((cat, i) => (
              <button 
                key={i}
                className="flex items-center whitespace-nowrap bg-white border border-zinc-200 shadow-sm hover:border-violet-300 hover:shadow-md transition-all px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 snap-start"
              >
                <cat.icon className="w-4 h-4 mr-2 text-violet-500" />
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="px-5 py-6">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Featured This Week</h2>
            <Button variant="link" className="text-violet-600 p-0 h-auto font-medium">View all</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product 1 */}
            <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <CardContent className="p-0 flex items-center">
                <div className="w-28 h-32 bg-zinc-100 flex-shrink-0 flex items-center justify-center p-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-100/50 to-transparent"></div>
                  <div className="w-full h-full bg-white rounded-lg shadow-sm border border-zinc-200 flex flex-col items-center justify-center">
                    <div className="w-4 h-1 bg-rose-400 rounded-full mb-1"></div>
                    <div className="text-[10px] font-bold text-zinc-400">BPC</div>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-zinc-900 text-base leading-tight group-hover:text-violet-600 transition-colors">BPC-157</h3>
                    <div className="flex items-center text-amber-500 text-xs font-medium">
                      <Star className="w-3 h-3 fill-current mr-0.5" />
                      4.9
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3 line-clamp-1">5mg • Body Protection Compound</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">$45.00</span>
                    <Button size="sm" className="h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs px-3">Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product 2 */}
            <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <CardContent className="p-0 flex items-center">
                <div className="w-28 h-32 bg-zinc-100 flex-shrink-0 flex items-center justify-center p-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-transparent"></div>
                  <div className="w-full h-full bg-white rounded-lg shadow-sm border border-zinc-200 flex flex-col items-center justify-center">
                    <div className="w-4 h-1 bg-blue-400 rounded-full mb-1"></div>
                    <div className="text-[10px] font-bold text-zinc-400">TIRZ</div>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-zinc-900 text-base leading-tight group-hover:text-violet-600 transition-colors">Tirzepatide</h3>
                    <div className="flex items-center text-amber-500 text-xs font-medium">
                      <Star className="w-3 h-3 fill-current mr-0.5" />
                      5.0
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3 line-clamp-1">10mg • GLP-1/GIP Agonist</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">$120.00</span>
                    <Button size="sm" className="h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs px-3">Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Tools */}
        <section className="px-5 py-6 mt-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Quick Tools</h2>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {[
              { icon: Calculator, label: "Reconstitution Calculator", desc: "Calculate exact dosages" },
              { icon: FlaskConical, label: "Endotoxin Limit Tool", desc: "Verify safety margins" },
              { icon: Search, label: "Order Lookup", desc: "Track shipment status" },
            ].map((tool, i) => (
              <div key={i} className="flex items-center p-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0 mr-4 group-hover:bg-violet-100 transition-colors">
                  <tool.icon className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-zinc-900">{tool.label}</h4>
                  <p className="text-xs text-zinc-500">{tool.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-violet-600 transition-colors" />
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Nav Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex justify-around items-center px-6 pb-safe z-50">
        <div className="flex flex-col items-center justify-center w-12 h-full text-violet-600">
          <Droplets className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Shop</span>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-full text-zinc-400 hover:text-zinc-600">
          <TestTube className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Tests</span>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-full text-zinc-400 hover:text-zinc-600">
          <Activity className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Protocols</span>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-full text-zinc-400 hover:text-zinc-600">
          <Search className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Lookup</span>
        </div>
      </div>
    </div>
  );
}
