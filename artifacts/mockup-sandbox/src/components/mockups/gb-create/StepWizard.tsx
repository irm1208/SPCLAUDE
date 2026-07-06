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
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function StepWizard() {
  const [step, setStep] = useState(1);

  return (
    <div className="mx-auto w-full max-w-[480px] bg-slate-50 min-h-[100dvh] flex flex-col font-sans text-slate-900 shadow-xl overflow-hidden relative">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-[#0F1F38]">New Group Buy</h1>
        <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          Cancel
        </button>
      </header>

      {/* PHASE 1 */}
      <div className="flex-1 flex flex-col px-6 py-8">
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-10">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-1 rounded-full w-full bg-[#1B3A7A] transition-all" />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", step >= 1 ? "text-[#1B3A7A]" : "text-slate-400")}>
              Basics
            </span>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className={cn("h-1 rounded-full w-full transition-all", step >= 2 ? "bg-[#1B3A7A]" : "bg-slate-200")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", step >= 2 ? "text-[#1B3A7A]" : "text-slate-400")}>
              Supplier
            </span>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className={cn("h-1 rounded-full w-full transition-all", step >= 3 ? "bg-[#1B3A7A]" : "bg-slate-200")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", step >= 3 ? "text-[#1B3A7A]" : "text-slate-400")}>
              Review
            </span>
          </div>
        </div>

        <div className="flex-1">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-8">
              <div>
                <h2 className="text-2xl font-bold text-[#0F1F38] mb-2">Let's start with the basics</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Give your group buy a clear name so participants know exactly what to expect. You can adjust these details later.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gb-name" className="text-sm font-semibold text-[#0F1F38]">Group Buy Name</Label>
                  <Input id="gb-name" defaultValue="Polaris Spring Buy" className="h-12 bg-white rounded-xl border-slate-200 focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC] text-base" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gb-desc" className="text-sm font-semibold text-[#0F1F38]">Short Description <span className="text-slate-400 font-normal ml-1">(Optional)</span></Label>
                  <Textarea id="gb-desc" placeholder="What makes this run special?" className="min-h-24 bg-white rounded-xl border-slate-200 focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC] resize-none text-base p-4" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gb-date" className="text-sm font-semibold text-[#0F1F38]">Target Close Date</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input id="gb-date" defaultValue="2026-07-24" type="date" className="h-12 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC] text-base block w-full" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> 
                    When you plan to stop accepting new orders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-8">
              <div>
                <h2 className="text-2xl font-bold text-[#0F1F38] mb-2">Where is this coming from?</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Supplier details and currency setup. We'll use this to calculate participant totals accurately.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name" className="text-sm font-semibold text-[#0F1F38]">Manufacturer Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input id="supplier-name" defaultValue="Polaris Peptides" className="h-12 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC] text-base" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-country" className="text-sm font-semibold text-[#0F1F38]">Origin Country</Label>
                  <div className="relative">
                    <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                    <Select defaultValue="cn">
                      <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC] text-base">
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

                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm font-semibold text-[#0F1F38]">Primary Currency</Label>
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                    <Select defaultValue="gbp">
                      <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 pl-12 focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC] text-base">
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
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> 
                    The currency you will use to pay the manufacturer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0F1F38] mb-2">Ready to create draft</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Review the essential details. Once created, you can configure products, add extra fees, and customize access before sharing.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Group Buy</p>
                  <h3 className="text-lg font-bold text-[#0F1F38]">Polaris Spring Buy</h3>
                  <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Closes 24 July 2026
                  </div>
                </div>
                <div className="p-5 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Supplier</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-[#0F1F38]">Polaris Peptides</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <Globe2 className="w-4 h-4 text-slate-400" />
                      China
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <Banknote className="w-4 h-4 text-slate-400" />
                      GBP (British Pound)
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#E9A020]/10 border border-[#E9A020]/20 rounded-xl p-4 flex gap-3 text-[#B0720A]">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Nothing is public yet.</strong> Saving this draft will allow you to continue setting it up and preview it before submitting for approval.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between pt-6 border-t border-slate-200/60">
          {step > 1 ? (
            <Button variant="ghost" className="text-slate-500 hover:text-slate-800 px-0 hover:bg-transparent" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl px-8 h-12 text-base shadow-sm" onClick={() => setStep(step + 1)}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-xl px-8 h-12 text-base shadow-sm font-medium">
              Save Draft
            </Button>
          )}
        </div>

      </div>

      <div className="h-16 flex items-center justify-center bg-slate-200/50 mt-12 mb-8 border-y border-slate-200">
        <span className="bg-slate-300 text-slate-600 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">Phase 2: After Saving</span>
      </div>

      {/* PHASE 2 */}
      <div className="bg-slate-50 pb-20">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0F1F38]">Polaris Spring Buy</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                  <Clock className="w-3 h-3" /> Draft
                </span>
                <span className="text-xs text-slate-400">Created just now</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg h-9 font-medium shadow-sm border-slate-200">
              <Eye className="w-4 h-4 mr-2 text-slate-500" /> Preview
            </Button>
          </div>
        </header>

        <div className="px-6 py-6 space-y-8">
          
          {/* Journey map */}
          <section>
            <h2 className="text-sm font-bold text-[#0F1F38] uppercase tracking-wider mb-4">Journey</h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute top-3 left-[14px] bottom-3 w-px bg-slate-100" />
                
                <div className="flex gap-4 relative z-10 mb-6">
                  <div className="w-7 h-7 rounded-full bg-[#1B3A7A] text-white flex items-center justify-center shrink-0 ring-4 ring-white">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F1F38]">Draft</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      You are here. Set up products and test the flow.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10 mb-6">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 ring-4 ring-white">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <div className="opacity-60">
                    <h4 className="text-sm font-bold text-slate-700">Admin Review</h4>
                    <p className="text-xs text-slate-500 mt-1">Submit when ready for approval.</p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10 mb-6">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 ring-4 ring-white">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <div className="opacity-60">
                    <h4 className="text-sm font-bold text-slate-700">Test & Preview</h4>
                    <p className="text-xs text-slate-500 mt-1">Invite test users before going live.</p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 ring-4 ring-white">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <div className="opacity-60">
                    <h4 className="text-sm font-bold text-slate-700">Listed</h4>
                    <p className="text-xs text-slate-500 mt-1">Live and accepting orders.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-600">Ready for next step?</span>
                <Button className="bg-[#1B3A7A] hover:bg-[#1B3A7A]/90 text-white rounded-lg h-9 px-4 text-sm font-medium">
                  Submit for Review
                </Button>
              </div>
            </div>
          </section>

          {/* Test Sharing */}
          <section>
            <h2 className="text-sm font-bold text-[#0F1F38] uppercase tracking-wider mb-4">Preview Access</h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                You can already invite others to preview this draft and test the checkout flow.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 flex items-center gap-2 overflow-hidden text-sm">
                    <Link className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600 truncate">saltpeps.com/gb/preview/8a4f2</span>
                  </div>
                  <Button variant="outline" className="h-10 px-3 rounded-lg border-slate-200 text-slate-600 shrink-0">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Access Code</span>
                    <span className="font-mono font-medium text-[#0F1F38] text-lg">#4821</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg p-3 relative overflow-hidden group cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Invite PIN</span>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-600 font-medium">Not set</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Editable settings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#0F1F38] uppercase tracking-wider">Core Settings</h2>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Name</p>
                  <p className="text-sm font-medium text-[#0F1F38]">Polaris Spring Buy</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Target Close Date</p>
                  <p className="text-sm font-medium text-[#0F1F38]">24 July 2026</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Supplier</p>
                  <div className="flex flex-col gap-1 mt-1 text-sm font-medium text-[#0F1F38]">
                    <span>Polaris Peptides</span>
                    <span className="text-slate-500 font-normal">China &bull; GBP</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
