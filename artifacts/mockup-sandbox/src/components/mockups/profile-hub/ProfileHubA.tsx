import {
  Package,
  ArrowRight,
  Syringe,
  Beaker,
  Scale,
  Boxes,
  Activity,
} from "lucide-react";
import { Shell } from "./Shell";

// LAYOUT A — Hero + KPI strip.
// Hypothesis: one metric has real data (My Orders = 12); the rest are
// zero. Give the live one hero treatment, demote the rest to a compact
// KPI strip, and lift GB Metrics beside the hero as a peer rather than
// a second section band.

export function ProfileHubA() {
  return (
    <Shell>
      <section className="px-6 pb-6 flex flex-col gap-5">
        {/* Hero row — Orders hero + GB Metrics panel */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "1.25fr 1fr" }}
        >
          {/* Orders hero */}
          <div
            className="p-6 rounded-2xl flex flex-col justify-between"
            style={{
              background:
                "linear-gradient(135deg, #15366B 0%, #2E5BFF 100%)",
              color: "#fff",
              minHeight: 200,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.14)" }}
                >
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-[11px] tracking-[0.22em] uppercase opacity-80">
                  My orders
                </span>
              </div>
              <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span
                  style={{
                    fontSize: 84,
                    lineHeight: 0.9,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                  }}
                >
                  12
                </span>
                <span className="text-[13px] opacity-80">
                  open + delivered
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4 text-[11px] opacity-80">
                <span>
                  <b className="text-white opacity-100">3</b> in transit
                </span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span>
                  <b className="text-white opacity-100">9</b> delivered
                </span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span>last: 12 Apr</span>
              </div>
            </div>
          </div>

          {/* GB metrics peer panel */}
          <div
            className="p-5 rounded-2xl flex flex-col"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "#EEF2FF", color: "#2E5BFF" }}
              >
                <Boxes className="w-4 h-4" />
              </div>
              <span className="text-[11px] tracking-[0.22em] uppercase font-semibold text-slate-500">
                GB metrics
              </span>
              <button className="ml-auto text-[11px] font-semibold flex items-center gap-1 text-[#2E5BFF]">
                Organiser <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div
              className="mt-4 flex-1 grid"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              <GBStat n={3} label="Active" color="#047857" />
              <Divider />
              <GBStat n={0} label="Draft" color="#94A3B8" />
              <Divider />
              <GBStat n={3} label="Total" color="#0F172A" />
            </div>
            <div
              className="mt-4 pt-3 text-[11px] text-slate-500"
              style={{ borderTop: "1px dashed #E5E7EB" }}
            >
              3 open buys · next cutoff{" "}
              <span className="font-semibold text-slate-900">in 4 days</span>
            </div>
          </div>
        </div>

        {/* KPI strip — the zeros, demoted */}
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400 mb-2">
            Everything else
          </div>
          <div
            className="grid rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              gridTemplateColumns: "repeat(3, 1fr)",
            }}
          >
            <KPI icon={<Syringe className="w-3.5 h-3.5" />} label="Active compounds" value={0} />
            <KPI icon={<Beaker className="w-3.5 h-3.5" />}  label="Blood tests"       value={0} border />
            <KPI icon={<Scale className="w-3.5 h-3.5" />}   label="GLP-1 entries"     value={0} border />
          </div>
        </div>

        {/* Activity placeholder for context */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              Activity
            </span>
            <span className="ml-auto text-[11px] font-semibold text-[#2E5BFF]">
              View all
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {["Order #1182 delivered", "Joined GB: Tirzepatide 10 mg", "New batch assay · Uther"].map(
              t => (
                <div
                  key={t}
                  className="flex items-center justify-between text-[12px] py-2"
                  style={{ borderTop: "1px solid #F1F5F9" }}
                >
                  <span className="text-slate-700">{t}</span>
                  <span className="text-[10px] text-slate-400">2d ago</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function GBStat({
  n,
  label,
  color,
}: {
  n: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div
        style={{
          fontSize: 40,
          fontWeight: 600,
          color,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <div className="mt-1 text-[10px] tracking-[0.18em] uppercase text-slate-500 font-semibold">
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="h-10 self-center" style={{ borderLeft: "1px solid #E5E7EB" }} />
  );
}

function KPI({
  icon,
  label,
  value,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  border?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4"
      style={{ borderLeft: border ? "1px solid #F1F5F9" : undefined }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center"
        style={{
          background: value === 0 ? "#F3F4F6" : "#EEF2FF",
          color: value === 0 ? "#94A3B8" : "#2E5BFF",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div
          className="font-semibold"
          style={{ fontSize: 22, color: value === 0 ? "#94A3B8" : "#0F172A" }}
        >
          {value}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300" />
    </div>
  );
}
