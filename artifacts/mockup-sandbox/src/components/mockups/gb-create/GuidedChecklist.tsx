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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export function GuidedChecklist() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[480px] bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* PHASE 1: CREATING */}
        <div className="bg-[#F8FAFC] px-6 py-8 border-b border-slate-200">
          <div className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Phase 1</h2>
            <h1 className="text-2xl font-bold text-slate-900">Start a Group Buy</h1>
            <p className="text-slate-500 text-sm mt-1">Just the essentials to get your draft started. Everything else comes later.</p>
          </div>

          <div className="space-y-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Group Buy Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Polaris Spring Buy" className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Manufacturer</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search..." className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Origin</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select className="flex h-9 w-full pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option>China</option>
                    <option>USA</option>
                    <option>UK</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Base Currency</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select className="flex h-9 w-full pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option>GBP (£)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Close Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input type="date" className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl" defaultValue="2026-07-24" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-sm flex justify-between">
                <span>Short Description</span>
                <span className="text-slate-400 font-normal">Optional</span>
              </Label>
              <Textarea 
                placeholder="What's the focus of this buy?" 
                className="resize-none bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl h-20" 
              />
            </div>
            
            <div className="pt-2">
              <Button className="w-full bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl h-12 text-base font-semibold shadow-md shadow-[#1B3A7A]/20">
                Create Draft
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" /> Nothing is public yet.
              </p>
            </div>
          </div>
        </div>

        {/* SEPARATOR */}
        <div className="relative h-16 bg-[#1B3164] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          <div className="bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 z-10 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">Draft Saved — Core Dashboard</span>
          </div>
        </div>

        {/* PHASE 2: CORE DASHBOARD */}
        <div className="flex-1 bg-[#F8FAFC] pb-12">
          {/* Header */}
          <div className="bg-white px-6 py-6 border-b border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Polaris Spring Buy</h1>
                <p className="text-slate-500 text-sm font-medium">Polaris Peptides • China</p>
              </div>
              <div className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                DRAFT
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            
            {/* Guided Checklist Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-transparent">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Setup Progress
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">2 of 5 steps completed</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full -mr-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="px-5 py-3 bg-slate-50/50">
                <Progress value={40} className="h-1.5 bg-slate-200" />
              </div>

              <div className="p-2">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors opacity-60">
                  <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 line-through">Basic details saved</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors opacity-60">
                  <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 line-through">Admin notified for review</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 transition-colors">
                  <div className="h-6 w-6 rounded-full border-2 border-blue-500 text-blue-500 flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900">Add catalog products</p>
                    <p className="text-xs text-blue-700 mt-0.5">What are members buying?</p>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-8 text-xs font-semibold shadow-sm">
                    Add
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="h-6 w-6 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 group-hover:border-slate-400">
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Set join PIN <span className="text-slate-400 font-normal ml-1 text-xs">(Optional)</span></p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="h-6 w-6 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 group-hover:border-slate-400">
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Request public listing</p>
                    <p className="text-xs text-slate-500 mt-0.5">Show on the main feed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            </div>

            {/* Test & Share Card */}
            <div className="bg-[#1B3164] rounded-2xl border border-[#2D6BCC]/30 p-5 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#2D6BCC] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-blue-500/20 p-1.5 rounded-lg">
                    <Eye className="h-4 w-4 text-blue-300" />
                  </div>
                  <h3 className="font-bold text-white">Preview & Test</h3>
                </div>
                
                <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                  While waiting for approval, you can share this link with trusted friends to test-join your buy.
                </p>

                <div className="bg-[#162231] rounded-xl p-1 flex items-center border border-white/10 mb-4 shadow-inner">
                  <div className="flex-1 overflow-hidden px-3">
                    <p className="text-xs text-slate-400 truncate font-mono">saltandpeps.com/gb/polaris</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg shrink-0">
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                  <div>
                    <p className="text-xs text-blue-200">Quick Access Code</p>
                    <p className="text-lg font-bold text-white tracking-widest mt-0.5">#4821</p>
                  </div>
                  <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white rounded-lg h-8 px-3 text-xs border border-white/10">
                    <Share className="h-3.5 w-3.5 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* Editable Essentials */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Buy Settings</h3>
                <Button variant="ghost" size="sm" className="text-blue-600 h-8 px-2 text-xs font-semibold">
                  <Settings2 className="h-3.5 w-3.5 mr-1" />
                  All Settings
                </Button>
              </div>
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer rounded-t-2xl">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Name</p>
                    <p className="text-sm font-semibold text-slate-900">Polaris Spring Buy</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Close Date</p>
                    <p className="text-sm font-semibold text-slate-900">24 July 2026</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer rounded-b-2xl">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Currency</p>
                    <p className="text-sm font-semibold text-slate-900">GBP (£)</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
