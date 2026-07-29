import { AlertTriangle, ChevronRight, Search, SlidersHorizontal, Truck } from "lucide-react";
import type { Ref } from "react";
import { fmtMoney } from "./data";
import type { OrganiserOrder } from "./domain/order";
import { selectMobileOrderView, type MobileOrderView, type MobileOrdersModel } from "./orders-mobile-model";

export interface OrdersMobileWorkspaceProps {
  model: MobileOrdersModel;
  orders: readonly OrganiserOrder[];
  view: MobileOrderView;
  searchQuery: string;
  activeFilterCount: number;
  filterButtonRef?: Ref<HTMLButtonElement>;
  onViewChange: (view: MobileOrderView) => void;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  onChasePayments: () => void;
  onOpenDispatch: () => void;
  onOpenOrder: (order: OrganiserOrder) => void;
}

export default function OrdersMobileWorkspace(props: OrdersMobileWorkspaceProps) {
  const { model, orders, view, searchQuery, activeFilterCount, filterButtonRef, onViewChange, onSearchChange, onOpenFilters, onChasePayments, onOpenDispatch, onOpenOrder } = props;
  const visible = selectMobileOrderView(model, orders, view).filter(order => !searchQuery || [order.code, order.id, order.memberName, order.memberUsername].some(value => value?.toLowerCase().includes(searchQuery.toLowerCase())));
  return <div className="orders-mobile-workspace">
    <header><div><small>Order desk</small><h1>Orders</h1></div><button type="button" onClick={onOpenDispatch}><Truck aria-hidden="true" /> Dispatch</button></header>
    <section className="orders-mobile-attention"><AlertTriangle aria-hidden="true" /><div><strong>{model.summary.needsActionCount} orders need attention</strong><span>{fmtMoney(model.summary.paymentTotal, "GBP")} awaiting payment action</span></div></section>
    <div className="orders-mobile-actions"><button type="button" onClick={onChasePayments}>Chase payment</button><button type="button" onClick={onOpenDispatch}>Ready to dispatch <b>{model.summary.dispatchReadyCount}</b></button></div>
    <div className="orders-mobile-tabs" role="tablist">{([['needs-action','Needs action'],['all','All orders'],['completed','Completed']] as const).map(([id,label]) => <button type="button" role="tab" aria-selected={view === id} onClick={() => onViewChange(id)} key={id}>{label}</button>)}</div>
    {view === "all" ? <div className="orders-mobile-search"><label><Search aria-hidden="true" /><input type="search" value={searchQuery} onChange={event => onSearchChange(event.target.value)} placeholder="Search orders" /></label><button ref={filterButtonRef} type="button" onClick={onOpenFilters}><SlidersHorizontal aria-hidden="true" /> Filters {activeFilterCount || ""}</button></div> : null}
    <div className="orders-mobile-list">{visible.length ? visible.map(order => <button type="button" className="orders-mobile-card" onClick={() => onOpenOrder(order)} key={order.id}><div><small>{order.code ?? order.id}</small><strong>{order.memberName}</strong><span>@{order.memberUsername}</span></div><div><strong>{fmtMoney(order.total, "GBP")}</strong><span>{order.products.reduce((sum, product) => sum + product.quantity, 0)} items · {order.status}</span></div><ChevronRight aria-hidden="true" /></button>) : <div className="orders-mobile-empty" role="status"><strong>No orders in this view</strong><button type="button" onClick={() => onViewChange("all")}>View all orders</button></div>}</div>
  </div>;
}
