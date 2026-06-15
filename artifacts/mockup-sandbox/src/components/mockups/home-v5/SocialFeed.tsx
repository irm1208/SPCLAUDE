import React from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  CheckCircle2, 
  FlaskConical, 
  Users, 
  Clock,
  TrendingUp,
  Activity,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export function SocialFeed() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white font-bold tracking-tighter">
              PA
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-slate-900">PEPS ANONYMOUS</h1>
              <p className="text-xs text-slate-500 font-medium">Community-Verified Research.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-600">Log in</Button>
            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 font-semibold">
              Join Community
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDEBAR: Active Group Buy */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Group Buy</h2>
            </div>
            
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-2 bg-slate-900"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Ending Soon</Badge>
                  <span className="text-xs font-semibold text-slate-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> 14h 22m</span>
                </div>
                <CardTitle className="text-xl leading-tight">BPC-157 + TB-500 Blend</CardTitle>
                <p className="text-sm text-slate-500">5/5mg per vial · Janoshik Tested</p>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-2xl font-bold text-slate-900">$34.50</span>
                  <span className="text-xs text-slate-500">/ kit</span>
                </div>
                
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Filled: 82%</span>
                    <span>410 / 500 kits</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-2 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-slate-900">Vendor Verified</span>
                  </div>
                  Previous batch tested at 99.8% purity.
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                  Secure Your Slots
                </Button>
              </CardFooter>
            </Card>

            <div className="mt-6 px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Retatrutide 10mg</p>
                      <p className="text-xs text-slate-500">Voting phase</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
                <div className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Tirzepatide 15mg</p>
                      <p className="text-xs text-slate-500">Sourcing vendor</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER: Main Feed */}
        <div className="col-span-1 lg:col-span-6 space-y-6">
          
          {/* Feed Header / Filter */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="font-semibold text-lg text-slate-900">Community Activity</h2>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-slate-900 cursor-pointer pb-2 border-b-2 border-slate-900">Everything</span>
              <span className="text-sm font-medium text-slate-400 hover:text-slate-600 cursor-pointer pb-2 border-b-2 border-transparent transition-colors">Results</span>
              <span className="text-sm font-medium text-slate-400 hover:text-slate-600 cursor-pointer pb-2 border-b-2 border-transparent transition-colors">Groups</span>
            </div>
          </div>

          {/* Activity Ticker Style Items */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="mt-0.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-900">@membrane_mark</span> joined the <span className="font-medium text-slate-900 cursor-pointer hover:underline">BPC-157 + TB-500</span> group buy
              </p>
              <p className="text-xs text-slate-500 mt-1">4 minutes ago</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="mt-0.5">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-900">@rg_protocol</span> just received lab results for the <span className="font-medium text-slate-900 cursor-pointer hover:underline">Testosterone Cypionate</span> pool
              </p>
              <div className="mt-2 bg-slate-50 border border-slate-100 rounded-md p-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-bold text-green-600 shadow-sm">
                  99%
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-900 block">Pass</span>
                  Janoshik · Batch #8821
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">42 minutes ago</p>
            </div>
          </div>

          {/* In-Feed Featured Post (Social Style) */}
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center gap-3 p-4 pb-2 space-y-0">
              <Avatar className="w-10 h-10 border border-slate-100">
                <AvatarImage src="" />
                <AvatarFallback className="bg-slate-900 text-white text-xs">A</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-slate-900">Admin_Team</h3>
                  <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50 text-slate-500 border-slate-200">Official</Badge>
                </div>
                <p className="text-xs text-slate-500">Posted in <span className="font-medium text-slate-700">Announcements</span> · 2 hours ago</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="p-4 pt-2">
              <p className="text-sm text-slate-800 mb-4 leading-relaxed">
                The new Semaglutide 10mg pool is officially open. We negotiated a lower minimum order quantity with the new supplier based on our previous volume. Quality test funds are already in escrow. 🧬
              </p>
              
              {/* Embedded "Product" Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none mb-2">Round Open</Badge>
                    <h4 className="font-bold text-slate-900 text-lg">Semaglutide 10mg</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-slate-900">$22.00</span>
                    <span className="text-xs text-slate-500 block">per vial</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`w-6 h-6 rounded-full border-2 border-slate-50 flex items-center justify-center text-[10px] font-bold text-white z-${5-i}`} style={{ backgroundColor: `hsl(210, 80%, ${40 + i*10}%)` }}>
                        U{i}
                      </div>
                    ))}
                    <div className="w-6 h-6 rounded-full border-2 border-slate-50 bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600 z-0">
                      +48
                    </div>
                  </div>
                  <Button size="sm" className="bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 h-8 text-xs font-semibold">
                    Join This Round &rarr;
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-slate-500 text-xs px-1">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors"><Heart className="w-4 h-4" /> 24 likes</span>
                  <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors"><MessageCircle className="w-4 h-4" /> 12 comments</span>
                </div>
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors"><Share2 className="w-4 h-4" /> Share</span>
              </div>
            </CardContent>
          </Card>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="mt-0.5">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <FlaskConical className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-900">New community test result</span> posted for <span className="font-medium text-slate-900 cursor-pointer hover:underline">GHK-Cu 50mg</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
            </div>
          </div>
          
          <div className="py-6 text-center">
            <div className="inline-block w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          </div>

        </div>

        {/* RIGHT SIDEBAR: Community Stats & Labs */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Top Contributors */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-900">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-0 pb-2">
                <div className="space-y-0">
                  {[
                    { name: 'science_guy', pts: 1240, role: 'Tester' },
                    { name: 'peptide_pro', pts: 980, role: 'Organizer' },
                    { name: 'lift_heavy99', pts: 845, role: 'Member' },
                    { name: 'sarah_bio', pts: 720, role: 'Member' }
                  ].map((user, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-bold text-slate-400 w-3">{i+1}</div>
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px]">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 group-hover:underline">{user.name}</p>
                          <p className="text-[10px] text-slate-500">{user.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{user.pts}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Lab Results */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Recent Lab Results</h3>
              <div className="space-y-3">
                <Card className="border-slate-200 shadow-sm bg-white hover:border-slate-300 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-green-200 text-green-700 bg-green-50">99.2% Purity</Badge>
                      <span className="text-[10px] text-slate-400">Janoshik</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">Tirzepatide 15mg</p>
                    <p className="text-xs text-slate-500">Batch #9042 · Tested yesterday</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white hover:border-slate-300 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-green-200 text-green-700 bg-green-50">98.8% Purity</Badge>
                      <span className="text-[10px] text-slate-400">MZ Biolabs</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">CJC-1295 / Ipamorelin</p>
                    <p className="text-xs text-slate-500">Batch #811B · Tested 3 days ago</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-400 px-1">
                <a href="#" className="hover:text-slate-600">About</a>
                <a href="#" className="hover:text-slate-600">Rules</a>
                <a href="#" className="hover:text-slate-600">Privacy</a>
                <a href="#" className="hover:text-slate-600">Terms</a>
                <span className="w-full mt-1">© 2026 Peps Anonymous</span>
              </div>
            </div>
            
          </div>
        </aside>

      </main>
    </div>
  );
}
