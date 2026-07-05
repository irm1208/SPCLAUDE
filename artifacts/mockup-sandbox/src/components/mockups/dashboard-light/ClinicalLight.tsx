import React, { useState } from 'react';
import { 
  ArrowRight, Search, Activity, ClipboardList, Thermometer, Box, Droplets,
  Plus, MoreHorizontal, ArrowUpRight, Zap
} from 'lucide-react';
import './_clinical.css';

// --- Mock Data ---
const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const daysAgo = (n: number) => iso(-n * 86_400_000);
const daysAhead = (n: number) => iso(n * 86_400_000);

const MOCK_ORDERS = [
  {
    id: "o1", code: "SP-10488", status: "Shipped", grandTotal: 148.0, currency: "GBP",
    createdAt: daysAgo(1), deliveryMethod: "Royal Mail 24",
    lineItems: [
      { productName: "Tirzepatide 10mg", quantity: 2 },
      { productName: "Bacteriostatic Water 10ml", quantity: 1 },
    ],
  },
  {
    id: "o2", code: "SP-10471", status: "Submitted", grandTotal: 176.0, currency: "GBP",
    createdAt: daysAgo(3), deliveryMethod: "Royal Mail 48",
    lineItems: [
      { productName: "CJC-1295 / Ipamorelin 10mg", quantity: 2 },
      { productName: "Insulin Syringes 1ml", quantity: 1 },
    ],
  },
  {
    id: "o3", code: "SP-10455", status: "Processing", grandTotal: 89.5, currency: "GBP",
    createdAt: daysAgo(6), deliveryMethod: "DPD Next Day",
    lineItems: [{ productName: "BPC-157 5mg", quantity: 3 }],
  },
];

const MOCK_COMPOUNDS = [
  {
    id: "c1", compoundName: "Tirzepatide", compoundType: "Peptide",
    doseAmount: "5", doseUnit: "mg", frequency: "Once weekly", route: "Subcutaneous",
    startDate: daysAgo(42), endDate: null, batch: "TZ-992A"
  },
  {
    id: "c2", compoundName: "Testosterone Enanthate", compoundType: "TRT",
    doseAmount: "125", doseUnit: "mg", frequency: "Twice weekly", route: "IM",
    startDate: daysAgo(68), endDate: null, batch: "TE-440B"
  },
  {
    id: "c3", compoundName: "BPC-157", compoundType: "Peptide",
    doseAmount: "250", doseUnit: "mcg", frequency: "Daily", route: "Subcutaneous",
    startDate: daysAgo(21), endDate: null, batch: "BP-101C"
  },
];

const MOCK_GROUP_BUYS = [
  { id: "g1", name: "Tirzepatide Bulk — March", status: "Active", closeDate: daysAhead(5), productCount: 4 },
  { id: "g2", name: "Retatrutide Collective", status: "Active", closeDate: daysAhead(12), productCount: 2 },
];

