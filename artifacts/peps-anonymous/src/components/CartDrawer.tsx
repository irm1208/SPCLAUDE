import React from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, X, Plus, Minus, Trash2, ChevronRight, Shield,
} from "lucide-react";
import { useVialCart } from "@/hooks/use-vial-cart";
import { T } from "@/lib/theme";

const NAVY = "var(--t-blue-deep)";
const BLUE = "var(--t-blue)";

export function CartDrawer() {
  const [, setLocation] = useLocation();
  const { items, updateQty, removeItem, total, itemCount, cartOpen, setCartOpen } = useVialCart();
  const subtotal = total();
  const count = itemCount();

  const onClose = () => setCartOpen(false);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              maxHeight: "85vh",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
              background: T.surface,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: T.border }} />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <div>
                <h2 className="text-lg font-bold" style={{ color: T.text }}>Your Cart</h2>
                <p className="text-xs" style={{ color: T.muted }}>{count} item{count !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: T.surface2 }}
              >
                <X className="w-4 h-4" style={{ color: T.muted }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 space-y-2 pb-2" style={{ borderTop: `1px solid ${T.border}` }}>
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3" style={{ color: T.border }} />
                  <p className="text-sm font-medium" style={{ color: T.subtle }}>Your cart is empty</p>
                  <button onClick={onClose} className="mt-3 text-xs font-semibold" style={{ color: BLUE }}>Browse products</button>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs text-white"
                      style={{ background: `linear-gradient(135deg, #071640, ${NAVY})` }}
                    >
                      {item.productName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{item.productName}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: BLUE }}>${item.price.toFixed(2)} / vial</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => item.quantity <= 1 ? removeItem(item.productId) : updateQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: T.surface2 }}
                      >
                        {item.quantity <= 1
                          ? <Trash2 className="w-3 h-3" style={{ color: "#DC2626" }} />
                          : <Minus className="w-3 h-3" style={{ color: T.muted }} />}
                      </button>
                      <span className="w-6 text-center text-sm font-bold" style={{ color: T.text }}>{item.quantity}</span>
                      <button
                        onClick={() => item.quantity < item.stock && updateQty(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                        style={{ background: T.surface2 }}
                      >
                        <Plus className="w-3 h-3" style={{ color: T.muted }} />
                      </button>
                    </div>
                    <p className="text-sm font-black shrink-0 w-14 text-right" style={{ color: T.text }}>${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-4 pb-6 pt-3 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: T.muted }}>Subtotal ({count} item{count !== 1 ? "s" : ""})</span>
                  <span className="text-xl font-black" style={{ color: T.text }}>
                    ${subtotal.toFixed(2)} <span className="text-sm font-semibold" style={{ color: T.subtle }}>USDT</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: T.subtle }}>
                  <Shield className="w-3 h-3" /> Secure &amp; anonymous checkout
                </div>
                <button
                  onClick={() => { onClose(); setLocation("/shop/checkout"); }}
                  className="w-full rounded-xl font-bold text-base flex items-center justify-between px-5 text-white"
                  style={{
                    background: `linear-gradient(135deg, #071640 0%, ${NAVY} 100%)`,
                    boxShadow: "0 4px 18px var(--t-blue-35)",
                    height: 52,
                  }}
                >
                  <span>Proceed to Checkout</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
