import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider, Spinner } from "@/components/ui";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Explore from "@/pages/Explore";
import PoolPage from "@/pages/PoolPage";
import Vendors from "@/pages/Vendors";
import VendorPage from "@/pages/VendorPage";
import { Login, Signup, ForgotPassword, ResetPassword, VerifyEmail } from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import PoolEditor from "@/pages/PoolEditor";
import ManagePool from "@/pages/ManagePool";
import Settings from "@/pages/Settings";
import HowItWorks from "@/pages/HowItWorks";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } } });

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  return <>{children}</>;
}

function Routes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/explore" component={Explore} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/p/:slug">{params => <PoolPage slug={params.slug} />}</Route>
        <Route path="/vendors" component={Vendors} />
        <Route path="/v/:slug">{params => <VendorPage slug={params.slug} />}</Route>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/dashboard"><Private><Dashboard /></Private></Route>
        <Route path="/host/new"><Private><PoolEditor /></Private></Route>
        <Route path="/host/:id/edit">{params => <Private><PoolEditor id={params.id} /></Private>}</Route>
        <Route path="/host/:id">{params => <Private><ManagePool id={params.id} /></Private>}</Route>
        <Route path="/settings"><Private><Settings /></Private></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
