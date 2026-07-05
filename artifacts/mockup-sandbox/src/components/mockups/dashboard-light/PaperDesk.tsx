import React, { useState } from 'react';
import './_group.css';
import './_PaperDesk.css';
import { 
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, Plus, ArrowUp, ArrowRight, Settings, FlaskConical,
  Clock, Package, AlertCircle
} from 'lucide-react';

// ─── Mock data ────────────────────────────────────────────────────────
const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const daysAgo = (n: number) => iso(-n * 86_400_000);
const daysAhead = (n: number) => iso(n * 86_400_000);

export interface DashOrder {
  id: string; code: string; status: string; grandTotal: number;
  currency?: string | null; createdAt: string; deliveryMethod?: string;
  lineItems: { productName: string; quantity: number }[];
}

export interface DashCompound {
  id: string; compoundName: string; compoundType: string;
  doseAmount: string; doseUnit: string; frequency: string;
  route: string; startDate: string; endDate: string | null;
}

export interface DashGroupBuy {
  id: string; name: string; status: string; closeDate: string | null;
  organiserId: string | null; productCount: number;
}

const MOCK_ORDERS: DashOrder[] = [
  { id: "o1", code: "SP-10488", status: "Shipped", grandTotal: 148.0, currency: "GBP", createdAt: daysAgo(1), deliveryMethod: "Royal Mail 24", lineItems: [{ productName: "Tirzepatide 10mg", quantity: 2 }, { productName: "Bacteriostatic Water 10ml", quantity: 1 }] },
  { id: "o2", code: "SP-10471", status: "Submitted", grandTotal: 176.0, currency: "GBP", createdAt: daysAgo(3), deliveryMethod: "Royal Mail 48", lineItems: [{ productName: "CJC-1295 / Ipamorelin 10mg", quantity: 2 }, { productName: "Insulin Syringes 1ml", quantity: 1 }] },
  { id: "o3", code: "SP-10455", status: "Processing", grandTotal: 89.5, currency: "GBP", createdAt: daysAgo(6), deliveryMethod: "DPD Next Day", lineItems: [{ productName: "BPC-157 5mg", quantity: 3 }] },
  { id: "o4", code: "SP-10420", status: "Completed", grandTotal: 212.0, currency: "GBP", createdAt: daysAgo(11), deliveryMethod: "Royal Mail Tracked", lineItems: [{ productName: "Retatrutide 12mg", quantity: 1 }, { productName: "TB-500 5mg", quantity: 2 }] },
  { id: "o5", code: "SP-10388", status: "Completed", grandTotal: 64.0, currency: "GBP", createdAt: daysAgo(16), deliveryMethod: "Collection", lineItems: [{ productName: "Semaglutide 5mg", quantity: 1 }] },
];

const MOCK_COMPOUNDS: DashCompound[] = [
  { id: "c1", compoundName: "Tirzepatide", compoundType: "Peptide", doseAmount: "5", doseUnit: "mg", frequency: "Once weekly", route: "Subcutaneous", startDate: daysAgo(42), endDate: null },
  { id: "c2", compoundName: "Testosterone Enanthate", compoundType: "TRT", doseAmount: "125", doseUnit: "mg", frequency: "Twice weekly", route: "IM", startDate: daysAgo(68), endDate: null },
  { id: "c3", compoundName: "BPC-157", compoundType: "Peptide", doseAmount: "250", doseUnit: "mcg", frequency: "Daily", route: "Subcutaneous", startDate: daysAgo(21), endDate: null },
];

const MOCK_GROUP_BUYS: DashGroupBuy[] = [
  { id: "g1", name: "Tirzepatide Bulk", status: "active", closeDate: daysAhead(5), organiserId: "u_self", productCount: 4 },
  { id: "g2", name: "Retatrutide Collective", status: "active", closeDate: daysAhead(12), organiserId: null, productCount: 2 },
];

function daysSince(iso: string) {
  const start = new Date(iso).getTime();
  return Math.max(0, Math.round((Date.now() - start) / 86_400_000));
}

