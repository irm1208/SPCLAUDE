import React from 'react';
import { 
  ChevronRight, ArrowRight, Copy, Share, Lock, 
  Info, CheckCircle2, AlertCircle, Eye, Settings, 
  Globe, Calendar, CreditCard, ChevronDown, Check, Link2
} from 'lucide-react';

export function EssentialsJourney() {
  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center py-12 px-4 sm:px-6 font-sans text-slate-900">
      {/* Container for mobile 480px design */}
      <div className="w-full max-w-[480px] flex flex-col gap-16">
        
        {/* ========================================================= */}
        {/* PHASE 1: CREATING */}
        {/* ========================================================= */}
        <section className="flex flex-col gap-6">
           <div className="flex flex-col gap-2">
             <h1 className="text-2xl font-semibold text-[#1B3164] tracking-tight">New Group Buy</h1>
             <p className="text-sm text-slate-500 leading-relaxed">
               Set up the essentials. You can configure rules, shipping, and advanced details later.
             </p>
           </div>

           {/* Lifecycle Strip */}
           <div className="bg-[#EBE9E2] rounded-full px-4 py-3 flex items-center justify-between">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#1B3164]"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1B3164]">Draft</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Review</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live</span>
             </div>
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
             <div className="p-5 flex flex-col gap-5">
               {/* Field: Name */}
               <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Group Buy Name *</label>
                 <input 
                   type="text" 
                   defaultValue="Polaris Spring Buy"
                   className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium outline-none transition-all"
                 />
               </div>

               {/* Field: Manufacturer & Country */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manufacturer</label>
                   <input 
                     type="text" 
                     defaultValue="Polaris Peptides"
                     className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium outline-none transition-all"
                   />
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Country</label>
                   <div className="relative">
                     <select className="w-full appearance-none bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-lg pl-4 pr-10 py-3 text-slate-900 font-medium outline-none transition-all">
                       <option>China</option>
                       <option>UK</option>
                       <option>USA</option>
                     </select>
                     <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                   </div>
                 </div>
               </div>

               {/* Field: Currency & Close Date */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Currency</label>
                   <div className="relative">
                     <select className="w-full appearance-none bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-lg pl-4 pr-10 py-3 text-slate-900 font-medium outline-none transition-all">
                       <option>GBP (£)</option>
                       <option>USD ($)</option>
                       <option>EUR (€)</option>
                       <option>USDT</option>
                       <option>BTC</option>
                     </select>
                     <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                   </div>
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Close Date</label>
                   <input 
                     type="text" 
                     defaultValue="24 Jul 2026"
                     className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium outline-none transition-all"
                   />
                 </div>
               </div>

               {/* Field: Description */}
               <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
                   <span>Short Description</span>
                   <span className="text-slate-400 font-normal normal-case tracking-normal">Optional</span>
                 </label>
                 <textarea 
                   rows={2}
                   defaultValue="Q3 wholesale bulk order for Polaris items."
                   className="w-full bg-[#F9F8F6] border border-transparent focus:border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium outline-none transition-all resize-none"
                 />
               </div>
             </div>
             
             <div className="bg-slate-50 p-5 border-t border-slate-100 flex flex-col gap-4">
               <div className="flex items-start gap-3">
                 <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                 <p className="text-sm text-slate-500 leading-snug">
                   Only you can see this draft. Nothing is public until the review is complete and you explicitly list it.
                 </p>
               </div>
               <button className="w-full bg-[#1B3164] hover:bg-[#13244D] text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                 <span>Save Draft</span>
                 <ArrowRight className="w-4 h-4" />
               </button>
             </div>
           </div>
        </section>

        {/* ========================================================= */}
        {/* DIVIDER */}
        {/* ========================================================= */}
        <div className="relative flex py-8 items-center">
          <div className="flex-grow border-t border-slate-300 border-dashed"></div>
          <span className="shrink-0 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            Phase 2: After Saving
          </span>
          <div className="flex-grow border-t border-slate-300 border-dashed"></div>
        </div>

        {/* ========================================================= */}
        {/* PHASE 2: JUST AFTER SAVING (CORE SCREEN) */}
        {/* ========================================================= */}
        <section className="flex flex-col gap-6 pb-24">
           {/* Top header / Status */}
           <div className="flex flex-col gap-1">
             <div className="flex items-center justify-between">
               <h1 className="text-2xl font-bold text-[#1B3164] tracking-tight">Polaris Spring Buy</h1>
               <div className="bg-[#EBE9E2] text-[#1B3164] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                 Draft
               </div>
             </div>
             <p className="text-sm text-slate-500">Created 2 mins ago</p>
           </div>

           {/* Journey Card (Orientation) */}
           <div className="bg-[#1B3164] rounded-2xl shadow-md overflow-hidden text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <CheckCircle2 className="w-32 h-32" />
             </div>
             <div className="p-5 flex flex-col gap-4 relative z-10">
               <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                 <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Current Phase</span>
               </div>
               
               <h2 className="text-lg font-medium text-white leading-tight">
                 Waiting for Admin Approval
               </h2>
               
               <p className="text-blue-100 text-sm leading-relaxed max-w-[90%]">
                 We're reviewing your draft. While waiting, you can share the preview link below to gather interest and test-join as a member.
               </p>
               
               {/* Minimal lifecycle inside card */}
               <div className="flex items-center gap-2 mt-2">
                 <div className="flex items-center gap-1.5 opacity-50">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Draft</span>
                 </div>
                 <div className="w-4 h-px bg-white/20"></div>
                 <div className="flex items-center gap-1.5 text-amber-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Review</span>
                 </div>
                 <div className="w-4 h-px bg-white/20"></div>
                 <div className="flex items-center gap-1.5 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Live</span>
                 </div>
               </div>
             </div>
           </div>

           {/* Sharing Tools */}
           <div className="flex flex-col gap-3">
             <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Sharing & Access</h3>
             
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex flex-col">
               
               {/* Preview Link */}
               <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#2D6BCC] shrink-0 group-hover:bg-[#2D6BCC] group-hover:text-white transition-colors">
                   <Link2 className="w-5 h-5" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-semibold text-slate-900">Preview Link</div>
                   <div className="text-xs text-slate-500 truncate">saltandpeps.com/gb/polaris-preview</div>
                 </div>
                 <button className="text-slate-400 hover:text-slate-600 p-2">
                   <Copy className="w-4 h-4" />
                 </button>
               </div>

               <div className="h-px w-full bg-slate-100 my-1"></div>

               {/* Access Code */}
               <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                 <div className="w-10 h-10 rounded-full bg-[#F4F3EF] flex items-center justify-center text-slate-600 shrink-0">
                   <span className="font-bold text-sm">#</span>
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-semibold text-slate-900">Access Code</div>
                   <div className="text-xs text-slate-500">Short code for members</div>
                 </div>
                 <div className="text-sm font-bold text-slate-700 font-mono tracking-widest bg-slate-100 px-3 py-1 rounded-md">
                   4821
                 </div>
               </div>

               <div className="h-px w-full bg-slate-100 my-1"></div>

               {/* Security PIN */}
               <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                 <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                   <Lock className="w-4 h-4" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-semibold text-slate-900">Invite PIN <span className="text-slate-400 font-normal ml-1">(Optional)</span></div>
                   <div className="text-xs text-slate-500">Require a 4-digit PIN to join</div>
                 </div>
                 <div className="bg-[#EBE9E2] text-slate-600 text-xs font-semibold px-2.5 py-1 rounded">
                   OFF
                 </div>
               </div>

             </div>
           </div>

           {/* Editable Settings (The Essentials) */}
           <div className="flex flex-col gap-3 mt-2">
             <div className="flex items-center justify-between ml-1">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Essentials</h3>
               <button className="text-xs font-semibold text-[#2D6BCC] hover:text-[#1B3164]">Edit all</button>
             </div>
             
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-5">
               <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                 <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer</span>
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-medium text-slate-900">Polaris Peptides</span>
                     <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">China</span>
                   </div>
                 </div>
                 <button className="text-slate-400 hover:text-slate-600"><Settings className="w-4 h-4" /></button>
               </div>

               <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                 <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Currency</span>
                   <span className="text-sm font-medium text-slate-900">GBP (£)</span>
                 </div>
                 <button className="text-slate-400 hover:text-slate-600"><Settings className="w-4 h-4" /></button>
               </div>

               <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                 <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Close Date</span>
                   <span className="text-sm font-medium text-slate-900">24 July 2026</span>
                 </div>
                 <button className="text-slate-400 hover:text-slate-600"><Settings className="w-4 h-4" /></button>
               </div>

               <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</span>
                   <span className="text-sm text-slate-600 leading-snug">Q3 wholesale bulk order for Polaris items.</span>
                 </div>
                 <button className="text-slate-400 hover:text-slate-600"><Settings className="w-4 h-4" /></button>
               </div>
             </div>
           </div>

        </section>

      </div>
    </div>
  );
}
