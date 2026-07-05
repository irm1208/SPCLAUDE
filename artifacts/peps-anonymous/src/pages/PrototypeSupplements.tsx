import { useState, useMemo } from "react";
import { Search, ChevronLeft, X } from "lucide-react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type EvidenceGrade = "A" | "B" | "C" | "D";
type Category = "glp1" | "healing" | "nootropics" | "sleep" | "hormonal" | "metabolic";

interface Supplement {
  id: string;
  name: string;
  abbrev: string;
  category: Category;
  tagline: string;
  evidence: EvidenceGrade;
  evidenceNote: string;
  dose: string;
  mechanism: string;
  benefits: string[];
  warnings: string[];
  stack?: string;
  color: string;
}

// ─── Evidence grade config ────────────────────────────────────────────────────

const GRADES: Record<EvidenceGrade, { label: string; bg: string; color: string }> = {
  A: { label: "Strong evidence",      bg: "#DCFCE7", color: "#15803D" },
  B: { label: "Good evidence",        bg: "#DBEAFE", color: "#1D4ED8" },
  C: { label: "Preliminary evidence", bg: "#FEF3C7", color: "#B45309" },
  D: { label: "Weak evidence",        bg: "#F3F4F6", color: "#6B7280" },
};

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category | "all"; label: string; color: string }[] = [
  { id: "all",       label: "All",              color: "#0D0D0D" },
  { id: "glp1",      label: "GLP-1 Peptides",   color: "#059669" },
  { id: "healing",   label: "Healing Peptides",  color: "#2563EB" },
  { id: "nootropics",label: "Nootropics",        color: "#7C3AED" },
  { id: "sleep",     label: "Sleep & Recovery",  color: "#0E7490" },
  { id: "hormonal",  label: "Hormonal Support",  color: "#B45309" },
  { id: "metabolic", label: "Metabolic Health",  color: "#DC2626" },
];

const CAT_META: Record<Category, { label: string; color: string; bg: string }> = {
  glp1:      { label: "GLP-1 Peptides",   color: "#059669", bg: "#DCFCE7" },
  healing:   { label: "Healing Peptides",  color: "#2563EB", bg: "#DBEAFE" },
  nootropics:{ label: "Nootropics",        color: "#7C3AED", bg: "#EDE9FE" },
  sleep:     { label: "Sleep & Recovery",  color: "#0E7490", bg: "#CFFAFE" },
  hormonal:  { label: "Hormonal Support",  color: "#B45309", bg: "#FEF3C7" },
  metabolic: { label: "Metabolic Health",  color: "#DC2626", bg: "#FEE2E2" },
};

// ─── Supplement data (original content, not sourced from any third party) ────

