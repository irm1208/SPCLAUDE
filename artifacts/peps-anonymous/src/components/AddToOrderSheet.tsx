import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ShoppingCart, Check, ArrowRight, FlaskConical } from "lucide-react";
import { type Protocol } from "@/data/protocols";
import { useVialCart } from "@/hooks/use-vial-cart";
import { matchProtocol } from "@/utils/protocol-match";

interface VialProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  active: boolean;
  mgSize: string | null;
}

export function AddToOrderSheet({
  protocol,
  onClose,
}: {
  protocol: Protocol;
  onClose: () => void;
  orderType?: "single" | "kit";
}) {
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<VialProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const { addItem } = useVialCart();

  useEffect(() => {
    fetch("/api/vial/products")
      .then((r) => r.json())
      .then((data: VialProduct[]) => {
        const matched = (Array.isArray(data) ? data : []).filter(
          (p) => p.stock > 0 && matchProtocol(p.name, protocol)
        );
        setProducts(matched);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [protocol.name]);

  const handleAdd = (product: VialProduct) => {
    addItem({ id: product.id, name: product.name, price: product.price, stock: product.stock });
    setAddedId(product.id);
  };

  const hasAdded = addedId !== null;

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-AU", { style: "currency", currency: currency || "AUD" }).format(price);
    } catch {
      return `$${price.toFixed(2)}`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="absolute inset-0 bg-black/75" onClick={onClose} />

        <motion.div
          className="absolute inset-x-0 bottom-0 rounded-t-2xl overflow-hidden flex flex-col bg-white"
          style={{ maxHeight: "80vh" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
        >
          <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${protocol.color} 0%, ${protocol.color}55 100%)` }} />

          <div className="px-4 pt-3.5 pb-3 shrink-0 flex items-center justify-between border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900">{protocol.name}</p>
              <p className="text-xs mt-0.5 text-slate-400">Available in the vial shop — choose a size</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <FlaskConical className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-400 text-center">
                  No {protocol.name} products are currently in stock in the vial shop.
                </p>
              </div>
            ) : (
              products.map((product) => {
                const isAdded = addedId === product.id;
                return (
                  <button
                    key={product.id}
                    onClick={() => !hasAdded && handleAdd(product)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all"
                    style={
                      isAdded
                        ? { background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.35)" }
                        : hasAdded
                        ? { background: "var(--t-surface2)", borderColor: "var(--t-border)", opacity: 0.45, cursor: "default" }
                        : { background: "var(--t-surface2)", borderColor: "var(--t-border)" }
                    }
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: isAdded ? "#10B981" : "var(--t-text)" }}>
                        {product.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: isAdded ? "#10B981" : "var(--t-subtle)" }}>
                        {formatPrice(product.price, product.currency)}
                        {product.stock <= 5 && !isAdded && (
                          <span className="ml-2 text-blue-500">Only {product.stock} left</span>
                        )}
                      </p>
                    </div>
                    {isAdded ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: `${protocol.color}15`, color: protocol.color }}>
                        + Add
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <AnimatePresence>
            {hasAdded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 border-t border-slate-100"
              >
                <div className="px-4 py-3 flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600"
                  >
                    Keep browsing
                  </button>
                  <button
                    onClick={() => { onClose(); setLocation("/shop"); }}
                    className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white"
                    style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, var(--t-blue) 100%)" }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    View Cart
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
