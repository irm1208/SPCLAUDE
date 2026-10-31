import VendorLanguageSelect from "@/components/VendorLanguageSelect";
import { vendorTranslate as vt, useVendorLanguage, getVendorLanguage } from "@/lib/vendor-language";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Clock, Fingerprint, KeyRound, Loader2, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge, Banner, Btn, Field, cardStyle, field, fieldCls, muted, subtle } from '@/components/vendor-ui';
import { clearVendorCsrfToken, restoreVendorSession, setVendorCsrfToken, vendorFetch } from '@/lib/vendor-auth-client';
import { getPasskey, passkeyErrorMessage, passkeysSupported } from '@/lib/vendor-webauthn';

/* ---------------------------------------------------------------------------
 * Vendor sign-in / sign-up gate (dedicated vendor accounts).
 * Flows: password -> optional second step (authenticator code or passkey),
 * passkey-only sign-in, account creation (pending Admin approval).
 * ------------------------------------------------------------------------- */
type Account = { username: string; status: 'pending' | 'active' | 'disabled'; vendorId: string | null; companyName: string };
type Mfa = { mfaToken: string; username: string; methods: { totp: boolean; passkeys: number }; rememberMe: boolean };
const input = fieldCls.replace('h-8', 'h-9');
const post = (url: string, body: unknown) => fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export default function VendorAccountAuth({ onAuthenticated }: { onAuthenticated: () => void }) {
  useVendorLanguage();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState('');
  const [mfa, setMfa] = useState<Mfa | null>(null);
  const [code, setCode] = useState('');
  const accept = useCallback((next: Account) => {
    setAccount(next); setMfa(null);
    if (next.status === 'active' && next.vendorId) onAuthenticated();
  }, [onAuthenticated]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await restoreVendorSession();
      if (response.ok) accept((await response.json()).account);
      else if (response.status === 401) setAccount(null);
      else throw new Error(vt('Could not check vendor access. Try again.'));
    } catch (err) { setError(err instanceof Error ? err.message : vt('Could not reach the vendor portal.')); }
    finally { setLoading(false); }
  }, [accept]);
  useEffect(() => { void refresh(); }, [refresh]);

  const finish = (body: any) => { setVendorCsrfToken(body.csrfToken); accept(body.account); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const user = String(data.get('username') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!/^[a-z0-9][a-z0-9_.-]{2,49}$/i.test(user)) { setError(vt('Use 3–50 letters, numbers, dots, underscores or hyphens, starting with a letter or number.')); return; }
    if (signup && (password.length < 12 || password.length > 128 || new TextEncoder().encode(password).length > 72)) { setError(vt('Use at least 12 characters. If your password is very long, shorten it.')); return; }
    if (signup && password !== data.get('confirm')) { setError(vt('Passwords do not match.')); return; }
    setBusy('submit'); setError('');
    try {
      const response = await post(`/api/vendor/auth/${signup ? 'signup' : 'login'}`, { username: user, password, ...(signup ? {
        companyName: String(data.get('companyName') ?? '').trim(),
        contactName: String(data.get('contactName') ?? '').trim() || undefined,
        email: String(data.get('email') ?? '').trim() || undefined,
      } : { rememberMe }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || vt('Could not sign in. Try again.'));
      if (body.mfaRequired) { setMfa({ mfaToken: body.mfaToken, username: body.username, methods: body.methods, rememberMe }); setCode(''); return; }
      finish(body);
    } catch (err) { setError(err instanceof Error ? err.message : vt('Could not reach the vendor portal.')); }
    finally { setBusy(null); }
  }
  async function submitCode(event: FormEvent) {
    event.preventDefault(); if (!mfa || busy) return;
    if (code.replace(/\s/g, '').length < 6) { setError(vt('Enter the six-digit code from your authenticator app, or a recovery code.')); return; }
    setBusy('code'); setError('');
    try {
      const response = await post('/api/vendor/auth/mfa/totp', { mfaToken: mfa.mfaToken, code: code.trim() });
      const body = await response.json();
      if (!response.ok) { if (body.mfaToken) setMfa({ ...mfa, mfaToken: body.mfaToken }); throw new Error(body.error || vt('Code not accepted.')); }
      finish(body);
    } catch (err) { setError(err instanceof Error ? err.message : vt('Could not verify the code.')); }
    finally { setBusy(null); setCode(''); }
  }
  async function usePasskey() {
    if (busy) return;
    setBusy('passkey'); setError('');
    try {
      const user = mfa?.username ?? username.trim();
      const options = await post('/api/vendor/auth/passkey/options', { username: user || undefined });
      const optionsBody = await options.json();
      if (!options.ok) throw new Error(optionsBody.error || vt('Passkeys are not available right now.'));
      let credential;
      try { credential = await getPasskey(optionsBody.options); } catch (e) { throw new Error(passkeyErrorMessage(e, vt('Passkey sign-in did not complete.'))); }
      const response = await post('/api/vendor/auth/passkey/verify', { credential, rememberMe: mfa?.rememberMe ?? rememberMe, mfaToken: mfa?.mfaToken });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || vt('Passkey was not accepted.'));
      finish(body);
    } catch (err) { setError(err instanceof Error ? err.message : vt('Could not reach the vendor portal.')); }
    finally { setBusy(null); }
  }
  async function logout() {
    setBusy('logout'); setError('');
    try {
      const response = await vendorFetch('/api/vendor/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) throw new Error(vt('Could not sign out. Try again.'));
      clearVendorCsrfToken(); setAccount(null);
    } catch (err) { setError(err instanceof Error ? err.message : vt('Could not sign out.')); }
    finally { setBusy(null); }
  }

  const errorBanner = error && <Banner tone="critical" role="alert" testId="text-auth-error" onDismiss={() => setError('')}>{vt(error)}</Banner>;

  if (loading) return <Frame><div className="p-6 space-y-3" style={cardStyle} role="status" aria-busy="true"><p className="sr-only">{vt("Checking vendor access…")}</p>{[0, 1, 2].map(i => <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: 'var(--t-surface2)' }} />)}</div></Frame>;

  if (account) return (
    <Frame>
      <Panel testId="state-auth-403" icon={account.status === 'disabled' ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        title={account.status === 'disabled' ? vt('Vendor account disabled') : vt('Vendor account awaiting approval')}
        body={account.status === 'disabled' ? vt('Your vendor account is disabled. Contact Peps Anonymous for assistance.') : (getVendorLanguage() === "zh" ? `您的 ${account.companyName} 账户已提交审核。Peps Anonymous 审核通过并关联您的供应商记录后，订单才会显示。` : `Your account for ${account.companyName} is ready for review. Peps Anonymous will approve it and link it to your supplier record before orders appear.`)}>
        {errorBanner}
        <dl className="text-[13px] rounded-lg p-3 space-y-1 text-left" style={{ background: 'var(--t-surface2)' }}>
          <div className="flex justify-between gap-3"><dt style={muted}>{vt("Status")}</dt><dd><Badge tone={account.status === 'disabled' ? 'critical' : 'attention'} progress={account.status === 'disabled' ? 'incomplete' : 'partial'}>{account.status === 'disabled' ? vt('Disabled') : vt('Pending approval')}</Badge></dd></div>
          <div className="flex justify-between gap-3"><dt style={muted}>{vt("Signed in as")}</dt><dd className="font-medium" style={{ color: 'var(--t-text)' }}>{account.username}</dd></div>
        </dl>
        <p className="text-xs text-left" style={subtle}>{vt("Signed in as")} {account.username}</p>
        <div className="flex gap-2">
          <Btn className="flex-1 h-9" onClick={() => void refresh()} disabled={!!busy}><RefreshCw className="w-4 h-4" />{vt("Check status")}</Btn>
          <Btn className="flex-1 h-9" onClick={() => void logout()} disabled={!!busy}><LogOut className="w-4 h-4" />{vt("Sign out")}</Btn>
        </div>
      </Panel>
    </Frame>
  );

  if (mfa) return (
    <Frame>
      <Panel testId="state-auth-mfa" icon={<KeyRound className="w-5 h-5" />} title={vt("One more step")} body={mfa.methods.totp ? (getVendorLanguage() === "zh" ? `请输入 ${mfa.username} 的身份验证器应用中的六位验证码或恢复码。` : `Enter the six-digit code from your authenticator app for ${mfa.username}, or a recovery code.`) : (getVendorLanguage() === "zh" ? `请使用 ${mfa.username} 的通行密钥确认身份。` : `Confirm it's you with a passkey for ${mfa.username}.`)}>
        {errorBanner}
        {mfa.methods.totp && (
          <form onSubmit={submitCode} className="space-y-3 text-left" data-testid="form-mfa-code">
            <Field label={vt("Verification code")}><input name="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} className={`${input} font-mono tracking-[0.25em] text-center`} style={field} autoFocus data-testid="input-mfa-code" /></Field>
            <Btn type="submit" variant="primary" className="w-full h-9" disabled={busy === 'code'} data-testid="button-mfa-submit">{busy === 'code' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}{vt("Verify")}</Btn>
          </form>)}
        {mfa.methods.passkeys > 0 && passkeysSupported() && <Btn className="w-full h-9" onClick={() => void usePasskey()} disabled={busy === 'passkey'} data-testid="button-mfa-passkey">{busy === 'passkey' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}{mfa.methods.totp ? vt('Use a passkey instead') : vt('Continue with passkey')}</Btn>}
        <button type="button" onClick={() => { setMfa(null); setError(''); }} className="text-xs font-medium underline" style={muted}>{vt("Start over")}</button>
      </Panel>
    </Frame>
  );

  return (
    <Frame wide={signup}>
      <div className="p-6 md:p-8" style={cardStyle} data-testid="state-auth-401">
        <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ background: 'var(--t-surface2)' }} role="tablist">
          <button type="button" role="tab" aria-selected={!signup} onClick={() => { setSignup(false); setError(''); }} className="flex-1 h-8 rounded-md text-[13px] font-semibold" style={!signup ? { background: 'var(--t-surface)', color: 'var(--t-text)', boxShadow: '0 1px 0 rgba(26,26,26,0.07)' } : { color: 'var(--t-muted)' }}>{vt("Sign in")}</button>
          <button type="button" role="tab" aria-selected={signup} onClick={() => { setSignup(true); setError(''); }} className="flex-1 h-8 rounded-md text-[13px] font-semibold" style={signup ? { background: 'var(--t-surface)', color: 'var(--t-text)', boxShadow: '0 1px 0 rgba(26,26,26,0.07)' } : { color: 'var(--t-muted)' }}>{vt("Create vendor account")}</button>
        </div>
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={subtle}>{vt("Fulfilment partners")}</p>
          <h1 className="text-xl font-semibold tracking-tight mt-0.5" style={{ color: 'var(--t-text)' }}>{signup ? vt('Create your vendor account') : vt('Sign in to the vendor portal')}</h1>
          <p className="text-[13px] mt-1" style={muted}>{signup ? vt('Create a dedicated vendor login. New accounts require approval before accessing orders.') : vt('Use your dedicated vendor username and password.')}</p>
        </div>
        {error && <div className="mb-4">{errorBanner}</div>}
        <form onSubmit={submit} className="space-y-4" key={signup ? 'signup' : 'login'} data-testid={signup ? 'form-vendor-signup' : 'form-vendor-login'}>
          <fieldset disabled={!!busy} className="space-y-4">
            {signup && <div className="grid sm:grid-cols-2 gap-4">
              <Field label={vt("Company name")} className="sm:col-span-2"><input required maxLength={120} name="companyName" autoComplete="organization" className={input} style={field} /></Field>
              <Field label={vt("Contact name (optional)")}><input name="contactName" maxLength={120} autoComplete="name" className={input} style={field} /></Field>
              <Field label={vt("Email (optional)")}><input name="email" type="email" maxLength={254} autoComplete="email" className={input} style={field} /></Field>
            </div>}
            <Field label={vt("Vendor username")} hint={signup ? vt('3–50 characters: letters, numbers, dots, underscores or hyphens.') : undefined}><input name="username" required minLength={3} maxLength={50} autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} className={input} style={field} /></Field>
            <Field label={vt("Password")} hint={signup ? vt('At least 12 characters.') : undefined}><input name="password" type="password" required minLength={signup ? 12 : undefined} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} className={input} style={field} /></Field>
            {signup ? <Field label={vt("Confirm password")}><input name="confirm" type="password" required autoComplete="new-password" className={input} style={field} /></Field>
              : <label className="flex items-center gap-2 text-[13px]" style={muted}><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="w-4 h-4 accent-[#1A1A1A]" />{vt("Keep me signed in on this device")}</label>}
            <Btn type="submit" variant="primary" className="w-full h-9" disabled={!!busy} data-testid="button-submit">{busy === 'submit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}{busy === 'submit' ? vt('Please wait…') : signup ? vt('Create vendor account') : vt('Sign in')}</Btn>
          </fieldset>
        </form>
        {!signup && passkeysSupported() && (
          <>
            <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px" style={{ background: 'var(--t-border)' }} /><span className="text-xs" style={subtle}>{vt("or")}</span><div className="flex-1 h-px" style={{ background: 'var(--t-border)' }} /></div>
            <Btn className="w-full h-9" onClick={() => void usePasskey()} disabled={!!busy} data-testid="button-passkey-signin">{busy === 'passkey' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}{vt("Sign in with a passkey")}</Btn>
          </>)}
      </div>
    </Frame>
  );
}

