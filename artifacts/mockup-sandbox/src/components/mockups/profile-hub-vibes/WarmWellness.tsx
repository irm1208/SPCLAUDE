import React from 'react';
import { 
  User, Settings, ShoppingBag, FlaskConical, Activity, 
  ChevronRight, Bell, LogOut, Store, ArrowLeft, ArrowUpRight,
  Droplets, FileText, Send, Package, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Shared Sub-components ---

const SidebarLink = ({ icon: Icon, label, active, badge }: { icon: any, label: string, active?: boolean, badge?: string }) => (
  <a 
    href="#" 
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
      active 
        ? "bg-[#D97706]/10 text-[#B45309] font-medium" 
        : "text-stone-600 hover:bg-[#FDF8F0] hover:text-stone-900"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-[#D97706]" : "text-stone-400 group-hover:text-stone-600")} strokeWidth={2} />
    <span className="flex-1">{label}</span>
    {badge && (
      <span className="bg-[#D97706] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </a>
);

const StatCard = ({ icon: Icon, value, label, ringColor }: { icon: any, value: string | number, label: string, ringColor: string }) => (
  <div className="bg-[#FDF8F0] rounded-[24px] p-5 flex flex-col relative overflow-hidden shadow-sm shadow-[#D97706]/5 border border-stone-200/50">
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="p-2.5 rounded-2xl bg-white shadow-sm text-stone-600">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className={cn("w-8 h-8 rounded-full border-4 opacity-20", ringColor)}></div>
    </div>
    <div className="relative z-10">
      <div className="text-3xl font-bold text-stone-800 tracking-tight mb-1">{value}</div>
      <div className="text-sm text-stone-500 font-medium">{label}</div>
    </div>
    <div className={cn("absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-20", ringColor)}></div>
  </div>
);

const NavCard = ({ icon: Icon, title, description, colorClass, bgClass }: { icon: any, title: string, description: string, colorClass: string, bgClass: string }) => (
  <a href="#" className="block group">
    <div className="bg-white rounded-[24px] p-6 shadow-sm shadow-stone-200/50 border border-stone-100 hover:shadow-md hover:border-[#D97706]/20 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-2xl", bgClass)}>
          <Icon className={cn("w-6 h-6", colorClass)} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-stone-800 mb-1 group-hover:text-[#B45309] transition-colors">{title}</h3>
          <p className="text-stone-500 text-sm leading-relaxed">{description}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#FDF8F0] flex items-center justify-center text-stone-400 group-hover:bg-[#D97706] group-hover:text-white transition-colors">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  </a>
);

// --- Main Component ---

export function WarmWellness() {
  return (
    <div className="min-h-screen bg-[#FDF8F0] text-stone-800 font-sans flex relative overflow-hidden">
      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-multiply pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-stone-100 flex-col hidden lg:flex relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] rounded-r-[32px] my-4 ml-4 h-[calc(100vh-32px)]">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D97706] to-[#B45309] flex items-center justify-center text-white shadow-lg shadow-[#D97706]/30">
              <Activity className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-800">Lumina</span>
          </div>
          
          <div className="flex items-center gap-4 bg-[#FDF8F0] p-4 rounded-[20px] mb-6 border border-stone-100">
            <div className="w-12 h-12 rounded-full bg-[#D97706]/10 flex items-center justify-center text-[#B45309] font-bold text-lg">
              AL
            </div>
            <div>
              <div className="font-semibold text-stone-800">Alex Reed</div>
              <div className="text-sm text-[#B45309] font-medium">Wellness Plan</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-8 no-scrollbar">
          <div>
            <div className="px-4 mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">My Account</div>
            <div className="space-y-1">
              <SidebarLink icon={ShoppingBag} label="Orders" active />
              <SidebarLink icon={Users} label="Group Buys" badge="2" />
              <SidebarLink icon={User} label="Profile" />
            </div>
          </div>

          <div>
            <div className="px-4 mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Health</div>
            <div className="space-y-1">
              <SidebarLink icon={FlaskConical} label="Compounds" />
              <SidebarLink icon={FileText} label="Protocols" />
              <SidebarLink icon={Droplets} label="Blood Tests" />
            </div>
          </div>

          <div>
            <div className="px-4 mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Settings</div>
            <div className="space-y-1">
              <SidebarLink icon={Settings} label="Preferences" />
              <SidebarLink icon={Bell} label="Notifications" />
            </div>
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-stone-100">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-stone-500 hover:text-stone-800 hover:bg-[#FDF8F0] transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Store</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors mt-1 font-medium">
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-8 md:p-10 lg:py-12">
          
          {/* Header Mobile & Desktop */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D97706]/10 text-[#B45309] text-sm font-semibold mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D97706]"></span>
                </span>
                Group buy closes in 2 days
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-800 mb-2">Good morning, Alex.</h1>
              <p className="text-lg text-stone-500 max-w-xl leading-relaxed">Here's how your health journey is looking today. Stay consistent.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="lg:hidden w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 shadow-sm">
                <Settings className="w-5 h-5" />
              </button>
              <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors shadow-md shadow-stone-800/20">
                <Store className="w-4 h-4" />
                <span>Shop Supplies</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
            <StatCard icon={Package} value="2" label="Active Orders" ringColor="border-[#D97706]" />
            <StatCard icon={Users} value="1" label="Group Buys" ringColor="border-[#6B8F71]" />
            <StatCard icon={Activity} value="3" label="Active Protocols" ringColor="border-[#0284c7]" />
            <StatCard icon={FileText} value="0" label="Tests Logged" ringColor="border-[#db2777]" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Your Hub</h2>
          </div>

          {/* Nav Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-12">
            <NavCard 
              icon={Package} 
              title="My Orders" 
              description="Track shipments, view history, and reorder your essentials."
              colorClass="text-[#D97706]"
              bgClass="bg-[#D97706]/10"
            />
            <NavCard 
              icon={Users} 
              title="Group Buys" 
              description="Manage your current pool orders and check delivery estimates."
              colorClass="text-[#6B8F71]"
              bgClass="bg-[#6B8F71]/10"
            />
            <NavCard 
              icon={FlaskConical} 
              title="Compounds & Protocols" 
              description="Review your active stacks and read safety literature."
              colorClass="text-[#0284c7]"
              bgClass="bg-[#0284c7]/10"
            />
            <NavCard 
              icon={Droplets} 
              title="Blood Tests" 
              description="Log new results and monitor your biomarkers over time."
              colorClass="text-[#db2777]"
              bgClass="bg-[#db2777]/10"
            />
          </div>

          {/* Bottom Shortcuts */}
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm shadow-stone-200/50 border border-stone-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-[#D97706]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 rounded-full bg-[#FDF8F0] border border-[#D97706]/20 flex items-center justify-center text-[#B45309]">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800">Need to update your details?</h3>
                <p className="text-stone-500">Manage addresses, billing, and secure login.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
              <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#FDF8F0] text-stone-700 font-medium hover:bg-stone-100 transition-colors border border-stone-200 w-full sm:w-auto">
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>
              <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0088cc]/10 text-[#0088cc] font-medium hover:bg-[#0088cc]/20 transition-colors w-full sm:w-auto">
                <Send className="w-4 h-4" />
                <span>Telegram Support</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default WarmWellness;