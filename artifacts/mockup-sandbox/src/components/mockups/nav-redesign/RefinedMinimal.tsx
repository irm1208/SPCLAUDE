import React, { useState } from 'react';
import { 
  Package, 
  Beaker, 
  TestTube, 
  BookOpen, 
  Stethoscope, 
  Activity, 
  Calculator, 
  Scale, 
  Sun, 
  Moon, 
  Home
} from 'lucide-react';
import './_group.css';

export function RefinedMinimal() {
  const [isDark, setIsDark] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('lonely-vial');

  const navGroups = [
    {
      label: 'Shop',
      items: [
        { id: 'lonely-vial', label: 'Lonely Vial', icon: Package },
        { id: 'accessories', label: 'Accessories', icon: Beaker },
      ]
    },
    {
      label: 'Learn',
      items: [
        { id: 'lab-reports', label: 'Lab Reports', icon: TestTube },
        { id: 'protocols', label: 'Protocols', icon: BookOpen },
        { id: 'med-protocols', label: 'Med Protocols', icon: Stethoscope },
        { id: 'trt-aas', label: 'TRT & AAS', icon: Activity },
      ]
    },
    {
      label: 'Tools',
      items: [
        { id: 'endo-calc', label: 'Endotoxin Calc', icon: Calculator },
        { id: 'dose-calc', label: 'Dose Calc', icon: Scale },
      ]
    }
  ];

  return (
    <div className={`flex h-screen w-full font-sans transition-colors duration-500 ${isDark ? 'dark bg-[#0a0a0a] text-white' : 'bg-white text-[#111111]'}`}>
      {/* Sidebar */}
      <div 
        className={`relative flex flex-col h-full transition-all duration-300 ease-out border-r border-[var(--t-border)] ${isExpanded ? 'w-[240px]' : 'w-[56px]'} ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Brand Mark */}
        <div className="flex items-center h-[72px] px-4 shrink-0">
          <div className="flex items-center justify-center w-6 h-6 shrink-0">
            <span className="font-display text-lg tracking-tight" style={{ color: 'var(--brand-navy)' }}>S&P</span>
          </div>
          <div className={`ml-4 flex flex-col justify-center overflow-hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-sm font-medium tracking-wide whitespace-nowrap">Salt & Peps</span>
            <span className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-widest whitespace-nowrap">Research</span>
          </div>
        </div>

        {/* Home Button */}
        <div className="px-2 mt-2">
          <button 
            onClick={() => setActiveItem('home')}
            className={`w-full flex items-center h-10 px-2 rounded-md transition-colors ${
              activeItem === 'home' 
                ? 'bg-[var(--t-active-bg)] text-[var(--t-active-text)]' 
                : 'text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text-primary)]'
            }`}
          >
            <div className="w-6 flex justify-center shrink-0">
              <Home size={18} strokeWidth={activeItem === 'home' ? 2 : 1.5} className={activeItem === 'home' ? 'text-[var(--brand-navy)]' : ''} />
            </div>
            <span className={`ml-4 text-sm whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'} ${activeItem === 'home' ? 'font-medium text-[var(--brand-navy)]' : 'font-light'}`}>
              Home
            </span>
          </button>
        </div>

        {/* Nav Sections */}
        <div className="flex-1 overflow-y-auto py-6 px-2 space-y-8 scrollbar-hide">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="px-2 mb-3 h-4 flex items-center">
                <span className={`text-[9px] font-medium tracking-[0.2em] text-[var(--t-text-muted)] uppercase whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  {group.label}
                </span>
                {!isExpanded && (
                  <div className="w-full border-t border-[var(--t-border)] mx-1" />
                )}
              </div>
              
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItem(item.id)}
                    className={`w-full flex items-center h-10 px-2 rounded-md transition-colors ${
                      activeItem === item.id 
                        ? 'bg-[var(--t-active-bg)] text-[var(--t-active-text)]' 
                        : 'text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text-primary)]'
                    }`}
                  >
                    <div className="w-6 flex justify-center shrink-0">
                      <item.icon size={18} strokeWidth={activeItem === item.id ? 2 : 1.5} className={activeItem === item.id ? 'text-[var(--brand-navy)]' : ''} />
                    </div>
                    <span className={`ml-4 text-sm whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'} ${activeItem === item.id ? 'font-medium text-[var(--brand-navy)]' : 'font-light'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Theme Toggle */}
        <div className="p-4 border-t border-[var(--t-border)] shrink-0">
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center h-10 px-2 rounded-md text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text-primary)] transition-colors"
          >
            <div className="w-6 flex justify-center shrink-0">
              {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            </div>
            <span className={`ml-4 text-sm font-light whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 p-12 transition-colors duration-500 ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl mb-4 text-[var(--t-text-primary)] tracking-tight">Refined Minimal</h1>
          <p className="text-[var(--t-text-secondary)] text-lg mb-8 font-light max-w-xl leading-relaxed">
            A quiet, architecturally-inspired navigation pattern. Generous whitespace, delicate strokes, and a stark monochromatic palette punctuated by a single navy accent.
          </p>
          
          <div className={`p-8 rounded-lg border border-[var(--t-border)] ${isDark ? 'bg-[#111111]' : 'bg-white'}`}>
            <h2 className="text-sm font-medium text-[var(--t-text-primary)] mb-2 uppercase tracking-widest">Active Context</h2>
            <p className="text-[var(--t-text-muted)] text-sm font-light">
              Currently viewing: <span className="font-medium text-[var(--brand-navy)] ml-1">{activeItem.replace('-', ' ')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
