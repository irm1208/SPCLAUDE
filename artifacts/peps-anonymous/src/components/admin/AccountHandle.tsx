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

export function AccountHandle({ username }: { username: string | null | undefined }) {
  const names = useContext(DiscordNames);
  // Shared staff components also run outside Admin; keep their existing labels there.
  return <>{names ? accountDisplayName(username, names) : username}</>;
}
