import React, { useState, useMemo, useRef, useEffect } from "react";
import { useThemeStore } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FlaskConical, Upload, ClipboardList, MessageSquare,
  Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle,
  X, ExternalLink, Send, Plus, Settings, Activity, FileText, ArrowLeft,
  TrendingUp, Sparkles, Pencil, Check,
} from "lucide-react";
import { DatePickerField } from "@/components/DatePickerField";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceArea, ReferenceLine,
} from "recharts";
import {
  useBloodTests, useCreateBloodTest, useDeleteBloodTest, useBloodTestDiscuss,
  type BloodTestSession, type DiscussMessage,
} from "@/hooks/use-blood-tests";
import { useAccount } from "@/hooks/use-account";
import { parsePDFBiomarkers, type ParsedBiomarker } from "@/lib/parsePDF";
import { T } from "@/lib/theme";

// ─── Biomarker catalogue (37 markers with codes) ──────────────────────────────

type BiomarkerDef = {
  code: string; name: string; unit: string;
  refLow?: number; refHigh?: number; category: string;
  about?: string;
};

const BIOMARKER_CATALOG: BiomarkerDef[] = [
  { code: "TEST",  name: "Testosterone",                        unit: "nmol/L",        refLow: 12,    refHigh: 30,   category: "Hormones",   about: "The primary male sex hormone produced mainly in the testes. Critical for muscle mass, bone density, libido, and mood." },
  { code: "FTEST", name: "Free Testosterone",                   unit: "nmol/L",        refLow: 0.226, refHigh: 0.65, category: "Hormones",   about: "The unbound, biologically active form of testosterone available to bind to receptors and exert its effects on the body." },
  { code: "LH",    name: "Luteinising Hormone",                 unit: "U/l",           refLow: 1.7,   refHigh: 8.6,  category: "Hormones",   about: "Produced by the pituitary gland, LH signals the testes to produce testosterone. Suppressed by exogenous androgen use." },
  { code: "FSH",   name: "Follicle Stimulating Hormone",        unit: "U/l",           refLow: 1.5,   refHigh: 12.4, category: "Hormones",   about: "Regulates sperm production and is suppressed alongside LH during exogenous androgen use. Important for fertility assessment." },
  { code: "ESTR",  name: "Oestradiol",                          unit: "pmol/L",        refLow: 41,    refHigh: 159,  category: "Hormones",   about: "Estradiol is a form of estrogen that can rise when testosterone is converted to estrogen by the aromatase enzyme. High levels can cause side effects like water retention and gynecomastia." },
  { code: "PROL",  name: "Prolactin",                           unit: "mIU/L",         refLow: 86,    refHigh: 324,  category: "Hormones",   about: "A hormone that can be elevated due to certain medications or conditions. High levels can affect testosterone production and sexual function." },
  { code: "SHBG",  name: "Sex Hormone Binding Globulin",        unit: "nmol/L",        refLow: 10,    refHigh: 57,   category: "Hormones",   about: "A protein that binds to sex hormones. High SHBG reduces the amount of free testosterone available." },
  { code: "TSH",   name: "Thyroid Stimulating Hormone",         unit: "mIU/L",         refLow: 0.27,  refHigh: 4.2,  category: "Hormones",   about: "Controls thyroid hormone production. Elevated TSH may indicate hypothyroidism; low TSH may indicate hyperthyroidism." },
  { code: "FT4",   name: "Free Thyroxine",                      unit: "pmol/L",        refLow: 12,    refHigh: 22,   category: "Hormones",   about: "The active, unbound form of the thyroid hormone T4. Used alongside TSH to assess thyroid function comprehensively." },
  { code: "HCT",   name: "Haematocrit",                         unit: "%",             refLow: 40,    refHigh: 52,   category: "Hematology", about: "The percentage of red blood cells in total blood volume. Elevated by exogenous androgens; values above 52% carry cardiovascular risk." },
  { code: "HEMO",  name: "Haemoglobin",                         unit: "g/L",           refLow: 130,   refHigh: 180,  category: "Hematology", about: "The oxygen-carrying protein in red blood cells. Can be elevated by androgen use. Monitored alongside haematocrit." },
  { code: "RBC",   name: "Red Blood Cells",                     unit: "10^12/L",       refLow: 4.4,   refHigh: 6.5,  category: "Hematology", about: "The count of red blood cells per litre of blood. Elevated values increase blood viscosity and cardiovascular risk." },
  { code: "WBC",   name: "White Blood Cells",                   unit: "10^9/L",        refLow: 3,     refHigh: 11,   category: "Hematology", about: "Immune system cells. Persistent abnormalities may indicate infection, inflammation, or haematological conditions." },
  { code: "LYMPH", name: "Lymphocytes",                         unit: "10^9/L",        refLow: 1.5,   refHigh: 4.5,  category: "Hematology", about: "A type of white blood cell central to the immune response. Elevated in viral infections; low in some immunodeficiency states." },
  { code: "MONO",  name: "Monocytes",                           unit: "10^9/L",        refLow: 0.2,   refHigh: 0.8,  category: "Hematology", about: "White blood cells that differentiate into macrophages. Elevated levels can indicate chronic inflammation or infection." },
  { code: "NEUT",  name: "Neutrophils",                         unit: "10^9/L",        refLow: 2,     refHigh: 7.5,  category: "Hematology", about: "The most abundant white blood cells. Elevated in bacterial infections and inflammation; low values increase infection risk." },
  { code: "PLT",   name: "Platelets",                           unit: "10^9/L",        refLow: 150,   refHigh: 450,  category: "Hematology", about: "Blood cells involved in clotting. Very high platelet counts increase clot risk; very low counts increase bleeding risk." },
  { code: "MCV",   name: "Mean Cell Volume",                    unit: "fL",            refLow: 80,    refHigh: 100,  category: "Hematology", about: "The average size of red blood cells. Low values suggest iron deficiency; high values suggest B12 or folate deficiency." },
  { code: "MCHC",  name: "Mean Cell Haemoglobin Concentration", unit: "g/L",           refLow: 320,   refHigh: 360,  category: "Hematology", about: "The concentration of haemoglobin within a given volume of red blood cells. Used to characterise anaemia types." },
  { code: "MCH",   name: "Mean Cell Haemoglobin",               unit: "pg",            refLow: 27,    refHigh: 33,   category: "Hematology", about: "The average amount of haemoglobin per red blood cell. Low values suggest iron deficiency anaemia." },
  { code: "BASO",  name: "Basophils",                           unit: "10^9/L",        refLow: 0,     refHigh: 0.1,  category: "Hematology", about: "A type of white blood cell involved in allergic reactions and inflammation. Rarely abnormal in isolation." },
  { code: "EOS",   name: "Eosinophils",                         unit: "10^9/L",        refLow: 0,     refHigh: 0.4,  category: "Hematology", about: "White blood cells elevated in allergic conditions, asthma, and parasitic infections." },
  { code: "HDL",   name: "High-Density Lipoprotein",            unit: "mmol/L",        refLow: 0.9,   refHigh: 1.7,  category: "Lipids",     about: "The 'good' cholesterol. Higher levels are protective against cardiovascular disease. Often suppressed by anabolic steroid use." },
  { code: "LDL",   name: "Low-Density Lipoprotein",             unit: "mmol/L",                       refHigh: 3,    category: "Lipids",     about: "The 'bad' cholesterol. Elevated LDL is a major cardiovascular risk factor. Can be raised by AAS use and dietary factors." },
  { code: "CHOL",  name: "Total Cholesterol",                   unit: "mmol/L",                       refHigh: 5,    category: "Lipids",     about: "The total amount of cholesterol in the blood. Should be considered alongside HDL and LDL ratios for accurate risk assessment." },
  { code: "THDL",  name: "Total Cholesterol: HDL Ratio",        unit: "ratio",                        refHigh: 5,    category: "Lipids",     about: "A key cardiovascular risk indicator. A ratio above 5 is considered high risk. Lower is better." },
  { code: "ALT",   name: "Alanine Transaminase",                unit: "U/L",                          refHigh: 45,   category: "Liver",      about: "A liver enzyme released into the blood when liver cells are damaged. The most sensitive marker of hepatocellular stress." },
  { code: "AST",   name: "Aspartate Aminotransferase",          unit: "U/L",                          refHigh: 40,   category: "Liver",      about: "A liver and muscle enzyme elevated in hepatocellular damage, rhabdomyolysis, or cardiac injury. The AST:ALT ratio helps distinguish alcoholic liver disease from other causes." },
  { code: "ALP",   name: "Alkaline Phosphatase",                unit: "U/L",           refLow: 30,    refHigh: 130,  category: "Liver",      about: "An enzyme found in the liver, bile ducts, and bone. Elevated in bile duct obstruction or bone disease." },
  { code: "GGT",   name: "Gamma-Glutamyl Transferase",          unit: "U/L",           refLow: 8,     refHigh: 61,   category: "Liver",      about: "A liver enzyme sensitive to alcohol consumption and bile duct disease. Often elevated alongside ALT in hepatocellular damage." },
  { code: "ALB",   name: "Albumin",                             unit: "g/L",           refLow: 35,    refHigh: 50,   category: "Liver",      about: "A protein made by the liver. Low albumin indicates reduced synthetic function and is a marker of chronic liver disease or malnutrition." },
  { code: "BILI",  name: "Bilirubin",                           unit: "μmol/L",                       refHigh: 22,   category: "Liver",      about: "A breakdown product of haemoglobin. Elevated bilirubin causes jaundice and may indicate liver or bile duct problems." },
  { code: "CREA",  name: "Creatinine",                          unit: "μmol/L",        refLow: 60,    refHigh: 120,  category: "Kidney",     about: "A waste product filtered by the kidneys. Elevated creatinine indicates reduced kidney function. Can be mildly elevated with high muscle mass." },
  { code: "eGFR",  name: "Estimated Glomerular Filtration Rate",unit: "ml/min/1.73m2", refLow: 60,    refHigh: 150,  category: "Kidney",     about: "Estimates how well the kidneys filter waste. Values below 60 indicate chronic kidney disease requiring investigation." },
  { code: "UREA",  name: "Urea",                                unit: "mmol/L",        refLow: 2.5,   refHigh: 7.8,  category: "Kidney",     about: "A waste product of protein metabolism filtered by the kidneys. Elevated with dehydration, high protein intake, or reduced kidney function." },
  { code: "HbA1c", name: "Glycated Haemoglobin (HbA1c)",        unit: "mmol/mol",      refLow: 20,    refHigh: 42,   category: "Metabolic",  about: "Reflects average blood glucose over 3 months. Above 48 indicates diabetes. Important for monitoring glucose response to GH peptides." },
  { code: "FER",   name: "Ferritin",                            unit: "μg/L",          refLow: 30,    refHigh: 400,  category: "Metabolic",  about: "The main iron storage protein. Low ferritin indicates iron depletion; high ferritin may indicate iron overload or inflammation." },
  { code: "PSA",   name: "Prostate-Specific Antigen",           unit: "μg/L",                         refHigh: 2.5,  category: "Other",      about: "A protein produced by prostate gland cells. Elevated PSA may indicate prostate enlargement, inflammation, or cancer — further evaluation needed." },
  { code: "TRIG",  name: "Triglycerides",                       unit: "mmol/L",        refLow: 0,     refHigh: 2.3,  category: "Lipids",     about: "Blood fats that store energy. High triglycerides increase cardiovascular risk and are commonly elevated by refined carbohydrates, alcohol, and some AAS." },
  { code: "FT3",   name: "Free Triiodothyronine",               unit: "pmol/L",        refLow: 3.1,   refHigh: 6.8,  category: "Hormones",   about: "The active thyroid hormone. Low FT3 can cause fatigue and slow metabolism; used alongside TSH and FT4 for full thyroid assessment." },
  { code: "VIT_D", name: "Vitamin D (25-OH)",                   unit: "nmol/L",        refLow: 50,    refHigh: 175,  category: "Vitamins",   about: "Essential for bone health, immune function, and testosterone production. Deficiency is very common in the UK, especially in winter." },
  { code: "VITB12",name: "Vitamin B12",                         unit: "pmol/L",        refLow: 140,   refHigh: 725,  category: "Vitamins",   about: "Required for red blood cell formation, DNA synthesis, and nerve function. Deficiency causes fatigue, anaemia, and neurological symptoms." },
  { code: "ACTB12",name: "Active B12",                          unit: "pmol/L",        refLow: 37.5,  refHigh: 188,  category: "Vitamins",   about: "The metabolically active fraction of B12 (holotranscobalamin). A more sensitive marker of functional B12 status than total B12." },
  { code: "FOL",   name: "Folate",                              unit: "nmol/L",        refLow: 8.83,  refHigh: 60.8, category: "Vitamins",   about: "Essential for DNA synthesis and red blood cell production. Low folate causes megaloblastic anaemia and elevated homocysteine." },
  { code: "CRP",   name: "C-Reactive Protein",                  unit: "mg/L",          refLow: 0,     refHigh: 5,    category: "Metabolic",  about: "A key inflammation marker produced by the liver. Persistently elevated CRP indicates systemic inflammation and increased cardiovascular risk." },
  { code: "URIC",  name: "Uric Acid",                           unit: "μmol/L",        refLow: 202,   refHigh: 416,  category: "Metabolic",  about: "A breakdown product of purines. High uric acid (hyperuricaemia) can cause gout and is associated with insulin resistance and cardiovascular risk." },
  { code: "IRON",  name: "Iron",                                unit: "μmol/L",        refLow: 11,    refHigh: 29,   category: "Metabolic",  about: "Serum iron reflects circulating iron. Low values indicate iron deficiency; high values may suggest iron overload or haemochromatosis." },
  { code: "TSAT",  name: "Transferrin Saturation",              unit: "%",             refLow: 15,    refHigh: 50,   category: "Metabolic",  about: "The percentage of transferrin bound to iron. Low values confirm iron deficiency; very high values suggest iron overload." },
  { code: "DHEAS", name: "DHEA Sulphate",                       unit: "μmol/L",        refLow: 2.41,  refHigh: 11.6, category: "Hormones",   about: "An adrenal androgen precursor. Declines with age; sometimes used in TRT protocols. Elevated by some supplements; suppressed by high-dose corticosteroids." },
  { code: "COR",   name: "Cortisol",                            unit: "nmol/L",        refLow: 101,   refHigh: 536,  category: "Hormones",   about: "The primary stress hormone. Chronically elevated cortisol suppresses testosterone and immune function. Interpretation depends on time of sampling." },
  { code: "IGF1",  name: "IGF-1",                               unit: "nmol/L",        refLow: 11.3,  refHigh: 30.9, category: "Hormones",   about: "Insulin-like Growth Factor 1 — the key mediator of growth hormone action. Used to monitor GH peptide therapy response and detect GH deficiency." },
  { code: "PROG",  name: "Progesterone",                        unit: "nmol/L",                       refHigh: 3.0,  category: "Hormones",   about: "A sex hormone involved in the menstrual cycle, pregnancy, and regulation of sex hormone balance. In men, low-normal levels are typical; elevated values may indicate adrenal or testicular pathology." },
  { code: "PTH",   name: "Parathyroid Hormone",                 unit: "pmol/L",        refLow: 1.6,   refHigh: 6.9,  category: "Hormones",   about: "Regulates calcium and phosphate homeostasis via effects on bone, kidney, and intestine. Elevated PTH (hyperparathyroidism) raises calcium and can cause bone loss." },
  { code: "APOB",  name: "Apolipoprotein B",                    unit: "g/L",                          refHigh: 1.0,  category: "Lipids",     about: "The primary structural protein of atherogenic particles (LDL, VLDL, IDL). Each LDL particle contains one ApoB molecule, making it a more direct measure of atherogenic particle number than LDL-C alone." },
  { code: "APOA1", name: "Apolipoprotein A1",                   unit: "g/L",           refLow: 1.05,  refHigh: 2.05, category: "Lipids",     about: "The main structural protein of HDL particles. Low ApoA1 reflects reduced reverse cholesterol transport capacity. The ApoB:ApoA1 ratio is a powerful cardiovascular risk predictor." },
  { code: "LPA",   name: "Lipoprotein(a)",                      unit: "nmol/L",                       refHigh: 75,   category: "Lipids",     about: "A genetically determined LDL-like particle that independently raises cardiovascular risk. Cannot be lowered by standard lifestyle interventions — high levels require specialist management." },
  { code: "GLUC",  name: "Fasting Glucose",                     unit: "mmol/L",        refLow: 3.9,   refHigh: 5.6,  category: "Metabolic",  about: "Fasting blood glucose reflects current blood sugar after an overnight fast. Values of 5.6–6.9 mmol/L indicate pre-diabetes (impaired fasting glucose); ≥7 mmol/L on two readings confirms diabetes." },
  { code: "INS",   name: "Fasting Insulin",                     unit: "pmol/L",                       refHigh: 174,  category: "Metabolic",  about: "Fasting insulin reflects pancreatic beta-cell output at rest. Elevated insulin with normal glucose signals insulin resistance — an early warning of metabolic syndrome, often seen with GH peptide use." },
  { code: "CPEP",  name: "C-Peptide",                           unit: "nmol/L",        refLow: 0.37,  refHigh: 1.47, category: "Metabolic",  about: "C-Peptide is co-secreted with endogenous insulin in equal amounts. Measures residual beta-cell function; useful for distinguishing type 1 from type 2 diabetes and assessing insulin production during GH/GLP-1 peptide therapy." },
  { code: "HCYS",  name: "Homocysteine",                        unit: "μmol/L",                       refHigh: 15,   category: "Metabolic",  about: "An amino acid byproduct of methionine metabolism. Elevated homocysteine is a strong independent cardiovascular risk factor and indicator of B12/folate deficiency. Lowered by B12, folate, and B6 supplementation." },
  { code: "DBILI", name: "Direct Bilirubin",                    unit: "μmol/L",                       refHigh: 5,    category: "Liver",      about: "The conjugated (liver-processed) fraction of total bilirubin. Elevated direct bilirubin indicates hepatocellular damage or bile duct obstruction; normal direct with high total points to haemolysis or Gilbert's syndrome." },
  { code: "TPROT", name: "Total Protein",                       unit: "g/L",           refLow: 60,    refHigh: 80,   category: "Liver",      about: "The sum of albumin and globulin in serum. Low total protein indicates malnutrition or liver/kidney disease. Elevated levels may indicate dehydration or a paraproteinaemia such as myeloma." },
  { code: "GLOB",  name: "Globulin",                            unit: "g/L",           refLow: 18,    refHigh: 36,   category: "Liver",      about: "Calculated as total protein minus albumin. Globulins include immune and transport proteins. Elevated globulin can indicate chronic infection, autoimmune disease, or myeloma. Low globulin points to immunodeficiency." },
  { code: "CYSTC", name: "Cystatin C",                          unit: "mg/L",          refLow: 0.53,  refHigh: 0.95, category: "Kidney",     about: "A cysteine protease inhibitor filtered by the glomerulus and fully reabsorbed. Unlike creatinine, Cystatin C is unaffected by muscle mass — making it the preferred kidney marker for athletes and bodybuilders." },
  { code: "CK",    name: "Creatine Kinase",                     unit: "U/L",                          refHigh: 200,  category: "Metabolic",  about: "Released from damaged muscle (and cardiac) cells. Elevated CK in athletes from intense training is common and benign; very high levels (>1000 U/L) suggest rhabdomyolysis and require urgent hydration and monitoring." },
  { code: "CKMB",  name: "Creatine Kinase-MB",                  unit: "U/L",                          refHigh: 25,   category: "Cardiac",    about: "The cardiac isoform of creatine kinase, released specifically from myocardial cells following heart muscle damage. Used alongside troponins to confirm myocardial injury." },
  { code: "HSTNT", name: "High-Sensitivity Troponin T",         unit: "ng/L",                         refHigh: 14,   category: "Cardiac",    about: "An ultra-sensitive marker of cardiac muscle cell injury. Even tiny elevations indicate myocardial damage. Used for rapid rule-in/rule-out of heart attack and monitoring of cardiac stress in AAS users." },
  { code: "HSTNI", name: "High-Sensitivity Troponin I",         unit: "ng/L",                         refHigh: 26,   category: "Cardiac",    about: "Highly specific to cardiac myocytes. The most sensitive marker for early myocardial injury. Chronically mildly elevated hs-TnI has been observed in long-term AAS users, reflecting subclinical cardiac stress." },
  { code: "BNP",   name: "Brain Natriuretic Peptide",           unit: "pg/mL",                        refHigh: 100,  category: "Cardiac",    about: "Released by heart ventricles under pressure or volume overload. Elevated BNP signals cardiac strain or heart failure. High haematocrit from androgen use increases cardiac afterload and can raise BNP over time." },
  { code: "NTBNP", name: "NT-proBNP",                           unit: "pg/mL",                        refHigh: 125,  category: "Cardiac",    about: "The inactive cleavage fragment of pro-BNP, with a longer half-life than BNP. A sensitive marker of ventricular dysfunction. Used to screen for cardiac remodelling in long-term AAS users and those with elevated haematocrit." },
  { code: "ESR",   name: "Erythrocyte Sedimentation Rate",      unit: "mm/hr",                        refHigh: 20,   category: "Inflammatory", about: "Measures how quickly red blood cells settle. A non-specific inflammatory marker that rises with infection, inflammation, autoimmune disease, and cancer. Slower to change than CRP — useful for monitoring chronic conditions." },
  { code: "IL6",   name: "Interleukin-6",                       unit: "pg/mL",                        refHigh: 7,    category: "Inflammatory", about: "A pro-inflammatory cytokine produced by immune cells, fat tissue, and muscles. Persistently elevated IL-6 drives systemic inflammation and is a key mediator of inflammatory and autoimmune disease. Also stimulates CRP and fibrinogen production." },
  { code: "TNF",   name: "TNF-alpha",                           unit: "pg/mL",                        refHigh: 8.1,  category: "Inflammatory", about: "A central pro-inflammatory cytokine. Chronically elevated TNF-α is associated with insulin resistance, muscle wasting, autoimmune conditions, and cardiovascular risk. Targeted by anti-TNF biological therapies." },
  { code: "FIB",   name: "Fibrinogen",                          unit: "g/L",           refLow: 1.8,   refHigh: 4.0,  category: "Inflammatory", about: "A clotting protein and acute-phase reactant. Elevated fibrinogen increases blood clotting tendency and cardiovascular risk. Raised by inflammation, AAS use (especially oral), smoking, and obesity." },
  { code: "TRANS", name: "Transferrin",                         unit: "g/L",           refLow: 2.0,   refHigh: 3.6,  category: "Metabolic",  about: "The primary iron transport protein. Low transferrin indicates malnutrition, liver disease, or iron overload. High transferrin reflects iron deficiency. Calculated TIBC from transferrin provides a fuller picture of iron-binding capacity." },
  { code: "TIBC",  name: "Total Iron-Binding Capacity",         unit: "μmol/L",        refLow: 45,    refHigh: 72,   category: "Metabolic",  about: "The maximum amount of iron blood can carry, reflecting transferrin availability. Elevated TIBC indicates iron deficiency; low TIBC points to iron overload, chronic disease, or malnutrition." },
  { code: "MG",    name: "Magnesium",                           unit: "mmol/L",        refLow: 0.7,   refHigh: 1.0,  category: "Vitamins",   about: "Essential cofactor in over 300 enzymatic reactions. Deficiency is common and causes muscle cramps, poor sleep, fatigue, and impaired protein synthesis. High-dose zinc supplementation can deplete magnesium." },
  { code: "ZN",    name: "Zinc",                                unit: "μmol/L",        refLow: 11,    refHigh: 24,   category: "Vitamins",   about: "Critical for testosterone production, immune function, wound healing, and protein synthesis. Deficiency is common in athletes due to sweat loss. Supplementing zinc in deficient individuals can raise testosterone levels." },
  { code: "NA",    name: "Sodium",                              unit: "mmol/L",        refLow: 135,   refHigh: 145,  category: "Electrolytes", about: "The primary extracellular electrolyte governing fluid balance. Hyponatraemia (low sodium) can cause confusion and seizures; hypernatraemia (high) indicates dehydration. Affected by diuretics, water intake, and kidney function." },
  { code: "K",     name: "Potassium",                           unit: "mmol/L",        refLow: 3.5,   refHigh: 5.3,  category: "Electrolytes", about: "Critical for heart rhythm, nerve conduction, and muscle contraction. Both low (<3.5) and high (>5.5) potassium are cardiac emergencies. Monitored closely with diuretic use, kidney disease, and ACE inhibitor therapy." },
  { code: "CL",    name: "Chloride",                            unit: "mmol/L",        refLow: 98,    refHigh: 106,  category: "Electrolytes", about: "The main extracellular anion, working alongside sodium to maintain fluid balance and acid-base status. Elevated chloride can indicate metabolic acidosis; low chloride occurs with vomiting, diuretic use, or Addison's disease." },
  { code: "CA",    name: "Calcium",                             unit: "mmol/L",        refLow: 2.15,  refHigh: 2.55, category: "Electrolytes", about: "Essential for bone mineralisation, muscle contraction, nerve signalling, and blood clotting. Hypercalcaemia can cause kidney stones, muscle weakness, and cardiac arrhythmia. Always interpret alongside albumin (corrected calcium)." },
  // ── Haematology indices ────────────────────────────────────────────────────
  { code: "RDW",  name: "Red Cell Distribution Width",       unit: "%",             refLow: 11.5,  refHigh: 15,   category: "Hematology",   about: "Measures variability in red blood cell size. High RDW can indicate mixed nutritional deficiency (iron plus B12/folate) and often rises before frank anaemia develops. Particularly useful alongside MCV to characterise anaemia type." },
  { code: "MPV",  name: "Mean Platelet Volume",              unit: "fL",            refLow: 7,     refHigh: 13,   category: "Hematology",   about: "The average size of platelets. Larger platelets are more metabolically active. Elevated MPV may indicate platelet activation and increased cardiovascular risk; low MPV can suggest bone marrow suppression." },
  // ── Thyroid autoimmune ─────────────────────────────────────────────────────
  { code: "ATPO", name: "Anti-TPO Antibody",                 unit: "kU/L",                         refHigh: 34,   category: "Hormones",     about: "Antibodies targeting thyroid peroxidase, the enzyme essential for thyroid hormone synthesis. Elevated Anti-TPO is the most common marker of Hashimoto's thyroiditis — the leading cause of autoimmune hypothyroidism." },
  { code: "ATPG", name: "Anti-Thyroglobulin Antibody",       unit: "IU/mL",                        refHigh: 115,  category: "Hormones",     about: "Antibodies against thyroglobulin, the main protein precursor for thyroid hormone synthesis. Elevated Anti-Tg is seen in Hashimoto's thyroiditis and Graves' disease. Tested alongside Anti-TPO for a complete thyroid autoimmune screen." },
  // ── Lipid extras ──────────────────────────────────────────────────────────
  { code: "NHDL", name: "Non-HDL Cholesterol",               unit: "mmol/L",                       refHigh: 4,    category: "Lipids",       about: "Total cholesterol minus HDL — captures all atherogenic lipoprotein fractions (LDL, VLDL, IDL, Lp(a)). Increasingly preferred over LDL alone as a cardiovascular risk predictor. Target below 4 mmol/L." },
  { code: "VLDL", name: "VLDL Cholesterol",                  unit: "mmol/L",        refLow: 0.1,   refHigh: 1.04, category: "Lipids",       about: "Very low-density lipoprotein carries triglycerides from the liver. Elevated VLDL directly reflects high triglycerides and is linked to insulin resistance, metabolic syndrome, and cardiovascular risk." },
  // ── Hormonal ──────────────────────────────────────────────────────────────
  { code: "FAI",  name: "Free Androgen Index",               unit: "%",             refLow: 35,    refHigh: 92.6, category: "Hormones",     about: "FAI is calculated as (Total Testosterone x 100) divided by SHBG. High FAI indicates excess bioavailable androgen activity; low FAI despite normal total testosterone explains hypogonadal symptoms when SHBG is elevated." },
  // ── Electrolytes extras ────────────────────────────────────────────────────
  { code: "CO2",  name: "Carbon Dioxide (Bicarbonate)",      unit: "mmol/L",        refLow: 20,    refHigh: 29,   category: "Electrolytes", about: "Total CO2 in blood represents bicarbonate and reflects acid-base balance. Low values indicate metabolic acidosis from kidney disease, DKA, or severe diarrhoea. High values suggest metabolic alkalosis from vomiting or diuretic overuse." },
];

