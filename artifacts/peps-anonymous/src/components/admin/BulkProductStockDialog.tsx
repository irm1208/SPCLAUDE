import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button, Input } from "../ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";

type Operation = "increase" | "decrease" | "set";
export type StockProduct = { id: string; name: string; vendor: string; stock: number | null };
export type BulkStockResult = {
  products: { id: string; stock: number }[];
  skippedIds: string[];
};
type Props = {
  products: StockProduct[];
  secret: string;
  onClose: () => void;
  onSaved: (result: BulkStockResult) => void;
};

const MAX_STOCK = 2_147_483_647;
const LABELS: Record<Operation, string> = {
  increase: "Increase stock by", decrease: "Decrease stock by", set: "Set stock to",
};

function previewStock(product: StockProduct, operation: Operation, quantity: number) {
  if (operation === "set") return quantity;
  if (product.stock == null) return null;
  return operation === "increase" ? product.stock + quantity : Math.max(0, product.stock - quantity);
}

function validateResult(data: unknown, selected: StockProduct[]): data is BulkStockResult & { ok: true } {
  if (!data || typeof data !== "object") return false;
  const result = data as Partial<BulkStockResult> & { ok?: unknown };
  if (result.ok !== true || !Array.isArray(result.products) || !Array.isArray(result.skippedIds)) return false;
  if (!result.products.every(row => row && typeof row.id === "string"
    && Number.isInteger(row.stock) && row.stock >= 0 && row.stock <= MAX_STOCK)
    || !result.skippedIds.every(id => typeof id === "string")) return false;
  const returnedIds = [...result.products.map(row => row.id), ...result.skippedIds];
  const expected = new Set(selected.map(product => product.id));
  return returnedIds.length === expected.size
    && new Set(returnedIds).size === expected.size
    && returnedIds.every(id => expected.has(id));
}

export function BulkProductStockDialog({ products, secret, onClose, onSaved }: Props) {
  const form = useForm<{ operation: Operation; quantity: string }>({
    defaultValues: { operation: "increase", quantity: "" },
  });
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const operation = form.watch("operation");
  const quantity = Number(form.watch("quantity"));
  const untrackedCount = operation === "set" ? 0 : products.filter(product => product.stock == null).length;
  const affectedCount = products.length - untrackedCount;

  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products/stock", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ ids: products.map(product => product.id), operation, quantity }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Could not update stock. Refresh the list before retrying.");
      }
      if (!validateResult(result, products)) {
        throw new Error("The server returned an incomplete stock update. Refresh the list before retrying.");
      }
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update stock. Refresh the list before retrying.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !inFlight.current) onClose(); }}>
      <DialogContent data-testid="dialog-bulk-product-stock" className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{review ? "Confirm stock changes" : "Update selected stock"}</DialogTitle>
          <DialogDescription data-testid="text-bulk-stock-selection">
            {products.length} selected product{products.length === 1 ? "" : "s"}. Changes apply to each product, not to a shared total.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form data-testid="form-bulk-product-stock" className="space-y-4" onSubmit={form.handleSubmit(() => {
            setError("");
            setReview(true);
          })}>
            {!review ? <>
              <FormField control={form.control} name="operation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock action</FormLabel>
                  <FormControl>
                    <select {...field} data-testid="select-bulk-stock-action"
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="increase">Increase stock by</option>
                      <option value="decrease">Decrease stock by</option>
                      <option value="set">Set stock to</option>
                    </select>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" rules={{
                validate: value => {
                  if (!/^\d+$/.test(value)) return "Enter a whole-number quantity.";
                  const amount = Number(value);
                  if (amount > MAX_STOCK || amount < (operation === "set" ? 0 : 1)) {
                    return operation === "set" ? `Enter a quantity from 0 to ${MAX_STOCK}.`
                      : `Enter an adjustment from 1 to ${MAX_STOCK}.`;
                  }
                  if (products.some(product => (previewStock(product, operation, amount) ?? 0) > MAX_STOCK)) {
                    return "This adjustment would exceed the supported stock range.";
                  }
                  return true;
                },
              }} render={({ field }) => (
                <FormItem>
                  <FormLabel>{operation === "set" ? "New stock quantity per product" : "Quantity per product"}</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-bulk-stock-quantity" type="number"
                      min={operation === "set" ? 0 : 1} max={MAX_STOCK} step="1" placeholder="Enter quantity" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </> : <div data-testid="text-bulk-stock-summary" className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="font-semibold">{LABELS[operation]} {quantity} for each of {affectedCount} product{affectedCount === 1 ? "" : "s"}.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {operation === "decrease" ? "Stock will not go below zero. " : ""}
                Relative changes use the latest stock when saved.
              </p>
            </div>}
            {untrackedCount > 0 && <p data-testid="text-bulk-stock-skipped" className="text-sm text-amber-700">
              {untrackedCount} product{untrackedCount === 1 ? " has" : "s have"} no tracked stock and will be skipped.
              {" "}Choose “Set stock to” to start tracking them.
            </p>}
            {operation === "set" && products.some(product => product.stock == null) && <p className="text-xs text-muted-foreground">
              Products without tracked stock will start tracking this quantity.
            </p>}
            <div className="max-h-56 overflow-y-auto divide-y rounded-xl border">
              {products.map(product => {
                const next = previewStock(product, operation, quantity);
                return <div key={product.id} data-testid={`row-stock-preview-${product.id}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.vendor}</p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">
                    {product.stock ?? "Not tracked"}{review && <> → {next ?? "Skipped"}</>}
                  </p>
                </div>;
              })}
            </div>
            {!affectedCount && <p role="alert" className="text-sm text-muted-foreground">
              No tracked stock to adjust. Choose “Set stock to” instead.
            </p>}
            {error && <p data-testid="error-bulk-stock" role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button data-testid="button-cancel-bulk-stock" type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
              {review ? <>
                <Button data-testid="button-back-bulk-stock" type="button" variant="ghost" disabled={pending}
                  onClick={() => { setError(""); setReview(false); }}>Back</Button>
                <Button data-testid="button-confirm-bulk-stock" type="button" disabled={pending || !affectedCount} onClick={() => void save()}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {pending ? "Updating stock…" : "Confirm stock changes"}
                </Button>
              </> : <Button data-testid="button-review-bulk-stock" type="submit" disabled={!affectedCount}>Review changes</Button>}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
