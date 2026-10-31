import React, { createContext, useContext, useEffect, useState } from "react";
import { accountDisplayName } from "@/lib/account-display-name";

const DiscordNames = createContext<Readonly<Record<string, string>> | null>(null);

/** Admin-only names are display metadata, never replacements for account keys. */
export function AdminAccountNames({ secret, children }: { secret: string; children: React.ReactNode }) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/admin/discord-handles", {
          headers: { "x-admin-secret": secret },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Account names unavailable (${response.status})`);
        const data = await response.json();
        if (!controller.signal.aborted) setNames(data.handles);
      } catch (error) {
        if (!controller.signal.aborted) console.error("Could not load Discord display names", error);
      }
    };
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [secret]);
  return <DiscordNames.Provider value={names}>{children}</DiscordNames.Provider>;
}

export function AccountHandle({ username, discordUsername }: { username: string | null | undefined; discordUsername?: string | null }) {
  const names = useContext(DiscordNames);
  if (/^@?discord:/i.test(username ?? "") && discordUsername?.trim()) return <>{discordUsername.trim()}</>;
  // Shared staff components also run outside Admin; keep their existing labels there.
  return <>{names ? accountDisplayName(username, names) : username}</>;
}

export function DiscordAccountId({ username, discordId }: { username: string | null | undefined; discordId?: string | null }) {
  const [shown, setShown] = useState(false);
  const id = discordId || username?.match(/^@?discord:(\d+)$/)?.[1];
  if (!id) return null;
  return <span className="block text-[11px] font-normal text-muted-foreground">
    <button type="button" className="underline underline-offset-2" aria-expanded={shown}
      onClick={event => { event.stopPropagation(); setShown(value => !value); }}
      onKeyDown={event => event.stopPropagation()}>
      {shown ? "Hide Discord ID" : "Show Discord ID"}
    </button>
    {shown && <span className="block break-all select-text" onClick={event => event.stopPropagation()}>Discord ID: {id}</span>}
  </span>;
}
