import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface VialCartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number;
}

interface VialCartState {
  items: VialCartItem[];
  cartOpen: boolean;
  error: string | null;
  setCartOpen: (open: boolean) => void;
  addItem: (product: { id: string; name: string; price: number; stock: number; currency: string }) => boolean;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  hydrateCurrencies: (products: { id: string; currency: string; price: number; stock: number }[]) => void;
  total: () => number;
  itemCount: () => number;
}

const uid = () => Math.random().toString(36).substring(2, 9);

export const useVialCart = create<VialCartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartOpen: false,
      error: null,
      setCartOpen: (open) => set({ cartOpen: open }),

      addItem: (product) => {
        const currency = product.currency.trim().toUpperCase();
        if (!currency || get().items.some(i => i.currency !== currency)) {
          set({ error: `Your basket uses ${get().items[0]?.currency ?? "another currency"}. Check out or empty it before adding ${currency || "this item"}.` });
          return false;
        }
        set((state) => {
        const existing = state.items.find(i => i.productId === product.id);
        if (existing) {
          return {
            error: null,
            items: state.items.map(i =>
              i.productId === product.id
                ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
                : i
            ),
          };
        }
        return {
          error: null,
          items: [...state.items, {
            id: uid(), productId: product.id, productName: product.name,
            price: product.price, currency, quantity: 1, stock: product.stock,
          }],
        };
        });
        return true;
      },

      removeItem: (productId) => set((state) => ({
        items: state.items.filter(i => i.productId !== productId),
        error: null,
      })),

      updateQty: (productId, quantity) => set((state) => {
        if (quantity <= 0) return { items: state.items.filter(i => i.productId !== productId) };
        return {
          items: state.items.map(i =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        };
      }),

      clearCart: () => set({ items: [], error: null }),

      hydrateCurrencies: (products) => set(state => ({
        items: state.items.map(item => {
          if (item.currency) return item;
          const product = products.find(p => p.id === item.productId);
          return product ? { ...item, currency: product.currency.trim().toUpperCase(), price: product.price, stock: product.stock } : item;
        }),
      })),

      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: "lonely-vial-cart",
      // Preserve old selections, but resolve their missing currency from the catalogue.
      version: 1,
      migrate: (persisted) => ({
        items: ((persisted as { items?: VialCartItem[] })?.items ?? []).map(item => ({ ...item, currency: "" })),
      }),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
