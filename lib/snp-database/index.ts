export type DnaCategory =
  | "Methylation & B Vitamins"
  | "Brain & Mood"
  | "Heart Health"
  | "Hormones"
  | "Metabolic Health"
  | "Inflammation"
  | "Immune & Autoimmune"
  | "Gut Health"
  | "Exercise & Athletics"
  | "Longevity & Detox"
  | "Disease Prevention"
  | "Fertility"
  | "Nutrients & Vitamins";

export type RiskLevel = "high" | "moderate" | "low" | "protective" | "neutral";

export interface SnpEntry {
  rsid: string;
  gene: string;
  category: DnaCategory;
  name: string;
  effectAllele: string;
  otherAllele: string;
  effectHomozygous: string;
  effectHeterozygous: string;
  effectOther: string;
  riskHomozygous: RiskLevel;
  riskHeterozygous: RiskLevel;
  notes: string;
  source: string;
}

export const SNP_DATABASE: SnpEntry[] = [
  // ── Methylation & B Vitamins ────────────────────────────────────────────────
  { rsid:"rs1801133", gene:"MTHFR", category:"Methylation & B Vitamins", name:"MTHFR C677T",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — MTHFR enzyme activity ~30% of normal. Strongly impaired folate-to-methylfolate conversion. High homocysteine risk. Use methylfolate (5-MTHF), not folic acid.",
    effectHeterozygous:"CT — MTHFR enzyme activity ~65% of normal. Moderate impairment. Methylfolate preferred over folic acid.",
    effectOther:"CC — Normal MTHFR activity.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"Most studied methylation variant. TT: avoid folic acid fortification, use 5-MTHF or folinic acid. Riboflavin (B2) improves enzyme efficiency. High homocysteine (>10 umol/L) confirms functional impact.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1801131", gene:"MTHFR", category:"Methylation & B Vitamins", name:"MTHFR A1298C",
    effectAllele:"C", otherAllele:"A",
    effectHomozygous:"CC — Reduces BH4 (tetrahydrobiopterin) production. Impacts neurotransmitter synthesis and nitric oxide pathway. Less homocysteine impact than C677T.",
    effectHeterozygous:"AC — Mild reduction in BH4. Clinically significant mainly when combined with C677T.",
    effectOther:"AA — Normal function.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"Compound heterozygous (C677T + A1298C) is more impactful than either alone. BH4 supports dopamine, serotonin, and norepinephrine synthesis. L-methylfolate and B6 (P5P form) are key.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1805087", gene:"MTR", category:"Methylation & B Vitamins", name:"MTR A2756G",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG — Methionine synthase variant. Higher B12 requirement. May struggle with methyl-B12 utilisation.",
    effectHeterozygous:"AG — Mildly elevated B12 need.",
    effectOther:"AA — Normal methionine synthase.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"MTR uses B12 as a cofactor to recycle homocysteine to methionine. G allele increases B12 demand. Methyl-B12 or hydroxo-B12 recommended over cyanocobalamin.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1801394", gene:"MTRR", category:"Methylation & B Vitamins", name:"MTRR A66G",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG — Methionine synthase reductase impaired. B12 regeneration reduced. Synergistic with MTR A2756G.",
    effectHeterozygous:"AG — Mild B12 regeneration impairment.",
    effectOther:"AA — Normal MTRR.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"MTRR recycles inactive B12 back to active form. GG carriers often benefit from methylcobalamin.",
    source:"GeneticLifeHacks" },

  { rsid:"rs602662", gene:"FUT2", category:"Methylation & B Vitamins", name:"FUT2 Secretor Status",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Non-secretor. Lower B12 absorption, different gut microbiome composition.",
    effectHeterozygous:"AG — Secretor (dominant). Normal B12 absorption.",
    effectOther:"GG — Secretor. Normal B12 absorption.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"Non-secretors absorb less B12 from food and supplements. Higher doses or sublingual B12 recommended.",
    source:"GeneticLifeHacks" },

  { rsid:"rs492602", gene:"FUT2", category:"Methylation & B Vitamins", name:"FUT2 rs492602 Secretor",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Non-secretor variant. Impaired intrinsic factor-independent B12 absorption.",
    effectHeterozygous:"AG — Heterozygous secretor.",
    effectOther:"GG — Secretor.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"Secondary FUT2 secretor SNP. Combined with rs602662 confirms non-secretor status. Use methylcobalamin sublingual or B12 injections.",
    source:"GeneticLifeHacks" },

  // ── Nutrients & Vitamins ────────────────────────────────────────────────────
  { rsid:"rs2282679", gene:"GC", category:"Nutrients & Vitamins", name:"Vitamin D Binding Protein",
    effectAllele:"T", otherAllele:"A",
    effectHomozygous:"TT — Significantly reduced vitamin D binding protein. Lower circulating 25-OH vitamin D. Much higher supplementation doses needed.",
    effectHeterozygous:"AT — Moderately reduced D-binding protein.",
    effectOther:"AA — Normal vitamin D transport.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"TT carriers often have 25-OH vitamin D 20-30% lower than AA at the same intake. 4,000-8,000 IU/day plus K2 typically required.",
    source:"GeneticLifeHacks" },

  { rsid:"rs10741657", gene:"CYP2R1", category:"Nutrients & Vitamins", name:"Vitamin D Hydroxylase CYP2R1",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Reduced hepatic 25-hydroxylation of vitamin D. Lower 25-OH vitamin D despite adequate sun/supplementation.",
    effectHeterozygous:"AG — Mildly reduced vitamin D activation.",
    effectOther:"GG — Normal vitamin D hydroxylation.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"CYP2R1 converts vitamin D to 25-OH vitamin D. AA carriers may need higher supplementation doses.",
    source:"GeneticLifeHacks" },

  { rsid:"rs731236", gene:"VDR", category:"Nutrients & Vitamins", name:"Vitamin D Receptor TaqI",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Reduced vitamin D receptor activity. Vitamin D may not exert full genomic effects even when blood levels are adequate.",
    effectHeterozygous:"AG — Mild receptor reduction.",
    effectOther:"GG — Normal receptor activity.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"VDR variants affect cellular response to vitamin D. Can explain why some people remain symptomatic despite optimal serum D levels. Magnesium cofactor is critical.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1544410", gene:"VDR", category:"Nutrients & Vitamins", name:"Vitamin D Receptor BsmI",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Reduced VDR transcription activity.",
    effectHeterozygous:"CT — Moderate VDR effect.",
    effectOther:"CC — Normal VDR.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"BsmI VDR polymorphism. Combined with TaqI, TT carriers have notably reduced vitamin D response. Linked to increased autoimmune and bone disease risk.",
    source:"GeneticLifeHacks" },

  { rsid:"rs4646536", gene:"CYP27B1", category:"Nutrients & Vitamins", name:"Vitamin D Activation CYP27B1",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Reduced 1,25-dihydroxyvitamin D (active vitamin D) production in kidneys.",
    effectHeterozygous:"CT — Mildly reduced active D.",
    effectOther:"CC — Normal kidney D activation.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"CYP27B1 converts 25-OH vitamin D to calcitriol. Reduced activity means adequate serum 25-OH D may not translate to sufficient active form.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1761667", gene:"CD36", category:"Nutrients & Vitamins", name:"Fat Taste Receptor CD36",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Reduced fat taste sensitivity. Less able to detect dietary fat. Tends to overeat fat without sensory feedback.",
    effectHeterozygous:"AG — Moderate fat taste reduction.",
    effectOther:"GG — Normal fat taste sensitivity.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"CD36 mediates fat detection in taste buds. AA carriers eat more dietary fat because they lack the satiety signal from fat flavour. Relevant for body composition strategies.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1799853", gene:"CYP2C9", category:"Nutrients & Vitamins", name:"CYP2C9 Drug Metabolism",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Poor metaboliser of CYP2C9 substrates. Warfarin, ibuprofen, diclofenac, some statins metabolised much more slowly.",
    effectHeterozygous:"CT — Intermediate metaboliser.",
    effectOther:"CC — Normal CYP2C9 metabolism.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"CYP2C9 metabolises ~15% of prescribed drugs. TT carriers at high risk of drug toxicity with standard doses of warfarin, NSAIDs, some anti-epileptics, and oral hypoglycaemics.",
    source:"GeneticLifeHacks" },

  { rsid:"rs4244285", gene:"CYP2C19", category:"Nutrients & Vitamins", name:"CYP2C19 PPI & Drug Metabolism",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Poor metaboliser. PPIs (omeprazole, esomeprazole) and clopidogrel dramatically affected.",
    effectHeterozygous:"AG — Intermediate metaboliser.",
    effectOther:"GG — Extensive (normal) metaboliser.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"AA: PPIs last much longer (B12 absorption risk long-term). Clopidogrel NOT activated properly in AA -- major cardiovascular risk post-stent. Ticagrelor/prasugrel are alternatives.",
    source:"GeneticLifeHacks" },

  // ── Brain & Mood ────────────────────────────────────────────────────────────
  { rsid:"rs4680", gene:"COMT", category:"Brain & Mood", name:"COMT Val158Met",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA (Met/Met) — Low COMT activity. Dopamine cleared slowly from prefrontal cortex. Better focus under low stress; worse under high stress (worrier phenotype). Sensitive to excess methyl donors.",
    effectHeterozygous:"AG (Val/Met) — Intermediate COMT. Balanced dopamine clearance.",
    effectOther:"GG (Val/Val) — High COMT activity. Dopamine cleared quickly (warrior phenotype). Handles stress well, lower baseline prefrontal dopamine tone.",
    riskHomozygous:"moderate", riskHeterozygous:"neutral",
    notes:"COMT degrades dopamine and adrenaline. AA carriers: cautious with high-dose methylfolate, SAM-e, methyl-B12 (overmethylation can cause anxiety). Support for AA: niacin, riboflavin, exercise. GG may benefit from dopamine precursors (tyrosine, mucuna).",
    source:"GeneticLifeHacks" },

  { rsid:"rs6323", gene:"MAOA", category:"Brain & Mood", name:"MAO-A rs6323",
    effectAllele:"T", otherAllele:"G",
    effectHomozygous:"TT — Lower MAO-A activity. Serotonin, dopamine, norepinephrine cleared more slowly. Higher mood floor but potential mood swings; higher impulsivity risk.",
    effectHeterozygous:"TG — Intermediate activity.",
    effectOther:"GG — Higher MAO-A activity. Faster serotonin breakdown; linked to depression risk in stressful environments.",
    riskHomozygous:"moderate", riskHeterozygous:"neutral",
    notes:"MAO-A degrades serotonin, dopamine, and norepinephrine. Low-activity variants: higher baseline mood but greater sensitivity to stress. Riboflavin (B2) is a cofactor.",
    source:"GeneticLifeHacks" },

  { rsid:"rs6265", gene:"BDNF", category:"Brain & Mood", name:"BDNF Val66Met",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA (Met/Met) — Significantly reduced activity-dependent BDNF secretion (~30% less). Higher risk of depression, anxiety, memory impairment. Poorer response to antidepressants.",
    effectHeterozygous:"AG (Val/Met) — Moderately reduced BDNF secretion.",
    effectOther:"GG (Val/Val) — Normal BDNF secretion.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"BDNF is critical for neuroplasticity, memory, and mood regulation. Met carriers benefit most from: aerobic exercise, intermittent fasting, omega-3 (DHA), Lion's Mane. Ipamorelin/GH peptides may increase BDNF via IGF-1 pathway.",
    source:"GeneticLifeHacks" },

  { rsid:"rs4570625", gene:"TPH2", category:"Brain & Mood", name:"Tryptophan Hydroxylase 2",
    effectAllele:"T", otherAllele:"G",
    effectHomozygous:"TT — Reduced serotonin synthesis in the brain. Higher risk of depression, OCD, anxiety.",
    effectHeterozygous:"GT — Moderately reduced brain serotonin synthesis.",
    effectOther:"GG — Normal serotonin synthesis.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"TPH2 is rate-limiting for brain serotonin synthesis. TT carriers often benefit from: tryptophan/5-HTP, sunlight, exercise, low-inflammatory diet. P5P (B6) is an essential cofactor.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1800532", gene:"TPH1", category:"Brain & Mood", name:"Tryptophan Hydroxylase 1",
    effectAllele:"A", otherAllele:"C",
    effectHomozygous:"AA — Reduced peripheral serotonin synthesis. Lower gut serotonin.",
    effectHeterozygous:"AC — Moderate reduction.",
    effectOther:"CC — Normal peripheral serotonin.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"TPH1 is expressed mainly in gut enterochromaffin cells. Influences gut motility, platelet aggregation, and peripheral serotonin signalling.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1800497", gene:"DRD2", category:"Brain & Mood", name:"DRD2/ANKK1 TaqIA",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — ~30-40% fewer D2 receptors. Lower dopamine sensitivity. Higher risk of addictive behaviours, obesity, ADHD patterns. More prone to anhedonia.",
    effectHeterozygous:"AG — Mildly reduced D2 receptor density.",
    effectOther:"GG — Normal D2 receptor density.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"D2 receptors modulate dopamine reward pathway. AA carriers have impaired reward response. Benefits from: high-protein diet (tyrosine), dopaminergic exercise, mucuna pruriens.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1611115", gene:"DBH", category:"Brain & Mood", name:"Dopamine Beta-Hydroxylase",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Significantly lower DBH activity. Higher dopamine, lower norepinephrine. Associated with ADHD, risk-taking behaviour.",
    effectHeterozygous:"CT — Mildly lower DBH.",
    effectOther:"CC — Normal DBH.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"DBH converts dopamine to norepinephrine. Low activity leads to high dopamine accumulation. Vitamin C is a DBH cofactor.",
    source:"GeneticLifeHacks" },

  // ── Heart Health ────────────────────────────────────────────────────────────
  { rsid:"rs6025", gene:"F5", category:"Heart Health", name:"Factor V Leiden",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Homozygous Factor V Leiden. Extremely high VTE risk (~50-100x normal). Lifelong anticoagulation typically required.",
    effectHeterozygous:"AG — Heterozygous Factor V Leiden. 4-8x increased VTE risk. Significant with oral oestrogen, HRT, surgery, or prolonged immobilisation.",
    effectOther:"GG — No Factor V Leiden mutation.",
    riskHomozygous:"high", riskHeterozygous:"high",
    notes:"Most common inherited thrombophilia in Europeans. Critical for women on OCP or oral HRT -- transdermal routes preferred. Men on high-dose testosterone with elevated haematocrit should be aware. Requires haematologist input.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1799963", gene:"F2", category:"Heart Health", name:"Prothrombin G20210A",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Homozygous prothrombin mutation. Very high VTE risk.",
    effectHeterozygous:"AG — 2-3x increased risk of DVT and PE.",
    effectOther:"GG — Normal prothrombin gene.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"Second most common thrombophilia. Combined with Factor V Leiden dramatically increases clot risk. Particularly important for women on oestrogen-containing hormonal therapy.",
    source:"GeneticLifeHacks" },

  { rsid:"rs4343", gene:"ACE", category:"Heart Health", name:"ACE I/D rs4343",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG (DD proxy) — Higher ACE activity. Greater angiotensin II production. Elevated blood pressure tendency. Higher cardiac risk with AAS.",
    effectHeterozygous:"AG (ID) — Intermediate ACE activity.",
    effectOther:"AA (II proxy) — Lower ACE activity. Lower blood pressure tendency. Endurance performance advantage.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"ACE D allele linked to higher enzyme activity, higher blood pressure, greater power output in athletics, but also elevated cardiovascular risk. Important context for users on blood pressure-raising compounds.",
    source:"GeneticLifeHacks" },

  { rsid:"rs5370", gene:"EDN1", category:"Heart Health", name:"Endothelin-1 Lys198Asn",
    effectAllele:"T", otherAllele:"G",
    effectHomozygous:"TT — Elevated endothelin-1. Increased vasoconstriction, higher blood pressure risk.",
    effectHeterozygous:"GT — Moderate effect.",
    effectOther:"GG — Normal endothelin-1.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"Endothelin-1 is a potent vasoconstrictor. TT carriers should monitor blood pressure closely, especially on anabolic protocols. Magnesium, taurine, and sodium restriction help.",
    source:"GeneticLifeHacks" },

  // ── Inflammation ────────────────────────────────────────────────────────────
  { rsid:"rs1800629", gene:"TNF", category:"Inflammation", name:"TNF-alpha -308G>A",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — High TNF-alpha producer. Significant pro-inflammatory tendency. Elevated risk of autoimmune conditions and metabolic syndrome.",
    effectHeterozygous:"AG — Moderately elevated TNF-alpha production.",
    effectOther:"GG — Normal TNF-alpha production.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"TNF-alpha is a master inflammatory cytokine. A allele carriers benefit from anti-inflammatory lifestyle: omega-3 (3-4g EPA+DHA), curcumin, resveratrol, adequate sleep. BPC-157 has shown TNF-modulating properties.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1800795", gene:"IL6", category:"Inflammation", name:"IL-6 -174G>C",
    effectAllele:"C", otherAllele:"G",
    effectHomozygous:"CC — Low IL-6 producer. May have blunted acute phase response.",
    effectHeterozygous:"GC — Intermediate IL-6.",
    effectOther:"GG — Higher IL-6 production. Greater acute inflammatory response.",
    riskHomozygous:"neutral", riskHeterozygous:"neutral",
    notes:"IL-6 has both pro- and anti-inflammatory roles. GG carriers may have elevated CRP without significant disease. CC carriers may have a blunted immune response.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1205", gene:"CRP", category:"Inflammation", name:"C-Reactive Protein rs1205",
    effectAllele:"A", otherAllele:"C",
    effectHomozygous:"AA — Lower baseline CRP.",
    effectHeterozygous:"AC — Intermediate CRP baseline.",
    effectOther:"CC — Higher CRP baseline. Elevated cardiovascular risk marker.",
    riskHomozygous:"protective", riskHeterozygous:"neutral",
    notes:"CRP gene variants modulate baseline inflammation. CC carriers may have chronically elevated CRP reflecting genetics rather than active inflammation.",
    source:"GeneticLifeHacks" },

  // ── Hormones ─────────────────────────────────────────────────────────────────
  { rsid:"rs743572", gene:"CYP17A1", category:"Hormones", name:"CYP17A1 Steroid 17a-Hydroxylase",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Mildly higher androgen and oestrogen production from adrenal and gonadal steroidogenesis.",
    effectHeterozygous:"AG — Slightly elevated steroid synthesis.",
    effectOther:"GG — Lower baseline steroid synthesis.",
    riskHomozygous:"neutral", riskHeterozygous:"neutral",
    notes:"CYP17A1 catalyses key steps in testosterone and cortisol synthesis. A allele associated with slightly higher endogenous sex steroid production.",
    source:"GeneticLifeHacks" },

  { rsid:"rs10046", gene:"CYP19A1", category:"Hormones", name:"Aromatase CYP19A1 rs10046",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Higher aromatase activity. Greater conversion of testosterone to oestradiol. Elevated E2 risk in men; higher oestrogen background in women.",
    effectHeterozygous:"CT — Moderate aromatase activity.",
    effectOther:"CC — Lower aromatase activity. Less testosterone-to-oestrogen conversion.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"CYP19A1/aromatase converts androgens to oestrogens. TT men on TRT or AAS: higher E2 tendency, more likely to need an AI. In women, higher oestrogen-related breast cancer risk.",
    source:"GeneticLifeHacks" },

  { rsid:"rs700518", gene:"CYP19A1", category:"Hormones", name:"Aromatase CYP19A1 rs700518",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG — Higher aromatase expression.",
    effectHeterozygous:"AG — Intermediate aromatase.",
    effectOther:"AA — Lower aromatase.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"Secondary aromatase variant. Combined with rs10046, GG further elevates aromatisation tendency.",
    source:"GeneticLifeHacks" },

  { rsid:"rs6259", gene:"SHBG", category:"Hormones", name:"SHBG Sex Hormone Binding Globulin",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Lower SHBG levels. Higher free testosterone and free oestrogen fractions.",
    effectHeterozygous:"AG — Moderately lower SHBG.",
    effectOther:"GG — Higher SHBG. Lower free hormone levels.",
    riskHomozygous:"neutral", riskHeterozygous:"neutral",
    notes:"Lower SHBG (AA) means more free T and E2. Can explain why SHBG-suppressing compounds have larger free T impact in AA carriers.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1799941", gene:"SHBG", category:"Hormones", name:"SHBG Promoter Variant",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Significantly lower SHBG. Relevant for TRT dosing and free testosterone calculations.",
    effectHeterozygous:"AG — Moderate SHBG reduction.",
    effectOther:"GG — Normal-high SHBG.",
    riskHomozygous:"neutral", riskHeterozygous:"neutral",
    notes:"AA carriers with naturally low SHBG will have higher free T fractions. May need less total testosterone to achieve target free T.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1048943", gene:"CYP1A1", category:"Hormones", name:"CYP1A1 Oestrogen Metabolism",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG — High CYP1A1 activity. Faster oestrogen metabolism via 2-OH pathway.",
    effectHeterozygous:"AG — Moderately elevated CYP1A1.",
    effectOther:"AA — Normal CYP1A1.",
    riskHomozygous:"low", riskHeterozygous:"low",
    notes:"CYP1A1 hydroxylates oestrogen to 2-OH metabolites (less oestrogenic). DIM and cruciferous vegetables support 2-OH pathway.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1056836", gene:"CYP1B1", category:"Hormones", name:"CYP1B1 Oestrogen 4-OH Pathway",
    effectAllele:"G", otherAllele:"C",
    effectHomozygous:"GG — Higher CYP1B1 activity. Shifts oestrogen to 4-OH pathway. More genotoxic oestrogen metabolites. Higher breast/endometrial cancer risk.",
    effectHeterozygous:"CG — Moderate 4-OH shift.",
    effectOther:"CC — Lower 4-OH oestrogen pathway.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"CYP1B1 produces 4-hydroxy-oestrogen metabolites which can form DNA adducts. GG women on HRT or OCP should prioritise protective pathways: DIM, broccoli sprouts, methylation support, antioxidants.",
    source:"GeneticLifeHacks" },

  // ── Metabolic Health ────────────────────────────────────────────────────────
  { rsid:"rs7903146", gene:"TCF7L2", category:"Metabolic Health", name:"TCF7L2 Type 2 Diabetes Risk",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — ~2x increased type 2 diabetes risk vs CC. Impaired incretin response and beta-cell function.",
    effectHeterozygous:"CT — ~1.4x increased diabetes risk.",
    effectOther:"CC — Normal TCF7L2 -- lowest diabetes risk.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"TCF7L2 is the strongest common genetic risk factor for T2D. TT carriers: low-GI diet is essential, monitor HbA1c and fasting insulin. Exercise dramatically reduces the genetic risk.",
    source:"GeneticLifeHacks" },

  { rsid:"rs9939609", gene:"FTO", category:"Metabolic Health", name:"FTO Fat Mass & Obesity",
    effectAllele:"A", otherAllele:"T",
    effectHomozygous:"AA — ~3 kg higher average body weight vs TT. Blunted satiety signalling. Impaired fat oxidation. Higher obesity risk.",
    effectHeterozygous:"AT — ~1.5 kg higher average weight vs TT.",
    effectOther:"TT — No FTO weight effect.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"FTO variants increase obesity risk mainly through appetite dysregulation. AA carriers: protein-rich meals significantly improve satiety. High-intensity exercise largely negates the genetic effect.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1801282", gene:"PPARG", category:"Metabolic Health", name:"PPARG Pro12Ala",
    effectAllele:"G", otherAllele:"C",
    effectHomozygous:"GG (Ala/Ala) — Lower PPARG activity. Reduced fat storage promotion. Higher insulin sensitivity in most contexts.",
    effectHeterozygous:"CG (Pro/Ala) — Modest insulin sensitivity benefit.",
    effectOther:"CC (Pro/Pro) — Normal PPARG. Slightly higher metabolic syndrome risk.",
    riskHomozygous:"protective", riskHeterozygous:"protective",
    notes:"PPARG regulates adipogenesis and insulin sensitisation. The Ala variant (G allele) is generally protective against T2D and associated with better fat oxidation.",
    source:"GeneticLifeHacks" },

  { rsid:"rs266729", gene:"ADIPOQ", category:"Metabolic Health", name:"Adiponectin ADIPOQ",
    effectAllele:"G", otherAllele:"C",
    effectHomozygous:"GG — Lower adiponectin levels. Higher metabolic syndrome risk.",
    effectHeterozygous:"CG — Moderately lower adiponectin.",
    effectOther:"CC — Higher adiponectin. Metabolically protective.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"Adiponectin improves insulin sensitivity. GG carriers: omega-3, exercise, and caloric restriction all raise adiponectin. Berberine and metformin also increase adiponectin.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1044498", gene:"ENPP1", category:"Metabolic Health", name:"ENPP1 K121Q Insulin Resistance",
    effectAllele:"C", otherAllele:"A",
    effectHomozygous:"CC (Gln/Gln) — Highest insulin receptor blockade. Significant insulin resistance predisposition.",
    effectHeterozygous:"AC — Moderate insulin resistance risk.",
    effectOther:"AA (Lys/Lys) — Normal insulin signalling.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"ENPP1 inhibits insulin receptor tyrosine kinase. CC carriers: low-carbohydrate diet, berberine, metformin, resistance training are key interventions.",
    source:"GeneticLifeHacks" },

  // ── Immune & Autoimmune ─────────────────────────────────────────────────────
  { rsid:"rs2476601", gene:"PTPN22", category:"Immune & Autoimmune", name:"PTPN22 R620W",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — High risk of autoimmune conditions including RA, type 1 diabetes, lupus, Graves disease.",
    effectHeterozygous:"AG — ~1.8x increased autoimmune risk.",
    effectOther:"GG — No elevated autoimmune risk.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"PTPN22 modulates T-cell activation. A allele impairs immune self-tolerance. Carriers should be aware of autoimmune triggers: infections, gut permeability, high-inflammatory diet.",
    source:"GeneticLifeHacks" },

  { rsid:"rs3087243", gene:"CTLA4", category:"Immune & Autoimmune", name:"CTLA4 CT60",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG — Reduced CTLA4 expression. Impaired immune checkpoint function. Higher autoimmune risk (thyroid, T1D).",
    effectHeterozygous:"AG — Moderate autoimmune risk elevation.",
    effectOther:"AA — Normal immune checkpoint.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"CTLA4 is a key immune braking mechanism on T-cells. Reduced expression leads to excessive T-cell activation and autoimmunity. Vitamin D adequacy supports CTLA4 pathway.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1800896", gene:"IL10", category:"Immune & Autoimmune", name:"IL-10 Anti-inflammatory",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Low IL-10 producer. Impaired anti-inflammatory response. Greater inflammation from infections, injury, or exercise.",
    effectHeterozygous:"AG — Intermediate IL-10 production.",
    effectOther:"GG — High IL-10 producer. Better immune resolution.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"IL-10 is the body's key anti-inflammatory cytokine. AA carriers have impaired resolution of inflammation. Omega-3, curcumin, and adequate sleep all support IL-10 production.",
    source:"GeneticLifeHacks" },

  // ── Gut Health ──────────────────────────────────────────────────────────────
  { rsid:"rs4988235", gene:"LCT", category:"Gut Health", name:"Lactase Persistence LCT -13910C>T",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Full lactase persistence. Can digest lactose throughout life.",
    effectHeterozygous:"CT — Partial lactase persistence. Moderate lactose tolerance.",
    effectOther:"CC — Lactase non-persistence. Primary lactose intolerance. Dairy causes GI symptoms.",
    riskHomozygous:"protective", riskHeterozygous:"neutral",
    notes:"CC = lactose intolerance genotype. Common in Asian, African, and Southern European populations. Whey protein concentrate may cause GI issues; isolate or non-dairy protein preferred.",
    source:"GeneticLifeHacks" },

  { rsid:"rs182549", gene:"LCT", category:"Gut Health", name:"Lactase LCT -22018G>A",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Lactase persistence.",
    effectHeterozygous:"AG — Partial persistence.",
    effectOther:"GG — Lactose intolerance.",
    riskHomozygous:"protective", riskHeterozygous:"neutral",
    notes:"Secondary lactase persistence SNP. Combined with rs4988235 confirms lactase status.",
    source:"GeneticLifeHacks" },

  { rsid:"rs2066844", gene:"NOD2", category:"Gut Health", name:"NOD2 R702W IBD Risk",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — High Crohn's disease risk (~20-40x). Impaired innate immune response to gut bacteria.",
    effectHeterozygous:"CT — 2-3x elevated Crohn's risk.",
    effectOther:"CC — No elevated IBD risk.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"NOD2 is a pattern recognition receptor in intestinal immune cells. Key gut support: butyrate, prebiotic fibre, probiotics, and gut-protective peptides (BPC-157).",
    source:"GeneticLifeHacks" },

  // ── Exercise & Athletics ────────────────────────────────────────────────────
  { rsid:"rs1815739", gene:"ACTN3", category:"Exercise & Athletics", name:"ACTN3 R577X",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT (XX) — Complete absence of alpha-actinin-3 in fast-twitch muscle fibres. Better endurance but lower peak power. Reduced sprint/power performance.",
    effectHeterozygous:"CT (RX) — Mixed fast/slow twitch profile. Versatile athletic profile.",
    effectOther:"CC (RR) — Full alpha-actinin-3. Power and sprint advantage. Elite sprinters and power athletes typically RR.",
    riskHomozygous:"low", riskHeterozygous:"neutral",
    notes:"ACTN3 is the sports gene. XX (TT) carriers excel at endurance; RR (CC) at power/sprint. No disease risk -- purely performance context.",
    source:"GeneticLifeHacks" },

  { rsid:"rs8192678", gene:"PPARGC1A", category:"Exercise & Athletics", name:"PGC-1alpha Gly482Ser",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA (Ser/Ser) — Reduced PGC-1alpha activity. Impaired mitochondrial biogenesis. Lower aerobic capacity development from training. Higher T2D risk.",
    effectHeterozygous:"AG (Gly/Ser) — Moderate reduction.",
    effectOther:"GG (Gly/Gly) — Optimal PGC-1alpha. Best training adaptations.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"PGC-1alpha is the master regulator of mitochondrial biogenesis. AA carriers need more training volume. Interventions: aerobic base, cold exposure, fasting, resveratrol, NAD+ precursors (NMN/NR).",
    source:"GeneticLifeHacks" },

  { rsid:"rs1042714", gene:"ADRB2", category:"Exercise & Athletics", name:"Beta-2 Adrenergic Receptor Gln27Glu",
    effectAllele:"C", otherAllele:"G",
    effectHomozygous:"CC (Glu/Glu) — Blunted lipolysis response to adrenaline. Poorer fat mobilisation during exercise. Higher obesity risk in women.",
    effectHeterozygous:"GC — Moderate effect.",
    effectOther:"GG (Gln/Gln) — Normal adrenergic fat mobilisation.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"ADRB2 receptors mediate adrenaline-driven fat release. CC carriers mobilise fat less efficiently during fasted cardio. High-intensity intervals may overcome this limitation.",
    source:"GeneticLifeHacks" },

  // ── Disease Prevention ──────────────────────────────────────────────────────
  { rsid:"rs1800562", gene:"HFE", category:"Disease Prevention", name:"HFE C282Y Hereditary Haemochromatosis",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Classic haemochromatosis genotype. High iron accumulation risk. Liver damage, heart disease, diabetes, arthritis if untreated.",
    effectHeterozygous:"AG — Carrier. Mildly elevated iron absorption. Usually asymptomatic.",
    effectOther:"GG — No C282Y mutation.",
    riskHomozygous:"high", riskHeterozygous:"low",
    notes:"HFE C282Y is the most common haemochromatosis mutation (~1:200 Northern Europeans are AA). AA carriers: monitor ferritin and transferrin saturation. Regular blood donation is therapeutic.",
    source:"GeneticLifeHacks" },

  { rsid:"rs1799945", gene:"HFE", category:"Disease Prevention", name:"HFE H63D Haemochromatosis",
    effectAllele:"G", otherAllele:"C",
    effectHomozygous:"GG — H63D homozygous. Mild iron overload risk. Usually only clinically significant with another HFE mutation or heavy alcohol use.",
    effectHeterozygous:"CG — H63D carrier. Mildly elevated iron. Generally benign alone.",
    effectOther:"CC — No H63D.",
    riskHomozygous:"low", riskHeterozygous:"low",
    notes:"H63D compound heterozygous (H63D + C282Y) has significant iron overload risk. Routinely elevated ferritin in someone who is CG/GG and exercises may warrant checking transferrin saturation.",
    source:"GeneticLifeHacks" },

  { rsid:"rs429358", gene:"APOE", category:"Disease Prevention", name:"APOE e4 SNP",
    effectAllele:"C", otherAllele:"T",
    effectHomozygous:"CC — APOE e4/e4. Highest Alzheimer's risk (~8-12x vs e3/e3). Significantly impaired lipid clearance. Lower saturated fat tolerance.",
    effectHeterozygous:"CT — APOE e3/e4 (one copy e4). ~3x Alzheimer's risk. Moderate cardiovascular risk.",
    effectOther:"TT — APOE e3 or e2 -- neutral or protective for AD.",
    riskHomozygous:"high", riskHeterozygous:"moderate",
    notes:"APOE e4 is the strongest genetic risk factor for late-onset Alzheimer's. CT/CC carriers: low saturated fat diet, omega-3 (DHA) critical for brain, avoid smoking. Strong lifestyle modification can significantly offset genetic risk.",
    source:"GeneticLifeHacks" },

  { rsid:"rs7412", gene:"APOE", category:"Disease Prevention", name:"APOE e2 SNP",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — APOE e2/e2. Protective against AD but ~7x higher dysbetalipoproteinaemia risk.",
    effectHeterozygous:"CT — APOE e2/e3 or e2/e4.",
    effectOther:"CC — No e2 allele.",
    riskHomozygous:"neutral", riskHeterozygous:"protective",
    notes:"Full APOE status requires both rs429358 and rs7412 to determine e2/e3/e4 genotype.",
    source:"GeneticLifeHacks" },

  // ── Longevity & Detox ───────────────────────────────────────────────────────
  { rsid:"rs1695", gene:"GSTP1", category:"Longevity & Detox", name:"GSTP1 Ile105Val",
    effectAllele:"G", otherAllele:"A",
    effectHomozygous:"GG (Val/Val) — Reduced GSTP1 detox enzyme activity. Lower conjugation of toxins and carcinogens. Higher oxidative stress vulnerability.",
    effectHeterozygous:"AG (Ile/Val) — Moderate reduction.",
    effectOther:"AA (Ile/Ile) — Normal GSTP1 detox capacity.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"GSTP1 is a phase II detox enzyme critical for conjugating oxidised compounds. GG carriers are more sensitive to environmental toxins, AAS hepatotoxicity, and alcohol. Key support: NAC, alpha-lipoic acid, TUDCA, cruciferous vegetables.",
    source:"GeneticLifeHacks" },

  { rsid:"rs4880", gene:"SOD2", category:"Longevity & Detox", name:"SOD2 Val16Ala",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT (Val/Val) — Impaired mitochondrial SOD2 import. Higher mitochondrial oxidative stress.",
    effectHeterozygous:"CT — Moderate SOD2 reduction.",
    effectOther:"CC (Ala/Ala) — Optimal SOD2 targeting and activity.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"SOD2 is the primary mitochondrial superoxide scavenger. TT carriers: higher oxidative damage from intense training, high-dose AAS, or environmental toxins. Key support: CoQ10, astaxanthin, manganese.",
    source:"GeneticLifeHacks" },

  { rsid:"rs2234693", gene:"ESR1", category:"Longevity & Detox", name:"Oestrogen Receptor Alpha ESR1 PvuII",
    effectAllele:"T", otherAllele:"C",
    effectHomozygous:"TT — Reduced ERa activity. Lower oestrogen-responsive gene transcription. Potentially lower bone density response to oestrogen.",
    effectHeterozygous:"CT — Moderate reduction.",
    effectOther:"CC — Normal ERa signalling.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"ERa mediates oestrogen effects on bone, cardiovascular, and metabolic tissue. TT carriers may have reduced bone protection from oestrogen -- important for osteoporosis risk assessment.",
    source:"GeneticLifeHacks" },

  // ── Fertility ───────────────────────────────────────────────────────────────
  { rsid:"rs6166", gene:"FSHR", category:"Fertility", name:"FSH Receptor FSHR Ala307Thr",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA (Thr/Thr) — Higher FSH requirements for ovarian stimulation. Poor ovarian response to gonadotropins.",
    effectHeterozygous:"AG — Moderate ovarian response.",
    effectOther:"GG (Ala/Ala) — Normal FSH receptor sensitivity.",
    riskHomozygous:"moderate", riskHeterozygous:"low",
    notes:"FSHR variants affect how the ovary responds to FSH. AA women undergoing IVF may need higher gonadotropin doses.",
    source:"GeneticLifeHacks" },

  { rsid:"rs2300441", gene:"AMH", category:"Fertility", name:"Anti-Mullerian Hormone AMH",
    effectAllele:"A", otherAllele:"G",
    effectHomozygous:"AA — Lower AMH production. May contribute to earlier ovarian ageing.",
    effectHeterozygous:"AG — Moderate effect.",
    effectOther:"GG — Normal AMH production.",
    riskHomozygous:"low", riskHeterozygous:"low",
    notes:"AMH reflects ovarian reserve. CoQ10 (Ubiquinol form) is the most evidence-backed supplement for ovarian reserve.",
    source:"GeneticLifeHacks" },
];

