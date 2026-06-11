import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Activity, CheckCircle2, FlaskConical, ShieldCheck, Beaker, FileText, ArrowRight } from "lucide-react";

const recentReports = [
  { id: 1, name: "BPC-157", size: "5mg", type: "Purity", result: "99.1%", status: "Pass", time: "2h ago", color: "text-[#22B8D4]" },
  { id: 2, name: "TB-500", size: "10mg", type: "Endotoxin", result: "<0.05 EU/mg", status: "Pass", time: "5h ago", color: "text-[#1DBF85]" },
  { id: 3, name: "Semaglutide", size: "5mg", type: "Purity", result: "99.8%", status: "Pass", time: "Yesterday", color: "text-[#22B8D4]" },
  { id: 4, name: "Tirzepatide", size: "10mg", type: "Purity", result: "99.5%", status: "Pass", time: "Yesterday", color: "text-[#22B8D4]" },
  { id: 5, name: "CJC-1295", size: "2mg", type: "Sterility", result: "Negative", status: "Pass", time: "2 days ago", color: "text-[#1DBF85]" },
  { id: 6, name: "GHK-Cu", size: "50mg", type: "Purity", result: "98.9%", status: "Pass", time: "3 days ago", color: "text-[#22B8D4]" },
  { id: 7, name: "Epithalon", size: "10mg", type: "Endotoxin", result: "<0.01 EU/mg", status: "Pass", time: "3 days ago", color: "text-[#1DBF85]" },
  { id: 8, name: "PT-141", size: "10mg", type: "Purity", result: "99.3%", status: "Pass", time: "4 days ago", color: "text-[#22B8D4]" },
];

const stockLevels = [
  { name: "BPC-157", size: "5mg", qty: 412, status: "In Stock", statusColor: "bg-[#1DBF85]/10 text-[#1DBF85]" },
  { name: "TB-500", size: "10mg", qty: 128, status: "In Stock", statusColor: "bg-[#1DBF85]/10 text-[#1DBF85]" },
  { name: "Semaglutide", size: "5mg", qty: 14, status: "Low", statusColor: "bg-[#E09328]/10 text-[#E09328]" },
  { name: "Tirzepatide", size: "10mg", qty: 0, status: "Out", statusColor: "bg-red-500/10 text-red-500" },
  { name: "GHK-Cu", size: "50mg", qty: 89, status: "In Stock", statusColor: "bg-[#1DBF85]/10 text-[#1DBF85]" },
];

export function EvidenceBoard() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-300 p-6 font-sans w-[820px] mx-auto selection:bg-[#9B6AF0]/30 selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#9B6AF0]" />
            Peps Anonymous · Quality Board
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DBF85] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DBF85]"></span>
          </span>
          Live · Updated 4 min ago
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-[60%_1fr] gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Recent Lab Reports */}
          <section className="bg-[#161B22] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-800 bg-[#0D1117]/50 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#22B8D4]" />
                Recent Lab Reports
              </h2>
            </div>
            <ScrollArea className="h-[360px]">
              <div className="divide-y divide-slate-800/50">
                {recentReports.map((report) => (
                  <div key={report.id} className="p-3 hover:bg-slate-800/20 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200">{report.name}</span>
                          <span className="text-xs text-slate-500 font-mono">{report.size}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{report.type}</span>
                          <span className="text-slate-700">•</span>
                          <span className={report.color + " font-mono"}>{report.result}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="bg-[#1DBF85]/10 text-[#1DBF85] border-[#1DBF85]/20 text-[10px] uppercase tracking-wider py-0 px-1.5 h-4">
                        {report.status}
                      </Badge>
                      <span className="text-[10px] text-slate-500 font-mono">{report.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </section>

          {/* Current Stock Levels */}
          <section className="bg-[#161B22] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-800 bg-[#0D1117]/50">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-slate-400" />
                Current Stock Levels
              </h2>
            </div>
            <Table>
              <TableHeader className="bg-[#0D1117]/30">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="h-8 text-xs text-slate-500">Compound</TableHead>
                  <TableHead className="h-8 text-xs text-slate-500 text-right">Qty</TableHead>
                  <TableHead className="h-8 text-xs text-slate-500 w-[100px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLevels.map((item) => (
                  <TableRow key={item.name} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-300">{item.name}</span>
                        <span className="text-xs text-slate-500">{item.size}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm text-slate-300">
                      {item.qty}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className={\`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider \${item.statusColor}\`}>
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* Platform Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#161B22] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#9B6AF0] mb-2" />
              <div>
                <div className="text-2xl font-mono text-white font-medium">352</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Lab Reports</div>
              </div>
            </div>
            <div className="bg-[#161B22] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-[#1DBF85] mb-2" />
              <div>
                <div className="text-2xl font-mono text-white font-medium">100%</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Pass Rate</div>
              </div>
            </div>
            <div className="bg-[#161B22] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <Beaker className="w-5 h-5 text-[#22B8D4] mb-2" />
              <div>
                <div className="text-2xl font-mono text-white font-medium">30+</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Peptides</div>
              </div>
            </div>
            <div className="bg-[#161B22] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <Clock className="w-5 h-5 text-[#E09328] mb-2" />
              <div>
                <div className="text-2xl font-mono text-white font-medium">2021</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Est.</div>
              </div>
            </div>
          </div>

          {/* Open Group Buy */}
          <Card className="bg-[#1D162B] border-[#9B6AF0]/30 shadow-inner overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#9B6AF0]/10 blur-[40px] rounded-full pointer-events-none" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#D3B8FF] text-sm flex items-center gap-2 font-medium">
                  Next Group Buy
                </CardTitle>
                <Badge variant="outline" className="bg-[#9B6AF0]/20 text-[#D3B8FF] border-[#9B6AF0]/30 text-xs font-mono">
                  Opens in 3d 14h 22m
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#B38DFF]">67% filled</span>
                  <span className="text-[#B38DFF]">12 of 18 spots claimed</span>
                </div>
                <Progress value={67} className="h-1.5 bg-[#9B6AF0]/20 [&>div]:bg-[#9B6AF0]" />
              </div>
            </CardContent>
          </Card>

          {/* Latest Protocol Added */}
          <Card className="bg-[#161B22] border-slate-800 shadow-sm hover:border-slate-700 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Latest Protocol Added</div>
                <div className="font-medium text-slate-200 mb-0.5">Epithalon Protocol</div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Anti-aging</span>
                  <span>•</span>
                  <span>Added yesterday</span>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:bg-[#22B8D4]/10 group-hover:text-[#22B8D4] transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-slate-800/50 text-center flex flex-col items-center gap-2">
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          All lab reports independently verified by Janoshik. Certificate of Analysis available for every batch.
        </p>
      </footer>
    </div>
  );
}
