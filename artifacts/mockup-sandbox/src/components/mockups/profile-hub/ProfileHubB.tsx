import {
  Package,
  Syringe,
  Beaker,
  Scale,
  Boxes,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Shell } from "./Shell";

// LAYOUT B — Unified ribbon.
// Hypothesis: Overview and GB Metrics are two versions of the same
// thing (pinned scalars). Flatten them into a single horizontal ribbon
// at the top of the page — seven equal-weight tiles — and give the
// reclaimed vertical space to Activity, which is actually content.

export function ProfileHubB() {
  return (
    <Shell>
      <section className="px-6 pb-6 flex flex-col gap-5">
        {/* Ribbon */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(7, 1fr)",
            }}
          >
            <Tile
              icon={<Package className="w-3.5 h-3.5" />}
              label="My orders"
              value="12"
              accent="#2E5BFF"
              primary
            />
            <Tile
              icon={<Syringe className="w-3.5 h-3.5" />}
              label="Active"
              sub="compounds"
              value="0"
            />
            <Tile
              icon={<Beaker className="w-3.5 h-3.5" />}
              label="Blood"
              sub="tests"
              value="0"
            />
            <Tile
              icon={<Scale className="w-3.5 h-3.5" />}
              label="GLP-1"
              sub="entries"
              value="0"
            />
            {/* Separator column — subtle vertical shift to communicate
                these three live under GB, not Overview */}
            <Tile
              icon={<Boxes className="w-3.5 h-3.5" />}
              label="GB"
              sub="active"
              value="3"
              group
              accent="#047857"
            />
            <Tile
              icon={<Boxes className="w-3.5 h-3.5" />}
              label="GB"
              sub="draft"
              value="0"
              group
            />
            <Tile
              icon={<Boxes className="w-3.5 h-3.5" />}
              label="GB"
              sub="total"
              value="3"
              group
            />
          </div>
          {/* Band captions underneath identifying the two groups */}
          <div
            className="grid text-[9px] tracking-[0.22em] uppercase font-semibold text-slate-400"
            style={{
              gridTemplateColumns: "repeat(7, 1fr)",
              borderTop: "1px solid #F1F5F9",
              background: "#FAFBFC",
            }}
          >
            <div className="col-span-4 px-4 py-2">Overview</div>
            <div
              className="col-span-3 px-4 py-2 flex items-center gap-2"
              style={{ borderLeft: "1px solid #F1F5F9", color: "#047857" }}
            >
              Group buys
              <ArrowRight className="w-3 h-3" />
              <span className="ml-auto normal-case tracking-normal text-slate-500 font-normal">
                Organiser
              </span>
            </div>
          </div>
        </div>

        {/* Activity — now the hero below */}
        <div
          className="rounded-2xl p-5 flex-1"
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
                Activity
              </div>
              <h2 className="text-[16px] font-semibold tracking-tight text-slate-900 mt-0.5">
                Recent events
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="px-2 py-1 rounded-md bg-slate-100 font-semibold text-slate-800">
                All
              </span>
              <span className="px-2 py-1 rounded-md text-slate-500">
                Orders
              </span>
              <span className="px-2 py-1 rounded-md text-slate-500">GBs</span>
              <span className="px-2 py-1 rounded-md text-slate-500">Labs</span>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            <Event
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              title="Order #1182 delivered"
              meta="Tirzepatide 10 mg · Uther"
              time="2d ago"
            />
            <Event
              icon={<Boxes className="w-4 h-4 text-[#2E5BFF]" />}
              title="Joined GB: Tirzepatide 10 mg"
              meta="cutoff in 4 days · 47 members"
              time="3d ago"
            />
            <Event
              icon={<Beaker className="w-4 h-4 text-amber-600" />}
              title="New batch assay published"
              meta="ZE30-0319 · 99.89% HPLC"
              time="5d ago"
            />
            <Event
              icon={<Clock className="w-4 h-4 text-slate-400" />}
              title="Order #1179 shipped"
              meta="tracking updated"
              time="7d ago"
            />
          </ul>
        </div>
      </section>
    </Shell>
  );
}

function Tile({
  icon,
  label,
  sub,
  value,
  accent,
  primary,
  group,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value: string;
  accent?: string;
  primary?: boolean;
  group?: boolean;
}) {
  return (
    <div
      className="px-4 py-4 flex flex-col gap-3"
      style={{
        borderRight: "1px solid #F1F5F9",
        background: group ? "#F8FAFC" : "transparent",
      }}
    >
      <div className="flex items-center gap-1.5 text-slate-500">
        <span
          style={{
            color: accent ?? (value === "0" ? "#94A3B8" : "#475569"),
          }}
        >
          {icon}
        </span>
        <span className="text-[10px] tracking-[0.15em] uppercase font-semibold leading-tight">
          {label}
          {sub && (
            <>
              <br />
              <span className="text-slate-400 tracking-[0.1em]">{sub}</span>
            </>
          )}
        </span>
      </div>
      <div
        className="font-semibold tabular-nums"
        style={{
          fontSize: primary ? 30 : 22,
          color:
            value === "0"
              ? "#94A3B8"
              : accent ?? "#0F172A",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Event({
  icon,
  title,
  meta,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  time: string;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "#F8FAFC" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-slate-900 truncate">
          {title}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{meta}</div>
      </div>
      <div className="text-[10px] text-slate-400">{time}</div>
    </li>
  );
}
