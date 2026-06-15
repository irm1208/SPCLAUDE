import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Activity,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Plus,
  ArrowRight,
  TrendingUp,
  Droplet,
  Beaker,
  AlertCircle,
  Bell,
  Calculator,
  RefreshCw,
  Clock,
  FileText,
  FlaskConical,
  BookOpen
} from "lucide-react";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", category: "GLP-1", mg: "10", price: "$20.00", inStock: true, lotTag: "TESTED" },
  { id: "8a3f21", name: "Semaglutide 5mg", category: "GLP-1", mg: "5", price: "$18.00", inStock: true, lotTag: "TESTED" },
  { id: "c7d849", name: "BPC-157 5mg", category: "Repair", mg: "5", price: "$15.00", inStock: true, lotTag: "TESTED" },
  { id: "e1b293", name: "TB-500 10mg", category: "Repair", mg: "10", price: "$22.00", inStock: false, lotTag: "COA" },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", category: "GLP-1", mg: "2", price: "$12.00", inStock: true, lotTag: "TESTED" },
  { id: "a91c55", name: "Ipamorelin 5mg", category: "GH", mg: "5", price: "$16.00", inStock: true, lotTag: "TESTED" },
];

const RESOURCES = [
  { label: "The Lonely Vial", sub: "Single-vial, no minimums", path: "/shop", icon: FlaskConical },
  { label: "Accessories", sub: "BAC water, prep kits", path: "/accessories", icon: Package },
  { label: "Lab Reports", sub: "352+ Janoshik CoAs", path: "/tests", icon: FileText },
  { label: "Protocols", sub: "30+ peptide guides", path: "/protocols", icon: BookOpen },
];

const UTILITIES = [
  { label: "Dose Calculator", sub: "Reconstitution volumes", path: "/calculator", icon: Calculator },
  { label: "Endotoxin Calc", sub: "EU/kg safety threshold", path: "/endotoxin", icon: AlertCircle },
  { label: "Order Lookup", sub: "Track by order code", path: "/lookup", icon: Search },
];

