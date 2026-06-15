import React, { useState } from "react";
import { 
  Activity, 
  Dna, 
  Moon, 
  ShieldPlus, 
  FlaskConical, 
  FileText, 
  Droplets,
  Calculator,
  Search,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  User,
  ShoppingCart
} from "lucide-react";

// --- Mock Data ---

const INTENTS = [
  {
    id: "metabolic",
    title: "Metabolic",
    subtitle: "GLP-1 & GIP pathways",
    icon: <Activity className="w-6 h-6" />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
    activeColor: "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20",
    compoundId: "retatrutide"
  },
  {
    id: "tissue",
    title: "Tissue Repair",
    subtitle: "Injury recovery & healing",
    icon: <ShieldPlus className="w-6 h-6" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeColor: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20",
    compoundId: "bpc157"
  },
  {
    id: "longevity",
    title: "Longevity",
    subtitle: "Cellular health & aging",
    icon: <Dna className="w-6 h-6" />,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    activeColor: "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/20",
    compoundId: "epithalon"
  },
  {
    id: "sleep",
    title: "Sleep",
    subtitle: "Recovery optimization",
    icon: <Moon className="w-6 h-6" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    activeColor: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20",
    compoundId: "dsip"
  }
];

const COMPOUNDS: Record<string, any> = {
  "retatrutide": {
    name: "Retatrutide 10mg",
    price: "$20.00",
    lot: "621650",
    status: "TESTED",
    statusColor: "text-teal-700 bg-teal-50 border-teal-200",
    coa: "Janoshik Analytical (99.8% Purity)",
    safety: "High — BAC-safe preparation",
    inventory: "In Stock (Group Buy closes Oct 28)",
    protocol: "Tri-agonist research protocol. Typical cycle runs 8-12 weeks with gradual titration. Monitor subjects for metabolic adaptation.",
    tags: ["GLP-1", "GIP", "Glucagon"]
  },
  "bpc157": {
    name: "BPC-157 5mg",
    price: "$18.50",
    lot: "882194",
    status: "LOW STOCK",
    statusColor: "text-amber-700 bg-amber-50 border-amber-200",
    coa: "Janoshik Analytical (99.5% Purity)",
    safety: "High — Systemic or localized application",
    inventory: "14 units remaining",
    protocol: "Systemic repair protocol. Administer daily for 4-6 weeks. Often stacked with TB-500 for enhanced tissue recovery response.",
    tags: ["Angiogenesis", "Gastric", "Tendon"]
  },
  "epithalon": {
    name: "Epithalon 10mg",
    price: "$22.00",
    lot: "441092",
    status: "COMING SOON",
    statusColor: "text-slate-700 bg-slate-100 border-slate-200",
    coa: "Pending Third-Party Verification",
    safety: "Very High — Endogenous tetrapeptide",
    inventory: "Expected mid-Nov 2026",
    protocol: "Telomerase activation protocol. Classic Russian protocol involves 10mg daily for 10 days, repeated bi-annually.",
    tags: ["Telomeres", "Pineal", "Circadian"]
  },
  "dsip": {
    name: "DSIP 5mg",
    price: "$16.00",
    lot: "119843",
    status: "TESTED",
    statusColor: "text-teal-700 bg-teal-50 border-teal-200",
    coa: "Janoshik Analytical (99.2% Purity)",
    safety: "High — Delta sleep induction",
    inventory: "In Stock (Group Buy closes Oct 28)",
    protocol: "Delta-sleep inducing peptide protocol. Administer 1-3 hours prior to sleep cycle. Monitor EEG for slow-wave sleep enhancement.",
    tags: ["Slow-Wave", "Recovery", "HPA Axis"]
  }
};

