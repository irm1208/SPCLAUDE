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
  const [activeStep, setActiveStep] = useState<"credentials" | "telegram">("credentials");
  const prompted = new URLSearchParams(search).get("discord_setup") === "1";
  if (!prompted || !isLoggedIn || !account?.discordLinked) return null;

  function dismiss() {
    if (busy) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("discord_setup");
    setLocation(`${url.pathname}${url.search}${url.hash}`, { replace: true });
  }
  const credentialsReady = getDiscordSetupStep(account) === "complete";
  const telegramStep = activeStep === "telegram";
  return (
    <Dialog open onOpenChange={open => { if (!open) dismiss(); }}>
      <DialogContent data-testid="discord-login-setup-modal"
        className="flex w-[calc(100%_-_1rem)] max-w-lg max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-3xl p-0 sm:max-h-[calc(100dvh-2rem)]"
        onPointerDownOutside={event => event.preventDefault()}
        style={{ background: "var(--t-bg)", color: "var(--t-text)", borderColor: "var(--t-border)" }}>
        <div className="shrink-0 border-b px-5 pb-4 pt-5 pr-12 sm:px-6 sm:pt-6"
          style={{ borderColor: "var(--t-border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#2D6BCC" }}>
            Sign-in setup
          </p>
          <DialogTitle className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">
            {telegramStep ? "Connect Telegram" : "Set up your Peps login"}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-5" style={{ color: "var(--t-muted)" }}>
            {telegramStep
              ? "Use Telegram to sign in without Discord. Your Discord login stays linked."
              : "Add a username and password so you can sign in without Discord. Your Discord login stays linked."}
          </DialogDescription>
          {account.discordUsername && <p className="mt-2 text-xs font-medium" style={{ color: "var(--t-muted)" }}>
            Currently signed in as <span style={{ color: "var(--t-text)" }}>@{account.discordUsername.replace(/^@/, "")}</span>
          </p>}

          <div data-testid="discord-setup-progress" className="mt-5 flex items-center gap-2"
            aria-label={`Step ${telegramStep ? 2 : 1} of 2`}>
            <div className="flex min-w-0 items-center gap-2" aria-current={!telegramStep ? "step" : undefined}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: !telegramStep || credentialsReady ? "#1B3A7A" : "var(--t-surface2)" }}>
                {credentialsReady ? "✓" : "1"}
              </span>
              <span className="truncate text-xs font-semibold"
                style={{ color: !telegramStep ? "var(--t-text)" : "var(--t-muted)" }}>Username &amp; password</span>
            </div>
            <span aria-hidden="true" className="h-px min-w-4 flex-1" style={{ background: "var(--t-border)" }} />
            <div className="flex shrink-0 items-center gap-2" aria-current={telegramStep ? "step" : undefined}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: telegramStep ? "#1B3A7A" : "var(--t-surface2)",
                  color: telegramStep ? "#fff" : "var(--t-muted)",
                }}>2</span>
              <span className="text-xs font-semibold"
                style={{ color: telegramStep ? "var(--t-text)" : "var(--t-muted)" }}>Telegram</span>
            </div>
          </div>
        </div>
        <div data-testid="discord-setup-step-content" className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {telegramStep
            ? <div className="space-y-3">
              <TelegramLoginSetup key={account.telegramUsername} accountIdentifier={account.telegramUsername} />
              <LinkedDiscordIdentity account={account} compact />
            </div>
            : <div className="space-y-3">
              {credentialsReady
                ? <section className="rounded-2xl border p-4"
                  style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <p className="text-sm font-bold">Username and password are ready</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--t-muted)" }}>
                    Your Peps sign-in is <span className="font-semibold" style={{ color: "var(--t-text)" }}>
                      @{account.telegramUsername.replace(/^@/, "")}
                    </span>
                  </p>
                </section>
                : <DiscordCredentialsSetup account={account}
                  continuationUrl="/account?s=profile&discord_setup=1" onBusyChange={setBusy} />}
              <LinkedDiscordIdentity account={account} compact />
            </div>}
        </div>
        <div data-testid="discord-setup-sticky-footer" className="shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6"
          style={{ background: "var(--t-bg)", borderColor: "var(--t-border)" }}>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button data-testid="discord-setup-continue-discord" type="button" disabled={busy}
              onClick={dismiss} className="min-h-10 rounded-xl border border-dashed px-3 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-blue-deep)" }}>
              Skip setup — continue with Discord
            </button>
            {credentialsReady && !telegramStep && <button data-testid="discord-setup-next" type="button"
              onClick={() => setActiveStep("telegram")} className="min-h-11 rounded-xl px-4 text-sm font-bold text-white"
              style={{ background: "#1B3A7A" }}>
              Continue to Telegram
            </button>}
            {telegramStep && <div className="flex gap-2">
              <button data-testid="discord-setup-back" type="button" onClick={() => setActiveStep("credentials")}
                className="min-h-11 rounded-xl border px-3 text-sm font-semibold"
                style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                Back
              </button>
              <button data-testid="discord-setup-finish" type="button" disabled={busy} onClick={dismiss}
                className="min-h-11 flex-1 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#1B3A7A" }}>
                Finish setup
              </button>
            </div>}
          </div>
          <p className="mt-2 text-center text-[11px] leading-4" style={{ color: "var(--t-muted)" }}>
            {telegramStep
              ? "Telegram linking is optional. You can change sign-in methods later in Account Settings."
              : "You can return to Account Settings to finish setup at any time."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