export function RegularsDashboard() {
  const inStockProducts = PRODUCTS.filter(p => p.inStock);

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FA] text-slate-900 font-['Inter'] flex justify-center">
      <div className="w-full max-w-[1280px] bg-white flex shadow-sm min-h-screen border-x border-slate-200">
        
        {/* Sidebar */}
        <div className="w-[260px] border-r border-slate-200 bg-slate-50 flex flex-col hidden md:flex shrink-0">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-[#2D6BCC] flex items-center justify-center text-white font-bold text-sm tracking-tighter">
                SP
              </div>
              <span className="font-bold text-slate-900 tracking-tight">SALT & PEPS</span>
            </div>
            <p className="text-xs text-slate-500">Verified Janoshik CoAs</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Resources</div>
              <div className="space-y-1">
                {RESOURCES.map((res, i) => {
                  const Icon = res.icon;
                  return (
                    <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors text-left group">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#2D6BCC]" />
                      <div>
                        <div className="font-medium">{res.label}</div>
                        <div className="text-[11px] text-slate-400">{res.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Utilities</div>
              <div className="space-y-1">
                {UTILITIES.map((util, i) => {
                  const Icon = util.icon;
                  return (
                    <button key={i} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors text-left group">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#2D6BCC]" />
                      <div>
                        <div className="font-medium">{res.label || util.label}</div>
                        <div className="text-[11px] text-slate-400">{util.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Promo - Replacing Group Buy */}
          <div className="p-5 border-t border-slate-200 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2D6BCC]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-[#2D6BCC]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Next dispatch: Mon 7th April</div>
                <div className="text-xs text-slate-500 mt-1 leading-snug">
                  Orders placed before Sunday midnight ship Monday.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col max-w-full overflow-hidden bg-white">
          
          {/* Header */}
          <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
            <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#2D6BCC]" /> 100% Tested</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-slate-900">@urbanblend789</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* TOP ROW: Last Order */}
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-slate-900">Order #SP-2847</span>
                    <span className="text-xs text-slate-500">Placed 3 days ago</span>
                  </div>
                  <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Shipped — tracking code sent to @urbanblend789
                  </p>
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    Items: Retatrutide 10mg ×2
                  </p>
                </div>
                <div className="shrink-0">
                  <Button className="bg-[#2D6BCC] hover:bg-[#2156A6] text-white shadow-none">
                    <RefreshCw className="w-4 h-4 mr-2" /> Reorder
                  </Button>
                </div>
              </div>

              {/* SECOND ROW: 3 Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Tile 1: Quick Reorder */}
                <div className="border border-slate-200 rounded-lg p-5 flex flex-col justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-500" /> Quick Reorder
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-sm">
                        <span className="font-medium text-slate-700">Retatrutide 10mg <span className="text-slate-400 font-normal">· $20</span></span>
                        <button className="w-6 h-6 rounded bg-slate-100 hover:bg-[#2D6BCC] hover:text-white flex items-center justify-center transition-colors text-slate-600">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-sm">
                        <span className="font-medium text-slate-700">BPC-157 5mg <span className="text-slate-400 font-normal">· $15</span></span>
                        <button className="w-6 h-6 rounded bg-slate-100 hover:bg-[#2D6BCC] hover:text-white flex items-center justify-center transition-colors text-slate-600">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tile 2: Restock Alerts */}
                <div className="border border-slate-200 rounded-lg p-5 flex flex-col justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-slate-500" /> Restock Alerts
                    </h3>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      <span className="font-medium text-slate-800">TB-500 10mg</span> back in stock soon.
                    </p>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="@username or email" 
                        className="h-8 text-xs bg-white border-slate-200 shadow-none focus-visible:ring-[#2D6BCC]" 
                      />
                      <Button size="sm" variant="secondary" className="h-8 text-xs shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-700">
                        Notify me
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tile 3: Your Calculators */}
                <div className="border border-slate-200 rounded-lg p-5 flex flex-col justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-slate-500" /> Your Calculators
                    </h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start h-9 text-sm font-normal text-slate-700 bg-white shadow-none border-slate-200 hover:bg-slate-50 hover:text-[#2D6BCC] group">
                        <Droplet className="w-4 h-4 mr-2 text-slate-400 group-hover:text-[#2D6BCC]" />
                        Dose Calc
                      </Button>
                      <Button variant="outline" className="w-full justify-start h-9 text-sm font-normal text-slate-700 bg-white shadow-none border-slate-200 hover:bg-slate-50 hover:text-[#2D6BCC] group">
                        <AlertCircle className="w-4 h-4 mr-2 text-slate-400 group-hover:text-[#2D6BCC]" />
                        Endotoxin Calc
                      </Button>
                    </div>
                  </div>
                </div>

              </div>

              {/* THIRD ROW: Inventory */}
              <div>
                <div className="flex items-center justify-between mb-4 mt-8">
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    New in inventory
                    <Badge variant="secondary" className="bg-[#2D6BCC]/10 text-[#2D6BCC] hover:bg-[#2D6BCC]/20 rounded-full px-2 py-0.5 text-xs font-semibold">
                      {inStockProducts.length}
                    </Badge>
                  </h2>
                  <Button variant="ghost" size="sm" className="text-xs text-[#2D6BCC] hover:bg-[#2D6BCC]/10 hover:text-[#2D6BCC] h-8">
                    View all catalog <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px] text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Compound</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 hidden sm:table-cell">Category</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Price</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inStockProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                          <TableCell className="py-2.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-sm text-slate-800">{product.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 font-mono">#{product.id}</span>
                                <a href="#" className="text-[11px] text-[#2D6BCC] hover:underline flex items-center inline-flex">
                                  Lab report <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                                </a>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 hidden sm:table-cell text-sm text-slate-600">
                            {product.category}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="font-medium text-slate-800 text-sm">{product.price}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <Button size="sm" className="h-8 bg-[#2D6BCC] hover:bg-[#2156A6] text-white shadow-none text-xs px-3">
                              Add <Plus className="w-3 h-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
