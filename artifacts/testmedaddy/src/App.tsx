import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider, Spinner } from "@/components/ui";
import { Layout } from "@/components/Layout";
import { Login, Signup } from "@/pages/Auth";
import { Landing, Explore, PoolDetail, Dashboard, PoolEditor, Settings, Unavailable, HowItWorks } from "@/core/CoreScreens";

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
        <Route path="/p/:slug">{params => <PoolDetail slug={params.slug} />}</Route>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/dashboard"><Private><Dashboard /></Private></Route>
        <Route path="/host/new"><Private><PoolEditor /></Private></Route>
        <Route path="/host/:id/edit">{params => <Private><PoolEditor id={params.id} /></Private>}</Route>
        <Route path="/host/:id">{params => <Private><PoolDetail manageId={params.id} /></Private>}</Route>
        <Route path="/settings"><Private><Settings /></Private></Route>
        <Route path="/forgot-password" component={Unavailable} />
        <Route path="/reset-password" component={Unavailable} />
        <Route path="/verify-email" component={Unavailable} />
        <Route path="/vendors" component={Unavailable} />
        <Route path="/v/:slug" component={Unavailable} />
        <Route component={Unavailable} />
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
