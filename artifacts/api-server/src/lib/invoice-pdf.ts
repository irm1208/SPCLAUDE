import type { InvoiceDocument } from "./invoice";

function escapePdfText(value: string): string {
  return value.replace(/[\\()\r\n]/g, (character) => ({ "\\": "\\\\", "(": "\\(", ")": "\\)", "\r": " ", "\n": " " }[character] ?? " "));
}

export function buildInvoicePdf(invoice: InvoiceDocument): Buffer {
  const lines: string[] = [
    "BT /F1 24 Tf 50 790 Td (INVOICE) Tj ET",
    `BT /F1 11 Tf 50 765 Td (${escapePdfText(invoice.seller.name || "Seller")} ) Tj ET`,
    `BT /F1 10 Tf 390 790 Td (Invoice ${escapePdfText(invoice.invoiceNumber)}) Tj ET`,
    `BT /F1 10 Tf 390 774 Td (Issued ${escapePdfText(invoice.issueDate)}) Tj ET`,
    `BT /F1 10 Tf 390 758 Td (Status ${escapePdfText(invoice.status)}) Tj ET`,
    "BT /F1 10 Tf 50 720 Td (Bill to:) Tj ET",
    `BT /F1 10 Tf 50 704 Td (${escapePdfText(invoice.customer.name)}) Tj ET`,
  ];
  let y = 688;
  for (const addressLine of invoice.customer.addressLines) {
    lines.push(`BT /F1 9 Tf 50 ${y} Td (${escapePdfText(addressLine)}) Tj ET`);
    y -= 13;
  }
  if (invoice.customer.email) {
    lines.push(`BT /F1 9 Tf 50 ${y} Td (${escapePdfText(invoice.customer.email)}) Tj ET`);
    y -= 13;
  }
  lines.push(
    "BT /F1 9 Tf 50 620 Td (Description) Tj ET",
    "BT /F1 9 Tf 300 620 Td (Qty) Tj ET",
    "BT /F1 9 Tf 350 620 Td (Unit) Tj ET",
    "BT /F1 9 Tf 450 620 Td (Amount) Tj ET",
    "50 612 m 545 612 l S",
  );
  y = 594;
  for (const item of invoice.lineItems) {
    if (y < 150) break;
    const net = Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discount) / 100);
    lines.push(
      `BT /F1 9 Tf 50 ${y} Td (${escapePdfText(item.description)}) Tj ET`,
      `BT /F1 9 Tf 300 ${y} Td (${escapePdfText(item.quantity)}) Tj ET`,
      `BT /F1 9 Tf 350 ${y} Td (${escapePdfText(item.unitPrice)}) Tj ET`,
      `BT /F1 9 Tf 450 ${y} Td (${net.toFixed(2)}) Tj ET`,
    );
    y -= 17;
  }
  lines.push(
    `BT /F1 10 Tf 350 ${y - 10} Td (Subtotal) Tj ET`,
    `BT /F1 10 Tf 470 ${y - 10} Td (${escapePdfText(invoice.subtotal)} ${invoice.currency}) Tj ET`,
    `BT /F1 10 Tf 350 ${y - 27} Td (Tax) Tj ET`,
    `BT /F1 10 Tf 470 ${y - 27} Td (${escapePdfText(invoice.totalTax)} ${invoice.currency}) Tj ET`,
    `BT /F1 12 Tf 350 ${y - 52} Td (Total) Tj ET`,
    `BT /F1 12 Tf 470 ${y - 52} Td (${escapePdfText(invoice.total)} ${invoice.currency}) Tj ET`,
  );
  let footerY = Math.max(70, y - 90);
  for (const [label, value] of [["Notes", invoice.notes], ["Terms", invoice.terms]] as const) {
    if (!value) continue;
    lines.push(`BT /F1 9 Tf 50 ${footerY} Td (${label}: ${escapePdfText(value)}) Tj ET`);
    footerY -= 15;
  }

  const content = lines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
