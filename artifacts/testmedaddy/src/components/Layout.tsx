import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fileUrl } from "@/lib/api";
import { Button, cn, useToast } from "./ui";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} fill="none" aria-hidden="true">
      <path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5C16.9 12.6 12.6 16.9 12 22.5 11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5z" fill="currentColor" />
    </svg>
  );
}
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Mark className="text-night" />
      <span className="text-[15px]">Testmedaddy</span>
    </Link>
  );
}

const NAV = [{ href: "/explore", label: "Pools" }, { href: "/how-it-works", label: "How it works" }];

export function Layout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const signOut = () => { logout().catch(error => toast(error.message || "Could not sign out. Please try again.", "danger")); };
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const landing = location === "/";
  const navLink = (href: string, label: string) => (
    <Link key={href} href={href} className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium text-muted transition hover:text-fg", location.startsWith(href) && "text-fg")}>{label}</Link>
  );
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(n => navLink(n.href, n.label))}
            {user && navLink("/dashboard", "Dashboard")}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {loading ? null : user ? (
              <>
                <Link href="/host/new"><Button size="sm">Host a pool</Button></Link>
                <div className="relative">
                  <button onClick={() => setMenu(m => !m)} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-2 text-sm transition hover:bg-surface-2" aria-haspopup="menu" aria-expanded={menu}>
                    <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-xs font-semibold text-brand">{user.avatarKey ? <img src={fileUrl(user.avatarKey)} alt="" className="size-full object-cover" /> : user.displayName[0]?.toUpperCase()}</span>
                    <ChevronDown className="size-3.5 text-muted" />
                  </button>
                  {menu && (
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-xl" role="menu" onClick={() => setMenu(false)}>
                      <div className="border-b border-line px-4 py-2.5"><p className="truncate text-sm font-medium">{user.displayName}</p><p className="truncate text-xs text-muted">@{user.handle}</p></div>
                      <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-surface-2">Dashboard</Link>
                      <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-surface-2">Settings</Link>
                      <button className="block w-full px-4 py-2 text-left text-sm text-muted hover:bg-surface-2" onClick={signOut}>Sign out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted hover:text-fg">Sign in</Link>
                <Link href="/signup"><Button size="sm">Create account</Button></Link>
              </>
            )}
          </div>
          <button className="ml-auto rounded-full p-2 text-muted md:hidden" onClick={() => setOpen(o => !o)} aria-label="Menu">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        {open && (
          <div className="border-b border-line bg-surface px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            <div className="flex flex-col gap-1">
              {NAV.map(n => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium">{n.label}</Link>)}
              {user ? (<>
                <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium">Dashboard</Link>
                <Link href="/host/new" className="rounded-lg px-3 py-2 text-sm font-medium text-brand">Host a pool</Link>
                <Link href="/settings" className="rounded-lg px-3 py-2 text-sm font-medium">Settings</Link>
                <button className="rounded-lg px-3 py-2 text-left text-sm text-muted" onClick={signOut}>Sign out</button>
              </>) : (<>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium">Sign in</Link>
                <Link href="/signup" className="rounded-lg px-3 py-2 text-sm font-medium text-brand">Create account</Link>
              </>)}
            </div>
          </div>
        )}
      </header>
      <main className={cn("mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6", landing ? "pb-16" : "py-8 sm:py-10")}>{children}</main>
      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-6 sm:px-6">
        <div className="card-2 grid gap-10 p-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:p-12">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-sm text-sm text-muted">Coordinate interest in independent peptide batch testing. Core release pools are planning tools: joining does not collect money.</p>
            <Link href="/signup"><Button size="sm">Create account</Button></Link>
          </div>
          <FooterColumn title="Product" links={[["/explore", "Browse pools"], ["/how-it-works", "How it works"], ["/host/new", "Host a pool"]]} />
          <FooterColumn title="Account" links={[["/signup", "Create account"], ["/login", "Sign in"], ["/dashboard", "Dashboard"], ["/settings", "Settings"]]} />
          <FooterColumn title="Release" links={[["/how-it-works", "Core release scope"], ["/explore", "Pool visibility"], ["/settings", "Account settings"]]} />
        </div>
        <div className="flex flex-col gap-2 px-2 pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Testmedaddy. Independent of every vendor and lab.</p>
          <p>No medical advice. Nothing here is a product for sale.</p>
        </div>
      </footer>
    </div>
  );
}
function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-2 text-sm text-muted">{links.map(([href, label]) => <li key={label}><Link href={href} className="transition hover:text-fg">{label}</Link></li>)}</ul>
    </div>
  );
}

export function Page({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="display text-3xl sm:text-4xl">{title}</h1>{subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle}</p>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
