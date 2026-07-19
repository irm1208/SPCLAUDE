import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronRight, Mail, PackageCheck, WalletCards } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fmtMoney } from "./data";
import {
  AtlasDataTable,
  AtlasDrawerSection,
  AtlasEmptyState,
  AtlasFilterBar,
  AtlasMetricSurface,
  AtlasPageHeader,
  AtlasPerson,
  AtlasQuickViewDrawer,
  AtlasStatusBadge,
  type AtlasColumn,
} from "./AtlasUi";
import { useOrders } from "./domain/repository-context";
import { mergeMemberDirectory, type OrganiserMember } from "./domain/member";
import type { OrganiserOrder } from "./domain/order";
import { organiserApi } from "./api/organiser-api";

type SortKey = "name" | "orders" | "totalSpent" | "lastOrderAt";

const statusTone = (member: OrganiserMember) => member.attention ? "warning" as const : member.fulfilmentCount === member.orderCount ? "success" as const : "info" as const;

function formatDate(value: string | null) {
  if (!value) return "No orders yet";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function MembersTab({
  selectedGbId,
  onOpenOrders,
  highlightId,
}: {
  selectedGbId?: string;
  highlightId?: string;
  onOpenOrders?: () => void;
}) {
  const orders = useOrders();
  const membersQuery = useQuery({
    queryKey: ["organiser", "members", selectedGbId],
    queryFn: () => organiserApi.members(selectedGbId!),
    enabled: Boolean(selectedGbId),
    staleTime: 30_000,
  });
  const members = useMemo(() => mergeMemberDirectory(orders, membersQuery.data ?? []), [membersQuery.data, orders]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastOrderAt");
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedMember, setSelectedMember] = useState<OrganiserMember | null>(null);

  const countries = useMemo(() => [...new Set(members.map(member => member.country))].sort(), [members]);
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members
      .filter(member => country === "all" || member.country === country)
      .filter(member => !query || [member.name, member.username, member.country].some(value => value.toLowerCase().includes(query)))
      .sort((left, right) => {
        const leftValue = sortKey === "name" ? left.name.toLowerCase() : sortKey === "lastOrderAt" ? left.lastOrderAt ?? "" : sortKey === "orders" ? left.orderCount : left.totalSpent;
        const rightValue = sortKey === "name" ? right.name.toLowerCase() : sortKey === "lastOrderAt" ? right.lastOrderAt ?? "" : sortKey === "orders" ? right.orderCount : right.totalSpent;
        const comparison = typeof leftValue === "string" ? leftValue.localeCompare(rightValue as string) : Number(leftValue) - Number(rightValue);
        return sortDescending ? -comparison : comparison;
      });
  }, [country, members, search, sortDescending, sortKey]);

  useEffect(() => {
    if (!highlightId) return;
    const member = members.find(item => item.id === highlightId || item.username === highlightId);
    if (member) setSelectedMember(member);
  }, [highlightId, members]);

  const selectedOrders = useMemo<OrganiserOrder[]>(() => {
    if (!selectedMember) return [];
    const ids = new Set(selectedMember.orderIds);
    return orders.filter(order => ids.has(order.id)).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [orders, selectedMember]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDescending(value => !value);
    else {
      setSortKey(key);
      setSortDescending(key !== "name");
    }
  };

  const columns: AtlasColumn<OrganiserMember>[] = [
    {
      id: "member",
      label: "Member",
      width: "28%",
      render: member => <AtlasPerson name={member.name} username={member.username} />,
    },
    { id: "country", label: "Country", width: "14%", render: member => <span className="atlas-muted-cell">{member.country}</span> },
    {
      id: "orders",
      label: "Orders",
      width: "12%",
      render: member => <button type="button" className="atlas-sort-cell" onClick={event => { event.stopPropagation(); toggleSort("orders"); }}><strong>{member.orderCount}</strong><ArrowUpDown aria-hidden="true" /></button>,
    },
    { id: "spent", label: "Total spent", width: "16%", align: "right", render: member => <strong>{fmtMoney(member.totalSpent, "GBP")}</strong> },
    { id: "paid", label: "Payments", width: "14%", render: member => <AtlasStatusBadge tone={member.pendingCount ? "warning" : "success"}>{member.pendingCount ? `${member.pendingCount} pending` : `${member.paidCount} confirmed`}</AtlasStatusBadge> },
    { id: "last", label: "Last order", width: "16%", align: "right", render: member => <span className="atlas-muted-cell">{formatDate(member.lastOrderAt)}</span> },
    { id: "open", label: "", width: "36px", align: "right", render: () => <ChevronRight aria-hidden="true" className="atlas-row-chevron" /> },
  ];

  return (
    <div className="atlas-page-content atlas-members-page approved-member-hub" data-page="members">
      <AtlasPageHeader
        eyebrow="Directory"
        title="Members"
        description="A single view of participation, payment progress, and fulfilment for every group-buy member."
        status={<AtlasStatusBadge tone="success">Live directory</AtlasStatusBadge>}
        actions={<button type="button" className="atlas-primary-button"><Mail aria-hidden="true" /> Message members</button>}
      />

      {membersQuery.isLoading ? <div className="ov2-data-notice" role="status">Syncing the live member directory…</div> : null}
      {membersQuery.isError ? <div className="ov2-data-notice" data-tone="error" role="alert"><span>{membersQuery.error instanceof Error ? membersQuery.error.message : "Members could not be loaded."}</span><button type="button" onClick={() => membersQuery.refetch()}>Retry</button></div> : null}

      <section className="atlas-metric-grid" aria-label="Member summary">
        <AtlasMetricSurface label="Members" value={members.length} detail="Unique participants" />
        <AtlasMetricSurface label="Orders" value={orders.length} detail="Across this group buy" icon={PackageCheck} />
        <AtlasMetricSurface label="Collected" value={fmtMoney(members.reduce((total, member) => total + member.totalSpent, 0), "GBP")} detail="Order value to date" icon={WalletCards} tone="primary" />
        <AtlasMetricSurface label="Needs attention" value={members.filter(member => member.attention).length} detail="Payment or fulfilment follow-up" tone="dark" />
      </section>

      <section className="atlas-card atlas-directory-card" aria-labelledby="member-directory-title">
        <div className="atlas-card-heading">
          <div><span className="atlas-eyebrow">Group-buy directory</span><h2 id="member-directory-title">All members</h2></div>
          <span className="atlas-result-count">{filteredMembers.length} of {members.length}</span>
        </div>
        <AtlasFilterBar search={search} onSearch={setSearch} placeholder="Search name, username, or country" trailing={(
          <label className="atlas-select-control"><span>Country</span><select value={country} onChange={event => setCountry(event.target.value)}><option value="all">All countries</option>{countries.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        )}>
          <button type="button" className="atlas-filter-button" onClick={() => toggleSort("name")}><ArrowUpDown aria-hidden="true" /> Sort by {sortKey === "name" ? "name" : sortKey === "orders" ? "orders" : "recent"}</button>
        </AtlasFilterBar>
        <AtlasDataTable
          label="Group-buy members"
          rows={filteredMembers}
          columns={columns}
          rowKey={member => member.id}
          onRowClick={member => setSelectedMember(member)}
          empty={<AtlasEmptyState title="No members found" description="Try a different search or country filter." />}
        />
      </section>

      <AtlasQuickViewDrawer
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        eyebrow="Member quick view"
        title={selectedMember?.name ?? "Member"}
        subtitle={selectedMember ? <AtlasPerson name={selectedMember.name} username={selectedMember.username} compact /> : undefined}
        footer={<div className="atlas-drawer-actions"><button type="button" className="atlas-secondary-button" onClick={onOpenOrders}><PackageCheck aria-hidden="true" /> View orders</button><button type="button" className="atlas-primary-button"><Mail aria-hidden="true" /> Message member</button></div>}
      >
        {selectedMember ? (
          <>
            <div className="atlas-drawer-summary"><AtlasStatusBadge tone={statusTone(selectedMember)}>{selectedMember.attention ? "Needs attention" : "In good standing"}</AtlasStatusBadge><strong>{fmtMoney(selectedMember.totalSpent, "GBP")}</strong><span>total order value</span></div>
            <AtlasDrawerSection title="Participation"><dl className="atlas-detail-list"><div><dt>Orders</dt><dd>{selectedMember.orderCount}</dd></div><div><dt>Products</dt><dd>{selectedMember.productCount}</dd></div><div><dt>Country</dt><dd>{selectedMember.country}</dd></div><div><dt>Last order</dt><dd>{formatDate(selectedMember.lastOrderAt)}</dd></div></dl></AtlasDrawerSection>
            <AtlasDrawerSection title="Order history"><div className="atlas-order-history">{selectedOrders.map(order => <article key={order.id}><div><strong>{order.id}</strong><small>{formatDate(order.createdAt)} · {order.products.map(product => `${product.name} × ${product.quantity}`).join(", ") || "No products"}</small></div><div><AtlasStatusBadge tone={order.status === "pending" ? "warning" : order.status === "cancelled" ? "danger" : "success"}>{order.status}</AtlasStatusBadge><strong>{fmtMoney(order.total, "GBP")}</strong></div></article>)}</div></AtlasDrawerSection>
          </>
        ) : null}
      </AtlasQuickViewDrawer>
    </div>
  );
}
