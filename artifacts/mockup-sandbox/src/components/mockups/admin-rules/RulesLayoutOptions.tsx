import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Choice = "grouped" | "accordion" | "scan";

const ruleData = {
  membership: [["Max people", "20"], ["Allowed countries", "UK, EU"]],
  kits: [["Kits / person", "1–10"], ["Total kits", "100"], ["Max packages", "4"]],
  fees: [["Fee / person", "$5.00"], ["Fee / kit", "$1.25"], ["Auto-lock", "Not set"]],
};

function RuleRows({ rows }: { rows: string[][] }) {
  return <div className="space-y-1.5">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="text-right font-semibold text-slate-800">{value}</span>
      </div>
    ))}
  </div>;
}

function Group({ title, rows }: { title: string; rows: string[][] }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-3">
    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-600">{title}</p>
    <RuleRows rows={rows} />
  </section>;
}

export function RulesLayoutOptions() {
  const [choice, setChoice] = useState<Choice>("grouped");
  const [open, setOpen] = useState("Membership & countries");

  const optionClass = (option: Choice) =>
    `overflow-hidden rounded-xl border bg-white text-left transition ${choice === option ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300"}`;

  return (
    <main className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Admin shared orders</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Order limits &amp; rules</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Three ways to make the same settings easier to scan and navigate. Click a layout to choose it.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <button type="button" onClick={() => setChoice("grouped")} className={optionClass("grouped")}>
            <div className="flex items-start gap-3 border-b border-slate-100 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-600">A</span>
              <span>
                <span className="block text-sm font-bold">Grouped sections</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">Everything visible, organized by meaning.</span>
              </span>
            </div>
            <div className="space-y-2 bg-slate-50 p-3">
              <Group title="Membership" rows={ruleData.membership} />
              <Group title="Kit limits" rows={ruleData.kits} />
              <Group title="Fees & timing" rows={ruleData.fees} />
            </div>
          </button>

          <button type="button" onClick={() => setChoice("accordion")} className={optionClass("accordion")}>
            <div className="flex items-start gap-3 border-b border-slate-100 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-600">B</span>
              <span>
                <span className="block text-sm font-bold">Accordion sections</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">Compact by default; open the group you need.</span>
              </span>
            </div>
            <div className="space-y-2 bg-slate-50 p-3">
              {[
                ["Membership & countries", ruleData.membership],
                ["Kit limits", ruleData.kits],
                ["Fees & timing", ruleData.fees],
              ].map(([title, rows]) => {
                const isOpen = open === title;
                return <div key={title} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="flex w-full items-center justify-between p-3 text-xs font-bold text-slate-800">
                    <span>{title}</span>{isOpen ? <ChevronUp className="h-4 w-4 text-indigo-600" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                  {isOpen && <div className="border-t border-indigo-100 bg-indigo-50/40 px-3 py-2.5"><RuleRows rows={rows as string[][]} /></div>}
                </div>;
              })}
            </div>
          </button>

          <button type="button" onClick={() => setChoice("scan")} className={optionClass("scan")}>
            <div className="flex items-start gap-3 border-b border-slate-100 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-600">C</span>
              <span>
                <span className="block text-sm font-bold">Two-column scan</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">A compact overview with less vertical space.</span>
              </span>
            </div>
            <div className="space-y-2 bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Group title="Capacity" rows={[ruleData.membership[0], ruleData.kits[1], ruleData.kits[2]]} />
                <Group title="Per member" rows={[ruleData.kits[0], ruleData.fees[0], ruleData.membership[1]]} />
              </div>
              <Group title="Timing & fees" rows={[ruleData.fees[1], ruleData.fees[2]]} />
            </div>
          </button>
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">Recommended: <span className="font-semibold text-slate-700">A — Grouped sections</span>, because it improves scanning without hiding important constraints.</p>
      </div>
    </main>
  );
}