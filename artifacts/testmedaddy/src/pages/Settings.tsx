import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, ExternalLink, Check } from "lucide-react";
import { useAuth, type PaymentMethods } from "@/lib/auth";
import { get, patch, post, put, del, upload, fileUrl } from "@/lib/api";
import { Page } from "@/components/Layout";
import { Button, Card, Field, Input, Textarea, Alert, Toggle, Badge, CopyButton, useToast } from "@/components/ui";
import { PaymentMethodsEditor } from "@/components/PaymentMethodsEditor";

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ displayName: user?.displayName ?? "", bio: user?.bio ?? "" });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ email: true, poolUpdates: true, results: true, chat: true, ...user?.notificationPrefs });
  const [methods, setMethods] = useState<PaymentMethods>(user?.payoutMethods ?? {});
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState<string | null>(null);
  if (!user) return null;
  const run = async (key: string, fn: () => Promise<void>, ok: string) => { setBusy(key); try { await fn(); toast(ok, "ok"); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(null); } };
  const saveProfile = (e: FormEvent) => { e.preventDefault(); run("profile", async () => { const r = await patch("/api/tmd/me", { ...profile, notificationPrefs: prefs }); setUser(r.user); }, "Profile saved"); };
  const savePayout = () => run("payout", async () => { const r = await put("/api/tmd/me/payout-methods", { paymentMethods: methods }); setUser(r.user); setMethods(r.user.payoutMethods); }, "Payout methods saved");
  const changePassword = (e: FormEvent) => { e.preventDefault(); run("password", async () => { await post("/api/tmd/auth/change-password", pw); setPw({ currentPassword: "", newPassword: "" }); }, "Password changed"); };
  return (
    <Page title="Settings" subtitle={`Signed in as @${user.handle} · ${user.email}`}>
      {!user.emailVerified && (
        <Alert tone="warn"><div className="flex flex-wrap items-center gap-3">Your email is not confirmed yet.<Button size="sm" tone="subtle" loading={busy === "resend"} onClick={() => run("resend", () => post("/api/tmd/auth/resend-verification").then(() => undefined), "Confirmation email sent")}>Resend link</Button></div></Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-surface-2 text-xl font-bold text-muted">{user.avatarKey ? <img src={fileUrl(user.avatarKey)} alt="" className="size-full object-cover" /> : user.displayName[0]}</div>
              <label className="cursor-pointer text-sm text-brand hover:underline"><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) run("avatar", async () => { const r = await upload("/api/tmd/me/avatar", f); setUser(r.user); }, "Avatar updated"); }} />Change avatar</label>
            </div>
            <Field label="Display name"><Input value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} minLength={2} maxLength={60} required /></Field>
            <Field label="Bio" hint="Shown on your pools. Who are you, which groups do you run?"><Textarea value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} maxLength={600} /></Field>
            <div className="space-y-2 pt-2">
              <p className="label">Notifications</p>
              <Toggle checked={prefs.email !== false} onChange={v => setPrefs({ ...prefs, email: v })} label="Email me" hint="Joins, payments, status changes, announcements." />
              <Toggle checked={prefs.chat !== false} onChange={v => setPrefs({ ...prefs, chat: v })} label="Chat messages" hint="New chat messages in pools I host." />
              <Toggle checked={prefs.telegram !== false} onChange={v => setPrefs({ ...prefs, telegram: v })} label="Telegram messages" hint={user.telegramLinked ? `Sent to ${user.telegramUsername ? `@${user.telegramUsername}` : "your linked chat"}.` : "Link Telegram below to receive these."} />
            </div>
            <Button type="submit" loading={busy === "profile"}>Save profile</Button>
          </form>
        </Card>
        <div className="space-y-6">
          <TelegramCard />
          <Card>
            <h2 className="mb-1 text-lg font-semibold">Default payout methods</h2>
            <p className="mb-4 text-sm text-muted">Copied onto each new pool you host. You can still change them per pool.</p>
            <PaymentMethodsEditor value={methods} onChange={setMethods} />
            <Button className="mt-4" loading={busy === "payout"} onClick={savePayout}>Save payout methods</Button>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Password</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
              <Field label="New password" hint="At least 10 characters. Other sessions are signed out."><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required minLength={10} /></Field>
              <Button type="submit" tone="subtle" loading={busy === "password"}>Change password</Button>
            </form>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function TelegramCard() {
  const { user, setUser, refresh } = useAuth();
  const toast = useToast();
  const status = useQuery({ queryKey: ["me", "telegram"], queryFn: () => get<{ configured: boolean; botUsername: string | null; linked: boolean; username: string | null }>("/api/tmd/me/telegram") });
  const [link, setLink] = useState<{ url: string | null; command: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // While a code is outstanding, poll the session so the card flips to "linked" as soon as the bot confirms.
  useEffect(() => {
    if (!link || user?.telegramLinked) return;
    const timer = setInterval(() => { refresh().then(u => { if (u?.telegramLinked) { setLink(null); status.refetch(); toast("Telegram linked", "ok"); } }); }, 4000);
    return () => clearInterval(timer);
  }, [link, user?.telegramLinked, refresh, status, toast]);
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(null); } };
  const configured = status.data?.configured ?? false;
  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-semibold"><Send className="size-4 text-brand" /> Telegram</h2>{user?.telegramLinked ? <Badge tone="ok"><Check className="size-3" /> Linked</Badge> : <Badge>Not linked</Badge>}</div>
      <p className="mb-4 text-sm text-muted">Get joins, payments, shipping and results as Telegram messages, and talk to the bot with /status.</p>
      {!configured && !status.isLoading && <Alert tone="info">Telegram is not switched on for this site yet.</Alert>}
      {configured && user?.telegramLinked && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Connected{user.telegramUsername ? <> as <b>@{user.telegramUsername}</b></> : ""}.</span>
          <Button size="sm" tone="subtle" loading={busy === "test"} onClick={() => run("test", async () => { const r = await post("/api/tmd/me/telegram/test"); toast(r.delivered ? "Test message sent" : "Telegram did not accept the message", r.delivered ? "ok" : "danger"); })}>Send test</Button>
          <Button size="sm" tone="ghost" loading={busy === "unlink"} onClick={() => run("unlink", async () => { const r = await del("/api/tmd/me/telegram"); setUser(r.user); status.refetch(); })}>Disconnect</Button>
        </div>
      )}
      {configured && !user?.telegramLinked && (link ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Open the bot{status.data?.botUsername ? <> <b>@{status.data.botUsername}</b></> : ""} and press <b>Start</b>.</li>
            <li>If it does not link automatically, send it this command:</li>
          </ol>
          <div className="flex gap-2"><div className="mono flex-1 rounded-lg bg-surface-2 px-3 py-2 text-sm">{link.command}</div><CopyButton text={link.command} /></div>
          <div className="flex flex-wrap items-center gap-2">
            {link.url && <a href={link.url} target="_blank" rel="noreferrer"><Button size="sm"><ExternalLink className="size-3.5" /> Open bot</Button></a>}
            <span className="text-xs text-dim">The code works for 15 minutes. Waiting for the bot…</span>
          </div>
        </div>
      ) : (
        <Button loading={busy === "link"} onClick={() => run("link", async () => setLink(await post("/api/tmd/me/telegram/link")))}>Link Telegram</Button>
      ))}
    </Card>
  );
}
