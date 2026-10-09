import React from "react";
import type { AccountMe } from "../../hooks/use-account";

export function LinkedDiscordIdentity({ account, compact = false }: { account: AccountMe; compact?: boolean }) {
  if (!account.discordLinked) return null;
  return (
    <section data-testid="linked-discord-identity" className={`rounded-xl border ${compact ? "p-3" : "p-4"} space-y-1`}
      style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={compact ? "text-xs font-bold" : "text-sm font-bold"}>Linked Discord</h3>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "rgba(34,197,94,0.12)", color: "#15803D" }}>Connected</span>
      </div>
      <p className="text-sm font-medium">{account.discordUsername ? `@${account.discordUsername.replace(/^@/, "")}` : "Discord account"}</p>
      {account.discordId && <div className="pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Discord ID</p>
        <p data-testid="text-linked-discord-id" className="break-all font-mono text-xs" style={{ color: "var(--t-muted)" }}>
          @discord:{account.discordId}
        </p>
      </div>}
      {!compact && <p className="pt-1 text-xs" style={{ color: "var(--t-muted)" }}>
        Your Discord sign-in remains available when you add another login method.
      </p>}
    </section>
  );
}