export function ClinicalLight() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sageInput, setSageInput] = useState('');

  return (
    <div className="clinical-theme flex w-full">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[var(--border-hard)] bg-[var(--bg-panel)] h-screen sticky top-0">
        <div className="p-6 border-b border-[var(--border-hard)]">
          <div className="text-xl font-bold tracking-tight">S&amp;P CLINICAL</div>
          <div className="clinical-mono text-[10px] text-[var(--text-muted)] mt-1">SYS.REV 4.2.0</div>
        </div>
        
        <div className="p-4 flex-1">
          <div className="clinical-mono text-[10px] text-[var(--text-muted)] mb-3 uppercase tracking-widest">Navigation</div>
          <nav className="flex flex-col gap-1">
            {['Dashboard', 'Orders', 'Group Buys', 'Health Hub', 'Lab Tests'].map(item => (
              <button 
                key={item}
                onClick={() => setActiveTab(item.toLowerCase())}
                className={`text-left px-3 py-2 text-[13px] font-medium transition-colors ${activeTab === item.toLowerCase() ? 'bg-black text-white' : 'text-[var(--text-main)] hover:bg-[var(--border-soft)]'}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-8">
            <div className="clinical-mono text-[10px] text-[var(--text-muted)] mb-3 uppercase tracking-widest">Status</div>
            <div className="p-3 border border-[var(--border-hard)] bg-[#fafafa]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-medium">Credits</span>
                <span className="clinical-mono text-[13px] font-bold">£42.50</span>
              </div>
              <div className="w-full h-1 bg-[var(--border-hard)]">
                <div className="h-full bg-[var(--accent)]" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-hard)] flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--border-hard)] flex items-center justify-center text-xs font-bold">IW</div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold leading-tight">ironwolf_88</span>
            <span className="text-[11px] text-[var(--text-muted)]">ID: 884-291</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b border-[var(--border-hard)] bg-[var(--bg-panel)] flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Search className="w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search ID, batch, or protocol..." 
              className="bg-transparent border-none outline-none text-[13px] w-64 placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="clinical-mono text-[11px] text-[var(--text-muted)]">{new Date().toISOString().split('T')[0]}</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
          
          <div className="flex justify-between items-end mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
              <p className="text-[14px] text-[var(--text-muted)] mt-1">Analysis and logistics status for your active protocols.</p>
            </div>
            <button className="clinical-button primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> NEW PROTOCOL
            </button>
          </div>

          <div className="clinical-grid">
            {/* Left Column (8 cols) */}
            <div className="col-span-8 flex flex-col gap-6">
              
              {/* Sage Assistant */}
              <div className="clinical-sage-box p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-[var(--border-hard)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-[var(--border-hard)] flex items-center justify-center text-[var(--accent)] bg-[var(--accent-soft)]">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-bold">SAGE AI ASSISTANT</h2>
                      <div className="clinical-mono text-[11px] text-[var(--accent)] flex items-center gap-1 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></div>
                        SYSTEM ONLINE
                      </div>
                    </div>
                  </div>
                  <div className="clinical-mono text-[10px] text-[var(--text-muted)] text-right">
                    VER: 2.1.4<br/>
                    LATENCY: 12ms
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    value={sageInput}
                    onChange={e => setSageInput(e.target.value)}
                    placeholder="Input query regarding bloodwork, batch codes, or compound interactions..."
                    className="w-full border border-[var(--border-hard)] p-3 pr-10 text-[13px] outline-none focus:border-[var(--accent)] transition-colors clinical-mono placeholder:text-[var(--text-muted)]"
                  />
                  <button className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center bg-[var(--text-main)] text-white hover:bg-black transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button className="clinical-pill text-[var(--text-main)] hover:bg-[var(--border-soft)] transition-colors">ANALYSE BLOODWORK</button>
                  <button className="clinical-pill text-[var(--text-main)] hover:bg-[var(--border-soft)] transition-colors">REVIEW PROTOCOL</button>
                  <button className="clinical-pill text-[var(--text-main)] hover:bg-[var(--border-soft)] transition-colors">CHECK BATCH</button>
                </div>
              </div>

              {/* Active Compounds */}
              <div className="clinical-panel">
                <div className="p-4 border-b border-[var(--border-hard)] flex justify-between items-center">
                  <h3 className="text-[14px] font-bold uppercase tracking-wider flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-[var(--text-muted)]" />
                    Active Compounds
                  </h3>
                  <button className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 font-medium">
                    VIEW ALL <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-0">
                  <table className="clinical-table">
                    <thead>
                      <tr>
                        <th>Compound</th>
                        <th>Dose</th>
                        <th>Freq/Route</th>
                        <th>Batch</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_COMPOUNDS.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div className="font-bold text-[14px]">{c.compoundName}</div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{c.compoundType}</div>
                          </td>
                          <td>
                            <span className="clinical-mono font-bold text-[13px]">{c.doseAmount}{c.doseUnit}</span>
                          </td>
                          <td>
                            <div className="text-[12px]">{c.frequency}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">{c.route}</div>
                          </td>
                          <td>
                            <span className="clinical-mono text-[12px] bg-[var(--border-soft)] px-1.5 py-0.5">{c.batch}</span>
                          </td>
                          <td>
                            <span className="w-2 h-2 inline-block rounded-full bg-green-500 mr-2"></span>
                            <span className="text-[12px] font-medium text-[var(--text-muted)]">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column (4 cols) */}
            <div className="col-span-4 flex flex-col gap-6">
              
              {/* Stats Mini Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="clinical-panel p-4 flex flex-col">
                  <span className="clinical-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Ongoing Orders</span>
                  <span className="text-3xl font-bold tracking-tight">4</span>
                </div>
                <div className="clinical-panel p-4 flex flex-col">
                  <span className="clinical-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Completed</span>
                  <span className="text-3xl font-bold tracking-tight">12</span>
                </div>
                <div className="clinical-panel p-4 flex flex-col">
                  <span className="clinical-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Lab Reports</span>
                  <span className="text-3xl font-bold tracking-tight">3</span>
                </div>
                <div className="clinical-panel p-4 flex flex-col">
                  <span className="clinical-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Active Comps</span>
                  <span className="text-3xl font-bold tracking-tight text-[var(--accent)]">4</span>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="clinical-panel flex-1">
                <div className="p-4 border-b border-[var(--border-hard)] flex justify-between items-center">
                  <h3 className="text-[14px] font-bold uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4 text-[var(--text-muted)]" />
                    Logistics
                  </h3>
                </div>
                <div className="flex flex-col">
                  {MOCK_ORDERS.map((o, i) => (
                    <div key={o.id} className={`p-4 flex flex-col gap-2 ${i !== MOCK_ORDERS.length - 1 ? 'border-b border-[var(--border-soft)]' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="clinical-mono text-[13px] font-bold">{o.code}</span>
                          <span className="text-[12px] text-[var(--text-muted)] mt-0.5">{o.lineItems[0].productName} {o.lineItems.length > 1 ? `+${o.lineItems.length - 1}` : ''}</span>
                        </div>
                        <span className="clinical-mono text-[12px] font-bold">{fmtMoney(o.grandTotal, o.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${o.status === 'Shipped' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                          {o.status}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">{o.deliveryMethod}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-[var(--border-hard)] bg-[#fafafa]">
                  <button className="w-full text-[12px] font-bold text-center text-[var(--text-main)] hover:underline tracking-widest uppercase">
                    VIEW ALL LOGISTICS
                  </button>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

function fmtMoney(n: number, cur?: string | null) {
  const sym = cur === "GBP" ? "£" : "$";
  return `${sym}${(n ?? 0).toFixed(2)}`;
}
