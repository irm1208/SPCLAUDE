import './_group.css';
import { ThemeProvider } from './_theme-context';
import { DashboardHome } from './_DashboardHome';
import type { DashOrder, DashCompound, DashGroupBuy } from './_DashboardShell';

// ─── Mock data (British peptide-shop, logged-in member) ──────────────────────

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const daysAgo = (n: number) => iso(-n * 86_400_000);
const daysAhead = (n: number) => iso(n * 86_400_000);

const MOCK_ORDERS: DashOrder[] = [
  {
    id: "o1", code: "SP-10488", status: "Shipped", grandTotal: 148.0, currency: "GBP",
    createdAt: daysAgo(1), deliveryMethod: "Royal Mail 24",
    lineItems: [
      { productName: "Tirzepatide 10mg", quantity: 2 },
      { productName: "Bacteriostatic Water 10ml", quantity: 1 },
    ],
  },
  {
    id: "o2", code: "SP-10471", status: "Submitted", grandTotal: 176.0, currency: "GBP",
    createdAt: daysAgo(3), deliveryMethod: "Royal Mail 48",
    lineItems: [
      { productName: "CJC-1295 / Ipamorelin 10mg", quantity: 2 },
      { productName: "Insulin Syringes 1ml", quantity: 1 },
    ],
  },
  {
    id: "o3", code: "SP-10455", status: "Processing", grandTotal: 89.5, currency: "GBP",
    createdAt: daysAgo(6), deliveryMethod: "DPD Next Day",
    lineItems: [{ productName: "BPC-157 5mg", quantity: 3 }],
  },
  {
    id: "o4", code: "SP-10420", status: "Completed", grandTotal: 212.0, currency: "GBP",
    createdAt: daysAgo(11), deliveryMethod: "Royal Mail Tracked",
    lineItems: [
      { productName: "Retatrutide 12mg", quantity: 1 },
      { productName: "TB-500 5mg", quantity: 2 },
    ],
  },
  {
    id: "o5", code: "SP-10388", status: "Completed", grandTotal: 64.0, currency: "GBP",
    createdAt: daysAgo(16), deliveryMethod: "Collection",
    lineItems: [{ productName: "Semaglutide 5mg", quantity: 1 }],
  },
  {
    id: "o6", code: "SP-10352", status: "Cancelled", grandTotal: 45.0, currency: "GBP",
    createdAt: daysAgo(22), deliveryMethod: "DPD",
    lineItems: [{ productName: "MK-677 25mg", quantity: 1 }],
  },
];

const MOCK_COMPOUNDS: DashCompound[] = [
  {
    id: "c1", compoundName: "Tirzepatide", compoundType: "Peptide",
    doseAmount: "5", doseUnit: "mg", frequency: "Once weekly", route: "Subcutaneous",
    startDate: daysAgo(42), endDate: null,
  },
  {
    id: "c2", compoundName: "Testosterone Enanthate", compoundType: "TRT",
    doseAmount: "125", doseUnit: "mg", frequency: "Twice weekly", route: "IM",
    startDate: daysAgo(68), endDate: null,
  },
  {
    id: "c3", compoundName: "BPC-157", compoundType: "Peptide",
    doseAmount: "250", doseUnit: "mcg", frequency: "Daily", route: "Subcutaneous",
    startDate: daysAgo(21), endDate: null,
  },
  {
    id: "c4", compoundName: "Retatrutide", compoundType: "Peptide",
    doseAmount: "4", doseUnit: "mg", frequency: "Once weekly", route: "Subcutaneous",
    startDate: daysAgo(9), endDate: null,
  },
];

const MOCK_GROUP_BUYS: DashGroupBuy[] = [
  { id: "g1", name: "Tirzepatide Bulk — March Round", status: "active", closeDate: daysAhead(5), organiserId: "u_self", productCount: 4 },
  { id: "g2", name: "Retatrutide Collective", status: "active", closeDate: daysAhead(12), organiserId: null, productCount: 2 },
  { id: "g3", name: "TB-500 Recovery Pool", status: "active", closeDate: daysAhead(3), organiserId: null, productCount: 1 },
  { id: "g4", name: "BPC-157 Winter Group", status: "closed", closeDate: daysAgo(8), organiserId: null, productCount: 3 },
];

const MOCK_GLP1_LOGS = Array.from({ length: 14 }, (_, i) => ({ loggedDate: daysAgo(i + 1) }));

const MOCK_VIEWER_ACCESS = [
  { id: "v1", name: "Northern GB Collective", hasQrAccess: true, hasLegAccess: true },
];

const noop = () => {};

export function Current() {
  return (
    <div className="min-h-screen">
      <ThemeProvider>
        <DashboardHome
          username="ironwolf_88"
          credits={42.5}
          orders={MOCK_ORDERS}
          activeCompounds={MOCK_COMPOUNDS}
          bloodTestCount={3}
          glp1Logs={MOCK_GLP1_LOGS}
          groupBuys={MOCK_GROUP_BUYS}
          onSection={noop}
          onLogout={noop}
          viewerAccess={MOCK_VIEWER_ACCESS}
          isOrganiser
          organiserGb={{ active: 2, draft: 1, total: 5 }}
        />
      </ThemeProvider>
    </div>
  );
}