const SUPPLEMENTS: Supplement[] = [
  // ── GLP-1 PEPTIDES ──────────────────────────────────────────────────────────
  {
    id: "semaglutide",
    name: "Semaglutide",
    abbrev: "SEM",
    category: "glp1",
    tagline: "Weekly GLP-1 receptor agonist for weight management and metabolic health",
    evidence: "A",
    evidenceNote: "Multiple large-scale RCTs (SUSTAIN, STEP trials); FDA-approved",
    dose: "0.25 mg/week (start) → 2.4 mg/week (Wegovy). Titrate every 4 weeks.",
    mechanism: "Mimics endogenous GLP-1, activating hypothalamic receptors to suppress appetite and slow gastric emptying. Enhances glucose-dependent insulin secretion.",
    benefits: [
      "Average 15–17% body weight reduction in clinical trials",
      "HbA1c reduction of 1.5–2% in T2DM",
      "Demonstrated reduction in major cardiovascular events (SUSTAIN-6)",
    ],
    warnings: [
      "Nausea and vomiting most common, especially during titration",
      "Contraindicated with personal or family history of medullary thyroid carcinoma or MEN2",
      "Do not combine with other GLP-1 receptor agonists",
      "Monitor for signs of pancreatitis",
    ],
    stack: "Commonly used alongside Metformin in T2DM management. Resistance training preserves lean mass during weight loss.",
    color: "#059669",
  },
  {
    id: "tirzepatide",
    name: "Tirzepatide",
    abbrev: "TZP",
    category: "glp1",
    tagline: "Dual GIP/GLP-1 agonist achieving superior weight loss outcomes vs semaglutide",
    evidence: "A",
    evidenceNote: "SURMOUNT and SURPASS trial series; FDA-approved for T2DM and obesity",
    dose: "2.5 mg/week (start) → 5–15 mg/week. Titrate every 4 weeks. Take same day each week.",
    mechanism: "Acts on both GLP-1 and GIP receptors simultaneously. GIP co-agonism appears to enhance adipose tissue remodelling and may improve GI tolerability compared to GLP-1 alone.",
    benefits: [
      "Average 20–22% body weight reduction (SURMOUNT-1)",
      "Superior HbA1c lowering vs semaglutide in SURPASS-2 head-to-head",
      "Improved lipid profile and blood pressure",
    ],
    warnings: [
      "Same thyroid carcinoma and pancreatitis contraindications as semaglutide",
      "Significant muscle mass loss possible — high protein intake (≥1.6g/kg) and resistance training are essential",
      "GI side effects similar in class; may be slightly better tolerated than semaglutide at equivalent doses",
    ],
    stack: "Resistance training + high protein diet is critical. Consider creatine monohydrate to support lean mass retention.",
    color: "#059669",
  },
  {
    id: "liraglutide",
    name: "Liraglutide",
    abbrev: "LIR",
    category: "glp1",
    tagline: "Daily GLP-1 agonist with established cardiovascular and weight management data",
    evidence: "A",
    evidenceNote: "LEADER and SCALE trial series; FDA-approved (Victoza, Saxenda)",
    dose: "0.6 mg/day (week 1) → up to 1.8 mg/day (T2DM) or 3 mg/day (obesity). Daily subcutaneous injection.",
    mechanism: "Same GLP-1 receptor mechanism as semaglutide but with a shorter half-life (~13 hours) requiring daily administration. Fatty acid chain modification enables albumin binding.",
    benefits: [
      "5–8% average body weight reduction",
      "Proven 13% reduction in MACE in LEADER cardiovascular outcome trial",
      "Approved for use in adolescents aged 12+ for obesity",
    ],
    warnings: [
      "Daily injections less convenient than weekly semaglutide",
      "Same class warnings (MTC, MEN2, pancreatitis)",
      "Generally superseded by semaglutide for most indications due to dosing convenience",
    ],
    stack: "Largely replaced by weekly options clinically. Useful where semaglutide/tirzepatide are unavailable.",
    color: "#059669",
  },

  // ── HEALING PEPTIDES ─────────────────────────────────────────────────────────
  {
    id: "bpc157",
    name: "BPC-157",
    abbrev: "BPC",
    category: "healing",
    tagline: "Gastric pentadecapeptide with broad tissue repair and anti-inflammatory activity",
    evidence: "C",
    evidenceNote: "Robust animal data; no completed large-scale human RCTs at time of writing",
    dose: "200–500 mcg/day subcutaneous or IM (systemic). 500 mcg–2 mg/day oral for gut (lower systemic absorption).",
    mechanism: "Upregulates growth hormone receptor expression. Promotes angiogenesis via VEGFR2 signalling. Modulates nitric oxide synthesis. Interacts with dopaminergic and serotonergic systems.",
    benefits: [
      "Accelerated tendon, ligament and bone healing in animal models",
      "Gastroprotection and improved gut motility",
      "Potential neuroprotective and antidepressant-like effects",
      "Reduced systemic inflammation markers",
    ],
    warnings: [
      "Not FDA-approved; no long-term human safety data",
      "Quality varies significantly by source — test your supply",
      "Compounded or research-grade only; not approved for therapeutic use",
      "May interact with CNS medications through dopamine pathway modulation",
    ],
    stack: "Frequently combined with TB-500 for synergistic systemic and local tissue repair.",
    color: "#2563EB",
  },
  {
    id: "tb500",
    name: "TB-500",
    abbrev: "TB4",
    category: "healing",
    tagline: "Thymosin Beta-4 fragment promoting systemic tissue regeneration and reduced inflammation",
    evidence: "C",
    evidenceNote: "Animal and in vitro studies predominate; limited human clinical data",
    dose: "2–4 mg twice weekly (loading phase 4–6 weeks). 2 mg twice monthly (maintenance).",
    mechanism: "Sequesters G-actin monomers, controlling actin polymerisation. Promotes cell migration, proliferation and angiogenesis. Reduces TGF-β-driven inflammation and fibrosis.",
    benefits: [
      "Systemic injury repair including muscle, tendon and cardiac tissue",
      "Reduced fibrosis and scar tissue formation",
      "Improved flexibility and range of motion reported by users",
      "Cardiac tissue repair potential shown in rodent MI models",
    ],
    warnings: [
      "Not FDA-approved; research chemical status",
      "Theoretical concern about promoting growth of pre-existing tumours via angiogenesis — lack of human data means this risk is unquantified",
      "Avoid immediately post-surgery until wound is fully closed",
    ],
    stack: "Stacked with BPC-157 for complementary local (BPC) and systemic (TB-500) repair.",
    color: "#2563EB",
  },
  {
    id: "ghkcu",
    name: "GHK-Cu",
    abbrev: "GHK",
    category: "healing",
    tagline: "Copper-binding tripeptide modulating gene expression and collagen remodelling",
    evidence: "C",
    evidenceNote: "Strong in vitro and animal data; topical cosmetic use well-established; injectable human data limited",
    dose: "Topical: 1–5% solution or cream. Injectable: 1–2 mg subcutaneous 2–3× weekly.",
    mechanism: "Binds copper ions, protecting them from oxidation and enabling controlled delivery to tissues. Stimulates collagen, elastin and GAG synthesis. Modulates over 4,000 genes in microarray studies including genes regulating inflammation and tissue remodelling.",
    benefits: [
      "Skin collagen density and elasticity improvement (topical, well-documented)",
      "Wound healing acceleration",
      "Hair follicle enlargement and growth stimulation",
      "Potential cognitive support via brain-derived neurotrophic factor modulation",
    ],
    warnings: [
      "Topical use has strong safety record; injectable data is sparse",
      "Excess free copper can be pro-oxidant — avoid combining with high-dose copper supplementation",
      "Source and purity verification critical for injectable use",
    ],
    stack: "Topically pairs well with vitamin C serums (collagen co-factor). Injectable may complement BPC-157.",
    color: "#2563EB",
  },

  // ── NOOTROPICS ───────────────────────────────────────────────────────────────
  {
    id: "alphagpc",
    name: "Alpha-GPC",
    abbrev: "aGPC",
    category: "nootropics",
    tagline: "Cholinergic precursor crossing the blood-brain barrier to raise acetylcholine levels",
    evidence: "B",
    evidenceNote: "Multiple RCTs in cognitive decline and Alzheimer's; athletic power output data mixed",
    dose: "300–600 mg/day for cognitive use. Up to 1,200 mg split into 3 doses for GH secretagogue effects.",
    mechanism: "Hydrolysed to choline and glycerophosphate in the gut. Choline crosses the BBB and is converted to acetylcholine via choline acetyltransferase. May also directly stimulate pituitary GH release.",
    benefits: [
      "Improved working memory, attention and processing speed",
      "Slows cognitive decline in mild Alzheimer's (European prescription drug in some countries)",
      "May augment power output when combined with resistance training",
    ],
    warnings: [
      "Emerging concern about elevated TMAO levels with chronic high-dose use (gut bacterial metabolism of choline)",
      "Can cause headaches or brain fog if dosage is too high",
      "May worsen symptoms in trimethylaminuria",
      "Best taken earlier in the day to avoid sleep interference",
    ],
    stack: "Pairs well with Lion's Mane for complementary NGF + acetylcholine support. Commonly combined with racetams.",
    color: "#7C3AED",
  },
  {
    id: "lionsmane",
    name: "Lion's Mane",
    abbrev: "HER",
    category: "nootropics",
    tagline: "Medicinal mushroom stimulating NGF synthesis for neurogenesis and cognitive support",
    evidence: "B",
    evidenceNote: "Several human RCTs; Mori et al. (2009, 2019) demonstrated cognitive improvements",
    dose: "500–3,000 mg/day (fruiting body extract standardised to ≥20% beta-glucans). Mycelium-only products may lack active erinacines.",
    mechanism: "Hericenones (fruiting body) and erinacines (mycelium) stimulate nerve growth factor (NGF) synthesis. NGF promotes neuron survival, axon growth and myelin maintenance. Additionally modulates gut-brain axis via vagal nerve.",
    benefits: [
      "Improved cognitive function including memory and concentration",
      "Mild antidepressant and anxiolytic effects observed in RCTs",
      "Peripheral nerve regeneration support",
      "Gut health improvement via microbiome modulation",
    ],
    warnings: [
      "Ensure label specifies fruiting body extract — mycelium-grain products have significantly lower active compound concentration",
      "Rare allergic reactions reported, particularly in individuals with mushroom allergies",
      "May potentiate anticoagulants (theoretical, monitor if on warfarin)",
      "Effects build over 4–8 weeks of consistent use",
    ],
    stack: "Excellent with Alpha-GPC (NGF + acetylcholine). Bacopa can be added for memory consolidation.",
    color: "#7C3AED",
  },
  {
    id: "bacopa",
    name: "Bacopa Monnieri",
    abbrev: "BAC",
    category: "nootropics",
    tagline: "Ayurvedic adaptogen with well-documented memory consolidation and anxiolytic effects",
    evidence: "B",
    evidenceNote: "Meta-analyses confirm memory benefits; 9 RCTs included in 2014 Cochrane review",
    dose: "300–600 mg/day standardised to ≥50% bacosides. Take with a fat-containing meal. Requires 8–12 weeks for full effect.",
    mechanism: "Bacosides A and B facilitate nerve impulse transmission and enhance dendritic branching in hippocampal neurons. Antioxidant protection via superoxide dismutase enhancement. Modulates serotonin and acetylcholine systems without significant dopamine effects.",
    benefits: [
      "Improved memory recall and learning consolidation (consistent across RCTs)",
      "Reduced anxiety and stress reactivity",
      "Neuroprotective effects, particularly relevant in elderly populations",
      "Modest reduction in cognitive decline rate",
    ],
    warnings: [
      "GI upset is common — always take with food containing fat",
      "Slow onset: no acute effect; benefits require 8–12 weeks of consistent use",
      "May cause drowsiness in some individuals, especially initially",
      "May interact with thyroid medications (monitor if hypothyroid)",
    ],
    stack: "Pairs well with Lion's Mane. Can be combined with L-Theanine if morning anxiety is a concern.",
    color: "#7C3AED",
  },
  {
    id: "ltheanine",
    name: "L-Theanine",
    abbrev: "LTN",
    category: "nootropics",
    tagline: "Tea amino acid promoting calm focus by modulating GABA and reducing glutamate excitation",
    evidence: "B",
    evidenceNote: "Well-replicated EEG and RCT data; caffeine synergy consistently demonstrated",
    dose: "100–200 mg standalone. Pair 1:1 or 2:1 with caffeine (e.g. 200 mg L-theanine + 100 mg caffeine).",
    mechanism: "Crosses the blood-brain barrier. Raises GABA, glycine, serotonin and dopamine while reducing glutamate-driven excitatory neurotransmission. Increases alpha brain wave activity (associated with relaxed alertness).",
    benefits: [
      "Relaxed alertness without sedation",
      "Significantly reduces caffeine jitteriness and anxiety while preserving focus benefits",
      "Improved sleep quality, particularly sleep onset",
      "Reduced stress reactivity and cortisol response",
    ],
    warnings: [
      "Excellent safety profile — one of the most studied and safest supplements",
      "May potentiate antihypertensive medications (additive blood pressure lowering)",
      "High doses (>600 mg) occasionally cause mild nausea",
    ],
    stack: "Essential pairing with caffeine. Safe to combine with most other nootropics.",
    color: "#7C3AED",
  },

  // ── SLEEP & RECOVERY ─────────────────────────────────────────────────────────
  {
    id: "magnesium",
    name: "Magnesium Glycinate",
    abbrev: "MgG",
    category: "sleep",
    tagline: "Highly bioavailable magnesium form supporting sleep, muscle function and HPA regulation",
    evidence: "B",
    evidenceNote: "Magnesium deficiency strongly linked to sleep disturbance; glycinate form RCTs limited but form demonstrates superior tolerability",
    dose: "200–400 mg elemental magnesium at bedtime. Magnesium glycinate ~14% elemental Mg — check label for elemental content.",
    mechanism: "Cofactor in over 300 enzymatic reactions including ATP synthesis and protein synthesis. Regulates NMDA receptor activity and GABA-A receptor function, promoting relaxation. Required for melatonin synthesis.",
    benefits: [
      "Improved sleep quality and reduced time to sleep onset",
      "Muscle relaxation and reduced nocturnal cramps",
      "Anxiety and stress reduction via HPA axis modulation",
      "Correction of widespread dietary deficiency (estimates suggest 50%+ of Western populations are deficient)",
    ],
    warnings: [
      "Oxide and citrate forms cause loose stools at therapeutic doses — glycinate avoids this",
      "Contraindicated in significant renal impairment (hypermagnesaemia risk)",
      "Reduces absorption of tetracycline and quinolone antibiotics, bisphosphonates — take 2+ hours apart",
    ],
    stack: "Pairs well with L-Glycine and Ashwagandha for a comprehensive sleep protocol.",
    color: "#0E7490",
  },
  {
    id: "ashwagandha",
    name: "Ashwagandha (KSM-66)",
    abbrev: "ASH",
    category: "sleep",
    tagline: "Adaptogenic root extract modulating the HPA axis to reduce stress and improve sleep",
    evidence: "B",
    evidenceNote: "Multiple RCTs on cortisol, testosterone and sleep; KSM-66 extract best-studied form",
    dose: "KSM-66: 300–600 mg/day. Sensoril: 250 mg/day. Root extract, not leaf. Standardised to ≥5% withanolides.",
    mechanism: "Withanolides modulate HPA axis signalling, reducing cortisol output. Potentiates GABAergic activity (anxiolytic). Anti-inflammatory via NF-κB inhibition. May modulate thyroid hormone conversion.",
    benefits: [
      "Clinically meaningful cortisol reduction (average 14–28% in RCTs)",
      "Improved sleep quality including total sleep time and sleep efficiency",
      "Modest testosterone increase in hypogonadal or high-stress men (8–15%)",
      "Improved endurance and VO2 max in athlete populations",
    ],
    warnings: [
      "May elevate thyroid hormone levels — use caution in hyperthyroidism or Hashimoto's",
      "Rare cases of hepatotoxicity reported at high doses (>1,200 mg/day) — stay within dosing guidelines",
      "Avoid in pregnancy (uterine stimulant properties)",
      "Immunostimulatory effects may be contraindicated in autoimmune conditions",
    ],
    stack: "Combines well with Magnesium Glycinate and L-Glycine for sleep. Can be paired with Tongkat Ali for hormonal support.",
    color: "#0E7490",
  },
  {
    id: "melatonin",
    name: "Melatonin",
    abbrev: "MEL",
    category: "sleep",
    tagline: "Pineal circadian hormone signalling darkness — widely misused at excessive doses",
    evidence: "A",
    evidenceNote: "Strong evidence for circadian rhythm disorders and jet lag; moderate for sleep onset latency",
    dose: "0.5–1 mg taken 30–60 min before target sleep time (physiological dose). Up to 5 mg for jet lag resetting only. Most commercial products are 5–10× overdosed.",
    mechanism: "Agonist at MT1 and MT2 receptors in the suprachiasmatic nucleus and pituitary. Shifts the dim-light melatonin onset (DLMO) to signal 'night'. Does not sedate directly — it signals circadian phase. Also a potent antioxidant at higher concentrations.",
    benefits: [
      "Reliable reduction in sleep onset latency",
      "Effective circadian rhythm resetting for shift work and jet lag",
      "Antioxidant effects at doses >1 mg",
      "May reduce cluster headache frequency at higher doses",
    ],
    warnings: [
      "Most OTC products (5–10 mg) are 10–20× the physiologically effective dose",
      "High chronic doses may suppress endogenous pineal production",
      "Next-day grogginess is dose-dependent — start at 0.5 mg",
      "Not recommended for children without medical supervision",
      "May interact with anticoagulants and immunosuppressants",
    ],
    stack: "Use at the lowest effective dose. Combine with Magnesium Glycinate and good sleep hygiene rather than escalating dose.",
    color: "#0E7490",
  },
  {
    id: "glycine",
    name: "L-Glycine",
    abbrev: "GLY",
    category: "sleep",
    tagline: "Non-essential amino acid improving sleep quality via core body temperature reduction",
    evidence: "B",
    evidenceNote: "Human RCTs show improved polysomnography markers and subjective sleep quality at 3g dose",
    dose: "3 g taken 30–60 minutes before bed. Dissolved in water. Well-tolerated at this dose.",
    mechanism: "Promotes peripheral vasodilation, lowering core body temperature — a critical sleep onset signal. Inhibitory neurotransmitter in brainstem and spinal cord. Improves REM sleep markers in polysomnography without altering sleep architecture negatively.",
    benefits: [
      "Improved subjective sleep quality and morning alertness",
      "Reduced daytime fatigue following sleep restriction",
      "Gut-protective properties (mucosal integrity support)",
      "Anti-inflammatory via glycine-gated chloride channel activation in macrophages",
    ],
    warnings: [
      "Excellent safety profile; no significant adverse effects at 3 g/day",
      "Theoretical interaction with clozapine (antipsychotic) — monitor if prescribed",
      "Inexpensive and widely available as a powder",
    ],
    stack: "Ideal combination: Magnesium Glycinate + L-Glycine + Ashwagandha at bedtime.",
    color: "#0E7490",
  },

  // ── HORMONAL SUPPORT ─────────────────────────────────────────────────────────
  {
    id: "tonkatali",
    name: "Tongkat Ali",
    abbrev: "TKA",
    category: "hormonal",
    tagline: "Southeast Asian herb reducing SHBG and cortisol to improve free testosterone availability",
    evidence: "B",
    evidenceNote: "Multiple RCTs showing testosterone and stress hormone effects; quality varies by extract",
    dose: "200–400 mg/day standardised root extract (1:200 ratio). Longjack or Eurycoma longifolia standardised to ≥40% glycosaponins.",
    mechanism: "Eurycomanone and related quassinoids appear to reduce sex hormone-binding globulin (SHBG), increasing the free testosterone fraction. Adaptogenic HPA axis modulation reduces cortisol. Possible mild LH-stimulating and aromatase-modulating activity.",
    benefits: [
      "Increased free testosterone in hypogonadal and physically stressed men",
      "Improved libido and sexual function across multiple trials",
      "Cortisol reduction in chronic-stress conditions",
      "Modest improvements in sperm quality and motility",
    ],
    warnings: [
      "Heavy metal contamination risk in low-quality products — source from reputable manufacturers with third-party testing",
      "May interact with immunosuppressants",
      "Avoid in hormone-sensitive cancers",
      "High-dose may cause insomnia or restlessness — do not take in the evening",
    ],
    stack: "Pairs with Zinc and Ashwagandha for a synergistic hormonal support stack. Can complement DHEA in older men.",
    color: "#B45309",
  },
  {
    id: "dhea",
    name: "DHEA",
    abbrev: "DHEA",
    category: "hormonal",
    tagline: "Endogenous adrenal prohormone that declines with age, converting to testosterone and oestrogen",
    evidence: "B",
    evidenceNote: "Well-studied in elderly populations and adrenal insufficiency; age-related decline clearly documented",
    dose: "25–50 mg/day for men. 10–25 mg/day for women. Morning administration. Test serum DHEA-S levels before starting.",
    mechanism: "Synthesised in the adrenal cortex from cholesterol. Converted peripherally to testosterone (via androstenedione) and oestradiol. Also has direct androgen receptor activity and neuroprotective effects in the CNS. Peaks at age 25, declining ~10% per decade thereafter.",
    benefits: [
      "Improved energy, mood and libido in age-related decline",
      "Bone density support in post-menopausal women",
      "Improved insulin sensitivity",
      "Supports adrenal recovery after prolonged corticosteroid use",
    ],
    warnings: [
      "Converts to oestrogen — men may need aromatase inhibitor awareness; monitor oestradiol levels",
      "Can cause acne and androgenic hair thinning in susceptible individuals",
      "Absolute contraindication in hormone-sensitive cancers (prostate, breast, ovarian)",
      "Baseline DHEA-S blood test strongly recommended before supplementing",
    ],
    stack: "Monitor with blood work. Pairs with Zinc and Tongkat Ali. Women often use at lower doses for energy and libido.",
    color: "#B45309",
  },
  {
    id: "zinc",
    name: "Zinc Bisglycinate",
    abbrev: "ZNC",
    category: "hormonal",
    tagline: "Essential trace mineral critical for testosterone synthesis, immunity and 300+ enzymatic systems",
    evidence: "A",
    evidenceNote: "Deficiency correction strongly evidence-based; testosterone effect primarily in deficient individuals",
    dose: "15–30 mg elemental zinc/day. Bisglycinate or picolinate forms have superior absorption vs oxide. Take with or after a meal.",
    mechanism: "Cofactor for 5-alpha-reductase and aromatase. Required for functional LH receptor expression on Leydig cells. Essential for thyroid hormone deiodination (T4→T3 conversion). Superoxide dismutase (SOD) component — key antioxidant enzyme.",
    benefits: [
      "Testosterone restoration in deficient individuals (deficiency is very common, especially in athletes)",
      "Enhanced immune function — reduces cold duration and severity",
      "Wound healing acceleration",
      "Taste, smell and cognitive function support",
    ],
    warnings: [
      "Competes with copper absorption — supplement 1–2 mg copper daily if using zinc long-term",
      "Nausea if taken on an empty stomach — always take with food",
      "Doses above 40 mg/day may paradoxically impair immune function and reduce HDL cholesterol",
      "Phytates in plant foods significantly reduce absorption — vegetarians/vegans likely deficient",
    ],
    stack: "Foundational supplement. Pair with Magnesium (ZMA-style) and Vitamin D3/K2.",
    color: "#B45309",
  },
  {
    id: "boron",
    name: "Boron",
    abbrev: "BOR",
    category: "hormonal",
    tagline: "Trace mineral reducing SHBG and supporting steroid hormone and vitamin D metabolism",
    evidence: "C",
    evidenceNote: "Small human trials show SHBG reduction; larger RCTs lacking",
    dose: "3–10 mg/day as boron glycinate or sodium borate. Higher doses not associated with additional benefit.",
    mechanism: "Reduces circulating SHBG concentrations, increasing free testosterone and oestrogen fractions. Modulates steroid hormone synthesis at the enzymatic level. Enhances vitamin D metabolism (25-OH → 1,25-OH conversion). May weakly inhibit aromatase.",
    benefits: [
      "Modest free testosterone increase via SHBG reduction",
      "Improved vitamin D utilisation",
      "Joint health and anti-inflammatory effects",
      "Cognitive function support (limited data)",
    ],
    warnings: [
      "Well tolerated at doses ≤20 mg/day (tolerable upper intake level)",
      "High doses are teratogenic in animal studies — avoid in pregnancy",
      "Effects are modest and complement rather than replace other hormonal interventions",
    ],
    stack: "Useful addition to a Zinc + Vitamin D3 + Tongkat Ali stack. Low cost and low risk.",
    color: "#B45309",
  },

  // ── METABOLIC HEALTH ─────────────────────────────────────────────────────────
  {
    id: "berberine",
    name: "Berberine",
    abbrev: "BRB",
    category: "metabolic",
    tagline: "Plant alkaloid activating AMPK with glucose-lowering effects comparable to Metformin",
    evidence: "A",
    evidenceNote: "Multiple RCTs and meta-analyses; head-to-head trials vs Metformin show comparable HbA1c reduction",
    dose: "500 mg with each main meal (2–3× daily). Split dosing is essential — single large doses have poor efficacy and tolerability.",
    mechanism: "Activates AMP-activated protein kinase (AMPK), the master cellular energy regulator. Reduces hepatic glucose output. Inhibits DPP-4 (glucose-dependent insulin pathway). Beneficially remodels the gut microbiome. Mild PCSK9 inhibition reduces LDL production.",
    benefits: [
      "HbA1c reduction of 0.9–1.4% in T2DM trials (comparable to 500–1,500 mg Metformin)",
      "LDL cholesterol reduction of 15–25% in dyslipidaemia trials",
      "Modest weight loss (1–3 kg over 12 weeks)",
      "Improved insulin sensitivity and reduced fasting glucose",
    ],
    warnings: [
      "GI side effects (constipation, bloating, cramping) — sustained-release formulations reduce this",
      "Strong CYP3A4 inhibitor: significant interactions with statins, cyclosporine, macrolide antibiotics — check all medications",
      "Contraindicated in pregnancy",
      "May lower blood pressure additively — monitor if on antihypertensives",
      "Not a substitute for medical management of T2DM",
    ],
    stack: "Effective combined with dietary change and exercise. Can complement Metformin (discuss with physician). Dihydroberberine is a more bioavailable form gaining evidence.",
    color: "#DC2626",
  },
  {
    id: "nmn",
    name: "NMN",
    abbrev: "NMN",
    category: "metabolic",
    tagline: "NAD+ precursor supporting mitochondrial function and longevity pathway activation",
    evidence: "C",
    evidenceNote: "Strong preclinical data; human trials emerging — small sample sizes limit conclusions",
    dose: "250–500 mg/day. Sublingual administration may improve bioavailability. Morning timing preferred. Some take with a fatty meal.",
    mechanism: "Converted to NAD+ via the Preiss-Handler salvage pathway. NAD+ activates sirtuins (SIRT1–7) — NAD-dependent deacetylases that regulate metabolism, DNA repair and stress resistance. Also supports PARP enzymes for DNA damage repair. Restores mitochondrial complex I function.",
    benefits: [
      "Subjective improvements in energy and exercise performance",
      "Improved insulin sensitivity in older adults (Yoshino et al., 2021 RCT)",
      "NAD+ replenishment — levels decline approximately 50% between ages 40 and 60",
      "Potential improvements in muscle function and recovery",
    ],
    warnings: [
      "Expensive relative to amount of human evidence currently available",
      "Nicotinamide riboside (NR) may offer equivalent NAD+ repletion at lower cost",
      "Theoretical concern: sirtuin activation may accelerate proliferation of certain pre-existing cancers — no established human risk but worth monitoring the literature",
      "Niacin flush is not expected at typical doses (unlike pure niacin/NA)",
    ],
    stack: "Often combined with Resveratrol (sirtuin cofactor) and Metformin in longevity protocols. Ensure adequate dietary protein.",
    color: "#DC2626",
  },
  {
    id: "metformin",
    name: "Metformin (longevity)",
    abbrev: "MET",
    category: "metabolic",
    tagline: "Biguanide diabetes drug repurposed as a longevity intervention — TAME trial ongoing",
    evidence: "B",
    evidenceNote: "Grade A for T2DM; Grade B for longevity/anti-ageing given TAME trial in progress",
    dose: "500–1,000 mg/day extended-release for off-label longevity. 500–2,550 mg/day for T2DM. ER formulation taken with evening meal dramatically reduces GI side effects.",
    mechanism: "Inhibits mitochondrial Complex I, raising AMP:ATP ratio and activating AMPK. Reduces hepatic gluconeogenesis. Modulates gut microbiome (increases Akkermansia muciniphila). Inhibits mTORC1 and may activate FOXO transcription factors. Anti-inflammatory via NF-κB suppression.",
    benefits: [
      "Gold standard T2DM pharmacotherapy with 70+ years of safety data",
      "Epidemiological data consistently associates use with reduced cancer incidence",
      "Cardiovascular risk reduction independent of glucose lowering",
      "Weight neutrality or modest weight reduction",
    ],
    warnings: [
      "Requires prescription in most countries — discuss with your physician",
      "Depletes Vitamin B12 — supplement B12 or monitor serum levels annually",
      "Contraindicated when eGFR <30 ml/min (lactic acidosis risk in renal failure)",
      "Evidence suggests it may attenuate some exercise adaptation gains — controversial, ongoing debate",
      "Always use ER (extended-release) formulation to reduce GI side effects",
    ],
    stack: "May be combined with Berberine (discuss with physician). NMN for NAD+ replenishment. Avoid combining with iodinated contrast dye (hold 48 hours pre/post imaging).",
    color: "#DC2626",
  },
  {
    id: "ala",
    name: "Alpha-Lipoic Acid (R-ALA)",
    abbrev: "ALA",
    category: "metabolic",
    tagline: "Mitochondrial antioxidant that regenerates other antioxidants and improves insulin signalling",
    evidence: "B",
    evidenceNote: "Well-established for diabetic peripheral neuropathy in European guidelines; glucose data consistent",
    dose: "300–600 mg/day R-ALA (R-form only — avoid racemic). Take on an empty stomach 30 min before meals. Split into 2 doses if >300 mg.",
    mechanism: "Both an antioxidant and a cofactor in mitochondrial pyruvate dehydrogenase complex. Converted to dihydrolipoic acid (DHLA), which regenerates vitamins C, E, CoQ10 and glutathione. Enhances GLUT4 translocation, mimicking insulin signalling. Chelates heavy metals including mercury, lead and arsenic.",
    benefits: [
      "Peripheral neuropathy symptom reduction (burning, numbness) — approved in Germany for this indication",
      "Improved insulin sensitivity and fasting glucose reduction",
      "Regeneration of the body's antioxidant network",
      "Heavy metal chelation support",
    ],
    warnings: [
      "R-form is the biologically active isomer — racemic (R+S) products may be less effective and the S-isomer may have counterproductive effects",
      "Can significantly lower blood glucose — use caution with antidiabetic medications",
      "Mineral absorption interference (especially iron, zinc) — take away from food and mineral supplements",
      "Theoretically depletes thiamine (B1) at very high doses — supplement B-complex if using long-term at high doses",
    ],
    stack: "Synergistic antioxidant stack: ALA + Vitamin C + Vitamin E + CoQ10. Complementary with Berberine for metabolic health.",
    color: "#DC2626",
  },
];