const CATALOG_BY_CODE = Object.fromEntries(BIOMARKER_CATALOG.map(b => [b.code, b]));
const CATALOG_BY_NAME = Object.fromEntries(BIOMARKER_CATALOG.map(b => [b.name, b]));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function isInRange(val: number, low?: number | null, high?: number | null): boolean | null {
  if (low == null && high == null) return null;
  if (low != null && val < low) return false;
  if (high != null && val > high) return false;
  return true;
}

function fmtVal(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 1) return n.toFixed(3).replace(/\.?0+$/, "");
  if (Math.abs(n) < 10) return n.toFixed(2).replace(/\.?0+$/, "");
  if (Math.abs(n) < 100) return n.toFixed(1).replace(/\.?0+$/, "");
  return Math.round(n).toString();
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

// ─── Range Bar ───────────────────────────────────────────────────────────────

function RangeBar({ value, refLow, refHigh }: { value: number; refLow?: number | null; refHigh?: number | null }) {
  if (refLow == null && refHigh == null) return null;

  const hi = refHigh ?? (refLow! * 3);
  const lo = refLow ?? 0;
  const displayMax = Math.max(hi * 1.35, value > hi ? value * 1.15 : hi * 1.2);
  const displayMin = 0;
  const range = displayMax - displayMin;

  const lowPct  = ((lo - displayMin) / range) * 100;
  const highPct = ((hi - displayMin) / range) * 100;
  const valuePct = Math.max(0, Math.min(100, ((value - displayMin) / range) * 100));

  const isHigh = value > hi;
  const isLow  = value < lo;

  return (
    <div className="mt-2">
      <div className="relative h-2 rounded-full overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to right,
            #FCA5A5 0%, #FCA5A5 ${lowPct}%,
            #4ADE80 ${lowPct}%, #4ADE80 ${highPct}%,
            #FCA5A5 ${highPct}%, #FCA5A5 100%)`
        }} />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full bg-neutral-900 border-[2px] border-white shadow-sm"
          style={{ left: `${valuePct}%`, transform: "translate(-50%,-50%)", zIndex: 2 }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 select-none">
        <span>0</span>
        {refLow != null && refLow > 0 && (
          <span style={{ position: "absolute", marginLeft: `calc(${lowPct}% - 16px)`, transform: "none" }}>{fmtVal(lo)}</span>
        )}
        <span className="mx-auto" />
        {refHigh != null && (
          <span style={{ position: "absolute", marginLeft: `calc(${highPct}% - 16px)` }}>{fmtVal(hi)}</span>
        )}
        <span>{fmtVal(displayMax)}</span>
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] font-semibold text-slate-400">
        <span>Low</span>
        <span className="mx-auto text-center">Optimal</span>
        <span>High</span>
      </div>
      {(isHigh || isLow) && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1"
          style={{ background: isHigh ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
                   color: isHigh ? "#DC2626" : "#B45309" }}>
          {isHigh ? "HIGH" : "LOW"}
        </span>
      )}
      {!isHigh && !isLow && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1"
          style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
          OPTIMAL
        </span>
      )}
    </div>
  );
}

