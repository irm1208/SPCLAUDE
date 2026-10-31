import { useCallback } from "react";
import { useLocation } from "wouter";
import VendorAccountAuth from "@/components/VendorAccountAuth";

/** Dedicated sign-in / sign-up page. The portal itself shows the same gate inline when a visitor is not authorised. */
export default function VendorLogin() {
  const [, navigate] = useLocation();
  const toPortal = useCallback(() => navigate("/vendor"), [navigate]);
  return <VendorAccountAuth onAuthenticated={toPortal} />;
}
