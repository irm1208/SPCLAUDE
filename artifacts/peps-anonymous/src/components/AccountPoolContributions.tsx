import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, FlaskConical, CheckCircle2, Clock, XCircle, ExternalLink, Eye, EyeOff } from "lucide-react";

type Contribution = {
  id: string;
  poolId: string;
  amountUsd: number;
  paymentStatus: string;
  isPublic: boolean;
  displayName: string | null;
  createdAt: string;
  pool: {
    title: string;
    slug: string;
    status: string;
  };
};

const STATUS_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  pending: { label: "Pending", color: "#CA8A04", Icon: Clock },
  verified: { label: "Verified", color: "#16A34A", Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "#DC2626", Icon: XCircle },
};

export function AccountPoolContributions() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<Contribution[]>({
    queryKey: ["/api/account/contributions"],
    queryFn: async () => {
      const r = await fetch("/api/account/contributions", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-blue)" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-xs py-4" style={{ color: "var(--t-muted)" }}>
        Could not load contributions.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 space-y-1">
        <FlaskConical className="w-8 h-8 mx-auto opacity-20" style={{ color: "var(--t-muted)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>No pool contributions yet</p>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>When you contribute to a testing pool you'll see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((c) => {
        const sm = STATUS_META[c.paymentStatus] ?? STATUS_META.pending;
        const StatusIcon = sm.Icon;
        return (
          <button
            key={c.id}
            onClick={() => setLocation(`/pool/${c.pool.slug}`)}
            className="flex items-center gap-4 p-4 text-left transition-opacity hover:opacity-80"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderRadius: 8, boxShadow: "var(--t-shadow, none)" }}
          >
            <div
              className="w-9 h-9 flex items-center justify-center shrink-0"
              style={{ borderRadius: 8, background: "rgba(139,92,246,0.1)" }}
            >
              <FlaskConical className="w-4 h-4" style={{ color: "#8B5CF6" }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold leading-tight truncate" style={{ color: "var(--t-text)" }}>{c.pool.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px]" style={{ color: sm.color }}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {sm.label}
                </span>
                <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>
                  {fmtUsd(c.amountUsd)}
                </span>
                <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>
                  {fmtDate(c.createdAt)}
                </span>
                <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--t-muted)" }}>
                  {c.isPublic ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  {c.isPublic ? (c.displayName || "Public") : "Anonymous"}
                </span>
              </div>
            </div>

            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-40" style={{ color: "var(--t-muted)" }} />
          </button>
        );
      })}
    </div>
  );
}
