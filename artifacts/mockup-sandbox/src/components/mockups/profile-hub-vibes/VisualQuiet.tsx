import React from "react";
import {
  Package,
  Users,
  FlaskConical,
  Activity,
  Settings,
  User,
  LogOut,
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  Droplet,
  Bell,
  Menu
} from "lucide-react";

export function VisualQuiet() {
  return (
    <div className="flex min-h-[100dvh] w-full bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-100 px-6 py-8 bg-white z-10">
        <div className="text-sm font-medium tracking-wide mb-10 text-slate-900">SALT &middot; HEALTH</div>

        <nav className="flex-1 space-y-8">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-3 px-2">My Account</div>
            <div className="space-y-0.5">
              <NavItem icon={<ShoppingBag size={16} />} label="Overview" active />
              <NavItem icon={<Package size={16} />} label="Orders" />
              <NavItem icon={<Users size={16} />} label="Group Buys" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 mb-3 px-2">Health</div>
            <div className="space-y-0.5">
              <NavItem icon={<FlaskConical size={16} />} label="Compounds" />
              <NavItem icon={<Activity size={16} />} label="Protocols" />
              <NavItem icon={<Droplet size={16} />} label="Blood Tests" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 mb-3 px-2">Settings</div>
            <div className="space-y-0.5">
              <NavItem icon={<User size={16} />} label="Profile" />
              <NavItem icon={<Settings size={16} />} label="Preferences" />
            </div>
          </div>
        </nav>

        <div className="pt-8 space-y-0.5 mt-auto">
          <NavItem icon={<ArrowLeft size={16} />} label="Back to Store" />
          <NavItem icon={<LogOut size={16} />} label="Sign Out" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8 md:px-12 md:py-12 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Menu size={20} />
            </button>
            <h1 className="text-lg md:text-xl font-medium tracking-tight text-slate-900">Overview</h1>
          </div>
          <button className="relative p-2 -mr-2 text-slate-400 hover:text-slate-900 transition-colors">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          </button>
        </header>

        {/* Minimal Banner */}
        <div className="flex items-center gap-3 py-3 px-4 mb-10 bg-slate-50/50 rounded-sm text-sm border border-slate-100/50">
          <AlertCircle size={14} className="text-indigo-500 flex-shrink-0" />
          <span className="text-slate-600">The current <span className="font-medium text-slate-900">Tirzepatide & Retatrutide</span> group buy closes in 48 hours.</span>
        </div>

        {/* Typographic Stats */}
        <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-3 text-sm mb-12 pb-6 border-b border-slate-100">
          <StatItem label="Active Orders" value="0" />
          <span className="text-slate-200 hidden sm:inline">&middot;</span>
          <StatItem label="Group Buys" value="0" />
          <span className="text-slate-200 hidden sm:inline">&middot;</span>
          <StatItem label="Active Protocol" value="0" />
          <span className="text-slate-200 hidden sm:inline">&middot;</span>
          <StatItem label="Tests Logged" value="0" />
        </div>

        {/* Nav Document Outline */}
        <div className="space-y-2 mb-16">
          <h2 className="text-xs font-medium text-slate-400 mb-4 uppercase tracking-wider px-4">Directory</h2>
          <NavRow icon={<Package size={18} />} title="My Orders" description="Track shipments and view past purchases" />
          <NavRow icon={<Users size={18} />} title="Group Buys" description="Manage active participations and history" />
          <NavRow icon={<FlaskConical size={18} />} title="Compounds & Protocols" description="Your personal health library and schedules" />
          <NavRow icon={<Droplet size={18} />} title="Blood Tests" description="Upload results and track biomarkers" />
        </div>

        {/* Bottom Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto border-t border-slate-100 pt-8">
          <ShortcutCard icon={<User size={16} />} label="My Profile" />
          <ShortcutCard icon={<MessageSquare size={16} />} label="Telegram Community" />
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center gap-3 px-2 py-2 text-sm transition-colors rounded-sm ${active ? 'text-indigo-600 font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
      <span className={active ? 'text-indigo-500' : 'text-slate-400'}>{icon}</span>
      {label}
    </a>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-medium text-slate-900">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function NavRow({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <a href="#" className="group flex items-start gap-4 p-4 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
      <div className="mt-0.5 text-indigo-400 group-hover:text-indigo-600 transition-colors flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 mb-0.5 flex items-center justify-between">
          <span className="truncate pr-4">{title}</span>
          <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
        <div className="text-sm text-slate-500 truncate">{description}</div>
      </div>
    </a>
  );
}

function ShortcutCard({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <a href="#" className="flex items-center gap-3 p-4 border border-slate-100 rounded-sm hover:border-slate-300 hover:bg-slate-50 transition-colors group">
      <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{icon}</span>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
    </a>
  );
}