// ─── Section order ────────────────────────────────────────────────────────────

const SECTION_ORDER: Category[] = ["glp1", "healing", "nootropics", "sleep", "hormonal", "metabolic"];

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ supp, onClose }: { supp: Supplement; onClose: () => void }) {
  const cat = CAT_META[supp.category];
  const grade = GRADES[supp.evidence];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.40)",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          width: "100%", maxWidth: "680px",
          maxHeight: "88vh", overflowY: "auto",
          padding: "0 0 32px",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.18)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "16px 24px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: supp.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: supp.abbrev.length <= 3 ? 15 : 12,
            letterSpacing: "-0.5px",
          }}>
            {supp.abbrev}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0D0D0D", margin: 0 }}>{supp.name}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
                background: grade.bg, color: grade.color, letterSpacing: "0.02em" }}>
                {supp.evidence} — {grade.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0", lineHeight: 1.5 }}>{supp.tagline}</p>
            <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 999,
              background: cat.bg, color: cat.color }}>
              {cat.label}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Evidence note */}
          <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "12px 16px",
            borderLeft: `3px solid ${supp.color}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: supp.color, margin: "0 0 4px" }}>Evidence basis</p>
            <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.55 }}>{supp.evidenceNote}</p>
          </div>

          {/* Dose */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: "#9CA3AF", margin: "0 0 8px" }}>Dosing protocol</p>
            <p style={{ fontSize: 14, color: "#0D0D0D", margin: 0, lineHeight: 1.6 }}>{supp.dose}</p>
          </div>

          {/* Mechanism */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: "#9CA3AF", margin: "0 0 8px" }}>Mechanism of action</p>
            <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.65 }}>{supp.mechanism}</p>
          </div>

          {/* Benefits */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: "#9CA3AF", margin: "0 0 8px" }}>Key benefits</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {supp.benefits.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: supp.color,
                    flexShrink: 0, marginTop: 5 }} />
                  <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.55 }}>{b}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: "#9CA3AF", margin: "0 0 8px" }}>Cautions & interactions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {supp.warnings.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B",
                    flexShrink: 0, marginTop: 5 }} />
                  <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.55 }}>{w}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stack suggestion */}
          {supp.stack && (
            <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "12px 16px",
              border: "1px solid #BBF7D0" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                color: "#15803D", margin: "0 0 4px" }}>Stack suggestions</p>
              <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.55 }}>{supp.stack}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.5, margin: 0,
            borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
            This information is for educational purposes only and does not constitute medical advice.
            Always consult a qualified healthcare professional before starting any supplement regimen.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Supplement Card ──────────────────────────────────────────────────────────

function SupplementCard({ supp, onClick }: { supp: Supplement; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const grade = GRADES[supp.evidence];
  const cat   = CAT_META[supp.category];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hov ? "#D1D5DB" : "#F3F4F6"}`,
        borderRadius: 16,
        padding: "18px 18px 14px",
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s, transform .15s",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.09)" : "0 1px 3px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-2px)" : "none",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: supp.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800,
          fontSize: supp.abbrev.length <= 3 ? 14 : supp.abbrev.length <= 4 ? 11 : 9,
          letterSpacing: "-0.5px",
        }}>{supp.abbrev}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0D0D0D", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {supp.name}
          </p>
          <p style={{ fontSize: 11.5, color: "#6B7280", margin: "2px 0 0", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {supp.tagline}
          </p>
        </div>
      </div>

      {/* Category + Evidence badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          padding: "3px 9px", borderRadius: 999, background: cat.bg, color: cat.color }}>
          {cat.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
          background: grade.bg, color: grade.color }}>
          {supp.evidence} · {grade.label}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#F3F4F6" }} />

      {/* Dose */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
          color: "#9CA3AF", margin: "0 0 4px" }}>Standard dose</p>
        <p style={{ fontSize: 12.5, color: "#374151", margin: 0, lineHeight: 1.45 }}>
          {(() => {
            const m = supp.dose.match(/^(.+?)\.\s+[A-Z]/);
            return m ? m[1] + "." : supp.dose.slice(0, 90) + (supp.dose.length > 90 ? "…" : "");
          })()}
        </p>
      </div>

      {/* Benefits preview */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
          color: "#9CA3AF", margin: "0 0 5px" }}>Key benefits</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {supp.benefits.slice(0, 2).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span style={{ color: supp.color, fontSize: 9, marginTop: 3, flexShrink: 0 }}>▸</span>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.4 }}>{b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tap hint */}
      <p style={{ fontSize: 10.5, color: hov ? supp.color : "#9CA3AF", margin: 0,
        fontWeight: 600, transition: "color .15s" }}>
        {hov ? "View full profile →" : "Tap for full profile"}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PrototypeSupplements() {
  const [, setLocation] = useLocation();
  const [activeCat, setActiveCat]   = useState<Category | "all">("all");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Supplement | null>(null);

  const q = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    return SUPPLEMENTS.filter(s => {
      const matchCat = activeCat === "all" || s.category === activeCat;
      const matchQ   = !q
        || s.name.toLowerCase().includes(q)
        || s.tagline.toLowerCase().includes(q)
        || s.mechanism.toLowerCase().includes(q)
        || s.benefits.some(b => b.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [activeCat, q]);

  const grouped = useMemo(() => {
    if (activeCat !== "all" || q) return null;
    const map: Record<Category, Supplement[]> = {
      glp1: [], healing: [], nootropics: [], sleep: [], hormonal: [], metabolic: [],
    };
    for (const s of SUPPLEMENTS) map[s.category].push(s);
    return SECTION_ORDER.map(cat => ({ cat, items: map[cat] })).filter(g => g.items.length > 0);
  }, [activeCat, q]);

  return (
    <div style={{
      minHeight: "100vh", background: "#FAFAFA",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Detail panel */}
      {selected && <DetailPanel supp={selected} onClose={() => setSelected(null)} />}

      {/* ── Sticky header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid #F3F4F6",
        padding: "0 20px", height: "56px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={() => setLocation("/prototypehome")}
          style={{ background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, color: "#6B7280", padding: 0 }}
        >
          <ChevronLeft size={18} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Home</span>
        </button>
        <div style={{ width: 1, height: 20, background: "#E5E7EB" }} />
        <h1 style={{ fontSize: 15, fontWeight: 700, color: "#0D0D0D", margin: 0 }}>
          Supplement Protocols
        </h1>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{SUPPLEMENTS.length} compounds</span>
      </header>

      {/* ── Hero ── */}
      <div style={{ padding: "48px 24px 36px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700,
          letterSpacing: "-0.03em", lineHeight: 1.1, color: "#0D0D0D", margin: "0 0 12px" }}>
          Supplement protocols,<br />evidence graded.
        </h2>
        <p style={{ fontSize: 16, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
          {SUPPLEMENTS.length} compounds across 6 categories — mechanism, dosing, benefits and interactions in one place.
        </p>
      </div>

      {/* ── Sticky filter bar ── */}
      <div style={{
        position: "sticky", top: 56, zIndex: 40,
        background: "rgba(250,250,250,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #F3F4F6",
        padding: "12px 24px",
        overflowX: "auto",
      }}>
        {/* Search */}
        <div style={{ position: "relative", maxWidth: 460, margin: "0 auto 12px" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, benefit or mechanism…"
            style={{
              width: "100%", height: 40, paddingLeft: 36, paddingRight: search ? 36 : 14,
              borderRadius: 9999, border: "1px solid #E5E7EB",
              background: "#fff", fontSize: 13.5, color: "#0D0D0D",
              outline: "none", boxSizing: "border-box",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 18, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => {
            const active = activeCat === cat.id;
            return (
              <button key={cat.id}
                onClick={() => setActiveCat(cat.id as Category | "all")}
                style={{
                  height: 32, padding: "0 14px", borderRadius: 9999,
                  border: active ? `1.5px solid ${cat.color}` : "1.5px solid #E5E7EB",
                  background: active ? cat.color : "#fff",
                  color: active ? "#fff" : "#374151",
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  transition: "all .15s", whiteSpace: "nowrap",
                }}>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <main style={{ padding: "32px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Filtered / search results */}
        {(activeCat !== "all" || q) ? (
          <>
            {filtered.length > 0 ? (
              <>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 20px" }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  {q ? ` for "${search}"` : ""}
                  {activeCat !== "all" ? ` in ${CAT_META[activeCat as Category].label}` : ""}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {filtered.map(s => <SupplementCard key={s.id} supp={s} onClick={() => setSelected(s)} />)}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
                <p style={{ fontSize: 16, margin: "0 0 8px" }}>No matches found</p>
                <p style={{ fontSize: 14, margin: 0 }}>Try a different search term or category</p>
              </div>
            )}
          </>
        ) : (
          /* Grouped by category */
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {grouped?.map(({ cat, items }) => {
              const meta = CAT_META[cat];
              return (
                <section key={cat}>
                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 4, height: 20, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0D0D0D", margin: 0 }}>{meta.label}</h3>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999,
                      background: meta.bg, color: meta.color }}>
                      {items.length}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "#F3F4F6" }} />
                  </div>

                  {/* Card grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {items.map(s => <SupplementCard key={s.id} supp={s} onClick={() => setSelected(s)} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Disclaimer footer ── */}
      <div style={{ borderTop: "1px solid #F3F4F6", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, maxWidth: 600, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          All content is for educational purposes only. Evidence grades reflect the general state of human clinical research and do not constitute medical advice. Consult a qualified clinician before using any compound.
        </p>
      </div>
    </div>
  );
}
