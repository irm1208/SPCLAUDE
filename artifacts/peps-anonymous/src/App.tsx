import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import React, { Suspense, lazy, useEffect, useRef } from "react";
import { useAccount, useTelegramAutoLogin } from "@/hooks/use-account";
import { DiscordLoginSetupModal } from "@/components/account/DiscordLoginSetupModal";
import {
  ACCOUNT_ACTIVITY_RETRY_INTERVAL_MS,
  shouldRefreshAccountSession,
} from "@/lib/account-session";

// Pages
import { siteSurface } from "@/lib/site-domain";
import Home from "@/pages/Home";
import LegacyOrderRedirect from "@/pages/LegacyOrderRedirect";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyPage = (load: () => Promise<{ default: React.ComponentType<any> }>) => lazy(load) as unknown as React.ComponentType<any>;
// Route-level code splitting: everything except the landing, login and 404 pages
// loads on demand, so a visitor downloads the admin, organiser and vendor code only if they open it.
const OrderForm = lazyPage(() => import("@/pages/OrderForm"));
const Review = lazyPage(() => import("@/pages/Review"));
const Success = lazyPage(() => import("@/pages/Success"));
const Admin = lazyPage(() => import("@/pages/Admin"));
const VendorPortal = lazyPage(() => import("@/pages/VendorPortal"));
const VendorLogin = lazyPage(() => import("@/pages/VendorLogin"));
const JanoshikReceiver = lazyPage(() => import("@/pages/JanoshikReceiver"));
const Protocols = lazyPage(() => import("@/pages/Protocols"));
const MedProtocolsRedirect = lazyPage(() => import("@/pages/Protocols").then(m => ({ default: m.MedProtocolsRedirect })));
const TrtAasRedirect = lazyPage(() => import("@/pages/Protocols").then(m => ({ default: m.TrtAasRedirect })));
const PeptideDetail = lazyPage(() => import("@/pages/PeptideDetail"));
const Calculator = lazyPage(() => import("@/pages/Calculator"));
const LabTests = lazyPage(() => import("@/pages/LabTests"));
const Packages = lazyPage(() => import("@/pages/Packages"));
const Shop = lazyPage(() => import("@/pages/Shop"));
const ShopCheckout = lazyPage(() => import("@/pages/ShopCheckout"));
const SellerDashboard = lazyPage(() => import("@/pages/SellerDashboard"));
const CustomerPortal = lazyPage(() => import("@/pages/CustomerPortal"));
const AccountOrderDetail = lazyPage(() => import("@/pages/AccountOrderDetail"));
const VerifyAccount = lazyPage(() => import("@/pages/VerifyAccount"));
const BloodTests = lazyPage(() => import("@/pages/BloodTests"));
const Compounds = lazyPage(() => import("@/pages/Compounds"));
const Members = lazyPage(() => import("@/pages/Members"));
const MedDetail = lazyPage(() => import("@/pages/MedDetail"));
const Learn = lazyPage(() => import("@/pages/Learn"));
const LearnCourse = lazyPage(() => import("@/pages/LearnCourse"));
const LearnLesson = lazyPage(() => import("@/pages/LearnLesson"));
const PeptideExplorer = lazyPage(() => import("@/pages/PeptideExplorer"));
const Feedback = lazyPage(() => import("@/pages/Feedback"));
const GbOrganiser = lazyPage(() => import("@/pages/GbOrganiser"));
const GbOrganiserV2 = lazyPage(() => import("@/pages/GbOrganiserV2"));
const GbQrViewer = lazyPage(() => import("@/pages/GbQrViewer"));
const GbLegViewer = lazyPage(() => import("@/pages/GbLegViewer"));
const GbLegKits = lazyPage(() => import("@/pages/GbLegKits"));
const TrackingPage = lazyPage(() => import("@/pages/TrackingPage"));
const GbTestingPool = lazyPage(() => import("@/pages/GbTestingPool"));
const GbTestingResults = lazyPage(() => import("@/pages/GbTestingResults"));
const TestingPool = lazyPage(() => import("@/pages/TestingPool"));
const GuestContribution = lazyPage(() => import("@/pages/GuestContribution"));
const ReshipperPage = lazyPage(() => import("@/pages/Reshipper"));
const ReshipperApply = lazyPage(() => import("@/pages/ReshipperApply"));
const WholesaleOrder = lazyPage(() => import("@/pages/WholesaleOrder"));
const WholesaleShared = lazyPage(() => import("@/pages/WholesaleShared"));
const WholesaleShareEntry = lazyPage(() => import("@/pages/WholesaleShareEntry"));
const WholesaleTracking = lazyPage(() => import("@/pages/WholesaleTracking"));
const WholesaleInviteLanding = lazyPage(() => import("@/pages/WholesaleInviteLanding"));
const PublicTestingPools = lazyPage(() => import("@/pages/PublicTestingPools"));
const SagePage = lazyPage(() => import("@/pages/SagePage"));
const GroupBuyHalfKits = lazyPage(() => import("@/pages/GroupBuyHalfKits"));

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error boundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 mb-2 max-w-sm">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          {this.state.message && (
            <p className="text-xs font-mono text-red-500 mb-4 max-w-sm px-3 py-2 rounded-lg bg-red-50 border border-red-100 break-all">
              {this.state.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lookup" component={LegacyOrderRedirect} />
      <Route path="/order" component={OrderForm} />
      <Route path="/review" component={Review} />
      <Route path="/success" component={Success} />
      <Route path="/protocols" component={Protocols} />
      <Route path="/protocols/track/:track" component={Protocols} />
      <Route path="/protocols/:slug" component={PeptideDetail} />
      <Route path="/calculator" component={Calculator} />
      <Route path="/tests" component={LabTests} />
      <Route path="/packages" component={Packages} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/checkout" component={ShopCheckout} />
      <Route path="/seller" component={SellerDashboard} />
      <Route path="/account/orders/:id" component={AccountOrderDetail} />
      <Route path="/account" component={CustomerPortal} />
      <Route path="/login" component={Login} />
      <Route path="/verify-account" component={VerifyAccount} />
      <Route path="/groups">{() => { useEffect(() => { window.location.replace("/account?s=groups"); }, []); return null; }}</Route>
      <Route path="/blood-tests" component={BloodTests} />
      <Route path="/compounds" component={Compounds} />
      <Route path="/members" component={Members} />
      <Route path="/medications" component={MedProtocolsRedirect} />
      <Route path="/medications/:slug" component={MedDetail} />
      <Route path="/trt-aas" component={TrtAasRedirect} />
      <Route path="/learn" component={Learn} />
      <Route path="/learn/3d-lab" component={PeptideExplorer} />
      <Route path="/learn/:courseSlug" component={LearnCourse} />
      <Route path="/learn/:courseSlug/:lessonSlug" component={LearnLesson} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/gborganiser" component={GbOrganiser} />
      <Route path="/gborganiser-v2" component={GbOrganiserV2} />
      <Route path="/qr-viewer/:gbId" component={GbQrViewer} />
      <Route path="/leg-view/:gbId" component={GbLegViewer} />
      <Route path="/leg-kits/:gbId/:legId" component={GbLegKits} />
      <Route path="/track/gb/:gbId/member/:memberUsername" component={TrackingPage} />
      <Route path="/track/parcel/:parcelId" component={TrackingPage} />
      <Route path="/track/:slug" component={TrackingPage} />
      <Route path="/testing/:gbId/results" component={GbTestingResults} />
      <Route path="/testing/:gbId" component={GbTestingPool} />
      <Route path="/pool/:slug/contribution/:participantId" component={GuestContribution} />
      <Route path="/testing-pools" component={PublicTestingPools} />
      <Route path="/community-testing" component={PublicTestingPools} />
      <Route path="/pool/:slug" component={TestingPool} />
      <Route path="/group-buys/:id/half-kits" component={GroupBuyHalfKits} />
      <Route path="/sage" component={SagePage} />
      <Route path="/reshipper" component={ReshipperPage} />
      <Route path="/reshipper-apply" component={ReshipperApply} />
      <Route path="/wholesale/shared/:id" component={WholesaleShared} />
      <Route path="/wholesale/shared" component={WholesaleShareEntry} />
      <Route path="/wholesale/tracking" component={WholesaleTracking} />
      <Route path="/wholesale" component={WholesaleOrder} />
      <Route path="/join-wholesale/:code" component={WholesaleInviteLanding} />
      <Route path="/sleepingpepisadmin/janoshik-receiver" component={JanoshikReceiver} />
      <Route path="/sleepingpepisadmin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

// Fires once per page load when the Mini App is opened from Telegram.
// If the user doesn't have a session yet, it silently logs them in using
// the signed initData Telegram provides — no password or action needed.
function TelegramAutoLogin() {
  const { isLoggedIn, isLoading } = useAccount();
  const { mutate: autoLogin } = useTelegramAutoLogin();
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading || isLoggedIn || attempted.current) return;

    // telegram-web-app.js is loaded synchronously in <head> so initData
    // is available immediately. If it's still empty, we're not in a Mini App.
    const tg = (window as { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: { user?: { username?: string } } } } }).Telegram?.WebApp;
    const initData = tg?.initData;
    if (!initData) return;

    attempted.current = true;
    autoLogin(initData, {
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        // No account linked — redirect to login, pre-filling the TG username
        // so the user can log in manually or sign up.
        if (msg.includes("no_account") || msg.includes("No account")) {
          const tgUsername = tg?.initDataUnsafe?.user?.username;
          const loginUrl = tgUsername
            ? `/login?tg=${encodeURIComponent(tgUsername)}`
            : "/login";
          window.location.href = loginUrl;
        }
        // For expired / invalid — silently fall through to normal login flow
      },
    });
  }, [isLoading, isLoggedIn, autoLogin]);

  return null;
}

