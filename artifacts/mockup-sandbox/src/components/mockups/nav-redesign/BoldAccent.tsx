import React, { useState } from 'react';
import { 
  Home, 
  FlaskConical, 
  Syringe, 
  FileText, 
  BookOpen, 
  ShieldAlert, 
  Activity,
  Calculator,
  PercentSquare,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import './_group.css';

// Mock data
const SECTIONS = [
  {
    title: 'Shop',
    colorClass: 'bg-indigo-600',
    borderClass: 'border-indigo-600',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    activeClass: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20',
    hoverClass: 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300',
    items: [
      { id: 'lonely-vial', label: 'Lonely Vial', icon: FlaskConical },
      { id: 'accessories', label: 'Accessories', icon: Syringe },
    ]
  },
  {
    title: 'Learn',
    colorClass: 'bg-emerald-600',
    borderClass: 'border-emerald-600',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20',
    hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300',
    items: [
      { id: 'lab-reports', label: 'Lab Reports', icon: FileText },
      { id: 'protocols', label: 'Protocols', icon: BookOpen },
      { id: 'med-protocols', label: 'Med Protocols', icon: ShieldAlert },
      { id: 'trt-aas', label: 'TRT & AAS', icon: Activity },
    ]
  },
  {
    title: 'Tools',
    colorClass: 'bg-amber-600',
    borderClass: 'border-amber-600',
    textClass: 'text-amber-600 dark:text-amber-400',
    activeClass: 'bg-amber-600 text-white shadow-lg shadow-amber-600/20',
    hoverClass: 'hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300',
    items: [
      { id: 'endotoxin-calc', label: 'Endotoxin Calc', icon: Calculator },
      { id: 'dose-calc', label: 'Dose Calc', icon: PercentSquare },
    ]
  }
];

export function BoldAccent() {
  const [isDark, setIsDark] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('lonely-vial');

  return (
    <div className={`flex h-[100dvh] w-full font-sans transition-colors duration-300 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar Container */}
      <div 
        className={`relative flex flex-col h-full bg-white dark:bg-slate-900 border-r-2 border-slate-200 dark:border-slate-800 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 ${
          isExpanded ? 'w-[240px]' : 'w-[56px]'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Brand Area */}
        <div className="flex flex-col border-b-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center h-16 shrink-0 px-2 overflow-hidden">
            <div className="flex items-center gap-3 whitespace-nowrap w-full">
              <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-[#1B3A7A] text-white shadow-inner">
                <span className="font-display text-xl tracking-tight">S&P</span>
              </div>
              <div className={`flex flex-col transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                <span className="font-bold text-sm leading-tight text-slate-900 dark:text-white">Salt & Peps</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Research Platform</span>
              </div>
            </div>
          </div>
          
          {/* User Profile Area - Only visible when expanded */}
          <div className={`px-4 pb-3 transition-all duration-300 overflow-hidden ${isExpanded ? 'h-12 opacity-100' : 'h-0 opacity-0 pb-0'}`}>
            <button className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                JD
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">John Doe</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
            </button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="px-2 py-3 shrink-0">
          <button 
            onClick={() => setActiveItem('home')}
            className={`w-full flex items-center h-10 rounded-lg transition-all duration-200 overflow-hidden group ${
              activeItem === 'home' 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <Home className="w-5 h-5" strokeWidth={activeItem === 'home' ? 2.5 : 2} />
            </div>
            <span className={`font-bold text-sm transition-opacity duration-300 whitespace-nowrap ml-1 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              Home Dashboard
            </span>
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-1 px-2 space-y-6">
          {SECTIONS.map((section, idx) => (
            <div key={idx} className="relative">
              {/* Bold Section Divider & Label */}
              <div className="flex items-center mb-2 overflow-hidden h-6">
                <div className={`w-1 h-full rounded-r-md shrink-0 ${section.colorClass} absolute left-[-8px]`} />
                <div className={`w-10 h-6 shrink-0 flex items-center justify-center`}>
                  {/* Icon placeholder for collapsed state if needed, but we use color bars */}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-opacity duration-300 ${section.textClass} ml-1 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  {section.title}
                </span>
                <div className={`flex-1 ml-3 h-[2px] ${section.colorClass} opacity-20`} />
              </div>

              {/* Items */}
              <div className="space-y-1">
                {section.items.map(item => {
                  const isActive = activeItem === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveItem(item.id)}
                      className={`w-full flex items-center h-10 rounded-lg transition-all duration-200 overflow-hidden ${
                        isActive 
                          ? section.activeClass
                          : `text-slate-600 dark:text-slate-400 ${section.hoverClass}`
                      }`}
                    >
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center relative">
                        <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={`font-bold text-sm tracking-tight whitespace-nowrap transition-opacity duration-300 ml-1 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-2 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center h-10 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors overflow-hidden shadow-sm"
          >
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              {isDark ? <Sun className="w-5 h-5" strokeWidth={2} /> : <Moon className="w-5 h-5" strokeWidth={2} />}
            </div>
            <span className={`font-bold text-sm whitespace-nowrap transition-opacity duration-300 ml-1 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Context) */}
      <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header>
            <h1 className="text-4xl font-display font-bold text-slate-900 dark:text-white capitalize">
              {activeItem.replace('-', ' ')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">
              Mission control dashboard view with bold accent navigation.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
              <div className="h-8 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-lg mb-8" />
              <div className="space-y-4">
                <div className="h-4 w-full bg-slate-50 dark:bg-slate-800/50 rounded-md" />
                <div className="h-4 w-5/6 bg-slate-50 dark:bg-slate-800/50 rounded-md" />
                <div className="h-4 w-4/6 bg-slate-50 dark:bg-slate-800/50 rounded-md" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-800 shadow-sm h-[188px]" />
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-800 shadow-sm h-[188px]" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
