import React from "react";
import { 
  Menu, 
  Search, 
  ShoppingBag, 
  FileText, 
  Activity, 
  ArrowRight,
  ShieldCheck,
  Droplet,
  FlaskConical,
  BookOpen,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function DiscoveryFeed() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f5f0] text-stone-900 font-sans selection:bg-stone-200">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-[#f7f5f0]/80 backdrop-blur-md border-b border-stone-200/50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 hover:bg-stone-200/50 rounded-full transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-serif text-lg tracking-tight font-medium">PEPS ANONYMOUS</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-stone-200/50 rounded-full transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-stone-200/50 rounded-full transition-colors relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#f7f5f0]"></span>
            </button>
            <Avatar className="w-8 h-8 ml-2 border border-stone-200">
              <AvatarImage src="https://api.dicebear.com/7.x/shapes/svg?seed=SP" />
              <AvatarFallback className="bg-stone-200 text-xs font-medium">SP</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        {/* Intro / Status */}
        <section className="mb-12">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500 mb-4 tracking-wide uppercase">
            <Activity className="w-4 h-4" />
            <span>Group Buy Status</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-4 text-stone-900">
            Research Catalog
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed max-w-xl mb-6">
            Access to verified, pure peptide compounds. Next group buy closes <strong>Oct 28, 2026</strong>. 
            All batches strictly Janoshik tested before fulfillment.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white/50 border-stone-300 text-stone-700 font-normal">
              <ShieldCheck className="w-3 h-3 mr-1" /> CoA Tested
            </Badge>
            <Badge variant="outline" className="bg-white/50 border-stone-300 text-stone-700 font-normal">
              USDT Accepted
            </Badge>
            <Badge variant="outline" className="bg-white/50 border-stone-300 text-stone-700 font-normal">
              BAC-Safe
            </Badge>
          </div>
        </section>

        {/* Discovery Feed */}
        <div className="space-y-8">
          {/* Card 1 */}
          <article className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-stone-100 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none px-2 py-0.5 rounded-sm font-medium text-xs tracking-wider uppercase">
                    Tested
                  </Badge>
                  <span className="text-xs text-stone-400 font-medium">LOT 621650</span>
                </div>
                <h2 className="font-serif text-3xl font-medium mb-2">Retatrutide 10mg</h2>
                <p className="text-stone-500 font-medium tracking-wide text-sm mb-4 uppercase">
                  GLP-1/GIP/GCGR Tri-Agonist · Metabolic Research
                </p>
                <div className="flex items-center gap-4 text-sm text-stone-600">
                  <a href="#" className="flex items-center hover:text-stone-900 transition-colors">
                    <FileText className="w-4 h-4 mr-1.5" />
                    View CoA
                  </a>
                  <a href="#" className="flex items-center hover:text-stone-900 transition-colors">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Protocol Guide
                  </a>
                </div>
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-2xl font-serif">$20.00</div>
                <Button className="bg-stone-900 hover:bg-stone-800 text-white rounded-full px-6 py-2 h-auto text-sm font-medium">
                  Add to Order
                </Button>
              </div>
            </div>
          </article>

          {/* Inline Editorial Card */}
          <article className="bg-stone-900 text-stone-100 rounded-2xl p-6 md:p-8 relative overflow-hidden group cursor-pointer">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
              <FlaskConical className="w-32 h-32 rotate-12" />
            </div>
            <div className="relative z-10">
              <h3 className="font-serif text-2xl mb-2">The Lonely Vial</h3>
              <p className="text-stone-400 max-w-md mb-6 leading-relaxed">
                Missed the group buy? Browse our inventory of single vials ready for immediate domestic shipping.
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-stone-300 group-hover:text-white transition-colors">
                <span>Shop Single Vials</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </article>

          {/* Card 2 */}
          <article className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-stone-100 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-100 border-none px-2 py-0.5 rounded-sm font-medium text-xs tracking-wider uppercase">
                    In Testing
                  </Badge>
                  <span className="text-xs text-stone-400 font-medium">LOT 882910</span>
                </div>
                <h2 className="font-serif text-3xl font-medium mb-2">Tirzepatide 15mg</h2>
                <p className="text-stone-500 font-medium tracking-wide text-sm mb-4 uppercase">
                  GLP-1/GIP Dual-Agonist · Weight Management
                </p>
                <div className="flex items-center gap-4 text-sm text-stone-600">
                  <span className="flex items-center text-stone-400 cursor-not-allowed">
                    <FileText className="w-4 h-4 mr-1.5" />
                    CoA Pending
                  </span>
                  <a href="#" className="flex items-center hover:text-stone-900 transition-colors">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Protocol Guide
                  </a>
                </div>
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-2xl font-serif">$28.50</div>
                <Button className="bg-stone-900 hover:bg-stone-800 text-white rounded-full px-6 py-2 h-auto text-sm font-medium">
                  Add to Order
                </Button>
              </div>
            </div>
          </article>

          {/* Card 3 */}
          <article className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-stone-100 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none px-2 py-0.5 rounded-sm font-medium text-xs tracking-wider uppercase">
                    Tested
                  </Badge>
                  <span className="text-xs text-stone-400 font-medium">LOT 441029</span>
                </div>
                <h2 className="font-serif text-3xl font-medium mb-2">BPC-157 5mg</h2>
                <p className="text-stone-500 font-medium tracking-wide text-sm mb-4 uppercase">
                  Gastric Pentadecapeptide · Tissue Recovery
                </p>
                <div className="flex items-center gap-4 text-sm text-stone-600">
                  <a href="#" className="flex items-center hover:text-stone-900 transition-colors">
                    <FileText className="w-4 h-4 mr-1.5" />
                    View CoA
                  </a>
                  <a href="#" className="flex items-center hover:text-stone-900 transition-colors">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Protocol Guide
                  </a>
                </div>
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-2xl font-serif">$12.00</div>
                <Button className="bg-stone-900 hover:bg-stone-800 text-white rounded-full px-6 py-2 h-auto text-sm font-medium">
                  Add to Order
                </Button>
              </div>
            </div>
          </article>

          {/* Quick Utilities Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-stone-200/50">
            <a href="#" className="flex flex-col p-5 rounded-2xl bg-white border border-stone-100 hover:border-stone-300 transition-colors group">
              <Droplet className="w-6 h-6 text-stone-400 mb-3 group-hover:text-stone-900 transition-colors" />
              <h4 className="font-medium text-stone-900 mb-1">Dose Calculator</h4>
              <p className="text-xs text-stone-500 mb-4">Calculate reconstitution volumes and syringe ticks.</p>
              <div className="mt-auto flex items-center text-xs font-medium text-stone-900 uppercase tracking-wide">
                Open Tool <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
            </a>
            
            <a href="#" className="flex flex-col p-5 rounded-2xl bg-white border border-stone-100 hover:border-stone-300 transition-colors group">
              <ShieldCheck className="w-6 h-6 text-stone-400 mb-3 group-hover:text-stone-900 transition-colors" />
              <h4 className="font-medium text-stone-900 mb-1">Endotoxin Calc</h4>
              <p className="text-xs text-stone-500 mb-4">Verify EU/kg safety thresholds for your research subject.</p>
              <div className="mt-auto flex items-center text-xs font-medium text-stone-900 uppercase tracking-wide">
                Open Tool <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
            </a>

            <a href="#" className="flex flex-col p-5 rounded-2xl bg-white border border-stone-100 hover:border-stone-300 transition-colors group">
              <Search className="w-6 h-6 text-stone-400 mb-3 group-hover:text-stone-900 transition-colors" />
              <h4 className="font-medium text-stone-900 mb-1">Order Lookup</h4>
              <p className="text-xs text-stone-500 mb-4">Track fulfillment status using your order code.</p>
              <div className="mt-auto flex items-center text-xs font-medium text-stone-900 uppercase tracking-wide">
                Track Order <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
