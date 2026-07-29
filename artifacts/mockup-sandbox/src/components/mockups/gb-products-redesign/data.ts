export type StockValue = number | null;

export type ProductStatus = "live" | "paused" | "low-stock" | "out-of-stock";

export type ImportStatus = "new" | "duplicate" | "price-changed";

export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  vendor: string;
  category: string;
  mgSize: string;
  price: number;
  stock: StockValue;
  maxPerCustomer: number | null;
  halfKitEnabled: boolean;
  visible: boolean;
  lastEdited: string;
}

export interface ProductFilters {
  query: string;
  vendor: string;
  category: string;
  stock: "all" | "available" | "low" | "out" | "unlimited";
}

export type ImportCandidate = Pick<ProductRecord, "name" | "vendor" | "mgSize" | "price">;

export type ImportReviewRow = ImportCandidate & {
  id: string;
  status: ImportStatus;
  existingPrice?: number;
  included: boolean;
};

export const GROUP_BUY_NAME = "Winter Peptide Run 2025";

export const VENDORS = [
  "QSC",
  "Amino Asylum",
  "Peptide Sciences",
  "Chilton",
  "Unassigned",
] as const;

export const CATEGORIES = [
  "GLP-1",
  "Healing",
  "Growth hormone",
  "Nootropics",
  "Other",
] as const;

type ProductTemplate = {
  name: string;
  description: string;
  category: string;
  sizes: readonly string[];
  price: number;
};

const PRODUCT_TEMPLATES: readonly ProductTemplate[] = [
  { name: "Semaglutide", description: "GLP-1 research peptide", category: "GLP-1", sizes: ["5 mg", "10 mg"], price: 42 },
  { name: "Tirzepatide", description: "Dual incretin research peptide", category: "GLP-1", sizes: ["5 mg", "10 mg", "15 mg"], price: 48 },
  { name: "Retatrutide", description: "Triple agonist research peptide", category: "GLP-1", sizes: ["5 mg", "10 mg"], price: 55 },
  { name: "BPC-157", description: "Tissue-repair research peptide", category: "Healing", sizes: ["5 mg", "10 mg"], price: 28.5 },
  { name: "TB-500", description: "Thymosin beta research peptide", category: "Healing", sizes: ["5 mg", "10 mg"], price: 31 },
  { name: "GHK-Cu", description: "Copper peptide for laboratory research", category: "Healing", sizes: ["50 mg", "100 mg"], price: 24 },
  { name: "CJC-1295 DAC", description: "Growth-hormone releasing peptide", category: "Growth hormone", sizes: ["2 mg", "5 mg"], price: 38 },
  { name: "Ipamorelin", description: "Selective growth-hormone secretagogue", category: "Growth hormone", sizes: ["2 mg", "5 mg"], price: 29 },
  { name: "Sermorelin", description: "Growth-hormone releasing factor", category: "Growth hormone", sizes: ["2 mg", "5 mg"], price: 33 },
  { name: "Tesamorelin", description: "Growth-hormone analogue for research", category: "Growth hormone", sizes: ["2 mg", "5 mg"], price: 46 },
  { name: "Selank", description: "Nootropic peptide for laboratory research", category: "Nootropics", sizes: ["5 mg", "10 mg"], price: 22 },
  { name: "Semax", description: "Nootropic peptide for laboratory research", category: "Nootropics", sizes: ["5 mg", "10 mg"], price: 23 },
  { name: "Dihexa", description: "Cognitive research compound", category: "Nootropics", sizes: ["5 mg", "10 mg"], price: 36 },
  { name: "NAD+", description: "Cellular cofactor research material", category: "Other", sizes: ["500 mg", "1000 mg"], price: 27 },
  { name: "Glutathione", description: "Antioxidant research material", category: "Other", sizes: ["600 mg", "1200 mg"], price: 26 },
  { name: "MOTS-c", description: "Mitochondrial-derived research peptide", category: "Other", sizes: ["5 mg", "10 mg"], price: 41 },
  { name: "PT-141", description: "Melanocortin research peptide", category: "Other", sizes: ["10 mg", "20 mg"], price: 32 },
  { name: "Melanotan II", description: "Melanocortin analogue for research", category: "Other", sizes: ["10 mg", "20 mg"], price: 30 },
  { name: "Oxytocin", description: "Peptide hormone research material", category: "Other", sizes: ["2 mg", "5 mg"], price: 25 },
  { name: "KPV", description: "Short-chain anti-inflammatory research peptide", category: "Healing", sizes: ["5 mg", "10 mg"], price: 21 },
];

function createProducts(): ProductRecord[] {
  return Array.from({ length: 120 }, (_, index) => {
    const template = PRODUCT_TEMPLATES[index % PRODUCT_TEMPLATES.length];
    const cycle = Math.floor(index / PRODUCT_TEMPLATES.length);
    const sequence = String(cycle + 1).padStart(2, "0");
    const stock: StockValue =
      index % 17 === 0
        ? 0
        : index % 11 === 0
          ? null
          : index % 9 === 0
            ? 4
            : 8 + ((index * 7) % 40);

    return {
      id: `prod-${String(index + 1).padStart(3, "0")}`,
      name: `${template.name} ${sequence}`,
      description: `${template.description}; ${template.sizes[cycle % template.sizes.length]} presentation.`,
      vendor: VENDORS[index % VENDORS.length],
      category: template.category,
      mgSize: template.sizes[cycle % template.sizes.length],
      price: Number((template.price + cycle * 2.75).toFixed(2)),
      stock,
      maxPerCustomer: index % 7 === 0 ? (index % 4) + 1 : null,
      halfKitEnabled: index % 6 === 0,
      visible: index % 13 !== 0,
      lastEdited: new Date(Date.UTC(2025, 10, 1 + index)).toISOString(),
    };
  });
}

export const SAMPLE_PRODUCTS = createProducts();
