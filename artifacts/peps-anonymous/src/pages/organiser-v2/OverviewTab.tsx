import { useState } from "react";
import {
  ShoppingBag, TrendingUp, Users, Clock, FlaskConical,
  ArrowRight, AlertCircle, CheckCircle2, MessageSquare, Calendar,
  ChevronDown, ChevronRight, Copy, Check, Truck,
} from "lucide-react";
import { fmtMoney, type SampleGB } from "./data";
import { TILE, V2_CARD_BORDER } from "./theme";
import ActivityFeed from "./ActivityFeed";

// ─── Workspace Overview (HiveQ-style) ────────────────────────────────────────
// White stat cards with coloured icon tiles + dashed "View details" footer,
// matching the reference dashboard.

function StatCard({ icon: Icon, tile, value, label, onView }: {
  icon: typeof ShoppingBag; tile: { fg: string; bg: string }; value: string; label: string; onView?: () => void;
}) {
  return (
    <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: tile.bg }}>
          <Icon className="w-5 h-5" style={{ color: tile.fg }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl sm:text-2xl font-bold leading-none" style={{ color: "var(--t-text)" }}>{value}</div>
          <div className="text-[12.5px] sm:text-[13px] mt-1" style={{ color: "var(--t-subtle)" }}>{label}</div>
        </div>
      </div>
      {onView && (
        <button onClick={onView} className="w-full mt-3 pt-2.5 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold border-t border-dashed transition-colors hover:bg-black/[0.02]" style={{ borderColor: V2_CARD_BORDER, color: "var(--t-blue)" }}>
          View details <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function OverviewTab({ gb, onGoto, dispatchReadyCount }: { gb: SampleGB; onGoto: (tab: string) => void; dispatchReadyCount: number }) {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const orders = JSON.parse(localStorage.getItem("orders") || "[]");
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total, 0);
  const paidOrders = orders.filter((o: any) => o.status === "paid" || o.status === "processing" || o.status === "shipped" || o.status === "delivered").length;
  const unpaidOrders = orders.filter((o: any) => o.status === "pending").length;
  const closesIn = 8;
  const pendingTests = 2;
  const currency = "GBP";

  // GB join URL
  const joinCode = "SEMA2024";
  const accessCode = "PEP789";
  const joinUrl = `https://peptalk.social/gb/${joinCode}`;

  const copyJoinUrl = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shipping destinations
  const countries = orders.reduce((acc: Record<string, number>, o: any) => {
    acc[o.country] = (acc[o.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Product breakdown
  const productStats = orders.flatMap((o: any) => o.products).reduce((acc: any, p: any) => {
    if (!acc[p.name]) acc[p.name] = { name: p.name, qty: 0, revenue: 0, orders: 0 };
    acc[p.name].qty += p.quantity;
    acc[p.name].revenue += p.price * p.quantity;
    acc[p.name].orders += 1;
    return acc;
  }, {} as Record<string, { name: string; qty: number; revenue: number; orders: number }>);
  const productList = (Object.values(productStats) as { name: string; qty: number; revenue: number; orders: number }[]).sort((a, b) => b.revenue - a.revenue);

  const BarRow = ({ label, value, maxValue, color }: {
    label: string; value: number; maxValue: number; color: string;
  }) => {
    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13.5px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{label}</span>
          <span className="text-[13px] font-bold shrink-0" style={{ color }}>{value}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--t-surface2)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Activity Feed */}
      <ActivityFeed selectedGbId={gb.id} />

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={ShoppingBag} tile={TILE.blue} value={String(orders.length)} label="Total orders" onView={() => onGoto("orders")} />
        <StatCard icon={TrendingUp} tile={TILE.green} value={fmtMoney(totalRevenue, "GBP")} label="Revenue" onView={() => onGoto("pnl")} />
        <StatCard icon={Clock} tile={TILE.orange} value={`${closesIn} days`} label="Closes in" />
        <StatCard icon={FlaskConical} tile={TILE.violet} value={String(pendingTests)} label="Pending tests" onView={() => onGoto("labtests")} />
      </div>

      {dispatchReadyCount > 0 && (
        <button
          type="button"
          onClick={() => onGoto("dispatch")}
          className="w-full rounded-xl bg-white p-4 text-left transition-colors hover:bg-black/[0.01] sm:p-5"
          style={{ border: "1px solid rgba(30,122,92,.22)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
              <Truck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>
                {dispatchReadyCount} order{dispatchReadyCount === 1 ? " is" : "s are"} ready to dispatch
              </p>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--t-subtle)" }}>
                Selected delivered parcels can fulfil these orders.
              </p>
            </div>
            <span className="hidden text-[12px] font-semibold sm:block" style={{ color: "var(--t-blue)" }}>Review dispatch →</span>
          </div>
        </button>
      )}

      {/* GB join code */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Group buy access</h3>
        <div className="space-y-3">
          {/* Join link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1">
              <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>Join link</div>
              <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Share this link for members to find your group buy</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-lg font-mono text-[13px] sm:text-[14px] bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}>
                <span className="hidden sm:inline">{joinUrl}</span>
                <span className="sm:hidden">{joinCode}</span>
              </div>
              <button
                onClick={copyJoinUrl}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors shrink-0"
                style={{ background: copied ? "#ECFDF3" : "var(--t-blue)", color: copied ? "#027A48" : "#fff", border: copied ? "1px solid #D1FADF" : "none" }}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Access code */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
            <div className="flex-1">
              <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>Access code</div>
              <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Required for members to join (if access control is enabled)</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-lg font-mono text-[15px] font-bold bg-white tracking-wider" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}>
                {accessCode}
              </div>
              <button
                onClick={copyAccessCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors shrink-0"
                style={{ background: copied ? "#ECFDF3" : "var(--t-blue)", color: copied ? "#027A48" : "#fff", border: copied ? "1px solid #D1FADF" : "none" }}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts + messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Payment status card */}
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Payment status</h3>
            <button onClick={() => onGoto("orders")} className="text-[12px] font-semibold" style={{ color: "var(--t-blue)" }}>View all</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: "#ECFDF3", border: "1px solid #D1FADF" }}>
              <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#027A48" }}>Paid</div>
              <div className="text-[28px] font-bold leading-none" style={{ color: "#027A48" }}>{paidOrders}</div>
              <div className="text-[12px] mt-1" style={{ color: "#027A48" }}>
                {orders.length > 0 ? `${Math.round((paidOrders / orders.length) * 100)}% of orders` : "No orders yet"}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#FEF3F2", border: "1px solid #FEE4E2" }}>
              <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#B42318" }}>Unpaid</div>
              <div className="text-[28px] font-bold leading-none" style={{ color: "#B42318" }}>{unpaidOrders}</div>
              <div className="text-[12px] mt-1" style={{ color: "#B42318" }}>
                {orders.length > 0 ? `${Math.round((unpaidOrders / orders.length) * 100)}% of orders` : "No orders yet"}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Alerts</h3>
            <span className="text-[13px] px-2.5 py-1 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>3</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex gap-3 p-3 rounded-lg" style={{ background: "#FEF3F2", border: "1px solid #FEE4E2" }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F04438" }} />
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: "#B42318" }}>Payment issue</div>
                <div className="text-[12px] mt-0.5" style={{ color: "#B42318" }}>ORD-004 payment declined. Follow up with member.</div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg" style={{ background: "#FFFAEB", border: "1px solid #FEF0C7" }}>
              <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F79009" }} />
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: "#B54708" }}>Closing soon</div>
                <div className="text-[12px] mt-0.5" style={{ color: "#B54708" }}>GB closes in 8 days. Prepare final order summary.</div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg" style={{ background: "#ECFDF3", border: "1px solid #D1FADF" }}>
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#12B76A" }} />
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: "#027A48" }}>Lab results in</div>
                <div className="text-[12px] mt-0.5" style={{ color: "#027A48" }}>Semaglutide batch #5432 passed QSC testing.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent messages */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Recent messages</h3>
          <button onClick={() => onGoto("tickets")} className="text-[12px] font-semibold" style={{ color: "var(--t-blue)" }}>View all</button>
        </div>
        <div className="space-y-3">
          {[
            { user: "@alice_m", msg: "When will my order ship?", time: "2 min ago" },
            { user: "@bob_k", msg: "Can I add another vial to my order?", time: "15 min ago" },
            { user: "@carol_s", msg: "Payment submitted, awaiting confirmation", time: "1 hr ago" },
          ].map((m, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                {m.user.charAt(1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{m.user}</span>
                  <span className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{m.time}</span>
                </div>
                <div className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--t-muted)" }}>{m.msg}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping destinations */}
      {orders.length > 0 && Object.keys(countries).length > 0 && (
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-4" style={{ color: "var(--t-text)" }}>Shipping destinations</h3>
          <div className="space-y-3">
            {Object.entries(countries).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([country, count]) => (
              <BarRow key={country} label={country} value={count as number} maxValue={Math.max(...Object.values(countries) as number[])} color="#CA5010" />
            ))}
          </div>
        </div>
      )}

      {/* Product breakdown */}
      {productList.length > 0 && (
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Product breakdown</h3>
            <span className="text-[13px] px-2.5 py-1 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>
              {productList.length} product{productList.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {productList.slice(0, 5).map(p => {
              const isExpanded = expandedProduct === p.name;
              return (
                <div key={p.name} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                  <button
                    onClick={() => setExpandedProduct(isExpanded ? null : p.name)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/[0.02] transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{p.name}</div>
                      <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
                        {p.qty} unit{p.qty !== 1 ? "s" : ""} · {p.orders} order{p.orders !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>{fmtMoney(p.revenue, currency)}</div>
                      <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{Math.round((p.revenue / totalRevenue) * 100)}% of revenue</div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-2" style={{ background: "var(--t-surface2)" }}>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Units sold</div>
                          <div className="text-[16px] font-bold mt-0.5" style={{ color: "var(--t-text)" }}>{p.qty}</div>
                        </div>
                        <div>
                          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Avg per order</div>
                          <div className="text-[16px] font-bold mt-0.5" style={{ color: "var(--t-text)" }}>{(p.qty / p.orders).toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Revenue</div>
                          <div className="text-[16px] font-bold mt-0.5" style={{ color: "var(--t-text)" }}>{fmtMoney(p.revenue, currency)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {productList.length > 5 && (
              <div className="text-center pt-2">
                <span className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
                  +{productList.length - 5} more product{productList.length - 5 !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Quick actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { id: "orders", label: "Manage orders" },
            { id: "broadcast", label: "Message members" },
            { id: "dispatch", label: "Dispatch & slips" },
            { id: "parcels", label: "Track parcels" },
            { id: "pnl", label: "View P&L" },
            { id: "todos", label: "Task list" },
          ].map(a => (
            <button key={a.id} onClick={() => onGoto(a.id)}
              className="rounded-lg px-3.5 py-3 text-left text-[14px] font-semibold transition-colors flex items-center justify-between"
              style={{ background: V2_CANVAS_TILE, border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}>
              {a.label}
              <ArrowRight className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const V2_CANVAS_TILE = "#FAFBFB";
