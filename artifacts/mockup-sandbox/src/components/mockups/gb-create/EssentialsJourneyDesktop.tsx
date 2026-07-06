import React from 'react';
import { 
  ChevronRight, ArrowRight, Copy, Share, Lock, 
  Info, CheckCircle2, AlertCircle, Eye, Settings, 
  Globe, Calendar, CreditCard, ChevronDown, Check, Link2
} from 'lucide-react';

export function EssentialsJourneyDesktop() {
  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center py-20 px-8 font-sans text-slate-900 w-full">
      {/* Container for desktop 1280px design */}
      <div className="w-full max-w-6xl flex flex-col gap-28">
        
        {/* ========================================================= */}
        {/* PHASE 1: CREATING */}
        {/* ========================================================= */}
        <section className="grid grid-cols-12 gap-16 items-start">
          
          {/* Left Column: Context & Lifecycle */}
          <div className="col-span-5 flex flex-col gap-10 sticky top-20">
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-semibold text-[#1B3164] tracking-tight">New Group Buy</h1>
              <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                Set up the essentials. You can configure rules, shipping, and advanced details later.
              </p>
            </div>

            {/* Lifecycle Strip */}
            <div className="bg-[#EBE9E2] rounded-full px-5 py-4 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#1B3164]"></div>
                 <span className="text-xs font-bold uppercase tracking-widest text-[#1B3164]">Draft</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Review</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Preview</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Live</span>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="col-span-7">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-8 flex flex-col gap-8">
                {/* Field: Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Group Buy Name *</label>
                  <input 
                    type="text" 
                    defaultValue="Polaris Spring Buy"
                    className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-xl px-5 py-4 text-lg text-slate-900 font-medium outline-none transition-all"
                  />
                </div>

                {/* Field: Manufacturer & Country */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Manufacturer</label>
                    <input 
                      type="text" 
                      defaultValue="Polaris Peptides"
                      className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-xl px-5 py-4 text-slate-900 font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Country</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-xl pl-5 pr-12 py-4 text-slate-900 font-medium outline-none transition-all">
                        <option>China</option>
                        <option>UK</option>
                        <option>USA</option>
                      </select>
                      <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Field: Currency & Close Date */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Currency</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-xl pl-5 pr-12 py-4 text-slate-900 font-medium outline-none transition-all">
                        <option>GBP (£)</option>
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>USDT</option>
                        <option>BTC</option>
                      </select>
                      <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Close Date</label>
                    <input 
                      type="text" 
                      defaultValue="24 Jul 2026"
                      className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-xl px-5 py-4 text-slate-900 font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Field: Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                    <span>Short Description</span>
                    <span className="text-slate-400 font-normal normal-case tracking-normal">Optional</span>
                  </label>
                  <textarea 
                    rows={3}
                    defaultValue="Q3 wholesale bulk order for Polaris items."
                    className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-xl px-5 py-4 text-slate-900 font-medium outline-none transition-all resize-none"
                  />
                </div>
              </div>
              
              <div className="bg-slate-50 p-8 border-t border-slate-100 flex items-center justify-between gap-8">
                <div className="flex items-start gap-3 max-w-md">
                  <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-500 leading-snug">
                    Only you can see this draft. Nothing is public until the review is complete and you explicitly list it.
                  </p>
                </div>
                <button className="shrink-0 bg-[#1B3164] hover:bg-[#13244D] text-white font-medium px-8 py-4 rounded-xl transition-colors flex items-center justify-center gap-3">
                  <span className="text-lg">Save Draft</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* DIVIDER */}
        {/* ========================================================= */}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-300 border-dashed"></div>
          <span className="shrink-0 px-6 text-sm font-bold uppercase tracking-widest text-slate-400 bg-[#F4F3EF]">
            Phase 2: After Saving
          </span>
          <div className="flex-grow border-t border-slate-300 border-dashed"></div>
        </div>

        {/* ========================================================= */}
        {/* PHASE 2: JUST AFTER SAVING (CORE SCREEN) */}
        {/* ========================================================= */}
        <section className="flex flex-col gap-10 pb-24">
          
          {/* Top header / Status */}
          <div className="flex items-end justify-between border-b border-slate-300/60 pb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-[#1B3164] tracking-tight">Polaris Spring Buy</h1>
                <div className="bg-[#EBE9E2] text-[#1B3164] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest self-center shadow-inner">
                  Draft
                </div>
              </div>
              <p className="text-base text-slate-500">Created 2 mins ago</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Journey & Sharing */}
            <div className="col-span-7 flex flex-col gap-10">
              
              {/* Journey Card (Orientation) */}
              <div className="bg-[#1B3164] rounded-3xl shadow-lg overflow-hidden text-white relative">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                  <CheckCircle2 className="w-48 h-48" />
                </div>
                <div className="p-8 md:p-10 flex flex-col gap-6 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
                    <span className="text-sm font-bold uppercase tracking-widest text-blue-200">Current Phase</span>
                  </div>
                  
                  <h2 className="text-3xl font-semibold text-white leading-tight">
                    Waiting for Admin Approval
                  </h2>
                  
                  <p className="text-blue-100 text-lg leading-relaxed max-w-lg">
                    We're reviewing your draft. While waiting, you can share the preview link below to gather interest and test-join as a member.
                  </p>
                  
                  {/* Minimal lifecycle inside card */}
                  <div className="flex items-center gap-3 mt-6 bg-[#13244D]/50 w-fit px-6 py-4 rounded-2xl backdrop-blur-sm border border-white/5">
                    <div className="flex items-center gap-2 opacity-50">
                       <Check className="w-5 h-5 text-emerald-400" />
                       <span className="text-xs font-bold uppercase tracking-widest">Draft</span>
                    </div>
                    <div className="w-8 h-px bg-white/20"></div>
                    <div className="flex items-center gap-2 text-amber-400">
                       <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                       <span className="text-xs font-bold uppercase tracking-widest">Review</span>
                    </div>
                    <div className="w-8 h-px bg-white/20"></div>
                    <div className="flex items-center gap-2 opacity-50">
                       <div className="w-2 h-2 rounded-full bg-white/50"></div>
                       <span className="text-xs font-bold uppercase tracking-widest">Live</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sharing Tools */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 ml-2">Sharing & Access</h3>
                
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-3 flex flex-col">
                  
                  {/* Preview Link */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#2D6BCC] shrink-0 group-hover:bg-[#2D6BCC] group-hover:text-white transition-colors">
                      <Link2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-slate-900">Preview Link</div>
                      <div className="text-sm text-slate-500 truncate">saltandpeps.com/gb/polaris-preview</div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow transition-all">
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="h-px w-full bg-slate-100 my-1"></div>

                  {/* Access Code */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-[#F4F3EF] flex items-center justify-center text-slate-600 shrink-0">
                      <span className="font-bold text-xl">#</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-slate-900">Access Code</div>
                      <div className="text-sm text-slate-500">Short code for members</div>
                    </div>
                    <div className="text-lg font-bold text-slate-700 font-mono tracking-widest bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                      4821
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-100 my-1"></div>

                  {/* Security PIN */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-slate-900">Invite PIN <span className="text-slate-400 font-normal ml-1">(Optional)</span></div>
                      <div className="text-sm text-slate-500">Require a 4-digit PIN to join</div>
                    </div>
                    <div className="bg-[#EBE9E2] text-slate-600 text-sm font-bold px-4 py-2 rounded-xl shadow-inner">
                      OFF
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Column: Editable Settings */}
            <div className="col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between ml-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Essentials</h3>
                <button className="text-sm font-bold text-[#2D6BCC] hover:text-[#1B3164] transition-colors">Edit all</button>
              </div>
              
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col gap-8">
                
                <div className="flex justify-between items-start border-b border-slate-100 pb-6 group">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Manufacturer</span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-slate-900">Polaris Peptides</span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">China</span>
                    </div>
                  </div>
                  <button className="text-slate-300 hover:text-[#2D6BCC] transition-colors p-2"><Settings className="w-5 h-5" /></button>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-6 group">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Currency</span>
                    <span className="text-lg font-medium text-slate-900">GBP (£)</span>
                  </div>
                  <button className="text-slate-300 hover:text-[#2D6BCC] transition-colors p-2"><Settings className="w-5 h-5" /></button>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-6 group">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Close Date</span>
                    <span className="text-lg font-medium text-slate-900">24 July 2026</span>
                  </div>
                  <button className="text-slate-300 hover:text-[#2D6BCC] transition-colors p-2"><Settings className="w-5 h-5" /></button>
                </div>

                <div className="flex justify-between items-start group">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Description</span>
                    <span className="text-base text-slate-600 leading-relaxed pr-6">Q3 wholesale bulk order for Polaris items.</span>
                  </div>
                  <button className="text-slate-300 hover:text-[#2D6BCC] transition-colors p-2"><Settings className="w-5 h-5" /></button>
                </div>

              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
