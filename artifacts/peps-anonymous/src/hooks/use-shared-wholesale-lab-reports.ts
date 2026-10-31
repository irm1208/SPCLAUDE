import { useEffect, useState } from "react";
import {
  loadSharedWholesaleLabReports,
  type SharedLabProduct,
  type SharedProductLabReport,
} from "@/lib/shared-wholesale-lab-reports";

export function useSharedWholesaleLabReports(products: SharedLabProduct[]) {
  const [result, setResult] = useState<{
    products: SharedLabProduct[];
    reports: Record<string, SharedProductLabReport>;
  } | null>(null);

  useEffect(() => {
    if (products.length === 0) return;
    let cancelled = false;
    loadSharedWholesaleLabReports(products).then(reports => {
      if (!cancelled) setResult({ products, reports });
    });
    return () => { cancelled = true; };
  }, [products]);

  // Hide old badges/popups immediately, including while a new catalogue is loading.
  return result?.products === products ? result.reports : {};
}
