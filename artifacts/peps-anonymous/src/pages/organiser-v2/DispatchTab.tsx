import { useMemo } from "react";
import { DispatchManager, type DispatchCfg } from "@/components/AdminDispatch";

export default function DispatchTab({ selectedGbId }: { selectedGbId: string }) {
  const config = useMemo<DispatchCfg>(() => ({
    role: "organiser",
    base: "/organiser/dispatch",
    dfetch: (path, options) => fetch(`/api${path}`, {
      ...options,
      credentials: "include",
    }),
    ordersPath: query => `/organiser/dispatch/orders?${query}`,
    groupBuysPath: "/organiser/dispatch/group-buys-list",
    gbParcelsPath: groupBuyId => `/organiser/dispatch/group-buys/${encodeURIComponent(groupBuyId)}/parcels`,
    orderImagesPath: orderId => `/organiser/dispatch/orders/${encodeURIComponent(orderId)}/dispatch-images`,
    gbId: selectedGbId,
  }), [selectedGbId]);

  return <DispatchManager cfg={config} />;
}
