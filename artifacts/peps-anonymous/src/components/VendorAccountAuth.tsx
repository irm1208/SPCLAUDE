import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Banner, Btn, Field, cardStyle, field, fieldCls, muted } from '@/components/vendor-ui';
import { clearVendorCsrfToken, restoreVendorSession, setVendorCsrfToken, vendorFetch } from '@/lib/vendor-auth-client';

type Account = { username: string; status: 'pending' | 'active' | 'disabled'; vendorId: string | null; companyName: string };
export default function VendorAccountAuth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const accept = useCallback((next: Account) => {
    setAccount(next);
    if (next.status === 'active' && next.vendorId) onAuthenticated();
  }, [onAuthenticated]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await restoreVendorSession();
      if (response.ok) accept((await response.json()).account);
      else if (response.status === 401) setAccount(null);
      else throw new Error('Could not check vendor access. Try again.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not reach the vendor portal.'); }
    finally { setLoading(false); }
  }, [accept]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const username = String(data.get('username') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!/^[a-z0-9][a-z0-9_.-]{2,49}$/i.test(username)) { setError('Use 3–50 letters, numbers, dots, underscores or hyphens, starting with a letter or number.'); return; }
    if (signup && (password.length < 12 || password.length > 128 || new TextEncoder().encode(password).length > 72)) { setError('Use at least 12 characters. If your password is very long, shorten it.'); return; }
    if (signup && password !== data.get('confirm')) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/vendor/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, ...(signup ? {
          companyName: String(data.get('companyName') ?? '').trim(),
          contactName: String(data.get('contactName') ?? '').trim() || undefined,
          email: String(data.get('email') ?? '').trim() || undefined,
        } : { rememberMe }) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not sign in. Try again.');
      setVendorCsrfToken(body.csrfToken); accept(body.account);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not reach the vendor portal.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await vendorFetch('/api/vendor/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) throw new Error('Could not sign out. Try again.');
      clearVendorCsrfToken(); setAccount(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign out.'); }
    finally { setBusy(false); }
  }
  return <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
    <header className="px-6 py-5 text-white font-semibold" style={{ background: '#1B3A7A' }}>Peps Anonymous <span className="font-normal opacity-75">· Vendor portal</span></header>
    <main className="flex-1 px-4 py-12"><div className="max-w-md mx-auto p-6 space-y-5" style={cardStyle}>
      {loading ? <p role="status" aria-busy="true">Checking vendor access…</p> : account ? <>
        <h1 className="text-xl font-bold">{account.status === 'disabled' ? 'Vendor account disabled' : 'Vendor account awaiting approval'}</h1>
        <Banner tone={account.status === 'disabled' ? 'critical' : 'info'}>
          {account.status === 'disabled' ? 'Your vendor account is disabled. Contact Peps Anonymous for assistance.' : `Your account for ${account.companyName} is ready for review. Peps Anonymous will approve it and link it to your supplier record before orders appear.`}
        </Banner>
        <p style={muted}>Signed in as {account.username}</p>
        <div className="flex gap-2"><Btn onClick={() => void refresh()} disabled={busy}>Check status</Btn><Btn onClick={() => void logout()} disabled={busy}>Sign out</Btn></div>
      </> : <>
        <div className="flex gap-2"><Btn onClick={() => { setSignup(false); setError(''); }} variant={signup ? 'secondary' : 'primary'}>Sign in</Btn><Btn onClick={() => { setSignup(true); setError(''); }} variant={signup ? 'primary' : 'secondary'}>Create vendor account</Btn></div>
        <div><h1 className="text-xl font-bold">{signup ? 'Create your vendor account' : 'Sign in to the vendor portal'}</h1><p className="mt-2 text-sm" style={muted}>{signup ? 'Create a dedicated vendor login. New accounts require approval before accessing orders.' : 'Use your dedicated vendor username and password.'}</p></div>
        <form onSubmit={submit} className="space-y-4" key={signup ? 'signup' : 'login'}>
          <fieldset disabled={busy} className="space-y-4">
            {signup && <><Field label="Company name"><input required maxLength={120} name="companyName" autoComplete="organization" className={fieldCls} style={field} /></Field><Field label="Contact name (optional)"><input name="contactName" maxLength={120} autoComplete="name" className={fieldCls} style={field} /></Field><Field label="Email (optional)"><input name="email" type="email" maxLength={254} autoComplete="email" className={fieldCls} style={field} /></Field></>}
            <Field label="Vendor username" hint={signup ? '3–50 characters: letters, numbers, dots, underscores or hyphens.' : undefined}><input name="username" required minLength={3} maxLength={50} autoComplete="username" autoCapitalize="none" spellCheck={false} className={fieldCls} style={field} /></Field>
            <Field label="Password" hint={signup ? 'At least 12 characters.' : undefined}><input name="password" type="password" required minLength={signup ? 12 : undefined} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} className={fieldCls} style={field} /></Field>
            {signup ? <Field label="Confirm password"><input name="confirm" type="password" required autoComplete="new-password" className={fieldCls} style={field} /></Field> : <label className="flex gap-2 text-sm"><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />Remember me</label>}
            <Btn type="submit" variant="primary" className="w-full h-10" style={{ background: '#1B3A7A', color: '#fff' }} disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create vendor account' : 'Sign in'}</Btn>
          </fieldset>
        </form>
      </>}
      {error && <Banner tone="critical" role="alert">{error}</Banner>}
      {!loading && error && !account && <Btn onClick={() => void refresh()}>Retry connection</Btn>}
    </div></main>
    <footer className="text-xs text-center px-4 py-6" style={muted}>Vendor access is approved by Peps Anonymous.</footer>
  </div>;
}
