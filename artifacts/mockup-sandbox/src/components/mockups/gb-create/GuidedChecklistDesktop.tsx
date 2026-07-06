import React from "react";
import { 
  ArrowRight, 
  Calendar, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Copy, 
  Eye, 
  Globe, 
  Lock, 
  MapPin, 
  PoundSterling, 
  Share, 
  Sparkles, 
  Store, 
  Settings2,
  MoreVertical,
  X,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export function GuidedChecklistDesktop() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans w-full max-w-[1280px] mx-auto shadow-2xl relative overflow-hidden">
      {/* PHASE 1: CREATING */}
      <div className="bg-[#F8FAFC] px-8 py-20 border-b border-slate-200 flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-3">Phase 1</h2>
            <h1 className="text-4xl font-bold text-slate-900">Start a Group Buy</h1>
            <p className="text-slate-500 text-lg mt-2">Just the essentials to get your draft started. Everything else comes later.</p>
          </div>

          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-10">
            {/* Left Column: Form */}
            <div className="flex-1 space-y-6">
              <div className="space-y-3">
                <Label className="text-slate-700 font-semibold text-sm">Group Buy Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Polaris Spring Buy" className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl text-base" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-semibold text-sm">Manufacturer</Label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <Input placeholder="Search..." className="h-12 pl-11 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-semibold text-sm">Origin</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <select className="h-12 w-full pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none">
                      <option>China</option>
                      <option>USA</option>
                      <option>UK</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-semibold text-sm">Base Currency</Label>
                  <div className="relative">
                    <PoundSterling className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <select className="h-12 w-full pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none">
                      <option>GBP (£)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-semibold text-sm">Close Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <Input type="date" className="h-12 pl-11 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl" defaultValue="2026-07-24" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Descriptions & Action */}
            <div className="flex-1 flex flex-col">
              <div className="space-y-3 flex-1">
                <Label className="text-slate-700 font-semibold text-sm flex justify-between">
                  <span>Short Description</span>
                  <span className="text-slate-400 font-normal">Optional</span>
                </Label>
                <Textarea 
                  placeholder="What's the focus of this buy? Mention goals, specialized products, or anything unique." 
                  className="resize-none bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl h-40 text-base" 
                />
              </div>
              
              <div className="mt-8">
                <Button className="w-full bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl h-14 text-lg font-semibold shadow-md shadow-[#1B3A7A]/20 transition-transform active:scale-[0.98]">
                  Create Draft
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-center text-sm text-slate-500 mt-4 flex items-center justify-center gap-1.5">
                  <Lock className="h-4 w-4" /> Nothing is public yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEPARATOR */}
      <div className="relative h-24 bg-[#1B3164] flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2D6BCC] to-transparent opacity-50"></div>
        <div className="bg-white/10 px-6 py-2 rounded-full backdrop-blur-md border border-white/20 z-10 flex items-center gap-3 shadow-lg shadow-black/20">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="text-white text-sm font-bold uppercase tracking-widest">Phase 2: Draft Saved — Core Dashboard</span>
        </div>
      </div>

      {/* PHASE 2: CORE DASHBOARD */}
      <div className="flex-1 bg-[#F8FAFC] pb-24">
        {/* Header */}
        <div className="bg-white px-10 py-8 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Polaris Spring Buy</h1>
                <div className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  DRAFT
                </div>
              </div>
              <p className="text-slate-500 text-base font-medium flex items-center gap-2">
                <Store className="h-4 w-4" /> Polaris Peptides
                <span className="text-slate-300">•</span>
                <MapPin className="h-4 w-4" /> China
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="border-slate-200 text-slate-600 rounded-xl h-11 px-5 font-semibold">
                <Eye className="h-4 w-4 mr-2" />
                Preview Form
              </Button>
              <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl h-11 px-6 font-semibold">
                Submit for Review
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-10 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Guided Checklist Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50/80 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Setup Progress</h3>
                    <p className="text-sm text-slate-500 mt-0.5">2 of 5 steps completed</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Draft Started</span>
                  <span className="text-blue-600">Next: Add Products</span>
                  <span>Listed</span>
                </div>
                <Progress value={40} className="h-2.5 bg-slate-200" />
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Completed Steps */}
                <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors opacity-60">
                  <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-700 line-through">Basic details saved</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors opacity-60">
                  <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-700 line-through">Admin notified</p>
                  </div>
                </div>

                {/* Active Step */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-blue-50 border border-blue-100 transition-colors col-span-1 sm:col-span-2 shadow-sm">
                  <div className="h-8 w-8 rounded-full border-[3px] border-blue-500 text-blue-500 flex items-center justify-center shrink-0 bg-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-blue-900">Add catalog products</p>
                    <p className="text-sm text-blue-700 mt-0.5">What are members buying? Add items to your shop.</p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-10 text-sm font-semibold shadow-sm">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Products
                  </Button>
                </div>

                {/* Future Steps */}
                <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 group-hover:border-slate-400 bg-white">
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-700">Set join PIN <span className="text-slate-400 font-normal ml-1 text-sm">(Optional)</span></p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 group-hover:border-slate-400 bg-white">
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-700">Request public listing</p>
                    <p className="text-sm text-slate-500 mt-0.5">Show on main feed</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                </div>
              </div>
            </div>

            {/* Empty State: Products (To show context) */}
            <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-10 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No products added yet</h3>
              <p className="text-slate-500 max-w-md mt-2">Add the peptides, testing kits, or shipping options members will be able to purchase in this group buy.</p>
              <Button variant="outline" className="mt-6 border-slate-200 text-slate-700 rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Add First Product
              </Button>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Test & Share Card */}
            <div className="bg-[#1B3164] rounded-3xl border border-[#2D6BCC]/30 p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-48 h-48 bg-[#2D6BCC] rounded-full blur-[64px] opacity-30 -mr-10 -mt-10 group-hover:opacity-40 transition-opacity"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
                    <Eye className="h-5 w-5 text-blue-300" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Preview & Test</h3>
                </div>
                
                <p className="text-sm text-blue-100 mb-6 leading-relaxed">
                  While waiting for approval, you can share this link with trusted friends to test-join your buy.
                </p>

                <div className="bg-[#162231] rounded-2xl p-1.5 flex items-center border border-white/10 mb-5 shadow-inner">
                  <div className="flex-1 overflow-hidden px-4">
                    <p className="text-sm text-slate-400 truncate font-mono">saltandpeps.com/gb/polaris</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-10 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl shrink-0 font-medium px-4">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-white/5 rounded-2xl p-5 border border-white/5 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Access Code</p>
                    <p className="text-2xl font-bold text-white tracking-widest font-mono">#4821</p>
                  </div>
                  <Button className="bg-white/10 hover:bg-white/20 text-white rounded-xl h-10 px-5 text-sm font-semibold border border-white/10 backdrop-blur-md">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* Editable Essentials */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-500" />
                  Buy Settings
                </h3>
                <Button variant="ghost" size="sm" className="text-blue-600 h-8 px-3 text-xs font-bold bg-blue-50 hover:bg-blue-100 rounded-lg">
                  Edit All
                </Button>
              </div>
              
              <div className="divide-y divide-slate-100">
                <div className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Name</p>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Polaris Spring Buy</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Close Date</p>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">24 July 2026</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Currency</p>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">GBP (£)</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