export default function ProtocolGuide() {
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);

  const selectedCompound = selectedIntentId 
    ? COMPOUNDS[INTENTS.find(i => i.id === selectedIntentId)?.compoundId || ""]
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 selection:bg-teal-100">
      {/* Header */}
      <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold tracking-tighter text-sm">
            SP
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide uppercase text-slate-900">Peps Anonymous</h1>
            <p className="text-[10px] text-slate-500 font-medium">Private Access</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-teal-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
              3
            </span>
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
             <User className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 pb-12">
        {/* Greeting / Prompt */}
        <div className="mb-10 text-center md:text-left">
          <p className="text-sm font-medium text-teal-600 mb-2 tracking-wide uppercase">Protocol Guide</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
            What are you researching?
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto md:mx-0">
            Select a primary objective to view recommended compounds, verified protocols, and current group buy availability.
          </p>
        </div>

        {/* Intent Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {INTENTS.map((intent) => {
            const isSelected = selectedIntentId === intent.id;
            return (
              <button
                key={intent.id}
                onClick={() => setSelectedIntentId(intent.id)}
                className={`
                  relative flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 ease-out outline-none
                  ${isSelected 
                    ? intent.activeColor 
                    : `bg-white hover:border-slate-300 hover:shadow-sm border-slate-200 text-slate-700`
                  }
                `}
              >
                <div className={`
                  shrink-0 p-3 rounded-xl border transition-colors duration-300
                  ${isSelected ? 'bg-white/20 border-white/20 text-white' : intent.color}
                `}>
                  {intent.icon}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className={`font-semibold mb-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {intent.title}
                  </h3>
                  <p className={`text-sm ${isSelected ? 'text-teal-50' : 'text-slate-500'}`}>
                    {intent.subtitle}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Compound Details */}
        <div className={`
          transition-all duration-500 ease-in-out origin-top
          ${selectedIntentId ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-4 pointer-events-none hidden'}
        `}>
          {selectedCompound && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-slate-900">{selectedCompound.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${selectedCompound.statusColor}`}>
                        {selectedCompound.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>LOT {selectedCompound.lot}</span>
                      <span>&bull;</span>
                      <span className="text-slate-900 font-medium">{selectedCompound.price}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedCompound.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Protocol Summary
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {selectedCompound.protocol}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Trust Signals
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-teal-500" />
                          <span>{selectedCompound.coa}</span>
                        </li>
                        <li className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-teal-500" />
                          <span>{selectedCompound.safety}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-5">
                     <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100">
                        <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">
                          Current Availability
                        </h4>
                        <p className="text-sm text-teal-900 mb-4 font-medium">
                          {selectedCompound.inventory}
                        </p>
                        
                        <button 
                          className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                            ${selectedCompound.status === 'COMING SOON' 
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                            }
                          `}
                          disabled={selectedCompound.status === 'COMING SOON'}
                        >
                          {selectedCompound.status === 'COMING SOON' ? 'Notify Me' : 'Add to Order'}
                          {selectedCompound.status !== 'COMING SOON' && <ArrowRight className="w-4 h-4" />}
                        </button>
                     </div>
                     
                     <button className="w-full text-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-1">
                       View Full Clinical Protocol <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Persistent Bottom Utilities Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:px-8 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between overflow-x-auto hide-scrollbar gap-6">
          <div className="flex items-center gap-6 text-sm whitespace-nowrap">
            <button className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-medium transition-colors">
              <FlaskConical className="w-4 h-4 text-slate-400" />
              The Lonely Vial
            </button>
            <div className="w-px h-4 bg-slate-200"></div>
            <button className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-medium transition-colors">
              <Droplets className="w-4 h-4 text-slate-400" />
              Accessories
            </button>
            <div className="w-px h-4 bg-slate-200"></div>
            <button className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-medium transition-colors">
              <FileText className="w-4 h-4 text-slate-400" />
              Lab Reports (352+)
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm whitespace-nowrap ml-auto pl-6">
            <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors">
              <Calculator className="w-4 h-4" /> Dose Calc
            </button>
            <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors">
              <Activity className="w-4 h-4" /> Endotoxin
            </button>
            <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors">
              <Search className="w-4 h-4" /> Track Order
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
