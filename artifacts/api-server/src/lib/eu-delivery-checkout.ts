type Contact = { shippingName?: unknown; shippingAddress?: unknown; shippingCountry?: unknown; shippingPhone?: unknown; shippingEmail?: unknown };
export function deliveryContactError(contact: Contact): string | null {
  for (const [key, label, max] of [
    ["shippingName", "full name", 120], ["shippingAddress", "delivery address", 1024],
    ["shippingCountry", "country", 128], ["shippingPhone", "mobile number", 40], ["shippingEmail", "email address", 254],
  ] as const) {
    const value = contact[key];
    if (typeof value !== "string" || !value.trim()) return `Please enter your ${label} for EU onward delivery.`;
    if (value.trim().length > max) return `Your ${label} is too long.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.shippingEmail).trim())) return "Please enter a valid email address.";
  if (!/^\+?[\d\s().-]+$/.test(String(contact.shippingPhone).trim()) || String(contact.shippingPhone).replace(/\D/g, "").length < 7)
    return "Please enter a valid mobile number, including its country code.";
  return null;
}
type Wallet = { walletAddress: string | null; currency: string; network: string };
export function samePaymentWallet(a: Wallet, b: Wallet): boolean {
  const network = (s: string) => /^(ethereum|erc[- ]?20)$/i.test(s) ? "ethereum" : s.toLowerCase();
  const address = (w: Wallet) => /^0x/i.test(w.walletAddress ?? "") ? w.walletAddress!.toLowerCase() : w.walletAddress;
  return !!a.walletAddress && !!b.walletAddress && address(a) === address(b)
    && a.currency.toUpperCase() === b.currency.toUpperCase() && network(a.network) === network(b.network);
}
