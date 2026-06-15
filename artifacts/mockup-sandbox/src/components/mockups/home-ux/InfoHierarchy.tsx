import React from 'react';
import {
  User,
  History,
  ClipboardList,
  FlaskConical,
  Layers,
  Link,
  PenTool,
  GraduationCap,
  Shield,
  Hash,
  ArrowRight,
  ShoppingCart,
  ChevronRight,
  Beaker,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Subcomponents
const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any; label: string; active?: boolean }) => (
  <a
    href="#"
    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg transition-colors group ${
      active ? 'bg-slate-100 text-[#1e3a6e]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-[#1e3a6e]' : 'text-slate-500 group-hover:text-slate-900'}`} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-[#1e3a6e]' : 'text-slate-500 group-hover:text-slate-900'}`}>
      {label}
    </span>
  </a>
);

export function InfoHierarchy() {
  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900 selection:bg-[#1e3a6e] selection:text-white">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[88px] border-r border-slate-200 bg-white flex flex-col items-center py-6 z-10 overflow-y-auto hidden md:flex">
        <div className="w-10 h-10 bg-[#1e3a6e] text-white rounded-xl flex items-center justify-center font-bold text-xl mb-8 shadow-sm">
          P
        </div>
        <nav className="flex flex-col gap-2 w-full px-2">
          <SidebarItem icon={User} label="Profile" active />
          <SidebarItem icon={History} label="Orders" />
          <SidebarItem icon={ClipboardList} label="Group Buys" />
          <SidebarItem icon={FlaskConical} label="Testing" />
          <SidebarItem icon={Layers} label="Vials" />
          <div className="w-8 h-px bg-slate-200 mx-auto my-2" />
          <SidebarItem icon={Link} label="Referrals" />
          <SidebarItem icon={PenTool} label="Reviews" />
          <SidebarItem icon={GraduationCap} label="Learn" />
          <SidebarItem icon={Shield} label="Safety" />
          <SidebarItem icon={Hash} label="Social" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[88px] flex flex-col items-center w-full">
        <div className="w-full max-w-4xl px-6 md:px-12 py-16 md:py-24 flex flex-col">
          
          {/* 01: HERO - Primary Action */}
          <section className="flex flex-col items-start w-full relative mb-32">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-bold text-[#2563EB] tracking-widest uppercase">01</span>
              <div className="h-px w-12 bg-[#2563EB]/30"></div>
              <span className="text-sm font-semibold text-slate-500 tracking-wider uppercase">Peps Anonymous</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif text-[#1e3a6e] leading-[1.1] mb-8 tracking-tight">
              Join the next<br className="hidden md:block" /> group buy.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 max-w-xl mb-10 leading-relaxed">
              Member-only pricing on bulk peptide orders.<br className="hidden md:block" />
              Direct from manufacturer. Pay in USDT.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 px-8 text-lg bg-[#1e3a6e] hover:bg-[#152a51] text-white shadow-lg transition-all rounded-full font-medium">
                View active group buys
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 text-lg text-slate-500 hover:text-slate-900 rounded-full font-medium">
                Sign up / Log in
              </Button>
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-slate-200 mb-24 relative">
             <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-slate-300">
                <ChevronRight className="w-4 h-4 rotate-90" />
             </div>
          </div>

          {/* 02: TESTING POOLS - Secondary Action */}
          <section className="w-full mb-24">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">02</span>
              <div className="h-px w-8 bg-slate-200"></div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Quality Assurance</span>
            </div>

            <Card className="border border-slate-200 bg-slate-50/50 shadow-none overflow-hidden transition-colors hover:bg-slate-50">
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Community Testing Pools</h3>
                    <p className="text-slate-600 font-medium">
                      <span className="text-[#2563EB] font-bold">1 pool</span> currently open for contributions
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full md:w-auto h-11 border-slate-300 text-slate-700 hover:bg-white rounded-full">
                  View pools
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-slate-100 mb-24"></div>

          {/* 03: SINGLE VIALS - Tertiary Action */}
          <section className="w-full">
             <div className="flex items-center gap-4 mb-8">
              <span className="text-sm font-bold text-slate-300 tracking-widest uppercase">03</span>
              <div className="h-px w-8 bg-slate-100"></div>
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Retail Catalog</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-serif text-[#1e3a6e] mb-2">Single vials — in stock now</h2>
                <p className="text-slate-500">Try a compound before committing to a full kit.</p>
              </div>
              <Button variant="link" className="text-[#2563EB] hover:text-[#1e3a6e] p-0 h-auto font-medium">
                Browse all vials <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Retatrutide', dosage: '10mg', price: '$45.00', purity: '99.8%' },
                { name: 'Tirzepatide', dosage: '15mg', price: '$55.00', purity: '99.9%' },
                { name: 'Semaglutide', dosage: '5mg', price: '$35.00', purity: '99.7%' },
                { name: 'BPC-157', dosage: '5mg', price: '$25.00', purity: '99.9%' },
              ].map((product, i) => (
                <div key={i} className="group border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer bg-white">
                  <div className="aspect-square bg-slate-50 rounded-lg mb-4 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    <Beaker className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-slate-900">{product.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{product.dosage}</span>
                    <span className="text-xs text-green-600 font-medium">{product.purity}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-medium text-slate-900">{product.price}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#1e3a6e] group-hover:text-white transition-colors text-slate-400">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
