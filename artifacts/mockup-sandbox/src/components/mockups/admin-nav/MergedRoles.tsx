import { useState } from "react";
import {
  Home, BarChart3, Bell, Package, Users, ShoppingBag,
  UserCheck, Settings, ChevronRight, Search, MoreHorizontal,
  CheckCircle2, Clock, XCircle, MapPin, Star, Truck, Crown
} from "lucide-react";

type Section = "dashboard" | "analytics" | "orders" | "accounts" | "roles" | "alerts" | "settings";
type RoleTab = "all" | "organisers" | "reshippers" | "pool-leaders";

const NAV_GROUPS = [
  { label: "Overview", items: [
    { id: "dashboard" as Section, icon: Home, label: "Dashboard" },
    { id: "analytics" as Section, icon: BarChart3, label: "Analytics" },
  ]},
  { label: "Commerce", items: [
    { id: "orders" as Section, icon: Package, label: "Orders" },
    { id: "accounts" as Section, icon: ShoppingBag, label: "Group Buys" },
  ]},
  { label: "Members", items: [
    { id: "accounts" as Section, icon: Users, label: "Accounts" },
    { id: "roles" as Section, icon: UserCheck, label: "Roles" },
  ]},
  { label: "System", items: [
    { id: "alerts" as Section, icon: Bell, label: "Alerts" },
    { id: "settings" as Section, icon: Settings, label: "Settings" },
  ]},
];

const ROLE_DATA: Record<RoleTab | "all", {
  username: string; role: "organiser" | "reshipper" | "pool-leader";
  status: "active" | "pending" | "suspended";
  location?: string; members?: number; orders?: number; since: string;
}[]> = {
  all: [
    { username: "@ukpeptides", role: "organiser", status: "active", members: 42, since: "Jan 2025" },
    { username: "@jakemr", role: "reshipper", status: "pending", location: "Germany", since: "Apr 2026" },
    { username: "@aussie_lab", role: "reshipper", status: "active", location: "Australia", orders: 18, since: "Nov 2024" },
    { username: "@bio_collective", role: "organiser", status: "active", members: 28, since: "Mar 2025" },
    { username: "@nordic_peps", role: "pool-leader", status: "active", orders: 9, since: "Feb 2025" },
    { username: "@southpaw99", role: "reshipper", status: "suspended", location: "USA", since: "Sep 2024" },
    { username: "@pool_eu_01", role: "pool-leader", status: "active", orders: 14, since: "Dec 2024" },
  ],
  organisers: [],
  reshippers: [],
  "pool-leaders": [],
};
ROLE_DATA.organisers = ROLE_DATA.all.filter(r => r.role === "organiser");
ROLE_DATA.reshippers = ROLE_DATA.all.filter(r => r.role === "reshipper");
ROLE_DATA["pool-leaders"] = ROLE_DATA.all.filter(r => r.role === "pool-leader");

const ROLE_TABS: { id: RoleTab; label: string; icon: React.FC<any>; color: string }[] = [
  { id: "all", label: "All Roles", icon: Users, color: "text-white/60" },
  { id: "organisers", label: "Organisers", icon: Crown, color: "text-amber-400" },
  { id: "reshippers", label: "Reshippers", icon: Truck, color: "text-blue-400" },
  { id: "pool-leaders", label: "Pool Leaders", icon: Star, color: "text-purple-400" },
];

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-500/15 text-green-400",
  pending: "bg-amber-500/15 text-amber-400",
  suspended: "bg-red-500/15 text-red-400",
};

const ROLE_STYLE: Record<string, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  organiser: { label: "Organiser", color: "text-amber-400", bg: "bg-amber-400/10", icon: Crown },
  reshipper: { label: "Reshipper", color: "text-blue-400", bg: "bg-blue-400/10", icon: Truck },
  "pool-leader": { label: "Pool Leader", color: "text-purple-400", bg: "bg-purple-400/10", icon: Star },
};

