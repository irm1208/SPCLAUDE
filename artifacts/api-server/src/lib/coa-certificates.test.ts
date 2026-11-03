import { describe, expect, it } from "vitest";
import { validateCoaPdf, COA_PDF_LIMIT } from "./coa-certificates";

describe("private COA PDF validation", () => {
  it("accepts a PDF and rejects extension/MIME spoofing, empty and oversized files", async () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    await expect(validateCoaPdf(pdf, "certificate.pdf", "application/pdf")).resolves.toBeUndefined();
    await expect(validateCoaPdf(Buffer.from("not a PDF"), "report.pdf", "application/pdf")).rejects.toThrow("PDF");
    await expect(validateCoaPdf(pdf, "report.html", "application/pdf")).rejects.toThrow("PDF");
    await expect(validateCoaPdf(pdf, "report.pdf", "text/html")).rejects.toThrow("PDF");
    await expect(validateCoaPdf(Buffer.alloc(0), "report.pdf", "application/pdf")).rejects.toThrow();
    await expect(validateCoaPdf(Buffer.alloc(COA_PDF_LIMIT + 1), "report.pdf", "application/pdf")).rejects.toThrow("10 MB");
  });
});