// ─── Dashboard biomarker card ─────────────────────────────────────────────────

type ChartPoint = { date: string; value: number };

function BiomarkerCard({
  name, value, unit, refLow, refHigh, chartData, lastDate, id, highlighted,
}: {
  name: string; value: number; unit: string;
  refLow?: number | null; refHigh?: number | null;
  chartData: ChartPoint[]; lastDate: string;
  id?: string; highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { dark: isDark } = useThemeStore();
  const BLUE = isDark ? "#7099D9" : "#2D6BCC";
  const def = CATALOG_BY_NAME[name] ?? BIOMARKER_CATALOG.find(b => b.name.toLowerCase() === name.toLowerCase());
  const inRange = isInRange(value, refLow, refHigh);
  const isHigh = refHigh != null && value > refHigh;
  const isLow  = refLow  != null && value < refLow;

  const domainMin = 0;
  const hi = refHigh ?? (refLow! * 3);
  const displayMax = Math.max(hi * 1.35, value > hi ? value * 1.15 : hi * 1.2);

  return (
    <div id={id} className="bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300"
      style={{ border: highlighted ? "1.5px solid #DC2626" : `1px solid var(--t-border)`, boxShadow: highlighted ? "0 0 0 3px rgba(220,38,38,0.15)" : undefined }}>
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-start justify-between mb-0.5">
          <p className="text-[10px] text-slate-400">Last tested: {formatShortDate(lastDate)}</p>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-800">{name}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              background: inRange === false ? (isHigh ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)") : "rgba(22,163,74,0.1)",
              color: inRange === false ? (isHigh ? "#DC2626" : "#B45309") : "#16A34A",
            }}>
            {inRange === false ? (isHigh ? "HIGH" : "LOW") : "OPTIMAL"}
          </span>
        </div>
        <p className="text-xl font-bold text-slate-900 mt-0.5">{fmtVal(value)} <span className="text-xs font-normal text-slate-400">{unit}</span></p>
        <div className="mt-2">
          <div className="relative h-2 rounded-full overflow-hidden">
            {(refLow != null || refHigh != null) && (() => {
              const lo = refLow ?? 0;
              const range = displayMax - domainMin;
              const lowPct  = ((lo - domainMin) / range) * 100;
              const highPct = ((hi - domainMin) / range) * 100;
              const valuePct = Math.max(0, Math.min(100, ((value - domainMin) / range) * 100));
              return (
                <>
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(to right,
                      #FCA5A5 0%, #FCA5A5 ${lowPct}%,
                      #4ADE80 ${lowPct}%, #4ADE80 ${highPct}%,
                      #FCA5A5 ${highPct}%, #FCA5A5 100%)`
                  }} />
                  <div
                    className="absolute top-1/2 w-3 h-3 rounded-full bg-neutral-900 border-[2px] border-white shadow"
                    style={{ left: `${valuePct}%`, transform: "translate(-50%,-50%)", zIndex: 2 }}
                  />
                </>
              );
            })()}
          </div>
          {(refLow != null || refHigh != null) && (() => {
            const lo = refLow ?? 0;
            const range = displayMax - domainMin;
            const lowPct  = ((lo - domainMin) / range) * 100;
            const highPct = ((hi - domainMin) / range) * 100;
            return (
              <div className="relative flex justify-between mt-1 text-[9px] text-slate-400">
                <span>0</span>
                {refLow != null && refLow > 0 && (
                  <span className="absolute" style={{ left: `${lowPct}%`, transform: "translateX(-50%)" }}>{fmtVal(lo)}</span>
                )}
                {refHigh != null && (
                  <span className="absolute" style={{ left: `${highPct}%`, transform: "translateX(-50%)" }}>{fmtVal(hi)}</span>
                )}
                <span>{fmtVal(displayMax)}</span>
              </div>
            );
          })()}
          <div className="flex justify-between mt-0.5 text-[9px] font-medium text-slate-400">
            <span>Low</span>
            <span>Optimal</span>
            <span>High</span>
          </div>
        </div>
      </div>

      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold border-t border-slate-100"
        style={{ color: "var(--t-blue)" }}>
        {expanded ? "Show less" : "Show more"}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100">
            <div className="px-4 pb-4 pt-3">
              {def?.about && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-700 mb-1">About this biomarker</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{def.about}</p>
                </div>
              )}
              {chartData.length >= 1 && (
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--t-subtle)" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[domainMin, displayMax]} tick={{ fontSize: 9, fill: "var(--t-subtle)" }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", padding: "4px 10px" }}
                        formatter={(v: number) => [`${fmtVal(v)} ${unit}`, ""]}
                        labelStyle={{ color: "var(--t-muted)", fontWeight: 600 }}
                      />
                      {refLow != null && refHigh != null && (
                        <ReferenceArea y1={refLow} y2={refHigh} fill="rgba(74,222,128,0.12)" fillOpacity={1} />
                      )}
                      {refHigh != null && (
                        <ReferenceArea y1={refHigh} y2={displayMax} fill="rgba(252,165,165,0.15)" fillOpacity={1} />
                      )}
                      {refLow != null && refLow > 0 && (
                        <ReferenceArea y1={0} y2={refLow} fill="rgba(252,165,165,0.15)" fillOpacity={1} />
                      )}
                      {refLow != null && (
                        <ReferenceLine y={refLow} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" strokeWidth={1} />
                      )}
                      {refHigh != null && (
                        <ReferenceLine y={refHigh} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" strokeWidth={1} />
                      )}
                      <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2.5}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const ir = isInRange(payload.value, refLow, refHigh);
                          return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={ir === false ? "#DC2626" : BLUE} stroke="white" strokeWidth={1.5} />;
                        }}
                        activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

