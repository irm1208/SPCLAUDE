export function SupplierMessage({ vendor }: { vendor: { id: string; name: string; wholesaleMessage?: string } | null }) {
  if (!vendor?.wholesaleMessage?.trim()) return null;
  return <aside aria-label={`Message from ${vendor.name}`} data-testid="wholesale-supplier-message"
    className="my-3 rounded-lg border p-4"
    style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
    <p className="mb-1 text-sm font-semibold">{vendor.name} — supplier information</p>
    <p className="whitespace-pre-wrap break-words text-sm">{vendor.wholesaleMessage}</p>
  </aside>;
}
