import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import path from "node:path";
import sharp from "sharp";
import {
  calculateInvoiceLineItemTotal,
  calculateInvoiceTotals,
  formatInvoiceMoney,
  type InvoiceDocument,
} from "./invoice";

type LogoImage = { data: Buffer; width: number; height: number };

let logoPromise: Promise<LogoImage | null> | undefined;

async function loadLogo(): Promise<LogoImage | null> {
  if (!logoPromise) {
    logoPromise = (async () => {
      const candidates = [
        path.resolve(process.cwd(), "artifacts/peps-anonymous/public/brand/salt-peps-logo-1440.png"),
        path.resolve(process.cwd(), "../peps-anonymous/public/brand/salt-peps-logo-1440.png"),
        path.resolve(process.cwd(), "artifacts/peps-anonymous/dist/public/brand/salt-peps-logo-1440.png"),
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../peps-anonymous/public/brand/salt-peps-logo-1440.png"),
      ];
      const logoPath = candidates.find((candidate) => existsSync(candidate));
      if (!logoPath) return null;
      const result = await sharp(logoPath)
        .resize({ width: 180, height: 40, fit: "inside" })
        .flatten({ background: "#ffffff" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { data: deflateSync(result.data), width: result.info.width, height: result.info.height };
    })().catch((error) => {
      console.warn("[invoice] logo embedding failed", error);
      return null;
    });
  }
  return logoPromise;
}

function escapePdfText(value: string): string {
  return value
    .replace(/€/g, "\x80")
    .replace(/[\\()\r\n]/g, (character) => ({ "\\": "\\\\", "(": "\\(", ")": "\\)", "\r": " ", "\n": " " }[character] ?? " "))
    .replace(/[^\x20-\x7e\x80-\xff]/g, "?");
}

function wrap(value: string, maxLength: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && current.length + word.length + 1 > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function pdfText(font: string, size: number, x: number, y: number, value: string): string {
  return `BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`;
}

function rightText(font: string, size: number, right: number, y: number, value: string): string {
  return pdfText(font, size, right - value.length * size * 0.52, y, value);
}

function pdfMoney(value: string, currency: InvoiceDocument["currency"]): string {
  return formatInvoiceMoney(value, currency);
}

export async function buildInvoicePdf(invoice: InvoiceDocument): Promise<Buffer> {
  const logo = await loadLogo();
  const totals = calculateInvoiceTotals(invoice);
  const lines: string[] = [];
  const margin = 48;
  const right = 547;

  if (logo) lines.push(`q ${logo.width} 0 0 ${logo.height} ${margin} 758 cm /Im1 Do Q`);
  else {
    lines.push(pdfText("F2", 18, margin, 774, "Salt &"));
    lines.push(pdfText("F2", 18, margin + 58, 774, "Peps"));
  }
  lines.push(
    rightText("F2", 25, right, 782, "INVOICE"),
    rightText("F2", 10, right, 754, `#${invoice.invoiceNumber || "—"}`),
    rightText("F1", 9, right, 738, `Issued ${invoice.issueDate || "—"}`),
  );
  if (invoice.dueDate) lines.push(rightText("F1", 9, right, 723, `Due ${invoice.dueDate}`));
  lines.push(rightText("F1", 9, right, 708, invoice.status.toUpperCase()));
  let sellerY = 744;
  if (invoice.seller.name) lines.push(pdfText("F2", 10, margin, sellerY, invoice.seller.name));
  sellerY -= 14;
  for (const value of [...invoice.seller.addressLines, invoice.seller.email, invoice.seller.phone].filter((value): value is string => Boolean(value))) {
    lines.push(pdfText("F1", 8, margin, sellerY, value));
    sellerY -= 12;
  }
  lines.push("0.85 0.88 0.92 RG 0.6 w 48 694 m 547 694 l S");

  lines.push(
    pdfText("F2", 8, margin, 668, "BILL TO"),
    pdfText("F2", 10, margin, 649, invoice.customer.name || "Customer"),
    rightText("F2", 8, right, 668, "CURRENCY"),
    rightText("F2", 10, right, 649, invoice.currency),
  );
  let customerY = 634;
  for (const value of [...invoice.customer.addressLines, invoice.customer.email, invoice.customer.phone].filter((value): value is string => Boolean(value))) {
    lines.push(pdfText("F1", 8, margin, customerY, value));
    customerY -= 12;
  }
  lines.push(
    rightText("F1", 8, right, 634, `${invoice.lineItems.length} line item${invoice.lineItems.length === 1 ? "" : "s"}`),
    "0.85 0.88 0.92 RG 0.6 w 48 580 m 547 580 l S",
    pdfText("F2", 7, margin, 558, "DESCRIPTION"),
    rightText("F2", 7, 389, 558, "QTY"),
    rightText("F2", 7, 461, 558, "UNIT"),
    rightText("F2", 7, right, 558, "AMOUNT"),
    "0.85 0.88 0.92 RG 0.6 w 48 548 m 547 548 l S",
  );

  let itemY = 530;
  for (const item of invoice.lineItems) {
    const detail = [
      ...wrap(item.description || "Untitled item", 43),
      ...(invoice.showTax ? [`${Number(item.taxRate) || 0}% tax`] : []),
      ...(Number(item.discount) > 0 ? [`${invoice.showTax ? " · " : ""}${item.discount}% discount`] : []),
    ];
    const detailLines = detail.slice(0, 3);
    detailLines.forEach((line, index) => lines.push(pdfText(index === 0 ? "F2" : "F1", index === 0 ? 8 : 7, margin, itemY - index * 11, line)));
    lines.push(
      rightText("F1", 8, 389, itemY, item.quantity || "0"),
      rightText("F1", 8, 461, itemY, pdfMoney(item.unitPrice, invoice.currency)),
      rightText("F2", 8, right, itemY, pdfMoney(calculateInvoiceLineItemTotal(item), invoice.currency)),
      "0.91 0.92 0.94 RG 0.4 w 48 " + (itemY - 32 - (detailLines.length - 1) * 11).toFixed(2) + " m 547 " + (itemY - 32 - (detailLines.length - 1) * 11).toFixed(2) + " l S",
    );
    itemY -= 46 + (detailLines.length - 1) * 11;
  }

  const summaryY = Math.max(245, itemY - 4);
  lines.push(
    rightText("F1", 9, 455, summaryY, "Subtotal"),
    rightText("F1", 9, right, summaryY, pdfMoney(totals.subtotal, invoice.currency)),
  );
  let totalY = summaryY - 20;
  if (invoice.showTax) {
    lines.push(
      rightText("F1", 9, 455, totalY, "Tax"),
      rightText("F1", 9, right, totalY, pdfMoney(totals.totalTax, invoice.currency)),
    );
    totalY -= 20;
  }
  lines.push(
    rightText("F1", 9, 455, totalY, "Shipping"),
    rightText("F1", 9, right, totalY, pdfMoney(invoice.shippingCost, invoice.currency)),
    "0.10 0.12 0.16 RG 1 w 350 " + (totalY - 13).toFixed(2) + " m 547 " + (totalY - 13).toFixed(2) + " l S",
    rightText("F2", 12, 455, totalY - 34, "Total"),
    rightText("F2", 12, right, totalY - 34, pdfMoney(totals.total, invoice.currency)),
  );

  let footerY = 105;
  for (const [label, value] of [["Notes", invoice.notes], ["Terms", invoice.terms]] as const) {
    if (!value) continue;
    lines.push(pdfText("F2", 8, margin, footerY, label.toUpperCase()));
    for (const line of wrap(value, 92).slice(0, 3)) {
      footerY -= 12;
      lines.push(pdfText("F1", 8, margin, footerY, line));
    }
    footerY -= 18;
  }

  const content = Buffer.from(lines.join("\n"), "latin1");
  const imageObjectId = 7;
  const pageResources = logo
    ? `/Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 ${imageObjectId} 0 R >> >>`
    : "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>";
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ${pageResources} /Contents 6 0 R >>`),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
    Buffer.concat([
      Buffer.from(`<< /Length ${content.length + 1} >>\nstream\n`, "latin1"),
      content,
      Buffer.from("\nendstream", "latin1"),
    ]),
  ];
  if (logo) {
    objects.push(Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.data.length + 1} >>\nstream\n`, "latin1"),
      logo.data,
      Buffer.from("\nendstream", "latin1"),
    ]));
  }

  let pdf = Buffer.from("%PDF-1.4\n", "latin1");
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, Buffer.from(`${index + 1} 0 obj\n`, "latin1"), object, Buffer.from("\nendobj\n", "latin1")]);
  });
  const xrefOffset = pdf.length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) trailer += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.concat([pdf, Buffer.from(trailer, "latin1")]);
}