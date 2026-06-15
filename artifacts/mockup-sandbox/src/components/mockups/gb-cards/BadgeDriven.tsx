import React from "react";
import { Info, X, ChevronRight, Calendar, Clock, Package, DollarSign, ShieldCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BadgeDriven() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-mono text-zinc-300">
      <div className="w-full max-w-[370px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-400">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Active
            </span>
            <span className="flex h-6 items-center rounded-full border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-400">
              Uther
            </span>
          </div>
          <button className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <h2 className="mb-5 text-xl font-bold tracking-tight text-zinc-100">
          Uther April Group Buy
        </h2>

        <div className="mb-6 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
            <ShieldCheck size={12} className="text-blue-400" />
            <span>by Admin</span>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
            <Calendar size={12} className="text-zinc-500" />
            <span>Apr 22</span>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-500/90">
            <Clock size={12} />
            <span>8d left</span>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
            <Package size={12} className="text-zinc-500" />
            <span>1 product</span>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
            <DollarSign size={12} className="text-zinc-500" />
            <span>USD</span>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
            <Tag size={12} className="text-zinc-500" />
            <span>In stock only</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
            <Info size={18} />
          </button>
          
          <Button className="h-10 w-full bg-emerald-500/10 border border-emerald-500/20 font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300">
            Order
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
