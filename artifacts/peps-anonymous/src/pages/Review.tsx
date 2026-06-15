import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Loader2, CheckCircle, ArrowLeft, TriangleAlert,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useDraftStore } from "@/hooks/use-draft-store";
import { useCreateOrder, useUpdateOrder } from "@workspace/api-client-react";
import { useMyGroupBuys, useAccount } from "@/hooks/use-account";
import { RulesetModal } from "@/components/RulesetModal";
import { useState, useEffect } from "react";

export default function Review() {
  const [, setLocation] = useLocation();
  const draft = useDraftStore();
  const [error, setError] = useState("");
  const [retried, setRetried] = useState(false);
  const [globalVendorShippingWarning, setGlobalVendorShippingWarning] = useState<boolean | null>(null);
  const [showRulesetModal, setShowRulesetModal] = useState(false);
  const { account } = useAccount();

  const isNewOrder = !draft.orderId;
  const { isTopUp } = draft;

  const { data: myGroupBuys } = useMyGroupBuys();
  const activeGb = draft.groupBuyId ? myGroupBuys?.find(g => g.id === draft.groupBuyId) : null;
  const gbCurrency = activeGb?.currency ?? null;
  const hideOrderFormPrices = (activeGb?.status === "closed") && (activeGb?.hidePricesOnOrderForm ?? false);
  const formatPrice = (amount: number) => {
    const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "A$" };
    const sym = (gbCurrency && symbols[gbCurrency]) ? symbols[gbCurrency] : "$";
    return `${sym}${amount.toFixed(2)}`;
  };

  const isWholesale = draft.orderType === "wholesale";
  const vendorShippingEnabled = isWholesale ? true : (activeGb ? activeGb.vendorShippingEnabled : (globalVendorShippingWarning ?? false));
  const vendorShippingMessage = activeGb?.vendorShippingMessage ?? null;
  // For existing orders, use the value stored on the order (draft.vendorShipping) rather than
  // the current GB setting. This prevents a later admin-set GB amount from inflating the displayed
  // price when a customer edits an order that was originally submitted with TBD vendor shipping.
  // New orders always use the current GB amount so pricing is up to date.
  const vendorShippingAmount = isWholesale
    ? draft.vendorShipping
    : isNewOrder
      ? (activeGb?.vendorShippingAmount ?? null)          // new: current GB amount
      : draft.vendorShipping > 0
        ? draft.vendorShipping                             // existing, known stored amount
        : null;                                            // existing, TBD → show TBD if enabled
  const adminFeeAmount = draft.directShippingRequested
    ? 0
    : isNewOrder
      ? ((activeGb?.adminFeeEnabled && activeGb?.adminFeeAmount != null) ? activeGb.adminFeeAmount : 0)
      : (draft.adminFee ?? 0);
  const adminFeeLabel = isNewOrder
    ? (activeGb?.adminFeeLabel ?? null)
    : (draft.adminFeeLabel ?? null);
  const vendorShippingIsKnown = isWholesale ? true : (vendorShippingEnabled && vendorShippingAmount != null);
  const vendorShippingIsTbd = isWholesale ? false : (vendorShippingEnabled && vendorShippingAmount == null);
  const paymentMessageEnabled = activeGb ? activeGb.paymentMessageEnabled : false;
  const paymentMessageText = activeGb?.paymentMessage ?? null;

  useEffect(() => {
    if (draft.groupBuyId) return;
    fetch("/api/config")
      .then(r => r.json())
      .then(d => setGlobalVendorShippingWarning(d.vendorShippingWarning !== false))
      .catch(() => setGlobalVendorShippingWarning(true));
  }, [draft.groupBuyId]);

  const { mutate: createOrder, isPending: isCreating } = useCreateOrder();
  const { mutate: updateOrder, isPending: isUpdating } = useUpdateOrder();

  // Credits opt-in state
  const [useCredits, setUseCredits] = useState(true);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponMsg, setCouponMsg] = useState("");

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponApplying(true); setCouponMsg("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, orderTotal: productSubtotal + (isTopUp ? 0 : draft.deliveryPrice) + (vendorShippingIsKnown ? vendorShippingAmount! : 0) + draft.tip + draft.testingContribution }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCouponCode(code);
        setCouponDiscount(data.discountAmount ?? 0);
        setCouponMsg(`${data.discountType === "percentage" ? `${data.discountValue}% discount` : `$${parseFloat(data.discountValue).toFixed(2)} off`} applied ✓`);
      } else {
        setCouponCode(null); setCouponDiscount(0);
        setCouponMsg(data.error ?? "Invalid or expired coupon code");
      }
    } catch { setCouponMsg("Failed to validate coupon"); }
    setCouponApplying(false);
  };

  const removeCoupon = () => { setCouponCode(null); setCouponDiscount(0); setCouponInput(""); setCouponMsg(""); };

  const isPending = isCreating || isUpdating;

  const productSubtotal = parseFloat(
    draft.lineItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );
  const effectiveDeliveryPrice = isTopUp ? 0 : draft.deliveryPrice;
  const effectiveVendorShipping = vendorShippingIsKnown ? vendorShippingAmount! : 0;
  const grandTotal = parseFloat(
    Math.max(0, productSubtotal + effectiveDeliveryPrice + effectiveVendorShipping + draft.tip + draft.testingContribution + adminFeeAmount - couponDiscount).toFixed(2)
  );
  const creditsApplied = account && account.credits > 0 && useCredits ? Math.min(account.credits, Math.floor(grandTotal)) : 0;
  const amountDue = parseFloat((grandTotal - creditsApplied).toFixed(2));

  if (draft.lineItems.length === 0 || !draft.telegramUsername) {
    window.location.href = "/order";
    return null;
  }

  const needsRuleAcceptance = !!account && (account.ruleAcceptedVersion ?? 0) < (account.rulesetVersion ?? 1);

  const doSubmit = () => {
    const payload = {
      telegramUsername: draft.telegramUsername,
      deliveryMethodId: draft.deliveryMethodId,
      deliveryMethod: draft.deliveryMethod,
      deliveryPrice: effectiveDeliveryPrice,
      vendorShipping: draft.vendorShipping,
      productSubtotal,
      tip: draft.tip,
      testingContribution: draft.testingContribution,
      grandTotal,
      couponCode: couponCode ?? undefined,
      creditsApplied: creditsApplied > 0 ? creditsApplied : undefined,
      notes: draft.notes || null,
      groupBuyId: draft.groupBuyId ?? undefined,
      orderType: draft.orderType ?? null,
      shippingName: draft.shippingName || null,
      shippingPhone: draft.shippingPhone || null,
      shippingEmail: draft.shippingEmail || null,
      shippingAddress: draft.shippingAddress || null,
      shippingCountry: draft.shippingCountry || null,
      reshipperUsername: draft.preferredReshipperUsername || undefined,
      directShippingRequested: draft.directShippingRequested || undefined,
      directShippingCost: draft.directShippingRequested && draft.deliveryPrice > 0 ? draft.deliveryPrice : undefined,
      reshipperCode: draft.reshipperCode || undefined,
      lineItems: draft.lineItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      }))
    };

    const existingOrderId = draft.orderId;
    const existingCode = draft.code;

    const onSuccess = (data: { code: string; id?: string }) => {
      const oid = data.id ?? existingOrderId ?? "";
      localStorage.setItem("peps:lastReceipt", JSON.stringify({
        code: data.code,
        telegramUsername: draft.telegramUsername,
        deliveryMethod: draft.deliveryMethod,
        deliveryPrice: draft.deliveryPrice,
        productSubtotal,
        tip: draft.tip,
        grandTotal,
        creditsApplied,
        amountDue,
        notes: draft.notes || null,
        lineItems: draft.lineItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        })),
        createdAt: new Date().toISOString(),
        groupBuyId: draft.groupBuyId ?? null,
        currency: gbCurrency ?? null,
        paymentsEnabled: activeGb
          ? (draft.directShippingRequested
              ? (activeGb.directShippingPaymentsEnabled !== false)
              : (activeGb.paymentsEnabled !== false))
          : undefined,
        vendorShippingAmount: vendorShippingIsKnown ? vendorShippingAmount : null,
        vendorShippingIsTbd: vendorShippingIsTbd,
        isWholesale: isWholesale,
        hidePrices: activeGb?.hidePricesOnInvoice ?? false,
        adminFeeAmount: adminFeeAmount > 0 ? adminFeeAmount : null,
        adminFeeLabel: adminFeeAmount > 0 ? (adminFeeLabel ?? null) : null,
      }));
      draft.clearDraft();
      setLocation(`/success?code=${data.code}&action=${existingOrderId ? "updated" : "created"}&oid=${oid}`);
    };

    if (existingOrderId) {
      updateOrder({
        orderId: existingOrderId,
        data: { ...payload, code: existingCode! }
      }, {
        onSuccess,
        onError: (err: any) => {
          const errMsg: string = (err.data as any)?.error || err.message || "";
          const is404 = err.status === 404 || errMsg.toLowerCase().includes("not found");
          if (is404 && !retried) {
            // The order was deleted by an admin — clear the stale ID and place a fresh one
            setRetried(true);
            draft.clearOrderId();
            if (payload.groupBuyId) {
              fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
              })
                .then(async (res) => {
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to create order");
                  onSuccess(data);
                })
                .catch((e: Error) => setError(e.message || "Failed to create order"));
            } else {
              createOrder({ data: payload }, {
                onSuccess,
                onError: (e: any) => setError((e.data as any)?.error || e.message || "Failed to create order"),
              });
            }
          } else {
            setError(errMsg || "Failed to update order");
          }
        }
      });
    } else if (payload.groupBuyId) {
      // GB orders: use direct fetch with credentials so the account cookie is sent
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to create order");
          onSuccess(data);
        })
        .catch((err: Error) => setError(err.message || "Failed to create order"));
    } else {
      createOrder({ data: payload }, {
        onSuccess,
        onError: (err: any) => setError((err.data as any)?.error || err.message || "Failed to create order")
      });
    }
  };

  const handleSubmit = () => {
    doSubmit();
  };

  return (
    <PageLayout>
    <div className="flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
      <SiteAnnouncements />

      <main className="flex-1 px-4 py-5 pb-36 max-w-2xl mx-auto w-full space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Customer & Delivery</p>
            <div className="rounded-xl p-5 space-y-3 bg-white border border-gray-100 shadow-sm">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Telegram</span>
                <span className="font-semibold text-gray-800">{draft.telegramUsername}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Delivery</span>
                <span className="font-semibold text-gray-800">
                  {draft.deliveryMethod}
                  {isTopUp && <span className="ml-1 text-xs text-green-600 font-normal">(included)</span>}
                </span>
              </div>
              {(draft.directShippingRequested || !draft.groupBuyId) && (draft.shippingName || draft.shippingAddress || draft.shippingCountry || draft.shippingPhone || draft.shippingEmail) && (
                <div>
                  <p className="text-xs mb-1 text-gray-400">Shipping Details</p>
                  <div className="text-sm rounded-lg p-3 text-gray-600 bg-gray-50 border border-gray-100 space-y-0.5">
                    {draft.shippingName && <p className="font-semibold text-gray-800">{draft.shippingName}</p>}
                    {draft.shippingAddress && <p className="whitespace-pre-wrap">{draft.shippingAddress}</p>}
                    {draft.shippingCountry && <p>{draft.shippingCountry}</p>}
                    {draft.shippingPhone && <p>📞 {draft.shippingPhone}</p>}
                    {draft.shippingEmail && <p>✉ {draft.shippingEmail}</p>}
                  </div>
                </div>
              )}
              {draft.groupBuyId && !draft.directShippingRequested && draft.shippingAddress && (
                <div>
                  <p className="text-xs mb-1 text-gray-400">Delivery Address</p>
                  <p className="text-sm rounded-lg p-3 whitespace-pre-wrap text-gray-600 bg-gray-50 border border-gray-100">
                    {draft.shippingAddress}
                  </p>
                </div>
              )}
              {draft.notes && (
                <div>
                  <p className="text-xs mb-1 text-gray-400">Notes</p>
                  <p className="text-sm rounded-lg p-3 whitespace-pre-wrap text-gray-600 bg-gray-50 border border-gray-100">
                    {draft.notes}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="rounded-xl p-5" style={{ background: "linear-gradient(to right, #1a2040, #252f55, #1f2848)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Items</p>
              <div className="space-y-3">
                {draft.lineItems.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-4">
                      <span className="font-medium" style={{ color: "#ffffff" }}>{item.productName}</span>
                      <span className="ml-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                        × {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                      </span>
                      {!hideOrderFormPrices && (
                        <span className="ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                          @ {formatPrice(item.unitPrice)}
                        </span>
                      )}
                    </div>
                    {!hideOrderFormPrices && (
                      <span className="font-semibold whitespace-nowrap" style={{ color: "#ffffff" }}>
                        {formatPrice(item.lineTotal)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {!hideOrderFormPrices && (<section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Price Breakdown</p>
            <div className="rounded-xl p-5 space-y-2.5 bg-white border border-gray-100 shadow-sm">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Products Subtotal</span>
                <span>{formatPrice(productSubtotal)}</span>
              </div>
              {!isWholesale && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Delivery ({draft.deliveryMethod})</span>
                  {isTopUp ? (
                    <span className="text-green-600 font-semibold">Free</span>
                  ) : (
                    <span>{formatPrice(draft.deliveryPrice)}</span>
                  )}
                </div>
              )}
              {vendorShippingIsKnown && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Vendor Shipping</span>
                  <span>{formatPrice(vendorShippingAmount!)}</span>
                </div>
              )}
              {vendorShippingIsTbd && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Vendor Shipping</span>
                  <span className="font-semibold text-blue-600">TBD</span>
                </div>
              )}
              {draft.tip > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Tip</span>
                  <span>{formatPrice(draft.tip)}</span>
                </div>
              )}
              {draft.testingContribution > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Lab Test Contribution</span>
                  <span>{formatPrice(draft.testingContribution)}</span>
                </div>
              )}
              {adminFeeAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{adminFeeLabel ?? "Admin Fee"}</span>
                  <span>{formatPrice(adminFeeAmount)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm font-medium text-green-600">
                  <span>Coupon ({couponCode})</span>
                  <span>−{formatPrice(couponDiscount)}</span>
                </div>
              )}
              {account && account.credits > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={useCredits}
                      onChange={e => setUseCredits(e.target.checked)}
                      className="w-4 h-4 accent-green-600 cursor-pointer"
                    />
                    Use store credits
                  </label>
                  <span className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                    {formatPrice(account.credits)} available
                  </span>
                </div>
              )}
              {creditsApplied > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-100">
                    <span>{vendorShippingIsTbd ? "Estimated Total" : "Total"}</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium" style={{ color: "#16a34a" }}>
                    <span>Store Credits Applied</span>
                    <span>−{formatPrice(creditsApplied)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-100 text-gray-800">
                    <span>Amount Due</span>
                    <span className="text-blue-600">{formatPrice(amountDue)}</span>
                  </div>
                </>
              )}
              {creditsApplied === 0 && (
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-100 text-gray-800">
                  <span>{vendorShippingIsTbd ? "Estimated Total" : "Total"}</span>
                  <span className="text-blue-600">{formatPrice(grandTotal)}</span>
                </div>
              )}
            </div>

            {/* Coupon code input */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              {!couponCode ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && applyCoupon()}
                    placeholder="Coupon code"
                    className="flex-1 text-sm border rounded-lg px-3 py-1.5 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-400"
                    disabled={couponApplying}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponApplying || !couponInput.trim()}
                    className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {couponApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Apply
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600 font-medium">✓ Code <span className="font-mono">{couponCode}</span> applied</span>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 text-xs underline">Remove</button>
                </div>
              )}
              {couponMsg && (
                <p className={`mt-1 text-xs ${couponMsg.includes("✓") ? "text-green-600" : "text-red-500"}`}>{couponMsg}</p>
              )}
            </div>
          </section>)}

          {vendorShippingIsTbd && (
            <div className="flex gap-3 items-start p-4 rounded-xl" style={{ background: "color-mix(in srgb, #F59E0B 12%, var(--t-surface))", border: "1px solid color-mix(in srgb, #F59E0B 40%, transparent)" }}>
              <TriangleAlert className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#D97706" }} />
              <div className="text-sm">
                <p className="font-semibold mb-0.5" style={{ color: "var(--t-text)" }}>This is not your final total</p>
                <p className="leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  {vendorShippingMessage ?? "Vendor shipping is calculated after orders close and will be added separately. You will be notified of your final amount via Telegram before payment is taken."}
                </p>
              </div>
            </div>
          )}


          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

        </motion.div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-20" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-4">
          <div className="flex gap-3 mb-2">
            <button
              onClick={() => setLocation(isWholesale ? "/wholesale" : (draft.groupBuyId ? `/order?gbId=${draft.groupBuyId}` : "/order"))}
              disabled={isPending}
              className="flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ border: "1px solid var(--t-border)", color: "var(--t-muted)", background: "transparent" }}
            >
              <ArrowLeft className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-[2] h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: "var(--t-blue)" }}
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><CheckCircle className="w-4 h-4" /> {draft.orderId ? "Update Order" : "Place Order"}</>
              )}
            </button>
          </div>
          {paymentMessageEnabled && (
            <p className="text-xs text-center border-t pt-2 text-slate-400 border-slate-100" style={{ color: "var(--t-subtle)", borderColor: "var(--t-border)" }}>
              {paymentMessageText ?? "Payments are to be made through the website once sleeping pep confirms"}
            </p>
          )}
        </div>
      </div>

      {showRulesetModal && (
        <RulesetModal
          onAccepted={() => { setShowRulesetModal(false); doSubmit(); }}
          onClose={() => setShowRulesetModal(false)}
        />
      )}
    </div>
    </PageLayout>
  );
}
