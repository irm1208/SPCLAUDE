import { existsSync } from "node:fs";
import { deflateSync } from "node:zlib";
import path from "node:path";
import {
  calculateInvoiceLineItemTotal,
  calculateInvoiceTotals,
  formatInvoiceMoney,
  type InvoiceDocument,
} from "./invoice";

type LogoImage = { data: Buffer; width: number; height: number; displayWidth: number; displayHeight: number };

let logoPromise: Promise<LogoImage | null> | undefined;

async function loadLogo(): Promise<LogoImage | null> {
  if (!logoPromise) {
    logoPromise = (async () => {
      const candidates = [
        path.resolve(process.cwd(), "artifacts/peps-anonymous/public/brand/salt-peps-logo-1440.png"),
        path.resolve(process.cwd(), "../peps-anonymous/public/brand/salt-peps-logo-1440.png"),
        path.resolve(process.cwd(), "artifacts/peps-anonymous/dist/public/brand/salt-peps-logo-1440.png"),
      ];
      const logoPath = candidates.find((candidate) => existsSync(candidate));
      if (!logoPath) return null;
      const { default: sharp } = await import("sharp");
      const result = await sharp(logoPath)
        .resize({ width: 160, height: 36, fit: "inside" })
        .flatten({ background: "#ffffff" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return {
        data: deflateSync(result.data),
        width: result.info.width,
        height: result.info.height,
        displayWidth: result.info.width * (595 / 620),
        displayHeight: result.info.height * (595 / 620),
      };
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

function textWidth(value: string, size: number, bold = false): number {
  let units = 0;
  for (const character of value) {
    if ("ilI.,'`!:;|".includes(character)) units += 0.25;
    else if ("mwMW@%&".includes(character)) units += 0.82;
    else if (character === " ") units += 0.28;
    else if (/[A-Z0-9]/.test(character)) units += 0.61;
    else units += 0.51;
  }
  return units * size * (bold ? 1.035 : 1);
}

function wrap(value: string, maxWidth: number, size: number, bold = false): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  const addWord = (word: string) => {
    if (current && textWidth(`${current} ${word}`, size, bold) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  };
  for (const originalWord of words) {
    let word = originalWord;
    while (textWidth(word, size, bold) > maxWidth) {
      let splitAt = 1;
      while (splitAt < word.length && textWidth(word.slice(0, splitAt + 1), size, bold) <= maxWidth) splitAt += 1;
      addWord(word.slice(0, splitAt));
      lines.push(current);
      current = "";
      word = word.slice(splitAt);
    }
    if (word) addWord(word);
  }
  if (current) lines.push(current);
  return lines;
}

function wrappedParagraphs(value: string, maxWidth: number, size: number): string[] {
  return value.split(/\r?\n/).flatMap((paragraph) => wrap(paragraph, maxWidth, size));
}

function pdfText(font: string, size: number, x: number, y: number, value: string, color = "0.059 0.09 0.165"): string {
  return `${color} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`;
}

function rightText(font: string, size: number, right: number, y: number, value: string, color?: string): string {
  return pdfText(font, size, right - textWidth(value, size, font === "F2"), y, value, color);
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number): string {
  const k = radius * 0.55228475;
  return [
    `${(x + radius).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x + width - radius).toFixed(2)} ${y.toFixed(2)} l`,
    `${(x + width - radius + k).toFixed(2)} ${y.toFixed(2)} ${(x + width).toFixed(2)} ${(y + radius - k).toFixed(2)} ${(x + width).toFixed(2)} ${(y + radius).toFixed(2)} c`,
    `${(x + width).toFixed(2)} ${(y + height - radius).toFixed(2)} l`,
    `${(x + width).toFixed(2)} ${(y + height - radius + k).toFixed(2)} ${(x + width - radius + k).toFixed(2)} ${(y + height).toFixed(2)} ${(x + width - radius).toFixed(2)} ${(y + height).toFixed(2)} c`,
    `${(x + radius).toFixed(2)} ${(y + height).toFixed(2)} l`,
    `${(x + radius - k).toFixed(2)} ${(y + height).toFixed(2)} ${x.toFixed(2)} ${(y + height - radius + k).toFixed(2)} ${x.toFixed(2)} ${(y + height - radius).toFixed(2)} c`,
    `${x.toFixed(2)} ${(y + radius).toFixed(2)} l`,
    `${x.toFixed(2)} ${(y + radius - k).toFixed(2)} ${(x + radius - k).toFixed(2)} ${y.toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c h`,
  ].join(" ");
}

function pdfMoney(value: string, currency: InvoiceDocument["currency"]): string {
  return formatInvoiceMoney(value, currency);
}

export async function buildInvoicePdf(invoice: InvoiceDocument): Promise<Buffer> {
  const logo = await loadLogo();
  const totals = calculateInvoiceTotals(invoice);
  const lines: string[] = [];
  const scale = 595 / 620;
  const margin = 40 * scale;
  const right = 595 - margin;
  const muted = "0.392 0.455 0.545";
  const subtle = "0.58 0.639 0.722";
  const rule = "0.886 0.91 0.941";
  const top = 842 - margin;

  if (logo) {
    lines.push(`q ${logo.displayWidth.toFixed(2)} 0 0 ${logo.displayHeight.toFixed(2)} ${margin.toFixed(2)} ${(top - logo.displayHeight).toFixed(2)} cm /Im1 Do Q`);
  }
  else {
    const logoY = top - 24;
    lines.push(pdfText("F2", 19, margin, logoY, "Salt "));
    const saltWidth = textWidth("Salt ", 19, true);
    lines.push(pdfText("F2", 19, margin + saltWidth, logoY, "&", "0.145 0.388 0.922"));
    lines.push(pdfText("F2", 19, margin + saltWidth + textWidth("&", 19, true), logoY, " Peps"));
  }
  const logoHeight = logo?.displayHeight ?? 34.5;
  const sellerNameY = top - logoHeight - 16;
  lines.push(
    rightText("F2", 23, right, top - 23, "INVOICE", "0.008 0.023 0.071"),
    rightText("F2", 10, right, top - 50, `#${invoice.invoiceNumber || "—"}`),
    rightText("F1", 8.5, right, top - 67, `Issued ${invoice.issueDate || "—"}`, muted),
  );
  let lastMetaY = top - 67;
  if (invoice.dueDate) {
    lastMetaY -= 14;
    lines.push(rightText("F1", 8.5, right, lastMetaY, `Due ${invoice.dueDate}`, muted));
  }
  const status = invoice.status.toUpperCase();
  const pillWidth = textWidth(status, 7.5, true) + 20;
  const pillY = lastMetaY - 28;
  lines.push(`0.945 0.961 0.976 rg ${roundedRect(right - pillWidth, pillY, pillWidth, 18, 9)} f`);
  lines.push(rightText("F2", 7.5, right - 10, pillY + 5.7, status, muted));

  let sellerY = sellerNameY;
  const sellerDetails = [
    ...invoice.seller.addressLines,
    invoice.seller.email,
    invoice.seller.phone,
    invoice.seller.taxId ? `Tax ID: ${invoice.seller.taxId}` : "",
  ].filter((value): value is string => Boolean(value));
  for (const value of sellerDetails) {
    lines.push(pdfText("F1", 8, margin, sellerY, value, muted));
    sellerY -= 11;
  }
  const sellerBottom = sellerDetails.length ? sellerY + 8 : sellerNameY - 4;
  const headerBottom = Math.min(sellerBottom, pillY) - 23;
  lines.push(`${rule} RG 0.6 w ${margin.toFixed(2)} ${headerBottom.toFixed(2)} m ${right.toFixed(2)} ${headerBottom.toFixed(2)} l S`);

  const billTitleY = headerBottom - 30;
  const customerNameY = billTitleY - 20;
  lines.push(
    pdfText("F2", 7, margin, billTitleY, "BILL TO", subtle),
    pdfText("F2", 10, margin, customerNameY, invoice.customer.name || "Customer"),
    rightText("F2", 7, right, billTitleY, "CURRENCY", subtle),
    rightText("F2", 10, right, customerNameY, invoice.currency),
  );
  let customerY = customerNameY - 15;
  const customerDetails = [...invoice.customer.addressLines, invoice.customer.email, invoice.customer.phone]
    .filter((value): value is string => Boolean(value));
  for (const value of customerDetails) {
    lines.push(pdfText("F1", 8, margin, customerY, value, muted));
    customerY -= 11;
  }
  lines.push(rightText("F1", 8, right, customerNameY - 15, `${invoice.lineItems.length} line item${invoice.lineItems.length === 1 ? "" : "s"}`, muted));
  const customerBottom = customerDetails.length ? customerY + 8 : customerNameY - 3;
  const billBottom = Math.min(customerBottom, customerNameY - 18) - 23;
  const tableHeaderY = billBottom - 29;
  const qtyRight = margin + 352;
  const unitRight = margin + 425;
  lines.push(
    `${rule} RG 0.6 w ${margin.toFixed(2)} ${billBottom.toFixed(2)} m ${right.toFixed(2)} ${billBottom.toFixed(2)} l S`,
    pdfText("F2", 7, margin, tableHeaderY, "DESCRIPTION", subtle),
    rightText("F2", 7, qtyRight, tableHeaderY, "QTY", subtle),
    rightText("F2", 7, unitRight, tableHeaderY, "UNIT", subtle),
    rightText("F2", 7, right, tableHeaderY, "AMOUNT", subtle),
    `${rule} RG 0.6 w ${margin.toFixed(2)} ${(tableHeaderY - 10).toFixed(2)} m ${right.toFixed(2)} ${(tableHeaderY - 10).toFixed(2)} l S`,
  );

  let itemY = tableHeaderY - 29;
  const descriptionWidth = 304;
  for (const item of invoice.lineItems) {
    const descriptionLines = wrap(item.description || "Untitled item", descriptionWidth, 8, true);
    descriptionLines.forEach((line, index) => lines.push(pdfText("F2", 8, margin, itemY - index * 11, line)));
    const metadata = [
      invoice.showTax ? `${Number(item.taxRate) || 0}% tax` : "",
      Number(item.discount) > 0 ? `${item.discount}% discount` : "",
    ].filter(Boolean).join(" · ");
    const metadataY = itemY - descriptionLines.length * 11;
    if (metadata) lines.push(pdfText("F1", 7, margin, metadataY, metadata, subtle));
    lines.push(
      rightText("F1", 8, qtyRight, itemY, item.quantity || "0", muted),
      rightText("F1", 8, unitRight, itemY, pdfMoney(item.unitPrice, invoice.currency), muted),
      rightText("F2", 8, right, itemY, pdfMoney(calculateInvoiceLineItemTotal(item), invoice.currency)),
    );
    const rowBottom = (metadata ? metadataY : itemY - (descriptionLines.length - 1) * 11) - 13;
    lines.push(`0.945 0.961 0.976 RG 0.4 w ${margin.toFixed(2)} ${rowBottom.toFixed(2)} m ${right.toFixed(2)} ${rowBottom.toFixed(2)} l S`);
    itemY = rowBottom - 16;
  }

  const summaryY = itemY - 16;
  const summaryLeft = right - 230;
  lines.push(
    pdfText("F1", 8.5, summaryLeft, summaryY, "Subtotal", muted),
    rightText("F1", 8.5, right, summaryY, pdfMoney(totals.subtotal, invoice.currency), muted),
  );
  let totalY = summaryY - 19;
  if (invoice.showTax) {
    lines.push(
      pdfText("F1", 8.5, summaryLeft, totalY, "Tax", muted),
      rightText("F1", 8.5, right, totalY, pdfMoney(totals.totalTax, invoice.currency), muted),
    );
    totalY -= 19;
  }
  lines.push(
    pdfText("F1", 8.5, summaryLeft, totalY, "Shipping", muted),
    rightText("F1", 8.5, right, totalY, pdfMoney(invoice.shippingCost, invoice.currency), muted),
    `0.059 0.09 0.165 RG 1 w ${summaryLeft.toFixed(2)} ${(totalY - 13).toFixed(2)} m ${right.toFixed(2)} ${(totalY - 13).toFixed(2)} l S`,
    pdfText("F2", 13, summaryLeft, totalY - 36, "Total"),
    rightText("F2", 13, right, totalY - 36, pdfMoney(totals.total, invoice.currency)),
  );

  const footerSections = ([["Notes", invoice.notes], ["Terms", invoice.terms]] as const)
    .filter((section) => Boolean(section[1]))
    .map(([label, value]) => ({ label, lines: wrappedParagraphs(value, right - margin, 8) }));
  if (footerSections.length) {
    const footerHeight = 20 + footerSections.reduce((height, section) => height + 14 + section.lines.length * 11 + 10, 0);
    const preferredTop = margin + footerHeight;
    let footerY = Math.min(totalY - 64, preferredTop);
    lines.push(`${rule} RG 0.6 w ${margin.toFixed(2)} ${footerY.toFixed(2)} m ${right.toFixed(2)} ${footerY.toFixed(2)} l S`);
    footerY -= 19;
    for (const section of footerSections) {
      lines.push(pdfText("F2", 8, margin, footerY, section.label, "0.2 0.255 0.333"));
      footerY -= 12;
      for (const line of section.lines) {
        lines.push(pdfText("F1", 8, margin, footerY, line, muted));
        footerY -= 11;
      }
      footerY -= 10;
    }
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