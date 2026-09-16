import React from "react";
import { formatInvoiceMoney, calculateInvoiceTotals, type InvoiceDocument } from "@/lib/invoice";

export function InvoicePreview({ invoice }: { invoice: InvoiceDocument }) {
  const totals = calculateInvoiceTotals(invoice);
  return (
    <div className="mx-auto w-full max-w-[620px] bg-white text-slate-900 shadow-xl ring-1 ring-slate-200" style={{ aspectRatio: "210 / 297" }}>
      <div className="flex min-h-full flex-col p-8 sm:p-10 text-[11px]">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="min-w-0">
            {invoice.seller.logoUrl && <img src={invoice.seller.logoUrl} alt="" className="mb-3 h-9 max-w-32 object-contain object-left" />}
            <h3 className="truncate text-xl font-bold tracking-tight">{invoice.seller.name || "Seller"}</h3>
            <div className="mt-2 space-y-0.5 text-slate-500">
              {invoice.seller.addressLines.filter(Boolean).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
              {invoice.seller.email && <p>{invoice.seller.email}</p>}
              {invoice.seller.phone && <p>{invoice.seller.phone}</p>}
              {invoice.seller.taxId && <p>Tax ID: {invoice.seller.taxId}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black tracking-tight text-slate-950">INVOICE</p>
            <p className="mt-2 font-semibold">#{invoice.invoiceNumber || "—"}</p>
            <p className="mt-1 text-slate-500">Issued {invoice.issueDate || "—"}</p>
            {invoice.dueDate && <p className="text-slate-500">Due {invoice.dueDate}</p>}
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{invoice.status}</span>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 border-b border-slate-200 py-6">
          <div><p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Bill to</p><p className="font-bold">{invoice.customer.name || "Customer"}</p><div className="mt-1 text-slate-500">{invoice.customer.addressLines.filter(Boolean).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}{invoice.customer.email && <p>{invoice.customer.email}</p>}{invoice.customer.phone && <p>{invoice.customer.phone}</p>}</div></div>
          <div className="text-right"><p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Currency</p><p className="font-bold">{invoice.currency}</p><p className="mt-1 text-slate-500">{invoice.lineItems.length} line item{invoice.lineItems.length === 1 ? "" : "s"}</p></div>
        </section>

        <section className="flex-1 py-6">
          <div className="grid grid-cols-[1fr_42px_76px_82px] gap-2 border-b border-slate-200 pb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400"><span>Description</span><span className="text-right">Qty</span><span className="text-right">Unit</span><span className="text-right">Amount</span></div>
          <div>{invoice.lineItems.map((item) => { const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 - Math.min(100, Number(item.discount) || 0) / 100); return <div key={item.id} className="grid grid-cols-[1fr_42px_76px_82px] gap-2 border-b border-slate-100 py-3"><span className="min-w-0 break-words font-semibold">{item.description || "Untitled item"}<small className="block text-[9px] font-normal text-slate-400">{Number(item.taxRate) || 0}% tax{Number(item.discount) > 0 ? ` · ${item.discount}% discount` : ""}</small></span><span className="text-right text-slate-600">{item.quantity || "0"}</span><span className="text-right text-slate-600">{formatInvoiceMoney(item.unitPrice, invoice.currency)}</span><span className="text-right font-semibold">{formatInvoiceMoney(amount.toFixed(2), invoice.currency)}</span></div>; })}</div>
          <div className="ml-auto mt-8 w-full max-w-[240px] space-y-2"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatInvoiceMoney(totals.subtotal, invoice.currency)}</span></div><div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatInvoiceMoney(totals.totalTax, invoice.currency)}</span></div><div className="flex justify-between text-slate-500"><span>Shipping</span><span>{formatInvoiceMoney(invoice.shippingCost, invoice.currency)}</span></div><div className="flex justify-between border-t border-slate-900 pt-3 text-base font-black"><span>Total</span><span>{formatInvoiceMoney(totals.total, invoice.currency)}</span></div></div>
        </section>
        {(invoice.notes || invoice.terms) && <footer className="space-y-3 border-t border-slate-200 pt-5 text-slate-500"><>{invoice.notes && <div><p className="font-bold text-slate-700">Notes</p><p className="whitespace-pre-wrap">{invoice.notes}</p></div>}</><>{invoice.terms && <div><p className="font-bold text-slate-700">Terms</p><p className="whitespace-pre-wrap">{invoice.terms}</p></div>}</></footer>}
      </div>
    </div>
  );
}