export function MergedRoles() {
  const [active, setActive] = useState<Section>("roles");
  const [roleTab, setRoleTab] = useState<RoleTab>("all");
  const [selected, setSelected] = useState<string | null>("@jakemr");

  const rows = ROLE_DATA[roleTab];
  const selectedRow = ROLE_DATA.all.find(r => r.username === selected);

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-white/8 flex flex-col bg-[#111111]">
        <div className="px-4 py-4 border-b border-white/8 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <span className="text-xs font-black text-white">PA</span>
          </div>
          <span className="text-sm font-bold">Admin</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-widest text-white/25 px-2 mb-1 font-semibold">{group.label}</p>
              {group.items.map(({ id, icon: Icon, label }) => (
                <button
                  key={id + label}
                  onClick={() => setActive(id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-colors text-left ${
                    active === id && label === (id === "roles" ? "Roles" : id === "accounts" ? "Accounts" : "")
                      ? "bg-orange-500/15 text-orange-400 font-medium"
                      : active === id
                      ? "bg-orange-500/15 text-orange-400 font-medium"
                      : "text-white/45 hover:text-white/75 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Roles page */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-5 py-3.5 border-b border-white/8 bg-[#111111]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold">Roles</h1>
              <p className="text-[10px] text-white/35 mt-0.5">Manage organisers, reshippers and pool leaders</p>
            </div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              + Add Role
            </button>
          </div>

          {/* Role tabs */}
          <div className="flex gap-1 mt-3">
            {ROLE_TABS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setRoleTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  roleTab === id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                <Icon className={`w-3 h-3 ${roleTab === id ? color : "text-white/30"}`} />
                {label}
                <span className={`ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                  roleTab === id ? "bg-white/15 text-white/80" : "bg-white/6 text-white/35"
                }`}>
                  {ROLE_DATA[id].length}
                </span>
              </button>
            ))}
          </div>
        </header>

        {/* Content split */}
        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div className="w-72 border-r border-white/8 flex flex-col">
            <div className="px-3 py-2 border-b border-white/8">
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/30">Filter roles...</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {rows.map(row => {
                const rs = ROLE_STYLE[row.role];
                return (
                  <button
                    key={row.username}
                    onClick={() => setSelected(row.username)}
                    className={`w-full px-3 py-3 border-b border-white/5 text-left hover:bg-white/4 transition-colors ${
                      selected === row.username ? "bg-orange-500/8 border-l-2 border-l-orange-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${rs.bg} flex items-center justify-center flex-shrink-0`}>
                        <rs.icon className={`w-3.5 h-3.5 ${rs.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white/85 truncate">{row.username}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_STYLE[row.status]}`}>
                            {row.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] ${rs.color}`}>{rs.label}</span>
                          {row.location && <><span className="text-white/20">·</span><span className="text-[10px] text-white/30">{row.location}</span></>}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selectedRow ? (
            <div className="flex-1 p-5 overflow-y-auto bg-[#0f0f0f]">
              {(() => {
                const rs = ROLE_STYLE[selectedRow.role];
                return (
                  <>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${rs.bg} flex items-center justify-center`}>
                          <rs.icon className={`w-5 h-5 ${rs.color}`} />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold">{selectedRow.username}</h2>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-xs ${rs.color} font-medium`}>{rs.label}</span>
                            <span className="text-white/20">·</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[selectedRow.status]}`}>
                              {selectedRow.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button><MoreHorizontal className="w-4 h-4 text-white/30" /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-[#161616] border border-white/8 rounded-xl p-3">
                        <p className="text-[10px] text-white/35 mb-1">Since</p>
                        <p className="text-sm font-medium">{selectedRow.since}</p>
                      </div>
                      {selectedRow.location && (
                        <div className="bg-[#161616] border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] text-white/35 mb-1">Location</p>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-white/40" />
                            <p className="text-sm font-medium">{selectedRow.location}</p>
                          </div>
                        </div>
                      )}
                      {selectedRow.members && (
                        <div className="bg-[#161616] border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] text-white/35 mb-1">Members</p>
                          <p className="text-sm font-medium">{selectedRow.members}</p>
                        </div>
                      )}
                      {selectedRow.orders && (
                        <div className="bg-[#161616] border border-white/8 rounded-xl p-3">
                          <p className="text-[10px] text-white/35 mb-1">Orders Handled</p>
                          <p className="text-sm font-medium">{selectedRow.orders}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">Actions</p>
                      {selectedRow.status === "pending" && (
                        <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 rounded-xl text-sm text-green-400 font-medium transition-colors">
                          <CheckCircle2 className="w-4 h-4" /> Approve Role
                        </button>
                      )}
                      {selectedRow.status === "active" && (
                        <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 rounded-xl text-sm text-amber-400 font-medium transition-colors">
                          <Clock className="w-4 h-4" /> Suspend Role
                        </button>
                      )}
                      {selectedRow.status === "suspended" && (
                        <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 rounded-xl text-sm text-green-400 font-medium transition-colors">
                          <CheckCircle2 className="w-4 h-4" /> Reinstate Role
                        </button>
                      )}
                      <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm text-red-400 font-medium transition-colors">
                        <XCircle className="w-4 h-4" /> Remove Role
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/25">
              <p className="text-sm">Select a role to view details</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
