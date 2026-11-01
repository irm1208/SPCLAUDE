import { Link } from "wouter";
import { Users, Lock, CalendarClock } from "lucide-react";
import type { Pool } from "@/lib/types";
import { usd, POOL_STATUS, date } from "@/lib/format";
import { fileUrl } from "@/lib/api";
import { Badge, Progress } from "./ui";

export function poolSubtitle(pool: Pool) {
  const parts = pool.items.map(i => [i.batch?.compound, i.vendor?.name].filter(Boolean).join(" · ")).filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.length ? unique.slice(0, 2).join(" + ") + (unique.length > 2 ? ` +${unique.length - 2}` : "") : pool.items.map(i => i.testType).slice(0, 2).join(", ");
}

export function PoolCard({ pool, href }: { pool: Pool; href?: string }) {
  const status = POOL_STATUS[pool.status] ?? POOL_STATUS.draft;
  return (
    <Link href={href ?? `/p/${pool.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(28,37,36,0.35)]">
      {pool.coverPhotoKey ? <img src={fileUrl(pool.coverPhotoKey)} alt="" className="h-36 w-full object-cover" /> : (
        <div className="relative flex h-24 items-end overflow-hidden bg-[linear-gradient(135deg,#f3f2ec,#e3e5dd)] px-5 pb-3 text-[11px] font-medium uppercase tracking-widest text-muted">
          <span className="relative z-10">{pool.labName ?? "Independent lab test"}</span>
          <span className="absolute -right-6 -top-10 size-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff,#dfe6e0_45%,#9fb3a8)] opacity-80" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{pool.title}</h3>
            <p className="truncate text-sm text-muted">{poolSubtitle(pool) || "Testing pool"}</p>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between text-sm"><span className="mono font-semibold">{usd(pool.progress.verified, 0)}</span><span className="text-muted">of {usd(pool.progress.target, 0)}</span></div>
          <Progress value={pool.progress.pct} />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1"><Users className="size-3.5" />{pool.totals.memberCount}{pool.maxMembers ? `/${pool.maxMembers}` : ""} members</span>
          <span className="mono">{usd(pool.shareUsd)} share</span>
          {pool.inviteOnly && <span className="flex items-center gap-1"><Lock className="size-3.5" />Invite</span>}
          {pool.deadlineAt && <span className="flex items-center gap-1"><CalendarClock className="size-3.5" />{date(pool.deadlineAt)}</span>}
          <span className="ml-auto">by @{pool.organiser.handle}</span>
        </div>
      </div>
    </Link>
  );
}
