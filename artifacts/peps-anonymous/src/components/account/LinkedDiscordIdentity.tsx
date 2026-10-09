import React from "react";
import type { AccountMe } from "../../hooks/use-account";

export function LinkedDiscordIdentity({ account }: { account: AccountMe }) {
  if (!account.discordLinked) return null;
  return (
    <section className="rounded-xl border p-4 space-y-1"
      style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
      <h3 className="text-sm font-bold">Linked Discord</h3>
      <p className="text-sm">{account.discordUsername ? `@${account.discordUsername.replace(/^@/, "")}` : "Discord account"}</p>
      {account.discordId && <p className="text-xs break-all font-mono" style={{ color: "var(--t-muted)" }}>
        @discord:{account.discordId}
      </p>}
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Your Discord sign-in remains available when you add another login method.
      </p>
    </section>
  );
}
