import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface VialCartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
}

interface VialCartState {
  items: VialCartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addItem: (product: { id: string; name: string; price: number; stock: number }) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

const uid = () => Math.random().toString(36).substring(2, 9);

export const useVialCart = create<VialCartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),

      addItem: (product) => set((state) => {
        const existing = state.items.find(i => i.productId === product.id);
        if (existing) {
          return {
            items: state.items.map(i =>
              i.productId === product.id
                ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
                : i
            ),
          };
        }
        return {
          items: [...state.items, {
            id: uid(), productId: product.id, productName: product.name,
            price: product.price, quantity: 1, stock: product.stock,
          }],
        };
      }),

      removeItem: (productId) => set((state) => ({
        items: state.items.filter(i => i.productId !== productId),
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

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: "lonely-vial-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
