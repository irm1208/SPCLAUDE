import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  ShoppingBag, 
  Pill, 
  FileText, 
  BookOpen, 
  Stethoscope, 
  Activity, 
  Calculator, 
  Scale, 
  Sun, 
  Moon,
  ChevronRight
} from 'lucide-react';
import './_group.css';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isExpanded: boolean;
  number: string;
  subtitle?: string;
}

const NavItem = ({ icon: Icon, label, isActive, onClick, isExpanded, number, subtitle }: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full group flex items-center py-3 px-3 transition-all duration-300 relative
        ${isActive ? 'text-[var(--t-text-primary)]' : 'text-[var(--t-text-secondary)] hover:text-[var(--t-text-primary)]'}
      `}
    >
      <div className="flex items-center justify-center min-w-[32px] w-[32px]">
        <Icon 
          size={18} 
          strokeWidth={isActive ? 2 : 1.5} 
          className={`transition-colors duration-300 ${isActive ? 'text-[var(--brand-navy)] dark:text-[var(--t-active-text)]' : ''}`}
        />
      </div>
      
      <div 
        className={`flex flex-col items-start ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          ${isExpanded ? 'w-[160px] opacity-100' : 'w-0 opacity-0'}
        `}
      >
        <div className="flex items-baseline w-full text-left">
          <span className={`text-[10px] font-mono leading-none mr-2 opacity-50 tracking-wider transition-opacity ${isActive ? 'opacity-100 text-[var(--brand-navy)] dark:text-[var(--t-active-text)]' : 'group-hover:opacity-80'}`}>
            {number}
          </span>
          <span className={`text-[15px] tracking-tight transition-all duration-300 
            ${isActive ? 'font-medium' : 'font-light'}
          `}>
            {label}
          </span>
        </div>
        {subtitle && (
          <span className={`text-[11px] mt-0.5 text-left text-[var(--t-text-muted)] transition-opacity duration-300 ml-[18px]
             ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}
          `}>
            {subtitle}
          </span>
        )}
      </div>

      {isActive && isExpanded && (
        <div className="absolute right-2 text-[var(--brand-navy)] dark:text-[var(--t-active-text)]">
          <ChevronRight size={14} strokeWidth={2} />
        </div>
      )}
      
      {/* Active Indicator Line (Left) */}
      <div className={`absolute left-0 top-[10%] bottom-[10%] w-[2px] bg-[var(--brand-navy)] dark:bg-[var(--t-active-text)] transition-all duration-300
        ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}
      `} />
    </button>
  );
};

export function Editorial() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('Home');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const navSections = [
    {
      title: 'Commerce',
      items: [
        { id: 'Lonely Vial', label: 'Lonely Vial', icon: ShoppingBag, number: '01', subtitle: 'Single compounds' },
        { id: 'Accessories', label: 'Accessories', icon: Pill, number: '02', subtitle: 'Syringes & water' },
      ]
    },
    {
      title: 'Knowledge',
      items: [
        { id: 'Lab Reports', label: 'Lab Reports', icon: FileText, number: '03', subtitle: 'Purity testing' },
        { id: 'Protocols', label: 'Protocols', icon: BookOpen, number: '04', subtitle: 'Community guides' },
        { id: 'Med Protocols', label: 'Med Protocols', icon: Stethoscope, number: '05', subtitle: 'Clinical reference' },
        { id: 'TRT & AAS', label: 'TRT & AAS', icon: Activity, number: '06', subtitle: 'Hormone guides' },
      ]
    },
    {
      title: 'Utilities',
      items: [
        { id: 'Endotoxin Calc', label: 'Endotoxin Calc', icon: Calculator, number: '07', subtitle: 'Safety margins' },
        { id: 'Dose Calc', label: 'Dose Calc', icon: Scale, number: '08', subtitle: 'Reconstitution' },
      ]
    }
  ];

  return (
    <div className={`flex h-screen w-full bg-[var(--t-bg)] text-[var(--t-text-primary)] transition-colors duration-500 font-sans ${isDark ? 'dark' : ''}`}>
      
      {/* Sidebar */}
      <div 
        className={`flex flex-col h-full bg-[var(--t-surface)] border-r border-[var(--t-border)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-20 relative
          ${isExpanded ? 'w-[260px]' : 'w-[64px]'}
        `}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        
        {/* Brand Area */}
        <div className="pt-8 pb-6 px-4 flex flex-col items-center justify-center min-h-[120px] relative border-b border-[var(--t-border)]">
          <div className="flex items-center justify-center w-full">
            <div className={`flex items-center justify-center transition-all duration-500 ${isExpanded ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <div className="w-8 h-8 bg-[var(--brand-navy)] text-white flex items-center justify-center font-[var(--font-display)] text-xl rounded-sm">
                S
              </div>
            </div>
            
            <div 
              className={`flex flex-col justify-center ml-3 overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                ${isExpanded ? 'w-[140px] opacity-100' : 'w-0 opacity-0'}
              `}
            >
              <h1 className="font-[var(--font-display)] text-[22px] leading-none tracking-tight text-[var(--t-text-primary)]">
                Salt & Peps
              </h1>
              <p className="text-[11px] font-sans text-[var(--t-text-muted)] tracking-widest uppercase mt-1">
                Index / Vol. 1
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-6">
          
          <div className="px-2">
            <NavItem 
              icon={Home} 
              label="Overview" 
              isActive={activeItem === 'Home'} 
              onClick={() => setActiveItem('Home')}
              isExpanded={isExpanded}
              number="00"
              subtitle="Dashboard home"
            />
          </div>

          {navSections.map((section, idx) => (
            <div key={section.title} className="mt-8 px-2">
              <div 
                className={`overflow-hidden transition-all duration-500 flex items-center mb-3
                  ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0'}
                `}
              >
                <div className="w-[32px] h-[1px] bg-[var(--t-border)] mr-3"></div>
                <h3 className="font-[var(--font-display)] text-sm italic tracking-wide text-[var(--t-text-muted)]">
                  {section.title}
                </h3>
              </div>
              
              <div className="flex flex-col space-y-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeItem === item.id}
                    onClick={() => setActiveItem(item.id)}
                    isExpanded={isExpanded}
                    number={item.number}
                    subtitle={item.subtitle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-[var(--t-border)]">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center justify-center p-2 rounded-sm text-[var(--t-text-secondary)] hover:text-[var(--t-text-primary)] hover:bg-[var(--t-surface-hover)] transition-colors"
          >
            {isExpanded ? (
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-xs uppercase tracking-widest font-medium">
                  {isDark ? 'Light Edition' : 'Dark Edition'}
                </span>
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </div>
            ) : (
              isDark ? <Sun size={18} /> : <Moon size={18} />
            )}
          </button>
          
          <div className={`mt-4 overflow-hidden transition-all duration-300
            ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0'}
          `}>
            <div className="text-center pb-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--t-text-muted)]">
                Logged in as @user
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[var(--t-bg)]">
        <div className="absolute inset-0 p-12 md:p-24 overflow-y-auto">
          <div className="max-w-3xl">
            <h2 className="font-[var(--font-display)] text-5xl md:text-7xl mb-6 text-[var(--t-text-primary)]">
              {activeItem}
            </h2>
            <div className="w-16 h-1 bg-[var(--brand-navy)] dark:bg-[var(--t-active-text)] mb-8"></div>
            <p className="text-lg md:text-xl text-[var(--t-text-secondary)] leading-relaxed font-light">
              This editorial design language uses typography, structural whitespace, and stark lines to create a premium reading experience. The sidebar acts as an index or table of contents rather than a typical application navigation menu.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
              <div className="p-8 border border-[var(--t-border)] bg-[var(--t-surface)]">
                <h4 className="font-[var(--font-display)] text-2xl mb-4">Typography Focus</h4>
                <p className="text-[var(--t-text-secondary)] text-sm">Contrasting serif display headers with clean sans-serif data points provides an intellectual, considered feeling to the interface.</p>
              </div>
              <div className="p-8 border border-[var(--t-border)] bg-[var(--t-surface)]">
                <h4 className="font-[var(--font-display)] text-2xl mb-4">Structural Hierarchy</h4>
                <p className="text-[var(--t-text-secondary)] text-sm">Using numbers and precise alignments creates a sense of order and deep architectural thought, fitting for clinical or research contexts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
