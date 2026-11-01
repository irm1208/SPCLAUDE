import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { get } from "@/lib/api";
import type { Pool } from "@/lib/types";
import { Page } from "@/components/Layout";
import { Input, Tabs, Spinner, Empty } from "@/components/ui";
import { PoolCard } from "@/components/PoolCard";

const TABS = [{ value: "open", label: "Open" }, { value: "funded", label: "Funded" }, { value: "at_lab", label: "At the lab" }, { value: "results", label: "Results in" }, { value: "all", label: "All" }] as const;

export default function Explore() {
  const [status, setStatus] = useState<(typeof TABS)[number]["value"]>("open");
  const [q, setQ] = useState("");
  const pools = useQuery({ queryKey: ["pools", status, q], queryFn: () => get<{ pools: Pool[] }>(`/api/tmd/pools?status=${status}&q=${encodeURIComponent(q)}`) });
  return (
    <Page title="Testing pools" subtitle="Public pools anyone can join. Unlisted and invite-only pools only show up through their link.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs tabs={TABS as any} value={status} onChange={setStatus} />
        <div className="relative sm:ml-auto sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" /><Input className="pl-9" placeholder="Compound, vendor, title…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {pools.isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : pools.data?.pools?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pools.data.pools.map(p => <PoolCard key={p.id} pool={p} />)}</div>
      ) : <Empty title="Nothing here yet">Try another filter, or host the first pool for this batch.</Empty>}
    </Page>
  );
}