// ─── AI Health Insights Card ──────────────────────────────────────────────────
function HealthInsightsCard() {
  const [data, setData] = useState<{ narrative: string; nextSteps: string; monitoring: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (data) { setOpen(o => !o); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/account/health-insights", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load insights");
      setData(await res.json());
      setOpen(true);
    } catch { setErr("Could not load AI insights. Try again later."); }
    setLoading(false);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid rgba(139,92,246,0.25)`, background: "linear-gradient(135deg, rgba(15,12,41,0.03), rgba(48,43,99,0.06))" }}>
      <button onClick={load} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
          {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Sparkles className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: T.text }}>AI Health Insights</p>
          <p className="text-xs" style={{ color: T.muted }}>
            {data ? (open ? "Tap to collapse" : "Tap to expand") : "Gemini-powered analysis of your biomarkers"}
          </p>
        </div>
        {data && (open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: T.subtle }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />)}
      </button>

      {err && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{err}</p>
        </div>
      )}

      {open && data && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(139,92,246,0.15)" }}>
          <div className="pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#7c3aed" }}>Analysis</p>
            <p className="text-sm leading-relaxed" style={{ color: T.text }}>{data.narrative}</p>
          </div>
          {data.nextSteps && (
            <div className="rounded-lg p-3" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "#7c3aed" }}>Recommended Next Steps</p>
              <p className="text-xs leading-relaxed" style={{ color: T.text }}>{data.nextSteps}</p>
            </div>
          )}
          {data.monitoring && data.monitoring.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#7c3aed" }}>Markers to Watch</p>
              <div className="flex flex-wrap gap-1.5">
                {data.monitoring.map((m, i) => (
                  <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.12)", color: "#6d28d9" }}>{m}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => { setData(null); setOpen(false); }}
            className="text-[10px] font-medium" style={{ color: T.subtle }}>
            Refresh analysis
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardView({ sessions }: { sessions: BloodTestSession[] }) {
  const [providerBannerDismissed, setProviderBannerDismissed] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => { highlightTimers.current.forEach(clearTimeout); };
  }, []);

  const { summaries, categories } = useMemo(() => {
    const chronological = [...sessions].sort((a, b) => a.testDate.localeCompare(b.testDate));
    const markerMap: Record<string, { readings: ChartPoint[]; unit: string; category: string; refLow?: number; refHigh?: number; lastDate: string }> = {};

    for (const session of chronological) {
      for (const v of session.values) {
        const n = parseNum(v.value);
        if (n === null) continue;
        const def = CATALOG_BY_NAME[v.biomarkerName] ?? BIOMARKER_CATALOG.find(b => b.name.toLowerCase() === v.biomarkerName.toLowerCase());
        if (!markerMap[v.biomarkerName]) {
          markerMap[v.biomarkerName] = {
            readings: [], unit: v.unit,
            category: v.biomarkerCategory,
            refLow: def?.refLow ?? parseNum(v.refRangeLow) ?? undefined,
            refHigh: def?.refHigh ?? parseNum(v.refRangeHigh) ?? undefined,
            lastDate: session.testDate,
          };
        }
        markerMap[v.biomarkerName].readings.push({ date: formatShortDate(session.testDate), value: n });
        markerMap[v.biomarkerName].lastDate = session.testDate;
      }
    }

    const allSummaries = Object.entries(markerMap).map(([name, data]) => ({
      name, ...data, value: data.readings[data.readings.length - 1].value, chartData: data.readings,
    }));

    const catOrder = ["Hormones", "Hematology", "Lipids", "Liver", "Kidney", "Metabolic", "Other"];
    const grouped: Record<string, typeof allSummaries> = {};
    for (const s of allSummaries) {
      const cat = s.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    const sortedCats = catOrder.filter(c => grouped[c]).concat(Object.keys(grouped).filter(c => !catOrder.includes(c)));

    return { summaries: allSummaries, categories: sortedCats.map(cat => ({ cat, items: grouped[cat] ?? [] })) };
  }, [sessions]);

  const highMarkers = summaries.filter(s => s.refHigh != null && s.value > s.refHigh);

  function scrollToMarker(name: string) {
    const safeId = `bm-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    setHighlightId(name);
    const t1 = setTimeout(() => {
      const el = document.getElementById(safeId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    const t2 = setTimeout(() => setHighlightId(null), 1800);
    highlightTimers.current.push(t1, t2);
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--t-blue-08)" }}>
          <Activity className="w-8 h-8" style={{ color: "var(--t-blue)" }} />
        </div>
        <p className="text-base font-bold mb-1" style={{ color: T.text }}>No blood tests yet</p>
        <p className="text-sm mb-2 max-w-xs" style={{ color: T.muted }}>Upload your first test to start tracking your biomarkers on the health dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: T.text }}>Health Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: T.muted }}>Track and monitor your key health biomarkers</p>
        </div>
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors"
          style={{ borderColor: T.border, color: T.muted, background: "transparent" }}>
          <Settings className="w-3.5 h-3.5" /> Customize Dashboard
        </button>
      </div>

      {/* Health Insights — HIGH markers */}
      {highMarkers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(220,38,38,0.1)" }}>
              <TrendingUp className="w-3 h-3" style={{ color: "#DC2626" }} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: T.text }}>Health Insights</h2>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
              {highMarkers.length} HIGH
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {highMarkers.map(m => (
              <button key={m.name} onClick={() => scrollToMarker(m.name)}
                className="shrink-0 w-44 text-left rounded-xl p-3 transition-colors hover:opacity-90 active:scale-95"
                style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)", borderLeft: "3px solid #DC2626" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.12)", color: "#DC2626" }}>HIGH</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(148,163,184,0.12)", color: T.muted }}>{m.category || "Other"}</span>
                </div>
                <p className="text-xs font-bold mb-0.5 truncate" style={{ color: T.text }}>{m.name}</p>
                <p className="text-lg font-bold leading-none" style={{ color: "#DC2626" }}>{fmtVal(m.value)} <span className="text-[11px] font-normal" style={{ color: T.muted }}>{m.unit}</span></p>
                {m.refHigh != null && (
                  <p className="text-[10px] mt-1" style={{ color: T.subtle }}>
                    {m.refLow != null ? `Ref: ${fmtVal(m.refLow)}–${fmtVal(m.refHigh)} ${m.unit}` : `Ref: up to ${fmtVal(m.refHigh)} ${m.unit}`}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Health Insights */}
      <HealthInsightsCard />

      {/* Provider banner */}
      {!providerBannerDismissed && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-l-4 bg-amber-50 border-amber-400">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-100">
            <FlaskConical className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-0.5" style={{ color: T.text }}>Recommended Blood Test Providers</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold" style={{ color: T.text }}>Manual.co</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">£25</span>
              <span className="text-[10px]" style={{ color: T.muted }}>UK</span>
              <span className="text-[10px]" style={{ color: T.muted }}>39 biomarkers for £25 — hormones, liver, kidney, thyroid, lipids. Home venous draw.</span>
              <a href="https://manual.co" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                View <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
          <button onClick={() => setProviderBannerDismissed(true)} className="hover:text-red-400 transition-colors shrink-0" style={{ color: T.subtle }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Biomarker categories */}
      {categories.map(({ cat, items }) => {
        const catTotal = BIOMARKER_CATALOG.filter(b => b.category === cat).length;
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ChevronDown className="w-4 h-4" style={{ color: T.muted }} />
                <h2 className="text-sm font-bold" style={{ color: T.text }}>{cat}</h2>
              </div>
              <span className="text-xs" style={{ color: T.muted }}>{items.length} of {catTotal} biomarkers tracked</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => {
                const safeId = `bm-${item.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
                return (
                  <BiomarkerCard
                    key={item.name}
                    id={safeId}
                    highlighted={highlightId === item.name}
                    name={item.name}
                    value={item.value}
                    unit={item.unit}
                    refLow={item.refLow}
                    refHigh={item.refHigh}
                    chartData={item.chartData}
                    lastDate={item.lastDate}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Test Results View ────────────────────────────────────────────────────────

function TestResultsView({ sessions, onDelete }: { sessions: BloodTestSession[]; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const deleteMut = useDeleteBloodTest();

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-10 h-10 mb-3" style={{ color: T.subtle }} />
        <p className="text-sm font-bold mb-1" style={{ color: T.text }}>No test results yet</p>
        <p className="text-xs" style={{ color: T.muted }}>Your saved blood test sessions will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4" style={{ color: T.text }}>Test Results</h1>
      <div className="space-y-3">
        {sessions.map(session => {
          const outOfRange = session.values.filter(v => {
            const n = parseNum(v.value);
            if (n == null) return false;
            const def = CATALOG_BY_NAME[v.biomarkerName];
            return isInRange(n, def?.refLow ?? parseNum(v.refRangeLow), def?.refHigh ?? parseNum(v.refRangeHigh)) === false;
          }).length;
          const isOpen = expanded === session.id;
          return (
            <div key={session.id} className="rounded-xl shadow-sm overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--t-blue-08)" }}>
                    <FlaskConical className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: T.text }}>{session.testName ?? session.labName ?? "Blood Test"}</p>
                    <p className="text-xs" style={{ color: T.muted }}>{formatDate(session.testDate)} · {session.values.length} markers{outOfRange > 0 ? ` · ${outOfRange} out of range` : ""}</p>
                    {session.measurementType && <p className="text-[10px]" style={{ color: T.subtle }}>{session.measurementType}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {confirmDelete === session.id ? (
                    <>
                      <button onClick={() => { deleteMut.mutate(session.id); onDelete(session.id); setConfirmDelete(null); }}
                        disabled={deleteMut.isPending}
                        className="text-xs font-bold px-3 h-7 rounded-lg text-white" style={{ background: "#DC2626" }}>
                        {deleteMut.isPending ? "..." : "Delete"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 h-7 rounded-lg" style={{ color: T.muted, background: T.surface2 }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {outOfRange > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1" style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
                          {outOfRange} OOR
                        </span>
                      )}
                      <button onClick={() => setConfirmDelete(session.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400 hover:bg-red-50 transition-colors" style={{ color: T.subtle }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setExpanded(isOpen ? null : session.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: T.muted, background: T.surface2 }}>
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                      {session.notes && <p className="text-xs italic mb-2" style={{ color: T.muted }}>{session.notes}</p>}
                      <div className="space-y-1.5">
                        {session.values.map(v => {
                          const n = parseNum(v.value);
                          const def = CATALOG_BY_NAME[v.biomarkerName];
                          const ir = n != null ? isInRange(n, def?.refLow ?? parseNum(v.refRangeLow), def?.refHigh ?? parseNum(v.refRangeHigh)) : null;
                          return (
                            <div key={v.id} className="flex items-center justify-between text-xs">
                              <span style={{ color: T.text }}>{v.biomarkerName}</span>
                              <div className="flex items-center gap-2">
                                {ir === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>OOR</span>}
                                {ir === true && <span className="text-[10px] font-bold" style={{ color: "#16A34A" }}>✓</span>}
                                <span className="font-bold" style={{ color: T.text }}>{n != null ? fmtVal(n) : v.value}</span>
                                <span style={{ color: T.muted }}>{v.unit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upload / Log View ────────────────────────────────────────────────────────

function UploadView({ onSaved, mode }: { onSaved: () => void; mode: "upload" | "log" }) {
  const today = new Date().toISOString().split("T")[0];
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(today);
  const [measurementType, setMeasurementType] = useState("Trough");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [filterCode, setFilterCode] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState<ParsedBiomarker[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const createMut = useCreateBloodTest();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    const fn = file.name.toLowerCase();
    const isSupported = fn.endsWith(".pdf") || fn.endsWith(".txt") || fn.endsWith(".docx") || fn.endsWith(".doc") || file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/.test(fn);
    if (!isSupported) { setSaveError("Supported formats: PDF, image, .txt, Word (.docx)"); return; }
    if (file.size > 20 * 1024 * 1024) { setSaveError("File must be under 20MB."); return; }
    setSaveError(null);
    setSelectedFile(file);
    setParseResults(null);
    setParsing(true);
    try {
      const { values: extracted, parsed, meta } = await parsePDFBiomarkers(file);
      setParseResults(parsed);
      if (meta.testDate) setTestDate(meta.testDate);
      if (meta.testName) {
        if (meta.testDate) {
          const d = new Date(meta.testDate);
          const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          setTestName(`${meta.testName} — ${dateStr}`);
        } else {
          setTestName(meta.testName);
        }
      }
      if (Object.keys(extracted).length > 0) {
        setValues(prev => ({ ...prev, ...extracted }));
      } else {
        setSaveError("No biomarker values could be extracted from this PDF. Please enter values manually below.");
      }
    } catch (err) {
      console.error("PDF parse error:", err);
      setSaveError("Could not read this PDF. Please enter values manually below.");
    } finally {
      setParsing(false);
    }
  }

  const filteredCatalog = filterCode
    ? BIOMARKER_CATALOG.filter(b => b.code === filterCode || b.name.toLowerCase().includes(filterCode.toLowerCase()))
    : BIOMARKER_CATALOG;

  function getStatus(code: string): "in_range" | "out_of_range" | null {
    const v = values[code];
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    const def = CATALOG_BY_CODE[code];
    const ir = isInRange(n, def?.refLow, def?.refHigh);
    if (ir === null) return null;
    return ir ? "in_range" : "out_of_range";
  }

  const filledCount = Object.values(values).filter(v => v.trim() !== "").length;

  async function handleSave() {
    setSaveError(null);
    const entries = BIOMARKER_CATALOG
      .filter(b => !!values[b.code]?.trim())
      .map(b => {
        const n = parseFloat(values[b.code]);
        return {
          biomarkerName: b.name,
          biomarkerCategory: b.category,
          value: n,
          unit: b.unit,
          refRangeLow: b.refLow ?? null,
          refRangeHigh: b.refHigh ?? null,
        };
      })
      .filter(e => !isNaN(e.value));

    if (entries.length === 0) { setSaveError("Enter at least one biomarker value before saving."); return; }

    try {
      setSaving(true);
      await createMut.mutateAsync({
        testDate,
        testName: testName || undefined,
        measurementType: measurementType || undefined,
        medicationNotes: medicationNotes || undefined,
        notes: additionalNotes || undefined,
        values: entries,
      });
      onSaved();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-1" style={{ color: T.text }}>
        {mode === "upload" ? "Upload Test Results" : "Log Test Results"}
      </h1>
      <p className="text-sm mb-5" style={{ color: T.muted }}>
        {mode === "upload"
          ? "Upload a blood test PDF to automatically extract biomarkers, or enter your results manually."
          : "Enter your blood test results manually to log and track your biomarkers."}
      </p>

      {/* PDF drag-drop zone */}
      {mode === "upload" && (
        selectedFile ? (
          <div className="mb-6 space-y-2">
            {/* File card */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                border: `1px solid ${parsing ? "#BFDBFE" : parseResults && parseResults.length > 0 ? "#BBF7D0" : T.border}`,
                background: parsing ? "#EFF6FF" : parseResults && parseResults.length > 0 ? "#F0FDF4" : T.surface2,
              }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: parsing ? "rgba(59,130,246,0.1)" : parseResults && parseResults.length > 0 ? "rgba(22,163,74,0.1)" : "var(--t-blue-08)" }}>
                {parsing
                  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2563EB" }} />
                  : parseResults && parseResults.length > 0
                    ? <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />
                    : <FileText className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{selectedFile.name}</p>
                <p className="text-xs" style={{ color: T.muted }}>
                  {parsing
                    ? "Reading PDF and extracting biomarker values…"
                    : parseResults && parseResults.length > 0
                      ? `${parseResults.length} biomarker${parseResults.length !== 1 ? "s" : ""} extracted — review values below`
                      : `${(selectedFile.size / 1024).toFixed(0)} KB — PDF attached`}
                </p>
              </div>
              <button
                disabled={parsing}
                onClick={() => { setSelectedFile(null); setParseResults(null); setSaveError(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-40"
                style={{ color: T.subtle }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Extraction summary */}
            {parseResults && parseResults.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {parseResults.map(p => (
                  <span key={p.code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    style={{
                      background: p.confidence === "high" ? "rgba(22,163,74,0.07)" : "rgba(234,179,8,0.07)",
                      borderColor: p.confidence === "high" ? "rgba(22,163,74,0.2)" : "rgba(234,179,8,0.25)",
                      color: p.confidence === "high" ? "#15803D" : "#92400E",
                    }}>
                    {p.code} · {p.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed mb-6 transition-colors cursor-pointer ${dragOver ? "border-blue-300" : ""}`}
            style={{ background: dragOver ? "var(--t-blue-04)" : T.surface2, borderColor: dragOver ? "" : T.border }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0] ?? null;
              handleFileSelect(file);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.doc"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            <FileText className="w-8 h-8" style={{ color: T.subtle }} />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: T.muted }}>Drag file here or click to select</p>
              <p className="text-xs mt-0.5" style={{ color: T.subtle }}>PDF · image · .txt · Word doc · auto-extracts biomarkers · max 20MB</p>
            </div>
          </div>
        )
      )}

      {/* Test Details form */}
      <div className="rounded-xl p-5 shadow-sm mb-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Test Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Test Name</label>
            <input
              value={testName} onChange={e => setTestName(e.target.value)}
              placeholder="e.g. 4:2:26 - Voy - Full Blood Test"
              className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:border-blue-300"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>
              Test Date <span className="text-red-400">*</span>
            </label>
            <div className="w-full h-10 rounded-xl border px-3 flex items-center"
              style={{ background: T.surface2, borderColor: T.border }}>
              <DatePickerField
                value={testDate}
                onChange={setTestDate}
                max={today}
                placeholder="Select test date"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Measurement Type</label>
          <p className="text-[10px] mb-1.5" style={{ color: T.subtle }}>When was your blood drawn in relation to your medication schedule?</p>
          <select
            value={measurementType} onChange={e => setMeasurementType(e.target.value)}
            className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none appearance-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }}
          >
            {["Trough", "Peak", "Random", "Pre-dose", "Post-dose", "Fasting", "Non-fasting"].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Medication Notes</label>
          <textarea
            value={medicationNotes} onChange={e => setMedicationNotes(e.target.value)}
            placeholder="Current medications, dosages, and schedule"
            rows={3}
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none resize-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Additional Notes</label>
          <textarea
            value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
            placeholder="Any other relevant information about this test"
            rows={2}
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none resize-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }}
          />
        </div>
      </div>

      {/* Biomarkers table */}
      <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Biomarkers</h2>
            {filledCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                {filledCount} ENTERED
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.surface2, color: T.muted }}>
              {BIOMARKER_CATALOG.length} BIOMARKERS
            </span>
          </div>
        </div>
        {/* Filter */}
        <div className="px-4 py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
          <select
            value={filterCode} onChange={e => setFilterCode(e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm focus:outline-none appearance-none"
            style={{ background: T.surface2, borderColor: T.border, color: filterCode ? T.text : T.muted }}
          >
            <option value="">Select biomarker to filter...</option>
            {BIOMARKER_CATALOG.map(b => (
              <option key={b.code} value={b.code}>{b.code} — {b.name}</option>
            ))}
          </select>
        </div>
        {/* Table header — hidden on mobile */}
        <div className="hidden sm:grid px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
          style={{ gridTemplateColumns: "52px 1fr 96px 1fr 1fr 56px 32px", color: T.muted, borderBottom: `1px solid ${T.border}` }}>
          <span>Code</span><span>Name</span><span>Value</span><span>Unit</span><span>Range</span><span>Status</span><span />
        </div>
        {/* Table rows */}
        <div>
          {filteredCatalog.map(b => {
            const status = getStatus(b.code);
            const isOOR = status === "out_of_range";
            const filled = !!values[b.code]?.trim();
            const rangeStr = b.refLow != null && b.refHigh != null
              ? `${b.refLow}–${b.refHigh}`
              : b.refHigh != null ? `≤${b.refHigh}`
              : b.refLow != null ? `≥${b.refLow}` : "—";
            const inputStyle = { background: T.surface2, borderColor: filled ? "var(--t-blue-40)" : T.border, color: T.text };
            const clearVal = () => setValues(prev => { const n = { ...prev }; delete n[b.code]; return n; });
            const changeVal = (e: React.ChangeEvent<HTMLInputElement>) => setValues(prev => ({ ...prev, [b.code]: e.target.value }));

            return (
              <div key={b.code} className="transition-colors"
                style={{ borderBottom: `1px solid ${T.border}`, background: isOOR ? "rgba(254,226,226,0.3)" : "transparent" }}>

                {/* Mobile card layout */}
                <div className="sm:hidden px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 mr-2">
                      <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: T.surface2, color: T.muted }}>{b.code}</span>
                      <span className="text-xs font-medium truncate" style={{ color: T.text }}>{b.name}</span>
                    </div>
                    <button onClick={clearVal} className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ color: T.subtle }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" step="any" inputMode="decimal"
                      value={values[b.code] ?? ""}
                      onChange={changeVal}
                      className="w-24 h-8 rounded-lg border px-2 text-right text-sm font-mono focus:outline-none shrink-0"
                      style={inputStyle}
                      placeholder="—"
                    />
                    <span className="text-[10px] leading-tight shrink-0" style={{ color: T.muted }}>{b.unit}</span>
                    <span className="text-[10px] shrink-0 ml-auto" style={{ color: T.muted }}>{rangeStr}</span>
                    {status === "in_range" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: "#16A34A", background: "rgba(22,163,74,0.06)" }}>IN</span>
                    )}
                    {status === "out_of_range" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: "#DC2626", background: "rgba(220,38,38,0.06)" }}>OUT</span>
                    )}
                  </div>
                </div>

                {/* Tablet / Desktop table row */}
                <div className="hidden sm:grid items-center px-4 py-2.5"
                  style={{ gridTemplateColumns: "52px 1fr 96px 1fr 1fr 56px 32px" }}>
                  <span className="text-xs font-bold" style={{ color: T.muted }}>{b.code}</span>
                  <span className="text-xs pr-2 truncate" style={{ color: T.text }}>{b.name}</span>
                  <div>
                    <input type="number" step="any" inputMode="decimal"
                      value={values[b.code] ?? ""}
                      onChange={changeVal}
                      className="w-20 h-8 rounded-lg border px-2 text-right text-sm font-mono focus:outline-none"
                      style={inputStyle}
                      placeholder="—"
                    />
                  </div>
                  <span className="text-[11px] leading-tight pr-1" style={{ color: T.muted }}>{b.unit}</span>
                  <span className="text-[11px]" style={{ color: T.muted }}>{rangeStr}</span>
                  <div>
                    {status === "in_range" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#16A34A", background: "rgba(22,163,74,0.06)" }}>IN</span>
                    )}
                    {status === "out_of_range" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#DC2626", background: "rgba(220,38,38,0.06)" }}>OUT</span>
                    )}
                  </div>
                  <button onClick={clearVal}
                    className="flex items-center justify-center w-7 h-7 rounded-lg hover:text-red-400 hover:bg-red-50 transition-colors"
                    style={{ color: T.subtle }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
        </div>
      )}

      <div className="flex justify-end mt-5">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
          style={{ background: "var(--t-blue)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Save Test Results
        </button>
      </div>
    </div>
  );
}

