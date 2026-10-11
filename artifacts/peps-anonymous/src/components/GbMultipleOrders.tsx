import { isMultipleGbOrder, type MultipleGbOrder } from "@/lib/gb-multiple-orders";
import "./gb-multiple-orders.css";

export function GbMultipleOrderBadge({ order }: { order: MultipleGbOrder }) {
  return <>
    {isMultipleGbOrder(order) && <span className="gb-multiple-order-badge" title="This account has multiple separate active orders in the same group buy. Review them before processing.">
      Multiple orders · {order.multipleGbOrderCount}
    </span>}
    {order.additionOfOrderId && <span className="gb-addon-order-badge" title="Linked addition to an existing order; not counted as a separate duplicate candidate.">Add-on order</span>}
  </>;
}

export function GbMultipleOrderNotice({ people, checked, onChange, scope = "this group buy" }: {
  people: number; checked: boolean; onChange: (value: boolean) => void; scope?: string;
}) {
  return <div className="gb-multiple-order-notice">
    {people > 0 && <div role="status"><strong>{people} {people === 1 ? "person has" : "people have"} multiple separate orders {scope === "this group buy" ? "in" : "across"} {scope}.</strong>
      <small>Review highlighted orders before processing. Add-ons and cancelled orders are not counted; totals are unchanged.</small></div>}
    <label><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /> Show multiple orders only</label>
  </div>;
}