function AccountSessionActivity() {
  const { account } = useAccount();
  const queryClient = useQueryClient();
  const hasAccountSession = !!account;

  useEffect(() => {
    if (!hasAccountSession) return;

    let lastRefreshAt: number | null = null;
    let lastAttemptAt: number | null = null;
    let inFlight = false;

    const handleActivity = () => {
      const now = performance.now();
      if (
        inFlight
        || !shouldRefreshAccountSession(lastRefreshAt, now)
        || !shouldRefreshAccountSession(lastAttemptAt, now, ACCOUNT_ACTIVITY_RETRY_INTERVAL_MS)
      ) {
        return;
      }

      lastAttemptAt = now;
      inFlight = true;
      void fetch("/api/account/session/refresh", {
        method: "POST",
        credentials: "include",
      }).then(async (response) => {
        if (response.status === 401) {
          queryClient.setQueryData(["account", "me"], null);
          await queryClient.invalidateQueries({ queryKey: ["account"] });
          return;
        }
        if (response.ok) lastRefreshAt = now;
      }).catch(() => {
        // Transient failures do not mean the user is signed out; retry on later activity.
      }).finally(() => {
        inFlight = false;
      });
    };

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("wheel", handleActivity, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("wheel", handleActivity);
    };
  }, [hasAccountSession, queryClient]);

  return null;
}