// ─── Discuss View ─────────────────────────────────────────────────────────────

type Conversation = {
  id: string;
  title: string;
  messages: DiscussMessage[];
  createdAt: Date;
};

function DiscussView({ sessions }: { sessions: BloodTestSession[] }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const discussMut = useBloodTestDiscuss();

  const latestSession = sessions.length > 0 ? sessions[0] : null;
  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  // Load conversations from API on mount
  useEffect(() => {
    fetch("/api/blood-tests/conversations", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((rows: { id: string; title: string; messagesJson: string; updatedAt: string }[]) => {
        setConversations(rows.map(r => ({
          id: r.id,
          title: r.title,
          messages: (() => { try { return JSON.parse(r.messagesJson); } catch { return []; } })(),
          createdAt: new Date(r.updatedAt),
        })));
      }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  async function persistConv(conv: Conversation) {
    await fetch(`/api/blood-tests/conversations/${conv.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: conv.title, messages: conv.messages }),
    }).catch(() => {});
  }

  function newChat() {
    const id = Math.random().toString(36).slice(2);
    const conv: Conversation = { id, title: "New Chat", messages: [], createdAt: new Date() };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(id);
  }

  async function deleteConv(id: string) {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) setActiveConvId(null);
    await fetch(`/api/blood-tests/conversations/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }

  async function renameConv(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c));
    setRenamingId(null);
    const conv = conversations.find(c => c.id === id);
    if (conv) await persistConv({ ...conv, title: trimmed });
  }

  async function handleSend(overrideMsg?: string) {
    const msg = (overrideMsg ?? input).trim();
    if (!msg || sending) return;
    setInput("");

    if (!activeConvId) {
      const id = Math.random().toString(36).slice(2);
      const userMsg: DiscussMessage = { id: Math.random().toString(36), role: "user", content: msg, timestamp: new Date() };
      const newConv: Conversation = { id, title: msg.slice(0, 40), messages: [userMsg], createdAt: new Date() };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(id);
      setSending(true);
      try {
        const resp = await discussMut.mutateAsync({ message: msg, history: [] });
        const assistantMsg: DiscussMessage = {
          id: Math.random().toString(36),
          role: "assistant",
          content: resp.response,
          contextSession: resp.contextSession,
          chips: resp.chips ?? [],
          timestamp: new Date(),
        };
        const updatedConv = { ...newConv, messages: [...newConv.messages, assistantMsg] };
        setConversations(prev => prev.map(c => c.id === id ? updatedConv : c));
        await persistConv(updatedConv);
      } catch {
        const errMsg: DiscussMessage = {
          id: Math.random().toString(36),
          role: "assistant",
          content: "⚠️ I'm having trouble reaching the AI right now. Please try again in a moment.",
          chips: ["Try again"],
          timestamp: new Date(),
        };
        const updatedConv = { ...newConv, messages: [...newConv.messages, errMsg] };
        setConversations(prev => prev.map(c => c.id === id ? updatedConv : c));
      } finally {
        setSending(false);
      }
      return;
    }

    const priorMessages = conversations.find(c => c.id === activeConvId)?.messages ?? [];
    const history = priorMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const userMsg: DiscussMessage = { id: Math.random().toString(36), role: "user", content: msg, timestamp: new Date() };
    const updatedConvWithUser = conversations.find(c => c.id === activeConvId);
    const newTitle = (priorMessages.length === 0) ? msg.slice(0, 40) : (updatedConvWithUser?.title ?? "Chat");
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: [...c.messages, userMsg], title: newTitle } : c));
    setSending(true);
    try {
      const resp = await discussMut.mutateAsync({ message: msg, history });
      const assistantMsg: DiscussMessage = {
        id: Math.random().toString(36),
        role: "assistant",
        content: resp.response,
        contextSession: resp.contextSession,
        chips: resp.chips ?? [],
        timestamp: new Date(),
      };
      setConversations(prev => {
        const updated = prev.map(c => c.id === activeConvId ? { ...c, messages: [...c.messages, assistantMsg], title: newTitle } : c);
        const conv = updated.find(c => c.id === activeConvId);
        if (conv) persistConv(conv);
        return updated;
      });
    } catch {
      const lastUserMsg = msg;
      const errMsg: DiscussMessage = {
        id: Math.random().toString(36),
        role: "assistant",
        content: "⚠️ I'm having trouble reaching the AI right now. Please try again in a moment.",
        chips: [lastUserMsg],
        timestamp: new Date(),
      };
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: [...c.messages, errMsg], title: newTitle } : c));
    } finally {
      setSending(false);
    }
  }

  function relativeTime(date: Date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return "less than a minute ago";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div className="relative flex h-[calc(100vh-100px)] min-h-[500px] -mx-6 -mb-6 overflow-hidden rounded-xl" style={{ border: `1px solid ${T.border}` }}>

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="absolute inset-0 z-20 sm:hidden"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Conversations sidebar — inline on sm+, overlay on mobile */}
      <div
        className={`flex flex-col shrink-0 transition-transform duration-200
          sm:relative sm:translate-x-0 sm:w-48 sm:z-auto
          absolute inset-y-0 left-0 z-30 w-64
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}
        style={{ background: T.surface2, borderRight: `1px solid ${T.border}` }}
      >
        <div className="p-3">
          <button onClick={() => { newChat(); setMobileSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--t-blue)" }}>
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {conversations.map(conv => (
            <div key={conv.id}
              className="flex items-start gap-1 px-2 py-2 rounded-lg cursor-pointer group transition-colors"
              style={{ background: activeConvId === conv.id ? "var(--t-blue-08)" : "transparent" }}
              onClick={() => { if (renamingId !== conv.id) { setActiveConvId(conv.id); setMobileSidebarOpen(false); } }}
            >
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: T.muted }} />
              <div className="flex-1 min-w-0">
                {renamingId === conv.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") renameConv(conv.id, renameVal); if (e.key === "Escape") setRenamingId(null); }}
                      className="flex-1 min-w-0 text-xs rounded px-1 py-0.5 outline-none border"
                      style={{ borderColor: "var(--t-blue)", background: T.surface, color: T.text }}
                    />
                    <button onClick={() => renameConv(conv.id, renameVal)} className="text-green-500 hover:text-green-600">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="hover:text-red-400" style={{ color: T.subtle }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{conv.title}</p>
                    <p className="text-[10px]" style={{ color: T.muted }}>{relativeTime(conv.createdAt)}</p>
                  </>
                )}
              </div>
              {renamingId !== conv.id && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); setRenamingId(conv.id); setRenameVal(conv.title); }}
                    className="p-0.5 rounded hover:text-blue-400" style={{ color: T.subtle }}>
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteConv(conv.id); }}
                    className="p-0.5 rounded hover:text-red-400" style={{ color: T.subtle }}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-[10px] text-center px-2 py-4" style={{ color: T.muted }}>Start a new chat to discuss your test results</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: T.surface }}>
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          {/* Mobile: hamburger to open sidebar */}
          <button
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: T.muted, background: T.surface2 }}
            onClick={() => setMobileSidebarOpen(true)}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold truncate" style={{ color: T.text }}>{activeConv?.title ?? "New Chat"}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {!activeConv && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-10 h-10 mb-3" style={{ color: T.subtle }} />
              <p className="text-sm font-semibold" style={{ color: T.muted }}>Ask about your blood test results</p>
              {latestSession && (
                <p className="text-xs mt-1" style={{ color: T.muted }}>
                  Latest test: {latestSession.testName ?? latestSession.labName ?? "Blood Test"} — {formatDate(latestSession.testDate)}
                </p>
              )}
              <div className="mt-4 space-y-2">
                {["Is my estrogen too high?", "How is my overall panel looking?", "Are my liver markers OK?"].map(q => (
                  <button key={q} onClick={() => { setInput(q); }}
                    className="block w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors"
                    style={{ borderColor: T.border, color: T.text, background: T.surface2 }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeConv?.messages.map((msg, msgIdx) => {
            const isLastAssistant = msg.role === "assistant" && msgIdx === (activeConv.messages.length - 1);
            return (
            <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.role === "assistant" ? (
                <div className="max-w-xl w-full">
                  {msg.contextSession && (
                    <p className="text-[10px] text-blue-400 flex items-center gap-1 mb-1">
                      <CheckCircle className="w-3 h-3" />
                      Retrieved {formatDate(msg.contextSession.testDate)} - {msg.contextSession.testName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: T.text }}>{msg.content}</p>
                  {isLastAssistant && msg.chips && msg.chips.length > 0 && !sending && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.chips.map((chip, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(chip)}
                          className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors hover:opacity-80"
                          style={{ borderColor: "var(--t-blue)", color: "var(--t-blue)", background: "var(--t-blue-08)" }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-sm px-4 py-3 rounded-2xl text-sm text-white font-medium" style={{ background: "var(--t-blue)" }}>
                  {msg.content}
                </div>
              )}
            </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-sm" style={{ color: T.muted }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing your results...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 rounded-2xl border px-4 pr-2 py-1.5" style={{ borderColor: T.border, background: T.surface2 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="What would you like to know?"
              className="flex-1 bg-transparent text-sm focus:outline-none py-1.5"
              style={{ color: T.text }}
            />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-opacity shrink-0"
              style={{ background: "var(--t-blue)" }}>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────

type NavSection = "dashboard" | "results" | "upload" | "log" | "discuss";

const NAV_ITEMS: { id: NavSection; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { id: "results",   label: "Test Results", icon: FlaskConical,    badge: "NEW" },
  { id: "upload",    label: "Upload",       icon: Upload },
  { id: "log",       label: "Log",          icon: ClipboardList,   badge: "NEW" },
  { id: "discuss",   label: "Discuss",      icon: MessageSquare },
];

export default function BloodTestHub() {
  const [, setLocation] = useLocation();
  const { account, isLoading: authLoading } = useAccount();
  const { data: sessions = [], isLoading } = useBloodTests();
  const [section, setSection] = useState<NavSection>("dashboard");

  useEffect(() => {
    if (!authLoading && !account) setLocation("/login");
  }, [authLoading, account, setLocation]);

  if (authLoading || !account) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: T.bg }}>
      {/* Gradient hero header */}
      <div className="relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
        <div className="relative px-5 pt-5 pb-6 lg:px-8 lg:pt-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setLocation("/account")}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.12)" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
             style={{ color: "rgba(255,255,255,0.6)" }}>HEALTH</p>
          <h1 className="text-2xl font-bold text-white leading-tight">Blood Tests</h1>
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-1">
      {/* Left sidebar */}
      <aside className="w-44 shrink-0 flex flex-col" style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}>
        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setLocation("/account")} className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--t-blue)" }}>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold" style={{ color: T.text }}>Blood Tests</span>
          </button>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                style={{
                  background: isActive ? "var(--t-blue-08)" : "transparent",
                  color: isActive ? "var(--t-blue)" : "var(--t-subtle)",
                }}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-screen">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: T.subtle }} />
          </div>
        ) : (
          <div className="px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {section === "dashboard" && <DashboardView sessions={sessions} />}
                {section === "results"   && <TestResultsView sessions={sessions} onDelete={() => {}} />}
                {section === "upload"    && <UploadView onSaved={() => setSection("results")} mode="upload" />}
                {section === "log"       && <UploadView onSaved={() => setSection("results")} mode="log" />}
                {section === "discuss"   && <DiscussView sessions={sessions} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
