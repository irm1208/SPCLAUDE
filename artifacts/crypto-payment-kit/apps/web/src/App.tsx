import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import DemoStorefront from "./pages/DemoStorefront";
import CheckoutPage from "./pages/CheckoutPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold font-mono">404 - Not Found</h1>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        {import.meta.env.DEV && <Route path="/" component={DemoStorefront} />}
        <Route path="/checkout/:publicId" component={CheckoutPage} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  );
}
