import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useRegisterSetupSection } from "../setup-draft-context";

// ─── Setup: Products Step ────────────────────────────────────────────────────
// Add and manage products for the group buy. Shows a list of added products with
// inline editing, plus an "Add Product" form at the bottom.

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  stock: string;
}

export default function ProductsStep() {
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "", price: "", category: "", stock: "" },
  ]);
  useRegisterSetupSection("products", { products });

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addProduct = () => {
    const newId = String(Date.now());
    setProducts(prev => [...prev, { id: newId, name: "", price: "", category: "", stock: "" }]);
  };

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-blue)" }}>
          Add the products members can order. Each product needs a name, price, vendor/category, and stock quantity. You can add more products later or import them in bulk via CSV.
        </p>
      </div>

      {/* Product list */}
      {products.length > 0 ? (
        <div className="space-y-3">

          {products.map((p, index) => (
            <div key={p.id} className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                  <span className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>
                    {p.name || `Product ${index + 1}`}
                  </span>
                  {p.category && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                      {p.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeProduct(p.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-red-50"
                  style={{ color: "#EF4444" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Remove</span>
                </button>
              </div>

              {/* Form fields */}
              <div className="p-3">
                <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[1fr_100px_120px_80px] sm:gap-3 sm:items-start">
                <input
                  type="text"
                  placeholder="Product name"
                  value={p.name}
                  onChange={(e) => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))}
                  className="w-full h-9 px-3 rounded-md text-[13px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
                <input
                  type="text"
                  placeholder="Price"
                  value={p.price}
                  onChange={(e) => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, price: e.target.value } : x))}
                  className="w-full h-9 px-3 rounded-md text-[13px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
                <input
                  type="text"
                  placeholder="Vendor"
                  value={p.category}
                  onChange={(e) => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, category: e.target.value } : x))}
                  className="w-full h-9 px-3 rounded-md text-[13px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
                <input
                  type="text"
                  placeholder="Stock"
                  value={p.stock}
                  onChange={(e) => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: e.target.value } : x))}
                  className="w-full h-9 px-3 rounded-md text-[13px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>
            </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg p-8 text-center bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
            <Package className="w-6 h-6" style={{ color: "var(--t-subtle)" }} />
          </div>
          <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>No products yet</p>
          <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Add your first product to get started</p>
        </div>
      )}

      {/* Add product button */}
      <button
        onClick={addProduct}
        className="w-full h-10 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
        style={{ border: `2px dashed ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
      >
        <Plus className="w-4 h-4" /> Add Product
      </button>

      {/* Helper text */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[12px]" style={{ color: "var(--t-blue)" }}>
          <strong>Tip:</strong> You can also import products in bulk via CSV or AI extraction once your GB is created.
        </p>
      </div>
    </div>
  );
}
