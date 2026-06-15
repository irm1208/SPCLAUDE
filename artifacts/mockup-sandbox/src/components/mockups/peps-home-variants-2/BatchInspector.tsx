import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  FileText,
  FlaskConical,
  Activity,
  History,
  Search,
  ShoppingCart,
  Menu,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Beaker,
  FileSearch
} from "lucide-react";

// Mock Data
const INVENTORY = [
  {
    id: "ret-10",
    name: "Retatrutide 10mg",
    price: 20.00,
    lot: "621650",
    status: "TESTED",
    reportId: "JAN-8492-RET",
    testDate: "2026-03-15",
    purity: 99.2,
    endotoxin: 0.8, // EU/mg
    ph: 6.8,
    results: [
      { test: "Identity (MS)", status: "PASS", value: "Confirmed" },
      { test: "Purity (HPLC)", status: "PASS", value: "99.2%" },
      { test: "Mass (Gross)", status: "PASS", value: "10.4mg" },
      { test: "Endotoxin (LAL)", status: "PASS", value: "<1.0 EU/mg" },
      { test: "pH Level", status: "PASS", value: "6.8" },
      { test: "Visual", status: "PASS", value: "White Lyophilized" }
    ],
    history: [
      { lot: "610244", date: "Jan '26", purity: 99.1, endotoxin: 0.9 },
      { lot: "598112", date: "Nov '25", purity: 98.9, endotoxin: 1.2 },
      { lot: "582009", date: "Sep '25", purity: 99.4, endotoxin: 0.5 },
    ]
  },
  {
    id: "bpc-15",
    name: "BPC-157 5mg",
    price: 15.00,
    lot: "622104",
    status: "PENDING_LAB",
    reportId: "PENDING",
    testDate: "Expected 2026-04-20",
    purity: null,
    endotoxin: null,
    ph: null,
    results: [
      { test: "Identity (MS)", status: "PENDING", value: "-" },
      { test: "Purity (HPLC)", status: "PENDING", value: "-" },
      { test: "Mass (Gross)", status: "PENDING", value: "-" },
      { test: "Endotoxin (LAL)", status: "PENDING", value: "-" },
      { test: "pH Level", status: "PENDING", value: "-" },
    ],
    history: [
      { lot: "605992", date: "Dec '25", purity: 99.5, endotoxin: 0.4 },
      { lot: "591003", date: "Oct '25", purity: 99.2, endotoxin: 0.7 },
    ]
  },
  {
    id: "tirz-10",
    name: "Tirzepatide 10mg",
    price: 35.00,
    lot: "619882",
    status: "LOW_STOCK",
    reportId: "JAN-8105-TIR",
    testDate: "2026-02-10",
    purity: 99.6,
    endotoxin: 0.3,
    ph: 7.1,
    results: [
      { test: "Identity (MS)", status: "PASS", value: "Confirmed" },
      { test: "Purity (HPLC)", status: "PASS", value: "99.6%" },
      { test: "Mass (Gross)", status: "PASS", value: "10.2mg" },
      { test: "Endotoxin (LAL)", status: "PASS", value: "<0.5 EU/mg" },
      { test: "pH Level", status: "PASS", value: "7.1" },
      { test: "Visual", status: "PASS", value: "White Lyophilized" }
    ],
    history: [
      { lot: "601223", date: "Jan '26", purity: 99.4, endotoxin: 0.6 },
    ]
  }
];