// ─── Components ────────────────────────────────────────────────────────
export function PaperDesk() {
  const [activeSection, setActiveSection] = useState("home");
  const [sageQuery, setSageQuery] = useState("");

  const navItems = [
    { id: "home", label: "Dashboard", Icon: LayoutDashboard },
    { id: "orders", label: "Orders", Icon: ReceiptText },
    { id: "groups", label: "Group Buys", Icon: UsersRound },
    { id: "health-hub", label: "Health Hub", Icon: HeartPulse },
    { id: "lab-tests", label: "Lab Tests", Icon: ClipboardList },
  ];

  return (
    <div className="paper-desk flex flex-col md:flex-row w-full min-h-screen selection:bg-[var(--pd-accent)] selection:text-white">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 pd-hairline-bottom md:pd-hairline-bottom-0 md:border-r border-[var(--pd-border)] pd-surface flex flex-col justify-between">
        <div>
          <div className="p-8 pd-hairline-bottom flex items-center justify-between">
            <h1 className="font-display text-4xl italic text-[var(--pd-accent)] tracking-tight">S&P</h1>
            <div className="md:hidden flex items-center gap-4">
              <button><Search className="w-5 h-5 text-[var(--pd-ink)]" /></button>
              <button><Bell className="w-5 h-5 text-[var(--pd-ink)]" /></button>
            </div>
          </div>
          
          <div className="px-6 py-8">
            <p className="text-[10px] uppercase tracking-widest text-[var(--pd-ink-light)] font-bold mb-4 ml-2">Navigation</p>
            <nav className="flex flex-col gap-1">
              {navItems.map(({ id, label, Icon }) => {
                const active = id === activeSection;
                return (
                  <button 
                    key={id} 
                    onClick={() => setActiveSection(id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-none text-sm transition-all duration-200
                      ${active ? 'text-[var(--pd-accent)] font-semibold' : 'text-[var(--pd-ink-light)] hover:text-[var(--pd-ink)]'}
                    `}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 1.5} />
                    {label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
        
        <div className="p-6 pd-hairline-top mt-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--pd-accent)] flex items-center justify-center text-white font-serif italic text-lg">
            I
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-semibold text-sm">Ironwolf_88</span>
            <span className="text-[11px] text-[var(--pd-ink-light)]">42.5 Credits</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto">
        {/* Topbar */}
        <header className="hidden md:flex h-20 items-center justify-between px-10 pd-hairline-bottom">
          <div className="flex-1">
             <h2 className="font-display text-3xl italic tracking-tight text-[var(--pd-ink)]">
               Good afternoon.
             </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pd-ink-light)] group-focus-within:text-[var(--pd-accent)] transition-colors" />
              <input 
                placeholder="Search ledger..." 
                className="w-64 bg-transparent border-b border-[var(--pd-border)] focus:border-[var(--pd-accent)] outline-none pl-9 pr-3 py-2 text-sm text-[var(--pd-ink)] transition-colors placeholder:text-[var(--pd-ink-light)]"
              />
            </div>
            <button className="text-[var(--pd-ink-light)] hover:text-[var(--pd-ink)] transition-colors"><Bell className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="p-6 md:p-10 flex flex-col gap-10">
          
          {/* Sage Assistant Hero */}
          <section className="relative pd-surface border border-[var(--pd-border)] overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--pd-accent)]" />
            <div className="p-8 md:p-10 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="font-display italic text-2xl text-[var(--pd-accent)]">Sage.</span>
                <span className="text-xs uppercase tracking-widest text-[var(--pd-ink-light)] font-bold">Health Assistant</span>
              </div>
              <h3 className="font-serif text-3xl md:text-4xl text-[var(--pd-ink)] max-w-lg leading-tight">
                What shall we review regarding your protocols or bloodwork today?
              </h3>
              
              <div className="flex items-end max-w-xl border-b-2 border-[var(--pd-ink)] pb-2 relative group mt-4">
                <input 
                  value={sageQuery}
                  onChange={e => setSageQuery(e.target.value)}
                  placeholder="Type your inquiry in plain English..."
                  className="flex-1 bg-transparent outline-none text-lg text-[var(--pd-ink)] placeholder:text-[var(--pd-border-heavy)] pb-1"
                />
                <button className="text-[var(--pd-accent)] opacity-50 group-focus-within:opacity-100 transition-opacity mb-1 shrink-0">
                  <ArrowUp className="w-6 h-6" strokeWidth={2.5} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-2">
                {["Review latest bloods", "Compound synergy", "Schedule next cycle"].map(p => (
                  <button key={p} className="text-xs font-semibold text-[var(--pd-ink-light)] hover:text-[var(--pd-accent)] border border-[var(--pd-border)] hover:border-[var(--pd-accent)] px-3 py-1.5 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Key Metrics / Compounds row */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Stats */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div>
                <h4 className="text-xs uppercase tracking-widest text-[var(--pd-ink-light)] font-bold mb-4 border-b border-[var(--pd-border)] pb-2">Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="font-serif text-5xl text-[var(--pd-ink)] leading-none mb-1">
                      {MOCK_ORDERS.filter(o => o.status !== "Completed").length}
                    </span>
                    <span className="text-xs font-medium text-[var(--pd-ink-light)]">Active Orders</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-5xl text-[var(--pd-ink)] leading-none mb-1">
                      {MOCK_COMPOUNDS.length}
                    </span>
                    <span className="text-xs font-medium text-[var(--pd-ink-light)]">Active Compounds</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[var(--pd-border)]">
                 <div className="flex flex-col">
                    <span className="font-serif text-5xl text-[var(--pd-ink)] leading-none mb-1">
                      {MOCK_GROUP_BUYS.length}
                    </span>
                    <span className="text-xs font-medium text-[var(--pd-ink-light)]">Group Buys Participating</span>
                 </div>
              </div>
            </div>

            {/* My Compounds Carousel/List */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between border-b border-[var(--pd-border)] pb-2 mb-4">
                <h4 className="text-xs uppercase tracking-widest text-[var(--pd-ink-light)] font-bold">Active Compounds</h4>
                <button className="text-xs font-semibold text-[var(--pd-accent)] hover:underline">View Ledger &rarr;</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_COMPOUNDS.map(c => (
                  <div key={c.id} className="pd-surface border border-[var(--pd-border)] p-5 hover:border-[var(--pd-border-heavy)] transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="font-serif text-2xl leading-tight text-[var(--pd-ink)]">{c.compoundName}</h5>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--pd-ink-light)] font-medium mt-1">{c.compoundType}</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-sm text-[var(--pd-accent)]">{c.doseAmount}{c.doseUnit}</span>
                        <span className="block text-[11px] text-[var(--pd-ink-light)]">{c.frequency}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[var(--pd-ink-light)] pt-4 border-t border-[var(--pd-border)] border-dashed">
                      <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5"/> {c.route}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Day {daysSince(c.startDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Orders Ledger */}
          <section className="flex flex-col mt-4">
             <div className="flex items-center justify-between border-b-2 border-[var(--pd-ink)] pb-3 mb-6">
                <h4 className="text-xs uppercase tracking-widest text-[var(--pd-ink)] font-bold">Recent Orders</h4>
                <button className="text-xs font-semibold text-[var(--pd-ink-light)] hover:text-[var(--pd-ink)]">Filter</button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="text-[10px] uppercase tracking-widest text-[var(--pd-ink-light)] border-b border-[var(--pd-border)]">
                     <th className="font-bold py-3 pr-4">Order ID</th>
                     <th className="font-bold py-3 px-4">Date</th>
                     <th className="font-bold py-3 px-4">Primary Item</th>
                     <th className="font-bold py-3 px-4">Status</th>
                     <th className="font-bold py-3 pl-4 text-right">Total</th>
                   </tr>
                 </thead>
                 <tbody>
                   {MOCK_ORDERS.slice(0,4).map(o => (
                     <tr key={o.id} className="border-b border-[var(--pd-border)] border-dashed hover:bg-[var(--pd-surface)] transition-colors cursor-pointer group">
                       <td className="py-4 pr-4 font-semibold text-[var(--pd-ink)] group-hover:text-[var(--pd-accent)] transition-colors">{o.code}</td>
                       <td className="py-4 px-4 text-[var(--pd-ink-light)]">
                         {new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                       </td>
                       <td className="py-4 px-4">
                         <span className="font-serif text-lg text-[var(--pd-ink)]">{o.lineItems[0].productName}</span>
                         {o.lineItems.length > 1 && <span className="text-xs text-[var(--pd-ink-light)] ml-2 italic">+{o.lineItems.length - 1} more</span>}
                       </td>
                       <td className="py-4 px-4">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-[10px] uppercase tracking-wider font-bold border ${
                            o.status === 'Completed' ? 'border-green-600/30 text-green-700' :
                            o.status === 'Shipped' ? 'border-[var(--pd-accent)] text-[var(--pd-accent)] bg-[#7A282110]' :
                            'border-[var(--pd-border-heavy)] text-[var(--pd-ink-light)]'
                         }`}>
                           {o.status}
                         </span>
                       </td>
                       <td className="py-4 pl-4 text-right font-semibold text-[var(--pd-ink)]">
                         £{o.grandTotal.toFixed(2)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <button className="mt-6 text-center w-full py-4 border border-[var(--pd-border)] text-sm font-semibold text-[var(--pd-ink-light)] hover:text-[var(--pd-ink)] hover:border-[var(--pd-border-heavy)] transition-all">
               View Full Ledger
             </button>
          </section>

        </div>
      </main>
    </div>
  );
}
