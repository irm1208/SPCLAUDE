import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { AccountMe } from "../../hooks/use-account";
import { getDiscordSetupStep, submitDiscordSetup } from "../../lib/discord-credentials-setup";

export function DiscordCredentialsSetup({
  account, onSkip,
}: { account: AccountMe; onSkip?: () => void }) {
  return <DiscordCredentialsSetupForm key={account.telegramUsername} account={account} onSkip={onSkip} />;
}

function DiscordCredentialsSetupForm({
  account, onSkip,
}: { account: AccountMe; onSkip?: () => void }) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const step = getDiscordSetupStep({
    ...account, hasPassword: passwordCreated ? true : account.hasPassword,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || step === "complete") return;
    setMessage(null);
    if (step === "password" && password !== confirmation) {
      setMessage({ ok: false, text: "Passwords do not match" });
      return;
    }
    setBusy(true);
    try {
      await submitDiscordSetup(step, step === "password"
        ? { password }
        : { newUsername: username.trim(), currentPassword: password });
      setPassword("");
      setConfirmation("");
      if (step === "password") {
        setPasswordCreated(true);
        qc.setQueryData<AccountMe | null>(["account", "me"], previous =>
          previous?.telegramUsername === account.telegramUsername
            ? { ...previous, hasPassword: true } : previous);
        void qc.invalidateQueries({ queryKey: ["account", "me"] });
        setMessage({ ok: true, text: account.telegramUsername.replace(/^@/, "").startsWith("discord:")
          ? "Password saved. Choose your site username below."
          : "Password saved. You can now use your site username and password to sign in." });
      } else {
        setLocation("/account?s=profile");
      }
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save login details" });
    } finally {
      setBusy(false);
    }
  }

  if (step === "complete" && !message) return null;
  const inputClass = "w-full h-11 rounded-xl border px-4 text-sm";
  const inputStyle = { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" };
  return (
    <section className="rounded-2xl p-5 space-y-3"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
        {step === "password" ? "Create a password" : step === "username"
          ? "Choose your site username" : "Password login enabled"}
      </h3>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Sign in without Discord. Your Discord connection stays linked, and this does not change your name on Discord.
      </p>
      {message && <p data-testid="status-discord-credentials" role={message.ok ? "status" : "alert"} className="text-xs"
        style={{ color: message.ok ? "var(--t-text)" : "#DC2626" }}>{message.text}</p>}
      {step !== "complete" && <form onSubmit={submit} className="space-y-3">
        {step === "username" && <label className="block text-xs">
          Site username
          <input data-testid="input-discord-site-username" className={inputClass} style={inputStyle} value={username}
            onChange={event => setUsername(event.target.value.replace(/^@+/, ""))}
            autoComplete="username" minLength={3} maxLength={64}
            pattern="[a-zA-Z0-9_]+" required disabled={busy} />
          <span style={{ color: "var(--t-muted)" }}>3–64 letters, numbers, or underscores.</span>
        </label>}
        <label className="block text-xs">
          {step === "password" ? "New password" : "Current password"}
          <input data-testid="input-discord-password" className={inputClass} style={inputStyle} type="password" value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={step === "password" ? "new-password" : "current-password"}
            minLength={step === "password" ? 8 : undefined} required disabled={busy} />
        </label>
        {step === "password" && <>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            At least 8 characters, including a number or special character.
          </p>
          <label className="block text-xs">
            Confirm password
            <input data-testid="input-discord-password-confirmation" className={inputClass} style={inputStyle} type="password"
              value={confirmation} onChange={event => setConfirmation(event.target.value)}
              autoComplete="new-password" required disabled={busy} />
          </label>
        </>}
        <button data-testid="button-submit-discord-credentials" type="submit" disabled={busy} className="w-full h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
          {busy ? "Saving…" : step === "password" ? "Create password" : "Save site username"}
        </button>
        {onSkip && <button data-testid="button-skip-discord-credentials" type="button" onClick={onSkip} disabled={busy}
          className="w-full h-11 text-sm" style={{ color: "var(--t-muted)" }}>Skip for now</button>}
      </form>}
    </section>
  );
}