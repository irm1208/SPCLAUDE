import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Globe2, 
  Building2, 
  CalendarDays, 
  Banknote,
  Info,
  Link,
  Copy,
  Lock,
  Clock,
  Eye,
  CheckCircle,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function StepWizardDesktop() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden relative w-full flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex items-center justify-between w-full">
        <div className="flex items-center gap-3 text-[#0F1F38] font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-[#1B3A7A] text-white flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          Salt&Peps
        </div>
        <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          Cancel & Exit
        </button>
      </header>

      {/* PHASE 1 */}
      <div className="w-full flex justify-center py-16 px-8 relative">
        <div className="w-full max-w-5xl flex gap-16 relative">
          
          {/* Left Sidebar */}
          <div className="w-64 shrink-0">
            <div className="sticky top-32">
              <h1 className="text-3xl font-bold tracking-tight text-[#0F1F38] mb-12">New Group Buy</h1>
              
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200 before:z-0">
                <div className="relative z-10 flex gap-4">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-slate-50 shrink-0", step >= 1 ? "bg-[#1B3A7A] text-white" : "bg-slate-200 text-slate-400")}>
                    1
                  </div>
                  <div className={cn("flex flex-col mt-0.5", step === 1 ? "opacity-100" : (step > 1 ? "opacity-60" : "opacity-40"))}>
                    <span className={cn("text-sm font-bold uppercase tracking-wider", step >= 1 ? "text-[#1B3A7A]" : "text-slate-500")}>Basics</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">Name and schedule</span>
                  </div>
                </div>

                <div className="relative z-10 flex gap-4">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-slate-50 shrink-0", step >= 2 ? "bg-[#1B3A7A] text-white" : "bg-slate-200 text-slate-400")}>
                    2
                  </div>
                  <div className={cn("flex flex-col mt-0.5", step === 2 ? "opacity-100" : (step > 2 ? "opacity-60" : "opacity-40"))}>
                    <span className={cn("text-sm font-bold uppercase tracking-wider", step >= 2 ? "text-[#1B3A7A]" : "text-slate-500")}>Supplier</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">Origin and currency</span>
                  </div>
                </div>

                <div className="relative z-10 flex gap-4">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-slate-50 shrink-0", step >= 3 ? "bg-[#1B3A7A] text-white" : "bg-slate-200 text-slate-400")}>
                    3
                  </div>
                  <div className={cn("flex flex-col mt-0.5", step === 3 ? "opacity-100" : (step > 3 ? "opacity-60" : "opacity-40"))}>
                    <span className={cn("text-sm font-bold uppercase tracking-wider", step >= 3 ? "text-[#1B3A7A]" : "text-slate-500")}>Review</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">Confirm draft details</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 max-w-2xl">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 min-h-[520px] flex flex-col">
              <div className="flex-1">
                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-10">
                    <div>
                      <h2 className="text-3xl font-bold text-[#0F1F38] mb-3">Let's start with the basics</h2>
                      <p className="text-slate-500 text-base leading-relaxed max-w-lg">
                        Give your group buy a clear name so participants know exactly what to expect. You can adjust these details later.
                      </p>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-3">
                        <Label htmlFor="gb-name" className="text-base font-semibold text-[#0F1F38]">Group Buy Name</Label>
                        <Input id="gb-name" defaultValue="Polaris Spring Buy" className="h-14 bg-white rounded-xl border-slate-200 focus:border-[#2D6BCC] focus:ring-2 focus:ring-[#2D6BCC]/20 text-lg px-4" />
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="gb-desc" className="text-base font-semibold text-[#0F1F38]">Short Description <span className="text-slate-400 font-normal ml-1">(Optional)</span></Label>
                        <Textarea id="gb-desc" placeholder="What makes this run special?" className="min-h-32 bg-white rounded-xl border-slate-200 focus:border-[#2D6BCC] focus:ring-2 focus:ring-[#2D6BCC]/20 resize-none text-base p-4" />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="gb-date" className="text-base font-semibold text-[#0F1F38]">Target Close Date</Label>
                        <div className="relative max-w-sm">
                          <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input id="gb-date" defaultValue="2026-07-24" type="date" className="h-14 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-2 focus:ring-[#2D6BCC]/20 text-base block w-full" />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
                          <Info className="w-4 h-4" /> 
                          When you plan to stop accepting new orders.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-10">
                    <div>
                      <h2 className="text-3xl font-bold text-[#0F1F38] mb-3">Where is this coming from?</h2>
                      <p className="text-slate-500 text-base leading-relaxed max-w-lg">
                        Supplier details and currency setup. We'll use this to calculate participant totals accurately.
                      </p>
                    </div>

                    <div className="space-y-8 max-w-md">
                      <div className="space-y-3">
                        <Label htmlFor="supplier-name" className="text-base font-semibold text-[#0F1F38]">Manufacturer Name</Label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input id="supplier-name" defaultValue="Polaris Peptides" className="h-14 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-2 focus:ring-[#2D6BCC]/20 text-lg" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="supplier-country" className="text-base font-semibold text-[#0F1F38]">Origin Country</Label>
                        <div className="relative">
                          <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                          <Select defaultValue="cn">
                            <SelectTrigger className="h-14 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-2 focus:ring-[#2D6BCC]/20 text-lg">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cn">China</SelectItem>
                              <SelectItem value="uk">United Kingdom</SelectItem>
                              <SelectItem value="us">United States</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="currency" className="text-base font-semibold text-[#0F1F38]">Primary Currency</Label>
                        <div className="relative">
                          <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                          <Select defaultValue="gbp">
                            <SelectTrigger className="h-14 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-2 focus:ring-[#2D6BCC]/20 text-lg">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gbp">GBP - British Pound</SelectItem>
                              <SelectItem value="usd">USD - US Dollar</SelectItem>
                              <SelectItem value="eur">EUR - Euro</SelectItem>
                              <SelectItem value="usdt">USDT - Tether</SelectItem>
                              <SelectItem value="btc">BTC - Bitcoin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
                          <Info className="w-4 h-4" /> 
                          The currency you will use to pay the manufacturer.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-10">
                    <div>
                      <h2 className="text-3xl font-bold text-[#0F1F38] mb-3">Ready to create draft</h2>
                      <p className="text-slate-500 text-base leading-relaxed max-w-lg">
                        Review the essential details. Once created, you can configure products, add extra fees, and customize access before sharing.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-w-xl">
                      <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Group Buy</p>
                          <h3 className="text-2xl font-bold text-[#0F1F38]">Polaris Spring Buy</h3>
                          <div className="flex items-center gap-2 mt-4 text-sm font-medium text-slate-600 bg-slate-50 inline-flex px-3 py-1.5 rounded-lg border border-slate-100">
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            Closes 24 July 2026
                          </div>
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Supplier</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 text-base text-slate-700 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                            <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-[#0F1F38] truncate">Polaris Peptides</span>
                          </div>
                          <div className="flex items-center gap-3 text-base text-slate-700 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                            <Globe2 className="w-5 h-5 text-slate-400 shrink-0" />
                            <span className="font-medium text-[#0F1F38]">China</span>
                          </div>
                          <div className="flex items-center gap-3 text-base text-slate-700 bg-white p-3 rounded-lg border border-slate-100 shadow-sm col-span-2">
                            <Banknote className="w-5 h-5 text-slate-400 shrink-0" />
                            <span className="font-medium text-[#0F1F38]">GBP (British Pound)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#E9A020]/10 border border-[#E9A020]/20 rounded-xl p-5 flex gap-4 text-[#B0720A] max-w-xl items-start">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm leading-relaxed">
                        <strong className="block mb-1">Nothing is public yet.</strong> 
                        Saving this draft will allow you to continue setting it up, add products, and preview it before submitting for approval.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Footer */}
              <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-100">
                {step > 1 ? (
                  <Button variant="ghost" className="text-slate-500 hover:text-slate-800 px-4 h-12 text-base font-medium" onClick={() => setStep(step - 1)}>
                    <ChevronLeft className="w-5 h-5 mr-2" /> Back
                  </Button>
                ) : (
                  <div />
                )}
                
                {step < 3 ? (
                  <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl px-10 h-14 text-lg shadow-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => setStep(step + 1)}>
                    Continue <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl px-10 h-14 text-lg shadow-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Save Draft
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-24 flex items-center justify-center bg-slate-200/50 my-16 border-y border-slate-200">
        <span className="bg-slate-300 text-slate-600 text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-full shadow-inner">Phase 2: After Saving</span>
      </div>

      {/* PHASE 2 */}
      <div className="bg-slate-50 pb-32 w-full">
        {/* Phase 2 Header */}
        <div className="w-full bg-white border-b border-slate-200 shadow-sm mb-10 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-8 py-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0F1F38]">Polaris Spring Buy</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-sm font-bold border border-slate-200 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Draft
                </span>
                <span className="text-sm text-slate-500 font-medium">Created just now</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl h-11 px-5 font-semibold shadow-sm border-slate-200 text-slate-600">
                <Eye className="w-4 h-4 mr-2" /> Preview Shop
              </Button>
              <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl h-11 px-6 shadow-sm font-semibold">
                Submit for Review
              </Button>
            </div>
          </div>
        </div>

        {/* Phase 2 Content */}
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-3 gap-10">
          
          {/* Main Column */}
          <div className="col-span-2 space-y-10">
            {/* Journey map */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Lifecycle</h2>
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                
                <div className="flex justify-between items-center relative mb-4">
                  {/* Connecting Line */}
                  <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                  
                  {/* Step 1: Draft */}
                  <div className="relative z-10 flex flex-col items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-[#1B3A7A] text-white flex items-center justify-center shrink-0 ring-8 ring-white shadow-sm">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-base font-bold text-[#0F1F38]">Draft</h4>
                      <p className="text-sm text-[#1B3A7A] font-medium mt-1">Current State</p>
                    </div>
                  </div>

                  {/* Step 2: Admin Review */}
                  <div className="relative z-10 flex flex-col items-center gap-4 opacity-60">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-400 flex items-center justify-center shrink-0 ring-8 ring-white">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-base font-bold text-slate-700">Admin Review</h4>
                      <p className="text-sm text-slate-500 mt-1">Pending Submission</p>
                    </div>
                  </div>

                  {/* Step 3: Test & Preview */}
                  <div className="relative z-10 flex flex-col items-center gap-4 opacity-60">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-400 flex items-center justify-center shrink-0 ring-8 ring-white">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-base font-bold text-slate-700">Test & Preview</h4>
                      <p className="text-sm text-slate-500 mt-1">Invite testers</p>
                    </div>
                  </div>

                  {/* Step 4: Listed */}
                  <div className="relative z-10 flex flex-col items-center gap-4 opacity-60">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-400 flex items-center justify-center shrink-0 ring-8 ring-white">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-base font-bold text-slate-700">Listed</h4>
                      <p className="text-sm text-slate-500 mt-1">Live & open</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 bg-slate-50 -mx-8 -mb-8 px-8 pb-8 rounded-b-3xl">
                  <h4 className="text-sm font-bold text-[#0F1F38] mb-2">What to do next:</h4>
                  <p className="text-slate-600 text-base mb-6 max-w-lg leading-relaxed">
                    Set up your products, add shipping rules, and make sure everything looks correct. Then submit this draft for admin approval to proceed to the testing phase.
                  </p>
                  <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl h-12 px-6 font-semibold shadow-sm">
                    Submit for Admin Review
                  </Button>
                </div>
              </div>
            </section>

            {/* Editable Settings Desktop Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Core Settings</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-[#2D6BCC]/30 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</p>
                    <p className="text-lg font-bold text-[#0F1F38]">Polaris Spring Buy</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-sm font-medium text-[#2D6BCC] opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-[#2D6BCC]/30 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Close Date</p>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-slate-400" />
                      <p className="text-lg font-bold text-[#0F1F38]">24 July 2026</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-sm font-medium text-[#2D6BCC] opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                  </div>
                </div>

                <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-[#2D6BCC]/30 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Supplier Configuration</p>
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Manufacturer</p>
                            <p className="text-base font-bold text-[#0F1F38]">Polaris Peptides</p>
                          </div>
                        </div>
                        <div className="w-px h-10 bg-slate-200" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Globe2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Origin</p>
                            <p className="text-base font-bold text-[#0F1F38]">China</p>
                          </div>
                        </div>
                        <div className="w-px h-10 bg-slate-200" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Currency</p>
                            <p className="text-base font-bold text-[#0F1F38]">GBP (British Pound)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-[#2D6BCC] opacity-0 group-hover:opacity-100 transition-opacity">Edit Supplier</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="col-span-1 space-y-8">
            {/* Test Sharing */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Preview Access</h2>
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Invite co-organisers to preview this draft and test the checkout flow before it goes live.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Preview Link</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 flex items-center gap-3 overflow-hidden text-sm group">
                        <Link className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-[#2D6BCC] transition-colors" />
                        <span className="text-slate-700 truncate font-medium">saltpeps.com/gb/preview/8a4f2</span>
                      </div>
                      <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-slate-200 text-slate-600 shrink-0 hover:border-[#2D6BCC] hover:text-[#2D6BCC]">
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Access Code</span>
                      <span className="font-mono font-bold text-[#0F1F38] text-xl">#4821</span>
                    </div>
                    <div className="flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden group cursor-pointer hover:border-[#2D6BCC]/30 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Invite PIN</span>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400 group-hover:text-[#2D6BCC] transition-colors" />
                        <span className="text-base text-slate-600 font-medium group-hover:text-[#0F1F38] transition-colors">Not set</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}