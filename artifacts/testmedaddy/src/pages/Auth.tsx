import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { post } from "@/lib/api";
import { Button, Field, Input, Alert, Toggle } from "@/components/ui";

function Shell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fade-in mx-auto max-w-md py-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="card mt-6 p-6">{children}</div>
      {footer && <p className="mt-4 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}
const nextParam = () => {
  try {
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/dashboard";
  } catch { return "/dashboard"; }
};

export function Login() {
  const { login, user } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) navigate(nextParam(), { replace: true }); }, [user, navigate]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setError(null); try { await login(form.email, form.password, form.rememberMe); } catch (err: any) { setError(err.message); } finally { setBusy(false); } };
  return (
    <Shell title="Sign in" footer={<>New here? <Link href="/signup" className="text-brand hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email or handle"><Input autoComplete="username" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></Field>
        <Field label="Password"><Input type="password" autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></Field>
        <div className="flex items-center justify-between"><Toggle checked={form.rememberMe} onChange={v => setForm({ ...form, rememberMe: v })} label="Keep me signed in" /></div>
        <Button type="submit" className="w-full" loading={busy}>Sign in</Button>
      </form>
    </Shell>
  );
}

export function Signup() {
  const { signup, user } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", handle: "", displayName: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) navigate(nextParam(), { replace: true }); }, [user, navigate]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setError(null); try { await signup({ ...form, displayName: form.displayName || form.handle }); } catch (err: any) { setError(err.message); } finally { setBusy(false); } };
  return (
    <Shell title="Create your account" subtitle="One account to host pools, join pools and follow results." footer={<>Already have one? <Link href="/login" className="text-brand hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email" hint="Your email is never shown to other members."><Input type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Handle" hint="Letters, numbers, - and _"><Input autoComplete="username" placeholder="labrat" value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} required minLength={3} maxLength={30} /></Field>
          <Field label="Display name"><Input placeholder="Optional" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} maxLength={60} /></Field>
        </div>
        <Field label="Password" hint="At least 10 characters. Password recovery is not available in this release."><Input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={10} /></Field>
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await post("/api/tmd/auth/forgot-password", { email }); } finally { setBusy(false); setDone(true); } };
  return (
    <Shell title="Reset your password" footer={<Link href="/login" className="text-brand hover:underline">Back to sign in</Link>}>
      {done ? <Alert tone="ok">If an account exists for that address, a reset link is on its way. It is valid for 30 minutes.</Alert> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
          <Button type="submit" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<{ error?: string; done?: boolean }>({});
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await post("/api/tmd/auth/reset-password", { token, password }); setState({ done: true }); } catch (err: any) { setState({ error: err.message }); } finally { setBusy(false); } };
  return (
    <Shell title="Choose a new password" footer={<Link href="/login" className="text-brand hover:underline">Sign in</Link>}>
      {state.done ? <Alert tone="ok">Password updated. You can sign in now.</Alert> : (
        <form onSubmit={submit} className="space-y-4">
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <Field label="New password" hint="At least 10 characters."><Input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} /></Field>
          <Button type="submit" className="w-full" loading={busy}>Update password</Button>
        </form>
      )}
    </Shell>
  );
}

export function VerifyEmail() {
  const { refresh } = useAuth();
  const [state, setState] = useState<{ status: "working" | "ok" | "error"; message?: string }>({ status: "working" });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    post("/api/tmd/auth/verify-email", { token }).then(() => { setState({ status: "ok" }); refresh(); }).catch(err => setState({ status: "error", message: err.message }));
  }, [refresh]);
  return (
    <Shell title="Confirming your email" footer={<Link href="/dashboard" className="text-brand hover:underline">Go to your dashboard</Link>}>
      {state.status === "working" ? <p className="text-sm text-muted">One moment…</p> : state.status === "ok" ? <Alert tone="ok">Your email is confirmed. Thanks.</Alert> : <Alert tone="danger">{state.message}</Alert>}
    </Shell>
  );
}
