import { describe, expect, it, vi } from "vitest";
vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
import { formatVialMoney } from "./vial-money";
import { useVialCart } from "../hooks/use-vial-cart";

describe("single vial money and basket", () => {
  it("formats seller currency without relabelling it as USD", () => {
    expect(formatVialMoney(16, "GBP")).toBe("£16.00");
    expect(formatVialMoney(16, "EUR")).toBe("€16.00");
    expect(formatVialMoney(16, "USDT")).toBe("16.00 USDT");
    expect(formatVialMoney(16, null)).toContain("currency not recorded");
  });

  it("retains currency, rejects unlike currencies, and keeps the existing basket", () => {
    useVialCart.getState().clearCart();
    const cart = useVialCart.getState();
    expect(cart.addItem({ id: "gbp", name: "KLOW", price: 16, stock: 5, currency: "GBP" })).toBe(true);
    expect(useVialCart.getState().items[0].currency).toBe("GBP");
    expect(cart.addItem({ id: "eur", name: "Other", price: 20, stock: 5, currency: "EUR" })).toBe(false);
    expect(useVialCart.getState().items).toHaveLength(1);
    expect(useVialCart.getState().error).toContain("GBP");
    cart.updateQty("gbp", 2);
    expect(cart.total()).toBe(32);
    cart.clearCart();
  });
  it("preserves older basket selections and resolves their currency from the catalogue", () => {
    useVialCart.setState({ items: [{
      id: "saved", productId: "gbp", productName: "KLOW", price: 16, quantity: 2, stock: 5, currency: "",
    }] });
    useVialCart.getState().hydrateCurrencies([{ id: "gbp", price: 16, stock: 5, currency: "GBP" }]);
    expect(useVialCart.getState().items[0]).toMatchObject({ currency: "GBP", quantity: 2, price: 16 });
    expect(useVialCart.getState().total()).toBe(32);
    useVialCart.getState().clearCart();
  });
});