function AccountSessionRecoveryNotice() {
  const { isSessionUnavailable, retryAccountCheck } = useAccount();
  if (!isSessionUnavailable) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-4 z-[110] mx-auto flex max-w-xl items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-xl"
    >
      <span>Unable to check your account session. You have not been signed out.</span>
      <button
        type="button"
        onClick={retryAccountCheck}
        className="shrink-0 rounded-md border border-amber-700 px-3 py-1.5 font-semibold hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
      >
        Retry
      </button>
    </div>
  );
}

function SiteNotFound() {
  return <main className="min-h-screen flex items-center justify-center"><h1>404 — Not Found</h1></main>;
}

function SiteContent() {
  const [location] = useLocation();
  const surface = siteSurface(window.location.hostname, location, import.meta.env.DEV,
    (import.meta.env.VITE_VENDOR_DEV_HOSTS ?? "").split(",").filter(Boolean));
  useEffect(() => {
    document.title = surface === "vendor" ? "Peps Anonymous · Vendor portal" : "Salt & Peps";
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", surface === "vendor" ? "/brand/pepsanonymous-favicon.svg" : "/favicon.svg");
    document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.setAttribute("href", surface === "vendor" ? "/brand/pepsanonymous-apple-touch-180.png" : "/brand/salt-peps-apple-touch-180.png");
  }, [surface]);
  if (surface === "blocked") return <SiteNotFound />;
  if (surface === "vendor") return (
    <Suspense fallback={<PageLoading />}>
    <Switch>
      <Route path="/" component={VendorPortal} />
      <Route path="/vendor" component={VendorPortal} />
      <Route path="/vendor/" component={VendorPortal} />
      <Route path="/vendor/login" component={VendorLogin} />
      <Route path="/vendor/login/" component={VendorLogin} />
      <Route path="/login" component={VendorLogin} />
      <Route path="/login/" component={VendorLogin} />
      <Route component={SiteNotFound} />
    </Switch>
    </Suspense>
  );
  return <>
    <TelegramAutoLogin />
    <AccountSessionActivity />
    <AccountSessionRecoveryNotice />
    <Router />
    <DiscordLoginSetupModal />
  </>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <SiteContent />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