export const SNP_MAP = new Map<string, SnpEntry>(
  SNP_DATABASE.map(e => [e.rsid.toLowerCase(), e])
);

export const DNA_CATEGORIES: DnaCategory[] = [
  "Methylation & B Vitamins",
  "Brain & Mood",
  "Heart Health",
  "Hormones",
  "Metabolic Health",
  "Inflammation",
  "Immune & Autoimmune",
  "Gut Health",
  "Exercise & Athletics",
  "Longevity & Detox",
  "Disease Prevention",
  "Fertility",
  "Nutrients & Vitamins",
];

export type GenotypeCallResult = {
  rsid: string;
  entry: SnpEntry;
  genotype: string;
  allele1: string;
  allele2: string;
  isHomozygousEffect: boolean;
  isHeterozygousEffect: boolean;
  isHomozygousOther: boolean;
  riskLevel: RiskLevel;
  interpretation: string;
};

export function callGenotype(entry: SnpEntry, rawGenotype: string): GenotypeCallResult {
  const g = rawGenotype.toUpperCase().replace(/[^ACGT\-]/g, "");
  const a1 = g[0] ?? "";
  const a2 = g[1] ?? g[0] ?? "";
  const ea = entry.effectAllele.toUpperCase();
  const oa = entry.otherAllele.toUpperCase();

  const isHomoEffect = a1 === ea && a2 === ea;
  const isHetero = (a1 === ea && a2 === oa) || (a1 === oa && a2 === ea);
  const isHomoOther = a1 === oa && a2 === oa;

  let riskLevel: RiskLevel = "neutral";
  let interpretation = entry.effectOther;

  if (isHomoEffect) {
    riskLevel = entry.riskHomozygous;
    interpretation = entry.effectHomozygous;
  } else if (isHetero) {
    riskLevel = entry.riskHeterozygous;
    interpretation = entry.effectHeterozygous;
  } else if (isHomoOther) {
    riskLevel = "neutral";
    interpretation = entry.effectOther;
  }

  return {
    rsid: entry.rsid, entry, genotype: rawGenotype.toUpperCase(),
    allele1: a1, allele2: a2,
    isHomozygousEffect: isHomoEffect,
    isHeterozygousEffect: isHetero,
    isHomozygousOther: isHomoOther,
    riskLevel, interpretation,
  };
}
