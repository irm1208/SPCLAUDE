import React, { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Save } from "lucide-react";
import { useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { Button, Card, Input, Label } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { calculateInvoiceTotals, formatInvoiceMoney, INVOICE_CURRENCIES, INVOICE_STATUSES, type InvoiceDocument } from "@/lib/invoice";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { InvoicePreview } from "./InvoicePreview";

interface InvoicePartyForm {
  name: string;
  addressLines: string[];
  email: string;
  phone: string;
  taxId: string;
  logoUrl: string;
}

interface InvoiceForm {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: InvoiceDocument["currency"];
  status: InvoiceDocument["status"];
  seller: InvoicePartyForm;
  customer: InvoicePartyForm;
  lineItems: InvoiceDocument["lineItems"];
  notes: string;
  terms: string;
  shippingCost: string;
}

const EMPTY_PARTY: InvoicePartyForm = { name: "", addressLines: ["", "", "", ""], email: "", phone: "", taxId: "", logoUrl: "" };
const EMPTY_ITEM = { id: "new", description: "", quantity: "1", unitPrice: "0", taxRate: "0", discount: "0" };

function normalizeInvoice(value: InvoiceDocument): InvoiceForm {
  const normalizeParty = (party: InvoiceDocument["seller"]): InvoicePartyForm => ({ ...EMPTY_PARTY, ...party, addressLines: [...party.addressLines, "", "", "", ""].slice(0, 4) });
  return {
    invoiceNumber: value.invoiceNumber,
    issueDate: value.issueDate,
    dueDate: value.dueDate ?? "",
    currency: value.currency,
    status: value.status,
    seller: normalizeParty(value.seller),
    customer: normalizeParty(value.customer),
    lineItems: value.lineItems.length ? value.lineItems : [EMPTY_ITEM],
    notes: value.notes ?? "",
    terms: value.terms ?? "",
    shippingCost: value.shippingCost ?? "0",
  };
}

function toDocument(orderId: string, value: InvoiceForm): Omit<InvoiceDocument, "subtotal" | "totalTax" | "total"> {
  const cleanParty = (party: InvoicePartyForm) => ({ ...party, addressLines: party.addressLines.map((line) => line.trim()).filter(Boolean) });
  return {
    orderId,
    invoiceNumber: value.invoiceNumber,
    issueDate: value.issueDate,
    dueDate: value.dueDate || null,
    currency: value.currency,
    status: value.status,
    seller: cleanParty(value.seller),
    customer: cleanParty(value.customer),
    lineItems: value.lineItems,
    notes: value.notes,
    terms: value.terms,
    shippingCost: value.shippingCost,
  };
}

export function InvoiceEditor({ orderId, adminSecret, onSaved }: { orderId: string; adminSecret: string; onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { control, register, reset, handleSubmit } = useForm<InvoiceForm>({ defaultValues: { invoiceNumber: "", issueDate: new Date().toISOString().slice(0, 10), dueDate: "", currency: "GBP", status: "draft", seller: EMPTY_PARTY, customer: EMPTY_PARTY, lineItems: [EMPTY_ITEM], notes: "", terms: "", shippingCost: "0" } });
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const watched = useWatch({ control });
  const preview = useMemo<InvoiceDocument>(() => {
    const draft = toDocument(orderId, watched as InvoiceForm);
    const totals = calculateInvoiceTotals(draft);
    return { ...draft, ...totals };
  }, [orderId, watched]);
  const requestHeaders = (json = false): HeadersInit => ({ ...(json ? { "Content-Type": "application/json" } : {}), ...(adminSecret !== "__admin_session__" ? { "x-admin-secret": adminSecret } : {}) });
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/invoice`, { headers: requestHeaders(), credentials: "include" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Failed to load invoice"); return body as InvoiceDocument; })
      .then((invoice) => { if (active) reset(normalizeInvoice(invoice)); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Failed to load invoice"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adminSecret, orderId, reset]);

  const onSubmit: SubmitHandler<InvoiceForm> = async (value) => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/invoice`, { method: "PUT", headers: requestHeaders(true), credentials: "include", body: JSON.stringify(toDocument(orderId, value)) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save invoice");
      reset(normalizeInvoice(body as InvoiceDocument)); setSaved(true); onSaved?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to save invoice"); }
    finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    setDownloading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/invoice-pdf`, { headers: requestHeaders(), credentials: "include" });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? "Failed to download PDF"); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `invoice-${preview.invoiceNumber || orderId}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to download PDF"); }
    finally { setDownloading(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-10 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading invoice</div>;
  if (error && !preview.invoiceNumber) return <div className="p-6 text-sm text-red-600">{error}</div>;

  const partyFields = (prefix: "seller" | "customer", includeLogo = false) => <div className="space-y-3"><div><Label>Name</Label><Input {...register(`${prefix}.name`)} className="mt-1 h-9" /></div><div><Label>Email</Label><Input type="email" {...register(`${prefix}.email`)} className="mt-1 h-9" /></div><div><Label>Phone</Label><Input {...register(`${prefix}.phone`)} className="mt-1 h-9" /></div>{prefix === "seller" && <div><Label>VAT / Tax ID</Label><Input {...register("seller.taxId")} className="mt-1 h-9" /></div>}<div><Label>Address</Label><div className="mt-1 space-y-2">{[0, 1, 2, 3].map((index) => <Input key={index} {...register(`${prefix}.addressLines.${index}`)} placeholder={`Address line ${index + 1}`} className="h-9" />)}</div></div>{includeLogo && <div><Label>Logo URL</Label><Input {...register("seller.logoUrl")} placeholder="https://…" className="mt-1 h-9" /></div>}</div>;

  return <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,620px)]"><div className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invoice editor</p><h2 className="text-xl font-bold">{preview.invoiceNumber || "New invoice"}</h2></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={downloadPdf} disabled={downloading || saving} className="gap-1.5">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}PDF</Button><Button type="submit" disabled={saving || downloading} className="gap-1.5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button></div></div>{error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}{saved && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Invoice saved.</p>}<Card className="space-y-4 p-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Invoice details</h3></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Invoice number</Label><Input {...register("invoiceNumber", { required: true })} className="mt-1 h-9" /></div><div><Label>Currency</Label><select {...register("currency")} className="mt-1 h-9 w-full rounded-xl border border-input bg-background px-3 text-sm">{INVOICE_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></div><div><Label>Issue date</Label><Input type="date" {...register("issueDate")} className="mt-1 h-9" /></div><div><Label>Due date</Label><Input type="date" {...register("dueDate")} className="mt-1 h-9" /></div><div><Label>Status</Label><select {...register("status")} className="mt-1 h-9 w-full rounded-xl border border-input bg-background px-3 text-sm">{INVOICE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div><div><Label>Shipping</Label><Input type="number" min="0" step="0.01" {...register("shippingCost")} className="mt-1 h-9" /></div></div></Card><div className="grid gap-4 lg:grid-cols-2"><Card className="p-4"><h3 className="mb-3 text-sm font-bold">Seller details</h3>{partyFields("seller", true)}</Card><Card className="p-4"><h3 className="mb-3 text-sm font-bold">Customer details</h3>{partyFields("customer")}</Card></div><Card className="p-4"><InvoiceLineItems register={register} fields={fields} append={append} remove={remove} /></Card><Card className="grid gap-4 p-4 sm:grid-cols-2"><div><Label>Notes</Label><Textarea {...register("notes")} className="mt-1 min-h-24" /></div><div><Label>Terms</Label><Textarea {...register("terms")} className="mt-1 min-h-24" /></div></Card></div><div className="min-w-0 xl:sticky xl:top-4 xl:self-start"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live preview</p><p className="text-xs font-semibold text-muted-foreground">{formatInvoiceMoney(preview.total, preview.currency)}</p></div><InvoicePreview invoice={preview} /></div></form>;
}
