export interface SteroidCompound {
  name: string;
  halfLifeDays: number;
  defaultDose: number;
  defaultFreqH: number;
  color: string;
  category: "AAS/TRT" | "AAS" | "Support" | "PCT";
}

export const STEROID_COMPOUNDS: SteroidCompound[] = [
  { name: "Testosterone Enanthate",        halfLifeDays: 4.5,  defaultDose: 250,  defaultFreqH: 84,  color: "#2D6BCC", category: "AAS/TRT" },
  { name: "Testosterone Cypionate",         halfLifeDays: 8.0,  defaultDose: 250,  defaultFreqH: 84,  color: "#3B82F6", category: "AAS/TRT" },
  { name: "Testosterone Propionate",        halfLifeDays: 0.8,  defaultDose: 100,  defaultFreqH: 48,  color: "#0EA5E9", category: "AAS/TRT" },
  { name: "Testosterone Undecanoate",       halfLifeDays: 21.0, defaultDose: 750,  defaultFreqH: 504, color: "#06B6D4", category: "AAS/TRT" },
  { name: "Testosterone Suspension",        halfLifeDays: 0.08, defaultDose: 50,   defaultFreqH: 24,  color: "#0284C7", category: "AAS/TRT" },
  { name: "NPP (Nandrolone PP)",            halfLifeDays: 2.5,  defaultDose: 100,  defaultFreqH: 56,  color: "#10B981", category: "AAS"     },
  { name: "Nandrolone Decanoate (Deca)",    halfLifeDays: 7.0,  defaultDose: 200,  defaultFreqH: 84,  color: "#059669", category: "AAS"     },
  { name: "Trenbolone Acetate",             halfLifeDays: 1.0,  defaultDose: 50,   defaultFreqH: 48,  color: "#F59E0B", category: "AAS"     },
  { name: "Trenbolone Enanthate",           halfLifeDays: 5.5,  defaultDose: 200,  defaultFreqH: 84,  color: "#D97706", category: "AAS"     },
  { name: "Boldenone Undecylenate (EQ)",    halfLifeDays: 14.0, defaultDose: 300,  defaultFreqH: 84,  color: "#8B5CF6", category: "AAS"     },
  { name: "Masteron Propionate",            halfLifeDays: 1.5,  defaultDose: 100,  defaultFreqH: 48,  color: "#EC4899", category: "AAS"     },
  { name: "Masteron Enanthate",             halfLifeDays: 5.0,  defaultDose: 200,  defaultFreqH: 84,  color: "#BE185D", category: "AAS"     },
  { name: "Primobolan Enanthate",           halfLifeDays: 5.0,  defaultDose: 200,  defaultFreqH: 84,  color: "#6366F1", category: "AAS"     },
  { name: "Stanozolol (Injectable)",        halfLifeDays: 1.0,  defaultDose: 50,   defaultFreqH: 48,  color: "#EAB308", category: "AAS"     },
  { name: "Anavar (Oxandrolone)",           halfLifeDays: 0.4,  defaultDose: 50,   defaultFreqH: 12,  color: "#F97316", category: "AAS"     },
  { name: "Dianabol (Methandrostenolone)",  halfLifeDays: 0.25, defaultDose: 30,   defaultFreqH: 8,   color: "#EF4444", category: "AAS"     },
  { name: "HCG",                            halfLifeDays: 1.25, defaultDose: 500,  defaultFreqH: 84,  color: "#64748B", category: "Support" },
  { name: "Gonadorelin",                    halfLifeDays: 0.04, defaultDose: 100,  defaultFreqH: 24,  color: "#7C3AED", category: "Support" },
  { name: "Anastrozole (Arimidex)",         halfLifeDays: 2.0,  defaultDose: 0.5,  defaultFreqH: 48,  color: "#94A3B8", category: "Support" },
  { name: "Exemestane (Aromasin)",          halfLifeDays: 1.0,  defaultDose: 25,   defaultFreqH: 48,  color: "#A8A29E", category: "Support" },
  { name: "Tamoxifen (Nolvadex)",           halfLifeDays: 6.0,  defaultDose: 20,   defaultFreqH: 24,  color: "#78716C", category: "PCT"     },
  { name: "Clomiphene (Clomid)",            halfLifeDays: 5.0,  defaultDose: 50,   defaultFreqH: 24,  color: "#A78BFA", category: "PCT"     },
];

export const STEROID_CATEGORIES = ["AAS/TRT", "AAS", "Support", "PCT"] as const;

export const PLOT_COLORS = [
  "#2D6BCC","#10B981","#F59E0B","#8B5CF6","#EC4899","#EF4444",
  "#06B6D4","#6366F1","#D97706","#059669","#0EA5E9","#BE185D",
] as const;
