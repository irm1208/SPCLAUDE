import React, { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Package,
  Activity,
  User,
  Settings,
  Bell,
  TrendingUp,
  Droplet,
  Calendar,
  Send,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  Syringe,
  Pill
} from "lucide-react";

export function HealthJournal() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-100 p-4 font-sans selection:bg-[#4A7C59]/20 text-neutral-900">
      {/* Mobile Device Container */}
      <div className="relative w-full max-w-[430px] h-[850px] max-h-[90vh] bg-[#FFFDF9] rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-neutral-800 flex flex-col">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 px-6 pt-12 pb-4 bg-[#FFFDF9]/90 backdrop-blur-md border-b border-neutral-200/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-[#4A7C59]/20 ring-offset-2 ring-offset-[#FFFDF9]">
              <AvatarImage src="https://i.pravatar.cc/150?u=iam0121" />
              <AvatarFallback className="bg-[#4A7C59] text-white">IA</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Health Log</span>
              <span className="text-sm font-semibold text-neutral-900">@iam0121</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <ScrollArea className="flex-1 px-6 pb-24">
          <div className="py-6 space-y-8">
            
            {/* Greeting & Quick Stats */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Good morning, 👋</h1>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">Active Protocol</span>
                    <Syringe className="h-4 w-4 text-[#4A7C59]" />
                  </div>
                  <span className="text-xl font-bold text-neutral-900">3<span className="text-sm font-normal text-neutral-500 ml-1">items</span></span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">Active Orders</span>
                    <Package className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-xl font-bold text-neutral-900">2<span className="text-sm font-normal text-neutral-500 ml-1">transit</span></span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">Tests Logged</span>
                    <Activity className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-xl font-bold text-neutral-900">12<span className="text-sm font-normal text-neutral-500 ml-1">total</span></span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">Group Buys</span>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-xl font-bold text-neutral-900">1<span className="text-sm font-normal text-neutral-500 ml-1">active</span></span>
                </div>
              </div>
            </div>

            {/* Your Stack (Horizontal Scroll) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  Your Stack
                  <Badge variant="secondary" className="bg-[#4A7C59]/10 text-[#4A7C59] hover:bg-[#4A7C59]/20 font-medium">Active</Badge>
                </h2>
                <Button variant="link" className="text-xs text-neutral-500 p-0 h-auto font-medium">Edit</Button>
              </div>
              
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 snap-x scrollbar-hide">
                <div className="flex-none snap-start bg-[#4A7C59] text-white p-4 rounded-3xl w-40 flex flex-col gap-3 shadow-md shadow-[#4A7C59]/20">
                  <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">
                    <Droplet className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">TB-500</h3>
                    <p className="text-white/80 text-sm mt-1">2mg / day</p>
                  </div>
                </div>
                <div className="flex-none snap-start bg-white border border-neutral-200 p-4 rounded-3xl w-40 flex flex-col gap-3 shadow-sm">
                  <div className="bg-neutral-100 text-neutral-600 w-8 h-8 rounded-full flex items-center justify-center">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight text-neutral-900">BPC-157</h3>
                    <p className="text-neutral-500 text-sm mt-1">500mcg</p>
                  </div>
                </div>
                <div className="flex-none snap-start bg-white border border-neutral-200 p-4 rounded-3xl w-40 flex flex-col gap-3 shadow-sm">
                  <div className="bg-neutral-100 text-neutral-600 w-8 h-8 rounded-full flex items-center justify-center">
                    <Syringe className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight text-neutral-900">Sermorelin</h3>
                    <p className="text-neutral-500 text-sm mt-1">100mcg</p>
                  </div>
                </div>
              </div>
            </div>

            {/* This Week Timeline */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-neutral-900">This Week</h2>
              
              <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2.5 before:w-0.5 before:bg-neutral-200">
                
                {/* Timeline Item 1 */}
                <div className="relative">
                  <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-orange-100 border-4 border-[#FFFDF9] flex items-center justify-center">
                    <Package className="h-2 w-2 text-orange-600" />
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-2xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-neutral-900">Placed order #PEP-0042</span>
                      <span className="text-[10px] font-medium text-neutral-400">2d ago</span>
                    </div>
                    <p className="text-xs text-neutral-500">2x TB-500, 1x BPC-157 • Processing</p>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative">
                  <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-blue-100 border-4 border-[#FFFDF9] flex items-center justify-center">
                    <Activity className="h-2 w-2 text-blue-600" />
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-2xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-neutral-900">Blood test logged</span>
                      <span className="text-[10px] font-medium text-neutral-400">5d ago</span>
                    </div>
                    <p className="text-xs text-neutral-500">Testosterone 650ng/dL • All markers normal</p>
                  </div>
                </div>

                {/* Timeline Item 3 */}
                <div className="relative">
                  <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-purple-100 border-4 border-[#FFFDF9] flex items-center justify-center">
                    <TrendingUp className="h-2 w-2 text-purple-600" />
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-2xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-neutral-900">Joined Group Buy</span>
                      <span className="text-[10px] font-medium text-neutral-400">1w ago</span>
                    </div>
                    <p className="text-xs text-neutral-500">Q4 Research Pack • Funding Phase</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Open Group Buys */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900">Open Group Buys</h2>
                <Button variant="link" className="text-xs text-[#4A7C59] p-0 h-auto font-medium">View all</Button>
              </div>
              
              <div className="grid gap-3">
                <div className="bg-white border border-neutral-200 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-neutral-900 truncate">Q1 Recovery Stack</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Closes in 3 days
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900">
                    Join
                  </Button>
                </div>
                
                <div className="bg-white border border-neutral-200 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-neutral-900 truncate">Longevity Combo</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Closes in 8 days
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900">
                    Join
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Links / Settings Tiles */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" className="h-auto py-4 rounded-3xl flex flex-col gap-2 items-center justify-center bg-white border-neutral-200 hover:bg-neutral-50 shadow-sm">
                <div className="bg-neutral-100 p-2 rounded-full mb-1">
                  <User className="h-5 w-5 text-neutral-600" />
                </div>
                <span className="font-semibold text-sm">Profile Details</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 rounded-3xl flex flex-col gap-2 items-center justify-center bg-white border-neutral-200 hover:bg-neutral-50 shadow-sm">
                <div className="bg-blue-50 p-2 rounded-full mb-1">
                  <Send className="h-5 w-5 text-blue-500" />
                </div>
                <span className="font-semibold text-sm">Telegram Bot</span>
              </Button>
            </div>
            
            <div className="pt-4 flex justify-center">
              <Button variant="ghost" className="text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-2xl gap-2 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>

          </div>
        </ScrollArea>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-neutral-200 px-6 py-4 flex justify-between items-center pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-b-[32px] z-20">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'home' ? 'text-[#4A7C59]' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-[#4A7C59]/10' : 'bg-transparent'}`}>
              <Home className="h-5 w-5" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium">Home</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'orders' ? 'text-[#4A7C59]' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'orders' ? 'bg-[#4A7C59]/10' : 'bg-transparent'}`}>
              <Package className="h-5 w-5" strokeWidth={activeTab === 'orders' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium">Orders</span>
          </button>

          <button 
            onClick={() => setActiveTab('health')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'health' ? 'text-[#4A7C59]' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'health' ? 'bg-[#4A7C59]/10' : 'bg-transparent'}`}>
              <Activity className="h-5 w-5" strokeWidth={activeTab === 'health' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium">Health</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'profile' ? 'text-[#4A7C59]' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-[#4A7C59]/10' : 'bg-transparent'}`}>
              <User className="h-5 w-5" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>

        {/* Home Bar indicator for iOS aesthetic */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-neutral-300 rounded-full z-30"></div>

      </div>
    </div>
  );
}
