import React from "react";
import {
  LayoutDashboard,
  Package,
  Users,
  TestTubes,
  Activity,
  User,
  MessageCircle,
  LogOut,
  TrendingUp,
  Box,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export function CommandCenter() {
  const username = "Alex_Proto";

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#11111a] border-r border-[#2a2a35] flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-[#2a2a35]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold tracking-wide text-sm">
                NEXUS<span className="text-violet-400">HUB</span>
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
              Main Menu
            </div>
            <nav className="space-y-1">
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 font-medium text-sm transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm transition-colors"
              >
                <Package className="w-4 h-4" />
                Orders
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Group Buys
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm transition-colors"
              >
                <TestTubes className="w-4 h-4" />
                Compounds & Protocols
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm transition-colors"
              >
                <Activity className="w-4 h-4" />
                Blood Tests
              </a>
            </nav>

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-3 px-2">
              Account
            </div>
            <nav className="space-y-1">
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm transition-colors"
              >
                <User className="w-4 h-4" />
                Profile Details
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Telegram Community
              </a>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-[#2a2a35]">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium text-sm">
                AP
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">{username}</div>
                <div className="text-xs text-slate-500">Pro Member</div>
              </div>
            </div>
            <button className="text-slate-500 hover:text-slate-300 transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <header className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Command Center</h1>
              <p className="text-sm text-slate-500 mt-1">System status nominal. Welcome back, {username}.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              All systems operational
            </div>
          </header>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Active Orders</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">2</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1 items-end h-4">
                  <div className="w-1.5 h-2 bg-slate-200 rounded-sm"></div>
                  <div className="w-1.5 h-3 bg-slate-200 rounded-sm"></div>
                  <div className="w-1.5 h-2 bg-slate-200 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-blue-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-blue-500 rounded-sm"></div>
                </div>
                <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> In transit
                </div>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Group Buys</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">4</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1 items-end h-4">
                  <div className="w-1.5 h-2 bg-indigo-200 rounded-sm"></div>
                  <div className="w-1.5 h-3 bg-indigo-300 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-indigo-400 rounded-sm"></div>
                  <div className="w-1.5 h-3 bg-indigo-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-sm"></div>
                </div>
                <div className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                  1 pending
                </div>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Active Protocol</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">3 <span className="text-base font-normal text-slate-400">cmpds</span></div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TestTubes className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1 items-end h-4">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
                </div>
                <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  Week 4 of 12
                </div>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Tests Logged</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">12</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1 items-end h-4">
                  <div className="w-1.5 h-1 bg-slate-200 rounded-sm"></div>
                  <div className="w-1.5 h-2 bg-slate-200 rounded-sm"></div>
                  <div className="w-1.5 h-2 bg-rose-300 rounded-sm"></div>
                  <div className="w-1.5 h-3 bg-rose-400 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-rose-500 rounded-sm"></div>
                </div>
                <div className="text-xs font-medium text-rose-600 flex items-center gap-1">
                  Up to date
                </div>
              </div>
            </div>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Orders Card */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      Orders
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">2 Active Shipments</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">Order #FS-9921</span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Shipped</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <Truck className="w-3.5 h-3.5" /> ETA: Tomorrow by 8 PM
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Buys Card */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      Group Buys
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">1 Pending, 3 Completed</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Tirzepatide Q3 Batch</div>
                    <div className="text-xs text-slate-500 mt-0.5">Payment confirmed. Waiting on lab tests.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compounds Card */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TestTubes className="w-5 h-5 text-emerald-500" />
                      Compounds & Protocols
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Current Phase: Cutting</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200">
                      Retatrutide <span className="text-slate-400 ml-1">4mg</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200">
                      MOTS-c <span className="text-slate-400 ml-1">10mg</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200">
                      AOD-9604
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blood Tests Card */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-rose-500" />
                      Blood Tests
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Last panel: 2 weeks ago</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Key metrics stable</div>
                    <div className="text-xs text-slate-500 mt-0.5">Fasting Glucose: 88 mg/dL (Optimal)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-400"></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-slate-500" />
                      Profile & Settings
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Account Level: Verified</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-900 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    Shipping address updated 3 days ago. 2FA is enabled.
                  </p>
                </div>
              </div>
            </div>

            {/* Telegram Card */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-500"></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-sky-500" />
                      Telegram Community
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Status: Online</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-3 bg-sky-50/50 rounded-xl p-3 border border-sky-100">
                  <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs shrink-0">
                    VIP
                  </div>
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">3 unread announcements</span> in the VIP channel
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
