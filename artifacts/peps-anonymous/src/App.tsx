import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import React, { useEffect } from "react";

// Pages
import Home from "@/pages/Home";
import Lookup from "@/pages/Lookup";
import OrderForm from "@/pages/OrderForm";
import Review from "@/pages/Review";
import Success from "@/pages/Success";
import Admin from "@/pages/Admin";
import ProtoypeAdmin from "@/pages/ProtoypeAdmin";
import JanoshikReceiver from "@/pages/JanoshikReceiver";
import PrototypeHome from "@/pages/PrototypeHome";
import PrototypeTestingPools from "@/pages/PrototypeTestingPools";
import PrototypeProtocols from "@/pages/PrototypeProtocols";
import PrototypeLearn from "@/pages/PrototypeLearn";
import PrototypeLabTests from "@/pages/PrototypeLabTests";
import PrototypeCalculator from "@/pages/PrototypeCalculator";
import PrototypeSupplements from "@/pages/PrototypeSupplements";
import Protocols, { MedProtocolsRedirect, TrtAasRedirect } from "@/pages/Protocols";
import PeptideDetail from "@/pages/PeptideDetail";
import Calculator from "@/pages/Calculator";
import LabTests from "@/pages/LabTests";
import Packages from "@/pages/Packages";
import Shop from "@/pages/Shop";
import ShopCheckout from "@/pages/ShopCheckout";
import SellerDashboard from "@/pages/SellerDashboard";
import CustomerPortal from "@/pages/CustomerPortal";
import AccountOrderDetail from "@/pages/AccountOrderDetail";
import Login from "@/pages/Login";
import AccountOrders from "@/pages/AccountOrders";
import BloodTests from "@/pages/BloodTests";
import Compounds from "@/pages/Compounds";
import Members from "@/pages/Members";
import MedDetail from "@/pages/MedDetail";
import Learn from "@/pages/Learn";
import LearnCourse from "@/pages/LearnCourse";
import LearnLesson from "@/pages/LearnLesson";
import NotFound from "@/pages/not-found";
import Feedback from "@/pages/Feedback";
import GbOrganiser from "@/pages/GbOrganiser";
import GbQrViewer from "@/pages/GbQrViewer";
import GbLegViewer from "@/pages/GbLegViewer";
import GbLegKits from "@/pages/GbLegKits";
import TrackingPage from "@/pages/TrackingPage";
import GbTestingPool from "@/pages/GbTestingPool";
import GbTestingResults from "@/pages/GbTestingResults";
import TestingPool from "@/pages/TestingPool";
import GuestContribution from "@/pages/GuestContribution";
import ReshipperPage from "@/pages/Reshipper";
import ReshipperApply from "@/pages/ReshipperApply";
import WholesaleOrder from "@/pages/WholesaleOrder";
import WholesaleShared from "@/pages/WholesaleShared";
import PublicTestingPools from "@/pages/PublicTestingPools";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lookup" component={Lookup} />
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
      <Route path="/groups">{() => { useEffect(() => { window.location.replace("/account?s=groups"); }, []); return null; }}</Route>
      <Route path="/my-orders" component={AccountOrders} />
      <Route path="/blood-tests" component={BloodTests} />
      <Route path="/compounds" component={Compounds} />
      <Route path="/members" component={Members} />
      <Route path="/medications" component={MedProtocolsRedirect} />
      <Route path="/medications/:slug" component={MedDetail} />
      <Route path="/trt-aas" component={TrtAasRedirect} />
      <Route path="/learn" component={Learn} />
      <Route path="/learn/:courseSlug" component={LearnCourse} />
      <Route path="/learn/:courseSlug/:lessonSlug" component={LearnLesson} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/gborganiser" component={GbOrganiser} />
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
      <Route path="/reshipper" component={ReshipperPage} />
      <Route path="/reshipper-apply" component={ReshipperApply} />
      <Route path="/wholesale/shared/:id" component={WholesaleShared} />
      <Route path="/wholesale" component={WholesaleOrder} />
      <Route path="/sleepingpepisadmin/janoshik-receiver" component={JanoshikReceiver} />
      <Route path="/sleepingpepisadmin" component={Admin} />
      <Route path="/prototypeadmin" component={ProtoypeAdmin} />
      <Route path="/prototypehome" component={PrototypeHome} />
      <Route path="/prototypetestingpools" component={PrototypeTestingPools} />
      <Route path="/prototypeprotocols" component={PrototypeProtocols} />
      <Route path="/prototypelearn" component={PrototypeLearn} />
      <Route path="/prototypetests" component={PrototypeLabTests} />
      <Route path="/prototypecalculator" component={PrototypeCalculator} />
      <Route path="/prototypesupplements" component={PrototypeSupplements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
