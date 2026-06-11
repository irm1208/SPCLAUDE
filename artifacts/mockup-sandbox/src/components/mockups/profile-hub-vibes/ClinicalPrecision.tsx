import React from "react";
import {
  Activity,
  Beaker,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Pill,
  Settings,
  ShoppingBag,
  ShoppingCart,
  User,
  Users,
  Clock,
  ExternalLink,
} from "lucide-react";

export function ClinicalPrecision() {
  return (
    <div className="flex h-screen w-full bg-[#0B1120] text-slate-300 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] border-r border-blue-900/30 flex flex-col justify-between hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium tracking-wide text-sm uppercase">
              Clinical Portal
            </span>
          </div>

          <nav className="space-y-8">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                My Account
              </h3>
              <div className="space-y-1">
                <NavItem icon={<Home size={18} />} label="Dashboard" active />
                <NavItem icon={<ShoppingBag size={18} />} label="My Orders" />
                <NavItem icon={<Users size={18} />} label="Group Buys" />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                Health
              </h3>
              <div className="space-y-1">
                <NavItem icon={<Pill size={18} />} label="Compounds & Protocols" />
                <NavItem icon={<FileText size={18} />} label="Blood Tests" />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                Settings
              </h3>
              <div className="space-y-1">
                <NavItem icon={<User size={18} />} label="Profile" />
                <NavItem icon={<Settings size={18} />} label="Preferences" />
              </div>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-blue-900/30 space-y-2">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-sm hover:bg-slate-800/50">
            <ExternalLink size={18} />
            <span>Back to Store</span>
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-sm hover:bg-slate-800/50">
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-white tracking-tight mb-1">
                Overview
              </h1>
              <p className="text-sm text-slate-400">
                Patient ID: <span className="font-mono text-slate-300">#8842-A</span>
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-blue-900/20 border border-blue-500/20 px-3 py-1.5 rounded-full">
              <Clock size={14} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-100 tracking-wide uppercase">
                Group Buy Closes: 48:12:00
              </span>
            </div>
          </header>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Orders" value="0" />
            <StatCard label="Group Buys" value="0" />
            <StatCard label="Active Protocol" value="0" />
            <StatCard label="Tests Logged" value="0" />
          </section>

          {/* Navigation Grid */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-blue-900/30 pb-2">
              Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NavCard
                icon={<ShoppingBag />}
                title="My Orders"
                description="Track shipments and view past purchases"
              />
              <NavCard
                icon={<Users />}
                title="Group Buys"
                description="Manage participations and contributions"
              />
              <NavCard
                icon={<Beaker />}
                title="Compounds & Protocols"
                description="Log dosages and manage active protocols"
              />
              <NavCard
                icon={<Activity />}
                title="Blood Tests"
                description="Upload panels and track biomarkers"
              />
            </div>
          </section>

          {/* Bottom Shortcuts */}
          <section className="space-y-4 pt-4 border-t border-blue-900/30">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Shortcuts
            </h2>
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-slate-800 text-sm text-white rounded-sm border border-slate-700 hover:border-slate-500 transition-colors">
                My Profile
              </button>
              <button className="px-4 py-2 bg-[#229ED9]/10 text-sm text-[#229ED9] rounded-sm border border-[#229ED9]/30 hover:bg-[#229ED9]/20 transition-colors flex items-center gap-2">
                <ExternalLink size={14} />
                Telegram Support
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors rounded-sm ${
        active
          ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-500"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#131B2F] border border-blue-900/30 p-5 relative overflow-hidden group hover:border-blue-500/50 transition-colors rounded-sm">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="text-4xl font-mono text-white">{value}</p>
    </div>
  );
}

function NavCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button className="flex items-start text-left gap-4 bg-[#131B2F] border border-blue-900/30 p-5 hover:bg-[#1A243D] hover:border-blue-500/40 transition-all rounded-sm group">
      <div className="text-blue-500 group-hover:text-blue-400 transition-colors mt-1">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-white mb-1 flex items-center justify-between">
          {title}
          <ChevronRight
            size={16}
            className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"
          />
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