function Frame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  useVendorLanguage();
  return (
    <div className="min-h-[100dvh] flex flex-col text-[13px]" style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
      <header className="h-14 flex items-center gap-2 px-4 md:px-6 text-white" style={{ background: '#1A1A1A' }}>
        <span className="w-8 h-8 rounded-lg grid place-items-center font-bold text-sm" style={{ background: '#E9A020', color: '#1A1A1A' }}>P</span>
        <span className="font-semibold whitespace-nowrap">Peps Anonymous <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.55)' }}>{vt("· Vendor portal")}</span></span>
        <div className="ml-auto"><VendorLanguageSelect /></div>
      </header>
      <main className="flex-1 px-4 py-8 md:py-14"><div className={`mx-auto w-full ${wide ? 'max-w-[560px]' : 'max-w-[420px]'}`}>{children}</div></main>
      <footer className="px-4 py-5 text-center text-xs" style={subtle}>{vt("Vendor access is approved by Peps Anonymous.")}</footer>
    </div>
  );
}
function Panel({ icon, title, body, children, testId }: { icon: ReactNode; title: string; body: string; children: ReactNode; testId: string }) {
  useVendorLanguage();
  return (
    <div className="p-6 md:p-8 text-center space-y-4" style={cardStyle} data-testid={testId}>
      <span className="w-12 h-12 rounded-full grid place-items-center mx-auto" style={{ background: 'var(--t-surface2)', color: 'var(--t-text)' }}>{icon}</span>
      <div><h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--t-text)' }}>{title}</h1><p className="text-[13px] mt-1" style={muted}>{body}</p></div>
      {children}
    </div>
  );
}
