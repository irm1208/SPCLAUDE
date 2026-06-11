import React, { useState } from 'react';
import { 
  Zap, 
  Box, 
  FlaskConical, 
  Users, 
  Settings, 
  LogOut, 
  ArrowRight, 
  Activity, 
  Syringe, 
  Clock, 
  CheckCircle2, 
  MessageCircle, 
  User,
  AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TodaysBriefing() {
  const [activeTab, setActiveTab] = useState('All');
  
  const tabs = ['All', 'Action Needed', 'Orders', 'Health', 'Group Buys'];

  return (
    <div className="min-h-[100dvh] bg-[#F7F7F8] text-slate-900 font-sans pb-20">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-slate-200">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=James" alt="James" />
                <AvatarFallback className="bg-slate-100 text-slate-600">JR</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-sm font-semibold leading-none">James R.</h1>
                <p className="text-xs text-slate-500 mt-0.5">Friday, 3 April</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 px-2">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 pb-3">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-8">
        
        {/* Stats Row (Always visible) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 mb-1">Active Orders</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">2</span>
              <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">In transit</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 mb-1">Group Buys</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">1</span>
              <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded">Closing soon</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 mb-1">Active Protocol</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">4</span>
              <span className="text-[10px] text-teal-600 font-medium bg-teal-50 px-1.5 py-0.5 rounded">Compounds</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 mb-1">Tests Logged</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">12</span>
              <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">Overdue</span>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* SECTION 1: Needs Action */}
          {(activeTab === 'All' || activeTab === 'Action Needed') && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              <div className="p-5 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center gap-2 mb-4 text-amber-600">
                  <Zap className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Needs Action</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">Payment pending: Q4 Research Pack</p>
                        <p className="text-sm text-slate-600 mt-0.5">Please complete payment of £189.00 to secure your spot.</p>
                      </div>
                    </div>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                      Pay Now
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                    <div className="flex gap-3">
                      <Activity className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">Blood test overdue</p>
                        <p className="text-sm text-slate-600 mt-0.5">Last logged 6 weeks ago. Stay on top of your markers.</p>
                      </div>
                    </div>
                    <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0">
                      Log Now
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2: Orders */}
          {(activeTab === 'All' || activeTab === 'Orders') && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <div className="p-5 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Box className="h-5 w-5" />
                    <h2 className="text-base font-semibold text-slate-900">Orders</h2>
                  </div>
                  <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                
                <div className="divide-y divide-slate-100">
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">Order PEP-0041</p>
                      <p className="text-sm text-slate-500 mt-0.5">TB-500 2mg x10</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <Clock className="w-3 h-3 mr-1" /> Shipped
                      </span>
                      <span className="text-sm text-slate-500 font-mono">#TRK992</span>
                    </div>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">Order PEP-0038</p>
                      <p className="text-sm text-slate-500 mt-0.5">BPC-157 500mcg x20</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: Your Stack (Health) */}
          {(activeTab === 'All' || activeTab === 'Health') && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500"></div>
              <div className="p-5 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-teal-600">
                    <FlaskConical className="h-5 w-5" />
                    <h2 className="text-base font-semibold text-slate-900">Your Stack</h2>
                  </div>
                  <a href="#" className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center">
                    View protocols <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 text-sm font-medium rounded-full border border-teal-100">
                    <Syringe className="w-3.5 h-3.5 mr-1.5" /> TB-500
                  </Badge>
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 text-sm font-medium rounded-full border border-teal-100">
                    <Syringe className="w-3.5 h-3.5 mr-1.5" /> BPC-157
                  </Badge>
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 text-sm font-medium rounded-full border border-teal-100">
                    <Syringe className="w-3.5 h-3.5 mr-1.5" /> Sermorelin
                  </Badge>
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 text-sm font-medium rounded-full border border-teal-100">
                    <Syringe className="w-3.5 h-3.5 mr-1.5" /> GHK-Cu
                  </Badge>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 4: Group Buys */}
          {(activeTab === 'All' || activeTab === 'Group Buys') && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
              <div className="p-5 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-purple-600">
                    <Users className="h-5 w-5" />
                    <h2 className="text-base font-semibold text-slate-900">Group Buys</h2>
                  </div>
                  <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center">
                    Browse all <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-lg p-4 hover:border-purple-200 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm group-hover:text-purple-700 transition-colors">Q4 Research Pack</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Closes in 8 days</span>
                      <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> 14 members</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 opacity-75">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm text-slate-700">Winter Healing Protocol</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                        Closed
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                      <span className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Fulfilled</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: Settings */}
          {(activeTab === 'All') && (
            <section className="grid sm:grid-cols-2 gap-4 pb-8">
              <a href="#" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:border-slate-300 transition-colors group relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 group-hover:bg-slate-400 transition-colors"></div>
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 ml-2">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-slate-900 group-hover:text-slate-900">Profile & Security</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your account details</p>
                </div>
              </a>

              <a href="#" className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:border-blue-300 transition-colors group relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#229ED9] opacity-70 group-hover:opacity-100 transition-colors"></div>
                <div className="h-10 w-10 rounded-full bg-[#229ED9]/10 flex items-center justify-center text-[#229ED9] shrink-0 ml-2">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-slate-900">Telegram Notifications</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Connected as @james_r</p>
                </div>
              </a>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
