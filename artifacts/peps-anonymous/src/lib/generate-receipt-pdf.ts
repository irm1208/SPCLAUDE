import jsPDF from "jspdf";
import { currSym } from "@/lib/currency";

export interface ReceiptLineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Receipt {
  code: string;
  telegramUsername: string;
  deliveryMethod: string;
  deliveryPrice: number;
  productSubtotal: number;
  tip: number;
  grandTotal: number;
  creditsApplied?: number;
  amountDue?: number;
  notes: string | null;
  lineItems: ReceiptLineItem[];
  createdAt: string;
  groupBuyId?: string | null;
  currency?: string | null;
  paymentsEnabled?: boolean;
  vendorShippingAmount?: number | null;
  vendorShippingIsTbd?: boolean;
  isWholesale?: boolean;
  hidePrices?: boolean;
  adminFeeAmount?: number | null;
  adminFeeLabel?: string | null;
  shippingCarrier?: string | null;
}

export function generateReceiptPDF(receipt: Receipt): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const PAD = 18;
  const RW = PW - PAD * 2;
  const BOTTOM_MARGIN = 18;
  let y = PAD;

  const grey = (v: number) => [v, v, v] as [number, number, number];

  function checkPage(needed: number) {
    if (y + needed > PH - BOTTOM_MARGIN) {
      doc.addPage();
      y = PAD;
    }
  }

  function hline(gv = 220) {
    checkPage(8);
    doc.setDrawColor(...grey(gv));
    doc.line(PAD, y, PAD + RW, y);
    y += 4;
  }

  function row(label: string, value: string, bold = false, color: [number, number, number] = [55, 65, 81]) {
    checkPage(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(label, PAD, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(value, PAD + RW, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(13, 27, 42);
  doc.text("SaltandPeps", PW / 2, y + 6, { align: "center" });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text("Order Confirmation", PW / 2, y, { align: "center" });
  y += 8;

  hline(200);

  const date = new Date(receipt.createdAt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  row("Date", date);
  row("Order Code", receipt.code, true, [59, 79, 212]);
  row("Telegram", receipt.telegramUsername);
  row("Delivery", receipt.shippingCarrier ? `${receipt.deliveryMethod} (${receipt.shippingCarrier})` : receipt.deliveryMethod);

  y += 2;
  hline();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  checkPage(10);
  doc.text("ITEMS", PAD, y);
  y += 6;

  const sym = currSym(receipt.currency);
  for (const item of receipt.lineItems) {
    checkPage(12);
    const qty = item.quantity % 1 === 0 ? String(item.quantity) : item.quantity.toFixed(1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(item.productName, PAD, y);
    if (receipt.hidePrices) {
      doc.setTextColor(...grey(150));
      doc.text(`qty: ${qty}`, PAD, y + 4);
    } else {
      doc.setTextColor(...grey(150));
      doc.text(`${qty} × ${sym}${item.unitPrice.toFixed(2)}`, PAD, y + 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(`${sym}${item.lineTotal.toFixed(2)}`, PAD + RW, y, { align: "right" });
    }
    y += 10;
  }

  y += 2;
  hline();

  if (!receipt.hidePrices) {
    checkPage(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("PRICE BREAKDOWN", PAD, y);
    y += 6;

    const pdfSym = currSym(receipt.currency);
    row("Products Subtotal", `${pdfSym}${receipt.productSubtotal.toFixed(2)}`);
    if (!receipt.isWholesale) {
      row(`Delivery (${receipt.deliveryMethod})`, `${pdfSym}${receipt.deliveryPrice.toFixed(2)}`);
    }
    if (receipt.vendorShippingAmount != null) {
      row("Vendor Shipping", `${pdfSym}${receipt.vendorShippingAmount.toFixed(2)}`);
    } else if (receipt.vendorShippingIsTbd) {
      row("Vendor Shipping", "TBD", true, [217, 119, 6]);
    }
    if (receipt.tip > 0) row("Tip", `${pdfSym}${receipt.tip.toFixed(2)}`);
    if (receipt.adminFeeAmount != null && receipt.adminFeeAmount > 0) {
      row(receipt.adminFeeLabel ?? "Admin Fee", `${pdfSym}${receipt.adminFeeAmount.toFixed(2)}`);
    }

    y += 2;
    hline(200);

    checkPage(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(31, 41, 55);
    doc.text(receipt.vendorShippingIsTbd ? "Estimated Total" : "Total", PAD, y);
    doc.setTextColor(59, 79, 212);
    doc.text(`${pdfSym}${receipt.grandTotal.toFixed(2)}`, PAD + RW, y, { align: "right" });
    y += 10;
  }

  if (receipt.vendorShippingIsTbd) {
    checkPage(22);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(252, 211, 77);
    doc.roundedRect(PAD, y, RW, 14, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text("⚠  Vendor shipping TBD. Final total confirmed via Telegram before payment.", PAD + 3, y + 5.5);
    doc.text("    Payments are made through the website once sleeping pep confirms.", PAD + 3, y + 10);
    y += 18;
  }

  if (receipt.notes) {
    hline();
    const lines = doc.splitTextToSize(receipt.notes, RW);
    const notesHeight = lines.length * 4.5 + 12;
    checkPage(notesHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("NOTES", PAD, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(lines, PAD, y);
    y += lines.length * 4.5 + 4;
  }

  y += 4;
  hline(200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);

  return doc;
}
