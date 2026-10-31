import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export function LinkedTelegramUsername({
  username, secret, linked, autoLoad = false,
}: {
  username: string;
  secret: string;
  linked: boolean;
  autoLoad?: boolean;
}) {
  const [requested, setRequested] = useState(false);
  const lookup = useQuery<{ linked: boolean; username: string | null }>({
    queryKey: ["admin-linked-telegram", username],
    enabled: linked && (autoLoad || requested),
    staleTime: 60_000,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(username)}/telegram-profile`, {
        headers: { "x-admin-secret": secret },
        signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not retrieve Telegram username");
      return result;
    },
  });

  if (!linked) return <span className="text-xs text-muted-foreground">Telegram: Not linked</span>;
  return (
    <span className="text-xs flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground">Linked Telegram:</span>
      {lookup.isFetching ? <span>Looking up…</span> : lookup.isError ? <>
        <span role="status" className="text-red-600">Lookup unavailable.</span>
        <button type="button" className="underline" onClick={() => void lookup.refetch()}>Retry</button>
      </> : lookup.data ? <>
        {!lookup.data.linked ? <span>Not linked</span> : lookup.data.username
          ? <a className="font-semibold text-blue-600 underline" href={`https://t.me/${encodeURIComponent(lookup.data.username)}`} target="_blank" rel="noopener noreferrer">@{lookup.data.username}</a>
          : <span>No public username set</span>}
        <button type="button" className="text-muted-foreground underline ml-1" onClick={() => void lookup.refetch()}>Refresh</button>
      </> : <button type="button" className="font-medium text-blue-600 underline" onClick={() => setRequested(true)}>Show username</button>}
    </span>
  );
}
