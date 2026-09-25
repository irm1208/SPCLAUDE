import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import {
  extractGroupBuyProductsFromFile,
  normalizeGroupBuyImportRows,
  parseGroupBuyDelimitedText,
  parseGroupBuyWorkbook,
} from "../group-buy-product-import";

describe("group-buy product import extraction", () => {
  it("maps reordered headers and quoted CSV cells", () => {
    expect(parseGroupBuyDelimitedText(
      'Vendor,Price,Product Name,Category,Size,Stock\nVendor A,"£1,234.50","BPC, 10mg",Peptide,10 mg,12',
    )).toEqual([{
      name: "BPC, 10mg",
      price: 1234.5,
      vendor: "Vendor A",
      category: "Peptide",
      mgSize: "10 mg",
      stock: 12,
    }]);
  });

  it("normalizes a decimal comma without converting currencies", () => {
    expect(parseGroupBuyDelimitedText(
      "Supplier;Amount;Item\nVendor A;1.234,50 €;BPC-157",
    )[0]).toMatchObject({ name: "BPC-157", vendor: "Vendor A", price: 1234.5 });
  });

  it("keeps missing and malformed prices unresolved", () => {
    const rows = parseGroupBuyDelimitedText(
      'Product,Price,Vendor\nBPC-157,,Vendor A\nTB-500,about ten,Vendor B\nGHK-Cu,"1,2,3",Vendor C',
    );
    expect(rows.map(row => row.price)).toEqual([null, null, null]);
  });

  it("maps XLSX cells through the same header and price normalizer", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Price list");
    sheet.addRow(["Vendor", "Product Name", "Price"]);
    sheet.addRow(["Vendor A", "BPC-157", 12.5]);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    expect(await parseGroupBuyWorkbook(bytes)).toMatchObject([
      { name: "BPC-157", price: 12.5, vendor: "Vendor A" },
    ]);
  });

  it("does not replace an AI-extracted missing price with zero", () => {
    expect(normalizeGroupBuyImportRows([
      { name: "BPC-157", price: null, vendor: "Vendor A" },
    ])[0].price).toBeNull();
  });

  it("passes DOCX text, not DOCX bytes, to AI", async () => {
    const extractDocxText = vi.fn().mockResolvedValue({ value: "BPC-157; price unreadable; Vendor A" });
    const aiExtract = vi.fn().mockResolvedValue([
      { name: "BPC-157", price: null, vendor: "Vendor A" },
    ]);
    const rows = await extractGroupBuyProductsFromFile({
      fileName: "price-list.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileBase64: Buffer.from("docx").toString("base64"),
    }, aiExtract, { extractDocxText });
    expect(extractDocxText).toHaveBeenCalled();
    expect(aiExtract).toHaveBeenCalledWith({
      mimeType: "text/plain",
      text: "BPC-157; price unreadable; Vendor A",
    });
    expect(rows[0].price).toBeNull();
  });
});