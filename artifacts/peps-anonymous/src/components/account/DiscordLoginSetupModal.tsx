import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAccount, useTelegramLinkInit, type TelegramStatus } from "../../hooks/use-account";
import { getDiscordSetupStep } from "../../lib/discord-credentials-setup";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { DiscordCredentialsSetup } from "./DiscordCredentialsSetup";
import { LinkedDiscordIdentity } from "./LinkedDiscordIdentity";

export function TelegramLoginSetup({ accountIdentifier }: { accountIdentifier: string }) {
  const link = useTelegramLinkInit();
  const [linkData, setLinkData] = useState<Awaited<ReturnType<typeof link.mutateAsync>> | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const status = useQuery<TelegramStatus>({
    queryKey: ["account", "discord-setup-telegram", accountIdentifier],
    queryFn: async () => {
      const response = await fetch("/api/account/telegram/status", { credentials: "include" });
      if (!response.ok) throw new Error("Could not check your Telegram connection.");
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: query => linkData && !query.state.data?.linked ? 2500 : false,
  });

  async function generateLink() {
    setCopyMessage("");
    try {
      setLinkData(await link.mutateAsync());
    } catch {
      // The mutation error is displayed below; never fabricate a bot URL.
    }
  }
  async function copyCode() {
    if (!linkData) return;
    try {
      await navigator.clipboard.writeText(`/link ${linkData.code}`);
      setCopyMessage("Link command copied.");
    } catch {
      setCopyMessage("Copy was unavailable. Select the link command below.");
    }
  }
  const buttonClass = "w-full min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-50";
  return (
    <section className="rounded-xl border p-4 space-y-3"
      style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
      <h3 className="text-sm font-bold">Link Telegram</h3>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Connect your Telegram account to sign in through the bot’s Mini App without Discord, and receive account updates.
      </p>
      {status.isPending ? <p className="text-xs">Checking Telegram connection…</p>
        : status.isError ? <div role="alert" className="text-xs space-y-2">
          <p>{status.error.message}</p>
          <button type="button" className="underline" onClick={() => void status.refetch()}>Retry connection check</button>
        </div>
        : status.data.linked ? <p role="status" className="text-sm font-semibold" style={{ color: "#15803D" }}>
          Telegram connected. Telegram sign-in is ready.
        </p>
        : <>
          {linkData && <div className="space-y-2">
            {linkData.deepLink ? <a data-testid="discord-setup-open-telegram" href={linkData.deepLink}
              target="_blank" rel="noopener noreferrer"
              className={`${buttonClass} flex items-center justify-center text-white`}
              style={{ background: "var(--t-blue-deep)" }}>Open Telegram and connect</a>
              : <p role="alert" className="text-xs">The Telegram bot is not configured. You can continue with Discord and link it later.</p>}
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Tap Start in Telegram to connect, then return here. The link expires after 15 minutes.</p>
            <code className="block break-all text-xs select-all">/link {linkData.code}</code>
            <button type="button" onClick={copyCode} className="text-xs underline">Copy link command</button>
            {copyMessage && <p role="status" className="text-xs">{copyMessage}</p>}
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Waiting for Telegram to confirm the connection…</p>
          </div>}
          <button data-testid="discord-setup-link-telegram" type="button" onClick={() => void generateLink()}
            disabled={link.isPending} className={buttonClass}
            style={{ background: "var(--t-surface2)", color: "var(--t-blue-deep)", border: "1px solid var(--t-border)" }}>
            {link.isPending ? "Creating link…" : linkData ? "Generate a new link" : "Link Telegram"}
          </button>
          {link.isError && <p role="alert" className="text-xs" style={{ color: "#DC2626" }}>{link.error.message}</p>}
        </>}
    </section>
  );
}

export function DiscordLoginSetupModal() {
  const { account, isLoggedIn } = useAccount();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const prompted = new URLSearchParams(search).get("discord_setup") === "1";
  if (!prompted || !isLoggedIn || !account?.discordLinked) return null;

  function dismiss() {
    if (busy) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("discord_setup");
    setLocation(`${url.pathname}${url.search}${url.hash}`, { replace: true });
  }
  const credentialsReady = getDiscordSetupStep(account) === "complete";
  return (
    <Dialog open onOpenChange={open => { if (!open) dismiss(); }}>
      <DialogContent data-testid="discord-login-setup-modal"
        className="w-[calc(100%_-_1.5rem)] max-w-lg max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        onPointerDownOutside={event => event.preventDefault()}
        style={{ background: "var(--t-bg)", color: "var(--t-text)", borderColor: "var(--t-border)" }}>
        <div className="pr-7 space-y-2">
          <DialogTitle className="text-xl font-bold">Set up another way to sign in</DialogTitle>
          <DialogDescription className="text-sm" style={{ color: "var(--t-muted)" }}>
            Choose a site username and password, and connect Telegram. You can skip setup and keep signing in with Discord.
          </DialogDescription>
        </div>
        {credentialsReady ? <section className="rounded-xl border p-4 space-y-1" style={{ borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-bold">Username and password login ready</h3>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>Site username: @{account.telegramUsername.replace(/^@/, "")}</p>
        </section> : <DiscordCredentialsSetup account={account}
          continuationUrl="/account?s=profile&discord_setup=1" onBusyChange={setBusy} />}
        <TelegramLoginSetup key={account.telegramUsername} accountIdentifier={account.telegramUsername} />
        <LinkedDiscordIdentity account={account} />
        <button data-testid="discord-setup-continue-discord" type="button" disabled={busy}
          onClick={dismiss} className="w-full min-h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
          {credentialsReady ? "Continue to my account" : "Continue with Discord — skip setup"}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>
          You can return to Account Settings to finish setup at any time.
        </p>
      </DialogContent>
    </Dialog>
  );
}