export default function BatchInspector() {
  const [activeItem, setActiveItem] = useState(INVENTORY[0]);

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D3339] font-sans selection:bg-[#E2E8F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Menu className="h-5 w-5 text-[#64748B]" />
          <div className="font-serif font-bold tracking-tight text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#0F172A]" />
            <span>SALT & PEPS</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 mr-2 text-xs font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            GB_ENDS: 28_OCT_26
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ShoppingCart className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8 border border-[#E2E8F0]">
            <AvatarImage src="/__mockup/images/avatar.jpg" />
            <AvatarFallback className="bg-[#E2E8F0] text-xs font-mono">UB</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
        
        {/* Page Title & Context */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] mb-2 uppercase tracking-wider">
            <Activity className="h-3 w-3" />
            <span>Inspection Terminal / Live Inventory</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#0F172A] leading-tight">
            Batch Verification
          </h1>
          <p className="text-[#475569] text-sm max-w-xl">
            Review detailed analytical data, verify Janoshik reports, and order from tested lots. Trust is verified, never assumed.
          </p>
        </section>

        {/* Compound Selector Strip */}
        <section>
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-3">
              {INVENTORY.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveItem(item)}
                  className={`px-4 py-3 rounded-sm border text-left transition-all ${
                    activeItem.id === item.id
                      ? "bg-white border-[#0F172A] shadow-sm ring-1 ring-[#0F172A]"
                      : "bg-[#F1F5F9]/50 border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1] text-[#64748B]"
                  }`}
                >
                  <div className="font-bold text-sm font-serif text-[#0F172A]">{item.name}</div>
                  <div className="flex items-center justify-between mt-1 gap-4">
                    <span className="font-mono text-xs text-[#64748B]">LOT {item.lot}</span>
                    {item.status === "TESTED" && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">Tested</span>}
                    {item.status === "PENDING_LAB" && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">Pending</span>}
                    {item.status === "LOW_STOCK" && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded uppercase">Low Stock</span>}
                  </div>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </section>

        {/* Active Batch Card */}
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
          <Card className="rounded-sm border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            {/* Batch Header */}
            <div className="bg-[#0F172A] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400">COMPOUND</span>
                  <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 rounded-none text-[10px] h-5">
                    {activeItem.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h2 className="text-2xl font-serif font-bold flex items-baseline gap-3">
                  {activeItem.name}
                  <span className="font-mono text-sm font-normal text-slate-400">/ ${activeItem.price.toFixed(2)}</span>
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-mono text-xs text-slate-400 mb-1">CURRENT LOT</div>
                <div className="font-mono text-xl font-bold tracking-wider">{activeItem.lot}</div>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
                
                {/* Left Col: Key Metrics */}
                <div className="p-5 space-y-6 bg-[#F8FAFC]/50">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                    <Activity className="h-4 w-4" />
                    Key Metrics
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-[#64748B]">PURITY</div>
                      <div className="font-mono text-2xl font-bold text-[#0F172A]">
                        {activeItem.purity ? `${activeItem.purity}%` : '--'}
                      </div>
                      {activeItem.purity && (
                        <div className="text-[10px] text-emerald-600 font-bold uppercase">Pass (&gt;99%)</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-[#64748B]">ENDOTOXIN</div>
                      <div className="font-mono text-2xl font-bold text-[#0F172A]">
                        {activeItem.endotoxin ? activeItem.endotoxin : '--'}
                      </div>
                      {activeItem.endotoxin && (
                        <div className="text-[10px] text-emerald-600 font-bold uppercase">Pass (&lt;1.0 EU)</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-[#64748B]">pH LEVEL</div>
                      <div className="font-mono text-xl font-bold text-[#0F172A]">
                        {activeItem.ph ? activeItem.ph : '--'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-[#64748B]">TEST DATE</div>
                      <div className="font-mono text-sm font-bold text-[#0F172A]">
                        {activeItem.testDate}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-[#E2E8F0]" />

                  <div className="space-y-3">
                    <div className="text-xs font-mono text-[#64748B]">JANOSHIK REPORT</div>
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-[#0F172A]" />
                      <span className="font-mono text-sm font-bold">{activeItem.reportId}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full rounded-sm border-[#0F172A] text-[#0F172A] font-bold text-xs font-mono uppercase tracking-wide hover:bg-[#0F172A] hover:text-white transition-colors"
                      disabled={activeItem.reportId === "PENDING"}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View Original CoA
                    </Button>
                  </div>
                </div>

                {/* Right Col: Test Grid */}
                <div className="p-5 md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                      <ShieldCheck className="h-4 w-4" />
                      Analytical Grid
                    </div>
                    {activeItem.status === "TESTED" || activeItem.status === "LOW_STOCK" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 rounded-none text-xs font-mono">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        CLEARED FOR RESEARCH
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 rounded-none text-xs font-mono">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        AWAITING CLEARANCE
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-sm border border-[#E2E8F0] overflow-hidden">
                    <table className="w-full text-sm font-mono">
                      <thead className="bg-[#F1F5F9] text-[#64748B] text-xs">
                        <tr>
                          <th className="px-4 py-2 text-left font-normal border-b border-[#E2E8F0]">Parameter</th>
                          <th className="px-4 py-2 text-left font-normal border-b border-[#E2E8F0]">Result</th>
                          <th className="px-4 py-2 text-right font-normal border-b border-[#E2E8F0]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white">
                        {activeItem.results.map((res, i) => (
                          <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3 text-[#0F172A]">{res.test}</td>
                            <td className="px-4 py-3 text-[#475569]">{res.value}</td>
                            <td className="px-4 py-3 text-right">
                              {res.status === "PASS" && (
                                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-[10px] uppercase">Pass</span>
                              )}
                              {res.status === "PENDING" && (
                                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded text-[10px] uppercase">Wait</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
            
            {/* Order Action Bar */}
            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-[#475569]">
                <Beaker className="h-4 w-4" />
                <span>Single vials available. Access via Group Buy.</span>
              </div>
              <Button 
                className="w-full sm:w-auto rounded-sm bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-8 shadow-sm"
                disabled={activeItem.status === "PENDING_LAB"}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart — ${activeItem.price.toFixed(2)}
              </Button>
            </div>
          </Card>
        </section>

        {/* Batch History Strip */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#0F172A]">
            <History className="h-4 w-4" />
            Batch Lineage
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {activeItem.history.map((hist, i) => (
              <div key={i} className="bg-white border border-[#E2E8F0] rounded-sm p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm font-bold text-[#0F172A]">LOT {hist.lot}</span>
                  <span className="text-xs text-[#64748B] font-mono">{hist.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#F8FAFC] p-2 rounded-sm border border-[#E2E8F0]">
                    <div className="text-[#64748B] mb-1">PURITY</div>
                    <div className="font-bold text-[#0F172A]">{hist.purity}%</div>
                  </div>
                  <div className="bg-[#F8FAFC] p-2 rounded-sm border border-[#E2E8F0]">
                    <div className="text-[#64748B] mb-1">ENDOTOXIN</div>
                    <div className="font-bold text-[#0F172A]">{hist.endotoxin}</div>
                  </div>
                </div>
              </div>
            ))}
            {activeItem.history.length === 0 && (
              <div className="col-span-3 text-center py-8 text-sm text-[#64748B] border border-dashed border-[#CBD5E1] rounded-sm font-mono">
                NO PREVIOUS BATCH DATA FOUND
              </div>
            )}
          </div>
        </section>

        {/* Utilities Quick Links */}
        <section className="pt-8 border-t border-[#E2E8F0]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-sm border-[#E2E8F0] bg-white hover:border-[#0F172A] hover:bg-[#F8FAFC]">
              <Search className="h-5 w-5 text-[#64748B]" />
              <span className="text-xs font-bold text-[#0F172A]">Order Lookup</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-sm border-[#E2E8F0] bg-white hover:border-[#0F172A] hover:bg-[#F8FAFC]">
              <FlaskConical className="h-5 w-5 text-[#64748B]" />
              <span className="text-xs font-bold text-[#0F172A]">Dose Calc</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-sm border-[#E2E8F0] bg-white hover:border-[#0F172A] hover:bg-[#F8FAFC]">
              <Activity className="h-5 w-5 text-[#64748B]" />
              <span className="text-xs font-bold text-[#0F172A]">Endotoxin Calc</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-sm border-[#E2E8F0] bg-white hover:border-[#0F172A] hover:bg-[#F8FAFC]">
              <FileText className="h-5 w-5 text-[#64748B]" />
              <span className="text-xs font-bold text-[#0F172A]">Protocols</span>
            </Button>
          </div>
        </section>

      </main>

      {/* Bottom Nav Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-6 py-3 flex justify-between items-center z-50 pb-safe">
        <div className="flex flex-col items-center text-[#0F172A]">
          <Activity className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-bold">Batches</span>
        </div>
        <div className="flex flex-col items-center text-[#64748B]">
          <ShoppingCart className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Order</span>
        </div>
        <div className="flex flex-col items-center text-[#64748B]">
          <FileText className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Guides</span>
        </div>
        <div className="flex flex-col items-center text-[#64748B]">
          <Search className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Track</span>
        </div>
      </div>
    </div>
  );
}
