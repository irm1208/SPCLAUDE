import { DashboardHome } from "@/components/DashboardHome";

const orders = Array.from({ length: 7 }).map((_, i) => ({
  id: `o${i}`,
  code: `SP-10${i}`,
  status: ["confirmed", "shipped", "pending", "delivered", "confirmed", "shipped", "pending"][i],
  grandTotal: 120 + i * 37,
  currency: "USD",
  createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  deliveryMethod: i % 2 ? "vendor" : "reshipper",
  lineItems: [
    { productName: ["Retatrutide", "Tirzepatide", "BPC-157", "Semaglutide", "TB-500"][i % 5], quantity: 1 + (i % 3) },
    { productName: "Bac Water", quantity: 2 },
  ],
}));

const activeCompounds = [
  { id: "c1", compoundName: "Retatrutide", compoundType: "GLP-1", doseAmount: "4", doseUnit: "mg", frequency: "Weekly", route: "SubQ", startDate: new Date(Date.now() - 40 * 86400000).toISOString(), endDate: null },
  { id: "c2", compoundName: "BPC-157", compoundType: "Peptide", doseAmount: "500", doseUnit: "mcg", frequency: "Daily", route: "SubQ", startDate: new Date(Date.now() - 20 * 86400000).toISOString(), endDate: null },
  { id: "c3", compoundName: "TB-500", compoundType: "Peptide", doseAmount: "5", doseUnit: "mg", frequency: "Weekly", route: "SubQ", startDate: new Date(Date.now() - 12 * 86400000).toISOString(), endDate: null },
  { id: "c4", compoundName: "Tesamorelin", compoundType: "Peptide", doseAmount: "2", doseUnit: "mg", frequency: "Daily", route: "SubQ", startDate: new Date(Date.now() - 5 * 86400000).toISOString(), endDate: null },
];

const groupBuys = [
  { id: "g1", name: "Retatrutide Bulk Buy", status: "active", closeDate: new Date(Date.now() + 6 * 86400000).toISOString(), organiserId: "org1", productCount: 8 },
  { id: "g2", name: "GLP-1 Winter Round", status: "active", closeDate: new Date(Date.now() + 12 * 86400000).toISOString(), organiserId: "org1", productCount: 5 },
];

const glp1Logs = Array.from({ length: 18 }).map((_, i) => ({ loggedDate: new Date(Date.now() - i * 86400000 * 2).toISOString() }));

export default function DashPreview() {
  return (
    <DashboardHome
      username="peppy"
      credits={42.5}
      orders={orders}
      activeCompounds={activeCompounds}
      bloodTestCount={24}
      glp1Logs={glp1Logs}
      groupBuys={groupBuys}
      onSection={() => {}}
      onLogout={() => {}}
      viewerAccess={[
        { id: "v1", name: "Retatrutide Bulk Buy", hasQrAccess: true, hasLegAccess: true },
        { id: "v2", name: "GLP-1 Winter Round", hasQrAccess: false, hasLegAccess: true },
      ]}
      isOrganiser
      organiserGb={{ active: 3, draft: 1, total: 5 }}
    />
  );
}
