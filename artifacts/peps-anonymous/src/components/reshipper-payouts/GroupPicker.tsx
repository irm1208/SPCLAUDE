import React, { useEffect, useRef, useState } from "react";
import type { PayoutFetcher } from "../../lib/reshipper-payouts";
import { readError } from "./money";
import { ErrorNote, inputCls, inputStyle, SectionLabel } from "./ui";

interface Group { id: string; name: string; currency: string }

export function GroupPicker({ username, fetcher, value, onChange }: {
  username: string; fetcher: PayoutFetcher; value: string; onChange: (id: string) => void;
}) {
  const fRef = useRef(fetcher); fRef.current = fetcher;
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setGroups(null); setError(null);
    fRef.current(`/api/admin/reshippers/${encodeURIComponent(username)}/payouts/groups`, { signal: ctrl.signal })
      .then(async r => { if (!r.ok) throw new Error(await readError(r)); return r.json(); })
      .then(j => { if (!ctrl.signal.aborted) setGroups(Array.isArray(j?.groups) ? j.groups : []); })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Could not load group buys"); });
    return () => ctrl.abort();
  }, [username, nonce]);

  if (error) return <ErrorNote message={error} onRetry={() => setNonce(n => n + 1)} />;
  return <label className="block space-y-1.5">
    <SectionLabel>Group buy</SectionLabel>
    <select className={inputCls} style={inputStyle} value={value} disabled={!groups} onChange={e => onChange(e.target.value)}>
      <option value="">{groups ? (groups.length ? "Choose a group buy" : "No group buys with payouts") : "Loading group buys"}</option>
      {groups?.map(g => <option key={g.id} value={g.id}>{g.name} ({g.currency.toUpperCase()})</option>)}
    </select>
  </label>;
}
