export interface PeptideInteraction {
  name: string;
  status: "avoid" | "caution" | "compatible" | "monitor" | "timing";
}

export interface ResearchIndicationItem {
  title: string;
  description: string;
}

export interface ResearchIndication {
  category: string;
  effectiveness: "Most Effective" | "Effective" | "Moderate" | "Limited";
  items: ResearchIndicationItem[];
}

export interface ResearchProtocolRow {
  goal: string;
  dose: string;
  frequency: string;
  route: string;
}

export interface QualityIndicator {
  type: "pass" | "warn" | "fail";
  title: string;
  description: string;
}

export interface Reference {
  title: string;
  context: string;
  description: string;
  url: string;
}

export interface QuickStart {
  dose: string;
  frequency: string;
  injectionSite: string;
  timing: string;
  timeline: string;
  storage: string;
  cycleLength: string;
  breakBetween: string;
}

export interface StudyDeepDive {
  title: string;
  journal: string;
  year: number;
  methodology: string;
  sampleSize: string;
  endpoints: string;
  keyFindings: string;
  url?: string;
}

export interface ClinicalTrial {
  name: string;
  phase: string;
  status: "Completed" | "Active" | "Recruiting" | "Not yet recruiting" | "Terminated";
  nct: string;
  outcomeSummary: string;
}

export interface RegulatoryStatus {
  region: string;
  agency: string;
  status: "Approved" | "Approved (Rx)" | "Approved (OTC)" | "Research Only" | "Not Approved" | "Pending" | "Controlled" | (string & {});
  notes?: string;
}

export interface DevelopmentMilestone {
  year: string;
  event: string;
}

export interface ComparisonRow {
  compound: string;
  halfLife: string;
  dose: string;
  mechanism: string;
  effectiveness: string;
}

export interface PopulationNote {
  population: string;
  consideration: string;
}

export interface LabMarker {
  marker: string;
  panel: string;
  targetRange: string;
  expectedChange: string;
  retestFrequency: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export type MedCategory =
  | "sexual-health"
  | "cognitive"
  | "dermatology"
  | "hair-loss"
  | "hormonal"
  | "metabolic"
  | "cardiovascular"
  | "mental-sleep"
  | "pain"
  | "antibiotic"
  | "allergy-respiratory"
  | "gastro"
  | "antifungal";

export interface IndianBrand {
  brand: string;
  manufacturer?: string;
  notes?: string;
}

export interface MedProtocol {
  name: string;
  slug: string;
  abbreviation: string;
  aliases: string[];
  category: MedCategory;
  tagline: string;
  description: string;
  color: string;
  vial: string;
  recon: string;
  startDose: string;
  targetDose: string;
  frequency: string;
  route: string;
  storage: string;
  benefits: string;
  tips: string;
  sideEffects: string;
  watchOut: string;
  researchLevel?: "Extensively Studied" | "Well Researched" | "Limited Research" | "Early Research" | "Foundational";
  tags?: string[];
  typicalDose?: string;
  cycle?: string;
  storageShort?: string;
  overview?: { whatIsIt: string; keyBenefits: string; mechanismOfAction: string };
  pharmacokinetics?: { peak?: string; halfLife?: string; cleared?: string };
  researchIndications?: ResearchIndication[];
  researchProtocols?: ResearchProtocolRow[];
  protocolTiming?: string;
  interactions?: PeptideInteraction[];
  qualityIndicators?: QualityIndicator[];
  expectTimeline?: Array<{ timeframe: string; description: string }>;
  sideEffectNotes?: string[];
  references?: Reference[];
  quickStart?: QuickStart;
  studyDeepDives?: StudyDeepDive[];
  clinicalTrials?: ClinicalTrial[];
  regulatoryStatus?: RegulatoryStatus[];
  developmentTimeline?: DevelopmentMilestone[];
  comparisonTable?: { thisCompound: ComparisonRow; comparators: ComparisonRow[] };
  populationNotes?: PopulationNote[];
  labMarkers?: LabMarker[];
  faq?: FAQItem[];
  indianBrands: IndianBrand[];
  ukBrands?: Array<{ brand: string; manufacturer?: string; notes?: string }>;
  usBrands?: Array<{ brand: string; manufacturer?: string; notes?: string }>;
  canadaBrands?: Array<{ brand: string; manufacturer?: string; notes?: string }>;
}

export const MED_PROTOCOLS: MedProtocol[] = [

  // ─── SEXUAL HEALTH ────────────────────────────────────────────────────────

  {
    name: "Sildenafil",
    slug: "sildenafil",
    abbreviation: "SIL",
    aliases: ["sildenafil citrate", "viagra", "cenforce", "fildena", "kamagra"],
    category: "sexual-health",
    tagline: "PDE5 inhibitor — erectile dysfunction & pulmonary hypertension",
    description: "Sildenafil inhibits phosphodiesterase type 5, preventing breakdown of cGMP in smooth muscle cells. This leads to relaxation of penile vasculature and improved blood flow during sexual stimulation. Also approved for pulmonary arterial hypertension.",
    color: "#B91C1C",
    vial: "Oral tablet",
    recon: "25mg, 50mg, 100mg, 120mg, 150mg, 200mg",
    startDose: "25–50mg",
    targetDose: "100mg",
    frequency: "As needed (30–60 min before activity)",
    route: "Oral",
    storage: "Below 30°C, dry place away from moisture and light",
    benefits: "Reliable improvement in erectile function. Onset within 30–60 minutes. Effective in 70–85% of men with ED. Also improves pulmonary haemodynamics in PAH. Investigated for altitude sickness and Raynaud's phenomenon.",
    tips: "Take 30–60 minutes before activity on an empty stomach or after a light meal — heavy/fatty meals delay absorption. Avoid grapefruit juice. Sexual stimulation is required for effect — sildenafil does not cause automatic erections.",
    sideEffects: "Headache, flushing, dyspepsia, nasal congestion, visual disturbances (blue tinge, blurred vision), dizziness. Usually mild and dose-dependent.",
    watchOut: "Absolutely contraindicated with nitrates (nitroglycerin, isosorbide) — risk of severe hypotension. Use with caution in cardiovascular disease, hypotension. Avoid if on ritonavir or other strong CYP3A4 inhibitors without dose reduction.",
    researchLevel: "Extensively Studied",
    tags: ["Sexual Health", "ED", "PAH"],
    typicalDose: "50mg",
    cycle: "As needed (PRN)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Sildenafil citrate is a selective phosphodiesterase type 5 (PDE5) inhibitor developed by Pfizer, approved in 1998 as the first oral medication for erectile dysfunction. It also carries FDA approval as Revatio for pulmonary arterial hypertension (PAH). Generic versions are manufactured extensively in India and are widely available.",
      keyBenefits: "Effective in 70–85% of men with erectile dysfunction, including those with diabetes, prostatectomy and vascular causes. Onset of 30–60 minutes with duration of 4–6 hours. Well-established safety profile with decades of post-marketing data. PAH indication provides additional cardiovascular research utility.",
      mechanismOfAction: "Competitively inhibits PDE5 in smooth muscle of the corpus cavernosum, preventing degradation of cyclic guanosine monophosphate (cGMP). Elevated cGMP relaxes smooth muscle and dilates cavernosal arteries, increasing blood flow in response to sexual stimulation. In the pulmonary vasculature, the same mechanism reduces resistance and improves exercise capacity.",
    },
    pharmacokinetics: { peak: "30–120 min", halfLife: "3–5h", cleared: "24h" },
    researchIndications: [
      {
        category: "Erectile Dysfunction", effectiveness: "Most Effective", items: [
          { title: "Vasculogenic ED", description: "Meta-analysis of >25 RCTs: 70–85% of men achieve satisfactory erections vs 20–30% placebo. Consistent benefit across diabetic, post-prostatectomy, and age-related ED." },
          { title: "Diabetic ED", description: "NEJM trial: 56% improvement in diabetic men vs 10% placebo. Requires intact neural pathways for nitric oxide release; phosphodiesterase inhibition amplifies the existing NO signal." },
        ],
      },
      {
        category: "Pulmonary Hypertension", effectiveness: "Effective", items: [
          { title: "PAH (WHO Class II–III)", description: "SUPER-1 trial: 6-minute walk distance improved +45–50m vs placebo at 12 weeks. PDE5 is highly expressed in pulmonary vasculature." },
        ],
      },
      {
        category: "Other Investigated Uses", effectiveness: "Moderate", items: [
          { title: "High-Altitude Pulmonary Oedema (HAPE)", description: "Reduces hypoxic pulmonary vasoconstriction. Studies support use in HAPE-susceptible individuals ascending >3500m." },
          { title: "Raynaud's Phenomenon", description: "Moderate evidence supports vasodilation benefit in refractory secondary Raynaud's, particularly in systemic sclerosis." },
        ],
      },
    ],
    researchProtocols: [
      { goal: "ED — Starter Dose", dose: "25mg", frequency: "As needed (PRN)", route: "Oral" },
      { goal: "ED — Standard Dose", dose: "50mg", frequency: "As needed (PRN)", route: "Oral" },
      { goal: "ED — Full Dose", dose: "100mg", frequency: "As needed (PRN)", route: "Oral" },
      { goal: "PAH", dose: "20mg three times daily", frequency: "Three times daily", route: "Oral" },
      { goal: "High-altitude (HAPE prevention)", dose: "50mg", frequency: "Every 8–12 hours", route: "Oral" },
    ],
    interactions: [
      { name: "Nitrates (GTN, isosorbide)", status: "avoid" },
      { name: "Ritonavir / HIV protease inhibitors", status: "avoid" },
      { name: "Alpha-blockers (tamsulosin, doxazosin)", status: "caution" },
      { name: "Antihypertensives", status: "monitor" },
      { name: "Tadalafil / Vardenafil", status: "avoid" },
      { name: "Amlodipine", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Film-coated tablet, consistent colour", description: "Pharmaceutical-grade sildenafil appears as a blue (or white generic) film-coated tablet with clean edges and clear embossing. Crumbling or uneven coating may indicate poor manufacturing." },
      { type: "pass", title: "Reliable 30–60 min onset", description: "Effective pharmaceutical-grade product produces a consistent haemodynamic effect within 60 minutes of ingestion on an empty stomach. Delayed or absent effect may indicate underdosing or counterfeit." },
      { type: "warn", title: "Many counterfeits in market", description: "Sildenafil is among the most counterfeited drugs globally. Verify through reputable Indian pharmacies. Look for manufacturer seals and tamper-evident packaging." },
      { type: "fail", title: "No response at 100mg", description: "If 100mg produces no effect with adequate sexual stimulation, consider counterfeit product, incorrect storage, or underlying vascular/neurological cause requiring medical evaluation." },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Onset of haemodynamic effect. Best taken on empty stomach. Fatty meal delays peak by 1–2 hours." },
      { timeframe: "1–2 hours", description: "Peak plasma concentration. Maximum erectile response window." },
      { timeframe: "4–6 hours", description: "Duration of therapeutic window. Erection requires ongoing stimulation — sildenafil does not maintain erection without arousal." },
      { timeframe: "12–24 hours", description: "Drug largely cleared. Some men report residual effect. Not typically taken within 24 hours of previous dose." },
    ],
    sideEffectNotes: [
      "Headache (16–28% of users) — most common side effect, usually mild and resolves within 1–2 hours",
      "Flushing/facial redness — caused by vasodilation, typically transient and not dangerous",
      "Nasal congestion — due to local PDE5 inhibition in nasal vasculature",
      "Visual disturbances — blue-green tinge or blurred vision at doses ≥100mg; rare non-arteritic anterior ischaemic optic neuropathy (NAION) reported in predisposed individuals",
      "Hypotension when combined with nitrates or large alcohol intake — can be severe; maintain standing slowly",
      "Priapism (erection >4 hours) — rare but requires urgent medical attention to prevent permanent damage",
    ],
    references: [
      { title: "Goldstein I et al. — NEJM (1998)", context: "Human | 25–100mg PRN | 24 weeks | N=532", description: "Landmark sildenafil ED trial showing 69% vs 22% IIEF improvement. Established PDE5 inhibition as first-line ED treatment.", url: "https://www.nejm.org/doi/10.1056/NEJM199805143382001" },
      { title: "Galiè N et al. SUPER-1 — Ann Intern Med (2005)", context: "Human | 20–80mg TID | 12 weeks | N=278", description: "PAH trial demonstrating +45m 6-minute walk distance. Led to FDA approval of sildenafil (Revatio) for PAH.", url: "https://pubmed.ncbi.nlm.nih.gov/15657323/" },
    ],
    faq: [
      { question: "Can I take sildenafil daily?", answer: "Daily low-dose sildenafil (25mg) has been studied for ED rehabilitation after prostatectomy, though the standard approach is as-needed dosing. Daily use for PAH uses 20mg three times daily. Discuss with your doctor for your specific situation." },
      { question: "What's the difference between sildenafil and Viagra?", answer: "Sildenafil citrate is the active ingredient; Viagra is the brand name by Pfizer. Indian generics (Cenforce, Fildena, Kamagra, etc.) contain the same active ingredient at the same strengths and are manufactured by regulated pharmaceutical companies." },
      { question: "Does alcohol affect sildenafil?", answer: "Moderate alcohol (1–2 drinks) is generally compatible, but larger amounts increase orthostatic hypotension risk and can impair the sexual response. Heavy alcohol also worsens ED through its own mechanisms." },
      { question: "What if 50mg doesn't work?", answer: "Try 100mg (maximum approved dose) on an empty stomach with adequate stimulation. If 100mg consistently fails, see a doctor to rule out severe vascular ED, counterfeit product, or consider switching to tadalafil which has a different PK profile." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Viagra (ED) approved 1998; Revatio (PAH) approved 2005. Generic sildenafil approved 2017." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H drug — prescription required. Widely manufactured by Indian generic companies." },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "50mg approved OTC as Viagra Connect since 2018." },
    ],
    indianBrands: [
      { brand: "Cenforce 25", manufacturer: "Centurion Remedies" },
      { brand: "Cenforce 50", manufacturer: "Centurion Remedies" },
      { brand: "Cenforce 100", manufacturer: "Centurion Remedies" },
      { brand: "Cenforce 120", manufacturer: "Centurion Remedies" },
      { brand: "Cenforce 150", manufacturer: "Centurion Remedies" },
      { brand: "Cenforce 200", manufacturer: "Centurion Remedies" },
      { brand: "Cenforce Gold 100", manufacturer: "Centurion Remedies" },
      { brand: "Fildena 25", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena 50", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena 100", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena Strong 120", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena Extra Power 150", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena Double 200", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena Pro 100", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena XXX 100", manufacturer: "Fortune Healthcare" },
      { brand: "Fildena CT 100", notes: "Chewable tablet" },
      { brand: "Malegra 100", manufacturer: "Sunrise Remedies" },
      { brand: "Malegra 200", manufacturer: "Sunrise Remedies" },
      { brand: "Malegra DXT Plus", manufacturer: "Sunrise Remedies" },
      { brand: "Malegra Pro 100", manufacturer: "Sunrise Remedies" },
      { brand: "Vigora 100", manufacturer: "German Remedies / Zydus" },
      { brand: "Caverta 100", manufacturer: "Sun Pharma" },
      { brand: "Suhagra 50", manufacturer: "Cipla" },
      { brand: "Zenegra 100", manufacturer: "Alkem Laboratories" },
      { brand: "Zenegra Red 100", manufacturer: "Alkem Laboratories" },
      { brand: "Sildigra 100", manufacturer: "RSM Multilink" },
      { brand: "Sildigra Gold 200", manufacturer: "RSM Multilink" },
      { brand: "Sildigra Super Power", notes: "Combination" },
      { brand: "Sildamax 100" },
      { brand: "Sildalist Strong", notes: "Sildenafil + Tadalafil combination" },
      { brand: "Abhigra 100" },
      { brand: "Abhirise 20" },
      { brand: "Vigore 100" },
      { brand: "Siljuv 100" },
      { brand: "Kamagra 100", notes: "Oral jelly / tablet available" },
      { brand: "Kamagra Export 100" },
      { brand: "Kamagra Polo 100", notes: "Polo-shaped chewable" },
      { brand: "Viagra 50 (Pfizer)", manufacturer: "Pfizer", notes: "Originator brand" },
      { brand: "P-Force Fort 150" },
    ],
    ukBrands: [
      { brand: "Viagra", manufacturer: "Pfizer", notes: "Originator; 25mg, 50mg, 100mg tablets" },
      { brand: "Sildenafil (generic)", manufacturer: "Various", notes: "Widely available on prescription" },
      { brand: "Vizarsin", manufacturer: "Consilient Health", notes: "25mg, 50mg, 100mg" },
    ],
    usBrands: [
      { brand: "Viagra", manufacturer: "Pfizer", notes: "Originator; 25mg, 50mg, 100mg" },
      { brand: "Revatio", manufacturer: "Pfizer", notes: "20mg; indicated for PAH" },
      { brand: "Sildenafil (generic)", manufacturer: "Various", notes: "FDA-approved generics widely available" },
    ],
    canadaBrands: [
      { brand: "Viagra", manufacturer: "Pfizer", notes: "Originator brand" },
      { brand: "Revatio", manufacturer: "Pfizer", notes: "PAH indication" },
      { brand: "Sildenafil (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Tadalafil",
    slug: "tadalafil",
    abbreviation: "TAD",
    aliases: ["tadalafil", "cialis", "vidalista", "tadarise"],
    category: "sexual-health",
    tagline: "Long-acting PDE5 inhibitor — ED, BPH & pulmonary hypertension",
    description: "Tadalafil is a selective PDE5 inhibitor with a uniquely long half-life of 17.5 hours, enabling both as-needed dosing and continuous daily dosing. Approved for erectile dysfunction, benign prostatic hyperplasia, and pulmonary arterial hypertension.",
    color: "#991B1B",
    vial: "Oral tablet",
    recon: "2.5mg, 5mg, 10mg, 20mg, 40mg, 60mg, 80mg",
    startDose: "10mg PRN or 2.5mg daily",
    targetDose: "20mg PRN or 5mg daily",
    frequency: "As needed or once daily",
    route: "Oral",
    storage: "Room temperature, protected from moisture",
    benefits: "36-hour window of action (the 'weekend pill'). Suitable for daily dosing due to long half-life. Treats both ED and BPH simultaneously in affected men. Food does not significantly affect absorption.",
    tips: "Can be taken with or without food. For PRN dosing, take at least 30 minutes before activity. Daily 5mg achieves steady-state within 5 days. Alcohol in moderation is compatible. Avoid grapefruit in large quantities.",
    sideEffects: "Headache, back/muscle pain (myalgia — unique to tadalafil due to PDE11 inhibition), flushing, nasal congestion, indigestion. Back pain typically occurs 12–24h after use and resolves within 48h.",
    watchOut: "Contraindicated with nitrates. Avoid with alpha-blockers except tamsulosin 0.4mg at lowest dose of tadalafil. Caution in renal/hepatic impairment — reduce dose. Avoid in severe cardiovascular disease.",
    researchLevel: "Extensively Studied",
    tags: ["Sexual Health", "ED", "BPH", "PAH"],
    typicalDose: "10–20mg PRN or 5mg daily",
    cycle: "As needed or continuous daily",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Tadalafil (Cialis, Adcirca) is a long-acting PDE5 inhibitor developed by Eli Lilly and ICOS Corporation, first approved in 2003. Its 17.5-hour half-life allows a therapeutic window of up to 36 hours, earning the colloquial name 'the weekend pill'. Available as generic in India under numerous brand names.",
      keyBenefits: "36-hour therapeutic window provides greater spontaneity than shorter-acting PDE5 inhibitors. Daily 5mg dosing maintains continuous low-level inhibition useful for men with frequent ED and concurrent BPH. Food does not affect absorption, providing additional flexibility. Only PDE5 inhibitor approved for both ED and BPH.",
      mechanismOfAction: "Selectively inhibits PDE5 in smooth muscle, amplifying cGMP-mediated relaxation in cavernosal and pulmonary vasculature. Also inhibits PDE11 (found in skeletal muscle) accounting for the characteristic back/muscle pain side effect. Daily dosing maintains sustained, low-level PDE5 inhibition for improved erectile tissue function.",
    },
    pharmacokinetics: { peak: "2h", halfLife: "17.5h", cleared: "~5 days" },
    researchIndications: [
      { category: "Erectile Dysfunction", effectiveness: "Most Effective", items: [
        { title: "PRN Dosing", description: "10mg and 20mg PRN doses achieve 75–81% success rate in erectile function domain of IIEF. Effective across all ED severity levels including post-prostatectomy." },
        { title: "Daily Dosing (5mg)", description: "Maintains continuous PDE5 inhibition. Multiple trials show comparable efficacy to PRN dosing with improved penile oxygenation over time. Preferred by men seeking spontaneity." },
      ]},
      { category: "Benign Prostatic Hyperplasia", effectiveness: "Effective", items: [
        { title: "LUTS/BPH Management", description: "5mg daily reduces International Prostate Symptom Score (IPSS) by 3–5 points. Unique mechanism — PDE5 inhibition relaxes bladder neck and prostatic smooth muscle independent of alpha-blockade." },
      ]},
      { category: "Pulmonary Hypertension", effectiveness: "Effective", items: [
        { title: "PAH (Adcirca 40mg daily)", description: "PHIRST trial: 40mg daily improved 6-minute walk distance by +33m vs placebo. FDA-approved as Adcirca for WHO functional class II–III PAH." },
      ]},
    ],
    researchProtocols: [
      { goal: "ED — PRN Standard", dose: "10mg", frequency: "As needed (≥30 min before)", route: "Oral" },
      { goal: "ED — PRN Full Dose", dose: "20mg", frequency: "As needed", route: "Oral" },
      { goal: "ED — Daily Therapy", dose: "5mg", frequency: "Once daily (same time)", route: "Oral" },
      { goal: "ED + BPH Combined", dose: "5mg daily", frequency: "Once daily", route: "Oral" },
      { goal: "PAH", dose: "40mg", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Nitrates (all forms)", status: "avoid" },
      { name: "Alpha-blockers (except tamsulosin 0.4mg)", status: "caution" },
      { name: "Ritonavir / strong CYP3A4 inhibitors", status: "caution" },
      { name: "Antihypertensives", status: "monitor" },
      { name: "Sildenafil / Vardenafil", status: "avoid" },
      { name: "Rifampicin (CYP3A4 inducer)", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Almond-shaped coated tablet", description: "Genuine tadalafil (Cialis) is almond-shaped, yellow, film-coated. Indian generics may differ in shape but should be consistent within batches." },
      { type: "pass", title: "36-hour therapeutic window", description: "A hallmark of genuine tadalafil is erection support persisting 24–36h after ingestion. Shorter duration may indicate underdosing or dilution." },
      { type: "warn", title: "Myalgia distinguishes genuine tadalafil", description: "Back/muscle aching 12–24h post-dose is specific to tadalafil's PDE11 activity and is paradoxically a quality indicator of authentic product." },
      { type: "fail", title: "No response at 20mg with stimulation", description: "Likely counterfeit, storage failure, or severe vascular cause requiring medical evaluation." },
    ],
    expectTimeline: [
      { timeframe: "30 minutes", description: "Initial haemodynamic changes begin. Erection support may emerge within 30 minutes in some." },
      { timeframe: "2 hours", description: "Peak plasma concentration. Maximum erectile efficacy." },
      { timeframe: "12–24 hours", description: "Sustained therapeutic level. Spontaneous erection with stimulation possible across this window." },
      { timeframe: "36 hours", description: "Effective duration ends. Unique to tadalafil — no other approved PDE5 inhibitor matches this duration." },
    ],
    sideEffectNotes: [
      "Back pain/myalgia (3–6%) — PDE11 inhibition in skeletal muscle; resolves within 48h; managed with ibuprofen",
      "Headache — most common (10–15%); dose-related; usually mild",
      "Flushing — vasodilation effect; less common than with sildenafil",
      "Dyspepsia — particularly with higher doses; take with food if troublesome",
      "Hypotension with nitrates — absolute contraindication; life-threatening",
      "Vision changes — rare; NAION (optic neuropathy) risk in predisposed individuals",
    ],
    references: [
      { title: "Porst H et al. IIEF Study — Eur Urol (2003)", context: "Human | 10–20mg PRN | 12 weeks | N=268", description: "Pivotal ED trial showing 75% satisfaction vs 32% placebo. Established 36-hour efficacy profile.", url: "https://pubmed.ncbi.nlm.nih.gov/12600428/" },
      { title: "Roehrborn CG et al. TADLUTS — J Urol (2011)", context: "Human | 5mg daily | 12 weeks | N=325", description: "BPH trial demonstrating IPSS reduction of −4.9 vs −2.3 placebo. Led to BPH approval.", url: "https://pubmed.ncbi.nlm.nih.gov/21239358/" },
    ],
    faq: [
      { question: "Can tadalafil be taken daily?", answer: "Yes — 5mg daily is FDA-approved for daily use in ED and BPH. It achieves steady state within 5 days and maintains continuous PDE5 inhibition, providing on-demand erectile readiness without needing to plan around doses." },
      { question: "Does food affect tadalafil?", answer: "No — unlike sildenafil, tadalafil absorption is not significantly affected by food, including fatty meals. This makes dosing more flexible and convenient." },
      { question: "Why does tadalafil cause back pain?", answer: "Tadalafil weakly inhibits PDE11, which is expressed in skeletal muscle. This produces back and muscle aching in ~3–6% of users, typically 12–24 hours after a dose and resolving within 48 hours. It is not harmful and can be managed with ibuprofen." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Cialis (ED/BPH) and Adcirca (PAH) approved. Generic tadalafil approved 2018." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H drug, manufactured by multiple Indian companies." },
    ],
    indianBrands: [
      { brand: "Vidalista 2.5", manufacturer: "Centurion Remedies" },
      { brand: "Vidalista 5", manufacturer: "Centurion Remedies" },
      { brand: "Vidalista 10", manufacturer: "Centurion Remedies" },
      { brand: "Vidalista 20", manufacturer: "Centurion Remedies" },
      { brand: "Vidalista 40", manufacturer: "Centurion Remedies" },
      { brand: "Vidalista 60", manufacturer: "Centurion Remedies" },
      { brand: "Tadarise 10", manufacturer: "Sunrise Remedies" },
      { brand: "Tadarise 20", manufacturer: "Sunrise Remedies" },
      { brand: "Tadarise 40", manufacturer: "Sunrise Remedies" },
      { brand: "Tadarise 60", manufacturer: "Sunrise Remedies" },
      { brand: "Super Tadarise", notes: "Combination" },
      { brand: "Extra Super Tadarise", notes: "Combination" },
      { brand: "Megalis 20", manufacturer: "Macleods Pharma" },
      { brand: "Tadalista 20", manufacturer: "Fortune Healthcare" },
      { brand: "Tadaga Power 80" },
      { brand: "Tadagra Power 80" },
      { brand: "Silvitra 120", notes: "Combination" },
      { brand: "Vitara V 20" },
      { brand: "Toptada 20" },
      { brand: "Tastylia 20 ODS", notes: "Orally disintegrating strip" },
      { brand: "ELI 20" },
      { brand: "Pulmopres 20", notes: "For pulmonary hypertension" },
    ],
    ukBrands: [
      { brand: "Cialis", manufacturer: "Eli Lilly", notes: "2.5mg, 5mg, 10mg, 20mg tablets" },
      { brand: "Tadalafil (generic)", manufacturer: "Various", notes: "Available on prescription" },
    ],
    usBrands: [
      { brand: "Cialis", manufacturer: "Eli Lilly", notes: "2.5mg, 5mg, 10mg, 20mg" },
      { brand: "Adcirca", manufacturer: "Eli Lilly", notes: "40mg; indicated for PAH" },
      { brand: "Alyq", manufacturer: "Sigmapharm", notes: "40mg; PAH indication" },
      { brand: "Tadalafil (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Cialis", manufacturer: "Eli Lilly", notes: "Originator brand" },
      { brand: "Tadalafil (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Vardenafil",
    slug: "vardenafil",
    abbreviation: "VAR",
    aliases: ["vardenafil", "levitra", "vilitra", "valif"],
    category: "sexual-health",
    tagline: "Fast-onset PDE5 inhibitor — ED with cardiovascular safety profile",
    description: "Vardenafil is a PDE5 inhibitor with higher potency than sildenafil and a faster onset. Its relatively mild cardiovascular effects and efficacy in difficult-to-treat ED populations (diabetes, post-prostatectomy) make it a preferred option for some patients.",
    color: "#E11D48",
    vial: "Oral tablet / Oral disintegrating tablet",
    recon: "5mg, 10mg, 20mg",
    startDose: "10mg",
    targetDose: "20mg",
    frequency: "As needed (25–60 min before activity)",
    route: "Oral",
    storage: "Room temperature, dry conditions",
    benefits: "Higher potency than sildenafil (IC50 ~0.7nM vs 3.5nM). Fast onset within 15–25 minutes for ODT formulation. Effective in diabetic ED and post-prostatectomy ED. Relatively mild cardiovascular effects.",
    tips: "Take 25–60 minutes before activity. Fatty meals may delay absorption for standard tablets; ODT (Staxyn/Tastylia) dissolves under the tongue and is unaffected by food. Avoid grapefruit juice.",
    sideEffects: "Headache, flushing, rhinitis, dyspepsia, dizziness. QTc prolongation at high doses — caution in cardiac arrhythmia.",
    watchOut: "Contraindicated with nitrates and Class IA/III antiarrhythmics (QTc prolongation risk). Caution with alpha-blockers. Avoid in severe hepatic impairment.",
    researchLevel: "Extensively Studied",
    tags: ["Sexual Health", "ED", "Fast Onset"],
    typicalDose: "10mg",
    cycle: "As needed (PRN)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Vardenafil (Levitra, Staxyn) was developed by Bayer AG and approved in 2003. It is structurally similar to sildenafil but has higher potency at PDE5. The orodispersible tablet (ODT) formulation dissolves under the tongue within seconds and may have faster onset than standard tablets.",
      keyBenefits: "Higher selectivity for PDE5 vs PDE6 (retina) than sildenafil — theoretically fewer visual side effects. Effective in complex ED populations including diabetics, post-prostatectomy, and those with multiple cardiovascular risk factors. ODT formulation provides flexible, discreet dosing.",
      mechanismOfAction: "Competitive inhibitor of PDE5 with IC50 of ~0.7nM, approximately 5x more potent than sildenafil at the enzyme level. Prevents cGMP degradation in cavernosal smooth muscle, enabling vasodilation and engorgement in response to sexual stimulation.",
    },
    pharmacokinetics: { peak: "30–120 min", halfLife: "4–5h", cleared: "24h" },
    researchIndications: [
      { category: "Erectile Dysfunction", effectiveness: "Most Effective", items: [
        { title: "Diabetic ED", description: "STRIDE trials showed 57% vs 13% placebo response in men with type 1/2 diabetes — one of the largest diabetic ED datasets." },
        { title: "Difficult-to-treat ED", description: "Effective in men who had inadequate response to sildenafil in some studies, possibly due to pharmacokinetic differences." },
      ]},
    ],
    researchProtocols: [
      { goal: "ED — Standard", dose: "10mg", frequency: "As needed", route: "Oral" },
      { goal: "ED — Full Dose", dose: "20mg", frequency: "As needed", route: "Oral" },
      { goal: "ED — Low Dose (elderly/renalimpairment)", dose: "5mg", frequency: "As needed", route: "Oral" },
    ],
    interactions: [
      { name: "Nitrates", status: "avoid" },
      { name: "Class IA/III antiarrhythmics (quinidine, amiodarone)", status: "avoid" },
      { name: "Ketoconazole / itraconazole", status: "caution" },
      { name: "Alpha-blockers", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Orange film-coated tablet (Levitra)", description: "Authentic Levitra is round, orange, film-coated. Indian generics may differ in appearance; consistent within-batch appearance is important." },
      { type: "warn", title: "Cardiac arrhythmia caution", description: "Vardenafil has QTc-prolonging potential at high doses — verify cardiac history before use, especially at 20mg." },
    ],
    expectTimeline: [
      { timeframe: "15–60 minutes", description: "Onset depending on formulation (ODT faster). Take at least 25 minutes before activity for standard tablet." },
      { timeframe: "1 hour", description: "Peak concentration. Maximum erectile support window." },
      { timeframe: "4–6 hours", description: "Duration of therapeutic effect." },
    ],
    sideEffectNotes: [
      "Headache — similar frequency to sildenafil (~15%)",
      "Rhinitis/nasal congestion — slightly more common than with other PDE5 inhibitors",
      "QTc prolongation — dose-dependent; avoid with antiarrhythmics",
      "Flushing and dyspepsia — typical PDE5 class effects",
    ],
    references: [
      { title: "Goldstein I et al. — Urology (2003)", context: "Human | 5–20mg PRN | 12 weeks", description: "Pivotal Phase III trial establishing vardenafil efficacy across ED populations.", url: "https://pubmed.ncbi.nlm.nih.gov/12559274/" },
    ],
    faq: [
      { question: "How is vardenafil different from sildenafil?", answer: "Vardenafil is more potent at PDE5 (lower IC50), may have faster onset, and has slightly fewer visual side effects due to higher PDE5/PDE6 selectivity. The clinical difference is modest for most users; individual response varies." },
      { question: "What is Staxyn/ODT vardenafil?", answer: "The orally disintegrating tablet dissolves on the tongue without water. It has a faster onset (15–30 min) and absorption is not affected by food, making it popular for spontaneous use. Indian equivalents include Tastylia." },
    
      { question: "How does vardenafil differ from sildenafil?", answer: "Vardenafil is approximately 10-fold more potent than sildenafil in inhibiting PDE5, allowing effective doses as low as 5–10mg. It has a faster onset (~25 min) and may be less affected by food. It also inhibits PDE6 slightly less than sildenafil, which may reduce visual side effects." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Levitra (tablets) and Staxyn (ODT) approved." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H drug." },
    ],
    indianBrands: [
      { brand: "Vilitra 10", manufacturer: "Centurion Remedies" },
      { brand: "Vilitra 20", manufacturer: "Centurion Remedies" },
      { brand: "Vilitra 40", manufacturer: "Centurion Remedies" },
      { brand: "Valif 20" },
      { brand: "Snovitra Soft 20", notes: "Soft chewable" },
      { brand: "Snovitra Pro 20" },
    ],
    ukBrands: [
      { brand: "Levitra", manufacturer: "Bayer", notes: "5mg, 10mg, 20mg film-coated tablets" },
      { brand: "Vardenafil (generic)", manufacturer: "Various", notes: "Prescription required" },
    ],
    usBrands: [
      { brand: "Levitra", manufacturer: "Bayer", notes: "2.5mg, 5mg, 10mg, 20mg" },
      { brand: "Staxyn", manufacturer: "Bayer", notes: "10mg orally disintegrating tablet" },
      { brand: "Vardenafil (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Levitra", manufacturer: "Bayer", notes: "Originator brand" },
      { brand: "Vardenafil (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Dapoxetine",
    slug: "dapoxetine",
    abbreviation: "DAP",
    aliases: ["dapoxetine", "poxet", "priligy", "duratia"],
    category: "sexual-health",
    tagline: "Short-acting SSRI — premature ejaculation (on-demand)",
    description: "Dapoxetine is a rapidly-absorbed, rapidly-eliminated SSRI developed specifically for on-demand treatment of premature ejaculation. Unlike traditional SSRIs, its PK profile (Tmax 1.5h, half-life 1.3–1.4h) makes it suitable for as-needed use before sexual activity.",
    color: "#9F1239",
    vial: "Oral tablet",
    recon: "30mg, 60mg, 90mg",
    startDose: "30mg",
    targetDose: "60mg",
    frequency: "1–3 hours before sexual activity",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Significantly increases intravaginal ejaculation latency time (IELT) 2–3 fold. On-demand dosing avoids chronic SSRI side effects. Works within 1–3 hours. Improves control and satisfaction scores.",
    tips: "Take with a full glass of water 1–3 hours before activity. Avoid rapid position changes after dosing (orthostatic hypotension risk). Do not take more than once per 24 hours. Consider 30mg first to assess tolerance.",
    sideEffects: "Nausea, headache, dizziness, diarrhoea, insomnia. Orthostatic hypotension — stand slowly. Fainting reported in some users.",
    watchOut: "Contraindicated with MAOIs, thioridazine, and other serotonergic drugs (serotonin syndrome risk). Caution with moderate/strong CYP3A4 or CYP2D6 inhibitors. Avoid in moderate-severe hepatic impairment.",
    researchLevel: "Well Researched",
    tags: ["Sexual Health", "Premature Ejaculation"],
    typicalDose: "30–60mg",
    cycle: "As needed",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Dapoxetine is the first medication approved specifically for premature ejaculation (PE). It was developed by ALZA Corporation and licensed to Janssen. Unlike daily SSRIs used off-label for PE, dapoxetine's short half-life and rapid Tmax allow acute dosing before sexual activity without accumulation.",
      keyBenefits: "2–3 fold increase in IELT compared to placebo in pivotal trials. Improves sense of control and reduces personal distress. As-needed dosing eliminates need for daily medication compliance. Available in India as generic at 30mg, 60mg, and 90mg.",
      mechanismOfAction: "Selectively inhibits serotonin reuptake transporter (SERT) acutely. Elevated synaptic serotonin at 5-HT2C receptors in the ejaculation control pathway in the spinal cord increases latency to ejaculation. The mechanism is similar to chronic SSRI use but exploited acutely via unique PK.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "1.3h", cleared: "~12h" },
    researchIndications: [
      { category: "Premature Ejaculation", effectiveness: "Effective", items: [
        { title: "IELT Improvement", description: "Phase III trials: 60mg dapoxetine increased mean IELT from 0.9 min to 3.1 min (3.4x) vs 1.7 min for placebo. 30mg increased to 2.3 min." },
        { title: "Patient-Reported Outcomes", description: "Clinical Trials Index of Premature Ejaculation (CIPE) and Patient Global Impression of Change (PGI-C) scores improved significantly, indicating meaningful benefit beyond just latency time." },
      ]},
    ],
    researchProtocols: [
      { goal: "PE — Starter Dose", dose: "30mg", frequency: "1–3h before activity, max once daily", route: "Oral" },
      { goal: "PE — Full Dose", dose: "60mg", frequency: "1–3h before activity, max once daily", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs (phenelzine, tranylcypromine)", status: "avoid" },
      { name: "Other SSRIs / SNRIs", status: "avoid" },
      { name: "Thioridazine", status: "avoid" },
      { name: "CYP3A4 inhibitors (ketoconazole, ritonavir)", status: "caution" },
      { name: "Alcohol", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Rapid onset nausea/dizziness", description: "Paradoxically, mild nausea or light-headedness within 1–2 hours confirms absorption of active dapoxetine." },
      { type: "warn", title: "Orthostatic hypotension possible", description: "Stand slowly after dosing. Have a seat available when the drug peaks." },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Peak plasma concentration. Take 1–3 hours before anticipated activity." },
      { timeframe: "Activity window", description: "Enhanced ejaculation control during sexual activity within 1–3h post-dose." },
      { timeframe: "12 hours", description: "Drug largely cleared. No significant next-day residual effect." },
    ],
    sideEffectNotes: [
      "Nausea (8–16%) — most common; take with food if sensitive",
      "Dizziness and orthostatic hypotension — avoid standing rapidly, especially after first dose",
      "Headache (~6%) — mild and transient",
      "Fainting — rare but reported; do not use if prone to syncope",
    ],
    references: [
      { title: "Pryor JL et al. — Lancet (2006)", context: "Human | 30/60mg PRN | 12 weeks | N=2,614", description: "First large-scale RCT showing IELT improvement and improved patient satisfaction. Established dapoxetine as first approved PE treatment.", url: "https://pubmed.ncbi.nlm.nih.gov/17056159/" },
    ],
    faq: [
      { question: "Can dapoxetine be taken with sildenafil?", answer: "Yes — combination products exist (e.g. Super P-Force = sildenafil 100mg + dapoxetine 60mg). Studies show the combination is safe and effective in men with both ED and PE. Start with lower doses of each when combining." },
      { question: "Why doesn't dapoxetine work like regular SSRIs?", answer: "Daily SSRIs take 2–4 weeks to build up the serotonin effect that delays ejaculation. Dapoxetine's ultra-short half-life means it reaches the required serotonin level rapidly after a single dose, then clears quickly — ideal for on-demand use without chronic accumulation." },
    
      { question: "Can dapoxetine be used long-term?", answer: "Dapoxetine is designed for on-demand use, not daily dosing. Long-term trials show sustained efficacy without tolerance development, but it should be taken 1–3 hours before sexual activity rather than as a daily antidepressant-equivalent dose." },
      { question: "What's the difference between dapoxetine and regular SSRIs?", answer: "Dapoxetine has a very short half-life (~1.5 hours) versus other SSRIs (days to weeks). This makes it suitable for on-demand use without the systemic accumulation that causes mood, sleep, and sexual side effects with chronic SSRI use." },
      ],
    regulatoryStatus: [
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Approved for PE. Available as generic." },
      { region: "EU", agency: "EMA", status: "Approved", notes: "Priligy approved in most EU member states." },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "FDA has not approved dapoxetine; available as research chemical in USA." },
    ],
    indianBrands: [
      { brand: "Poxet 30", manufacturer: "Sunrise Remedies" },
      { brand: "Poxet 60", manufacturer: "Sunrise Remedies" },
      { brand: "Poxet 90", manufacturer: "Sunrise Remedies" },
      { brand: "Duratia 30" },
      { brand: "Duratia 60" },
      { brand: "Sildigra Super Power", notes: "Combination product" },
      { brand: "Super Tadarise", notes: "Combination product" },
    ],
    ukBrands: [
      { brand: "Priligy", manufacturer: "Menarini", notes: "30mg, 60mg; approved for premature ejaculation" },
      { brand: "Dapoxetine (generic)", manufacturer: "Various", notes: "Available via specialist prescribers" },
    ],
    usBrands: [
      { brand: "Not FDA-approved", manufacturer: "—", notes: "Not available as prescription drug in the US" },
    ],
    canadaBrands: [
      { brand: "Not Health Canada-approved", manufacturer: "—", notes: "Not approved for prescription use in Canada" },
    ],
  },

  // ─── COGNITIVE / NOOTROPICS ───────────────────────────────────────────────

  {
    name: "Modafinil",
    slug: "modafinil",
    abbreviation: "MOD",
    aliases: ["modafinil", "modalert", "modaheal", "provigil"],
    category: "cognitive",
    tagline: "Wakefulness-promoting agent — narcolepsy, shift work & cognitive enhancement",
    description: "Modafinil is a eugeroic (wakefulness-promoting) drug approved for narcolepsy, shift work sleep disorder, and obstructive sleep apnoea. Widely used off-label as a cognitive enhancer for sustained attention, executive function, and fatigue resistance.",
    color: "#7C3AED",
    vial: "Oral tablet",
    recon: "100mg, 200mg",
    startDose: "100mg",
    targetDose: "200mg",
    frequency: "Once daily (morning) or prior to shift",
    route: "Oral",
    storage: "Room temperature, protect from heat",
    benefits: "Promotes sustained wakefulness for 12–16 hours. Improves executive function, working memory, and decision-making in sleep-deprived individuals. Low abuse potential compared to amphetamines. Minimal cardiovascular effects.",
    tips: "Take in the morning to avoid night-time insomnia. Start with 100mg to assess tolerance. Drink plenty of water — dehydration headaches are common. Eat before dosing to reduce nausea. Avoid caffeine stacking.",
    sideEffects: "Headache (especially on dehydration), insomnia if taken late, nausea, anxiety, dry mouth, decreased appetite. Rare: SJS/TEN (serious skin reactions — stop immediately if rash develops).",
    watchOut: "May reduce effectiveness of hormonal contraceptives (CYP3A4 induction) — use additional contraception. Rare but serious: Stevens-Johnson Syndrome. Avoid in severe anxiety disorders — can exacerbate anxiety. Schedule IV controlled substance in USA.",
    researchLevel: "Extensively Studied",
    tags: ["Cognitive", "Wakefulness", "Nootropic"],
    typicalDose: "200mg",
    cycle: "Daily or as needed",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Modafinil (Provigil) was developed by Lafon Laboratories and approved by the FDA in 1998 for narcolepsy, and later for sleep apnoea and shift work disorder. It is classified as a Schedule IV controlled substance in the US. Indian generic versions (Modalert, Modaheal, Modvigil) are manufactured by Sun Pharma, Healing Pharma, and HAB Pharma respectively.",
      keyBenefits: "Unlike traditional stimulants, modafinil does not deplete dopamine stores, is not associated with rebound fatigue, and has a much lower abuse potential. Cognitive enhancement effects are well-documented in sleep-deprived subjects and some rested individuals for complex tasks requiring sustained attention and decision-making.",
      mechanismOfAction: "Not fully elucidated. Modafinil inhibits dopamine reuptake (DAT) and may also affect norepinephrine, histamine (via inhibition of GABA release on tuberomammillary nucleus histaminergic neurons), and orexin signalling. Unlike amphetamines, it acts predominantly through inhibition of dopamine transporters rather than release, producing wakefulness without the extreme euphoria or abuse liability.",
    },
    pharmacokinetics: { peak: "2–4h", halfLife: "12–15h", cleared: "~60h (steady state)" },
    researchIndications: [
      { category: "Wakefulness / Narcolepsy", effectiveness: "Most Effective", items: [
        { title: "Narcolepsy", description: "Multiple RCTs: 200mg and 400mg significantly reduce Epworth Sleepiness Scale scores and improve Maintenance of Wakefulness Test (MWT) times vs placebo." },
        { title: "Shift Work Disorder", description: "200mg taken 1h before shift reduces sleepiness during shift and improves performance. Approved indication." },
      ]},
      { category: "Cognitive Enhancement", effectiveness: "Moderate", items: [
        { title: "Sleep-deprived cognition", description: "Large meta-analysis (2015, Battleday & Brem): consistent improvement in attention, executive function, and learning in sleep-deprived subjects. Benefits in non-sleep-deprived subjects are task-specific." },
        { title: "Non-sleep-deprived enhancement", description: "Improvements in complex task performance (non-verbal reasoning, planning, decision-making) observed even in rested subjects, though effects are more modest." },
      ]},
      { category: "Fatigue in Medical Conditions", effectiveness: "Effective", items: [
        { title: "MS Fatigue", description: "Effective in reducing fatigue in multiple sclerosis. Studied in Parkinson's, cancer-related fatigue, and post-COVID fatigue with positive results." },
      ]},
    ],
    researchProtocols: [
      { goal: "Wakefulness / Narcolepsy", dose: "200mg", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Shift Work Disorder", dose: "200mg", frequency: "1 hour before shift", route: "Oral" },
      { goal: "Cognitive enhancement (conservative)", dose: "100mg", frequency: "Morning as needed", route: "Oral" },
      { goal: "Cognitive enhancement (standard)", dose: "200mg", frequency: "Morning as needed", route: "Oral" },
    ],
    interactions: [
      { name: "Hormonal contraceptives", status: "caution" },
      { name: "Warfarin", status: "monitor" },
      { name: "Cyclosporine", status: "monitor" },
      { name: "MAOIs", status: "caution" },
      { name: "Alcohol", status: "caution" },
      { name: "Caffeine", status: "monitor" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Sustained 12–16h wakefulness", description: "Genuine modafinil produces clean, sustained wakefulness without the jitteriness or crash of stimulants. Effects should last 12–16 hours." },
      { type: "pass", title: "Mild headache on dehydration", description: "A common first-dose indicator of genuine modafinil is tension headache related to dehydration. Drink 2–3L water." },
      { type: "warn", title: "Contraceptive interaction is real", description: "Modafinil is a moderate CYP3A4 inducer. Women on hormonal contraceptives must use barrier methods concurrently and for 1 month after stopping modafinil." },
      { type: "fail", title: "Skin rash — stop immediately", description: "Any rash, blistering, or oral sores warrant immediate discontinuation. Risk of Stevens-Johnson Syndrome, though rare." },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Initial wakefulness onset. Reduced fatigue sensation begins." },
      { timeframe: "2–4 hours", description: "Peak plasma concentration. Maximum cognitive and wakefulness effects." },
      { timeframe: "8–12 hours", description: "Sustained wakefulness period. Good time for complex work or study." },
      { timeframe: "12–16 hours", description: "Therapeutic window concludes. Avoid dosing after noon if sleep is required by midnight." },
    ],
    sideEffectNotes: [
      "Headache (30–40% on first use) — almost always dehydration-related; drink 500ml water with the dose",
      "Insomnia — if taken after 10am, may disrupt sleep; take as early as possible",
      "Decreased appetite — dose-dependent; ensure adequate calorie intake",
      "Anxiety or irritability — more common at 200–400mg; reduce dose if persistent",
      "Nausea — take with food or start at 100mg",
      "Stevens-Johnson Syndrome — rare but serious; stop immediately with any rash and seek medical care",
    ],
    references: [
      { title: "Battleday RM & Brem AK — Eur Neuropsychopharmacol (2015)", context: "Meta-analysis | 24 studies | N=717", description: "Systematic review of modafinil cognitive enhancement in healthy non-sleep-deprived subjects. Found consistent benefit in complex tasks (attention, learning, decision-making).", url: "https://pubmed.ncbi.nlm.nih.gov/26142566/" },
      { title: "US Modafinil in Narcolepsy Multicenter Study Group — Sleep (2000)", context: "Human | 200–400mg | 9 weeks | N=245", description: "Largest narcolepsy RCT confirming MWT improvement and EDS reduction with both doses.", url: "https://pubmed.ncbi.nlm.nih.gov/10737337/" },
    ],
    faq: [
      { question: "Is modafinil addictive?", answer: "Modafinil has low abuse potential. It is classified Schedule IV (low dependence potential) vs Schedule II for amphetamines. While it acts on dopamine transporters, it does so differently than traditional stimulants and does not produce significant euphoria or dopamine release at clinical doses." },
      { question: "Does modafinil work for people without sleep problems?", answer: "Studies show modest but real improvements in complex tasks requiring sustained attention and decision-making in rested subjects. Effects are most pronounced in sleep-deprived states. Individual response varies considerably." },
      { question: "What's the difference between Modalert, Modaheal and Modvigil?", answer: "All three contain 200mg modafinil. Modalert is by Sun Pharma (largest Indian pharma), Modaheal by Healing Pharma, and Modvigil by HAB Pharma. Quality is generally comparable; Modalert has a larger user base for comparison data." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Provigil approved. Schedule IV controlled substance." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule X controlled substance. Prescription required." },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Modafinil approved for narcolepsy. POM." },
    ],
    indianBrands: [
      { brand: "Modalert 100", manufacturer: "Sun Pharma" },
      { brand: "Modalert 200", manufacturer: "Sun Pharma" },
      { brand: "Modaheal 100", manufacturer: "Healing Pharma" },
      { brand: "Modaheal 200", manufacturer: "Healing Pharma" },
      { brand: "Modvigil 200", manufacturer: "HAB Pharma" },
      { brand: "Modafil MD 200", notes: "Mouth-dissolving tablet" },
    ],
    ukBrands: [
      { brand: "Provigil", manufacturer: "Cephalon / Teva", notes: "100mg, 200mg; licensed for narcolepsy, OSA, shift work disorder" },
    ],
    usBrands: [
      { brand: "Provigil", manufacturer: "Cephalon", notes: "100mg, 200mg; Schedule IV" },
      { brand: "Modafinil (generic)", manufacturer: "Various", notes: "FDA-approved generics widely available" },
    ],
    canadaBrands: [
      { brand: "Alertec", manufacturer: "Shire", notes: "100mg tablets" },
      { brand: "Modafinil (generic)", manufacturer: "Various", notes: "Schedule F" },
    ],
  },

  {
    name: "Armodafinil",
    slug: "armodafinil",
    abbreviation: "ARM",
    aliases: ["armodafinil", "waklert", "artvigil", "nuvigil"],
    category: "cognitive",
    tagline: "R-enantiomer of modafinil — longer-lasting wakefulness & sharper focus",
    description: "Armodafinil is the R-enantiomer of racemic modafinil. At half the dose of modafinil (150mg vs 200mg), it produces comparable or superior wakefulness with a slightly different concentration-time profile — maintaining higher concentrations later in the day.",
    color: "#6D28D9",
    vial: "Oral tablet",
    recon: "50mg, 150mg, 250mg",
    startDose: "50–75mg",
    targetDose: "150mg",
    frequency: "Once daily (morning)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Active enantiomer with longer half-life than S-modafinil component. Maintains alertness later in the day without earlier taper. Effective at 150mg (equivalent to ~200mg modafinil). Some users report cleaner focus with less initial stimulation.",
    tips: "Take in the morning. 150mg is roughly equivalent to modafinil 200mg. Start at 75mg if sensitive. Unlike modafinil, plasma levels remain elevated longer into the afternoon — helpful for evening shift workers.",
    sideEffects: "Similar to modafinil: headache, insomnia, nausea, anxiety. Slightly different concentration-time profile may produce different timing of side effects.",
    watchOut: "Same contraception interaction as modafinil (CYP3A4 induction). Stop if skin rash develops. Avoid in severe anxiety or cardiac arrhythmia.",
    researchLevel: "Well Researched",
    tags: ["Cognitive", "Wakefulness", "Nootropic"],
    typicalDose: "150mg",
    cycle: "Daily or as needed",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Armodafinil (Nuvigil) was developed by Cephalon as an improved version of modafinil, containing only the R-enantiomer. Approved by FDA in 2007 for narcolepsy, shift work disorder, and sleep apnoea. Indian generics Waklert (Sun Pharma) and Artvigil (HAB Pharma) are widely used.",
      keyBenefits: "The R-enantiomer has a longer half-life than the S-enantiomer, producing sustained late-day plasma concentrations. This translates to maintained alertness later in the shift, which may be advantageous for long shifts and night workers. Requires lower milligram dosing than modafinil.",
      mechanismOfAction: "Same mechanism as modafinil — dopamine transporter inhibition — but the R-isomer has higher affinity and longer elimination. The differential pharmacokinetics result in a flatter, longer plasma curve vs modafinil's earlier peak-and-taper.",
    },
    pharmacokinetics: { peak: "2h", halfLife: "15h", cleared: "~3 days" },
    researchIndications: [
      { category: "Narcolepsy / Shift Work", effectiveness: "Most Effective", items: [
        { title: "Narcolepsy", description: "Non-inferior to modafinil in MWT and ESS improvement at 150mg. Preferred by some for its flatter plasma curve." },
        { title: "Shift Work Sleep Disorder", description: "Phase III trials: 150mg significantly improved mean sleep latency on MWT vs placebo during night shifts." },
      ]},
    ],
    researchProtocols: [
      { goal: "Narcolepsy / SWSD Standard", dose: "150mg", frequency: "Once daily (morning or 1h before shift)", route: "Oral" },
      { goal: "Conservative start", dose: "75mg", frequency: "Once daily morning", route: "Oral" },
    ],
    interactions: [
      { name: "Hormonal contraceptives", status: "caution" },
      { name: "Warfarin", status: "monitor" },
      { name: "MAOIs", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Sustained afternoon alertness", description: "Unlike modafinil, armodafinil maintains higher plasma levels later in the day. Genuine armodafinil should produce alertness persisting 12–15h from dosing." },
      { type: "warn", title: "Same SJS risk", description: "Rash or mucosal involvement — stop immediately. Risk is rare but applies equally to armodafinil." },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Wakefulness onset." },
      { timeframe: "2–4 hours", description: "Peak plasma concentration." },
      { timeframe: "6–12 hours", description: "Plateau phase — armodafinil maintains higher concentrations through the afternoon vs modafinil." },
      { timeframe: "12–15 hours", description: "Waning effect. Later taper than modafinil." },
    ],
    sideEffectNotes: [
      "Headache and dry mouth — common, especially first dose; hydrate well",
      "Insomnia — take no later than 10am for night-time sleep",
      "Anxiety — less common than stimulants but possible at higher doses",
    ],
    references: [
      { title: "Harsh JR et al. — Sleep (2006)", context: "Human | 150mg | 12 weeks | N=259", description: "Pivotal SWSD trial showing significant MWT improvement and reduced sleepiness on objective/subjective measures.", url: "https://pubmed.ncbi.nlm.nih.gov/16955001/" },
    ],
    faq: [
      { question: "Is armodafinil better than modafinil?", answer: "Neither is strictly better — they suit different people. Armodafinil has a flatter, longer plasma curve and may suit those who need sustained alertness throughout a long shift. Modafinil has a stronger early peak and may suit tasks requiring maximum morning focus. Many users try both." },
    
      { question: "How long does armodafinil last compared to modafinil?", answer: "Armodafinil (the R-enantiomer) has a longer effective duration than modafinil at equivalent doses. A single 150mg armodafinil dose maintains wakefulness for 16–18+ hours versus modafinil's 12–15 hours, with a flatter plasma curve avoiding the early-afternoon energy spike." },
      { question: "Is armodafinil stronger than modafinil?", answer: "Armodafinil 150mg is roughly equivalent to modafinil 200mg in wakefulness-promoting effect, as it is the active R-enantiomer. The 2:3 dose ratio reflects that half of modafinil (the S-enantiomer) contributes minimally to effect." },
      { question: "Can armodafinil affect contraceptive effectiveness?", answer: "Yes — armodafinil induces CYP3A4 and may reduce plasma levels of hormonal contraceptives (oestrogen-containing pills, implants, patches). Barrier contraception should be used concurrently and for 1 month after stopping armodafinil." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Nuvigil approved 2007. Schedule IV." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule X. Prescription required." },
    ],
    indianBrands: [
      { brand: "Waklert 50", manufacturer: "Sun Pharma" },
      { brand: "Waklert 150", manufacturer: "Sun Pharma" },
      { brand: "Artvigil 150", manufacturer: "HAB Pharma" },
    ],
    ukBrands: [
      { brand: "Nuvigil", manufacturer: "Cephalon / Teva", notes: "50mg, 150mg, 250mg; licensed for narcolepsy" },
    ],
    usBrands: [
      { brand: "Nuvigil", manufacturer: "Cephalon", notes: "50mg, 150mg, 250mg; Schedule IV" },
      { brand: "Armodafinil (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Not marketed in Canada", manufacturer: "—", notes: "Armodafinil not approved by Health Canada" },
    ],
  },

  // ─── DERMATOLOGY ──────────────────────────────────────────────────────────

  {
    name: "Tretinoin",
    slug: "tretinoin",
    abbreviation: "TRT",
    aliases: ["tretinoin", "retinoic acid", "retin-a", "a-ret"],
    category: "dermatology",
    tagline: "Topical retinoid — acne treatment & photoaging reversal",
    description: "Tretinoin (all-trans retinoic acid) is a vitamin A derivative and the gold standard topical retinoid for acne vulgaris and photoaged skin. It normalises follicular keratinisation, reduces comedone formation, and stimulates collagen synthesis.",
    color: "#D97706",
    vial: "Topical gel / cream",
    recon: "0.025%, 0.05%, 0.1%",
    startDose: "0.025% every other night",
    targetDose: "0.05–0.1% nightly",
    frequency: "Once nightly (after skin acclimatisation)",
    route: "Topical",
    storage: "Cool, dry place (refrigerator optional); protect from light",
    benefits: "Reduces inflammatory and non-inflammatory acne lesions. Accelerates skin cell turnover (decreases comedones). Long-term collagen stimulation reduces fine lines and wrinkles (Kligman regimen). Improves skin texture and pigmentation over months.",
    tips: "Apply to dry face (wait 20–30 min after washing). Start with 0.025% 2–3x/week and increase frequency/strength over 4–6 weeks. Always use SPF 30+ sunscreen daily — tretinoin increases UV sensitivity. Avoid waxing treated skin.",
    sideEffects: "Retinoid dermatitis ('purge'): dryness, redness, peeling, and increased acne in first 4–8 weeks. Photosensitivity. Irritation at application site.",
    watchOut: "Absolutely contraindicated in pregnancy (teratogenic). Women of childbearing potential should use reliable contraception. Avoid contact with eyes, nostrils, and mouth. Do not use on sunburned or eczematous skin.",
    researchLevel: "Extensively Studied",
    tags: ["Dermatology", "Acne", "Anti-aging"],
    typicalDose: "0.05% nightly",
    cycle: "Ongoing (months to years)",
    storageShort: "Cool, dry, dark",
    overview: {
      whatIsIt: "Tretinoin was first synthesised in 1955 and has been used topically since the 1960s. FDA-approved for acne since 1971. One of the most studied topical agents for both acne vulgaris and photoaged skin. Indian generic versions (A-Ret, Tretiheal, Retino-A) are widely available.",
      keyBenefits: "Only topical retinoid with FDA approval for both acne and photoaging (wrinkle reduction). Comedolytic action normalises the abnormal follicular keratinisation that underlies acne. Long-term collagen-I stimulation (via retinoic acid receptors) produces measurable reduction in rhytids after 6–12 months.",
      mechanismOfAction: "Binds retinoic acid receptors (RAR-α, β, γ) in keratinocytes, normalising differentiation and reducing retention hyperkeratosis in follicles. Reduces cohesion of follicular epithelial cells, expelling existing comedones and preventing new ones. Also stimulates fibroblast collagen and fibronectin synthesis in dermis for anti-aging effects.",
    },
    pharmacokinetics: { peak: "N/A (topical)", halfLife: "N/A", cleared: "Minimal systemic absorption" },
    researchIndications: [
      { category: "Acne Vulgaris", effectiveness: "Most Effective", items: [
        { title: "Comedonal Acne", description: "Tretinoin is the cornerstone of comedonal acne treatment. Reduces both open and closed comedones by 65–80% in 12-week trials." },
        { title: "Inflammatory Acne", description: "Reduces papules and pustules; often combined with benzoyl peroxide or antibiotics for superior anti-inflammatory benefit." },
      ]},
      { category: "Photoaging / Anti-aging", effectiveness: "Effective", items: [
        { title: "Wrinkle Reduction", description: "Kligman & Ellis regimen (0.1% cream): measurable reduction in fine wrinkles after 6 months, peak benefit at 12 months. Histological collagen increase confirmed." },
        { title: "Hyperpigmentation / Melasma", description: "Accelerates turnover of pigmented keratinocytes; part of triple combination therapy (tretinoin + hydroquinone + steroid) for melasma." },
      ]},
    ],
    researchProtocols: [
      { goal: "Acne — Initial (skin acclimatisation)", dose: "0.025% gel", frequency: "Every other night for 4 weeks", route: "Topical (thin layer, dry skin)" },
      { goal: "Acne — Maintenance", dose: "0.025–0.05% gel", frequency: "Nightly", route: "Topical" },
      { goal: "Anti-aging (Kligman regimen)", dose: "0.05–0.1% cream", frequency: "Nightly", route: "Topical" },
    ],
    interactions: [
      { name: "Benzoyl peroxide (same application time)", status: "caution" },
      { name: "Salicylic acid", status: "caution" },
      { name: "AHAs/BHAs", status: "caution" },
      { name: "Isotretinoin (oral)", status: "avoid" },
      { name: "SPF sunscreen (daytime)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Initial purge is expected", description: "Worsening acne in weeks 2–6 ('retinoid purge') is a sign of genuine tretinoin activity. Persisting without any initial irritation may indicate low-quality or very low-concentration product." },
      { type: "pass", title: "Peeling and dryness", description: "Skin peeling and tightness in the first 2–4 weeks confirms retinoid activity. Gradual reduction with acclimatisation is normal." },
      { type: "warn", title: "Product degradation with heat/light", description: "Tretinoin degrades rapidly in heat and light. Store away from direct sunlight; refrigeration extends shelf life. Yellow discoloration of gel indicates oxidation." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "Initial irritation, redness, and possibly increased acne. Normal — indicates retinoid activity." },
      { timeframe: "Week 4–6", description: "Purge phase ending. Skin begins to acclimatise. Some improvement in skin texture visible." },
      { timeframe: "Month 2–3", description: "Visible reduction in comedones and inflammatory lesions. Continued texture improvement." },
      { timeframe: "Month 6+", description: "Maximum acne clearance. Measurable improvement in fine lines and skin tone for anti-aging use." },
    ],
    sideEffectNotes: [
      "Dryness and peeling — especially in first 4–6 weeks; use non-comedogenic moisturiser",
      "Photosensitivity — use SPF 30+ daily, mandatory for safe use",
      "Purge (acne worsening) — weeks 2–6; persevere if using for acne",
      "Erythema (redness) — reduce frequency or concentration if severe",
      "Teratogenicity — absolute contraindication in pregnancy",
    ],
    references: [
      { title: "Kligman AM et al. — JAAD (1986)", context: "Human | 0.1% cream | 16 months", description: "Landmark study demonstrating histological and clinical improvement in photoaged skin with tretinoin.", url: "https://pubmed.ncbi.nlm.nih.gov/2934632/" },
    ],
    faq: [
      { question: "How long until I see results?", answer: "For acne, expect worsening (purge) in weeks 2–6, then improvement starting around week 8–12. For anti-aging, measurable wrinkle reduction requires 6–12 months of consistent nightly use. Tretinoin is a long game — patience is essential." },
      { question: "Can I use tretinoin under the eyes?", answer: "The periocular area (around the eyes) is thinner and more sensitive. Apply with great caution — use only 0.025% with a small amount, applied carefully. Avoid direct contact with lower eyelid margin. Many dermatologists recommend dedicated eye creams instead." },
    
      { question: "How long does tretinoin take to work?", answer: "Initial purging (temporary worsening of acne or increased peeling) occurs in weeks 1–6. Visible improvement in acne typically begins at 6–8 weeks. Anti-aging effects (fine lines, texture, pigmentation) require 3–6 months of consistent use." },
      { question: "Can I use tretinoin under the eyes?", answer: "The periorbital area can use low-strength tretinoin (0.025–0.05%) for fine lines, but with extra caution: the skin there is thinner and more sensitive. Apply a very small amount every other night, wait 30 minutes after moisturiser, and avoid the eyelid itself." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Retin-A approved for acne. Off-label use for photoaging is well established." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. Available as gel and cream." },
    ],
    indianBrands: [
      { brand: "A-Ret Gel 0.025%", manufacturer: "Janssen-Cilag" },
      { brand: "A-Ret Gel 0.05%", manufacturer: "Janssen-Cilag" },
      { brand: "A-Ret Gel 0.1%", manufacturer: "Janssen-Cilag" },
      { brand: "Tretiheal 0.025%", manufacturer: "Healing Pharma" },
      { brand: "Tretiheal 0.05%", manufacturer: "Healing Pharma" },
      { brand: "Tretiheal 0.1%", manufacturer: "Healing Pharma" },
      { brand: "Retino-A Cream 0.025%", manufacturer: "Janssen" },
      { brand: "Retino-A Cream 0.05%", manufacturer: "Janssen" },
    ],
    ukBrands: [
      { brand: "Retin-A", manufacturer: "Janssen-Cilag", notes: "0.025%, 0.05% cream; POM" },
      { brand: "Aberela", manufacturer: "Janssen", notes: "0.05% cream" },
      { brand: "Tretinoin (generic)", manufacturer: "Various", notes: "Compounded or specialist prescription" },
    ],
    usBrands: [
      { brand: "Retin-A", manufacturer: "Janssen", notes: "0.025%, 0.05%, 0.1%; cream & gel" },
      { brand: "Retin-A Micro", manufacturer: "Janssen", notes: "Microsphere gel formulation" },
      { brand: "Renova", manufacturer: "Ortho Derm", notes: "0.02%, 0.05% cream; photoaging indication" },
      { brand: "Atralin", manufacturer: "Galderma", notes: "0.05% gel" },
      { brand: "Altreno", manufacturer: "Ortho Derm", notes: "0.05% lotion" },
    ],
    canadaBrands: [
      { brand: "Retin-A", manufacturer: "Janssen", notes: "0.025%, 0.05%, 0.1% available on Rx" },
      { brand: "Retisol-A", manufacturer: "Stiefel", notes: "0.025%, 0.05%, 0.1% cream" },
    ],
  },

  {
    name: "Isotretinoin",
    slug: "isotretinoin",
    abbreviation: "ISO",
    aliases: ["isotretinoin", "roaccutane", "accutane", "accufine"],
    category: "dermatology",
    tagline: "Oral retinoid — severe nodular acne & long-term remission",
    description: "Isotretinoin is an oral vitamin A derivative — the only medication that addresses all four pathogenic factors of acne: sebum production, follicular keratinisation, P. acnes colonisation, and inflammation. Produces prolonged remission after a single course in most patients.",
    color: "#B45309",
    vial: "Oral capsule / soft gelatin capsule",
    recon: "10mg, 20mg, 30mg, 40mg",
    startDose: "0.5mg/kg/day",
    targetDose: "1mg/kg/day (target cumulative dose 120–150mg/kg)",
    frequency: "Once or twice daily with food",
    route: "Oral",
    storage: "Room temperature, protect from light and moisture",
    benefits: "Reduces sebum production 70–80%. Targets all four acne pathogenic mechanisms simultaneously. Single 5–6 month course produces sustained remission in >70% of patients. Effective for severe nodular, cystic, and scarring acne.",
    tips: "Always take with fatty food — absorption increases 50% with high-fat meal. Use SPF daily (photosensitisation). Avoid waxing and dermabrasion during treatment. Use intensive lip balm (cheilitis is near-universal). Avoid vitamin A supplements.",
    sideEffects: "Cheilitis (dry, cracked lips — >90%), dry skin, dry eyes, musculoskeletal aches, elevated triglycerides, transaminase elevation, night vision changes, nose bleeds, hair thinning.",
    watchOut: "Absolutely teratogenic — contraindicated in pregnancy with mandatory pregnancy tests, two forms of contraception (iPLEDGE program in USA). Associated with IBD and depression in some studies — monitor mental health. Do not donate blood during or 30 days after treatment.",
    researchLevel: "Extensively Studied",
    tags: ["Dermatology", "Acne", "Sebum Reduction"],
    typicalDose: "0.5–1mg/kg/day",
    cycle: "4–6 months (single course)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Isotretinoin was developed as a synthetic retinoid and approved by the FDA in 1982. Despite controversies, it remains the most effective acne treatment available and the only one capable of producing lasting remission. Available in India under several brand names, most notably Accufine and various generic versions.",
      keyBenefits: "Uniquely addresses all four factors of acne pathogenesis simultaneously. 70–90% of patients achieve sustained remission after a single 5–6 month course (cumulative dose 120–150mg/kg). Effective even for cases resistant to antibiotics and topical treatments. Prevents acne scarring in severe cases.",
      mechanismOfAction: "Binds RAR and RXR nuclear receptors. Reduces sebocyte proliferation and sebum secretion by 70–80% (most potent antiseborrheic agent known). Normalises follicular keratinisation. Reduces P. acnes colonisation (indirect — via sebum reduction). Has significant anti-inflammatory properties independent of P. acnes effects.",
    },
    pharmacokinetics: { peak: "2–4h (with food)", halfLife: "10–20h", cleared: "~30 days (metabolites: 90 days)" },
    researchIndications: [
      { category: "Severe Acne", effectiveness: "Most Effective", items: [
        { title: "Nodular/Cystic Acne", description: "FDA approved for severe recalcitrant nodular acne. RCTs consistently show >80% lesion reduction vs placebo. Remission sustained in 70–90% after one course." },
        { title: "Antibiotic-Resistant Acne", description: "First-line option once antibiotic resistance or treatment failure is documented. More effective than any combination antibiotic regimen." },
      ]},
    ],
    researchProtocols: [
      { goal: "Low-dose regime (reduced side effects)", dose: "0.25–0.3mg/kg/day", frequency: "Daily with food", route: "Oral" },
      { goal: "Standard dose", dose: "0.5mg/kg/day", frequency: "Daily with food", route: "Oral" },
      { goal: "High-dose (faster remission)", dose: "1mg/kg/day", frequency: "Daily with food", route: "Oral" },
    ],
    interactions: [
      { name: "Vitamin A supplements", status: "avoid" },
      { name: "Tetracycline antibiotics", status: "avoid" },
      { name: "Minocycline", status: "avoid" },
      { name: "Hormonal contraceptives", status: "compatible" },
      { name: "Methotrexate", status: "avoid" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Cheilitis within 2 weeks", description: "Dry, cracked lips (cheilitis) is expected in >90% of genuine isotretinoin users within 1–2 weeks. Absence may indicate underdosed or counterfeit product." },
      { type: "warn", title: "Triglyceride monitoring essential", description: "Obtain baseline and monthly lipid panels. Elevated triglycerides (>500mg/dL) require dose reduction or temporary discontinuation." },
      { type: "fail", title: "Take with fatty food — mandatory", description: "Absorption increases 50% with high-fat meal. Taking on empty stomach significantly reduces efficacy and cumulative dose achieved." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–4", description: "Cheilitis, dry skin, possible initial acne flare. Start Vaseline for lips." },
      { timeframe: "Month 2–3", description: "Sebum production visibly reduced. Skin less oily. Acne improvement begins." },
      { timeframe: "Month 4–5", description: "Major clearance. Most patients see 70–90% lesion reduction." },
      { timeframe: "Month 6+", description: "Course completion. Continued improvement for 1–2 months after stopping as skin renews." },
    ],
    sideEffectNotes: [
      "Cheilitis — near-universal; use Vaseline or thick lip balm, multiple times daily",
      "Dry skin — use non-comedogenic moisturiser; may need prescription emollients in severe cases",
      "Elevated triglycerides — monitor monthly; reduce dose or add omega-3 if >500mg/dL",
      "Teratogenicity — Category X; absolute contraindication in pregnancy; iPLEDGE (USA) / CERIS (EU) programs mandatory",
      "Musculoskeletal pain — dose-dependent; reduce physical activity intensity during treatment",
      "Mood changes / depression — monitor carefully; discontinue if significant mood deterioration",
    ],
    references: [
      { title: "Layton AM et al. — Clin Exp Dermatol (1993)", context: "Human | Standard dose | 20 years follow-up", description: "Long-term follow-up study showing >50% of patients remain clear 20 years after isotretinoin treatment.", url: "https://pubmed.ncbi.nlm.nih.gov/8348741/" },
    ],
    faq: [
      { question: "Will my acne come back after isotretinoin?", answer: "Around 70–90% of patients achieve lasting remission after a single course. Factors increasing relapse risk: young age (<18), male sex, very oily skin, or cumulative dose below 120mg/kg. A second course may be needed in 10–30% of patients." },
      { question: "Does isotretinoin cause depression?", answer: "The causal relationship is controversial. Isotretinoin's package insert includes a depression warning, and case reports exist. However, large epidemiological studies show acne itself significantly worsens mental health, and successful isotretinoin treatment often improves mood. Monitor mental health and inform prescriber immediately if depression worsens." },
    
      { question: "Why does isotretinoin require monthly blood tests?", answer: "Isotretinoin affects liver enzymes (ALT, AST), triglycerides, and cholesterol, which can elevate significantly. Monthly LFTs and lipid panels monitor for hepatotoxicity and hypertriglyceridaemia. Blood tests also confirm pregnancy status in female patients (required by iPLEDGE in the US)." },
      { question: "When can I wax or have laser treatment after isotretinoin?", answer: "Wait at least 6 months after completing isotretinoin before any waxing, dermabrasion, laser resurfacing, or chemical peels. The drug reduces skin healing capacity and increases scarring risk; the 6-month window allows complete metabolic clearance and restoration of normal skin integrity." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "iPLEDGE risk management program mandatory." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. Contraindicated in pregnancy." },
    ],
    indianBrands: [
      { brand: "Accufine 10", manufacturer: "Akumentis Healthcare" },
      { brand: "Accufine 20", manufacturer: "Akumentis Healthcare" },
      { brand: "Accufine 30", manufacturer: "Akumentis Healthcare" },
      { brand: "Accufine 40", manufacturer: "Akumentis Healthcare" },
    ],
    ukBrands: [
      { brand: "Roaccutane", manufacturer: "Roche", notes: "5mg, 10mg, 20mg softgels; licensed for severe acne; iPLEDGE-equivalent pregnancy prevention" },
      { brand: "Isotretinoin (generic)", manufacturer: "Various", notes: "Prescription only; consultant dermatologist typically required" },
    ],
    usBrands: [
      { brand: "Amnesteem", manufacturer: "Mylan", notes: "10mg, 20mg, 40mg; iPLEDGE mandatory" },
      { brand: "Claravis", manufacturer: "Barr", notes: "10mg, 20mg, 30mg, 40mg" },
      { brand: "Absorica", manufacturer: "Sun Pharma", notes: "Micronized form; can be taken without food" },
      { brand: "Zenatane", manufacturer: "Dr. Reddys", notes: "10mg, 20mg, 40mg capsules" },
    ],
    canadaBrands: [
      { brand: "Epuris", manufacturer: "Cipher Pharma", notes: "10mg, 20mg, 40mg; enhanced bioavailability formulation" },
      { brand: "Clarus", manufacturer: "Cipher", notes: "Softgel capsules" },
    ],
  },

  {
    name: "Azelaic Acid",
    slug: "azelaic-acid",
    abbreviation: "AZA",
    aliases: ["azelaic acid", "aziderm", "azedrox"],
    category: "dermatology",
    tagline: "Dicarboxylic acid — acne, rosacea & hyperpigmentation",
    description: "Azelaic acid is a naturally-occurring dicarboxylic acid with antimicrobial, comedolytic, and tyrosinase-inhibiting properties. FDA-approved for acne vulgaris and rosacea. A gentler alternative to retinoids with less irritation, suitable for sensitive skin.",
    color: "#F59E0B",
    vial: "Topical gel / cream / foam",
    recon: "10%, 15%, 20%",
    startDose: "10% or 15% twice daily",
    targetDose: "20% twice daily (for hyperpigmentation)",
    frequency: "Twice daily (morning and evening)",
    route: "Topical",
    storage: "Room temperature",
    benefits: "Reduces P. acnes and Malassezia. Inhibits tyrosinase — reduces post-inflammatory hyperpigmentation (PIH). Anti-inflammatory and comedolytic. Safe in pregnancy (category B). Works for acne AND rosacea. Reduces papulopustular rosacea.",
    tips: "Apply to clean, dry skin twice daily. Mild tingling on application is normal and decreases with continued use. Can be used morning and evening — compatible with sunscreen. Safe during pregnancy (category B).",
    sideEffects: "Skin tingling/burning on application (transient), dryness, mild peeling, pruritus. Hypopigmentation possible at high concentrations — avoid in patients with vitiligo.",
    watchOut: "May cause hypopigmentation in darker skin tones at high concentrations or overuse. Not for use near eyes. Some formulations contain propylene glycol which may irritate sensitive skin.",
    researchLevel: "Well Researched",
    tags: ["Dermatology", "Acne", "Rosacea", "Hyperpigmentation"],
    typicalDose: "15–20% twice daily",
    cycle: "Ongoing",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Azelaic acid occurs naturally in wheat, barley, and rye. As a pharmaceutical, 15% gel (Finacea) is approved for rosacea and 20% cream for acne. Its mechanism covers multiple acne pathways without the teratogenicity or irritation of retinoids, making it particularly useful in pregnancy and for sensitive or darker skin tones.",
      keyBenefits: "Uniquely treats both acne and hyperpigmentation simultaneously — important for darker skin tones (Fitzpatrick III–VI) where PIH is a major concern. Safe in pregnancy. Well-tolerated by sensitive skin. Addresses rosacea through anti-inflammatory and antimicrobial mechanisms.",
      mechanismOfAction: "Bacteriostatic against P. acnes and Staphylococcus epidermidis. Inhibits synthesis of bacterial proteins. Normalises follicular keratinisation. Inhibits tyrosinase in hyperactive melanocytes — reduces PIH without affecting normal pigmentation. Anti-inflammatory via inhibition of reactive oxygen species in neutrophils.",
    },
    pharmacokinetics: { peak: "N/A (topical)", halfLife: "N/A", cleared: "Minimal systemic absorption (3–8%)" },
    researchIndications: [
      { category: "Acne Vulgaris", effectiveness: "Effective", items: [
        { title: "Mild-Moderate Inflammatory Acne", description: "20% cream comparable to 5% benzoyl peroxide and 0.05% tretinoin in RCTs for total lesion count reduction (40–60%)." },
      ]},
      { category: "Rosacea", effectiveness: "Most Effective", items: [
        { title: "Papulopustular Rosacea", description: "15% gel (Finacea) FDA-approved. Reduces inflammatory lesion count by 65% vs 40% placebo in Phase III trials." },
      ]},
    ],
    researchProtocols: [
      { goal: "Acne treatment", dose: "20% cream", frequency: "Twice daily", route: "Topical" },
      { goal: "Rosacea", dose: "15% gel", frequency: "Twice daily", route: "Topical" },
      { goal: "Hyperpigmentation", dose: "20% cream", frequency: "Twice daily with sunscreen", route: "Topical" },
    ],
    interactions: [
      { name: "Retinoids (topical)", status: "compatible" },
      { name: "Benzoyl peroxide", status: "compatible" },
      { name: "Niacinamide", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Transient tingling on application", description: "Mild burning or tingling on application is characteristic of genuine azelaic acid and typically improves after 2–4 weeks." },
    ],
    expectTimeline: [
      { timeframe: "Week 2–4", description: "Initial reduction in redness and pustules (rosacea). Acne improvement begins." },
      { timeframe: "Month 2–3", description: "Visible reduction in PIH and hyperpigmentation with consistent twice-daily use." },
      { timeframe: "Month 3–6", description: "Maximum improvement in acne lesions and skin tone uniformity." },
    ],
    sideEffectNotes: [
      "Tingling/burning on application — common initially; improves with continued use",
      "Skin dryness and desquamation — mild; use moisturiser if needed",
      "Hypopigmentation at very high concentrations or overuse — monitor in darker skin tones",
    ],
    references: [
      { title: "Draelos ZD et al. — Cutis (2006)", context: "Human | 15% gel | 12 weeks | N=251", description: "Phase III rosacea trial showing 65% inflammatory lesion reduction.", url: "https://pubmed.ncbi.nlm.nih.gov/16869099/" },
    ],
    faq: [
      { question: "Is azelaic acid safe in pregnancy?", answer: "Yes — azelaic acid is FDA Category B (animal studies show no risk; no adequate human studies). It is one of the few acne treatments considered safe for use during pregnancy." },
    
      { question: "Can azelaic acid be used during pregnancy?", answer: "Azelaic acid is generally considered safe in pregnancy (Category B). Unlike tretinoin and isotretinoin, it is not teratogenic, making it one of the preferred options for managing acne and melasma during pregnancy. Topical absorption is minimal (< 4%)." },
      { question: "How does azelaic acid work on hyperpigmentation?", answer: "Azelaic acid inhibits tyrosinase, the key enzyme in melanin synthesis, selectively in hyperactive melanocytes without affecting normal skin pigmentation. This makes it suitable for treating post-inflammatory hyperpigmentation and melasma without causing paradoxical depigmentation." },
      { question: "Can I use azelaic acid with niacinamide?", answer: "Yes — azelaic acid and niacinamide are compatible and actually synergistic for hyperpigmentation and redness. Both inhibit melanin transfer to skin cells via complementary mechanisms. Use azelaic acid morning or evening and niacinamide at the other step if desired, or layer them (niacinamide first, then azelaic acid)." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Finacea 15% gel approved for rosacea; 20% cream for acne." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Available as cream and gel." },
    ],
    indianBrands: [
      { brand: "Aziderm 10% Cream 30GM", manufacturer: "Biogenix" },
      { brand: "Aziderm 15% Cream 30GM", manufacturer: "Biogenix" },
      { brand: "Aziderm 20% Cream 30GM", manufacturer: "Biogenix" },
      { brand: "Aziderm 10% Gel 15GM", manufacturer: "Biogenix" },
    ],
    ukBrands: [
      { brand: "Skinoren 20% Cream", manufacturer: "Bayer" },
      { brand: "Finacea 15% Gel", manufacturer: "Almirall" },
    ],
    usBrands: [
      { brand: "Finacea 15% Gel", manufacturer: "Almirall" },
      { brand: "Azelex 20% Cream", manufacturer: "Allergan" },
    ],
    canadaBrands: [
      { brand: "Finacea 15% Gel", manufacturer: "Almirall" },
      { brand: "Skinoren 20% Cream", manufacturer: "Bayer" },
    ],
  },

  // ─── HAIR LOSS ────────────────────────────────────────────────────────────

  {
    name: "Finasteride",
    slug: "finasteride",
    abbreviation: "FIN",
    aliases: ["finasteride", "propecia", "finpecia", "finax"],
    category: "hair-loss",
    tagline: "5α-reductase type II inhibitor — male pattern baldness & BPH",
    description: "Finasteride inhibits type II 5α-reductase, reducing conversion of testosterone to dihydrotestosterone (DHT) by ~70%. DHT is the primary androgen responsible for androgenetic alopecia and benign prostatic hyperplasia. Proven to halt hair loss and promote regrowth.",
    color: "#0D9488",
    vial: "Oral tablet",
    recon: "1mg (hair loss), 5mg (BPH)",
    startDose: "1mg",
    targetDose: "1mg daily",
    frequency: "Once daily (same time)",
    route: "Oral",
    storage: "Room temperature, away from moisture",
    benefits: "Reduces scalp DHT by 64–68%. Halts hair loss in 86% of men. Promotes measurable regrowth in 48% at 2 years. Effects cumulative over time. Effective at vertex and mid-scalp; less effective at hairline.",
    tips: "Take at the same time each day — half-life and DHT suppression are long enough that timing is flexible. Results take 3–6 months to see; 12 months for full assessment. Do not crush tablets (women should not handle broken tablets — teratogenic). Effects reverse within 12 months of stopping.",
    sideEffects: "Sexual side effects (erectile dysfunction, reduced libido, ejaculatory disorders) reported in ~2–4% of men. Gynaecomastia rare. Post-Finasteride Syndrome (persistent side effects after discontinuation) — controversial, estimated 0.5–3% of users.",
    watchOut: "Contraindicated in women of childbearing potential (teratogenic to male foetus). PSA levels are reduced ~50% — adjust reference ranges accordingly for prostate cancer screening. Monitor for signs of high-grade prostate cancer (PCPT trial signal).",
    researchLevel: "Extensively Studied",
    tags: ["Hair Loss", "AGA", "DHT Blocker"],
    typicalDose: "1mg daily",
    cycle: "Continuous (indefinite)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Finasteride 1mg (Propecia) was approved by the FDA for androgenetic alopecia in 1997 following the landmark MHRS trial. The 5mg formulation (Proscar) was previously approved for BPH in 1992. Indian generic versions (Finpecia, Healpecia, Finax, Finalo) are manufactured by major pharmaceutical companies and represent the most cost-effective option globally.",
      keyBenefits: "Halts further hair loss in >85% of men and produces measurable regrowth in approximately half. Two major RCTs (MHRS 1998, 2002) with 5-year data confirm durable efficacy. Oral once-daily dosing with decades of safety data.",
      mechanismOfAction: "Specifically inhibits type II 5α-reductase (the isoform predominant in hair follicles and prostate), blocking conversion of testosterone to the more potent DHT. DHT binds androgen receptors in susceptible hair follicles, miniaturising them over time. Reducing scalp DHT by 64% reverses miniaturisation and extends anagen phase of susceptible follicles.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "5–6h (DHT effect lasts >24h)", cleared: "~48h" },
    researchIndications: [
      { category: "Androgenetic Alopecia", effectiveness: "Most Effective", items: [
        { title: "Vertex/Mid-scalp Hair Loss", description: "MHRS: 86% stabilisation, 48% regrowth at 2 years vs 42% stabilisation placebo. 5-year data: 90% stabilisation, maintained regrowth advantage." },
        { title: "Hairline Recession", description: "Less effective at frontal hairline than vertex. Can slow frontal recession but rarely reverses it." },
      ]},
      { category: "BPH (at 5mg dose)", effectiveness: "Effective", items: [
        { title: "Benign Prostatic Hyperplasia", description: "5mg reduces prostate volume 20–25% and improves urinary flow in men with large prostates over 6–12 months." },
      ]},
    ],
    researchProtocols: [
      { goal: "AGA — Standard", dose: "1mg", frequency: "Once daily", route: "Oral" },
      { goal: "BPH", dose: "5mg", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Dutasteride (sequential)", status: "caution" },
      { name: "Warfarin", status: "monitor" },
      { name: "Alpha-blockers (for BPH, additive)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "DHT reduction confirmed in clinical use", description: "Serum DHT should decrease ~70% on 1mg dosing. Some labs offer DHT testing — useful in non-responders." },
      { type: "pass", title: "Slower hair loss within 3 months", description: "Reduced shedding is often the first sign within 3 months. New growth may only become visible at 6–12 months." },
      { type: "warn", title: "PSA adjustment required", description: "Finasteride reduces PSA by ~50%. Multiply PSA value by 2 when screening for prostate cancer in men on finasteride." },
    ],
    expectTimeline: [
      { timeframe: "Month 1–3", description: "DHT suppression established. May notice reduced shedding. Some temporary shedding increase initially (old hairs exiting)." },
      { timeframe: "Month 3–6", description: "Stabilisation visible. Reduced hair loss confirmed. Earliest miniaturised regrowth may emerge." },
      { timeframe: "Month 6–12", description: "Measurable improvement in density and coverage at vertex. Full assessment at 12 months recommended." },
      { timeframe: "Year 2–5", description: "Continued gradual improvement. 5-year data shows maintained advantage over placebo. Effects continue as long as drug is taken." },
    ],
    sideEffectNotes: [
      "Sexual side effects (ED, reduced libido, ejaculatory dysfunction) — ~2–4% in clinical trials; resolve on discontinuation in most",
      "Post-Finasteride Syndrome — persistent sexual and cognitive symptoms after discontinuation; estimated 0.5–3%; mechanism debated",
      "Gynaecomastia — rare (<1%); monitor for breast tenderness or swelling",
      "PSA reduction — reduces PSA ~50%; inform urologist or GP if being screened for prostate cancer",
      "Teratogenicity to male foetus — women should not handle broken/crushed tablets",
    ],
    references: [
      { title: "Kaufman KD et al. MHRS — JAAD (1998)", context: "Human | 1mg daily | 2 years | N=1,553", description: "Pivotal finasteride AGA trial. 86% stabilisation vs 42% placebo, 48% showed visible regrowth at vertex.", url: "https://pubmed.ncbi.nlm.nih.gov/9669136/" },
    ],
    faq: [
      { question: "How long do I need to take finasteride?", answer: "Finasteride must be taken continuously. Effects reverse within 6–12 months of stopping as DHT levels return to normal and miniaturised follicles resume their accelerated loss cycle. Most users commit to long-term (indefinite) use." },
      { question: "Can I take finasteride every other day?", answer: "Every-other-day dosing has been studied and maintains significant DHT suppression due to the compound's long biological effect on DHT. Some use this to reduce side effect risk. However, daily dosing provides more consistent suppression." },
    
      { question: "Can finasteride cause permanent sexual side effects?", answer: "The controversial 'post-finasteride syndrome' describes persistent sexual, cognitive, and mood symptoms after stopping. The 2023 FDA label update acknowledges that side effects may persist after discontinuation in some men. However, the incidence appears low (< 1%) in clinical trials, though potentially underreported." },
      { question: "Does finasteride affect PSA readings?", answer: "Yes — finasteride reduces PSA levels by approximately 50% after 6 months of use. Physicians should double the measured PSA value to estimate the true PSA in patients on finasteride. Any PSA increase even within the 'normal' range may warrant investigation." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Propecia (1mg) approved for AGA; Proscar (5mg) approved for BPH." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. Multiple generics available." },
    ],
    indianBrands: [
      { brand: "Finpecia 1", manufacturer: "Cipla" },
      { brand: "Healpecia 1", manufacturer: "Healing Pharma" },
      { brand: "Finalo 1" },
      { brand: "Finax 1", manufacturer: "Dr Reddy's" },
      { brand: "Finjuv 1" },
      { brand: "Pruwel 1" },
      { brand: "Proscalpin 1" },
      { brand: "DEE X 1" },
    ],
    ukBrands: [
      { brand: "Propecia", manufacturer: "MSD / Merck", notes: "1mg tablets; licensed for AGA in men" },
      { brand: "Proscar", manufacturer: "MSD / Merck", notes: "5mg; licensed for BPH" },
      { brand: "Finasteride (generic)", manufacturer: "Various", notes: "Available on prescription; POM" },
    ],
    usBrands: [
      { brand: "Propecia", manufacturer: "Merck", notes: "1mg; for AGA" },
      { brand: "Proscar", manufacturer: "Merck", notes: "5mg; for BPH" },
      { brand: "Finasteride (generic)", manufacturer: "Various", notes: "FDA-approved generics widely available" },
    ],
    canadaBrands: [
      { brand: "Propecia", manufacturer: "Merck", notes: "1mg; licensed for AGA in men" },
      { brand: "Proscar", manufacturer: "Merck", notes: "5mg; for BPH" },
      { brand: "Finasteride (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Dutasteride",
    slug: "dutasteride",
    abbreviation: "DUT",
    aliases: ["dutasteride", "avodart", "dutas", "dutaheal"],
    category: "hair-loss",
    tagline: "Dual 5α-reductase inhibitor — superior DHT suppression for AGA & BPH",
    description: "Dutasteride inhibits both type I and type II 5α-reductase isoforms, reducing serum DHT by ~95% (vs ~70% with finasteride). Approved for BPH; used off-label for androgenetic alopecia with superior efficacy data vs finasteride in head-to-head trials.",
    color: "#0F766E",
    vial: "Soft gelatin capsule",
    recon: "0.5mg",
    startDose: "0.5mg",
    targetDose: "0.5mg daily",
    frequency: "Once daily",
    route: "Oral",
    storage: "Room temperature, away from direct heat and sunlight",
    benefits: "95% serum DHT reduction (vs 70% finasteride). Head-to-head trial: dutasteride 0.5mg superior to finasteride 1mg for hair count increase at 24 weeks. FDA-approved for BPH; off-label for AGA (Korea approved 0.5mg for AGA).",
    tips: "Do not open capsule (contains oil-based formulation). PSA must be doubled (or x2.5) when interpreting cancer screening results. Effects on AGA similar to finasteride but potentially greater. Longer half-life and broader DHT suppression.",
    sideEffects: "Similar to finasteride — sexual side effects (3–8%), gynaecomastia, ejaculatory disorders. Longer half-life (5 weeks) means side effects persist longer after discontinuation if they occur.",
    watchOut: "Contraindicated in women (teratogenic). Blood donation contraindicated for 6 months after stopping (long half-life). PSA drops by up to 50% — adjust interpretation. Similar Post-Finasteride Syndrome risk concerns apply.",
    researchLevel: "Well Researched",
    tags: ["Hair Loss", "AGA", "DHT Blocker"],
    typicalDose: "0.5mg daily",
    cycle: "Continuous",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Dutasteride (Avodart) was approved by the FDA in 2001 for BPH. Unlike finasteride which inhibits only type II 5α-reductase, dutasteride inhibits both type I (predominant in skin, sebaceous glands) and type II (prostate, follicles). This dual inhibition achieves a greater degree of DHT suppression. Korean FDA approved dutasteride for AGA in 2009.",
      keyBenefits: "Greater DHT suppression than finasteride. A 24-week head-to-head Korean trial showed superior hair count at vertex and mid-scalp vs finasteride 1mg. Suitable alternative for finasteride non-responders. Same once-daily convenience.",
      mechanismOfAction: "Inhibits both 5α-reductase isoforms (type I and type II), blocking DHT synthesis in the skin (type I predominant) AND hair follicles/prostate (type II predominant). This dual blockade reduces serum DHT by 95% and scalp DHT more completely than finasteride.",
    },
    pharmacokinetics: { peak: "2–3h", halfLife: "~5 weeks", cleared: "~3 months" },
    researchIndications: [
      { category: "Androgenetic Alopecia", effectiveness: "Most Effective", items: [
        { title: "AGA (off-label, superior to finasteride)", description: "Yo-Chan Gu et al. (2014) head-to-head RCT: dutasteride 0.5mg significantly superior to finasteride 1mg for hair count increase at vertex and mid-scalp after 24 weeks." },
      ]},
      { category: "BPH (approved indication)", effectiveness: "Effective", items: [
        { title: "BPH — Prostate Volume Reduction", description: "Reduces prostate volume 25–30% over 24 months. Superior to finasteride in large prostate (>30mL) patients." },
      ]},
    ],
    researchProtocols: [
      { goal: "AGA (off-label)", dose: "0.5mg", frequency: "Once daily", route: "Oral" },
      { goal: "BPH", dose: "0.5mg", frequency: "Once daily", route: "Oral" },
      { goal: "AGA — Intermittent (side effect management)", dose: "0.5mg", frequency: "3x/week", route: "Oral" },
    ],
    interactions: [
      { name: "CYP3A4 inhibitors (ketoconazole, ritonavir)", status: "caution" },
      { name: "Verapamil/Diltiazem", status: "caution" },
      { name: "Alpha-blockers (for BPH)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Similar side effect profile to finasteride", description: "Sexual side effects confirm androgen pathway activity. Monitor for persistence beyond stopping." },
      { type: "warn", title: "6-month blood donation restriction", description: "Dutasteride's long half-life means blood donation is contraindicated for 6 months after last dose." },
    ],
    expectTimeline: [
      { timeframe: "Month 1–3", description: "DHT suppression established (~95% serum reduction within 2 weeks)." },
      { timeframe: "Month 3–6", description: "Hair loss stabilisation and earliest regrowth signs." },
      { timeframe: "Month 6–12", description: "Measurable improvement in vertex density. Full assessment at 12 months." },
    ],
    sideEffectNotes: [
      "Sexual side effects — slightly higher incidence than finasteride (~5–8%); persist longer if they occur due to long half-life",
      "Gynaecomastia — rare but possible",
      "Long-acting nature — effects persist weeks after stopping; side effects also persist longer",
    ],
    references: [
      { title: "Gubelin Harcha W et al. — JAAD (2014)", context: "Human | 0.5mg vs 1mg finasteride | 24 weeks | N=917", description: "Head-to-head AGA trial: dutasteride significantly superior in hair count at vertex.", url: "https://pubmed.ncbi.nlm.nih.gov/24411083/" },
    ],
    faq: [
      { question: "Is dutasteride better than finasteride for hair loss?", answer: "Head-to-head studies suggest dutasteride produces greater hair count at the vertex. However, it has a much longer half-life (5 weeks), meaning if side effects occur, they persist much longer after stopping. Many start with finasteride and switch to dutasteride only if response is inadequate." },
    
      { question: "Why is dutasteride not FDA-approved for hair loss?", answer: "Dutasteride lacks FDA approval for androgenetic alopecia despite evidence it is more effective than finasteride. The FDA required additional safety data (particularly reproductive toxicity, longer-term trial data) that the manufacturer has not provided. It is approved for AGA in South Korea, Japan, and some other countries." },
      { question: "How long does it take dutasteride to clear from the body?", answer: "Dutasteride has an extremely long half-life of approximately 5 weeks, so it takes 6+ months to fully clear after stopping. This is important for men planning fatherhood — discontinue at least 6 months before conception attempts, as dutasteride is detected in semen." },
      { question: "Can dutasteride be used in women for hair loss?", answer: "Dutasteride is used off-label in post-menopausal women for female pattern hair loss (FPHL) at 0.5mg/day. It is contraindicated in pre-menopausal women due to teratogenicity (feminisation of male fetus). Some small trials show superiority to spironolactone in post-menopausal FPHL." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Approved for BPH only. Off-label for AGA." },
      { region: "Korea", agency: "MFDS", status: "Approved", notes: "Approved specifically for AGA at 0.5mg." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. Available for BPH; off-label for AGA." },
    ],
    indianBrands: [
      { brand: "Dutas 0.5", manufacturer: "Dr Reddy's" },
      { brand: "Dutaheal 0.5", manufacturer: "Healing Pharma" },
      { brand: "Dutanol 0.5" },
      { brand: "Dutsat 0.5" },
      { brand: "Veltride 0.5" },
    ],
    ukBrands: [
      { brand: "Avodart", manufacturer: "GSK / Haleon", notes: "0.5mg soft capsules; licensed for BPH" },
      { brand: "Dutasteride (generic)", manufacturer: "Various", notes: "Available on prescription" },
    ],
    usBrands: [
      { brand: "Avodart", manufacturer: "GSK", notes: "0.5mg; licensed for BPH; off-label for AGA" },
      { brand: "Jalyn", manufacturer: "GSK", notes: "0.5mg dutasteride + 0.4mg tamsulosin combination" },
      { brand: "Dutasteride (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Avodart", manufacturer: "GSK", notes: "0.5mg soft capsules" },
      { brand: "Dutasteride (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Minoxidil (Topical)",
    slug: "minoxidil-topical",
    abbreviation: "MIN-T",
    aliases: ["minoxidil topical", "mintop", "rogaine", "regaine", "tugain"],
    category: "dermatology",
    tagline: "Topical potassium channel opener — androgenetic alopecia & scalp conditions",
    description: "Topical minoxidil is a vasodilatory solution or foam applied directly to the scalp to treat androgenetic alopecia (AGA). It was the first FDA-approved topical treatment for both male and female pattern hair loss and remains the gold-standard first-line topical therapy.",
    color: "#0D9488",
    vial: "Topical solution / topical foam",
    recon: "2% or 5% solution; 5% foam",
    startDose: "5% solution or foam — 1ml applied to scalp",
    targetDose: "5% solution or foam — 1ml twice daily",
    frequency: "Twice daily (morning and evening)",
    route: "Topical (scalp)",
    storage: "Room temperature, away from heat",
    benefits: "Approved OTC for male and female AGA. Prolongs anagen phase and increases perifollicular blood supply. 5% superior to 2% in men. Foam formulation avoids propylene glycol irritation. No systemic blood pressure effects at standard topical doses.",
    tips: "Apply to dry scalp — not to wet hair — with dropper or foam. Section hair and apply directly to skin. Wash hands after application. Allow to dry before lying down or wearing a hat. Combine with finasteride for superior results in male AGA.",
    sideEffects: "Scalp irritation, contact dermatitis (common with propylene glycol in solution — switch to foam), initial shedding (weeks 1–4 is normal), hypertrichosis at application sites.",
    watchOut: "Do not apply to inflamed, sunburnt, or broken skin. Avoid contact with eyes and mucous membranes. Minimal systemic absorption at standard doses, but caution in patients with known cardiovascular disease.",
    researchLevel: "Extensively Studied",
    tags: ["Dermatology", "Hair Loss", "AGA", "Topical"],
    typicalDose: "5% solution or foam — 1ml twice daily",
    cycle: "Continuous (indefinite)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Topical minoxidil was developed after oral minoxidil (an antihypertensive) was observed to cause hypertrichosis as a side effect. Topical formulations (Rogaine, Regaine, Mintop) apply this effect locally to the scalp. It is now the primary over-the-counter treatment for androgenetic alopecia in men and women worldwide.",
      keyBenefits: "The only topical hair loss treatment approved for both men and women by the FDA. Well-established efficacy over 40 years of use. Available as a low-cost generic (Mintop, Tugain in India). Synergistic when combined with finasteride — combination produces superior hair count results.",
      mechanismOfAction: "Opens ATP-sensitive potassium channels in vascular smooth muscle cells, causing vasodilation. Increases perifollicular blood supply and oxygen delivery. Stimulates follicular keratinocyte proliferation and directly prolongs the anagen (growth) phase, possibly via prostaglandin E2 and Wnt signalling pathways.",
    },
    pharmacokinetics: { peak: "~1h (minimal systemic)", halfLife: "~4h (systemic trace)", cleared: "~24h" },
    researchIndications: [
      { category: "Androgenetic Alopecia", effectiveness: "Most Effective", items: [
        { title: "Male AGA (Topical 5%)", description: "Landmark 16-week RCT: 5% solution significantly superior to 2% and placebo for non-vellus hair count. Standard of care for topical AGA treatment in men." },
        { title: "Female AGA (Topical 2% and 5%)", description: "2% topical approved for women. 5% foam subsequently approved for women after later trials showing comparable tolerability and superior efficacy." },
        { title: "Combination with Finasteride", description: "Synergistic mechanism: minoxidil (anagen prolongation / vasodilation) + finasteride (DHT reduction). Studies show combination superior to monotherapy." },
      ]},
      { category: "Other Alopecia", effectiveness: "Moderate", items: [
        { title: "Alopecia Areata (off-label)", description: "Some evidence of efficacy in alopecia areata as adjunct to corticosteroids, particularly in chronic or resistant cases." },
      ]},
    ],
    researchProtocols: [
      { goal: "Male AGA — Standard", dose: "5% solution or foam", frequency: "Twice daily (1ml)", route: "Topical (scalp)" },
      { goal: "Female AGA — Standard", dose: "2% or 5% solution / 5% foam", frequency: "Twice daily (1ml)", route: "Topical (scalp)" },
      { goal: "Sensitive scalp — Foam preferred", dose: "5% foam", frequency: "Twice daily", route: "Topical (scalp)" },
    ],
    interactions: [
      { name: "Finasteride (synergistic for AGA)", status: "compatible" },
      { name: "Retinoids — may increase absorption", status: "monitor" },
      { name: "Oral antihypertensives (additive if significant absorption)", status: "monitor" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Initial shedding (weeks 1–4)", description: "Telogen effluvium in weeks 1–4 indicates follicular cycle activation — this is expected and suggests genuine product activity." },
      { type: "warn", title: "Scalp irritation — consider foam formulation", description: "Propylene glycol in solution formulations commonly causes irritation. Switch to foam (propylene glycol-free) if this occurs." },
    ],
    expectTimeline: [
      { timeframe: "Week 2–4", description: "Initial shedding (telogen effluvium) — expected, indicates product is working." },
      { timeframe: "Month 2–3", description: "Shedding normalises. New anagen hairs emerging — may be fine/vellus initially." },
      { timeframe: "Month 4–6", description: "Visible improvement in density. Terminal hair growth at thinning areas." },
      { timeframe: "Month 12+", description: "Sustained improvement. Effects plateau and reverse if discontinued." },
    ],
    sideEffectNotes: [
      "Initial shedding (weeks 1–4) — telogen hairs exiting as anagen phase extends; not a sign of worsening",
      "Scalp irritation / contact dermatitis — common with propylene glycol vehicle in solution; switch to foam",
      "Hypertrichosis at application sites — unwanted hair growth at edges of treatment area",
      "Minimal systemic absorption at standard doses — cardiovascular effects rare",
    ],
    references: [
      { title: "Olsen EA et al. — J Am Acad Dermatol (2002)", context: "RCT | 5% vs 2% topical | Male AGA", description: "Pivotal 12-month trial demonstrating superiority of 5% minoxidil solution over 2% in men with AGA for hair regrowth.", url: "https://pubmed.ncbi.nlm.nih.gov/11807738/" },
    ],
    faq: [
      { question: "Do I need a prescription for topical minoxidil?", answer: "No — topical minoxidil 2% and 5% are available over-the-counter in most countries including the USA and India. It is one of only two FDA-approved OTC treatments for hair loss (alongside ketoconazole shampoo for some indications)." },
      { question: "What happens if I stop using topical minoxidil?", answer: "Hair regrowth reverts within 3–6 months of discontinuation. Minoxidil does not cure AGA — it suppresses the progression and stimulates growth. Continuous use is required to maintain results." },
    
      { question: "Will hair shed after starting topical minoxidil?", answer: "A telogen effluvium (increased shedding) is common in the first 2–8 weeks of minoxidil use. This occurs because minoxidil pushes hairs in the telogen (resting) phase into the anagen (growth) phase, causing old hairs to shed before new ones emerge. This is a positive sign that the treatment is working." },
      { question: "Can I apply topical minoxidil to a wet scalp?", answer: "Minoxidil should be applied to a dry scalp. Wet or damp scalp dilutes the solution and reduces penetration. Wait at least 2 hours after washing before applying, or apply to a dry scalp and wait 2–4 hours before washing again." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (OTC)", notes: "2% and 5% topical solutions and 5% foam approved OTC for male and female AGA." },
      { region: "India", agency: "CDSCO", status: "Approved (OTC)", notes: "Topical 2% and 5% widely available OTC as Mintop, Tugain, Regaine." },
    ],
    indianBrands: [
      { brand: "Mintop 2% Solution 60ML", manufacturer: "Dr Reddy's" },
      { brand: "Mintop 5% Solution 60ML", manufacturer: "Dr Reddy's" },
      { brand: "Mintop Forte 10% Solution", manufacturer: "Dr Reddy's" },
      { brand: "Regaine 5% Solution 60ML", manufacturer: "Johnson & Johnson" },
      { brand: "Morr-F 5% Solution 60ML", notes: "Combination topical" },
      { brand: "Tugain 5% Solution 60ML", manufacturer: "Cipla" },
      { brand: "Tugain Foam 5%", manufacturer: "Cipla", notes: "Propylene glycol-free foam" },
    ],
    ukBrands: [
      { brand: "Regaine for Men", manufacturer: "Kenvue (J&J)", notes: "5% solution and foam; OTC for AGA" },
      { brand: "Regaine for Women", manufacturer: "Kenvue (J&J)", notes: "2% solution; OTC" },
      { brand: "Minoxidil (generic)", manufacturer: "Various", notes: "Various OTC and Rx formulations" },
    ],
    usBrands: [
      { brand: "Rogaine", manufacturer: "Kenvue (J&J)", notes: "2% and 5% solution; 5% foam; OTC" },
      { brand: "Minoxidil (generic)", manufacturer: "Various", notes: "Widely available OTC" },
      { brand: "Womens Rogaine", manufacturer: "Kenvue", notes: "2% and 5% foam for women" },
    ],
    canadaBrands: [
      { brand: "Rogaine", manufacturer: "Kenvue (J&J)", notes: "OTC; 5% for men, 2% for women" },
      { brand: "Minoxidil (generic)", manufacturer: "Various", notes: "OTC generics available" },
    ],
  },

  {
    name: "Minoxidil (Oral / LDOM)",
    slug: "minoxidil-oral",
    abbreviation: "LDOM",
    aliases: ["oral minoxidil", "ldom", "low dose oral minoxidil", "lonitab", "helpecia"],
    category: "hair-loss",
    tagline: "Low-dose oral minoxidil — systemic AGA treatment with superior convenience",
    description: "Low-dose oral minoxidil (LDOM) has emerged as a systemic alternative to topical minoxidil for androgenetic alopecia (AGA). Doses of 0.25–5mg daily show comparable or superior efficacy to topical 5%, with no scalp application required, at the cost of systemic side effects including fluid retention and hypertrichosis.",
    color: "#14B8A6",
    vial: "Oral tablet",
    recon: "0.25mg, 0.5mg, 1mg, 2.5mg, 5mg tablets",
    startDose: "0.5mg once daily (men); 0.25mg once daily (women)",
    targetDose: "2.5mg once daily (men); 0.5–1mg once daily (women)",
    frequency: "Once daily (same time each day)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "No scalp application — high compliance advantage. Effective for male and female AGA and alopecia areata. Whole-scalp coverage without patchy application. Growing RCT evidence showing comparable or superior efficacy to topical 5%. Synergistic with finasteride.",
    tips: "Start at 0.5mg in men and titrate after 4–8 weeks based on response and tolerance. Women should start at 0.25mg. Take at the same time each day. Monitor for periorbital oedema, especially on waking. Combine with finasteride for best male AGA outcomes.",
    sideEffects: "Periorbital oedema (fluid around eyes on waking — dose-dependent), hypertrichosis (unwanted body/facial hair), fluid retention / ankle oedema, tachycardia, headache.",
    watchOut: "Avoid in significant cardiovascular disease, hypotension, pericardial effusion history, or heart failure. Fluid retention can worsen pre-existing cardiac conditions. Monitor blood pressure on doses ≥2.5mg. Use with caution in women due to hypertrichosis risk.",
    researchLevel: "Well Researched",
    tags: ["Hair Loss", "AGA", "Oral", "LDOM", "Systemic"],
    typicalDose: "2.5mg once daily (men); 0.5–1mg once daily (women)",
    cycle: "Continuous (indefinite)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Low-dose oral minoxidil (LDOM) repurposes the original antihypertensive tablet at hair-growth doses (0.25–5mg, well below the 10–40mg cardiovascular dose). LDOM emerged in the 2010s as dermatologists sought systemic alternatives to topical minoxidil for patients with scalp sensitivity, compliance issues, or who required whole-scalp coverage.",
      keyBenefits: "LDOM removes the inconvenience of daily scalp application. Meta-analyses show it effective in male AGA, female AGA, and alopecia areata. Comparable or superior to topical 5% in several RCTs. Growing popularity as a first-line systemic option. Synergistic with finasteride.",
      mechanismOfAction: "Same mechanism as topical: opens ATP-sensitive potassium channels → vasodilation → increased perifollicular blood flow → prolonged anagen phase. Unlike topical, systemic distribution provides whole-body and whole-scalp coverage, explaining both superior efficacy and systemic side effects (periorbital oedema, hypertrichosis).",
    },
    pharmacokinetics: { peak: "1h", halfLife: "4.2h", cleared: "~24h" },
    researchIndications: [
      { category: "Androgenetic Alopecia", effectiveness: "Most Effective", items: [
        { title: "Male AGA — LDOM", description: "RCTs and real-world data: 2.5mg oral minoxidil effective and well-tolerated for male AGA. Some data showing superior hair count vs topical 5%." },
        { title: "Female AGA — LDOM", description: "0.25–1mg oral minoxidil effective for female pattern hair loss. Lower doses reduce hypertrichosis risk." },
      ]},
      { category: "Other Alopecia", effectiveness: "Moderate", items: [
        { title: "Alopecia Areata (off-label)", description: "Meta-analysis (Gupta AK, 2022): oral minoxidil effective for alopecia areata and telogen effluvium as well as AGA." },
        { title: "Telogen Effluvium (off-label)", description: "LDOM may accelerate recovery from telogen effluvium by promoting anagen re-entry." },
      ]},
    ],
    researchProtocols: [
      { goal: "Male AGA — conservative start", dose: "0.5mg", frequency: "Once daily", route: "Oral" },
      { goal: "Male AGA — standard dose", dose: "2.5mg", frequency: "Once daily", route: "Oral" },
      { goal: "Female AGA — start", dose: "0.25mg", frequency: "Once daily", route: "Oral" },
      { goal: "Female AGA — maintenance", dose: "0.5–1mg", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Antihypertensives — additive BP lowering", status: "monitor" },
      { name: "Guanethidine", status: "avoid" },
      { name: "Finasteride (synergistic for AGA)", status: "compatible" },
      { name: "Diuretics (may offset fluid retention)", status: "monitor" },
    ],
    qualityIndicators: [
      { type: "warn", title: "Monitor BP and fluid retention", description: "Check BP periodically on doses ≥2.5mg. Monitor for ankle oedema or periorbital puffiness, particularly in mornings." },
      { type: "warn", title: "Hypertrichosis risk — especially in women", description: "Unwanted body/facial hair growth is dose-dependent. Women should use minimum effective dose (0.25–1mg) to reduce this side effect." },
    ],
    expectTimeline: [
      { timeframe: "Week 2–4", description: "Initial shedding possible (telogen effluvium) — expected and transient." },
      { timeframe: "Month 2–3", description: "Shedding normalises. New anagen hairs emerging." },
      { timeframe: "Month 4–6", description: "Visible improvement in density. Superior whole-scalp coverage vs topical." },
      { timeframe: "Month 12+", description: "Sustained improvement with continued use. Regrowth reverses on discontinuation." },
    ],
    sideEffectNotes: [
      "Periorbital oedema — fluid accumulation around eyes, especially on waking; most common systemic side effect; dose-dependent",
      "Hypertrichosis — unwanted body/facial hair growth; particularly in women; lower doses (≤1mg) reduce risk",
      "Fluid retention / ankle oedema — may occur, especially at doses ≥2.5mg",
      "Tachycardia / palpitations — possible at onset; usually transient; monitor HR",
      "Headache — reported in early weeks; usually resolves",
    ],
    references: [
      { title: "Gupta AK et al. — Int J Dermatol (2022)", context: "Meta-analysis | LDOM | N=1,400+", description: "Systematic review of oral minoxidil for hair loss: effective in AGA, alopecia areata, and female pattern hair loss at doses 0.25–5mg.", url: "https://pubmed.ncbi.nlm.nih.gov/34159615/" },
      { title: "Ramos PM et al. — JAAD (2020)", context: "RCT | Oral vs Topical Minoxidil | Male AGA", description: "Non-inferiority RCT: oral minoxidil 5mg comparable to topical 5% for male AGA at 24 weeks.", url: "https://pubmed.ncbi.nlm.nih.gov/32305401/" },
    ],
    faq: [
      { question: "Is oral minoxidil better than topical?", answer: "Recent studies show oral LDOM (0.5–2.5mg) is at least as effective as topical 5%, with superior compliance — no scalp application needed. Oral minoxidil has systemic side effects (fluid retention, hypertrichosis) while topical is more localised. Many prefer oral for convenience once risks are understood." },
      { question: "What dose should I start at?", answer: "Men: start at 0.5mg once daily and titrate to 2.5mg after 4–8 weeks based on response and tolerance. Women: start at 0.25mg to minimise hypertrichosis risk, increasing to 0.5–1mg if tolerated. Do not use high doses (≥5mg) for hair loss — these are cardiovascular doses with significant risk." },
    
      { question: "How does low-dose oral minoxidil compare to topical minoxidil for hair loss?", answer: "Studies show oral minoxidil 2.5mg/day produces superior hair count and density improvement versus topical 5% twice daily, with better adherence. However, oral carries higher systemic side effect risk (hypertrichosis on body hair, fluid retention, tachycardia) while topical remains localised." },
      { question: "Is fluid retention a concern with low-dose oral minoxidil?", answer: "At doses used for hair loss (0.625–2.5mg/day), clinically significant fluid retention is uncommon in healthy young adults. However, patients with cardiac conditions, renal impairment, or on antihypertensives should be monitored. Baseline and periodic blood pressure checks are recommended." },
      { question: "Can women use low-dose oral minoxidil for hair loss?", answer: "Yes — low-dose oral minoxidil (0.625mg–1.25mg/day) has proven effective and is commonly used off-label in women for FPHL and diffuse hair loss. Studies show significant improvement in hair density with low side effect rates at these doses. Women require lower doses than men to achieve results." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Oral tablets (2.5mg, 10mg) approved for hypertension. AGA use is off-label but widely practised." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Oral minoxidil tablets available as Schedule H medicine (Lonitab, Helpecia). Widely accessible." },
    ],
    indianBrands: [
      { brand: "Lonitab 2.5", manufacturer: "Sun Pharma" },
      { brand: "Lonitab 5", manufacturer: "Sun Pharma", notes: "Commonly halved for LDOM 2.5mg dose" },
      { brand: "Helpecia 5", notes: "Oral minoxidil for hair loss" },
      { brand: "Loniten 2.5", notes: "Original brand" },
    ],
    ukBrands: [
      { brand: "Loniten", manufacturer: "Pfizer", notes: "2.5mg, 10mg tablets; licensed for severe hypertension (off-label for AGA)" },
      { brand: "Minoxidil (compounded)", manufacturer: "Specialist compounders", notes: "Low-dose formulations available via specialist dermatologists" },
    ],
    usBrands: [
      { brand: "Loniten", manufacturer: "Pfizer", notes: "2.5mg, 10mg; licensed for hypertension; off-label for AGA" },
      { brand: "Minoxidil (generic)", manufacturer: "Various", notes: "2.5mg, 10mg tablets widely available" },
    ],
    canadaBrands: [
      { brand: "Loniten", manufacturer: "Pfizer Canada", notes: "2.5mg, 10mg; licensed for resistant hypertension" },
      { brand: "Minoxidil (generic)", manufacturer: "Various", notes: "Generic tablets available on Rx" },
    ],
  },

  // ─── HORMONAL / MEN'S HEALTH ──────────────────────────────────────────────

  {
    name: "Human Chorionic Gonadotropin (HCG)",
    slug: "hcg",
    abbreviation: "HCG",
    aliases: ["hcg", "human chorionic gonadotropin", "hucog", "sifasi", "fertigyn"],
    category: "hormonal",
    tagline: "LH mimic — testicular function, fertility & testosterone production",
    description: "Human Chorionic Gonadotropin (HCG) is a glycoprotein hormone with identical biological activity to luteinising hormone (LH). It stimulates Leydig cells in the testes to produce testosterone and maintains testicular size and function during or after testosterone/steroid use.",
    color: "#1B3A7A",
    vial: "Powder for injection (lyophilised)",
    recon: "Reconstitute with bacteriostatic water. 5,000 IU vials common.",
    startDose: "250–500 IU",
    targetDose: "500–1000 IU",
    frequency: "2–3x per week (concurrent TRT) or EOD during PCT",
    route: "Subcutaneous or intramuscular injection",
    storage: "Refrigerated unreconstituted; use within 30 days after reconstitution",
    benefits: "Maintains intratesticular testosterone and spermatogenesis during exogenous testosterone use. Prevents testicular atrophy. Effective fertility treatment in hypogonadotropic hypogonadism. Used in PCT to restart HPTA.",
    tips: "Reconstitute with bacteriostatic water. Subcutaneous injection is preferred (less painful, equally effective). Monitor estradiol — HCG stimulates aromatase activity. Use an AI if oestrogen rises. Do not use for prolonged periods without monitoring.",
    sideEffects: "Acne (from elevated testosterone), gynecomastia (from increased aromatisation), mood changes, fluid retention. Rare: ovarian hyperstimulation syndrome in women.",
    watchOut: "HCG stimulates aromatase — monitor estradiol, especially if already on testosterone. Prolonged use can downregulate LH receptors. Contraindicated in androgen-sensitive cancers. Inject with proper aseptic technique.",
    researchLevel: "Well Researched",
    tags: ["Hormonal", "Fertility", "TRT Support", "PCT"],
    typicalDose: "500 IU 3x/week",
    cycle: "During TRT or 4–6 weeks for PCT",
    storageShort: "Refrigerated after reconstitution",
    overview: {
      whatIsIt: "HCG is a hormone naturally produced by syncytiotrophoblasts of the placenta during pregnancy. Pharmaceutically, it is extracted from the urine of pregnant women or produced via recombinant technology. In men, it mimics LH activity, stimulating Leydig cell testosterone production and maintaining the spermatogenic microenvironment.",
      keyBenefits: "Prevents testicular atrophy during TRT. Maintains fertility potential in men on testosterone. Effective treatment for hypogonadotropic hypogonadism when fertility is desired. Used in PCT protocols to restart endogenous testosterone production. Well-established safety profile.",
      mechanismOfAction: "Shares the beta subunit of LH and binds LH/CG receptors on Leydig cells in the testes. Activates adenylyl cyclase, increasing cAMP and stimulating testosterone synthesis from cholesterol. Also supports Sertoli cells (via FSH-mimicking activity) to maintain spermatogenesis.",
    },
    pharmacokinetics: { peak: "6h (IM)", halfLife: "32h (beta-HCG)", cleared: "~3–4 days" },
    researchIndications: [
      { category: "Hypogonadism / Fertility", effectiveness: "Most Effective", items: [
        { title: "Hypogonadotropic Hypogonadism", description: "HCG (with or without FSH) successfully induces spermatogenesis in >70% of men with HH. First-line treatment when fertility is desired." },
        { title: "TRT-associated azoospermia prevention", description: "250–500 IU 2–3x/week maintains intratesticular testosterone and sperm production in men on exogenous testosterone who wish to preserve fertility." },
      ]},
      { category: "Post Cycle Therapy", effectiveness: "Effective", items: [
        { title: "HPTA Recovery", description: "500–1000 IU EOD for 2–3 weeks as part of PCT restores intratesticular testosterone, speeding LH receptor resensitisation before SERM therapy." },
      ]},
    ],
    researchProtocols: [
      { goal: "TRT Maintenance (fertility preservation)", dose: "250–500 IU", frequency: "2–3x per week", route: "Subcutaneous injection" },
      { goal: "PCT — Phase 1", dose: "500–1000 IU", frequency: "Every other day for 2–3 weeks", route: "Subcutaneous or intramuscular" },
      { goal: "HH Fertility Induction", dose: "1000–2000 IU", frequency: "3x per week (with FSH)", route: "Subcutaneous or intramuscular" },
    ],
    interactions: [
      { name: "Exogenous testosterone", status: "compatible" },
      { name: "Aromatase inhibitors (anastrozole, exemestane)", status: "compatible" },
      { name: "SERMs (clomiphene, tamoxifen)", status: "compatible" },
      { name: "GnRH agonists", status: "avoid" },
    ],
    qualityIndicators: [
      { type: "pass", title: "White lyophilised powder", description: "Pharmaceutical-grade HCG appears as a white powder. Reconstituted solution should be clear and colourless." },
      { type: "pass", title: "Testicular sensation/warmth", description: "Some users report increased testicular warmth and ache within 24–48h — consistent with Leydig cell stimulation and known clinical effects." },
      { type: "warn", title: "Aromatase stimulation", description: "HCG stimulates aromatase in Leydig cells — monitor oestradiol levels, especially in gynecomastia-prone individuals." },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "LH receptor activation in Leydig cells. Testosterone synthesis begins increasing." },
      { timeframe: "1 week", description: "Measurable increase in intratesticular testosterone. Testicular size stabilisation." },
      { timeframe: "2–4 weeks", description: "Maintained LH stimulation. Spermatogenesis preservation or recovery." },
    ],
    sideEffectNotes: [
      "Oestradiol elevation — Leydig cells aromatise testosterone; monitor and use AI if needed",
      "Acne and oily skin — elevated testosterone from HCG stimulation",
      "Testicular ache — mild, typically transient",
      "Gynecomastia — if oestradiol is not managed",
      "LH receptor downregulation — avoid high doses (>1000 IU/dose) for prolonged periods",
    ],
    references: [
      { title: "Coviello AD et al. — JCEM (2005)", context: "Human | 125–500 IU 3x/week | 3 weeks", description: "HCG maintains intratesticular testosterone during exogenous testosterone-induced suppression. Established rationale for HCG co-administration with TRT.", url: "https://pubmed.ncbi.nlm.nih.gov/15827108/" },
    ],
    faq: [
      { question: "Does HCG work as a PCT drug on its own?", answer: "HCG restores intratesticular testosterone and prepares the testes but does not restart the hypothalamic-pituitary axis. It should typically be followed by SERM therapy (clomiphene or tamoxifen) to allow the HPG axis to fully recover and restore endogenous LH/FSH secretion." },
    
      { question: "How is HCG injected for fertility or TRT?", answer: "HCG is administered subcutaneously or intramuscularly. Subcutaneous injection (abdomen, thigh) is preferred for self-administration due to ease and equivalent bioavailability. Typical fertility doses: 5,000–10,000 IU as a single trigger shot. TRT-adjunct doses: 500–1,000 IU twice weekly." },
      { question: "How long does HCG take to boost testosterone?", answer: "LH-receptor stimulation by HCG produces measurable testosterone increases within 24–72 hours. Full testicular volume recovery and sperm production improvement with HCG during testosterone therapy typically requires 3–6 months of consistent use." },
      { question: "Does HCG prevent testicular atrophy on testosterone therapy?", answer: "Yes — HCG maintains intratesticular testosterone by directly stimulating Leydig cells via LH receptors, counteracting the LH suppression caused by exogenous testosterone. This preserves both testicular volume and endogenous function, supporting fertility preservation during testosterone therapy." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Approved for hypogonadism and cryptorchidism. Off-label for TRT support and PCT." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. Available as powder for injection." },
    ],
    indianBrands: [
      { brand: "Hucog 5000 IU HP Inj", manufacturer: "Bharat Serums & Vaccines" },
      { brand: "Sifasi 10000 IU Inj", manufacturer: "Serum Institute of India" },
      { brand: "Fertigyn 5000 IU Inj", manufacturer: "Sun Pharma" },
      { brand: "Menodac 150 IU", notes: "HMG (FSH+LH combination)" },
    ],
    ukBrands: [
      { brand: "Pregnyl", manufacturer: "Organon", notes: "1,500 IU, 5,000 IU, 10,000 IU; POM" },
      { brand: "Choragon", manufacturer: "Ferring", notes: "5,000 IU injection" },
    ],
    usBrands: [
      { brand: "Pregnyl", manufacturer: "Organon", notes: "10,000 USP units; Rx only" },
      { brand: "Novarel", manufacturer: "Ferring", notes: "10,000 IU single-dose vial" },
      { brand: "Ovidrel", manufacturer: "Merck Serono", notes: "250mcg (prefilled); r-hCG recombinant form" },
    ],
    canadaBrands: [
      { brand: "Pregnyl", manufacturer: "Organon", notes: "5,000 IU; licensed for hypogonadism and fertility" },
      { brand: "Profasi", manufacturer: "Merck", notes: "2,000 IU, 10,000 IU" },
    ],
  },

  {
    name: "Clomiphene",
    slug: "clomiphene",
    abbreviation: "CLO",
    aliases: ["clomiphene citrate", "clomid", "clomisign", "fertogard"],
    category: "hormonal",
    tagline: "SERM — testosterone restoration, fertility & PCT",
    description: "Clomiphene citrate is a selective estrogen receptor modulator (SERM) that blocks hypothalamic oestrogen receptors, increasing GnRH pulsatility and stimulating LH/FSH secretion. Used for male hypogonadism, fertility, and post-cycle testosterone recovery.",
    color: "#1E40AF",
    vial: "Oral tablet",
    recon: "25mg, 50mg",
    startDose: "12.5–25mg",
    targetDose: "25–50mg daily or every other day",
    frequency: "Daily or every other day",
    route: "Oral",
    storage: "Room temperature, away from moisture",
    benefits: "Raises LH, FSH, and testosterone without suppressing spermatogenesis. Natural testosterone restoration alternative to TRT. Used for PCT after AAS cycles to restart HPTA. Elevates testosterone 100–150% above baseline in hypogonadal men.",
    tips: "Start at 25mg EOD to assess response. Enclomiphene (the trans-isomer) is preferred over racemic clomiphene in some contexts for fewer oestrogen-related side effects. Monitor oestradiol — both testosterone AND oestrogen rise.",
    sideEffects: "Visual disturbances (blurred vision, floaters) — stop immediately. Mood disturbances (the cis-isomer zuclomiphene has oestrogenic activity — can cause emotional lability in men). Elevated oestradiol, potential gynecomastia.",
    watchOut: "Vision changes are a serious adverse effect — stop immediately and consult an ophthalmologist. Long-term use may lead to cataract formation. Not for use in liver disease. Monitor LH, FSH, testosterone, and oestradiol regularly.",
    researchLevel: "Well Researched",
    tags: ["Hormonal", "PCT", "Fertility", "SERM"],
    typicalDose: "25mg EOD",
    cycle: "4–6 weeks PCT or long-term (3–6 months hypogonadism)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Clomiphene citrate (Clomid) is a mixture of two geometric isomers: enclomiphene (trans, majority of clinical activity) and zuclomiphene (cis, with oestrogenic effects). Originally developed for female infertility, it is used off-label in men for secondary hypogonadism and PCT. Indian generics are widely available.",
      keyBenefits: "Unlike TRT, clomiphene maintains and stimulates spermatogenesis. Oral and non-invasive. Effective at restoring testosterone 100–150% above baseline in hypogonadal men. Useful PCT bridge after AAS cessation to support HPTA recovery.",
      mechanismOfAction: "Competitively antagonises oestrogen receptors in the hypothalamus. Reduced negative feedback from oestrogen increases GnRH pulse frequency, driving LH and FSH secretion. Elevated LH stimulates Leydig cell testosterone production; FSH supports spermatogenesis.",
    },
    pharmacokinetics: { peak: "6h", halfLife: "Enclomiphene: 10h; Zuclomiphene: weeks (accumulates)", cleared: "~3–6 weeks" },
    researchIndications: [
      { category: "Male Hypogonadism", effectiveness: "Effective", items: [
        { title: "Secondary Hypogonadism", description: "Multiple studies demonstrate 100–150% increase in serum testosterone from baseline in men with secondary hypogonadism. Maintains fertility, unlike TRT." },
      ]},
      { category: "Post Cycle Therapy", effectiveness: "Effective", items: [
        { title: "HPTA Recovery", description: "Standard PCT agent: 50mg/day for 2 weeks then 25mg/day for 2 weeks accelerates LH/FSH recovery after AAS cessation." },
      ]},
    ],
    researchProtocols: [
      { goal: "Hypogonadism (long-term)", dose: "25mg", frequency: "Every other day", route: "Oral" },
      { goal: "PCT — Week 1–2", dose: "50mg", frequency: "Daily", route: "Oral" },
      { goal: "PCT — Week 3–4", dose: "25mg", frequency: "Daily", route: "Oral" },
    ],
    interactions: [
      { name: "Oestrogen supplements", status: "avoid" },
      { name: "Anastrozole (combined for oestrogen management)", status: "compatible" },
      { name: "HCG (pre-SERM PCT phase)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Rising LH, FSH, and testosterone on labs", description: "Confirmed by bloodwork 2–4 weeks after starting. LH and FSH should increase 2–3x; testosterone should rise significantly." },
      { type: "fail", title: "Visual disturbances — stop immediately", description: "Any visual symptoms (blurring, flashing lights, floaters) require immediate discontinuation and ophthalmological evaluation." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "LH and FSH rising. Testosterone begins to increase." },
      { timeframe: "Week 3–4", description: "Testosterone approaching target. Spermatogenesis resuming." },
      { timeframe: "Week 6–8", description: "Full HPTA recovery assessment. Many men reach testosterone levels comparable to TRT." },
    ],
    sideEffectNotes: [
      "Visual disturbances — stop and seek ophthalmology review",
      "Mood changes — zuclomiphene isomer has oestrogenic activity; emotional lability, especially in long-term use",
      "Oestradiol elevation — testosterone rise increases aromatisation; monitor E2 levels",
      "Hot flushes — anti-oestrogenic effect at hypothalamus",
    ],
    references: [
      { title: "Katz DJ et al. — BJU Int (2012)", context: "Human | 25mg EOD | Mean 19 months | N=86", description: "Long-term clomiphene use in secondary hypogonadism: sustained testosterone elevation without fertility compromise.", url: "https://pubmed.ncbi.nlm.nih.gov/21702886/" },
    ],
    faq: [
      { question: "What is the difference between clomiphene and enclomiphene?", answer: "Clomiphene is a 62:38 mixture of enclomiphene (trans) and zuclomiphene (cis). Enclomiphene is the active SERM component; zuclomiphene is weakly oestrogenic and accumulates with prolonged use. Enclomiphene alone (available as Androxal) avoids the oestrogen side effects of zuclomiphene." },
    
      { question: "How effective is clomiphene for fertility?", answer: "In anovulatory women with PCOS, clomiphene induces ovulation in approximately 75–80% and achieves pregnancy in 30–40% within 6 cycles. In men with hypogonadotrophic hypogonadism, it raises testosterone by 100–200% and improves sperm parameters in 75–85% of cases." },
      { question: "Can clomiphene be used long-term by men?", answer: "Clomiphene is used off-label in men for periods of 6–24+ months when monitoring confirms ongoing benefit and safety. Unlike exogenous testosterone, it does not suppress spermatogenesis or gonadal function, making it suitable for men wishing to maintain fertility while addressing low testosterone." },
      { question: "What are visual side effects of clomiphene?", answer: "Visual disturbances (blurring, light sensitivity, scotoma) occur in < 2% of users. If any visual symptoms develop, clomiphene should be stopped immediately — persistent visual changes have been reported rarely with prolonged use. Annual eye check is reasonable for long-term users." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Approved for female infertility. Off-label for male hypogonadism and PCT." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Clomisign 50" },
      { brand: "Fertogard 50", manufacturer: "Sun Pharma" },
      { brand: "Clofert 25" },
      { brand: "Clofert 50" },
      { brand: "En Clofert 50", notes: "Enclomiphene — trans isomer" },
    ],
    ukBrands: [
      { brand: "Clomid", manufacturer: "Sanofi", notes: "50mg tablets; licensed for female anovulatory infertility; off-label for male hypogonadism" },
      { brand: "Serophene", manufacturer: "Merck Serono", notes: "50mg tablets" },
    ],
    usBrands: [
      { brand: "Clomid", manufacturer: "Sanofi", notes: "50mg; FDA-approved for anovulatory infertility in women" },
      { brand: "Serophene", manufacturer: "EMD Serono", notes: "50mg tablets" },
      { brand: "Enclomiphene (Androxal)", manufacturer: "Repros Therapeutics", notes: "Trans isomer; under NDA review; compounders available" },
    ],
    canadaBrands: [
      { brand: "Serophene", manufacturer: "EMD Serono", notes: "50mg; licensed for infertility" },
      { brand: "Clomiphene (generic)", manufacturer: "Various", notes: "Generic versions available Rx" },
    ],
  },

  {
    name: "Cabergoline",
    slug: "cabergoline",
    abbreviation: "CAB",
    aliases: ["cabergoline", "dostinex", "cabermax", "dostiheal"],
    category: "hormonal",
    tagline: "Dopamine D2 agonist — prolactin control & hyperprolactinaemia",
    description: "Cabergoline is a long-acting dopamine D2 receptor agonist that powerfully suppresses prolactin secretion. Used for hyperprolactinaemia (prolactinomas) and off-label to manage elevated prolactin associated with AAS/opioid use and to enhance sexual recovery time.",
    color: "#2563EB",
    vial: "Oral tablet",
    recon: "0.25mg, 0.5mg",
    startDose: "0.25mg",
    targetDose: "0.5–1mg twice weekly",
    frequency: "Twice weekly (not daily)",
    route: "Oral",
    storage: "Room temperature, protect from light",
    benefits: "Potently reduces prolactin levels. Long half-life allows twice-weekly dosing. Reduces sexual side effects of elevated prolactin. Treats prolactin-secreting adenomas. Potentially shortens refractory period post-orgasm (dopaminergic effect).",
    tips: "Take with food to reduce nausea. Start at 0.25mg twice weekly and titrate slowly. Monitor prolactin levels and echocardiogram with long-term use (cardiac valve fibrosis risk with high doses). Do not use for prolonged periods without medical oversight.",
    sideEffects: "Nausea (especially initially), dizziness, orthostatic hypotension, fatigue, headache. Rare: cardiac valve fibrosis (Parkinson's doses far exceeding standard use), impulse control disorders.",
    watchOut: "Cardiac valvulopathy at high doses used for Parkinson's disease — at standard hyperprolactinaemia doses, risk is very low but monitor with echocardiogram in long-term use. Contraindicated with dopamine antagonists (haloperidol, metoclopramide).",
    researchLevel: "Extensively Studied",
    tags: ["Hormonal", "Prolactin", "Dopamine"],
    typicalDose: "0.5mg twice weekly",
    cycle: "As needed (typically months)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Cabergoline (Dostinex) is an ergot-derived dopamine D2/D3 receptor agonist developed by Pfizer. Approved for hyperprolactinaemia and prolactin-secreting tumours. Far longer-acting than bromocriptine with superior tolerability. Indian generics Cabermax and Dostiheal are manufactured by domestic pharmaceutical companies.",
      keyBenefits: "Twice-weekly dosing vs bromocriptine's daily/thrice-daily requirements. More effective at normalising prolactin than bromocriptine. Reduces tumour size in prolactinomas. Better tolerated with less nausea.",
      mechanismOfAction: "High-affinity agonist at D2 receptors on pituitary lactotroph cells. Dopamine normally inhibits prolactin secretion via these receptors; cabergoline mimics this inhibitory effect. Sustained receptor activation suppresses PRL secretion for 48–72 hours per dose.",
    },
    pharmacokinetics: { peak: "2–3h", halfLife: "63–68h", cleared: "~2 weeks" },
    researchIndications: [
      { category: "Hyperprolactinaemia", effectiveness: "Most Effective", items: [
        { title: "Idiopathic Hyperprolactinaemia", description: "Normalises prolactin in >80% of patients. Superior to bromocriptine in large comparative trials." },
        { title: "Prolactinoma", description: "Reduces tumour size in 70–80% of micro/macro-prolactinomas. First-line treatment for prolactin-secreting tumours." },
      ]},
    ],
    researchProtocols: [
      { goal: "Hyperprolactinaemia treatment", dose: "0.25mg", frequency: "Twice weekly (Mon/Thu)", route: "Oral" },
      { goal: "Standard dose", dose: "0.5mg", frequency: "Twice weekly", route: "Oral" },
      { goal: "AAS/opioid-related elevated prolactin", dose: "0.25–0.5mg", frequency: "Twice weekly as needed", route: "Oral" },
    ],
    interactions: [
      { name: "Dopamine antagonists (metoclopramide, haloperidol)", status: "avoid" },
      { name: "Antihypertensives", status: "monitor" },
      { name: "Other ergot derivatives", status: "avoid" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Prolactin reduction on labs", description: "Serum prolactin should normalise (males: <25ng/mL) within 4–8 weeks at 0.5mg twice weekly." },
      { type: "warn", title: "Echocardiogram for long-term use", description: "Fibrotic valvulopathy risk exists with high-dose, prolonged use (primarily at doses used for Parkinson's). Baseline and annual echocardiogram recommended for ongoing use >2 years." },
    ],
    expectTimeline: [
      { timeframe: "Week 2–4", description: "Prolactin levels begin to fall." },
      { timeframe: "Month 1–3", description: "Prolactin normalises in most patients. Side effects from elevated PRL (sexual dysfunction, amenorrhoea) resolve." },
    ],
    sideEffectNotes: [
      "Nausea — take with food; usually resolves after 2–3 weeks",
      "Orthostatic hypotension — stand slowly, especially with first doses",
      "Impulse control disorders — rare at standard doses; more common in Parkinson's treatment",
      "Cardiac valvulopathy — very low risk at standard prolactin-suppression doses",
    ],
    references: [
      { title: "Webster J et al. — NEJM (1994)", context: "Human | 0.5–1mg twice weekly | 8 weeks | N=459", description: "Pivotal trial comparing cabergoline vs bromocriptine: superior prolactin normalisation (83% vs 59%) and better tolerability.", url: "https://pubmed.ncbi.nlm.nih.gov/7969281/" },
    ],
    faq: [
      { question: "How often do I need to take cabergoline?", answer: "Cabergoline's long half-life (63–68h) allows twice-weekly dosing. Monday and Thursday is a common schedule. This is a major advantage over bromocriptine which requires daily or thrice-daily dosing." },
    
      { question: "How long does it take cabergoline to lower prolactin?", answer: "Prolactin normalises in 70–80% of patients within 2–4 weeks of starting cabergoline at 0.5mg twice weekly. Tumour shrinkage in prolactinomas begins within months but may take 1–2 years to achieve maximum reduction. Most patients achieve normal prolactin within 3 months." },
      { question: "Can cabergoline cause cardiac valve problems?", answer: "Valvular heart disease has been reported with high-dose cabergoline used in Parkinson's disease (doses of 3–8mg/day for years). At the low doses used for hyperprolactinaemia (typically 0.5–3mg/week), large studies have not shown significant valvular risk. Periodic echocardiography is recommended for long-term users at higher doses." },
      { question: "Can cabergoline be used to enhance sexual function?", answer: "Cabergoline reduces refractory periods in men by normalising dopaminergic activity. Some users report improved orgasm intensity and reduced refractory time at 0.5mg taken 30–60 min before sexual activity. This is off-label use; dose-response is highly individual and side effects (nausea, dizziness) are dose-dependent." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Dostinex approved for hyperprolactinaemia." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Cabermax 0.5", manufacturer: "Sun Pharma" },
      { brand: "Dostiheal 0.5", manufacturer: "Healing Pharma" },
    ],
    ukBrands: [
      { brand: "Dostinex", manufacturer: "Pfizer", notes: "0.5mg tablets; licensed for hyperprolactinaemia and prolactinoma" },
      { brand: "Cabergoline (generic)", manufacturer: "Various", notes: "Available on prescription" },
    ],
    usBrands: [
      { brand: "Dostinex", manufacturer: "Pfizer", notes: "0.5mg; FDA-approved for hyperprolactinaemia" },
      { brand: "Cabergoline (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Dostinex", manufacturer: "Pfizer", notes: "0.5mg tablets; licensed for hyperprolactinaemia" },
      { brand: "Cabergoline (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Anastrozole",
    slug: "anastrozole",
    abbreviation: "ANA",
    aliases: ["anastrozole", "arimidex", "arimee", "ana-ash"],
    category: "hormonal",
    tagline: "Non-steroidal aromatase inhibitor — oestrogen control in men & breast cancer",
    description: "Anastrozole is a potent, selective, reversible aromatase inhibitor that reduces oestrogen synthesis by >80%. Approved for breast cancer; widely used off-label in men to manage oestrogen elevation during testosterone therapy or AAS cycles.",
    color: "#1D4ED8",
    vial: "Oral tablet",
    recon: "1mg",
    startDose: "0.25–0.5mg",
    targetDose: "0.5–1mg",
    frequency: "Every other day to daily (based on bloodwork)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Reduces oestradiol by 80–90% at 1mg daily. Oral once-daily or EOD dosing. Suppresses aromatase reversibly (unlike exemestane). Improves testosterone:oestrogen ratio on TRT. Prevents gynaecomastia and water retention from AAS use.",
    tips: "Dose based on oestradiol bloodwork — do not overdose. Over-suppressing oestrogen causes joint pain, low libido, mood disturbance, and bone loss. Target E2 20–30 pg/mL for most men on TRT. EOD dosing common on cruise protocols.",
    sideEffects: "Joint aches, stiffness, bone density reduction (with excessive use), low libido, mood depression — all signs of over-suppression. Headache. Elevated cholesterol (oestrogen has cardioprotective effects).",
    watchOut: "Over-suppression is the primary danger — keep oestradiol in physiological male range (not too low). Bone density loss with long-term low oestrogen. Cholesterol worsening. Contraindicated in premenopausal women unless for breast cancer.",
    researchLevel: "Extensively Studied",
    tags: ["Hormonal", "AI", "Oestrogen Control", "TRT Support"],
    typicalDose: "0.5mg EOD",
    cycle: "Concurrent with testosterone/AAS",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Anastrozole (Arimidex) was developed by AstraZeneca and approved for breast cancer. In men, it is used off-label to manage aromatisation (conversion of testosterone to oestradiol) during TRT or AAS use. Indian generics including Arimee and Ana-Ash are widely used in the performance community.",
      keyBenefits: "Potent and reversible aromatase inhibition allows flexible dose titration. Predictable pharmacokinetics. Well-studied safety profile from oncology use. Restores testosterone:oestrogen ratio when oestrogen rises with exogenous testosterone.",
      mechanismOfAction: "Non-steroidal triazole derivative that competitively inhibits aromatase (CYP19A1), the enzyme responsible for peripheral conversion of androgens (testosterone, androstenedione) to oestrogens. Reduces oestradiol (E2) by >80% within 24 hours of a 1mg dose.",
    },
    pharmacokinetics: { peak: "2h", halfLife: "46h", cleared: "~10 days" },
    researchIndications: [
      { category: "Breast Cancer", effectiveness: "Most Effective", items: [
        { title: "Postmenopausal ER+ Breast Cancer", description: "ATAC trial: anastrozole significantly superior to tamoxifen for disease-free survival in postmenopausal ER+ breast cancer. Current standard of care." },
      ]},
      { category: "Male Oestrogen Management", effectiveness: "Effective", items: [
        { title: "TRT-associated Hyperoestrogenaemia", description: "Multiple case series and small RCTs demonstrate anastrozole 0.5–1mg/week normalises oestradiol during TRT, alleviating symptoms of oestrogen excess." },
      ]},
    ],
    researchProtocols: [
      { goal: "TRT oestrogen management (conservative)", dose: "0.25mg", frequency: "Every other day", route: "Oral" },
      { goal: "TRT oestrogen management (standard)", dose: "0.5mg", frequency: "Every other day", route: "Oral" },
      { goal: "Heavy AAS cycle support", dose: "0.5–1mg", frequency: "Daily", route: "Oral" },
    ],
    interactions: [
      { name: "Tamoxifen (competitive — reduces anastrozole effect)", status: "caution" },
      { name: "Oestrogen supplementation", status: "avoid" },
      { name: "Warfarin", status: "monitor" },
    ],
    qualityIndicators: [
      { type: "pass", title: "E2 normalisation on bloodwork", description: "Serum oestradiol should fall into male physiological range (20–30 pg/mL) within 1–2 weeks of consistent dosing. Confirm with sensitive assay (LC-MS/MS)." },
      { type: "warn", title: "Monitor for over-suppression", description: "Joint pain, low mood, zero libido, and cold symptoms may indicate oestradiol is too low. Test before adjusting dose." },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Oestradiol begins to fall from first dose." },
      { timeframe: "Week 1–2", description: "Oestradiol reaches stable suppressed level. Symptoms of high E2 (water retention, sensitive nipples) improve." },
      { timeframe: "Month 1+", description: "Stable oestrogen management with regular monitoring and dose adjustment." },
    ],
    sideEffectNotes: [
      "Joint and musculoskeletal aches — most common; dose-dependent; sign of over-suppression",
      "Low libido and mood depression — oestrogen is needed for male wellbeing; keep E2 in range",
      "Bone density reduction — long-term low oestrogen increases fracture risk; supplement calcium/D3",
      "Lipid profile worsening — oestrogen has cardioprotective effect on HDL",
    ],
    references: [
      { title: "ATAC Trialists' Group — Lancet (2002)", context: "Postmenopausal ER+ breast cancer | 1mg daily | 5 years", description: "Anastrozole superior to tamoxifen for disease-free survival. Established anastrozole as first-line adjuvant therapy.", url: "https://pubmed.ncbi.nlm.nih.gov/12493255/" },
    ],
    faq: [
      { question: "How do I know my anastrozole dose is correct?", answer: "Blood tests measuring serum oestradiol (ideally with an LC-MS/MS sensitive assay) are essential. Target E2 is typically 20–30 pg/mL for men on TRT. Adjust dose based on bloodwork, not symptoms alone." },
    
      { question: "How does anastrozole differ from exemestane?", answer: "Both are third-generation aromatase inhibitors, but anastrozole is non-steroidal (reversible inhibition) while exemestane is steroidal (irreversible). Exemestane has mild androgenic properties that may help preserve bone mineral density and lean mass. Clinical outcomes are comparable in breast cancer trials." },
      { question: "How much does anastrozole reduce oestrogen?", answer: "Anastrozole 1mg/day reduces circulating oestradiol by 85–98% in post-menopausal women by blocking peripheral aromatisation. In men using it to manage elevated oestradiol on testosterone therapy, lower doses (0.25–0.5mg twice weekly) reduce E2 by 40–70% without excessive suppression." },
      { question: "Can I take anastrozole every other day?", answer: "Yes — anastrozole's half-life of ~50 hours supports alternate-day or twice-weekly dosing in clinical use. Many TRT protocols use 0.25–0.5mg every other day to avoid over-suppression of oestradiol, which causes joint pain, low libido, and cardiovascular risk." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Arimidex approved for breast cancer. Off-label for male use." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Arimee 1", manufacturer: "Healing Pharma" },
      { brand: "Ana-Ash 1" },
      { brand: "Anastrol 1" },
      { brand: "Arimidex 1", manufacturer: "AstraZeneca", notes: "Originator brand" },
    ],
    ukBrands: [
      { brand: "Arimidex", manufacturer: "AstraZeneca", notes: "1mg tablets; licensed for breast cancer" },
      { brand: "Anastrozole (generic)", manufacturer: "Various", notes: "Widely available on NHS prescription" },
    ],
    usBrands: [
      { brand: "Arimidex", manufacturer: "AstraZeneca", notes: "1mg; FDA-approved for breast cancer" },
      { brand: "Anastrozole (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Arimidex", manufacturer: "AstraZeneca", notes: "1mg; licensed for breast cancer" },
      { brand: "Anastrozole (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Exemestane",
    slug: "exemestane",
    abbreviation: "EXE",
    aliases: ["exemestane", "aromasin", "xtane", "xmalon"],
    category: "hormonal",
    tagline: "Steroidal aromatase inhibitor — potent, irreversible oestrogen suppression",
    description: "Exemestane is a steroidal (irreversible) aromatase inhibitor that permanently inactivates the aromatase enzyme. Unlike anastrozole, it has mild androgenic properties (being a steroid) which may be advantageous in some contexts. Approved for breast cancer.",
    color: "#1E3A8A",
    vial: "Oral tablet",
    recon: "25mg",
    startDose: "12.5mg",
    targetDose: "25mg",
    frequency: "Daily with food or every other day",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Irreversible aromatase inactivation — recovery takes 4–5 days after stopping. Mild androgenic activity. Effective oestrogen suppression with less effect on lipid profile vs anastrozole. Preferred in some AAS cycles for its androgenic properties.",
    tips: "Take with a fatty meal — absorption increases 40% with food. Irreversible mechanism means effects persist days after stopping. Dose EOD for moderate oestrogen control on TRT; daily for higher-dose AAS protocols.",
    sideEffects: "Similar to anastrozole: joint stiffness, hot flushes, fatigue, bone density reduction. Mild androgenic effects (from steroidal structure) — slight increase in androgen-related effects.",
    watchOut: "Irreversible mechanism means over-suppression takes longer to resolve than with anastrozole — be more cautious with dose escalation. Same bone density and lipid concerns as all AIs.",
    researchLevel: "Extensively Studied",
    tags: ["Hormonal", "AI", "Oestrogen Control"],
    typicalDose: "12.5–25mg EOD",
    cycle: "Concurrent with AAS/TRT",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Exemestane (Aromasin) is a steroidal (type I) irreversible aromatase inactivator approved for breast cancer. Unlike non-steroidal AIs (anastrozole, letrozole), exemestane permanently binds aromatase, preventing enzyme regeneration. Its steroidal backbone gives it mild androgenic activity absent from the triazole-based AIs.",
      keyBenefits: "Irreversible mechanism provides sustained suppression. Mild androgenic properties may counteract some quality-of-life issues seen with non-steroidal AIs. Comparable oestrogen suppression to anastrozole at 25mg. Used in breast cancer as adjuvant and second-line after non-steroidal AI failure.",
      mechanismOfAction: "Steroidal substrate analogue that binds irreversibly to the aromatase active site, causing permanent enzyme inactivation. New aromatase enzyme must be synthesised to restore function — recovery takes 4–5 days. Also weakly binds androgen receptors (mild androgenic activity from its 6-methylene group).",
    },
    pharmacokinetics: { peak: "2h", halfLife: "24h (enzyme recovery: 4–5 days)", cleared: "~5 days (enzyme effect)" },
    researchIndications: [
      { category: "Breast Cancer", effectiveness: "Most Effective", items: [
        { title: "Postmenopausal ER+ Breast Cancer", description: "Approved as second-line after tamoxifen and as adjuvant switching therapy after 2–3 years of tamoxifen (TEAM trial)." },
      ]},
    ],
    researchProtocols: [
      { goal: "TRT oestrogen management", dose: "12.5mg", frequency: "Every other day", route: "Oral with food" },
      { goal: "AAS cycle oestrogen management", dose: "25mg", frequency: "Every other day or daily", route: "Oral with food" },
    ],
    interactions: [
      { name: "Strong CYP3A4 inducers (rifampicin)", status: "caution" },
      { name: "Oestrogen supplementation", status: "avoid" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Persistent effect after stopping", description: "Unlike anastrozole, oestrogen suppression continues 4–5 days after stopping exemestane — confirming irreversible enzyme inactivation." },
      { type: "warn", title: "Over-suppression: slower to reverse", description: "If oestradiol is too low, it takes longer to recover than with reversible AIs. Err conservative with dosing." },
    ],
    expectTimeline: [
      { timeframe: "24 hours", description: "Aromatase inactivation begins." },
      { timeframe: "4–7 days", description: "Maximum sustained oestrogen suppression." },
      { timeframe: "After stopping", description: "Enzyme recovery takes 4–5 days; oestrogen gradually returns." },
    ],
    sideEffectNotes: [
      "Joint stiffness and bone pain — over-suppression symptoms",
      "Hot flushes — particularly in women (approved use) but also in men at high doses",
      "Bone density reduction — supplement calcium/D3 for long-term use",
    ],
    references: [
      { title: "Coombes RC et al. TEAM — Lancet (2004)", context: "Human | 25mg daily | 2 years | N=4,742", description: "Switching to exemestane after 2–3 years tamoxifen significantly improved disease-free survival in postmenopausal ER+ breast cancer.", url: "https://pubmed.ncbi.nlm.nih.gov/15023496/" },
    ],
    faq: [
      { question: "Should I use anastrozole or exemestane?", answer: "Both effectively reduce oestrogen. Anastrozole (reversible) allows faster dose adjustment and oestrogen recovery. Exemestane (irreversible) provides more sustained suppression and has mild androgenic properties. Personal preference, specific AAS stack, and bloodwork guide the choice." },
    
      { question: "How does exemestane affect bone density?", answer: "Like all aromatase inhibitors, exemestane reduces oestrogen levels and can accelerate bone mineral density loss in post-menopausal women. However, exemestane's steroidal structure gives it mild androgen activity that partially counteracts bone loss compared to non-steroidal AIs. Bone-protective strategies (calcium, vitamin D, bisphosphonates) are recommended for long-term users." },
      { question: "Can exemestane be used in men on testosterone therapy?", answer: "Exemestane is used off-label in men to manage elevated oestradiol during testosterone therapy. At 12.5–25mg every other day or every 3 days, it effectively controls E2 levels. Its androgenic properties may be mildly beneficial for muscle preservation, unlike anastrozole which is purely anti-oestrogenic." },
      { question: "Is exemestane taken with food?", answer: "Yes — exemestane is best taken with food. Taking it after a meal increases bioavailability by approximately 40% by increasing absorption and reducing first-pass metabolism. Consistency in timing relative to meals is more important than exact clock time." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved (Rx)", notes: "Aromasin approved for breast cancer." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Xtane 25", manufacturer: "Natco Pharma" },
      { brand: "Xmalon 25" },
    ],
    ukBrands: [
      { brand: "Aromasin", manufacturer: "Pfizer", notes: "25mg tablets; licensed for breast cancer" },
      { brand: "Exemestane (generic)", manufacturer: "Various", notes: "Available on prescription" },
    ],
    usBrands: [
      { brand: "Aromasin", manufacturer: "Pfizer", notes: "25mg; FDA-approved for breast cancer" },
      { brand: "Exemestane (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Aromasin", manufacturer: "Pfizer", notes: "25mg; licensed for breast cancer" },
      { brand: "Exemestane (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  // ─── METABOLIC ────────────────────────────────────────────────────────────

  {
    name: "Metformin",
    slug: "metformin",
    abbreviation: "MET",
    aliases: ["metformin", "glycopharge", "glycoheal", "glucophage"],
    category: "metabolic",
    tagline: "Biguanide — type 2 diabetes, insulin resistance & longevity",
    description: "Metformin is the most widely prescribed oral antidiabetic globally and a first-line treatment for type 2 diabetes. Increasingly studied for longevity, cancer prevention, and metabolic syndrome beyond glucose control. Mechanism is centred on AMPK activation and hepatic glucose production inhibition.",
    color: "#059669",
    vial: "Oral tablet",
    recon: "500mg, 850mg, 1000mg; SR/XR formulations",
    startDose: "500mg",
    targetDose: "1500–2000mg/day",
    frequency: "Twice or thrice daily with meals",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Reduces hepatic gluconeogenesis. Improves insulin sensitivity. Modest weight loss benefit. Cardiovascular mortality reduction (UKPDS). Potential longevity benefits via AMPK/mTOR pathway. Reduces all-cause cancer risk in some epidemiological studies.",
    tips: "Always take with food — dramatically reduces GI side effects. Start at 500mg once daily with dinner for 1–2 weeks before increasing. SR (slow-release) formulations have fewer GI side effects. Ensure adequate B12 levels — metformin reduces B12 absorption long-term.",
    sideEffects: "GI: nausea, diarrhoea, abdominal discomfort (very common initially, usually resolves). Vitamin B12 deficiency (long-term). Metallic taste. Lactic acidosis (rare but serious — avoid in renal impairment).",
    watchOut: "Hold before procedures with iodinated contrast (2 days). Contraindicated in eGFR <30 mL/min (lactic acidosis risk). Contraindicated in severe hepatic impairment. Monitor B12 annually with long-term use. Alcohol increases lactic acidosis risk.",
    researchLevel: "Extensively Studied",
    tags: ["Metabolic", "Diabetes", "Longevity", "Insulin Resistance"],
    typicalDose: "500–850mg twice daily with meals",
    cycle: "Continuous (chronic condition)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Metformin was derived from the plant Galega officinalis and introduced clinically in 1957. First-line treatment for type 2 diabetes in virtually all major clinical guidelines. It is the most frequently prescribed medication globally and is on the WHO Essential Medicines List. Indian generics are available under dozens of brand names.",
      keyBenefits: "The UKPDS trial established cardiovascular mortality reduction beyond glucose control. One of the only antidiabetic medications associated with weight neutrality/mild weight loss. Increasingly studied in longevity research — TAME trial (Targeting Aging with Metformin) is ongoing. Very low cost and well-characterised long-term safety.",
      mechanismOfAction: "Activates AMP-activated protein kinase (AMPK), reducing hepatic gluconeogenesis (primary effect). Decreases intestinal glucose absorption. Improves peripheral insulin sensitivity in muscle. AMPK activation inhibits mTORC1 pathway — implicated in longevity benefits. Reduces mitochondrial complex I activity, altering cellular energy sensing.",
    },
    pharmacokinetics: { peak: "2–4h (immediate release)", halfLife: "4–8h", cleared: "~48h" },
    researchIndications: [
      { category: "Type 2 Diabetes", effectiveness: "Most Effective", items: [
        { title: "Glycaemic Control", description: "HbA1c reduction of 1–2% as monotherapy. UKPDS: 32% reduction in diabetes-related endpoints in overweight T2D patients. First-line therapy in virtually all guidelines." },
        { title: "Cardiovascular Protection", description: "UKPDS: 39% reduction in MI in metformin arm (vs sulphonylurea). One of few glucose-lowering drugs with demonstrated CV mortality benefit." },
      ]},
      { category: "Insulin Resistance / PCOS / Longevity", effectiveness: "Moderate", items: [
        { title: "PCOS", description: "Improves menstrual regularity and ovulation in PCOS. Reduces androgens and insulin resistance. Less effective than lifestyle modification alone." },
        { title: "Longevity Research", description: "TAME trial (ongoing, NIH-funded): testing metformin's ability to delay onset of age-related diseases in non-diabetic elderly. Preclinical data consistently supports anti-aging mechanisms." },
      ]},
    ],
    researchProtocols: [
      { goal: "T2DM — Initial titration", dose: "500mg", frequency: "Once daily with dinner (week 1–2)", route: "Oral" },
      { goal: "T2DM — Standard dose", dose: "500mg", frequency: "Twice daily with meals", route: "Oral" },
      { goal: "T2DM — Full dose", dose: "1000mg", frequency: "Twice daily with meals", route: "Oral" },
      { goal: "Longevity / Insulin sensitisation (off-label)", dose: "500–1000mg", frequency: "Once daily with dinner", route: "Oral" },
    ],
    interactions: [
      { name: "Alcohol", status: "caution" },
      { name: "Iodinated contrast dyes", status: "avoid" },
      { name: "Cimetidine", status: "monitor" },
      { name: "ACE inhibitors (synergistic glucose lowering)", status: "compatible" },
      { name: "SGLT2 inhibitors", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "GI side effects initially — expected", description: "Nausea and diarrhoea in the first 1–2 weeks confirm absorption and GI activity. Severe prolonged GI effects may indicate incorrect dosing or formulation." },
      { type: "warn", title: "B12 monitoring essential long-term", description: "Metformin reduces B12 absorption via intrinsic factor interference. Monitor annually and supplement if levels fall." },
      { type: "fail", title: "Lactic acidosis warning signs", description: "Severe muscle pain, weakness, difficulty breathing, stomach pain, and cold extremities require immediate medical attention — could indicate lactic acidosis (rare but serious)." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "GI side effects peak. Blood glucose begins to fall." },
      { timeframe: "Month 1", description: "Fasting glucose improvement. HbA1c reduction begins (HbA1c reflects 2–3 months of glucose)." },
      { timeframe: "Month 3", description: "HbA1c reduction of 1–2% measurable from baseline." },
      { timeframe: "Month 6+", description: "Stable glycaemic control. Weight stability or modest loss. Cardiovascular benefits accumulate long-term." },
    ],
    sideEffectNotes: [
      "GI side effects (nausea, diarrhoea, abdominal cramps) — 20–30% initially; reduce with food intake and slow dose titration; SR formulation helps",
      "Metallic taste — common, transient",
      "Vitamin B12 deficiency — cumulative with years of use; supplement B12 or monitor annually",
      "Lactic acidosis — rare (<10/100,000 patient-years); risk increases significantly in renal impairment (eGFR <30) or heavy alcohol use",
    ],
    references: [
      { title: "UKPDS Group — Lancet (1998)", context: "Human | 1700–2550mg | 10 years | N=753 overweight T2DM", description: "Landmark UK Prospective Diabetes Study showing 32% reduction in diabetes endpoints and 39% reduction in MI with metformin vs diet alone.", url: "https://pubmed.ncbi.nlm.nih.gov/9742977/" },
    ],
    faq: [
      { question: "Can non-diabetics take metformin for longevity?", answer: "Metformin is actively being studied for longevity in non-diabetic populations (TAME trial). Some physicians prescribe it off-label for longevity at 500–1000mg/day. Evidence is not yet definitive; however, the safety profile is very well established. Discuss with your doctor." },
      { question: "Which is better — immediate release or extended release?", answer: "Extended release (SR/XR) formulations have significantly fewer GI side effects (30–50% reduction in GI events) with similar efficacy. Most patients switching from IR to XR report improved GI tolerance. XR is the preferred formulation for new starts if available." },
    
      { question: "Why must metformin be stopped before contrast dye procedures?", answer: "Iodinated contrast agents can cause acute kidney injury (AKI), which reduces metformin clearance and allows it to accumulate to toxic levels, causing lactic acidosis. Current guidelines recommend stopping metformin on the day of contrast administration and restarting 48 hours after the procedure when renal function is confirmed normal." },
      { question: "Does metformin cause weight loss?", answer: "Metformin produces modest weight loss or weight neutrality in most patients (average 2–3kg over 12–24 months). This contrasts with sulphonylureas and insulin, which cause weight gain. The mechanism involves reduced appetite, altered gut microbiome composition, and mild caloric reduction through GI discomfort." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Glucophage approved for T2DM. Multiple generics available." },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Widely available. No prescription required in many states (OTC). WHO Essential Medicine." },
    ],
    indianBrands: [
      { brand: "Glycoheal 500", manufacturer: "Healing Pharma" },
      { brand: "Glycoheal 850", manufacturer: "Healing Pharma" },
      { brand: "Glycoheal 1000", manufacturer: "Healing Pharma" },
      { brand: "Glycomet GP 1 Forte", notes: "Combination" },
      { brand: "Glycomet SR 500", manufacturer: "USV" },
      { brand: "Glycomet SR 1000", manufacturer: "USV" },
      { brand: "Glycopharge SR" },
      { brand: "Janumet 50/1000", notes: "Combination — DPP4i + Metformin" },
      { brand: "Glynase XL 5", notes: "Combination" },
    ],
    ukBrands: [
      { brand: "Glucophage", manufacturer: "Merck", notes: "500mg, 850mg, 1000mg tablets; POM" },
      { brand: "Glucophage SR", manufacturer: "Merck", notes: "500mg, 750mg modified-release" },
      { brand: "Metformin (generic)", manufacturer: "Various", notes: "Standard care for T2DM on NHS" },
    ],
    usBrands: [
      { brand: "Glucophage", manufacturer: "Bristol-Myers Squibb", notes: "500mg, 850mg, 1000mg; Rx" },
      { brand: "Glucophage XR", manufacturer: "BMS", notes: "500mg, 750mg extended-release" },
      { brand: "Fortamet", manufacturer: "Shionogi", notes: "500mg, 1000mg extended-release" },
      { brand: "Metformin (generic)", manufacturer: "Various", notes: "FDA-approved generics; most widely used" },
    ],
    canadaBrands: [
      { brand: "Glucophage", manufacturer: "Merck", notes: "500mg, 850mg tablets" },
      { brand: "Glumetza", manufacturer: "Valeant", notes: "500mg, 1000mg extended-release" },
      { brand: "Metformin (generic)", manufacturer: "Various", notes: "Widely available on Rx" },
    ],
  },

  // ─── CARDIOVASCULAR ───────────────────────────────────────────────────────

  {
    name: "Propranolol",
    slug: "propranolol",
    abbreviation: "PRO",
    aliases: ["propranolol", "inderal", "ciplar", "provanol"],
    category: "cardiovascular",
    tagline: "Non-selective beta-blocker — hypertension, anxiety, arrhythmia & migraine",
    description: "Propranolol is a non-selective beta-1 and beta-2 adrenergic receptor antagonist widely used for hypertension, angina, arrhythmias, essential tremor, and performance anxiety. One of the few drugs to demonstrate mortality benefit in post-MI patients.",
    color: "#DC2626",
    vial: "Oral tablet / oral solution",
    recon: "10mg, 20mg, 40mg, 80mg, 160mg (LA)",
    startDose: "10–20mg",
    targetDose: "40–80mg",
    frequency: "Two to three times daily (immediate release)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Reduces heart rate and cardiac workload. Effective for hypertension, atrial fibrillation, essential tremor, migraine prevention, and situational anxiety (performance anxiety/stage fright). Low cost, generic availability.",
    tips: "Do not stop abruptly — rebound tachycardia and angina risk. Take at same times daily. For situational anxiety, 10–40mg taken 30–60 min before stressful event is common off-label use. Mask hypoglycaemia symptoms in diabetics — monitor glucose carefully.",
    sideEffects: "Fatigue, cold extremities, bradycardia, depression, sexual dysfunction, bronchoconstriction (CI in asthma), nightmares, exercise intolerance.",
    watchOut: "Contraindicated in asthma and COPD (beta-2 blockade causes bronchoconstriction). Do not abruptly discontinue — taper dose. Mask hypoglycaemia. Avoid in cardiogenic shock, uncompensated heart failure, sick sinus syndrome, high-degree AV block.",
    researchLevel: "Extensively Studied",
    tags: ["Cardiovascular", "Hypertension", "Anxiety", "Arrhythmia"],
    typicalDose: "40mg twice daily",
    cycle: "Continuous (chronic use for hypertension/arrhythmia); as needed for anxiety",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Propranolol was developed by Sir James Black (Nobel Prize winner) and first marketed in 1964 — the first clinically successful beta-blocker. It has the longest track record of any beta-blocker and is on the WHO Essential Medicines List. Indian generics (Ciplar) are manufactured by Cipla.",
      keyBenefits: "One of few drugs with demonstrated all-cause mortality reduction post-MI (pre-reperfusion era). Effective for multiple indications with one drug. Very low cost and widely available. The drug of choice for situational/performance anxiety (off-label) due to peripheral beta blockade reducing physical anxiety symptoms without sedation.",
      mechanismOfAction: "Non-selective blockade of beta-1 receptors (heart) and beta-2 receptors (lungs, peripheral vasculature). Beta-1 blockade reduces heart rate and myocardial contractility, lowering blood pressure and cardiac oxygen demand. Beta-2 blockade reduces peripheral symptoms of anxiety (tremor, palpitations) but causes bronchoconstriction — unsafe in asthma.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "3–6h (IR); 10h (LA)", cleared: "~24h" },
    researchIndications: [
      { category: "Cardiovascular", effectiveness: "Most Effective", items: [
        { title: "Hypertension", description: "Effective as monotherapy or combination for stage 1–2 hypertension. Not first-line in guidelines vs ACE inhibitors/ARBs (less renal protection) but remains widely used." },
        { title: "Atrial Fibrillation (rate control)", description: "IV or oral propranolol effective for acute and long-term rate control in AF/flutter. Second-line to metoprolol for rate control in many guidelines." },
      ]},
      { category: "Anxiety / Performance", effectiveness: "Effective", items: [
        { title: "Situational (Performance) Anxiety", description: "Off-label use: 10–40mg before stressful event effectively reduces peripheral symptoms (tremor, palpitations, voice shaking) without cognitive sedation. Widely used by musicians, public speakers, surgeons." },
      ]},
    ],
    researchProtocols: [
      { goal: "Hypertension", dose: "40mg", frequency: "Twice daily", route: "Oral" },
      { goal: "Performance/situational anxiety", dose: "10–40mg", frequency: "Once, 30–60 min before event", route: "Oral" },
      { goal: "Essential tremor", dose: "40–80mg", frequency: "Twice daily", route: "Oral" },
      { goal: "Migraine prophylaxis", dose: "40–80mg", frequency: "Twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Calcium channel blockers (verapamil, diltiazem)", status: "caution" },
      { name: "Digoxin", status: "monitor" },
      { name: "NSAIDs (reduce antihypertensive effect)", status: "monitor" },
      { name: "Insulin / antidiabetics", status: "monitor" },
      { name: "MAOIs", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Heart rate reduction confirming effect", description: "A resting HR of 55–65 bpm on propranolol 40mg twice daily indicates appropriate beta-blockade. Check pulse 2 hours post-dose." },
      { type: "warn", title: "Never stop abruptly", description: "Abrupt discontinuation causes rebound hypertension and tachycardia — dangerous in angina patients. Always taper." },
      { type: "fail", title: "Contraindicated in asthma", description: "Beta-2 blockade can cause fatal bronchospasm. Contraindicated in all forms of reactive airway disease." },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Onset for immediate release. Heart rate begins to fall." },
      { timeframe: "1–2 hours", description: "Peak effect. HR, BP reduction at maximum." },
      { timeframe: "Days–weeks", description: "Full antihypertensive effect may take 1–2 weeks for chronic dosing." },
    ],
    sideEffectNotes: [
      "Fatigue and exercise intolerance — reduced cardiac output and peripheral beta-2 blockade limit exercise capacity",
      "Cold hands and feet — peripheral vasoconstriction from beta-2 blockade",
      "Bradycardia — may be desired (rate control) or excessive; target HR >50 bpm",
      "Depression — less common but reported with propranolol vs selective beta-blockers",
      "Bronchoconstriction — absolute contraindication in asthma",
      "Masking hypoglycaemia — awareness symptoms (palpitations, tremor) blunted; monitor glucose if diabetic",
    ],
    references: [
      { title: "Norwegian Multicenter Study Group — NEJM (1982)", context: "Post-MI | 160mg propranolol | 3 years | N=1,884", description: "Propranolol reduced all-cause mortality 39% in post-MI patients. Established mortality benefit of beta-blockers.", url: "https://pubmed.ncbi.nlm.nih.gov/7070440/" },
    ],
    faq: [
      { question: "Can propranolol help with anxiety?", answer: "Yes — propranolol is commonly used off-label for situational/performance anxiety (stage fright, public speaking, exams). It reduces peripheral symptoms (palpitations, tremor, voice shaking) without sedation or affecting cognition. 10–40mg taken 30–60 minutes before the stressful event. Not for generalised anxiety disorder." },
    
      { question: "Can I stop propranolol suddenly?", answer: "No — abrupt discontinuation of propranolol (especially at higher doses or in patients with cardiac conditions) can cause rebound tachycardia, hypertension, and increased angina risk. Taper the dose over 1–2 weeks when discontinuing. In performance anxiety use at low doses, sudden cessation is less risky but gradual tapering is still preferred." },
      { question: "Does propranolol block epinephrine (adrenaline) entirely?", answer: "Propranolol blocks the effects of epinephrine at beta-1 and beta-2 receptors but does not affect alpha-adrenergic receptors. This can lead to unopposed alpha-mediated vasoconstriction if high doses of epinephrine are given, causing severe hypertension. Always inform emergency teams about propranolol use." },
      { question: "Can propranolol treat anxiety and tremor?", answer: "Yes — propranolol is widely used off-label for situational anxiety (performance anxiety, social anxiety before events) at 10–40mg taken 45–60 min before exposure. It blocks the physical symptoms of anxiety (palpitations, tremor, sweating) without sedation. Essential tremor responds to regular dosing at 40–320mg/day." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Approved for hypertension, angina, MI, arrhythmia, essential tremor, migraine prophylaxis, IHSS. Generic widely available." },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "WHO Essential Medicine. Available OTC in many states." },
    ],
    indianBrands: [
      { brand: "Ciplar 10", manufacturer: "Cipla" },
      { brand: "Ciplar 20", manufacturer: "Cipla" },
      { brand: "Ciplar 40", manufacturer: "Cipla" },
      { brand: "Ciplar 80", manufacturer: "Cipla" },
      { brand: "Ciplar LA 80", manufacturer: "Cipla" },
      { brand: "Provanol 40" },
    ],
    ukBrands: [
      { brand: "Inderal", manufacturer: "Sanofi", notes: "10mg, 40mg, 80mg, 160mg; POM" },
      { brand: "Inderal LA", manufacturer: "Sanofi", notes: "80mg, 120mg, 160mg modified-release" },
      { brand: "Propranolol (generic)", manufacturer: "Various", notes: "Widely available on NHS prescription" },
    ],
    usBrands: [
      { brand: "Inderal", manufacturer: "Wyeth / Pfizer", notes: "10mg, 20mg, 40mg, 60mg, 80mg" },
      { brand: "Inderal LA", manufacturer: "Wyeth", notes: "60mg, 80mg, 120mg, 160mg extended-release" },
      { brand: "InnoPran XL", manufacturer: "Glaxo", notes: "80mg, 120mg; FDA-approved for hypertension" },
      { brand: "Propranolol (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Inderal", manufacturer: "Pfizer", notes: "10mg, 20mg, 40mg, 80mg tablets" },
      { brand: "Propranolol (generic)", manufacturer: "Various", notes: "Widely available on Rx" },
    ],
  },

  {
    name: "Telmisartan",
    slug: "telmisartan",
    abbreviation: "TEL",
    aliases: ["telmisartan", "micardis", "telmaheal"],
    category: "cardiovascular",
    tagline: "Angiotensin II receptor blocker — hypertension & cardiovascular protection",
    description: "Telmisartan is an ARB with the longest half-life in its class (24 hours) and partial PPAR-gamma agonist activity, providing additional metabolic benefits. Approved for hypertension and cardiovascular risk reduction in patients at high risk.",
    color: "#EF4444",
    vial: "Oral tablet",
    recon: "20mg, 40mg, 80mg",
    startDose: "20–40mg",
    targetDose: "80mg",
    frequency: "Once daily",
    route: "Oral",
    storage: "Room temperature",
    benefits: "24-hour efficacy with once-daily dosing. PPAR-gamma activity may improve insulin sensitivity and lipids. No cough (unlike ACE inhibitors). Renal protective effects. Cardiovascular event reduction demonstrated in ONTARGET trial.",
    tips: "Can be taken any time of day — consistent timing preferred. Monitor potassium (hyperkaliaemia risk). Monitor renal function in CKD. Do not use with ACE inhibitors (ONTARGET showed harm from dual blockade). Take with or without food.",
    sideEffects: "Dizziness, hypotension (especially first dose), hyperkaliaemia, elevated creatinine, diarrhoea. Rare: angioedema (less common than ACE inhibitors).",
    watchOut: "Contraindicated in pregnancy (teratogenic). Contraindicated with aliskiren in diabetics or CKD. Monitor potassium in renal impairment or with potassium supplements/spironolactone. Do not combine with ACE inhibitors.",
    researchLevel: "Extensively Studied",
    tags: ["Cardiovascular", "Hypertension", "Renal Protection"],
    typicalDose: "40–80mg daily",
    cycle: "Continuous",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Telmisartan (Micardis) is a biaryl tetrazole ARB developed by Boehringer Ingelheim. It has the longest half-life of all ARBs (24h) and unique partial PPAR-gamma agonism. Approved for hypertension and, after ONTARGET, for cardiovascular risk reduction in high-risk non-hypertensive patients.",
      keyBenefits: "Once-daily dosing without dose adjustments in mild-moderate CKD. Cardiovascular event reduction in ONTARGET (non-inferior to ramipril). Better tolerated than ACE inhibitors (no cough, less angioedema). Partial PPAR-gamma agonism provides insulin-sensitising and lipid-modifying benefits.",
      mechanismOfAction: "Competitively antagonises angiotensin II at AT1 receptors, blocking vasoconstriction and aldosterone secretion. Unlike ACE inhibitors, does not prevent bradykinin degradation (hence no cough). Additionally, partial PPAR-gamma agonism improves insulin sensitivity and reduces inflammation.",
    },
    pharmacokinetics: { peak: "0.5–1h", halfLife: "24h", cleared: "~5 days" },
    researchIndications: [
      { category: "Hypertension", effectiveness: "Most Effective", items: [
        { title: "Essential Hypertension", description: "Effective as monotherapy or in combination with HCTZ. 24h duration provides excellent trough:peak ratio for overnight BP control." },
        { title: "Cardiovascular Risk Reduction", description: "ONTARGET trial (N=25,620): telmisartan 80mg non-inferior to ramipril 10mg for primary cardiovascular endpoint in high-risk patients without hypertension." },
      ]},
    ],
    researchProtocols: [
      { goal: "Hypertension — start", dose: "20–40mg", frequency: "Once daily", route: "Oral" },
      { goal: "Hypertension — maintenance", dose: "80mg", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "ACE inhibitors (dual RAAS blockade — avoid)", status: "avoid" },
      { name: "Potassium-sparing diuretics (spironolactone)", status: "caution" },
      { name: "NSAIDs (reduce antihypertensive effect)", status: "monitor" },
      { name: "Lithium", status: "monitor" },
      { name: "HCTZ (combination — available)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Once-daily BP reduction maintained", description: "Telmisartan's 24h half-life means trough BP (measured before morning dose) should still be controlled — confirms adequate dosing." },
    ],
    expectTimeline: [
      { timeframe: "2 weeks", description: "Maximum antihypertensive effect. Monitor BP regularly in first month." },
      { timeframe: "Month 1+", description: "Stable BP control. Renal protective effects accumulate over months-years." },
    ],
    sideEffectNotes: [
      "First-dose hypotension — take at bedtime if concerned; increase dose slowly",
      "Hyperkaliaemia — monitor potassium especially with renal impairment or concomitant K+ supplements",
      "Elevated creatinine (mild) — expected with RAAS blockade; monitor in CKD",
    ],
    references: [
      { title: "ONTARGET Investigators — NEJM (2008)", context: "Human | 80mg daily | 56 months | N=25,620", description: "Telmisartan non-inferior to ramipril in high-risk cardiovascular event reduction. Combination of both was harmful.", url: "https://pubmed.ncbi.nlm.nih.gov/18378520/" },
    ],
    faq: [
      { question: "Why choose telmisartan over other ARBs?", answer: "Telmisartan has the longest half-life of all ARBs (24h), providing excellent 24-hour coverage with single daily dosing. Its unique PPAR-gamma partial agonism may offer metabolic benefits. It is non-inferior to ramipril for cardiovascular event reduction and is better tolerated (no cough)." },
    
      { question: "How is telmisartan different from other ARBs?", answer: "Telmisartan has the longest half-life of all ARBs (~24 hours), providing full 24-hour blood pressure control from once-daily dosing with no end-of-dose trough. It is also a partial PPAR-gamma agonist, providing mild insulin-sensitising effects potentially beneficial in metabolic syndrome." },
      { question: "Can telmisartan be combined with other blood pressure medications?", answer: "Telmisartan combines well with amlodipine (available as the combination Twynsta/Azilsartan), hydrochlorothiazide (Micardis Plus), or calcium channel blockers. Avoid combining with ACE inhibitors or aliskiren (dual RAAS blockade increases hyperkalaemia and renal failure risk)." },
      { question: "Does telmisartan protect the kidneys in diabetes?", answer: "Yes — like all ARBs, telmisartan reduces intraglomerular pressure and proteinuria in diabetic nephropathy via angiotensin II receptor blockade. The ONTARGET trial demonstrated renal protective effects. It is a preferred antihypertensive for diabetic patients with microalbuminuria." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Micardis approved for hypertension and CV risk reduction." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Telmaheal 20", manufacturer: "Healing Pharma" },
      { brand: "Telmaheal 40", manufacturer: "Healing Pharma" },
      { brand: "Telmaheal 80", manufacturer: "Healing Pharma" },
      { brand: "Telmaheal H 40", notes: "Combination with hydrochlorothiazide" },
      { brand: "Metosartan 50", notes: "Different drug — metoprolol" },
    ],
    ukBrands: [
      { brand: "Micardis", manufacturer: "Boehringer Ingelheim", notes: "20mg, 40mg, 80mg tablets; POM" },
      { brand: "Telmisartan (generic)", manufacturer: "Various", notes: "Available on prescription" },
    ],
    usBrands: [
      { brand: "Micardis", manufacturer: "Boehringer Ingelheim", notes: "20mg, 40mg, 80mg; FDA-approved" },
      { brand: "Micardis HCT", manufacturer: "Boehringer Ingelheim", notes: "Combination with hydrochlorothiazide" },
      { brand: "Telmisartan (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Micardis", manufacturer: "Boehringer Ingelheim", notes: "40mg, 80mg; licensed for hypertension" },
      { brand: "Telmisartan (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Rosuvastatin",
    slug: "rosuvastatin",
    abbreviation: "ROS",
    aliases: ["rosuvastatin", "crestor", "rosufree", "rosufit"],
    category: "cardiovascular",
    tagline: "Potent statin — LDL reduction & cardiovascular event prevention",
    description: "Rosuvastatin is one of the most potent HMG-CoA reductase inhibitors available, reducing LDL cholesterol by 46–55% at standard doses. Approved for primary and secondary cardiovascular prevention, familial hypercholesterolaemia, and hypertriglyceridaemia.",
    color: "#B91C1C",
    vial: "Oral tablet",
    recon: "5mg, 10mg, 20mg, 40mg",
    startDose: "5–10mg",
    targetDose: "20–40mg",
    frequency: "Once daily (any time, preferably evening)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Reduces LDL by 46–55% (dose-dependent). Raises HDL 8–14%. Reduces triglycerides 10–35%. JUPITER trial: 54% reduction in major cardiovascular events in patients with elevated CRP. Anti-inflammatory (pleiotropic) effects beyond cholesterol reduction.",
    tips: "Take at the same time each day. Evening dosing may be slightly more effective (cholesterol synthesis peaks at night). Does not require food. Avoid large amounts of grapefruit juice. Avoid heavy alcohol use. Monitor CK if muscle symptoms develop.",
    sideEffects: "Myopathy/myalgia (muscle pain without CK elevation), rhabdomyolysis (rare, severe — CK elevation), headache, abdominal pain, elevated transaminases, new-onset diabetes (class effect).",
    watchOut: "Rhabdomyolysis risk increases with cyclosporine, gemfibrozil, and high-dose fibrates. Avoid 40mg dose in Asian patients (higher plasma levels). Monitor CK if persistent muscle pain/weakness. ALT monitoring recommended — stop if >3x ULN.",
    researchLevel: "Extensively Studied",
    tags: ["Cardiovascular", "Cholesterol", "Primary Prevention"],
    typicalDose: "10–20mg daily",
    cycle: "Continuous",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Rosuvastatin (Crestor) was developed by Shionogi and licensed to AstraZeneca. It is a fully synthetic, highly hydrophilic statin with the greatest LDL-lowering potency per milligram of any available statin. Generic versions (Rosufree, Rosufit, Rozavel) are manufactured in India by multiple companies.",
      keyBenefits: "The JUPITER trial (2008) demonstrated that rosuvastatin reduced cardiovascular events in patients with normal LDL but elevated hsCRP, establishing a role in primary prevention beyond cholesterol. Greater potency allows lower doses to achieve target LDL, reducing myopathy risk.",
      mechanismOfAction: "Competitively inhibits HMG-CoA reductase, the rate-limiting enzyme in hepatic cholesterol biosynthesis. Reduces intracellular cholesterol, upregulating LDL receptors on hepatocyte surface. Increased LDL receptor expression clears circulating LDL from the bloodstream. Pleiotropic effects include reduced CRP, improved endothelial function, and stabilisation of atherosclerotic plaques.",
    },
    pharmacokinetics: { peak: "3–5h", halfLife: "19h", cleared: "~5 days" },
    researchIndications: [
      { category: "Cardiovascular Prevention", effectiveness: "Most Effective", items: [
        { title: "Primary Prevention (JUPITER)", description: "Rosuvastatin 20mg reduced composite MACE by 44% in patients with normal LDL but elevated hsCRP. First evidence of statin benefit in primary prevention beyond LDL." },
        { title: "Secondary Prevention", description: "ASTEROID trial: intensive rosuvastatin 40mg regressed atherosclerotic plaque volume (measured by IVUS) — first statin to demonstrate plaque regression." },
      ]},
    ],
    researchProtocols: [
      { goal: "Primary prevention (moderate-intensity)", dose: "10mg", frequency: "Once daily", route: "Oral" },
      { goal: "Primary prevention (high-intensity)", dose: "20mg", frequency: "Once daily", route: "Oral" },
      { goal: "Secondary prevention / FH", dose: "40mg", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Cyclosporine (major — avoid)", status: "avoid" },
      { name: "Gemfibrozil (rhabdomyolysis risk)", status: "avoid" },
      { name: "Warfarin", status: "monitor" },
      { name: "Antacids (aluminium/magnesium)", status: "caution" },
      { name: "Fibrates (other than gemfibrozil)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "LDL reduction on lipid panel", description: "LDL should fall 46–55% from baseline within 4 weeks. If LDL barely moves at 20mg, question product authenticity." },
      { type: "warn", title: "Muscle symptoms — check CK", description: "Any persistent muscle pain or weakness warrants CK measurement. Stop if CK >10x ULN (rhabdomyolysis risk)." },
    ],
    expectTimeline: [
      { timeframe: "Week 2–4", description: "LDL reduction approaching maximum. Repeat lipid panel at 4–6 weeks to assess response." },
      { timeframe: "Month 3–6", description: "Stable LDL reduction. Anti-inflammatory and plaque-stabilising effects accumulating." },
    ],
    sideEffectNotes: [
      "Myalgia (muscle pain without CK elevation) — 5–10%; often manageable; reduce dose if persistent",
      "Rhabdomyolysis — rare; risk increased with cyclosporine, gemfibrozil; stop if CK very elevated",
      "New-onset diabetes — modest increase in risk (1 per 200 patients over 4 years); cardiovascular benefit outweighs risk in most",
      "Elevated transaminases — usually mild; stop if >3x ULN",
    ],
    references: [
      { title: "JUPITER Trial — NEJM (2008)", context: "Human | 20mg rosuvastatin | 1.9 years | N=17,802", description: "Rosuvastatin reduced composite MACE 44% in primary prevention patients with elevated hsCRP. Expanded statin use beyond cholesterol targets.", url: "https://pubmed.ncbi.nlm.nih.gov/18997196/" },
    ],
    faq: [
      { question: "Do I need to take statins in the evening?", answer: "Cholesterol synthesis peaks at night, so evening dosing has theoretical advantages. However, rosuvastatin's 19-hour half-life means it is effective regardless of timing. Consistent daily dosing at any time of day is what matters most." },
    
      { question: "Why is rosuvastatin more potent than other statins?", answer: "Rosuvastatin is the most potent statin at equivalent doses: 10mg rosuvastatin ≈ 40mg atorvastatin ≈ 80mg simvastatin for LDL reduction. This high potency allows maximum LDL reductions of 55–65% at 40mg, useful for high-risk patients needing intensive lowering." },
      { question: "Does rosuvastatin need to be taken at a specific time?", answer: "Unlike simvastatin and lovastatin (which should be taken at night due to nocturnal cholesterol synthesis), rosuvastatin's long half-life (~19 hours) makes it effective regardless of timing. It can be taken morning or evening with equal efficacy." },
      { question: "Is myopathy a major concern with rosuvastatin?", answer: "Myopathy (muscle pain with elevated CK) risk with rosuvastatin is lower than with simvastatin 80mg or cerivastatin. Risk is highest in: genetic variants reducing rosuvastatin metabolism (SLCO1B1 transporter polymorphisms), combination with gemfibrozil (contraindicated), Asian ethnicity (start at 5mg), and doses above 20mg in patients on cyclosporine." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Crestor approved for hyperlipidaemia, mixed dyslipidaemia, primary prevention." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. Multiple Indian generics." },
    ],
    indianBrands: [
      { brand: "Rosufree 5", manufacturer: "Healing Pharma" },
      { brand: "Rosufree 10", manufacturer: "Healing Pharma" },
      { brand: "Rosufree 20", manufacturer: "Healing Pharma" },
      { brand: "Rozavel 10", manufacturer: "Sun Pharma" },
      { brand: "Rozavel 20", manufacturer: "Sun Pharma" },
    ],
    ukBrands: [
      { brand: "Crestor", manufacturer: "AstraZeneca", notes: "5mg, 10mg, 20mg, 40mg tablets; POM" },
      { brand: "Rosuvastatin (generic)", manufacturer: "Various", notes: "Widely available on NHS prescription" },
    ],
    usBrands: [
      { brand: "Crestor", manufacturer: "AstraZeneca", notes: "5mg, 10mg, 20mg, 40mg; FDA-approved" },
      { brand: "Ezallor Sprinkle", manufacturer: "Sun Pharma", notes: "5mg, 10mg, 20mg, 40mg capsules; swallowing difficulty formulation" },
      { brand: "Rosuvastatin (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Crestor", manufacturer: "AstraZeneca", notes: "5mg, 10mg, 20mg, 40mg tablets" },
      { brand: "Rosuvastatin (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  // ─── MENTAL HEALTH & SLEEP ────────────────────────────────────────────────

  {
    name: "Sertraline",
    slug: "sertraline",
    abbreviation: "SER",
    aliases: ["sertraline", "zoloft", "sertrafine", "sertasign"],
    category: "mental-sleep",
    tagline: "SSRI — depression, OCD, PTSD, panic disorder & social anxiety",
    description: "Sertraline is a selective serotonin reuptake inhibitor (SSRI) with broad spectrum coverage across mood and anxiety disorders. Often preferred as a first-line SSRI due to its favourable safety profile, limited drug interactions (relatively), and broad regulatory approval.",
    color: "#7C3AED",
    vial: "Oral tablet / oral concentrate",
    recon: "25mg, 50mg, 100mg, 150mg, 200mg",
    startDose: "25–50mg",
    targetDose: "50–200mg",
    frequency: "Once daily (morning or evening)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Broad FDA approval: MDD, OCD, PTSD, panic disorder, social anxiety, PMDD. Favourable drug interaction profile vs paroxetine. Once-daily dosing. Generally well-tolerated. Widely studied with decades of post-marketing safety data.",
    tips: "Start at 25mg for 1–2 weeks to minimise initial GI effects. Take consistently at same time each day. Full antidepressant effect takes 4–6 weeks. GI effects (nausea) are common initially — take with food. Do not stop abruptly — taper over weeks.",
    sideEffects: "Nausea, diarrhoea, insomnia or somnolence, dry mouth, sexual dysfunction (delayed ejaculation, anorgasmia, decreased libido), increased sweating, headache. GI side effects usually improve after 2–4 weeks.",
    watchOut: "Serotonin syndrome risk with MAOIs (contraindicated — 14-day washout required), tramadol, triptans. Increased bleeding risk with NSAIDs. Discontinuation syndrome on abrupt stopping — taper dose over weeks. Black box warning: suicidality in children/adolescents (monitor).",
    researchLevel: "Extensively Studied",
    tags: ["Mental Health", "Depression", "Anxiety", "SSRI"],
    typicalDose: "50mg daily",
    cycle: "Minimum 6–12 months for first episode; chronic for recurrent",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Sertraline (Zoloft) was developed by Pfizer and approved by the FDA in 1991. It is among the most widely prescribed medications globally for depression and anxiety. Indian generics (Sertrafine, Sertasign, Zosert) are manufactured by domestic companies. One of the most commonly used SSRIs in clinical practice.",
      keyBenefits: "Broad spectrum of FDA-approved indications. CATIE-D trial and head-to-head meta-analyses consistently rank sertraline among the better-tolerated SSRIs. CYP2D6 inhibition at clinical doses is modest — fewer drug interactions than paroxetine or fluoxetine. FDA approval for 8 separate psychiatric conditions.",
      mechanismOfAction: "Selectively blocks the serotonin transporter (SERT), preventing reuptake of serotonin from the synapse. Increased synaptic 5-HT acts on post-synaptic receptors and triggers downstream neuroplasticity (BDNF upregulation). Clinical effect requires weeks of sustained receptor adaptation — acute serotonin increase alone does not explain the therapeutic lag.",
    },
    pharmacokinetics: { peak: "4–6h", halfLife: "26h", cleared: "~5 days" },
    researchIndications: [
      { category: "Major Depressive Disorder", effectiveness: "Most Effective", items: [
        { title: "MDD Treatment", description: "STAR*D trial: sertraline among first-line options with 28–33% remission rates. Head-to-head meta-analyses suggest sertraline has best overall efficacy-tolerability balance among common antidepressants (Cipriani et al., Lancet 2018)." },
      ]},
      { category: "Anxiety Disorders", effectiveness: "Most Effective", items: [
        { title: "OCD, PTSD, Panic, Social Anxiety", description: "FDA-approved for all four. PTSD evidence particularly strong — considered first-line pharmacotherapy by most VA/DoD and international guidelines." },
      ]},
    ],
    researchProtocols: [
      { goal: "MDD / Anxiety — Initial", dose: "25mg", frequency: "Once daily for 1–2 weeks", route: "Oral" },
      { goal: "MDD / Anxiety — Standard", dose: "50mg", frequency: "Once daily", route: "Oral" },
      { goal: "MDD / OCD — Higher dose", dose: "100–200mg", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs (phenelzine, tranylcypromine)", status: "avoid" },
      { name: "Tramadol / triptans (serotonin syndrome)", status: "caution" },
      { name: "NSAIDs / aspirin (bleeding risk)", status: "monitor" },
      { name: "Warfarin", status: "monitor" },
      { name: "Linezolid", status: "avoid" },
    ],
    qualityIndicators: [
      { type: "pass", title: "GI effects in first 1–2 weeks", description: "Nausea and loose stools in weeks 1–2 are characteristic of SSRI initiation. Absence of any GI effect at 50mg may indicate poor absorption or counterfeit product." },
      { type: "warn", title: "Effects take 4–6 weeks — patience required", description: "Antidepressant effects take weeks — do not judge efficacy at 2 weeks. 4–6 weeks minimum before dose escalation or switching." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "Initial GI side effects. Possible sleep changes. No mood improvement expected yet." },
      { timeframe: "Week 2–4", description: "Sleep and energy may improve before mood. Anxiety symptoms often improve before depression." },
      { timeframe: "Week 4–6", description: "Full antidepressant effect begins to emerge. Assess response at 6 weeks." },
      { timeframe: "Month 3–6", description: "Continued improvement. Minimum 6–12 months treatment for first episode before considering taper." },
    ],
    sideEffectNotes: [
      "Sexual dysfunction — delayed ejaculation, reduced libido, anorgasmia in 20–40% of users; may persist throughout treatment; discuss with prescriber",
      "Initial nausea — take with food; improves after 2–4 weeks",
      "Insomnia or sedation — take in morning if insomnia, evening if sedating",
      "Increased sweating — common, dose-related",
      "Discontinuation syndrome — dizziness, nausea, electric shock sensations if stopped abruptly; taper over 2–4 weeks",
    ],
    references: [
      { title: "Cipriani A et al. — Lancet (2018)", context: "Meta-analysis | 21 antidepressants | N=116,477", description: "Network meta-analysis of antidepressants: sertraline rated highest for overall balance of efficacy and acceptability. Landmark evidence synthesis.", url: "https://pubmed.ncbi.nlm.nih.gov/29477251/" },
    ],
    faq: [
      { question: "How long before sertraline works?", answer: "The antidepressant effect requires 4–6 weeks of consistent dosing. Sleep and energy often improve before mood. Anxiety symptoms may improve sooner (2–3 weeks). Do not assess efficacy before 6 weeks at a therapeutic dose (≥50mg)." },
      { question: "Can I drink alcohol on sertraline?", answer: "Alcohol is a CNS depressant and can worsen depression. Small amounts are not strictly contraindicated but increase CNS side effects (dizziness, sedation). Heavy drinking significantly worsens depression outcomes and should be avoided." },
    
      { question: "How long does sertraline take to work for depression?", answer: "Initial improvements in sleep, appetite, and energy appear within 1–2 weeks. Significant improvement in mood and anxiety typically requires 4–6 weeks. Full therapeutic effect for depression or OCD may take 8–12 weeks. Do not discontinue early if no effect is seen in the first 2 weeks." },
      { question: "Can I drink alcohol while taking sertraline?", answer: "Alcohol should be avoided with sertraline. Both sertraline and alcohol affect serotonin pathways, and the combination can increase sedation, worsen depression, and reduce medication effectiveness. Some patients also experience unexpectedly severe intoxication from small amounts of alcohol on sertraline." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Zoloft approved for MDD, OCD, panic, PTSD, social anxiety, PMDD. Generic widely available." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Sertrafine 50" },
      { brand: "Sertrafine 100" },
      { brand: "Sertasign 50" },
      { brand: "Zosert 50", manufacturer: "Sun Pharma" },
      { brand: "Zosert 100", manufacturer: "Sun Pharma" },
    ],
    ukBrands: [
      { brand: "Lustral", manufacturer: "Pfizer", notes: "50mg, 100mg tablets; licensed for depression, OCD, PTSD, panic disorder" },
      { brand: "Sertraline (generic)", manufacturer: "Various", notes: "Widely available on NHS" },
    ],
    usBrands: [
      { brand: "Zoloft", manufacturer: "Pfizer", notes: "25mg, 50mg, 100mg; FDA-approved for multiple indications" },
      { brand: "Sertraline (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Zoloft", manufacturer: "Pfizer", notes: "25mg, 50mg, 100mg" },
      { brand: "Sertraline (generic)", manufacturer: "Various", notes: "Generic versions widely available" },
    ],
  },

  {
    name: "Bupropion",
    slug: "bupropion",
    abbreviation: "BUP",
    aliases: ["bupropion", "wellbutrin", "bupron", "zyban"],
    category: "mental-sleep",
    tagline: "NDRI antidepressant — depression, ADHD & smoking cessation",
    description: "Bupropion is a norepinephrine-dopamine reuptake inhibitor with a unique antidepressant mechanism. Unlike SSRIs, it has minimal sexual side effects and is weight-neutral/weight-reducing. Also approved for smoking cessation and studied for ADHD.",
    color: "#6D28D9",
    vial: "Oral tablet / extended-release tablet",
    recon: "75mg, 100mg IR; 150mg, 300mg XL",
    startDose: "150mg XL",
    targetDose: "300mg XL",
    frequency: "Once daily (XL formulation)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Minimal sexual dysfunction (unlike SSRIs). Weight neutral or weight-reducing (rare among antidepressants). Active for smoking cessation (Zyban). Useful for ADHD symptoms. Activating — helpful for fatigue/lethargy-predominant depression.",
    tips: "Take in morning — stimulating effect can cause insomnia if taken later. Avoid exceeding maximum daily dose (400mg) — seizure risk increases. Do not crush extended-release tablets. Avoid in patients with seizure disorders or eating disorders.",
    sideEffects: "Insomnia, dry mouth, constipation, tachycardia, headache, agitation. Dose-dependent seizure risk (exceeds 0.5% above 450mg/day).",
    watchOut: "Lowers seizure threshold — contraindicated in seizure disorders, current/recent bulimia or anorexia nervosa (electrolyte imbalance increases seizure risk). Avoid abrupt withdrawal. Interactions with MAOIs (washout required).",
    researchLevel: "Extensively Studied",
    tags: ["Mental Health", "Depression", "NDRI", "Smoking Cessation"],
    typicalDose: "150–300mg XL once daily",
    cycle: "Minimum 6–12 months for depression",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Bupropion (Wellbutrin) was developed by Burroughs Wellcome and approved in 1985. After withdrawal and re-approval in 1989 with a lower maximum dose (seizure risk), it has become a widely used antidepressant and smoking cessation aid. Unique among antidepressants for its dopaminergic/noradrenergic mechanism without serotonergic activity.",
      keyBenefits: "No sexual dysfunction (most common reason for SSRI discontinuation). Weight neutral or weight-reducing. Stimulating profile useful for anhedonia and fatigue. FDA-approved for seasonal affective disorder. The only non-nicotine, non-SSRI approved for smoking cessation (as Zyban).",
      mechanismOfAction: "Inhibits reuptake of norepinephrine (NET) and dopamine (DAT). Does not act on serotonin transporters. Dopamine pathway involvement produces the stimulating, activating character and minimal sexual side effects. Weak nicotinic acetylcholine receptor antagonist — mechanism for smoking cessation.",
    },
    pharmacokinetics: { peak: "3h (XL)", halfLife: "20–37h", cleared: "~5 days" },
    researchIndications: [
      { category: "Major Depressive Disorder", effectiveness: "Most Effective", items: [
        { title: "Depression with fatigue/low energy", description: "Particularly effective where anhedonia and fatigue are prominent. Meta-analyses show comparable efficacy to SSRIs overall, with superior outcomes for lethargy-dominant subtypes." },
      ]},
      { category: "Smoking Cessation", effectiveness: "Effective", items: [
        { title: "Nicotine Dependence", description: "12-week courses double quit rates vs placebo. Comparable to nicotine replacement therapy; combination with NRT may be synergistic." },
      ]},
    ],
    researchProtocols: [
      { goal: "Depression — Initial", dose: "150mg XL", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Depression — Standard", dose: "300mg XL", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Smoking cessation", dose: "150mg XL", frequency: "Once daily for 3 days, then twice daily for 7–12 weeks", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs", status: "avoid" },
      { name: "Tamoxifen (bupropion inhibits CYP2D6)", status: "caution" },
      { name: "Alcohol (lowers seizure threshold)", status: "caution" },
      { name: "Other drugs lowering seizure threshold", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Activating/stimulating effect", description: "Genuine bupropion produces a more energising, activating effect than SSRIs. Insomnia or increased energy in weeks 1–2 confirms pharmacological activity." },
      { type: "warn", title: "Seizure risk at high doses", description: "Do not exceed 400mg/day. Risk of seizures is dose-dependent and increases dramatically above 450mg/day." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "Stimulating effects emerge. Possible insomnia, dry mouth." },
      { timeframe: "Week 2–4", description: "Energy and motivation improve before full mood effects." },
      { timeframe: "Week 4–6", description: "Full antidepressant effect developing." },
    ],
    sideEffectNotes: [
      "Insomnia — take in morning only; stimulating mechanism disrupts sleep if taken at night",
      "Dry mouth and constipation — anticholinergic effects; increase fluid and fibre",
      "Seizure risk — dose-dependent; absolute maximum 400mg/day; contraindicated in seizure history",
      "Agitation/anxiety — especially at higher doses; may require dose reduction",
    ],
    references: [
      { title: "Jorenby DE et al. — JAMA (1999)", context: "Human | 300mg/day | 7 weeks | N=893", description: "Bupropion vs NRT vs combination: bupropion comparable to NRT for smoking cessation; combination superior to either.", url: "https://pubmed.ncbi.nlm.nih.gov/10029121/" },
    ],
    faq: [
      { question: "Does bupropion really not cause sexual side effects?", answer: "Correct — bupropion has minimal to no sexual side effects in controlled trials (similar to placebo rates for sexual dysfunction). It is commonly prescribed as a switch option for patients experiencing sexual dysfunction on SSRIs, or added to SSRIs to counteract their sexual side effects." },
    
      { question: "How does bupropion help with smoking cessation?", answer: "Bupropion reduces nicotine cravings by inhibiting dopamine and noradrenaline reuptake in the reward pathway, mimicking the dopaminergic stimulation nicotine produces. It is started 1–2 weeks before the quit date at 150mg/day for 3 days, then 150mg twice daily for 7–12 weeks." },
      { question: "What makes bupropion different from SSRIs for depression?", answer: "Unlike SSRIs, bupropion does not inhibit serotonin reuptake and carries minimal sexual side effects, weight gain, or sedation. It primarily acts on dopamine and noradrenaline. It is often preferred for patients who cannot tolerate SSRI sexual dysfunction or are concerned about weight gain." },
      { question: "Can bupropion cause seizures?", answer: "Bupropion lowers the seizure threshold in a dose-dependent manner. Risk is approximately 0.1% at therapeutic doses, rising sharply above 450mg/day. Do not use in patients with seizure disorders, eating disorders (bulimia/anorexia — electrolyte imbalances increase risk), or those abruptly withdrawing from alcohol or benzodiazepines." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Wellbutrin (depression), Zyban (smoking cessation), Wellbutrin XL (seasonal affective disorder)." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Bupron XL 150", manufacturer: "Sun Pharma" },
      { brand: "Bupron XL 300", manufacturer: "Sun Pharma" },
      { brand: "Buproban 150" },
    ],
    ukBrands: [
      { brand: "Zyban", manufacturer: "GSK", notes: "150mg; licensed for smoking cessation only" },
      { brand: "Bupropion (generic)", manufacturer: "Various", notes: "Available via specialist; off-label for depression in UK" },
    ],
    usBrands: [
      { brand: "Wellbutrin", manufacturer: "GSK", notes: "75mg, 100mg; for MDD" },
      { brand: "Wellbutrin SR", manufacturer: "GSK", notes: "100mg, 150mg, 200mg sustained-release" },
      { brand: "Wellbutrin XL", manufacturer: "Bausch Health", notes: "150mg, 300mg extended-release" },
      { brand: "Zyban", manufacturer: "GSK", notes: "150mg SR; smoking cessation" },
      { brand: "Aplenzin", manufacturer: "Bausch Health", notes: "174mg, 348mg, 522mg extended-release (hydrobromide salt)" },
      { brand: "Bupropion (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Wellbutrin XL", manufacturer: "Bausch Health", notes: "150mg, 300mg" },
      { brand: "Zyban", manufacturer: "GSK", notes: "150mg; smoking cessation" },
      { brand: "Bupropion (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Buspirone",
    slug: "buspirone",
    abbreviation: "BUS",
    aliases: ["buspirone", "buspar", "buspin", "busiron"],
    category: "mental-sleep",
    tagline: "Partial 5-HT1A agonist — generalised anxiety disorder without sedation",
    description: "Buspirone is a non-benzodiazepine anxiolytic that selectively acts on 5-HT1A receptors. Effective for generalised anxiety disorder (GAD) without the sedation, dependence potential, or cognitive impairment of benzodiazepines.",
    color: "#5B21B6",
    vial: "Oral tablet",
    recon: "5mg, 10mg",
    startDose: "5mg",
    targetDose: "15–30mg/day (in divided doses)",
    frequency: "Two to three times daily",
    route: "Oral",
    storage: "Room temperature",
    benefits: "No dependence or withdrawal syndrome. No sedation. No cognitive impairment. No interaction with alcohol. Effective for GAD with regular use. Suitable for long-term anxiolytic maintenance without benzo risks.",
    tips: "Take at consistent times with or without food — consistent food intake is important (food increases absorption). Requires 2–4 weeks for full effect — not for acute anxiety. Cannot be used PRN like benzodiazepines.",
    sideEffects: "Dizziness, headache, nausea, nervousness. 'Transient worsening' of anxiety in first 1–2 weeks. Rarely: restlessness, blurred vision.",
    watchOut: "Not effective for panic disorder, OCD, or phobias — only GAD. Drug interactions with MAOIs (avoid). Grapefruit juice raises plasma levels 4.3x — avoid. Not an acute anxiolytic.",
    researchLevel: "Well Researched",
    tags: ["Mental Health", "Anxiety", "GAD"],
    typicalDose: "15mg/day in 2–3 divided doses",
    cycle: "Long-term (GAD maintenance)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Buspirone (Buspar) was developed by Bristol-Myers Squibb and approved in 1986. It was the first anxiolytic developed without benzodiazepine, barbiturate, or alcohol dependence potential. Unique mechanism via partial 5-HT1A agonism and dopamine D2 antagonism makes it the only non-addictive anxiolytic for GAD.",
      keyBenefits: "No addiction or dependence potential. No sedation or cognitive impairment. No alcohol interaction. Safe for elderly. Effective for GAD maintenance with regular use (unlike benzodiazepines, effective only for GAD maintenance, not panic or phobia).",
      mechanismOfAction: "Partial agonist at 5-HT1A receptors (both pre and postsynaptic) — net effect is reduction of serotonergic tone in anxiety circuits. Also weakly antagonises dopamine D2 receptors. Unlike benzodiazepines, does not enhance GABA activity — explains absence of sedation and dependence.",
    },
    pharmacokinetics: { peak: "0.9–1.5h", halfLife: "2–3h (active metabolite 1-PP: 6h)", cleared: "~24h" },
    researchIndications: [
      { category: "Generalised Anxiety Disorder", effectiveness: "Effective", items: [
        { title: "GAD Treatment", description: "Multiple RCTs show buspirone comparable to diazepam and lorazepam for GAD in long-term use. Onset requires 2–4 weeks — not suitable for acute use." },
      ]},
    ],
    researchProtocols: [
      { goal: "GAD — Initial", dose: "5mg", frequency: "Three times daily", route: "Oral" },
      { goal: "GAD — Standard", dose: "10mg", frequency: "Twice to three times daily", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs", status: "avoid" },
      { name: "Grapefruit juice (4.3x plasma increase)", status: "avoid" },
      { name: "SSRIs / venlafaxine (serotonin augmentation)", status: "compatible" },
      { name: "CYP3A4 inhibitors (erythromycin, itraconazole)", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Absence of sedation distinguishes buspirone", description: "Unlike benzodiazepines, buspirone should not cause sedation or cognitive effects. If heavily sedating, suspect contamination or wrong product." },
      { type: "warn", title: "2–4 week delay for anxiolytic effect", description: "Patients expecting immediate benzo-like relief will be disappointed. Buspirone requires regular use for 2–4 weeks to reach therapeutic effect." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "Possible transient anxiety worsening and dizziness. No significant anxiolytic effect yet." },
      { timeframe: "Week 2–4", description: "Anxiety symptoms begin to reduce with consistent use." },
      { timeframe: "Month 1–2", description: "Full GAD symptom relief comparable to benzodiazepines in studies." },
    ],
    sideEffectNotes: [
      "Dizziness and headache — most common in first 2 weeks; resolves with continued use",
      "Nausea — take with food",
      "Paradoxical anxiety increase — weeks 1–2; a transient effect; persist with dosing",
    ],
    references: [
      { title: "Feighner JP et al. — J Clin Psychiatry (1982)", context: "Human | 15–30mg/day | 4 weeks | N=290", description: "Buspirone vs diazepam for GAD: comparable efficacy with superior cognitive and sedation profile for buspirone.", url: "https://pubmed.ncbi.nlm.nih.gov/6124168/" },
    ],
    faq: [
      { question: "Can buspirone replace my benzodiazepine?", answer: "Not directly — buspirone has a 2–4 week delay to effect, so you cannot switch overnight. It must be introduced while tapering the benzodiazepine slowly. Buspirone is effective for GAD maintenance but not for panic attacks or acute anxiety situations." },
    
      { question: "How long does buspirone take to work for anxiety?", answer: "Unlike benzodiazepines, buspirone requires 2–4 weeks of daily dosing before therapeutic anxiolytic effects are apparent. It does not produce immediate relief and is unsuitable for acute anxiety episodes. Full benefit is typically seen at 4–6 weeks. This gradual onset is why patient compliance during the initial period is critical." },
      { question: "Does buspirone cause dependence or withdrawal?", answer: "Unlike benzodiazepines, buspirone does not cause physical dependence, tolerance, or clinically significant withdrawal. It acts on 5-HT1A receptors rather than GABA receptors, eliminating the addiction and discontinuation syndrome seen with benzodiazepines. This makes it preferable for long-term anxiety management." },
      { question: "Can buspirone be used with antidepressants?", answer: "Buspirone is commonly augmented with SSRIs and SNRIs for GAD and treatment-resistant depression. The combination is generally well-tolerated. Avoid combining with MAOIs (risk of serotonin syndrome). Grapefruit juice significantly raises buspirone levels (4.3×) — warn patients to avoid it." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "BuSpar approved for GAD. Generic available." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Buspin 5", manufacturer: "Sun Pharma" },
      { brand: "Buspin 10", manufacturer: "Sun Pharma" },
      { brand: "Busiron 5" },
    ],
    ukBrands: [
      { brand: "Buspirone (generic)", manufacturer: "Various", notes: "5mg, 10mg tablets; POM; not widely available — largely off-licence" },
    ],
    usBrands: [
      { brand: "BuSpar", manufacturer: "Bristol-Myers Squibb", notes: "5mg, 10mg, 15mg, 30mg; no longer marketed (generic era)" },
      { brand: "Buspirone (generic)", manufacturer: "Various", notes: "FDA-approved generics widely available" },
    ],
    canadaBrands: [
      { brand: "Buspirone (generic)", manufacturer: "Various", notes: "5mg, 10mg; available on prescription" },
    ],
  },

  {
    name: "Zopiclone",
    slug: "zopiclone",
    abbreviation: "ZOP",
    aliases: ["zopiclone", "zopifresh", "zopisign", "imovane"],
    category: "mental-sleep",
    tagline: "Non-benzodiazepine hypnotic — short-term insomnia",
    description: "Zopiclone is a cyclopyrrolone hypnotic that acts on GABA-A receptors but at a different site than benzodiazepines. Used for short-term insomnia (maximum 4 weeks). Reduces sleep onset latency and nocturnal awakening.",
    color: "#4C1D95",
    vial: "Oral tablet",
    recon: "3.75mg, 7.5mg, 10mg",
    startDose: "3.75–7.5mg",
    targetDose: "7.5mg",
    frequency: "Once nightly (immediately before bed)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Reduces sleep onset latency 30–50 minutes. Reduces nocturnal awakenings. Preserves sleep architecture better than benzodiazepines (less REM suppression). Predictable kinetics for 6–8h sleep period.",
    tips: "Take immediately before going to bed — do not take and remain awake. Ensure 7–8 hours available for sleep (avoid next-morning impairment). Not for long-term use (maximum 2–4 weeks). Bitter metallic taste in morning is characteristic.",
    sideEffects: "Bitter metallic taste (morning — very characteristic), daytime drowsiness, dry mouth, dizziness, impaired coordination. Risk of dependence with prolonged use. Complex sleep behaviours (sleep-driving, sleep-eating) rare.",
    watchOut: "Do not drive or operate machinery the morning after use — residual impairment. Alcohol dramatically potentiates CNS depression. Addiction risk with prolonged use. Abrupt discontinuation after prolonged use causes withdrawal (similar to benzodiazepines). Pregnancy and breastfeeding — avoid.",
    researchLevel: "Well Researched",
    tags: ["Sleep", "Insomnia", "Hypnotic"],
    typicalDose: "7.5mg nightly",
    cycle: "Maximum 2–4 weeks",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Zopiclone (Imovane) is a 'Z-drug' belonging to the cyclopyrrolone class, developed by Rhône-Poulenc (France) and widely used since the 1980s. It binds allosterically to GABA-A receptors at the benzodiazepine binding site with slightly different receptor subtype selectivity. Available in India as Zopifresh, Zopfresh, and Zopisign.",
      keyBenefits: "Shorter-acting than most traditional benzodiazepines used for sleep. Better preservation of slow-wave sleep architecture. Predictable 6–8h kinetics suited to overnight use. Available generically at very low cost.",
      mechanismOfAction: "Binds to the benzodiazepine recognition site on GABA-A receptor complexes, enhancing chloride channel opening in response to GABA. The net effect is increased inhibitory neurotransmission — producing sedation, hypnosis, and muscle relaxation. Zopiclone's selectivity for certain GABA-A subunit combinations (α1-containing) explains its primarily sedating vs anxiolytic profile.",
    },
    pharmacokinetics: { peak: "1.5–2h", halfLife: "5h", cleared: "~24h" },
    researchIndications: [
      { category: "Insomnia", effectiveness: "Most Effective", items: [
        { title: "Short-term insomnia", description: "Reduces sleep onset latency 30–50min; reduces nocturnal awakenings; increases total sleep time vs placebo. Indicated for short-term use only (2–4 weeks)." },
      ]},
    ],
    researchProtocols: [
      { goal: "Insomnia — elderly or sensitive", dose: "3.75mg", frequency: "Once nightly (immediately before bed)", route: "Oral" },
      { goal: "Insomnia — standard", dose: "7.5mg", frequency: "Once nightly", route: "Oral" },
    ],
    interactions: [
      { name: "Alcohol (profound CNS depression)", status: "avoid" },
      { name: "Other CNS depressants (opioids, benzodiazepines)", status: "avoid" },
      { name: "CYP3A4 inhibitors (erythromycin, ketoconazole)", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Bitter metallic morning aftertaste", description: "A characteristic bitter/metallic taste in the morning is a hallmark of zopiclone metabolism. Its presence strongly suggests genuine product." },
      { type: "warn", title: "Maximum 4 weeks use", description: "Dependence and tolerance develop with prolonged use. Use for the shortest effective duration." },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Sleep onset facilitated." },
      { timeframe: "6–8 hours", description: "Therapeutic window for sleep. Avoid being woken during this window." },
      { timeframe: "After stopping", description: "Rebound insomnia for 1–3 nights — normal; gradually resolves." },
    ],
    sideEffectNotes: [
      "Bitter metallic taste — very common; characteristic of the drug",
      "Daytime drowsiness — residual impairment; avoid driving next morning",
      "Dependence — develops within 2–4 weeks of nightly use",
      "Complex sleep behaviours — sleep-walking, sleep-driving; rare but stop drug if occurs",
    ],
    references: [
      { title: "Hajak G et al. — J Sleep Res (2001)", context: "Human | 7.5mg | 4 weeks", description: "Zopiclone vs placebo: significant improvement in sleep onset and total sleep time. Acceptable next-day impairment at 7.5mg.", url: "https://pubmed.ncbi.nlm.nih.gov/11364861/" },
    ],
    faq: [
      { question: "Is zopiclone safer than sleeping pills?", answer: "Zopiclone is generally considered safer than traditional benzodiazepines (less REM suppression, shorter-acting) but carries similar risks of dependence with prolonged use. It is not fundamentally safer for long-term use. Cognitive-behavioural therapy for insomnia (CBT-I) is the recommended first-line treatment for chronic insomnia." },
    
      { question: "Is zopiclone addictive?", answer: "Yes — zopiclone has significant dependence and tolerance potential with nightly use beyond 2–4 weeks. Physical dependence develops in 30–50% of patients using it nightly for 4+ weeks. Psychological dependence is also common. It is classified as a controlled substance (Class C in the UK) and should be used for no more than 2–4 weeks at a time." },
      { question: "What is the metallic taste from zopiclone?", answer: "A bitter or metallic taste (dysgeusia) occurs in 25–35% of users and is zopiclone's most characteristic side effect. It is caused by the drug being secreted in saliva. The taste typically persists for several hours into the morning. Using it does not harm taste function permanently — it resolves upon stopping." },
      { question: "Can I develop sleep without zopiclone after long-term use?", answer: "Yes, but rebound insomnia is common for 1–2 weeks after stopping zopiclone, especially after long-term use. A gradual taper (reducing dose by 25% per week) minimises rebound. Concurrent CBT-I (cognitive-behavioural therapy for insomnia) significantly improves sleep quality and reduces withdrawal insomnia." },
      ],
    regulatoryStatus: [
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule X. Controlled substance — prescription required." },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Schedule IV controlled drug. Available as Imovane." },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "The R-enantiomer eszopiclone (Lunesta) is approved; racemic zopiclone is not." },
    ],
    indianBrands: [
      { brand: "Zopifresh 7.5" },
      { brand: "Zopfresh 10" },
      { brand: "Zopisign 7.5" },
      { brand: "Zunestar 2", notes: "Eszopiclone — R-enantiomer" },
      { brand: "Hypnite 1" },
    ],
    ukBrands: [
      { brand: "Zimovane", manufacturer: "Sanofi", notes: "3.75mg, 7.5mg; Schedule IV; 4-week prescription limit" },
      { brand: "Zopiclone (generic)", manufacturer: "Various", notes: "Available on NHS prescription; short-term insomnia only" },
    ],
    usBrands: [
      { brand: "Lunesta (eszopiclone)", manufacturer: "Sunovion", notes: "1mg, 2mg, 3mg; zopiclone not FDA-approved; eszopiclone (R-isomer) is approved" },
    ],
    canadaBrands: [
      { brand: "Imovane", manufacturer: "Sanofi", notes: "5mg, 7.5mg; Schedule IV" },
      { brand: "Zopiclone (generic)", manufacturer: "Various", notes: "Available on Rx" },
    ],
  },

  // ─── PAIN & ANTI-INFLAMMATORY ─────────────────────────────────────────────

  {
    name: "Gabapentin",
    slug: "gabapentin",
    abbreviation: "GAB",
    aliases: ["gabapentin", "neurontin", "gabasign", "gabatop"],
    category: "pain",
    tagline: "Alpha-2-delta ligand — neuropathic pain, epilepsy & anxiety",
    description: "Gabapentin was developed as a GABA analogue but does not act on GABA receptors. It binds the alpha-2-delta subunit of voltage-gated calcium channels, reducing neuronal excitability and neurotransmitter release. Used for neuropathic pain, focal epilepsy, and restless legs syndrome.",
    color: "#92400E",
    vial: "Oral capsule / tablet",
    recon: "100mg, 300mg, 400mg, 600mg, 800mg",
    startDose: "300mg",
    targetDose: "900–1800mg/day (in divided doses)",
    frequency: "Three times daily",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Effective for neuropathic pain (diabetic, post-herpetic, central). FDA approved for focal seizures (adjunctive) and postherpetic neuralgia. Studied for generalised anxiety disorder, fibromyalgia, alcohol withdrawal.",
    tips: "Must titrate slowly (every 1–3 days) to avoid side effects. Take with or without food. Renal dose adjustment required for CKD. Non-linear pharmacokinetics — absorption decreases with higher single doses; use three times daily dosing rather than twice daily at higher doses.",
    sideEffects: "Somnolence, dizziness, ataxia, fatigue, peripheral oedema, weight gain, cognitive impairment. Tolerance develops to sedative effects. Abuse potential at high doses (euphoria — especially in opioid-tolerant individuals).",
    watchOut: "Caution with CNS depressants and opioids — additive respiratory depression (FDA black box with opioids). Not abruptly stop in epilepsy patients (seizure risk). Schedule V controlled in several US states. Renal dose adjustment mandatory in CKD.",
    researchLevel: "Extensively Studied",
    tags: ["Pain", "Neuropathic", "Anticonvulsant"],
    typicalDose: "300mg three times daily",
    cycle: "Ongoing for chronic neuropathic pain",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Gabapentin (Neurontin) was originally designed as a GABA analogue anticonvulsant but was discovered to act via voltage-gated calcium channel alpha-2-delta subunits. Approved for adjunctive epilepsy treatment (1993) and postherpetic neuralgia (2002). Widely used off-label for numerous neuropathic and neurological conditions.",
      keyBenefits: "Effective for neuropathic pain — particularly postherpetic neuralgia and diabetic peripheral neuropathy. No significant drug interactions with most antiseizure medications. No P450 metabolism — predictable pharmacokinetics. No blood monitoring required. Effective as add-on for partial seizures.",
      mechanismOfAction: "Binds the alpha-2-delta (α2δ) auxiliary subunit of voltage-gated calcium channels in the CNS. This reduces calcium influx at presynaptic terminals, decreasing release of excitatory neurotransmitters including glutamate, norepinephrine, and substance P. Net effect: reduces neuronal hyperexcitability underlying neuropathic pain and seizures.",
    },
    pharmacokinetics: { peak: "2–3h", halfLife: "5–7h", cleared: "~36h" },
    researchIndications: [
      { category: "Neuropathic Pain", effectiveness: "Most Effective", items: [
        { title: "Postherpetic Neuralgia", description: "FDA-approved. 1800mg/day reduces pain by >50% in 43% vs 12% placebo. One of the best-evidenced treatments for PHN." },
        { title: "Diabetic Peripheral Neuropathy", description: "Multiple RCTs support 900–3600mg/day for DPN pain. Comparable to duloxetine in pain reduction." },
      ]},
      { category: "Epilepsy", effectiveness: "Effective", items: [
        { title: "Focal Seizures", description: "FDA-approved as adjunctive treatment. Reduces focal seizure frequency by >50% in 40–50% of refractory patients." },
      ]},
    ],
    researchProtocols: [
      { goal: "Neuropathic pain — Initial", dose: "300mg", frequency: "Once daily (night, for 3 days)", route: "Oral" },
      { goal: "Neuropathic pain — Titration", dose: "300mg", frequency: "Three times daily (target 900mg/day)", route: "Oral" },
      { goal: "Neuropathic pain — Full dose", dose: "600mg", frequency: "Three times daily (1800mg/day)", route: "Oral" },
    ],
    interactions: [
      { name: "Opioids (additive respiratory depression)", status: "caution" },
      { name: "CNS depressants, alcohol", status: "caution" },
      { name: "Antacids (aluminium/magnesium — reduce absorption)", status: "caution" },
      { name: "Morphine / hydrocodone (increases gabapentin levels)", status: "monitor" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Dizziness and somnolence at initiation", description: "Gabapentin consistently causes dizziness and sleepiness when starting — titrating up slowly is essential." },
      { type: "warn", title: "Renal dose adjustment required", description: "Gabapentin is excreted entirely renally — significant dose reduction required in CKD (eGFR <60). Failure to adjust risks toxicity." },
    ],
    expectTimeline: [
      { timeframe: "Week 1–2", description: "Sedation and dizziness peak during titration. Pain relief may begin." },
      { timeframe: "Week 3–4", description: "Tolerance to sedation develops. Pain reduction becomes apparent." },
      { timeframe: "Month 2+", description: "Maximum pain relief at stable dose. Regular reassessment of dose and need." },
    ],
    sideEffectNotes: [
      "Somnolence and dizziness — especially at initiation and during titration; improves with tolerance over 2–4 weeks",
      "Peripheral oedema — ankle swelling common at higher doses",
      "Cognitive impairment/'brain fog' — dose-dependent",
      "Weight gain — appetite stimulation",
      "Misuse potential — euphoria at high doses; increased in opioid-dependent individuals",
    ],
    references: [
      { title: "Rowbotham M et al. — JAMA (1998)", context: "Human | 3600mg/day | 8 weeks | N=229", description: "Postherpetic neuralgia RCT: gabapentin 3600mg/day significantly reduces pain vs placebo. Led to FDA approval for PHN.", url: "https://pubmed.ncbi.nlm.nih.gov/9809728/" },
    ],
    faq: [
      { question: "Is gabapentin addictive?", answer: "Gabapentin has abuse potential, particularly in individuals with a history of opioid use disorder (where it can cause euphoria). Physical dependence develops with prolonged use — stopping abruptly causes withdrawal. It is not as addictive as opioids or benzodiazepines but should be tapered when discontinuing." },
    
      { question: "Is gabapentin addictive?", answer: "Gabapentin has misuse potential, particularly in patients with opioid use disorder, where rates of misuse reach 15–22%. It does not cause classic opioid-type dependence but can cause withdrawal (anxiety, insomnia, sweating, seizures) after abrupt discontinuation following long-term use. Taper gradually when stopping." },
      { question: "How does gabapentin help nerve pain?", answer: "Gabapentin binds to the alpha-2-delta subunit of voltage-gated calcium channels in the dorsal horn of the spinal cord, reducing glutamate release and calming hyperexcitable nociceptive neurons. This mechanism is particularly effective for neuropathic pain states including diabetic neuropathy, post-herpetic neuralgia, and fibromyalgia." },
      { question: "Why does gabapentin need to be taken three times a day?", answer: "Gabapentin has a short half-life of 5–7 hours and uses a saturable, dose-dependent transport system for intestinal absorption. Once the intestinal transporters are saturated (~1,200–1,800mg dose), absorption does not increase further. This is why doses are split throughout the day rather than given as a single large dose." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Neurontin approved for focal seizures and PHN. Schedule V in some states. Off-label use very widespread." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Gabasign 300" },
      { brand: "Gabatop 100" },
      { brand: "Gabatop 300" },
      { brand: "Gabapin 300", manufacturer: "Intas" },
    ],
    ukBrands: [
      { brand: "Neurontin", manufacturer: "Pfizer", notes: "100mg, 300mg, 400mg capsules; POM" },
      { brand: "Gabapentin (generic)", manufacturer: "Various", notes: "Class C controlled drug since 2019; widely prescribed" },
    ],
    usBrands: [
      { brand: "Neurontin", manufacturer: "Pfizer", notes: "100mg, 300mg, 400mg; FDA-approved for epilepsy and PHN" },
      { brand: "Gralise", manufacturer: "Depomed", notes: "300mg, 600mg extended-release; once-daily" },
      { brand: "Horizant (gabapentin enacarbil)", manufacturer: "Arbor", notes: "600mg; FDA-approved for RLS and PHN" },
      { brand: "Gabapentin (generic)", manufacturer: "Various", notes: "Most widely used form; FDA-approved" },
    ],
    canadaBrands: [
      { brand: "Neurontin", manufacturer: "Pfizer", notes: "100mg, 300mg, 400mg" },
      { brand: "Gabapentin (generic)", manufacturer: "Various", notes: "Generic versions available on Rx" },
    ],
  },

  {
    name: "Pregabalin",
    slug: "pregabalin",
    abbreviation: "PRE",
    aliases: ["pregabalin", "lyrica", "nervigesic", "pregabid"],
    category: "pain",
    tagline: "Alpha-2-delta ligand — neuropathic pain, fibromyalgia & generalised anxiety",
    description: "Pregabalin is a successor to gabapentin with linear pharmacokinetics, higher potency, and faster absorption. Approved for neuropathic pain, fibromyalgia, adjunctive epilepsy therapy, and generalised anxiety disorder (in Europe). Higher bioavailability than gabapentin at equivalent doses.",
    color: "#78350F",
    vial: "Oral capsule",
    recon: "25mg, 50mg, 75mg, 150mg, 300mg",
    startDose: "75mg",
    targetDose: "150–300mg/day (in divided doses)",
    frequency: "Twice or three times daily",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Linear pharmacokinetics (unlike gabapentin). Higher bioavailability (90% vs 60% gabapentin). Faster onset. Effective for fibromyalgia, neuropathic pain, and anxiety (European approval for GAD). Twice-daily dosing sufficient for most indications.",
    tips: "Twice-daily dosing is effective (unlike gabapentin's TID requirement). Renal dose adjustment required for eGFR <60. Titrate slowly — start 75mg and increase over 1–2 weeks. Schedule V controlled (USA) — significant abuse/dependence potential.",
    sideEffects: "Dizziness, somnolence, weight gain, peripheral oedema, dry mouth, blurred vision, difficulty concentrating. Higher dependence potential than gabapentin. Euphoria particularly pronounced in some users.",
    watchOut: "Schedule V controlled — higher abuse potential than gabapentin. Respiratory depression with CNS depressants. Abrupt discontinuation causes withdrawal — taper over at least 1 week. Renal dose reduction mandatory in CKD.",
    researchLevel: "Extensively Studied",
    tags: ["Pain", "Neuropathic", "Fibromyalgia", "Anxiety"],
    typicalDose: "150mg twice daily",
    cycle: "Ongoing for chronic conditions",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Pregabalin (Lyrica) was developed by Parke-Davis/Pfizer and approved by the FDA in 2004. It is chemically related to gabapentin but has significantly higher bioavailability (90% vs 60%) and linear absorption kinetics. Approved for four distinct indications: neuropathic pain (DPN, PHN, SCI), adjunctive focal epilepsy, fibromyalgia, and GAD (in EU).",
      keyBenefits: "Linear pharmacokinetics mean blood levels are predictable across doses — unlike gabapentin's saturable absorption. Higher potency allows smaller doses. Approved for fibromyalgia (one of few effective treatments). EU approval for GAD provides evidence base for anxiety management. Twice-daily dosing.",
      mechanismOfAction: "Same as gabapentin — binds α2δ subunit of voltage-gated calcium channels, reducing excitatory neurotransmitter release. The greater bioavailability and potency result in more complete and predictable channel binding compared to gabapentin at clinical doses.",
    },
    pharmacokinetics: { peak: "1h", halfLife: "6.3h", cleared: "~2 days" },
    researchIndications: [
      { category: "Neuropathic Pain", effectiveness: "Most Effective", items: [
        { title: "Diabetic Peripheral Neuropathy", description: "150–300mg/day produces >50% pain reduction in 34% vs 21% placebo. FDA-approved for DPN." },
        { title: "Fibromyalgia", description: "FDA-approved 2007. 300–450mg/day reduces pain and improves sleep and fatigue scores vs placebo." },
      ]},
      { category: "Generalised Anxiety (EU)", effectiveness: "Effective", items: [
        { title: "GAD (European approval)", description: "150–600mg/day reduces Hamilton Anxiety Scale scores. Faster onset than SSRIs. Approved for GAD in EU but not US." },
      ]},
    ],
    researchProtocols: [
      { goal: "Neuropathic pain — Initial", dose: "75mg", frequency: "Twice daily", route: "Oral" },
      { goal: "Neuropathic pain — Standard", dose: "150mg", frequency: "Twice daily (300mg/day)", route: "Oral" },
      { goal: "Fibromyalgia", dose: "150–225mg", frequency: "Twice daily", route: "Oral" },
      { goal: "GAD (off-label in US)", dose: "75–150mg", frequency: "Twice to three times daily", route: "Oral" },
    ],
    interactions: [
      { name: "Opioids / CNS depressants (respiratory depression)", status: "caution" },
      { name: "Alcohol", status: "caution" },
      { name: "Thiazolidinediones (weight/oedema)", status: "monitor" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Immediate dizziness and sedation", description: "Pregabalin's faster absorption produces quicker and more pronounced initial dizziness and sedation than gabapentin — a pharmacological signature." },
      { type: "warn", title: "Higher abuse potential than gabapentin", description: "Pregabalin's euphorigenic potential at high doses is well-documented. Risk monitoring is important in patients with substance use history." },
    ],
    expectTimeline: [
      { timeframe: "Day 1–3", description: "Sedation and dizziness prominent. Start at 75mg to minimise." },
      { timeframe: "Week 1–2", description: "Pain relief begins. Tolerance to sedation developing." },
      { timeframe: "Week 2–4", description: "Stable pain reduction. Sleep improvement." },
    ],
    sideEffectNotes: [
      "Dizziness and somnolence — prominent initially; titrate slowly",
      "Weight gain — significant in long-term users; related to appetite stimulation",
      "Peripheral oedema — ankle swelling, especially in elderly",
      "Cognitive effects — processing speed reduction at higher doses",
    ],
    references: [
      { title: "Freynhagen R et al. — Pain (2005)", context: "Human | 150–600mg/day | 12 weeks | N=338", description: "Flexible-dose pregabalin for DPN and PHN: dose-dependent pain reduction with >50% responder rates at 300–600mg.", url: "https://pubmed.ncbi.nlm.nih.gov/16337032/" },
    ],
    faq: [
      { question: "What's the difference between pregabalin and gabapentin?", answer: "Pregabalin has higher bioavailability (90% vs 60%), linear pharmacokinetics, faster onset, and is more potent. Pregabalin is twice-daily vs gabapentin's three-times-daily. Pregabalin also has more abuse potential and is Schedule V. Clinically, many patients switch between the two for tolerability or response reasons." },
    
      { question: "Can pregabalin be used for acute anxiety?", answer: "Pregabalin is licensed for generalised anxiety disorder (GAD) and shows efficacy within 1 week — faster than SSRIs and SNRIs. It is not intended for on-demand acute anxiety relief (unlike benzodiazepines) but its relatively rapid onset in GAD treatment provides an advantage over antidepressants." },
      { question: "What is the difference between pregabalin and gabapentin?", answer: "Pregabalin has predictable, dose-proportional absorption (up to 90% bioavailability) unlike gabapentin's saturable transport system. This means pregabalin provides more reliable blood levels, allows twice-daily dosing, and reaches therapeutic levels faster. Pregabalin is also more potent (3× by weight) and has regulatory approval for GAD, neuropathic pain, and epilepsy." },
      { question: "Does pregabalin cause weight gain?", answer: "Weight gain of 5–10% of body weight is common with pregabalin, reported in 8–16% of patients in clinical trials. The mechanism involves increased appetite and fluid retention (oedema). Weight gain is dose-dependent and more prominent at doses above 300mg/day. Reduced-calorie diet and exercise help mitigate this effect." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lyrica approved for DPN, PHN, fibromyalgia, adjunctive epilepsy. Schedule V." },
      { region: "EU", agency: "EMA", status: "Approved", notes: "Additional approval for generalised anxiety disorder." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H." },
    ],
    indianBrands: [
      { brand: "Nervigesic 300", manufacturer: "Sun Pharma" },
      { brand: "Pregabid 150", manufacturer: "Intas" },
      { brand: "Lyrica 150", manufacturer: "Pfizer", notes: "Originator brand" },
      { brand: "Pregarica 150" },
      { brand: "Pregabid 75", manufacturer: "Intas" },
    ],
    ukBrands: [
      { brand: "Lyrica", manufacturer: "Pfizer", notes: "25mg, 50mg, 75mg, 100mg, 150mg, 200mg, 225mg, 300mg capsules; Class C controlled drug" },
      { brand: "Pregabalin (generic)", manufacturer: "Various", notes: "Widely prescribed on NHS for neuropathic pain, fibromyalgia, GAD, epilepsy" },
    ],
    usBrands: [
      { brand: "Lyrica", manufacturer: "Pfizer", notes: "25mg–300mg; Schedule V; FDA-approved for DPN, PHN, fibromyalgia, SPS, GAD" },
      { brand: "Lyrica CR", manufacturer: "Pfizer", notes: "82.5mg, 165mg, 330mg extended-release" },
      { brand: "Pregabalin (generic)", manufacturer: "Various", notes: "FDA-approved generics; Schedule V" },
    ],
    canadaBrands: [
      { brand: "Lyrica", manufacturer: "Pfizer", notes: "25mg–300mg capsules; licensed for neuropathic pain and epilepsy" },
      { brand: "Pregabalin (generic)", manufacturer: "Various", notes: "Generic versions available on Rx" },
    ],
  },

  // ─── ANTIBIOTICS / ANTIVIRAL / ANTIPARASITIC ─────────────────────────────

  {
    name: "Ivermectin",
    slug: "ivermectin",
    abbreviation: "IVM",
    aliases: ["ivermectin", "iverheal", "iverjohn", "stromectol"],
    category: "antibiotic",
    tagline: "Macrocyclic lactone antiparasitic — strongyloidiasis, onchocerciasis & scabies",
    description: "Ivermectin is an antiparasitic macrocyclic lactone with broad-spectrum activity against nematodes and ectoparasites. WHO Essential Medicine for onchocerciasis and strongyloidiasis. Also used for scabies, head lice, and has been extensively studied against various other conditions.",
    color: "#166534",
    vial: "Oral tablet / topical cream",
    recon: "3mg, 6mg, 12mg (oral)",
    startDose: "150–200 mcg/kg (single dose)",
    targetDose: "150–200 mcg/kg for parasitic infections",
    frequency: "Single dose or once weekly/monthly (depending on indication)",
    route: "Oral (topical for scabies)",
    storage: "Room temperature",
    benefits: "Highly effective against strongyloides, onchocerciasis, scabies, head lice. WHO Essential Medicine. Single-dose treatment for many indications. Safe in most adults. Available as cheap generic in India.",
    tips: "Take on empty stomach with water (increases absorption). For strongyloidiasis, single dose may need repeating at 2 weeks. For onchocerciasis, annual dosing is typical. Weight-based dosing important for efficacy.",
    sideEffects: "Mazotti reaction (for onchocerciasis: fever, rash, headache, myalgia — from dying parasites). Dizziness, nausea, pruritis. Rare: neurological effects at very high doses.",
    watchOut: "Not for use in patients with CNS disorders or where blood-brain barrier may be compromised (increased CNS penetration). Avoid in pregnant women (first trimester). Not approved for use in children <15kg. Avoid with CYP3A4 inhibitors (elevated levels).",
    researchLevel: "Extensively Studied",
    tags: ["Antiparasitic", "Infections", "WHO Essential"],
    typicalDose: "12mg single dose (for ~70kg adult)",
    cycle: "Single dose (repeat at 2 weeks for some indications)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Ivermectin was discovered by Satoshi Omura and William Campbell (Nobel Prize 2015). Developed by Merck as Mectizan for mass distribution in river blindness (onchocerciasis) programs. On WHO Essential Medicines List. One of the most widely used antiparasitic drugs globally, especially in tropical medicine.",
      keyBenefits: "Single-dose cure rates of >95% for strongyloidiasis and onchocerciasis. Effective for scabies including crusted/Norwegian scabies. Broad antiparasitic spectrum. Donaldson Campaign — free distribution for onchocerciasis. Extensive safety record in mass drug administration programs.",
      mechanismOfAction: "Binds glutamate-gated chloride ion channels (GluCl) in invertebrate neurons and muscle cells, causing hyperpolarisation and paralysis of the parasite. Also binds GABA-gated chloride channels. In mammals, these channels are not present in the CNS (intact blood-brain barrier excludes ivermectin). This selective toxicity provides the therapeutic window.",
    },
    pharmacokinetics: { peak: "4h", halfLife: "18h", cleared: "~4 days" },
    researchIndications: [
      { category: "Parasitic Infections", effectiveness: "Most Effective", items: [
        { title: "Strongyloidiasis", description: "Single dose 200mcg/kg achieves >95% cure rate. Repeat at 2 weeks for hyperinfection syndrome." },
        { title: "Onchocerciasis (River Blindness)", description: "Annual 150mcg/kg prevents microfilariae from reaching the eye. WHO program has prevented millions of cases of blindness." },
        { title: "Scabies", description: "Single dose 200mcg/kg. Two doses (day 1 and day 8) preferred. For crusted scabies, multiple doses plus topical treatment." },
      ]},
    ],
    researchProtocols: [
      { goal: "Strongyloidiasis", dose: "200 mcg/kg", frequency: "Single dose (repeat in 2 weeks)", route: "Oral (fasting)" },
      { goal: "Scabies", dose: "200 mcg/kg", frequency: "Day 1 and Day 8", route: "Oral" },
      { goal: "Onchocerciasis (river blindness)", dose: "150 mcg/kg", frequency: "Once annually", route: "Oral" },
      { goal: "Head lice", dose: "400 mcg/kg", frequency: "Single dose (repeat in 2 weeks)", route: "Oral" },
    ],
    interactions: [
      { name: "CYP3A4 inhibitors (ketoconazole, ritonavir)", status: "caution" },
      { name: "Warfarin", status: "monitor" },
      { name: "Other antiparasitic drugs (benzimidazoles)", status: "compatible" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Mazotti reaction confirms parasite killing", description: "Fever, rash, and joint pain 1–2 days after dosing (in onchocerciasis patients) are the Mazotti reaction — dying microfilariae releasing antigens. Confirms genuine drug activity." },
      { type: "warn", title: "Weight-based dosing is critical", description: "Under-dosing reduces efficacy; over-dosing increases side effect risk. Calculate dose carefully based on body weight." },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Parasite paralysis begins. Mazotti reaction peaks in onchocerciasis." },
      { timeframe: "Day 3–7", description: "Parasite clearance. Resolution of symptoms." },
      { timeframe: "Week 2", description: "Second dose (where indicated) for re-emerging larval stages." },
    ],
    sideEffectNotes: [
      "Mazotti reaction — inflammatory response to dying parasites (onchocerciasis); managed with antihistamines and NSAIDs",
      "Dizziness and headache — direct drug effects; mild and transient",
      "Pruritis — from parasite death and immune response",
      "Nausea — take on empty stomach (for absorption) but consider splitting dose if severe nausea",
    ],
    references: [
      { title: "Homeida MA et al. — Lancet (1988)", context: "Human | 150mcg/kg | 12 months | N=99", description: "Annual ivermectin in onchocerciasis: sustained microfilariae suppression and prevention of ocular damage.", url: "https://pubmed.ncbi.nlm.nih.gov/2900205/" },
    ],
    faq: [
      { question: "Is ivermectin effective against COVID-19?", answer: "Multiple large, well-conducted RCTs (TOGETHER, ACTIV-6, PRINCIPLE) found ivermectin no more effective than placebo for COVID-19 outcomes. The WHO does not recommend ivermectin for COVID-19. For its approved parasitic indications, it is highly effective." },
    
      { question: "Is oral ivermectin effective against parasites other than scabies?", answer: "Yes — oral ivermectin covers a broad range of parasites: onchocerciasis (river blindness), lymphatic filariasis, strongyloidiasis, head lice, and intestinal helminths including Ascaris and hookworm. A single 200mcg/kg dose treats most infections, though strongyloidiasis requires two doses 2 weeks apart." },
      { question: "Does ivermectin treat COVID-19?", answer: "No clinical evidence supports ivermectin for COVID-19. Multiple large randomised controlled trials (TOGETHER trial, Oxford PRINCIPLE trial) found no benefit in reducing hospitalisation or improving outcomes. Major health authorities (WHO, FDA, EMA) do not recommend ivermectin for COVID-19 outside of clinical trials." },
      { question: "What is Mazzotti reaction when treating onchocerciasis?", answer: "The Mazzotti reaction is an immune response to antigens released by dying Onchocerca microfilariae after ivermectin treatment. Symptoms include fever, rash, pruritus, oedema, and hypotension, occurring 1–2 days post-dose. It is self-limiting (24–48 hours) and managed supportively; antihistamines and corticosteroids reduce severity." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Approved for strongyloidiasis, onchocerciasis. Off-label for scabies (topical approved), head lice (Sklice topical approved)." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. WHO Essential Medicine." },
    ],
    indianBrands: [
      { brand: "Iverheal 3", manufacturer: "Healing Pharma" },
      { brand: "Iverheal 6", manufacturer: "Healing Pharma" },
      { brand: "Iverheal 12", manufacturer: "Healing Pharma" },
      { brand: "Iverjohn 3" },
      { brand: "Iverjohn 6" },
      { brand: "Iverjohn 12" },
      { brand: "Covilife 12" },
      { brand: "Iverbest 12" },
    ],
    ukBrands: [
      { brand: "Soolantra", manufacturer: "Galderma", notes: "10mg/g cream; topical for rosacea" },
      { brand: "Sklice", manufacturer: "Arbor Pharmaceuticals", notes: "0.5% lotion; head lice" },
      { brand: "Ivermectin (generic)", manufacturer: "Various", notes: "Oral tablets; specialist prescription only" },
    ],
    usBrands: [
      { brand: "Stromectol", manufacturer: "Merck", notes: "3mg tablets; FDA-approved for strongyloidiasis, onchocerciasis" },
      { brand: "Soolantra", manufacturer: "Galderma", notes: "10mg/g cream; topical rosacea" },
      { brand: "Sklice", manufacturer: "Arbor", notes: "0.5% topical lotion; head lice" },
      { brand: "Ivermectin (generic)", manufacturer: "Various", notes: "3mg, 6mg tablets" },
    ],
    canadaBrands: [
      { brand: "Stromectol", manufacturer: "Merck", notes: "3mg tablets; for approved parasitic infections" },
      { brand: "Ivermectin (generic)", manufacturer: "Various", notes: "Available on Rx" },
    ],
  },

  {
    name: "Azithromycin",
    slug: "azithromycin",
    abbreviation: "AZI",
    aliases: ["azithromycin", "zithromax", "azipro", "azisign"],
    category: "antibiotic",
    tagline: "Macrolide antibiotic — respiratory, skin & sexually transmitted infections",
    description: "Azithromycin is a broad-spectrum macrolide antibiotic with excellent tissue penetration and a prolonged tissue half-life (68 hours), enabling short-course treatment. Effective for community-acquired pneumonia, atypical pneumonia, pharyngitis, STIs (chlamydia), and skin infections.",
    color: "#15803D",
    vial: "Oral tablet / oral suspension / IV",
    recon: "250mg, 500mg",
    startDose: "500mg",
    targetDose: "500mg day 1, then 250mg days 2–5",
    frequency: "Once daily (due to long half-life)",
    route: "Oral",
    storage: "Room temperature",
    benefits: "Once-daily dosing. Z-pack (5-day course) effective for respiratory and skin infections. Single 1g dose cures chlamydia. Excellent tissue penetration — effective for intracellular pathogens (Mycoplasma, Legionella, Chlamydia). Anti-inflammatory properties.",
    tips: "Can be taken with or without food (food does not significantly affect absorption). Avoid antacids within 2 hours. Complete the full course. QTc prolongation risk — avoid in patients with long-QT or on other QTc-prolonging drugs.",
    sideEffects: "Nausea, diarrhoea, abdominal pain, vomiting. QTc prolongation (rare). Clostridium difficile colitis (with prolonged use). Transient hearing changes at high doses.",
    watchOut: "QTc prolongation — avoid with other QTc-prolonging drugs. Hepatotoxicity (rare). C. difficile risk with any antibiotic. Resistance increasing globally — use only when indicated. Drug interactions via CYP3A4 inhibition.",
    researchLevel: "Extensively Studied",
    tags: ["Antibiotic", "Respiratory", "STI", "Macrolide"],
    typicalDose: "500mg once daily for 3–5 days",
    cycle: "3–5 day course (respiratory); single dose for chlamydia",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Azithromycin was developed by Pfizer (from erythromycin) and approved in 1991. Its extended tissue half-life allows shorter courses (3–5 days) vs other antibiotics. The drug concentrates in phagocytes, allowing delivery to sites of infection. WHO Essential Medicine. Indian generics are very widely available and affordable.",
      keyBenefits: "Short 3–5 day course improves compliance. Excellent activity against atypical organisms (Mycoplasma, Chlamydia, Legionella). Single 1g dose treats uncomplicated urogenital chlamydia. Anti-inflammatory properties beyond antibacterial activity — reduces neutrophil recruitment in bronchial inflammation.",
      mechanismOfAction: "Binds the 50S ribosomal subunit of susceptible bacteria, blocking peptide chain elongation. Bacteriostatic at standard doses. Concentrates in phagocytes (white cells) delivering high concentrations to infected tissues. Tissue-to-plasma ratio is very high (100:1 or more) explaining its efficacy for intracellular pathogens.",
    },
    pharmacokinetics: { peak: "2–3h", halfLife: "68h (tissue half-life)", cleared: "~5–7 days" },
    researchIndications: [
      { category: "Respiratory Infections", effectiveness: "Most Effective", items: [
        { title: "Community-Acquired Pneumonia (atypical)", description: "First-line for atypical CAP (Mycoplasma, Chlamydophila, Legionella). 5-day course equivalent to 10-day doxycycline or amoxicillin for atypical organisms." },
      ]},
      { category: "STIs", effectiveness: "Most Effective", items: [
        { title: "Uncomplicated Chlamydia", description: "Single 1g dose achieves >95% cure rate for genital chlamydia (Chlamydia trachomatis). Now recommended alongside doxycycline due to some resistance concerns." },
      ]},
    ],
    researchProtocols: [
      { goal: "CAP / respiratory infections (Z-pack)", dose: "500mg day 1, then 250mg days 2–5", frequency: "Once daily", route: "Oral" },
      { goal: "Skin and soft tissue", dose: "500mg", frequency: "Once daily for 3 days", route: "Oral" },
      { goal: "Chlamydia (STI)", dose: "1g (two 500mg tablets)", frequency: "Single dose", route: "Oral" },
    ],
    interactions: [
      { name: "QTc-prolonging drugs (haloperidol, amiodarone)", status: "avoid" },
      { name: "Warfarin (INR elevation)", status: "monitor" },
      { name: "Digoxin (increased levels)", status: "monitor" },
      { name: "Antacids with aluminium/magnesium", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "GI side effects confirm activity", description: "Mild nausea or GI discomfort after azithromycin is characteristic — confirms absorption of genuine drug." },
      { type: "warn", title: "QTc check if cardiac risk factors", description: "ECG screening recommended in patients with hypokalemia, hypomagnesemia, cardiac arrhythmia, or on other QTc-prolonging medications." },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Tissue concentrations achieved. Symptoms begin improving for susceptible infections." },
      { timeframe: "Day 3–5", description: "Completing the short course. Tissue concentrations persist for 5–7 days post-completion." },
    ],
    sideEffectNotes: [
      "GI: nausea, diarrhoea, abdominal pain — mild; take with food if needed",
      "QTc prolongation — rare at standard doses; increase risk in cardiac patients or with other QTc-prolonging drugs",
      "C. difficile colitis — risk with any antibiotic; most common with prolonged courses",
      "Transient hearing changes — rare at standard doses; more common at high doses",
    ],
    references: [
      { title: "Hammerschlag MR — Lancet Infect Dis (2002)", context: "Review | Chlamydia treatment", description: "1g single-dose azithromycin achieves >95% cure rates for uncomplicated urogenital chlamydia infection.", url: "https://pubmed.ncbi.nlm.nih.gov/11901522/" },
    ],
    faq: [
      { question: "Is azithromycin effective for COVID-19?", answer: "No — multiple large RCTs (RECOVERY, PRINCIPLE, AZITHRO-BHVP) showed azithromycin no better than standard care for COVID-19. Not recommended for viral infections including COVID-19." },
    
      { question: "Does azithromycin still work after 5 days?", answer: "Yes — azithromycin distributes extensively into tissues with a tissue half-life of 2–4 days. After a 5-day course (or Z-Pak), therapeutic tissue concentrations persist for 5–7 additional days. Total antibiotic exposure from a standard 5-day course is equivalent to 10–14 days of a traditional antibiotic." },
      { question: "Can azithromycin cause heart rhythm problems?", answer: "Azithromycin prolongs the QTc interval, which can rarely trigger torsades de pointes (a life-threatening arrhythmia). Risk is highest in patients with pre-existing long QT syndrome, hypokalaemia, hypomagnesaemia, bradycardia, or those taking other QTc-prolonging drugs. A large FDA safety study confirmed a small but real increased risk of cardiovascular death." },
      { question: "What does azithromycin cover that amoxicillin doesn't?", answer: "Azithromycin covers atypical organisms (Mycoplasma pneumoniae, Chlamydophila pneumoniae, Legionella) that are intrinsically resistant to beta-lactam antibiotics. It also covers Chlamydia trachomatis and Bordetella pertussis. Amoxicillin covers more gram-positive organisms and H. influenzae but has no atypical pathogen activity." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Zithromax approved for CAP, pharyngitis, skin infections, STIs. Generic available." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. WHO Essential Medicine." },
    ],
    indianBrands: [
      { brand: "Azipro 500", manufacturer: "Cipla" },
      { brand: "Azisign 500" },
      { brand: "Azeetop 500", manufacturer: "Healing Pharma" },
    ],
    ukBrands: [
      { brand: "Zithromax", manufacturer: "Pfizer", notes: "250mg, 500mg; POM" },
      { brand: "Azithromycin (generic)", manufacturer: "Various", notes: "Widely available on NHS" },
    ],
    usBrands: [
      { brand: "Zithromax", manufacturer: "Pfizer", notes: "250mg, 500mg capsules/tablets; Z-Pak" },
      { brand: "Zmax", manufacturer: "Pfizer", notes: "Extended-release oral suspension" },
      { brand: "Azithromycin (generic)", manufacturer: "Various", notes: "FDA-approved generics" },
    ],
    canadaBrands: [
      { brand: "Zithromax", manufacturer: "Pfizer", notes: "250mg, 500mg" },
      { brand: "Azithromycin (generic)", manufacturer: "Various", notes: "Generic versions available" },
    ],
  },

  {
    name: "Doxycycline",
    slug: "doxycycline",
    abbreviation: "DOX",
    aliases: ["doxycycline", "vibramycin", "doxypen", "doxybond"],
    category: "antibiotic",
    tagline: "Tetracycline antibiotic — broad-spectrum infections, acne & STIs",
    description: "Doxycycline is a broad-spectrum bacteriostatic tetracycline antibiotic effective against Gram-positive and Gram-negative bacteria, atypicals, and several intracellular organisms. Used for respiratory infections, acne, STIs (chlamydia, gonorrhoea — dual therapy), malaria prophylaxis, and Lyme disease.",
    color: "#065F46",
    vial: "Oral tablet / capsule / IV",
    recon: "50mg, 100mg, 200mg",
    startDose: "100mg",
    targetDose: "100mg twice daily",
    frequency: "Twice daily",
    route: "Oral",
    storage: "Room temperature, protect from light",
    benefits: "Broad spectrum including Chlamydia, Mycoplasma, Rickettsia. Effective for acne (anti-inflammatory at low dose). Malaria prophylaxis. Good oral bioavailability. Penetrates most tissues including CSF (meningitis).",
    tips: "Take with a full glass of water and remain upright for 30 minutes (risk of oesophageal ulceration). Take with food to reduce GI effects (does not significantly reduce absorption). Avoid milk/dairy within 2 hours (forms insoluble complexes with Ca2+). Use strict sun protection — photosensitivity risk.",
    sideEffects: "GI upset (nausea, vomiting), oesophageal irritation, photosensitivity, dental discolouration in children <8 years, vaginal candidiasis. Rare: pseudotumour cerebri (benign intracranial hypertension).",
    watchOut: "Contraindicated in pregnancy (last half) and children <8 years (dental staining, bone growth impairment). Photosensitivity — use SPF daily. Do not take within 2 hours of antacids, iron, or dairy. Oesophageal ulceration risk — take sitting upright with plenty of water.",
    researchLevel: "Extensively Studied",
    tags: ["Antibiotic", "Acne", "STI", "Malaria Prophylaxis"],
    typicalDose: "100mg twice daily",
    cycle: "7–21 days (infections); 3–6 months (acne)",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Doxycycline is a semi-synthetic tetracycline derivative developed from tetracycline in the 1960s. More lipophilic than tetracycline with improved GI absorption and tissue penetration. WHO Essential Medicine for several indications. Widely used in both antibiotic and anti-inflammatory (low-dose) contexts.",
      keyBenefits: "Excellent activity against intracellular pathogens (Chlamydia, Rickettsia, Mycoplasma, Ehrlichia). Anti-inflammatory properties at low doses (40mg modified-release) for rosacea and acne. First-line for tick-borne diseases (Lyme disease, Rocky Mountain spotted fever). Highly affordable generic.",
      mechanismOfAction: "Binds reversibly to the 30S ribosomal subunit, blocking aminoacyl-tRNA from attaching to the mRNA-ribosome complex. Bacteriostatic — inhibits protein synthesis in susceptible organisms. Also inhibits matrix metalloproteinases (MMPs) at low doses — accounts for anti-inflammatory effects in rosacea and acne.",
    },
    pharmacokinetics: { peak: "2h", halfLife: "18–22h", cleared: "~5 days" },
    researchIndications: [
      { category: "Bacterial Infections", effectiveness: "Most Effective", items: [
        { title: "Chlamydia / STIs", description: "7-day 100mg BID course achieves >95% chlamydia cure rate. First-line for uncomplicated genital chlamydia per CDC guidelines." },
        { title: "Lyme Disease", description: "10–21 day course for early Lyme disease (Borrelia burgdorferi). First-line treatment." },
      ]},
      { category: "Acne", effectiveness: "Effective", items: [
        { title: "Moderate-Severe Acne", description: "100mg BID reduces inflammatory lesions by 50–65% at 12 weeks. Anti-inflammatory and antibacterial mechanism." },
      ]},
    ],
    researchProtocols: [
      { goal: "Bacterial infections (standard)", dose: "100mg", frequency: "Twice daily for 7–14 days", route: "Oral" },
      { goal: "Acne", dose: "100mg", frequency: "Once or twice daily for 3–6 months", route: "Oral" },
      { goal: "Malaria prophylaxis", dose: "100mg", frequency: "Once daily (start 1–2 days before, continue 4 weeks after)", route: "Oral" },
      { goal: "Chlamydia", dose: "100mg", frequency: "Twice daily for 7 days", route: "Oral" },
    ],
    interactions: [
      { name: "Antacids, calcium, iron (absorption inhibition)", status: "caution" },
      { name: "Warfarin (INR elevation)", status: "monitor" },
      { name: "Retinoids (oral — intracranial hypertension)", status: "avoid" },
      { name: "Penicillins (antagonistic — do not combine)", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "GI effects and photosensitivity", description: "Nausea and skin sensitivity to sunlight in the first week confirm tetracycline pharmacological activity." },
      { type: "warn", title: "Oesophageal ulceration risk", description: "Always take with a full glass of water, remaining upright for 30 minutes — oesophageal pill-induced ulceration is a real risk." },
    ],
    expectTimeline: [
      { timeframe: "Day 3–5", description: "Symptom improvement for susceptible infections." },
      { timeframe: "Week 6–12", description: "Acne improvement with ongoing treatment." },
    ],
    sideEffectNotes: [
      "GI upset and nausea — take with food (absorption minimally affected); avoid lying down after dose",
      "Photosensitivity — use SPF 50+ sunscreen; avoid direct sun",
      "Oesophageal ulceration — take sitting upright with plenty of water; avoid at bedtime",
      "Vaginal candidiasis — antibiotic-related yeast overgrowth; treat concurrently if recurrent",
      "Contraindicated <8 years — dental discolouration and bone growth impairment",
    ],
    references: [
      { title: "Lau CY & Qureshi AK — Sex Transm Infect (2002)", context: "Meta-analysis | Chlamydia | N=2,000+", description: "Doxycycline 7-day course vs azithromycin single-dose for chlamydia: both achieve >95% cure rates; doxycycline preferred for compliance reasons in some settings.", url: "https://pubmed.ncbi.nlm.nih.gov/12201004/" },
    ],
    faq: [
      { question: "Can I eat with doxycycline?", answer: "Yes — doxycycline can and should be taken with food to reduce GI side effects. Unlike some tetracyclines, food does not significantly impair doxycycline absorption. Avoid dairy specifically (calcium forms insoluble complexes)." },
    
      { question: "Why can't I lie down after taking doxycycline?", answer: "Doxycycline is highly irritating to the oesophagus and can cause oesophagitis or even oesophageal ulcers if it remains in contact with oesophageal mucosa. Always take with a full glass of water, take in an upright position, and remain upright for at least 30 minutes after ingestion." },
      { question: "Can doxycycline be used long-term for acne?", answer: "Low-dose doxycycline (40mg modified-release once daily, or 50mg twice daily) is approved for long-term acne treatment. Extended-release formulations (Oracea 40mg in the US) provide anti-inflammatory rather than antibiotic doses, reducing resistance risk. Clinical guidelines recommend limiting antibiotic courses and combining with topical agents." },
      { question: "Can I take doxycycline with dairy?", answer: "Dairy products (milk, cheese, yoghurt) reduce doxycycline absorption by forming insoluble chelate complexes with calcium. Unlike tetracycline, doxycycline absorption is only moderately reduced by dairy (by ~20–30%) and can be taken with small amounts of food if GI tolerability requires it. Take at least 2 hours apart from significant dairy intake." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Multiple approvals for infections, anthrax prophylaxis, acne. Generic widely available." },
      { region: "India", agency: "CDSCO", status: "Approved (Rx)", notes: "Schedule H. WHO Essential Medicine." },
    ],
    indianBrands: [
      { brand: "Doxypen 100" },
      { brand: "DOX 100" },
      { brand: "Doxybond 100", manufacturer: "Intas" },
    ],
    ukBrands: [
      { brand: "Vibramycin", manufacturer: "Pfizer", notes: "100mg capsules; POM" },
      { brand: "Doxycycline (generic)", manufacturer: "Various", notes: "100mg capsules; widely available on NHS" },
    ],
    usBrands: [
      { brand: "Vibramycin", manufacturer: "Pfizer", notes: "50mg/5ml syrup; 100mg capsules" },
      { brand: "Oracea", manufacturer: "Galderma", notes: "40mg delayed-release; for rosacea" },
      { brand: "Doryx", manufacturer: "Mayne Pharma", notes: "50mg, 75mg, 100mg, 150mg delayed-release tablets" },
      { brand: "Doxycycline (generic)", manufacturer: "Various", notes: "FDA-approved; most common form" },
    ],
    canadaBrands: [
      { brand: "Vibra-Tabs", manufacturer: "Pfizer", notes: "100mg film-coated tablets" },
      { brand: "Doxycycline (generic)", manufacturer: "Various", notes: "100mg; widely available on Rx" },
    ],
  },

  {
    name: "Amoxicillin",
    slug: "amoxicillin",
    abbreviation: "AMX",
    aliases: ["amoxicillin", "amoxil", "almox", "augmine", "novamax"],
    category: "antibiotic",
    tagline: "Aminopenicillin — broad-spectrum bacterial infections & H. pylori",
    description: "Amoxicillin is a broad-spectrum aminopenicillin antibiotic effective against many Gram-positive and some Gram-negative organisms. First-line for many community infections. Combined with clavulanic acid (Augmentin/Augmine) to overcome beta-lactamase-producing organisms.",
    color: "#14532D",
    vial: "Oral capsule / tablet / suspension / IV",
    recon: "250mg, 500mg, 875mg; Augmentin: 375mg, 625mg, 1000mg",
    startDose: "250–500mg",
    targetDose: "500mg",
    frequency: "Three times daily (or twice daily for 875mg)",
    route: "Oral",
    storage: "Room temperature (suspension: refrigerate)",
    benefits: "Excellent GI absorption (80% bioavailability vs ampicillin 40%). Effective for streptococcal infections, otitis media, sinusitis, UTIs, H. pylori eradication. Combination with clavulanate extends coverage to beta-lactamase producers (MRSA excluded).",
    tips: "Can be taken with or without food. Complete full course — even if feeling better. Amoxicillin-clavulanate (Augmine/Augmentin) causes more GI side effects — take with food and with probiotics. Store suspension in refrigerator.",
    sideEffects: "Diarrhoea (most common), nausea, skin rash (particularly in infectious mononucleosis — ampicillin rash). Allergic reactions (urticaria, angioedema, anaphylaxis) in penicillin-allergic individuals.",
    watchOut: "Penicillin allergy — cross-reactivity with cephalosporins (~1–2% true cross-reactivity). Anaphylaxis risk — have epinephrine available for first dose in any patient with beta-lactam history. Mononucleosis rash — almost universal rash if given amoxicillin to EBV-infected patients.",
    researchLevel: "Extensively Studied",
    tags: ["Antibiotic", "Bacterial Infections", "Penicillin"],
    typicalDose: "500mg three times daily",
    cycle: "5–14 days depending on indication",
    storageShort: "Room temperature",
    overview: {
      whatIsIt: "Amoxicillin was developed from ampicillin in the 1960s with improved oral bioavailability. One of the most widely prescribed antibiotics globally. On WHO Essential Medicines List. Combined with the beta-lactamase inhibitor clavulanic acid as Augmentin (brand) to extend coverage against resistant organisms. Indian generics (Almox, Novamax, Augmine) are widely available.",
      keyBenefits: "Better oral bioavailability than ampicillin. Excellent safety profile with decades of use. H. pylori eradication when combined with clarithromycin and a PPI. First-line for many community-acquired infections per international guidelines. Low cost.",
      mechanismOfAction: "Beta-lactam ring binds and irreversibly inhibits penicillin-binding proteins (PBPs) — transpeptidases essential for bacterial cell wall cross-linking. Inhibiting PBPs prevents cell wall synthesis, causing osmotic lysis and bacterial death. Beta-lactamase-producing bacteria cleave the beta-lactam ring — clavulanic acid inhibits these enzymes, restoring amoxicillin activity.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "1.7h", cleared: "~8h" },
    researchIndications: [
      { category: "Bacterial Infections", effectiveness: "Most Effective", items: [
        { title: "Streptococcal Pharyngitis", description: "10-day course eliminates group A Strep, prevents rheumatic fever. 500mg TID or 875mg BID." },
        { title: "H. pylori Eradication", description: "Triple therapy: amoxicillin 1g + clarithromycin 500mg + PPI twice daily for 14 days achieves 70–85% eradication." },
      ]},
    ],
    researchProtocols: [
      { goal: "Standard bacterial infection", dose: "500mg", frequency: "Three times daily for 7–10 days", route: "Oral" },
      { goal: "H. pylori eradication", dose: "1g", frequency: "Twice daily (with clarithromycin + PPI) for 14 days", route: "Oral" },
      { goal: "Augmentin (with clavulanate)", dose: "625mg (500mg amox + 125mg clav)", frequency: "Three times daily", route: "Oral" },
      { goal: "Augmentin 1g", dose: "1g", frequency: "Twice daily for 7 days", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (INR elevation)", status: "monitor" },
      { name: "Methotrexate (reduced renal excretion)", status: "monitor" },
      { name: "Oral contraceptives (theoretical interaction)", status: "monitor" },
      { name: "Probenecid (increases amoxicillin levels)", status: "caution" },
    ],
    qualityIndicators: [
      { type: "pass", title: "Diarrhoea confirms GI activity", description: "Loose stools in first 2–3 days confirm antibiotic activity and normal GI flora disruption from amoxicillin absorption and biliary excretion." },
      { type: "fail", title: "Rash in mononucleosis", description: "Development of a diffuse maculopapular rash after amoxicillin in a febrile young adult strongly suggests underlying EBV infection (mononucleosis) — not a drug allergy, but discontinue amoxicillin." },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptom improvement begins for susceptible infections (strep, etc.)." },
      { timeframe: "Day 5–7", description: "Significant improvement. Complete course regardless." },
    ],
    sideEffectNotes: [
      "Diarrhoea — most common; probiotics may help reduce this",
      "Penicillin allergy reaction — urticaria, angioedema, anaphylaxis; stop immediately; 5–10% of penicillin-allergic patients have cross-reactivity with cephalosporins",
      "Mononucleosis rash — diffuse rash in EBV-infected patients; not a true allergy",
      "Augmentin GI side effects — more severe than amoxicillin alone; take with food",
    ],
    references: [
      { title: "Chey WD & Wong BC — Am J Gastroenterol (2007)", context: "Meta-analysis | H. pylori triple therapy", description: "Standard triple therapy with amoxicillin, clarithromycin, and PPI achieves 70–85% H. pylori eradication. Baseline for modern eradication protocols.", url: "https://pubmed.ncbi.nlm.nih.gov/17608775/" },
    ],
    faq: [
      { question: "What is the difference between amoxicillin and Augmentin?", answer: "Augmentin (Augmine in India) is amoxicillin combined with clavulanic acid. Clavulanic acid inhibits beta-lactamase enzymes produced by resistant bacteria, restoring amoxicillin's antibacterial activity. Augmentin covers more organisms (including MRSA-adjacent Staph aureus, H. influenzae, Moraxella, some E. coli), but causes more GI side effects." },
    
      { question: "Does amoxicillin work for viral infections?", answer: "No — amoxicillin and all antibiotics are ineffective against viral infections (colds, flu, COVID-19, most sore throats, most ear infections in children). Using antibiotics unnecessarily causes side effects, disrupts the gut microbiome, and contributes to antibiotic resistance. Most respiratory viral infections resolve without antibiotics within 7–10 days." },
      { question: "What is the difference between amoxicillin and co-amoxiclav (Augmentin)?", answer: "Co-amoxiclav adds clavulanate, a beta-lactamase inhibitor, to amoxicillin. Clavulanate protects amoxicillin from being destroyed by beta-lactamase enzymes produced by resistant organisms (e.g., H. influenzae, Staph aureus, E. coli). Co-amoxiclav is reserved for infections likely to involve resistant organisms (bite wounds, resistant UTIs, complicated sinus infections)." },
      { question: "Do I need to complete the full course of amoxicillin?", answer: "Yes — completing the full prescribed course prevents relapse and reduces resistance development. Stopping early when symptoms improve may leave residual bacteria that are more resistant and able to cause a rebound infection. However, excessively long courses are also unnecessary; discuss any concerns about course length with your prescriber." },
      ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Amoxil and Augmentin approved. Generic widely available." },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "WHO Essential Medicine. Available with or without prescription depending on strength." },
    ],
    indianBrands: [
      { brand: "Almox 250", manufacturer: "Alkem" },
      { brand: "Almox 500", manufacturer: "Alkem" },
      { brand: "Novamax 500" },
      { brand: "Augmine 375", notes: "Amoxicillin-clavulanate combination" },
      { brand: "Augmine 625" },
      { brand: "Augmine 1000" },
      { brand: "Campicillin 250" },
    ],
    ukBrands: [
      { brand: "Amoxil", manufacturer: "GSK", notes: "250mg, 500mg capsules / sachets; POM" },
      { brand: "Augmentin", manufacturer: "GSK", notes: "250/125mg, 500/125mg; amoxicillin-clavulanate" },
      { brand: "Amoxicillin (generic)", manufacturer: "Various", notes: "NHS standard broad-spectrum antibiotic" },
    ],
    usBrands: [
      { brand: "Amoxil", manufacturer: "GSK", notes: "250mg, 500mg capsules; 125mg, 200mg, 250mg, 400mg chewable/suspension" },
      { brand: "Augmentin", manufacturer: "GSK", notes: "875/125mg, 500/125mg; amoxicillin-clavulanate" },
      { brand: "Amoxicillin (generic)", manufacturer: "Various", notes: "FDA-approved; most prescribed oral antibiotic in the US" },
    ],
    canadaBrands: [
      { brand: "Amoxil", manufacturer: "GSK", notes: "250mg, 500mg capsules" },
      { brand: "Clavulin", manufacturer: "GSK", notes: "Amoxicillin-clavulanate combination" },
      { brand: "Amoxicillin (generic)", manufacturer: "Various", notes: "Widely available on Rx" },
    ],
  },

    // ─── SEXUAL HEALTH — COMBINATIONS ────────────────────────────────────────

    {
      name: "Sildenafil + Dapoxetine",
      slug: "sildenafil-dapoxetine",
      abbreviation: "SIL+DAP",
      aliases: ["super p-force", "cobra 120", "sildenafil dapoxetine", "p-force"],
      category: "sexual-health",
      tagline: "PDE5 inhibitor + SSRI combo — ED & premature ejaculation",
      description: "Fixed-dose combination of sildenafil (100mg) and dapoxetine (60mg). Sildenafil improves erectile function via PDE5 inhibition; dapoxetine delays ejaculation via serotonin reuptake inhibition in the ejaculatory reflex arc. Taken on-demand 1–2 hours before activity.",
      color: "#B91C1C",
      vial: "Oral tablet",
      recon: "Sildenafil 100mg + Dapoxetine 60mg",
      startDose: "50mg/30mg",
      targetDose: "100mg/60mg",
      frequency: "As needed, 1–2 hours before activity",
      route: "Oral",
      storage: "Room temperature, away from moisture",
      benefits: "Simultaneous treatment of ED and PE. Improves both erectile function and ejaculatory control in a single tablet. Onset within 1 hour for sildenafil; dapoxetine peaks at 1.5 hours.",
      tips: "Avoid grapefruit juice. Do not take daily — strictly on-demand. Sexual stimulation is required. Start with lower dose to assess tolerance. Avoid with nitrates, MAOIs, or thioridazine.",
      sideEffects: "Headache, flushing, dizziness, nausea, dry mouth, insomnia (from dapoxetine). Orthostatic hypotension on standing.",
      watchOut: "Contraindicated with nitrates (severe hypotension). Avoid with MAOIs. Do not use with other PDE5 inhibitors or serotonergic drugs. Use with caution in cardiac disease.",
      researchLevel: "Well Researched",
      tags: ["Sexual Health", "ED", "Premature Ejaculation", "Combination"],
      researchIndications: [
        { category: "Erectile Dysfunction + Premature Ejaculation", effectiveness: "Effective", items: [
          { title: "Comorbid ED & PE", description: "Combination therapy superior to either monotherapy in men with both conditions — Phase III trials show IELT prolongation and IIEF score improvement." },
          { title: "On-Demand Use", description: "Designed for situational use only, unlike daily PDE5 inhibitors." },
        ]},
      ],
      indianBrands: [
        { brand: "Cobra 120" },
        { brand: "Abhigra 100" },
        { brand: "Chocogra 100" },
        { brand: "Sexforce 100" },
      ],
    ukBrands: [
      { brand: "Not approved as fixed combination", notes: "Components prescribed separately where licensed" },
    ],
    usBrands: [
      { brand: "Not FDA approved as fixed combination", notes: "Sildenafil and dapoxetine prescribed separately" },
    ],
    canadaBrands: [
      { brand: "Not approved as fixed combination", notes: "Individual components used separately" },
    ],
    
    overview: {
      whatIsIt: "A fixed-dose combination of sildenafil citrate (PDE5 inhibitor) and dapoxetine (SSRI) developed for the simultaneous management of erectile dysfunction and premature ejaculation. Available predominantly in India; not licensed as a fixed combination in Western markets.",
      keyBenefits: "Addresses both ED and PE with a single tablet. Sildenafil provides erection support within 30–60 min; dapoxetine delays ejaculation via serotonergic pathways. Convenient single-dose regimen improves adherence over taking two separate medications.",
      mechanismOfAction: "Sildenafil inhibits PDE5, increasing cGMP and smooth muscle relaxation in penile vasculature. Dapoxetine inhibits serotonin reuptake in the presynaptic terminal, increasing 5-HT synaptic concentration and delaying the ejaculatory reflex arc.",
    },
    pharmacokinetics: { peak: "60–120 min", halfLife: "Sildenafil 3–5h; Dapoxetine 1.5–2h", cleared: "24–48h" },
    researchProtocols: [
      { goal: "ED + PE — Standard Dose", dose: "Sildenafil 50mg + Dapoxetine 30mg", frequency: "As needed (1–3h before)", route: "Oral" },
      { goal: "ED + PE — Higher Dose", dose: "Sildenafil 100mg + Dapoxetine 60mg", frequency: "As needed", route: "Oral" },
    ],
    interactions: [
      { name: "Nitrates (all forms)", status: "avoid" },
      { name: "MAOIs", status: "avoid" },
      { name: "Thioridazine", status: "avoid" },
      { name: "CYP3A4 inhibitors (ketoconazole, ritonavir)", status: "caution" },
      { name: "Alpha-blockers", status: "caution" },
      { name: "Alcohol", status: "caution" },
    ],
    sideEffectNotes: [
      "Headache and flushing — primarily from sildenafil component (vasodilation)",
      "Nausea and dizziness — primarily from dapoxetine component",
      "Orthostatic hypotension — risk increased with concurrent alpha-blockers",
      "Avoid in patients with cardiac disease, LVOT obstruction, or haemodynamic instability",
    ],
    faq: [
      { question: "Is the combination more effective than the individual drugs?", answer: "Clinical trials show the combination produces greater improvement in IELT (intravaginal ejaculatory latency time) and erectile function scores than either component alone in men with both ED and PE. The synergistic benefit is approximately additive rather than multiplicative." },
      { question: "Why isn't this combination licensed in the UK or US?", answer: "Regulatory agencies (FDA, EMA, MHRA) require separate approval pathways for fixed-dose combinations and have not received marketing applications from manufacturers. Both components are available separately; clinicians in those markets prescribe them individually when both conditions require treatment." },
      { question: "What is the ideal timing for sildenafil-dapoxetine combination?", answer: "Take 1–3 hours before anticipated sexual activity. Dapoxetine requires this window for peak serotonergic effect. Sildenafil is active within 30–60 minutes. Avoid high-fat meals which delay sildenafil absorption. Do not use more than once per 24-hour period." },
    ],
    regulatoryStatus: [
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available as branded fixed-dose combinations (e.g., Suhagra D, Double MS)" },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Not submitted as fixed combination; components individually approved" },
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Not licensed as combination; individual components licensed separately" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not licensed as fixed combination" },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Sildenafil onset — haemodynamic effect enabling erection with sexual stimulation" },
      { timeframe: "1–3 hours", description: "Peak combined effect — optimal window for sexual activity" },
      { timeframe: "4–6 hours", description: "Sildenafil activity declining; dapoxetine effect resolved" },
    ],
    },

    {
      name: "Tadalafil + Dapoxetine",
      slug: "tadalafil-dapoxetine",
      abbreviation: "TAD+DAP",
      aliases: ["super tadapox", "tadalafil dapoxetine", "tadapox", "tadadap"],
      category: "sexual-health",
      tagline: "Long-acting PDE5 + SSRI combo — ED & premature ejaculation",
      description: "Combination of tadalafil (20mg) and dapoxetine (60mg). Tadalafil provides up to 36-hour erectile support; dapoxetine provides on-demand ejaculatory delay. Offers flexibility of extended erectile window with simultaneous PE management.",
      color: "#B91C1C",
      vial: "Oral tablet",
      recon: "Tadalafil 20mg + Dapoxetine 60mg",
      startDose: "10mg/30mg",
      targetDose: "20mg/60mg",
      frequency: "As needed, 30–60 minutes before activity",
      route: "Oral",
      storage: "Room temperature",
      benefits: "36-hour erectile window (tadalafil) combined with ejaculatory delay (dapoxetine). More flexibility than sildenafil combo. Effective for men with comorbid ED and PE.",
      tips: "Tadalafil component works for up to 36 hours — dapoxetine is only active for 4–6 hours. Do not exceed 1 dose per 24 hours. Alcohol caution (both components increase orthostatic hypotension risk).",
      sideEffects: "Headache, back pain, myalgia, flushing, nausea, dizziness. Back/muscle pain more common with tadalafil component.",
      watchOut: "Contraindicated with nitrates. Avoid MAOIs. More drug interactions to consider than monotherapy.",
      researchLevel: "Well Researched",
      tags: ["Sexual Health", "ED", "Premature Ejaculation", "Combination"],
      researchIndications: [
        { category: "Combined Sexual Dysfunction", effectiveness: "Effective", items: [
          { title: "Comorbid ED & PE", description: "Head-to-head trials show superior patient preference vs either drug alone in men with both conditions." },
          { title: "36-Hour Flexibility", description: "Tadalafil's half-life allows spontaneous intercourse within the dosing window." },
        ]},
      ],
      indianBrands: [
        { brand: "Duratia 30" },
        { brand: "Duratia 60" },
        { brand: "Tadapox 20/60" },
        { brand: "Tadalafil + Dapoxetine Combo" },
      ],
    ukBrands: [
      { brand: "Not approved as fixed combination", notes: "Components prescribed separately where licensed" },
    ],
    usBrands: [
      { brand: "Not FDA approved as fixed combination", notes: "Tadalafil and dapoxetine prescribed separately" },
    ],
    canadaBrands: [
      { brand: "Not approved as fixed combination", notes: "Individual components used separately" },
    ],
    
    overview: {
      whatIsIt: "A fixed-dose combination of tadalafil (long-acting PDE5 inhibitor) and dapoxetine (short-acting SSRI) for men with concurrent erectile dysfunction and premature ejaculation. Tadalafil's 17.5-hour half-life offers a longer window than sildenafil, making this combination useful for less planned sexual activity.",
      keyBenefits: "Tadalafil's extended duration ('weekend pill') combined with dapoxetine's ejaculatory delay provides up to 36 hours of ED management with on-demand PE control. Single tablet simplifies multi-condition management.",
      mechanismOfAction: "Tadalafil selectively inhibits PDE5 and PDE11, increasing cGMP to relax penile smooth muscle. Dapoxetine inhibits serotonin reuptake, raising synaptic 5-HT and delaying the ejaculatory reflex through central and spinal cord mechanisms.",
    },
    pharmacokinetics: { peak: "Tadalafil: 2h; Dapoxetine: 1.3h", halfLife: "Tadalafil: 17.5h; Dapoxetine: 1.5–2h", cleared: "Tadalafil: 5 days; Dapoxetine: 24h" },
    researchProtocols: [
      { goal: "ED + PE — Standard Dose", dose: "Tadalafil 20mg + Dapoxetine 30mg", frequency: "As needed (1–3h before)", route: "Oral" },
      { goal: "ED + PE — Higher Dose", dose: "Tadalafil 20mg + Dapoxetine 60mg", frequency: "As needed", route: "Oral" },
    ],
    interactions: [
      { name: "Nitrates (all forms)", status: "avoid" },
      { name: "MAOIs", status: "avoid" },
      { name: "Alpha-blockers (except tamsulosin 0.4mg)", status: "avoid" },
      { name: "Ritonavir / strong CYP3A4 inhibitors", status: "caution" },
      { name: "Antihypertensives", status: "caution" },
      { name: "Alcohol", status: "caution" },
    ],
    sideEffectNotes: [
      "Back pain and myalgia (2–6%) — a unique tadalafil side effect mediated via PDE11 inhibition",
      "Nausea and dizziness — primarily dapoxetine component",
      "Headache and dyspepsia — from tadalafil",
      "Hypotension risk with nitrates is absolute contraindication; window is 48 hours for tadalafil",
    ],
    faq: [
      { question: "How long does tadalafil-dapoxetine last?", answer: "Tadalafil's effect for ED lasts 24–36 hours, while dapoxetine's PE-delaying effect is confined to a 3–5 hour window around administration. The combination therefore provides extended ED readiness but requires dapoxetine to be taken at the appropriate time before the intended sexual activity." },
      { question: "Can I take this combination daily?", answer: "The dapoxetine component is not designed for daily use and lacks approval for daily dosing. Tadalafil can be used daily at 5mg for ED, but dapoxetine must remain on-demand. Do not take this combination daily — use components separately if daily tadalafil therapy is indicated." },
      { question: "Which is better: sildenafil-dapoxetine or tadalafil-dapoxetine?", answer: "Tadalafil-dapoxetine offers a longer ED window (36h vs 4–6h for sildenafil), making it preferable for men who benefit from flexibility. Sildenafil-dapoxetine has a faster onset. Both are equally effective for PE delay. Choice depends on lifestyle, preference for planning, and individual response." },
    ],
    regulatoryStatus: [
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available as fixed-dose combinations (e.g., Tadala-D, Tadfil-D)" },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Components individually approved; combination not submitted" },
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Not licensed as fixed combination" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not licensed as fixed combination" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Peak combined effect — both PDE5 and serotonergic components at maximum" },
      { timeframe: "24–36 hours", description: "Extended ED benefit from tadalafil" },
      { timeframe: "3–5 hours", description: "Dapoxetine effective window for PE delay" },
    ],
    },

    // ─── COGNITIVE ────────────────────────────────────────────────────────────

    {
      name: "Piracetam",
      slug: "piracetam",
      abbreviation: "PRC",
      aliases: ["nootropil", "piracetam 800", "racetam", "pircetam"],
      category: "cognitive",
      tagline: "Original nootropic — cognitive enhancement & neuroprotection",
      description: "Piracetam was the first compound classified as a nootropic (Giurgea, 1972). It modulates AMPA receptors, enhances neuronal membrane fluidity, and improves cerebrovascular blood flow. Used clinically for cognitive decline, dyslexia, and post-stroke recovery.",
      color: "#7C3AED",
      vial: "Oral tablet / powder",
      recon: "400mg, 800mg, 1200mg tablets",
      startDose: "800mg twice daily",
      targetDose: "2400–4800mg daily",
      frequency: "2–3 times daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Mild cognitive enhancement; improves memory consolidation and recall. Neuroprotective in cerebrovascular disease. Reduces cognitive decline in elderly. Effective adjunct in dyslexia treatment.",
      tips: "Best taken with a choline source (Alpha-GPC or CDP-choline) to prevent headaches and maximise effect. Benefits accumulate over weeks. Stack with other racetams cautiously.",
      sideEffects: "Headache (most common, choline-deficiency related), insomnia if dosed late, irritability, mild GI upset.",
      watchOut: "May potentiate CNS stimulants and anticoagulants (warfarin interaction — monitor INR). Not for patients with severe renal impairment.",
      researchLevel: "Well Researched",
      tags: ["Cognitive", "Nootropic", "Memory", "Neuroprotective"],
      researchIndications: [
        { category: "Cognitive Enhancement", effectiveness: "Moderate", items: [
          { title: "Age-Related Cognitive Decline", description: "Meta-analyses show improvement in memory, attention, and verbal fluency in elderly populations with cognitive decline." },
          { title: "Post-Stroke Cognitive Impairment", description: "Cochrane review supports piracetam for improving verbal learning and memory in patients recovering from ischaemic stroke." },
          { title: "Dyslexia", description: "Multiple RCTs demonstrate improvement in reading speed and accuracy in children with dyslexia at 3.3g/day." },
        ]},
      ],
      indianBrands: [
        { brand: "Nootropil 800" },
        { brand: "Pircetam 800" },
        { brand: "Biocetam 800" },
        { brand: "Autitam 800" },
      ],
    ukBrands: [
      { brand: "Nootropil 800mg / 1200mg", manufacturer: "UCB Pharma", notes: "Prescription only — licensed for myoclonus" },
    ],
    usBrands: [
      { brand: "Not FDA approved", notes: "Sold as unregulated dietary supplement; no licensed brand" },
    ],
    canadaBrands: [
      { brand: "Not approved", notes: "Not licensed by Health Canada; imported as research compound" },
    ],
    
    overview: {
      whatIsIt: "Piracetam is the original nootropic compound, synthesised in 1964 by UCB Pharma. A cyclic derivative of GABA, it modulates AMPA receptors, enhances neuronal membrane fluidity, and improves cerebrovascular blood flow. Clinically used for cognitive decline, post-stroke recovery, and dyslexia.",
      keyBenefits: "Improves memory consolidation and verbal learning. Neuroprotective in cerebrovascular disease. Proven efficacy in dyslexia in children. Reduces symptoms of cognitive decline in elderly populations. Synergistic with choline sources (Alpha-GPC, CDP-choline).",
      mechanismOfAction: "Piracetam allosterically modulates AMPA receptors, enhancing glutamatergic neurotransmission. It also increases neuronal membrane fluidity by interacting with phospholipid bilayers, and reduces platelet aggregation and erythrocyte rigidity, improving cerebral microcirculation.",
    },
    pharmacokinetics: { peak: "1–2h (oral)", halfLife: "5h", cleared: "30h" },
    researchProtocols: [
      { goal: "Cognitive Enhancement", dose: "800–1600mg", frequency: "Twice to three times daily", route: "Oral" },
      { goal: "Myoclonus (licensed)", dose: "7.2–24g/day", frequency: "Divided doses", route: "Oral" },
      { goal: "Dyslexia", dose: "3.3g/day", frequency: "Divided doses", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin / anticoagulants (INR monitoring required)", status: "caution" },
      { name: "CNS stimulants (may potentiate)", status: "caution" },
      { name: "Thyroid hormones (increased risk of CNS stimulation)", status: "caution" },
    ],
    sideEffectNotes: [
      "Headache — most common side effect, typically caused by acetylcholine depletion; resolved with choline supplementation",
      "Insomnia — dose late in day; take last dose no later than 4pm",
      "Irritability and agitation at high doses — reduce dose",
      "Mild GI upset — take with food if needed",
    ],
    faq: [
      { question: "Do I need a prescription for piracetam?", answer: "Varies by country. In the UK, piracetam (Nootropil) is a licensed prescription medicine for myoclonus. In the US, it is not FDA-approved and has no licensed indication, but is sold as an unregulated dietary supplement (though the FDA considers it an unapproved drug). In India, it is available OTC in many pharmacies." },
      { question: "Why do I need to take choline with piracetam?", answer: "Piracetam increases the utilisation of acetylcholine in the brain by enhancing cholinergic transmission. Without adequate choline, this can deplete acetylcholine stores, causing headaches and cognitive fog. Co-supplementation with Alpha-GPC (300–600mg) or CDP-choline (250–500mg) replenishes the acetylcholine precursor pool and typically eliminates piracetam-related headaches." },
      { question: "How long does it take for piracetam to work?", answer: "Acute effects on cerebral blood flow are measurable within hours. However, cognitive benefits from piracetam typically accumulate over 2–4 weeks of consistent use. Studies in elderly populations show maximum benefit at 12+ weeks. The effect is subtle at enhancement doses in healthy individuals — it is not stimulant-like." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Approved — licensed for myoclonus", notes: "Nootropil; not licensed for cognitive enhancement" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Licensed for cognitive disorders and post-stroke cognitive impairment" },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "No licensed indication; FDA classifies it as an unapproved new drug" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not licensed; sold as research compound" },
    ],
    expectTimeline: [
      { timeframe: "1–3 hours", description: "Acute cerebrovascular effect; subjective alertness in some users" },
      { timeframe: "2–4 weeks", description: "Accumulation of cognitive benefits with consistent dosing" },
      { timeframe: "8–12 weeks", description: "Maximum benefit for neuroprotection and memory in long-term users" },
    ],
    },

    {
      name: "Atomoxetine",
      slug: "atomoxetine",
      abbreviation: "ATX",
      aliases: ["strattera", "attentrol", "axepta", "atomoxet"],
      category: "cognitive",
      tagline: "Non-stimulant SNRI — ADHD & executive function",
      description: "Selective noradrenaline reuptake inhibitor (SNRI) approved for ADHD. Unlike stimulants, atomoxetine has no abuse potential. It preferentially acts on the prefrontal cortex, improving executive function, attention, and impulse control through noradrenergic enhancement.",
      color: "#7C3AED",
      vial: "Oral capsule",
      recon: "10mg, 18mg, 25mg, 40mg, 60mg, 80mg, 100mg",
      startDose: "40mg/day",
      targetDose: "80–100mg/day",
      frequency: "Once or twice daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective ADHD treatment without stimulant-class scheduling. Reduces hyperactivity, inattention, and impulsivity. Benefits persist 24 hours (no end-of-day rebound). Effective in adults with ADHD.",
      tips: "Full effect takes 4–8 weeks. Take with food to reduce nausea. CYP2D6 poor metabolisers need dose reduction. Monitor blood pressure and heart rate.",
      sideEffects: "Nausea, decreased appetite, dry mouth, insomnia, increased heart rate, erectile dysfunction, urinary hesitancy.",
      watchOut: "Black box warning for suicidal ideation in children. Avoid with MAOIs. Caution with narrow-angle glaucoma. Serious cardiovascular events reported at standard doses.",
      researchLevel: "Extensively Studied",
      tags: ["Cognitive", "ADHD", "SNRI", "Non-stimulant"],
      researchIndications: [
        { category: "ADHD", effectiveness: "Most Effective", items: [
          { title: "Adult ADHD", description: "Multiple Phase III trials show CAARS score improvement comparable to stimulants with lower abuse potential." },
          { title: "Paediatric ADHD", description: "FDA-approved for children ≥6 years. Proven in 2+ year extension studies without tolerance development." },
          { title: "ADHD with Anxiety Comorbidity", description: "Preferred over stimulants in ADHD patients with comorbid anxiety disorders — no anxiogenic effect." },
        ]},
      ],
      indianBrands: [
        { brand: "Axepta 10" },
        { brand: "Axepta 25" },
        { brand: "Axepta 40" },
        { brand: "Atomoxet 40" },
      ],
    ukBrands: [
      { brand: "Strattera 10/18/25/40/60/80/100mg", manufacturer: "Eli Lilly" },
      { brand: "Atomoxetine (generic)", notes: "Available from multiple manufacturers" },
    ],
    usBrands: [
      { brand: "Strattera 10/18/25/40/60/80/100mg", manufacturer: "Eli Lilly" },
      { brand: "Atomoxetine (generic)", notes: "Available from multiple manufacturers" },
    ],
    canadaBrands: [
      { brand: "Strattera 10/18/25/40/60/80/100mg", manufacturer: "Eli Lilly" },
    ],
    
    overview: {
      whatIsIt: "Atomoxetine is a selective noradrenaline reuptake inhibitor (SNRI) — the first non-stimulant medication approved for ADHD. Unlike methylphenidate or amphetamines, it has no abuse potential, no DEA scheduling (in the US), and acts exclusively through noradrenergic enhancement of the prefrontal cortex.",
      keyBenefits: "Reduces ADHD symptoms without stimulant-associated risks (abuse, rebound, cardiovascular stimulation comparable to amphetamines). Full 24-hour coverage without end-of-day rebound. Suitable for adults, adolescents, and children ≥6. Can treat ADHD comorbid with anxiety (unlike stimulants which may worsen anxiety).",
      mechanismOfAction: "Selectively inhibits the noradrenaline transporter (NET) in the prefrontal cortex, increasing synaptic noradrenaline and modulating dopamine indirectly via NE-D1 receptor interactions. Does not cause dopamine release in the mesolimbic system, accounting for its lack of abuse potential.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "5h (extensive metabolisers); 19h (poor CYP2D6 metabolisers)", cleared: "48–72h" },
    researchProtocols: [
      { goal: "ADHD — Initial", dose: "40mg/day", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "ADHD — Therapeutic", dose: "80–100mg/day", frequency: "Once or twice daily", route: "Oral" },
      { goal: "ADHD — Maximum", dose: "100mg/day (adults)", frequency: "Split 40mg AM + 40mg PM if needed", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs (phenelzine, tranylcypromine)", status: "avoid" },
      { name: "Vasopressors", status: "caution" },
      { name: "CYP2D6 inhibitors (fluoxetine, paroxetine) — increase atomoxetine exposure", status: "caution" },
      { name: "Salbutamol / bronchodilators (increased HR)", status: "caution" },
    ],
    sideEffectNotes: [
      "Decreased appetite and nausea — take with food; most prominent in first 2–4 weeks",
      "Increased heart rate and blood pressure — monitor at baseline and every 6 months",
      "Urinary hesitancy — noradrenergic effect on urethral sphincter; more common in adults",
      "Erectile dysfunction — reported in 4–8% of adult males; often reversible with dose reduction",
      "Black box warning: suicidal ideation in children and adolescents — monitor closely during first 3 months",
    ],
    faq: [
      { question: "How long until atomoxetine works for ADHD?", answer: "Atomoxetine requires 4–8 weeks of daily dosing before full therapeutic effect is achieved, unlike stimulants which work within hours. This slow onset is because benefit depends on sustained upregulation of noradrenergic signalling rather than acute neurotransmitter release. Partial improvement may be noticed at 2–4 weeks." },
      { question: "Can atomoxetine be stopped suddenly?", answer: "Atomoxetine does not cause physical dependence and can technically be stopped without tapering. However, abrupt discontinuation can cause irritability and rebound ADHD symptoms. A 2-week taper (halving the dose) is generally recommended for comfort, though not medically required." },
      { question: "Is atomoxetine safe to use long-term?", answer: "Long-term safety data extending to 2+ years show no new safety concerns. Unlike stimulants, there is no evidence of tolerance development. Long-term use is associated with sustained symptom control, improved academic/occupational outcomes, and no significant growth suppression at therapeutic doses in children." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Strattera — approved for ADHD in children ≥6, adolescents, and adults (2002)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Strattera — licensed for ADHD. Generic available." },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Licensed for ADHD; available as Axepta, Atomoxet" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Strattera — licensed for ADHD in children and adults" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Initial mild improvement in hyperactivity and impulsivity; appetite suppression begins" },
      { timeframe: "4–6 weeks", description: "Meaningful reduction in ADHD core symptoms; sustained attention improvement" },
      { timeframe: "8–12 weeks", description: "Full therapeutic benefit; optimal dose established" },
    ],
    },

    // ─── DERMATOLOGY ──────────────────────────────────────────────────────────

    {
      name: "Benzoyl Peroxide",
      slug: "benzoyl-peroxide",
      abbreviation: "BPO",
      aliases: ["benzoyl peroxide 2.5%", "benzoyl peroxide 5%", "benzoyl peroxide 10%", "oxy", "brevoxyl"],
      category: "dermatology",
      tagline: "Keratolytic & bactericidal — acne first-line treatment",
      description: "Benzoyl peroxide releases free radical oxygen species that oxidise bacterial proteins, killing Cutibacterium acnes without inducing resistance. Also has mild keratolytic and comedolytic effects. Available as 2.5–10% gel, wash, or cream.",
      color: "#D97706",
      vial: "Topical gel / wash / cream",
      recon: "2.5%, 5%, 10% gel; 4%, 6% face wash",
      startDose: "2.5% once daily",
      targetDose: "5% once or twice daily",
      frequency: "Once to twice daily",
      route: "Topical",
      storage: "Cool dry place, away from heat (can bleach fabric)",
      benefits: "Effective against inflammatory acne lesions. No bacterial resistance (unlike topical antibiotics). Rapid onset — visible improvement within 2 weeks. Enhances efficacy of topical retinoids and antibiotics when combined.",
      tips: "Start at 2.5% to minimise irritation and work up. Apply a pea-sized amount to dry skin. Bleaches fabric, towels, and hair — use white products around face. Combine with retinoid at night; BPO in the morning.",
      sideEffects: "Dryness, peeling, erythema, stinging (especially at higher concentrations). Rare contact allergy.",
      watchOut: "Avoid contact with eyes, mouth, broken skin. Bleaches hair and fabrics. Do not apply immediately before/after retinoids — stagger timing.",
      researchLevel: "Extensively Studied",
      tags: ["Dermatology", "Acne", "Antibacterial", "Topical"],
      researchIndications: [
        { category: "Acne Vulgaris", effectiveness: "Most Effective", items: [
          { title: "Inflammatory Acne", description: "Monotherapy reduces inflammatory lesion count by 50–60% at 12 weeks. First-line per AAD guidelines." },
          { title: "Comedonal Acne", description: "Mild to moderate comedolytic effect; less potent than retinoids for whiteheads/blackheads." },
          { title: "Antibiotic Resistance Prevention", description: "Adding BPO to topical antibiotic regimens prevents emergence of C. acnes resistance." },
        ]},
      ],
      indianBrands: [
        { brand: "Benzo 2.5% Gel" },
        { brand: "Benzo 5% Gel" },
        { brand: "Acnej 2.5% Gel" },
      ],
    ukBrands: [
      { brand: "PanOxyl 5% / 10%", notes: "OTC gel and wash" },
      { brand: "Oxy 5% / 10%", manufacturer: "Mentholatum" },
      { brand: "Freederm 5%", manufacturer: "Nelson's", notes: "Gel" },
    ],
    usBrands: [
      { brand: "PanOxyl 2.5% / 4% / 10%", notes: "OTC gel and wash" },
      { brand: "Neutrogena On-the-Spot 2.5%", manufacturer: "Johnson & Johnson" },
      { brand: "Clearasil Ultra 10%", manufacturer: "Reckitt" },
    ],
    canadaBrands: [
      { brand: "PanOxyl 5% / 10%", notes: "OTC gel" },
      { brand: "Clearasil 5% / 10%", manufacturer: "Reckitt" },
    ],
    
    overview: {
      whatIsIt: "Benzoyl peroxide (BPO) is an organic peroxide that rapidly degrades to release oxygen free radicals, oxidising bacterial proteins and killing Cutibacterium acnes (formerly Propionibacterium acnes) — the primary pathogenic organism in acne vulgaris. Unlike antibiotics, it causes no antimicrobial resistance.",
      keyBenefits: "Bactericidal against C. acnes without inducing resistance (unlike topical antibiotics). Available OTC in multiple concentrations (2.5–10%). Rapid onset — visible improvement in inflammatory acne within 2 weeks. Essential for preventing resistance when combining with topical antibiotics (clindamycin, erythromycin).",
      mechanismOfAction: "Degradation of BPO releases reactive oxygen species (superoxide, hydrogen peroxide) that oxidise cysteine residues in bacterial proteins, disrupting C. acnes metabolism. Additionally has mild keratolytic effect (dissolves comedonal plugs) and anti-inflammatory properties from reduced bacterial load.",
    },
    pharmacokinetics: { peak: "Topical — local action", halfLife: "N/A (topical)", cleared: "Hours — degraded at skin surface" },
    researchProtocols: [
      { goal: "Inflammatory Acne — Initiation", dose: "2.5% gel once daily", frequency: "Once daily (morning or evening)", route: "Topical" },
      { goal: "Inflammatory Acne — Maintenance", dose: "5% gel once to twice daily", frequency: "Once or twice daily", route: "Topical" },
      { goal: "Combined with Topical Antibiotic", dose: "BPO 2.5–5% (morning) + clindamycin 1% (evening)", frequency: "Twice daily (split)", route: "Topical" },
    ],
    interactions: [
      { name: "Tretinoin / retinoids (same application time)", status: "avoid" },
      { name: "Salicylic acid (staggered timing recommended)", status: "caution" },
      { name: "Isotretinoin (oral) — avoid additional irritation", status: "caution" },
    ],
    sideEffectNotes: [
      "Dryness and peeling — dose-dependent; 2.5% better tolerated than 10% with equivalent efficacy",
      "Erythema and stinging — normal at initiation; use moisturiser after application",
      "Fabric bleaching — bleaches clothing, towels, pillowcases; use white items, avoid coloured fabrics",
      "Contact allergy — rare (< 1%); perform patch test if concerned",
    ],
    faq: [
      { question: "Which BPO concentration is most effective?", answer: "Studies consistently show 2.5% benzoyl peroxide is as effective as 5% and 10% for killing C. acnes, with significantly less irritation. The 5% concentration is a reasonable step up if 2.5% is insufficient. 10% offers minimal additional benefit over 5% with substantially more dryness and risk of irritation." },
      { question: "Can I use BPO with retinoids?", answer: "Avoid applying BPO and retinoids (tretinoin, adapalene) at the same time — they oxidise and inactivate each other. Standard protocol: apply BPO in the morning and retinoid at night. Alternatively, apply retinoid at night and wash off in the morning before applying BPO. Modern adapalene 0.1% + BPO 2.5% combination products (Epiduo/Tactuo) are formulated to be co-stable." },
      { question: "How long should I use benzoyl peroxide?", answer: "BPO can be used long-term as part of an acne maintenance regimen without resistance developing. Once active acne resolves (typically 8–12 weeks), continue 2.5–5% BPO 3–5 times per week to maintain clearance and prevent relapse. It does not lose effectiveness over time unlike topical antibiotics." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "OTC approved", notes: "Monograph drug; widely available OTC up to 10%" },
      { region: "UK", agency: "MHRA", status: "Approved — OTC (up to 5%) and Rx (10%)", notes: "PanOxyl, Oxy, Freederm — available OTC" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available OTC and Rx" },
      { region: "Canada", agency: "Health Canada", status: "OTC approved", notes: "Available as OTC acne treatment" },
    ],
    expectTimeline: [
      { timeframe: "3–5 days", description: "Reduction in redness of active inflammatory lesions" },
      { timeframe: "2 weeks", description: "Visible reduction in inflammatory papule and pustule count" },
      { timeframe: "8–12 weeks", description: "Full clearance of active acne; maintenance phase begins" },
    ],
    },

    {
      name: "Clobetasol Propionate",
      slug: "clobetasol-propionate",
      abbreviation: "CLOB",
      aliases: ["clobetasol", "clobetasol 0.05%", "temovate", "dermovate"],
      category: "dermatology",
      tagline: "Super-potent topical corticosteroid — severe inflammatory skin conditions",
      description: "Clobetasol propionate is a Class I (super-high-potency) topical corticosteroid. Suppresses inflammatory cascade via glucocorticoid receptor binding, inhibiting phospholipase A2 and cytokine release. Used for severe psoriasis, lichen planus, eczema, and scalp conditions.",
      color: "#D97706",
      vial: "Topical cream / ointment / lotion / shampoo",
      recon: "0.05% cream, ointment, foam, shampoo",
      startDose: "0.05% once to twice daily",
      targetDose: "0.05% twice daily (short courses only)",
      frequency: "Once to twice daily for max 2–4 weeks",
      route: "Topical",
      storage: "Room temperature",
      benefits: "Rapid, potent suppression of severe inflammatory and hyperproliferative skin conditions. Effective for scalp psoriasis (foam/shampoo formulation). Induces remission in lichen planus and severe eczema.",
      tips: "Strict short-course use only — maximum 2–4 weeks. Avoid the face, groin, and axillae. Do not use under occlusive dressings without medical supervision. Taper if used for more than 2 weeks to prevent rebound.",
      sideEffects: "Skin atrophy, striae, telangiectasia, perioral dermatitis with facial use. Systemic HPA axis suppression with prolonged use. Increased susceptibility to skin infections.",
      watchOut: "Never use on face long-term. Risk of adrenal suppression with large surface area, prolonged use, or occlusion. Avoid in rosacea, acne, viral skin infections.",
      researchLevel: "Extensively Studied",
      tags: ["Dermatology", "Corticosteroid", "Psoriasis", "Eczema"],
      researchIndications: [
        { category: "Inflammatory Dermatoses", effectiveness: "Most Effective", items: [
          { title: "Plaque Psoriasis", description: "Superior clearance rates vs lower-potency corticosteroids. 2-week pulses maintain remission in chronic psoriasis." },
          { title: "Lichen Planus", description: "Potent enough to suppress severe oral and cutaneous lichen planus where lower agents fail." },
          { title: "Severe Atopic Dermatitis", description: "Used for acute flares when other agents insufficient. Short courses achieve rapid symptom control." },
        ]},
      ],
      indianBrands: [
        { brand: "Clocip 0.05% Cream" },
        { brand: "Clociheal 0.05% Cream" },
        { brand: "Topisal 0.05% Lotion" },
        { brand: "Clochiheal 0.05% Cream" },
      ],
    ukBrands: [
      { brand: "Dermovate 0.05% Cream / Ointment", manufacturer: "GSK" },
      { brand: "Etrivex 500mcg/g Shampoo", manufacturer: "Galderma" },
      { brand: "Clobovate 0.05%", manufacturer: "Dermal Labs" },
    ],
    usBrands: [
      { brand: "Temovate 0.05% Cream / Ointment", manufacturer: "PharmaDerm" },
      { brand: "Clobex 0.05% Shampoo / Lotion", manufacturer: "Galderma" },
      { brand: "Cormax 0.05%", manufacturer: "Watson" },
    ],
    canadaBrands: [
      { brand: "Dermovate 0.05% Cream / Ointment / Scalp", manufacturer: "GSK" },
    ],
    
    overview: {
      whatIsIt: "Clobetasol propionate is a Class I (super-high-potency) topical corticosteroid — the most potent class of topical steroids available. It suppresses inflammatory and hyperproliferative skin conditions through glucocorticoid receptor-mediated inhibition of cytokine and prostaglandin release.",
      keyBenefits: "Rapid, powerful suppression of severe psoriasis, lichen planus, severe atopic dermatitis, and other hyperproliferative or inflammatory dermatoses. Scalp formulations (foam, shampoo) provide targeted treatment for scalp psoriasis. Induces remission in conditions refractory to weaker agents.",
      mechanismOfAction: "Binds glucocorticoid receptors, upregulating anti-inflammatory proteins (lipocortin-1 / annexin-1) and downregulating cytokines (IL-1, IL-6, TNF-α). Inhibits phospholipase A2, reducing arachidonic acid release and prostaglandin/leukotriene production. Also suppresses keratinocyte proliferation.",
    },
    pharmacokinetics: { peak: "Topical — local action with some systemic absorption", halfLife: "Highly variable (topical)", cleared: "Systemic clearance within 48–72h if used appropriately" },
    researchProtocols: [
      { goal: "Plaque Psoriasis", dose: "0.05% cream or ointment twice daily", frequency: "Twice daily — maximum 2–4 weeks", route: "Topical" },
      { goal: "Scalp Psoriasis", dose: "0.05% foam or shampoo once daily", frequency: "Once daily — maximum 4 weeks", route: "Topical" },
      { goal: "Lichen Planus", dose: "0.05% ointment twice daily", frequency: "Twice daily — maximum 4 weeks", route: "Topical" },
    ],
    interactions: [
      { name: "Other topical corticosteroids (avoid layering)", status: "avoid" },
      { name: "Occlusive dressings (significantly increase absorption)", status: "caution" },
      { name: "Immunosuppressants (additive effects)", status: "caution" },
    ],
    sideEffectNotes: [
      "Skin atrophy — thinning, striae, telangiectasia with prolonged use, especially under occlusion",
      "HPA axis suppression — systemic absorption with large surface area use, infants, or prolonged courses",
      "Perioral dermatitis — avoid on face (especially around mouth)",
      "Rebound flare — abrupt cessation after prolonged use can trigger severe rebound; taper if used > 2 weeks",
    ],
    faq: [
      { question: "How long can I safely use clobetasol?", answer: "Maximum recommended continuous use is 2 weeks for most body sites, 4 weeks for scalp. Total weekly application should not exceed 50g of cream or 60ml of lotion. After each course, use a milder corticosteroid or non-steroidal agent (calcineurin inhibitor) for maintenance to minimise cumulative steroid exposure." },
      { question: "Can clobetasol cause adrenal suppression?", answer: "Yes — clobetasol is significantly absorbed systemically, especially under occlusion, on thin skin (face, groin, axilla), in infants, or with large surface area application. HPA axis suppression has been documented even with short courses. Measure morning cortisol if significant systemic use is suspected. In children, even standard doses can suppress growth." },
      { question: "What are alternatives to clobetasol for long-term psoriasis management?", answer: "For maintenance between clobetasol courses: calcipotriol/calcipotriene (vitamin D analogue), betamethasone valerate 0.1% (Class 3), tacrolimus or pimecrolimus (for face/flexures), or coal tar preparations. Biologic agents (adalimumab, secukinumab, ixekizumab) provide systemic control for moderate-severe psoriasis requiring less topical steroid dependency." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved — Rx only", notes: "Temovate, Clobex — Class I topical steroid" },
      { region: "UK", agency: "MHRA", status: "Approved — Rx only", notes: "Dermovate — prescription-only medicine" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available Rx; also found in combination products" },
      { region: "Canada", agency: "Health Canada", status: "Approved — Rx only", notes: "Dermovate — prescription-only" },
    ],
    expectTimeline: [
      { timeframe: "1–3 days", description: "Initial reduction in itch and erythema in responsive conditions" },
      { timeframe: "7–14 days", description: "Significant lesion clearance in psoriasis and lichen planus" },
      { timeframe: "2–4 weeks", description: "Maximum therapeutic course — reassess and transition to maintenance agent" },
    ],
    },

    {
      name: "Clindamycin",
      slug: "clindamycin",
      abbreviation: "CLIN",
      aliases: ["clindamycin phosphate", "clindamycin gel", "dalacin", "clindasol"],
      category: "dermatology",
      tagline: "Topical & oral antibiotic — acne & anaerobic infections",
      description: "Clindamycin inhibits bacterial protein synthesis by binding to the 50S ribosomal subunit. Topically, it reduces C. acnes colonisation and inflammation in acne. Orally, it treats anaerobic and gram-positive infections including dental, skin, and soft-tissue infections.",
      color: "#D97706",
      vial: "Topical gel / solution; Oral capsule",
      recon: "1% topical gel/solution; 75mg, 150mg, 300mg oral capsules",
      startDose: "Topical: 1% once or twice daily; Oral: 150mg QID",
      targetDose: "Topical: 1% BID; Oral: 300mg QID",
      frequency: "Topical: once to twice daily; Oral: 3–4 times daily",
      route: "Topical or Oral",
      storage: "Room temperature",
      benefits: "Effective topical acne treatment. Oral form covers anaerobes (dental abscess, aspiration pneumonia, SSTI). Combined with BPO topically prevents antibiotic resistance.",
      tips: "Always combine topical clindamycin with benzoyl peroxide to prevent C. acnes resistance. Oral: take with food to reduce GI side effects. Complete the course.",
      sideEffects: "Topical: dryness, burning, folliculitis. Oral: diarrhoea, pseudomembranous colitis (Clostridioides difficile), nausea, metallic taste.",
      watchOut: "Oral: risk of C. difficile colitis — stop immediately if profuse diarrhoea develops. Do not use oral clindamycin as primary monotherapy for acne (resistance).",
      researchLevel: "Extensively Studied",
      tags: ["Dermatology", "Antibiotic", "Acne", "Anaerobic"],
      researchIndications: [
        { category: "Acne / Dermatology", effectiveness: "Most Effective", items: [
          { title: "Inflammatory Acne", description: "1% topical clindamycin reduces inflammatory lesions by 40–50% at 12 weeks. Best combined with BPO." },
          { title: "Rosacea (Papulopustular)", description: "Off-label topical use reduces papular lesions in mild papulopustular rosacea." },
        ]},
        { category: "Systemic Infections", effectiveness: "Most Effective", items: [
          { title: "Dental / Oral Infections", description: "Preferred penicillin-allergic alternative for dental abscesses and oral anaerobic infections." },
          { title: "Skin & Soft Tissue Infections", description: "Effective against gram-positive cocci (Strep, MSSA) in skin and soft tissue infections." },
        ]},
      ],
      indianBrands: [
        { brand: "Dalaheal 1% Gel" },
        { brand: "Clinsol 1% Gel" },
        { brand: "Clindinol 1% Gel" },
        { brand: "Clindamycin 150Capsule" },
        { brand: "Clindamycin 300Capsule" },
      ],
    ukBrands: [
      { brand: "Dalacin T 1% Topical Solution", manufacturer: "Pfizer" },
      { brand: "Zindaclin 1% Gel", manufacturer: "Crawford Healthcare" },
      { brand: "Dalacin 150mg / 300mg Capsules", manufacturer: "Pfizer" },
    ],
    usBrands: [
      { brand: "Cleocin T 1% Gel / Solution", manufacturer: "Pfizer" },
      { brand: "Clindagel 1% Gel", manufacturer: "Galderma" },
      { brand: "Cleocin 150mg / 300mg Capsules", manufacturer: "Pfizer" },
    ],
    canadaBrands: [
      { brand: "Dalacin T 1% Topical", manufacturer: "Pfizer" },
      { brand: "Dalacin C 150mg / 300mg", manufacturer: "Pfizer" },
    ],
    
    overview: {
      whatIsIt: "Clindamycin is a lincosamide antibiotic that inhibits bacterial protein synthesis at the 50S ribosomal subunit. Available topically (1% gel/solution) for acne and rosacea, and orally (150–450mg capsules) for systemic anaerobic and gram-positive infections including skin, soft tissue, and dental infections.",
      keyBenefits: "Topical: effective first-line for inflammatory acne without systemic exposure. Oral: covers anaerobes (Bacteroides, Clostridium), gram-positive cocci (MSSA, Streptococcus), and selected gram-negatives. Preferred alternative for penicillin-allergic patients in dental and soft-tissue infections.",
      mechanismOfAction: "Binds reversibly to the 23S rRNA of the 50S ribosomal subunit, blocking peptidyl transferase activity and inhibiting peptide chain elongation. Bacteriostatic at low concentrations, bactericidal at high concentrations against susceptible organisms.",
    },
    pharmacokinetics: { peak: "Oral: 45–60 min; Topical: minimal systemic absorption", halfLife: "2–3h (oral)", cleared: "24h" },
    researchProtocols: [
      { goal: "Inflammatory Acne (topical)", dose: "Clindamycin 1% gel or solution", frequency: "Twice daily (with BPO to prevent resistance)", route: "Topical" },
      { goal: "Anaerobic / Dental Infections (oral)", dose: "300–450mg every 6 hours", frequency: "Four times daily × 7–10 days", route: "Oral" },
      { goal: "Skin & Soft Tissue Infections (oral)", dose: "300mg every 6 hours", frequency: "Four times daily × 5–7 days", route: "Oral" },
    ],
    interactions: [
      { name: "Neuromuscular blocking agents (may potentiate)", status: "caution" },
      { name: "Erythromycin (antagonistic — do not combine)", status: "avoid" },
      { name: "Alcohol (oral: GI irritation)", status: "caution" },
    ],
    sideEffectNotes: [
      "C. difficile colitis — most serious risk with oral clindamycin; monitor for profuse diarrhoea, blood in stool",
      "Topical: dryness, erythema, folliculitis — apply a thin layer and use moisturiser",
      "Oral: nausea, diarrhoea, metallic taste — take with food",
      "Always combine topical clindamycin with benzoyl peroxide to prevent C. acnes resistance development",
    ],
    faq: [
      { question: "Why must topical clindamycin be combined with benzoyl peroxide?", answer: "Topical clindamycin monotherapy causes rapid emergence of resistant C. acnes strains — resistance prevalence in treated patients reaches 50–60% within 6 months. Benzoyl peroxide eliminates both sensitive and resistant strains without inducing resistance. NICE and AAD guidelines mandate BPO co-prescription with all topical antibiotic acne regimens." },
      { question: "What is the risk of C. difficile with clindamycin?", answer: "Oral clindamycin carries one of the highest risks of C. difficile colitis among commonly used antibiotics — higher than fluoroquinolones, beta-lactams, or macrolides. Risk is greatest in elderly, hospitalised, or immunocompromised patients. Stop immediately if profuse, watery diarrhoea develops; test for C. difficile toxin and treat with oral vancomycin or fidaxomicin." },
      { question: "Can I use clindamycin for MRSA infections?", answer: "Clindamycin has activity against some community-associated MRSA (CA-MRSA) strains but susceptibility must be confirmed with a D-test (disc diffusion). Inducible clindamycin resistance is common in MRSA — the D-test identifies this. For MRSA, TMP-SMX (trimethoprim-sulfamethoxazole) is generally preferred for skin infections pending susceptibility results." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Cleocin T (topical acne), Cleocin oral (anaerobic infections)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Dalacin T (topical), Dalacin C oral" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available as topical gel and oral capsules" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Dalacin T topical, Dalacin C oral" },
    ],
    expectTimeline: [
      { timeframe: "2 weeks", description: "Reduction in inflammatory lesion count and erythema (topical)" },
      { timeframe: "6–8 weeks", description: "Significant acne clearance with combined BPO + clindamycin regimen" },
      { timeframe: "24–48 hours", description: "Clinical improvement in soft tissue and dental infections (oral)" },
    ],
    },

    // ─── HAIR LOSS ────────────────────────────────────────────────────────────

    {
      name: "Spironolactone",
      slug: "spironolactone",
      abbreviation: "SPIRO",
      aliases: ["aldactone", "spiro", "spiractin", "aldol"],
      category: "hair-loss",
      tagline: "Anti-androgen & diuretic — female hair loss & acne",
      description: "Spironolactone is an aldosterone antagonist with potent anti-androgenic properties. It blocks androgen receptors in hair follicles and reduces 5α-reductase activity, making it effective for androgenetic alopecia (female pattern hair loss) and hormonal acne in women. Also used as a diuretic in heart failure and hypertension.",
      color: "#0D9488",
      vial: "Oral tablet",
      recon: "25mg, 50mg, 100mg",
      startDose: "25–50mg/day",
      targetDose: "100–200mg/day",
      frequency: "Once or twice daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective for female pattern hair loss (FPHL). Reduces hormonal acne significantly. Dual-use in heart failure and resistant hypertension. Off-label use in PCOS-related androgenisation.",
      tips: "Women of childbearing age must use reliable contraception (teratogenic — feminises male fetus). Monitor potassium especially in elderly or those with renal impairment. Take with food to reduce nausea. Allow 3–6 months for hair response.",
      sideEffects: "Menstrual irregularities, breast tenderness, polyuria, dizziness, hyperkalaemia, fatigue.",
      watchOut: "Avoid in pregnancy — teratogenic. Monitor potassium levels. Avoid with ACE inhibitors/ARBs in elderly (hyperkalaemia risk). Not for use in males for hair loss (breast tissue development).",
      researchLevel: "Well Researched",
      tags: ["Hair Loss", "Anti-androgen", "FPHL", "Acne"],
      researchIndications: [
        { category: "Female Pattern Hair Loss", effectiveness: "Effective", items: [
          { title: "FPHL (Female Pattern Hair Loss)", description: "RCTs show 75% of women report hair loss stabilisation or regrowth at 100–200mg/day over 12 months." },
          { title: "Hormonal Acne in Women", description: "Randomised trials show reduction in acne lesion count comparable to oral antibiotics at 100mg/day." },
          { title: "PCOS Hyperandrogenism", description: "Reduces hirsutism, acne, and androgenetic alopecia in PCOS. Often combined with oral contraceptives." },
        ]},
      ],
      indianBrands: [
        { brand: "Aldol 25" },
        { brand: "Aldol 50" },
        { brand: "Aldol 100" },
        { brand: "Spiractin 25" },
      ],
    ukBrands: [
      { brand: "Aldactone 25mg / 50mg / 100mg", manufacturer: "Pfizer" },
      { brand: "Spironolactone (generic)", notes: "Available from multiple manufacturers" },
    ],
    usBrands: [
      { brand: "Aldactone 25mg / 50mg / 100mg", manufacturer: "Pfizer" },
      { brand: "CaroSpir 25mg/5ml Oral Suspension", manufacturer: "Lyra Therapeutics" },
    ],
    canadaBrands: [
      { brand: "Aldactone 25mg / 100mg", manufacturer: "Pfizer" },
      { brand: "Novo-Spiroton", notes: "Generic (Novopharm)" },
    ],
    
    overview: {
      whatIsIt: "Spironolactone is a synthetic aldosterone antagonist and potassium-sparing diuretic with significant anti-androgenic properties. It blocks mineralocorticoid receptors in the kidney (causing natriuresis/diuresis) and androgen receptors in peripheral tissues (useful for female pattern hair loss, hormonal acne, and hirsutism).",
      keyBenefits: "Effective for female pattern hair loss (FPHL) at 100–200mg/day. Reduces hormonal acne significantly (evidence comparable to antibiotics). First-line in PCOS hyperandrogenism. Cornerstone treatment in heart failure (reduces mortality) and resistant hypertension.",
      mechanismOfAction: "Competitively antagonises aldosterone at mineralocorticoid receptors in the distal tubule, preventing sodium retention and potassium excretion. Additionally blocks androgen receptors in hair follicles and sebaceous glands, reduces 5α-reductase activity, and suppresses adrenal androgen synthesis — producing anti-androgenic effects.",
    },
    pharmacokinetics: { peak: "2–4h", halfLife: "Spironolactone: 1.4h; active metabolite canrenone: 16–23h", cleared: "3–5 days (metabolites)" },
    researchProtocols: [
      { goal: "FPHL / Hormonal Acne (initial)", dose: "25–50mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "FPHL / Hormonal Acne (therapeutic)", dose: "100–200mg/day", frequency: "Once or twice daily", route: "Oral" },
      { goal: "Heart Failure / Resistant Hypertension", dose: "25–50mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "ACE inhibitors / ARBs (hyperkalaemia risk — avoid in elderly)", status: "caution" },
      { name: "NSAIDs (reduce natriuretic effect, increase K+)", status: "caution" },
      { name: "Potassium supplements (additive hyperkalaemia)", status: "caution" },
      { name: "Digoxin (spironolactone increases digoxin levels)", status: "caution" },
      { name: "Lithium (reduced renal clearance)", status: "caution" },
    ],
    sideEffectNotes: [
      "Menstrual irregularities — most common in premenopausal women; often resolves within 3 months",
      "Breast tenderness or enlargement — anti-androgenic effect; reversible",
      "Hyperkalaemia — monitor serum potassium, especially in renal impairment or with ACE inhibitors",
      "Postural hypotension — especially at higher doses; take with food",
      "ABSOLUTE CONTRAINDICATION in pregnancy — teratogenic (feminises male fetus); mandatory contraception",
    ],
    faq: [
      { question: "How long before spironolactone improves hair loss?", answer: "For female pattern hair loss, allow 6–12 months of consistent use before evaluating response. Initial improvement in shedding typically occurs at 3–6 months. Regrowth is slower and more variable. Many women experience stabilisation of hair loss without dramatic regrowth — this is a treatment success, preventing further loss." },
      { question: "Can spironolactone be used in males?", answer: "Spironolactone is generally not used in males for hair loss because its anti-androgenic effects cause gynaecomastia (breast tissue development) and sexual dysfunction in men. Finasteride and dutasteride (5α-reductase inhibitors) are preferred for male AGA. In cardiac and renal contexts, spironolactone is used in males, with gynaecomastia managed by dose minimisation or switching to eplerenone." },
      { question: "Does spironolactone cause dehydration?", answer: "At doses used for acne/hair loss (25–200mg/day), significant dehydration is uncommon. The diuretic effect is mild at these doses. Polyuria (increased urination) may occur. Stay well hydrated, especially in hot weather or during exercise. At higher cardiac doses (100–400mg/day), more significant volume and electrolyte monitoring is required." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved — heart failure, hypertension, oedema, hyperaldosteronism", notes: "Off-label: acne, FPHL. Aldactone, CaroSpir" },
      { region: "UK", agency: "MHRA", status: "Approved — heart failure, resistant hypertension, Conn's syndrome", notes: "Off-label: FPHL, acne. Aldactone" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Licensed; used extensively off-label for PCOS and FPHL" },
      { region: "Canada", agency: "Health Canada", status: "Approved — cardiac and renal indications", notes: "Off-label for dermatology; Aldactone" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Diuretic effect established; possible postural hypotension initially" },
      { timeframe: "3–6 months", description: "Reduction in androgenetic shedding; early acne improvement" },
      { timeframe: "6–12 months", description: "Stabilisation or regrowth of FPHL; acne maintained in remission" },
    ],
    },

    // ─── HORMONAL ─────────────────────────────────────────────────────────────

    {
      name: "Tamoxifen",
      slug: "tamoxifen",
      abbreviation: "TAM",
      aliases: ["tamoxifen citrate", "nolvadex", "tamorex", "tamilong"],
      category: "hormonal",
      tagline: "SERM — breast cancer treatment, gynecomastia & PCT",
      description: "Selective oestrogen receptor modulator (SERM). Acts as an oestrogen antagonist in breast tissue while having agonist activity in bone and uterus. Used for hormone-receptor-positive breast cancer, chemoprevention, gynecomastia, and post-cycle therapy (PCT) in men.",
      color: "#1B3A7A",
      vial: "Oral tablet",
      recon: "10mg, 20mg",
      startDose: "10mg/day",
      targetDose: "20–40mg/day",
      frequency: "Once daily (breast cancer) / 4–6 weeks (PCT)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Gold-standard adjuvant therapy for ER+ breast cancer — reduces recurrence by 50% over 5 years. Effective gynecomastia treatment (pubertal or AAS-induced). PCT use restores endogenous testosterone production by blocking hypothalamic oestrogen receptors.",
      tips: "For PCT: typically 40mg/day × 2 weeks, 20mg/day × 2 weeks. For gynecomastia: 10–20mg/day for 3–6 months. Take at the same time daily. Grapefruit may affect metabolism.",
      sideEffects: "Hot flushes, vaginal discharge, mood changes. Risk of thromboembolic events and endometrial cancer with long-term use in women. Men: decreased libido, visual disturbances (rarely).",
      watchOut: "Increased endometrial cancer risk with long-term use (5+ years) in women. Thromboembolic risk — avoid if history of DVT/PE. Drug interactions with CYP2D6 inhibitors (paroxetine, fluoxetine reduce efficacy).",
      researchLevel: "Extensively Studied",
      tags: ["Hormonal", "SERM", "PCT", "Breast Cancer", "Gynecomastia"],
      researchIndications: [
        { category: "Hormonal / Breast", effectiveness: "Most Effective", items: [
          { title: "ER+ Breast Cancer Adjuvant", description: "5-year tamoxifen reduces recurrence by ~50% and mortality by ~30% in ER+ early breast cancer." },
          { title: "Gynecomastia", description: "Effective at 10–20mg/day for AAS-induced and pubertal gynecomastia — reduces glandular tissue in 80%+ of cases." },
          { title: "Post-Cycle Therapy (PCT)", description: "Restores LH/FSH axis by blocking hypothalamic oestrogen feedback. Raises testosterone within 2–4 weeks." },
        ]},
      ],
      indianBrands: [
        { brand: "Tamorex 10" },
        { brand: "Tamorex 20" },
        { brand: "Tamodex 10" },
        { brand: "Tamodex 20" },
        { brand: "Tamilong 20" },
        { brand: "Tamoxol 20" },
        { brand: "Tamobix 20" },
      ],
    ukBrands: [
      { brand: "Nolvadex-D 20mg", manufacturer: "AstraZeneca" },
      { brand: "Tamoxifen (generic)", notes: "Available from multiple manufacturers" },
    ],
    usBrands: [
      { brand: "Nolvadex 10mg / 20mg", manufacturer: "AstraZeneca" },
      { brand: "Soltamox 10mg/5ml Solution", manufacturer: "Rosemont" },
    ],
    canadaBrands: [
      { brand: "Tamofen 10mg / 20mg", manufacturer: "Sanofi" },
      { brand: "Nolvadex-D 20mg", manufacturer: "AstraZeneca" },
    ],
    
    overview: {
      whatIsIt: "Tamoxifen is a selective oestrogen receptor modulator (SERM) that competitively inhibits oestrogen binding in breast tissue. First approved in 1977, it remains the cornerstone of adjuvant hormone therapy for oestrogen receptor-positive (ER+) breast cancer and is used off-label in men for gynecomastia and post-cycle therapy (PCT).",
      keyBenefits: "Reduces breast cancer recurrence risk by approximately 50% in ER+ tumours over 5 years. Reduces risk of contralateral breast cancer. In men, reverses gynecomastia by blocking oestrogen at breast tissue and restores LH/FSH signalling suppressed by anabolic steroid use. Has bone-preserving agonist effects in postmenopausal women.",
      mechanismOfAction: "Binds competitively to oestrogen receptors (ERα and ERβ) with tissue-selective agonist/antagonist activity. In breast tissue: pure antagonist — blocks oestrogen-driven cell proliferation. In uterus and bone: partial agonist — preserves bone density, increases endometrial proliferation risk. In the hypothalamic-pituitary axis (in men): blocks negative feedback, stimulating LH and FSH release.",
    },
    pharmacokinetics: { peak: "4–7h", halfLife: "5–7 days (active metabolite endoxifen: 50–100h)", cleared: "~1 month (full equilibrium)" },
    researchProtocols: [
      { goal: "ER+ Breast Cancer (adjuvant)", dose: "20mg/day", frequency: "Once daily × 5–10 years", route: "Oral" },
      { goal: "Gynecomastia (male)", dose: "10–20mg/day", frequency: "Once daily × 3–6 months", route: "Oral" },
      { goal: "PCT (post-cycle)", dose: "40mg/day (weeks 1–2), 20mg/day (weeks 3–4)", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Strong CYP2D6 inhibitors (fluoxetine, paroxetine) — reduce active metabolite endoxifen", status: "avoid" },
      { name: "Warfarin (INR increases significantly)", status: "caution" },
      { name: "Aromatase inhibitors (anastrozole, letrozole) — do not combine for breast cancer", status: "avoid" },
      { name: "SSRIs (especially paroxetine, fluoxetine)", status: "caution" },
      { name: "Rifampicin (reduces tamoxifen levels)", status: "caution" },
    ],
    sideEffectNotes: [
      "Hot flushes — most common in women; dose-dependent",
      "Uterine effects — endometrial thickening, polyps, and small increased risk of uterine cancer with long-term use; annual gynaecological review recommended",
      "Thromboembolic events (DVT, PE) — 2–3× increased risk; avoid in patients with prior VTE history",
      "Mood changes, depression, and cognitive fog reported in some women",
      "In men: reduced libido at higher doses due to ER blockade in CNS",
      "Visual disturbances (retinopathy) — rare with high-dose or very long-term use",
    ],
    faq: [
      { question: "Can tamoxifen be used by men for gynecomastia?", answer: "Yes — tamoxifen is the most evidence-backed medical treatment for pubertal and drug-induced gynecomastia. By blocking oestrogen receptors in breast tissue, it reduces glandular tissue volume. Typically 10–20mg/day is used for 3–6 months. Response is best in early or soft gynecomastia; established fibrous tissue responds poorly." },
      { question: "What is the role of tamoxifen in post-cycle therapy (PCT)?", answer: "After anabolic steroid cycles, suppressed LH/FSH leads to low endogenous testosterone. Tamoxifen blocks hypothalamic/pituitary oestrogen receptors, reversing this suppression and restoring LH/FSH secretion. Commonly run at 40mg for 2 weeks then 20mg for 2 weeks. Clomiphene is often used concurrently. PCT should begin after steroids have cleared (timing depends on ester)." },
      { question: "Does tamoxifen affect fertility?", answer: "In women, tamoxifen has paradoxical fertility-promoting effects by blocking pituitary oestrogen feedback, stimulating FSH/LH and ovulation — it is used off-label as a clomiphene alternative for ovulation induction. In men, tamoxifen raises testosterone and may improve sperm parameters in hypogonadotropic hypogonadism. However, it is absolutely contraindicated during pregnancy as it is teratogenic." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "ER+ breast cancer (adjuvant and metastatic), ductal carcinoma in situ (DCIS), breast cancer risk reduction in high-risk women" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "ER+ breast cancer; also used off-label for gynecomastia. Nolvadex brand" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Licensed for breast cancer; widely used off-label for PCT and gynecomastia" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Licensed for breast cancer treatment and risk reduction" },
    ],
    expectTimeline: [
      { timeframe: "2–4 weeks", description: "Gynecomastia or PCT: early LH/FSH recovery measurable; subjective breast tenderness reduces" },
      { timeframe: "6–12 weeks", description: "Gynecomastia: maximum breast tissue reduction in responsive cases" },
      { timeframe: "5 years", description: "Breast cancer: full adjuvant benefit realised; data now supports 10-year regimens in premenopausal women" },
    ],
    },

    {
      name: "Raloxifene",
      slug: "raloxifene",
      abbreviation: "RAL",
      aliases: ["evista", "raloxiheal", "raloxifene hcl"],
      category: "hormonal",
      tagline: "SERM — osteoporosis, gynecomastia & breast cancer prevention",
      description: "Second-generation SERM. Oestrogen antagonist in breast and uterus; agonist in bone (prevents osteoporosis) and lipid metabolism. Preferred over tamoxifen for gynecomastia in some protocols as it carries lower endometrial cancer risk. Also used for postmenopausal osteoporosis.",
      color: "#1B3A7A",
      vial: "Oral tablet",
      recon: "60mg",
      startDose: "60mg/day",
      targetDose: "60mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Reduces vertebral fracture risk by 30–50% in postmenopausal osteoporosis. Lower uterotrophic effect than tamoxifen. Reduces invasive breast cancer risk by 44%. Effective for gynecomastia with potentially lower side effect profile.",
      tips: "For gynecomastia/PCT protocols: 60mg once daily. Reduces cardiovascular risk (LDL lowering). Supplement with calcium and vitamin D if using for osteoporosis.",
      sideEffects: "Hot flushes, leg cramps, DVT/PE risk (similar to tamoxifen), peripheral oedema.",
      watchOut: "VTE risk — avoid if history of deep vein thrombosis. Discontinue 72 hours before prolonged immobilisation. Not for premenopausal women (no benefit; VTE risk).",
      researchLevel: "Extensively Studied",
      tags: ["Hormonal", "SERM", "Osteoporosis", "Gynecomastia"],
      researchIndications: [
        { category: "Hormonal / Bone", effectiveness: "Most Effective", items: [
          { title: "Postmenopausal Osteoporosis", description: "MORE trial: 30–50% reduction in vertebral fracture risk at 3 years. Approved FDA first-line." },
          { title: "Gynecomastia", description: "Effective at 60mg/day for AAS-induced gynecomastia. Some clinicians prefer over tamoxifen due to no uterine stimulation." },
          { title: "Breast Cancer Prevention", description: "STAR trial: comparable to tamoxifen for invasive breast cancer prevention with lower uterine cancer risk." },
        ]},
      ],
      indianBrands: [
        { brand: "Raloxiheal 60" },
        { brand: "Evista 60" },
      ],
    ukBrands: [
      { brand: "Evista 60mg", manufacturer: "Eli Lilly" },
    ],
    usBrands: [
      { brand: "Evista 60mg", manufacturer: "Eli Lilly" },
    ],
    canadaBrands: [
      { brand: "Evista 60mg", manufacturer: "Eli Lilly" },
    ],
    
    overview: {
      whatIsIt: "Raloxifene is a second-generation selective oestrogen receptor modulator (SERM) approved for osteoporosis prevention/treatment in postmenopausal women and breast cancer risk reduction. Distinct from tamoxifen in that it has no uterine agonist activity, making it safer for long-term use in women with intact uterus.",
      keyBenefits: "Increases bone mineral density by 2–3% per year in the spine and hip. Reduces vertebral fracture risk by 30–50% (MORE trial). Reduces invasive breast cancer risk by 44–72% in high-risk women. Does not stimulate the endometrium — safer than tamoxifen for uterine safety. Modestly improves LDL cholesterol.",
      mechanismOfAction: "Binds oestrogen receptors with tissue selectivity. In bone: agonist — activates ER-mediated osteoblast activity and inhibits osteoclast differentiation, preserving bone density. In breast: antagonist — blocks ER-driven tumour cell proliferation. In uterus: neutral/antagonist — unlike tamoxifen, does not cause endometrial proliferation. In brain: partial agonist.",
    },
    pharmacokinetics: { peak: "6h", halfLife: "27.7h", cleared: "5–7 days" },
    researchProtocols: [
      { goal: "Osteoporosis (prevention/treatment)", dose: "60mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Breast Cancer Risk Reduction (STAR trial)", dose: "60mg/day", frequency: "Once daily × 5 years", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (decreases PT/INR — monitor)", status: "caution" },
      { name: "Cholestyramine (reduces raloxifene absorption by 60%)", status: "avoid" },
      { name: "Hormone replacement therapy (concurrent use not recommended)", status: "avoid" },
    ],
    sideEffectNotes: [
      "Hot flushes — 25–28%; most common in early use; reduces over time",
      "Leg cramps — 5–9%; particularly at night",
      "Thromboembolic events (DVT, PE) — similar risk to tamoxifen (~3×); absolute contraindication in prior VTE",
      "No uterine stimulation — major advantage over tamoxifen in uterine safety",
    ],
    faq: [
      { question: "Is raloxifene better than tamoxifen for breast cancer prevention?", answer: "In the STAR trial, raloxifene was equally effective as tamoxifen for invasive breast cancer risk reduction in high-risk postmenopausal women, but with fewer uterine cancers, fewer blood clots, and fewer cataracts. For breast cancer risk reduction (not treatment), raloxifene is generally preferred in postmenopausal women due to its superior safety profile." },
      { question: "Can raloxifene be used in men?", answer: "Raloxifene is occasionally used off-label in men for gynecomastia (similar to tamoxifen) and as an alternative SERM in PCT. Evidence is more limited than for tamoxifen in men. In small studies it reduces gynecomastia similarly to tamoxifen. Off-label use in men requires physician supervision." },
      { question: "Can I take raloxifene with calcium and vitamin D?", answer: "Yes — concurrent calcium (1000–1200mg/day) and vitamin D3 (800–1000 IU/day) supplementation is recommended alongside raloxifene for osteoporosis management. These are complementary, not interacting. Ensure adequate calcium intake from diet and supplements combined." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Evista — osteoporosis and breast cancer risk reduction in postmenopausal women" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Evista — osteoporosis; not specifically approved for breast cancer prevention" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Licensed for postmenopausal osteoporosis" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Evista — licensed for osteoporosis treatment in postmenopausal women" },
    ],
    expectTimeline: [
      { timeframe: "3–6 months", description: "Bone turnover markers improve; early improvements in bone density measurable" },
      { timeframe: "12–18 months", description: "Significant improvement in bone mineral density at spine and hip" },
      { timeframe: "3–5 years", description: "Maximum fracture risk reduction established; breast cancer prevention benefit realised" },
    ],
    },

    {
      name: "Mesterolone",
      slug: "mesterolone",
      abbreviation: "MSTR",
      aliases: ["proviron", "provironum", "mesterolone 25mg"],
      category: "hormonal",
      tagline: "DHT derivative — libido, free testosterone & anti-oestrogenic",
      description: "Mesterolone is an oral androgen derived from DHT. It has high androgen receptor affinity and binds strongly to SHBG, displacing testosterone and increasing free testosterone levels. Used clinically for male hypogonadism, male infertility, and libido enhancement. Does not convert to oestrogen.",
      color: "#1B3A7A",
      vial: "Oral tablet",
      recon: "25mg",
      startDose: "25mg/day",
      targetDose: "50–75mg/day",
      frequency: "Once to three times daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Increases free testosterone by displacing it from SHBG. Improves libido and sexual function. Anti-oestrogenic properties useful on AAS cycles. Improves sperm motility and count in infertility.",
      tips: "Does not suppress endogenous testosterone at typical doses (<100mg/day). Often stacked in AAS protocols to maintain libido. Not hepatotoxic (unlike many oral steroids). Used as PCT adjunct to boost free testosterone.",
      sideEffects: "Acne, oily skin, hair thinning (in predisposed individuals), prostate hypertrophy at high doses.",
      watchOut: "Prostate enlargement — contraindicated in prostate cancer. Not recommended in women (virilisation). DHT-type, so worsens androgenetic alopecia.",
      researchLevel: "Well Researched",
      tags: ["Hormonal", "Androgen", "DHT", "Libido", "Proviron"],
      researchIndications: [
        { category: "Male Hormonal Health", effectiveness: "Effective", items: [
          { title: "Male Hypogonadism", description: "Clinical use for hypogonadal symptoms: improves libido, energy, and wellbeing without LH suppression at low doses." },
          { title: "Male Infertility", description: "Improves sperm motility and density in oligospermia. Mechanisms: androgen receptor stimulation in Sertoli cells." },
          { title: "Free Testosterone Enhancement", description: "Displaces testosterone from SHBG, increasing biologically active free testosterone fraction." },
        ]},
      ],
      indianBrands: [
        { brand: "Provironum 25" },
        { brand: "Proviron 25" },
      ],
    ukBrands: [
      { brand: "Proviron 25mg", manufacturer: "Bayer" },
    ],
    usBrands: [
      { brand: "Not FDA approved", notes: "No licensed brand in the US; used off-label in some compounding pharmacies" },
    ],
    canadaBrands: [
      { brand: "Not approved", notes: "Not licensed by Health Canada" },
    ],
    
    overview: {
      whatIsIt: "Mesterolone (Proviron) is an orally active androgen/anabolic steroid derived from dihydrotestosterone (DHT). Unlike most oral steroids, it is not 17-alpha alkylated and therefore has minimal hepatotoxicity. It does not aromatise to oestrogen. Used clinically for male hypogonadism and male infertility; used in performance contexts to reduce oestrogen-related side effects and improve androgen activity.",
      keyBenefits: "Increases free testosterone by binding sex hormone-binding globulin (SHBG), displacing testosterone. Anti-oestrogenic at the receptor level (weak oestrogen blocker). Improves sperm count and motility in oligo/astheno-spermia. No hepatotoxicity (non-17-alpha alkylated). Does not suppress endogenous testosterone significantly at therapeutic doses.",
      mechanismOfAction: "Binds androgen receptors as a partial agonist with DHT-like affinity. Strongly binds SHBG with high affinity, competing with testosterone — this reduces SHBG-bound testosterone and increases the free testosterone fraction. Does not aromatise (lacks the C19 group for aromatase substrate). Anti-androgenic in some tissues via competition with testosterone for AR binding.",
    },
    pharmacokinetics: { peak: "2–3h", halfLife: "12–13h", cleared: "3–4 days" },
    researchProtocols: [
      { goal: "Male Hypogonadism", dose: "25–75mg/day", frequency: "Once to three times daily", route: "Oral" },
      { goal: "Male Infertility (oligospermia)", dose: "75–100mg/day", frequency: "Three times daily × 3–6 months", route: "Oral" },
      { goal: "Performance (free-T elevation)", dose: "25–50mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin / anticoagulants (androgens potentiate anticoagulant effect)", status: "caution" },
      { name: "Insulin/oral hypoglycaemics (androgens increase glucose utilisation)", status: "caution" },
    ],
    sideEffectNotes: [
      "Acne and oily skin — androgenic; dose-dependent",
      "Hair loss acceleration in genetically predisposed men (DHT-derived; strongly androgenic at scalp follicles)",
      "Virilisation in women — not recommended for use in women",
      "Suppression of spermatogenesis at high doses (paradoxical — lower doses improve, high doses suppress)",
      "No significant liver toxicity — key advantage over 17-alpha alkylated oral steroids",
    ],
    faq: [
      { question: "Does mesterolone increase testosterone levels?", answer: "Mesterolone does not directly raise total testosterone but increases the free testosterone fraction by displacing testosterone from SHBG (sex hormone-binding globulin). More free testosterone is biologically active. At low clinical doses it does not suppress LH/FSH significantly, so endogenous production is preserved." },
      { question: "Is mesterolone hepatotoxic?", answer: "No — mesterolone is one of the few oral androgens that is not 17-alpha alkylated, so it undergoes normal hepatic metabolism without the liver toxicity associated with methyltestosterone, oxandrolone, or stanozolol. This makes it suitable for longer-term oral androgen use." },
      { question: "Can mesterolone be used to treat gynecomastia?", answer: "Mesterolone has some oestrogen receptor blocking activity at breast tissue but is far less effective than tamoxifen or raloxifene for this purpose. It may help prevent oestrogen side effects when used alongside aromatising androgens, but should not be relied upon as sole gynecomastia treatment." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Not licensed; previously available as Proviron but withdrawn from UK market" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Proviron and generics available; licensed for male hypogonadism and infertility" },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Never FDA-approved; available as imported compound" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not licensed; available as research compound" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Increase in free testosterone measurable; androgenic effects (mood, libido) begin" },
      { timeframe: "3–6 months", description: "Sperm count and motility improvements in oligospermia" },
      { timeframe: "Ongoing", description: "SHBG-lowering effect maintained throughout consistent dosing" },
    ],
    },

    {
      name: "Testosterone Undecanoate (Oral)",
      slug: "testosterone-undecanoate-oral",
      abbreviation: "TU-O",
      aliases: ["andriol", "testoheal", "testosign", "oral testosterone"],
      category: "hormonal",
      tagline: "Oral testosterone — TRT without injection",
      description: "Testosterone undecanoate is the only oral testosterone formulation with acceptable bioavailability. Absorbed via intestinal lymphatic system (bypasses first-pass hepatic metabolism). Provides physiological testosterone replacement with twice-daily dosing.",
      color: "#1B3A7A",
      vial: "Oral softgel capsule",
      recon: "40mg softgels (Andriol Testocaps)",
      startDose: "40–80mg twice daily",
      targetDose: "120–160mg/day in divided doses",
      frequency: "Twice daily with meals",
      route: "Oral (must be taken with fat-containing food)",
      storage: "Below 25°C, protect from light",
      benefits: "Non-injectable TRT option. Does not cause polycythaemia as frequently as injectable esters. Short half-life means levels can be restored quickly if side effects occur. Avoids injection site issues.",
      tips: "Must be taken with a meal containing ≥19g fat — lymphatic absorption requires dietary fat. Levels are lower and more variable than injectable TRT. Take consistently twice daily, ~12 hours apart.",
      sideEffects: "Acne, oily skin, erythrocytosis (less than injectables), testicular atrophy, libido changes, mild LH/FSH suppression.",
      watchOut: "Less predictable levels than injectables — monitor serum testosterone regularly. Not suitable for high-dose protocols. Same CV cautions as all exogenous testosterone.",
      researchLevel: "Well Researched",
      tags: ["Hormonal", "TRT", "Oral", "Testosterone"],
      researchIndications: [
        { category: "Male Hypogonadism", effectiveness: "Effective", items: [
          { title: "Testosterone Replacement (Oral)", description: "Provides physiological testosterone levels in hypogonadal men. Inferior to injectable in consistency but preferred by needle-averse patients." },
          { title: "Delayed Puberty", description: "Short-term use to initiate secondary sexual characteristics in adolescent males with delayed puberty." },
        ]},
      ],
      indianBrands: [
        { brand: "Testoheal 40" },
        { brand: "Retesto 40" },
        { brand: "Testosign 40" },
        { brand: "Andriol Testocaps 40" },
      ],
    ukBrands: [
      { brand: "Andriol Testocaps 40mg", manufacturer: "Organon" },
    ],
    usBrands: [
      { brand: "Jatenzo 158mg / 198mg / 237mg", manufacturer: "Clarus Therapeutics" },
      { brand: "Kyzatrex 100mg / 150mg / 200mg", manufacturer: "Marius Pharmaceuticals" },
    ],
    canadaBrands: [
      { brand: "Andriol Testocaps 40mg", manufacturer: "Organon" },
    ],
    
    overview: {
      whatIsIt: "Oral testosterone undecanoate (Andriol, Jatenzo) is a long-chain fatty acid ester of testosterone designed for oral bioavailability. Unlike methyltestosterone, it is not hepatotoxic as it is absorbed via lymphatics (chylomicrons) rather than portal circulation. Indicated for male hypogonadism where injectable therapy is impractical.",
      keyBenefits: "Oral testosterone therapy without hepatotoxicity. Absorbed via the lymphatic route, bypassing hepatic first-pass. Physiological testosterone replacement without injection. Shorter duration than injectable esters allows faster dose adjustment. Available in India and UK as Andriol Testocaps.",
      mechanismOfAction: "Testosterone undecanoate is absorbed in the small intestine via the lymphatic system (incorporated into chylomicrons), reaching systemic circulation without hepatic first-pass metabolism. After lymphatic transport, esterases cleave the undecanoate chain to release free testosterone, which then acts on androgen receptors throughout the body.",
    },
    pharmacokinetics: { peak: "4–5h", halfLife: "~3h (as testosterone undecanoate); testosterone t½ ~4–5h", cleared: "24h" },
    researchProtocols: [
      { goal: "Male Hypogonadism (initiation)", dose: "120–160mg/day", frequency: "Twice daily with meals (split dose)", route: "Oral" },
      { goal: "Male Hypogonadism (maintenance)", dose: "40–120mg/day", frequency: "Once to twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin / anticoagulants (androgens enhance anticoagulant effect)", status: "caution" },
      { name: "Insulin/oral hypoglycaemics (androgens improve insulin sensitivity)", status: "caution" },
      { name: "High-fat meals required — bioavailability drops >50% without food", status: "timing" },
    ],
    sideEffectNotes: [
      "Polycythaemia (high haematocrit) — monitor haemoglobin and haematocrit every 3–6 months",
      "Acne and oily skin — androgenic effects",
      "Testicular atrophy and reduced spermatogenesis with long-term use",
      "Oedema — sodium and water retention, particularly at initiation",
      "MUST be taken with meals containing fat — absorption fails without dietary fat",
    ],
    faq: [
      { question: "Why must oral testosterone undecanoate be taken with food?", answer: "Oral testosterone undecanoate relies on lymphatic absorption via incorporation into dietary chylomicrons (fat transport particles). Without fat in the meal, chylomicron formation does not occur and bioavailability drops by 50–80%. Always take with a meal containing at least 10–15g of fat. High-fat meals increase absorption further." },
      { question: "Is oral testosterone undecanoate as effective as injections?", answer: "For most men with hypogonadism, injectable testosterone (enanthate, cypionate, or undecanoate IM) produces more stable serum testosterone levels and higher average concentrations. Oral undecanoate has shorter duration and more variable absorption, requiring twice-daily dosing. It is a useful alternative when injections are not tolerable or practical." },
      { question: "Can women use oral testosterone undecanoate?", answer: "Oral testosterone undecanoate is not approved for use in women. Some clinicians use very low-dose testosterone therapy in women for hypoactive sexual desire disorder (HSDD), but they typically use different formulations (low-dose transdermal gels or creams) rather than the higher doses in Andriol Testocaps." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Andriol Testocaps 40mg — licensed for male hypogonadism" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Andriol Testocaps available; licensed for male hypogonadism" },
      { region: "USA", agency: "FDA", status: "Approved", notes: "Jatenzo (capsules) approved 2019 for primary/hypogonadotropic hypogonadism in adult males" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Andriol Testocaps licensed for male hypogonadism" },
    ],
    expectTimeline: [
      { timeframe: "4–5 hours", description: "Peak serum testosterone after dose; subjective energy improvement" },
      { timeframe: "2–4 weeks", description: "Libido, energy, and mood improvements become consistent" },
      { timeframe: "3–6 months", description: "Full androgen-dependent changes (muscle mass, body composition, haematocrit)" },
    ],
    },

    {
      name: "Menotrophin (FSH + LH)",
      slug: "menotrophin",
      abbreviation: "HMG",
      aliases: ["hmg", "human menopausal gonadotropin", "menodac", "puretrig", "menotropin"],
      category: "hormonal",
      tagline: "Gonadotropin — fertility stimulation & spermatogenesis",
      description: "Menotrophin (HMG) contains both FSH and LH extracted from postmenopausal urine. FSH drives follicular development (females) and spermatogenesis (males); LH stimulates oestrogen/testosterone production. Used in assisted reproduction and male infertility.",
      color: "#1B3A7A",
      vial: "Lyophilised powder for injection",
      recon: "75 IU FSH + 75 IU LH per vial; reconstitute with 1mL sterile water",
      startDose: "75 IU/day",
      targetDose: "75–150 IU/day",
      frequency: "Daily injections, cycles of 7–12 days",
      route: "Subcutaneous or intramuscular injection",
      storage: "2–8°C (refrigerated); use reconstituted solution within 28 days",
      benefits: "Stimulates both FSH and LH pathways for complete gonadotropin replacement. Effective for hypogonadotropic hypogonadism fertility treatment in both sexes. Preferred over pure FSH when LH component is needed (as in post-TRT spermatogenesis restart).",
      tips: "Monitor via oestradiol levels and ovarian ultrasound (females) or sperm count (males). Combine with HCG for maximal spermatogenic effect in males. Store refrigerated.",
      sideEffects: "Injection site reactions, ovarian hyperstimulation syndrome (OHSS) in females, multiple pregnancy risk, headache.",
      watchOut: "OHSS risk in females — monitor oestradiol carefully. In males: gynecomastia possible from elevated oestradiol.",
      researchLevel: "Extensively Studied",
      tags: ["Hormonal", "Fertility", "Gonadotropin", "Spermatogenesis"],
      researchIndications: [
        { category: "Fertility / Gonadotropin Therapy", effectiveness: "Most Effective", items: [
          { title: "Female Infertility (Hypogonadotropic)", description: "Induces follicular development and ovulation in WHO Group I anovulation (hypogonadotropic hypogonadism)." },
          { title: "Male Infertility (Hypogonadotropic)", description: "Combined HMG + HCG restores spermatogenesis in men with hypogonadotropic hypogonadism. Average time to sperm: 4–6 months." },
          { title: "Post-TRT Spermatogenesis Recovery", description: "Combined HMG + HCG accelerates sperm count recovery after exogenous androgen cessation." },
        ]},
      ],
      indianBrands: [
        { brand: "Menodac 75 IU" },
        { brand: "Menodac 150 IU" },
        { brand: "Puretrig 75 IU" },
      ],
    ukBrands: [
      { brand: "Menopur 75 IU / 150 IU", manufacturer: "Ferring" },
      { brand: "Merional 75 IU / 150 IU", manufacturer: "IBSA" },
    ],
    usBrands: [
      { brand: "Menopur 75 IU", manufacturer: "Ferring" },
      { brand: "Repronex 75 IU", manufacturer: "Ferring" },
    ],
    canadaBrands: [
      { brand: "Menopur 75 IU / 150 IU", manufacturer: "Ferring" },
    ],
    
    overview: {
      whatIsIt: "Menotrophin (human menopausal gonadotrophin, hMG) is a purified preparation of FSH (follicle-stimulating hormone) and LH (luteinising hormone) derived from postmenopausal urine. Used in assisted reproduction to stimulate follicular development in women and spermatogenesis in men with hypogonadotropic hypogonadism.",
      keyBenefits: "Provides both FSH and LH activity in a 1:1 ratio — important for full follicular maturation in women. Used when FSH alone is insufficient (e.g., women needing LH to convert androgens to oestrogens in follicles). In hypogonadotropic men, restores spermatogenesis alongside hCG. Essential component of ovarian stimulation protocols for IVF/ICSI.",
      mechanismOfAction: "FSH component stimulates ovarian follicle growth and maturation; LH component supports theca cell androgen production and cooperates with FSH for full follicular development. In men, FSH acts on Sertoli cells to support spermatogenesis, while LH activity supports Leydig cell testosterone production.",
    },
    pharmacokinetics: { peak: "6–18h (FSH component)", halfLife: "70–90h (FSH); 10–13h (LH)", cleared: "Multi-day" },
    researchProtocols: [
      { goal: "Ovarian Stimulation (IVF)", dose: "75–225 IU/day", frequency: "Once daily SC (cycle days 2–12)", route: "Subcutaneous or IM" },
      { goal: "Male Hypogonadotropic Hypogonadism — Spermatogenesis", dose: "75–150 IU 3× per week", frequency: "Three times weekly (alongside hCG)", route: "Intramuscular" },
    ],
    interactions: [
      { name: "hCG (used in sequential combination — monitor ovarian response closely)", status: "caution" },
      { name: "Clomiphene (combined protocols increase OHSS risk)", status: "caution" },
    ],
    sideEffectNotes: [
      "Ovarian hyperstimulation syndrome (OHSS) — risk ranges from mild (10–20%) to severe (<1%); daily monitoring by ultrasound required",
      "Multiple pregnancy — increased risk due to multiple follicle development",
      "Injection site reactions — pain, bruising at subcutaneous or IM site",
      "Pelvic discomfort and bloating during stimulation phase",
    ],
    faq: [
      { question: "What is the difference between menotrophin and pure FSH?", answer: "Menotrophin contains both FSH and LH in approximately equal amounts (75 IU each per ampoule). Pure FSH preparations (e.g., follitropin alfa, urofollitropin) contain only FSH. The LH activity in menotrophin is important for women with low baseline LH or for stimulation protocols targeting LH-dependent follicular development. For most IVF patients, either is effective; the choice depends on individual patient profile." },
      { question: "How is menotrophin used in men?", answer: "In men with hypogonadotropic hypogonadism (low FSH/LH from pituitary or hypothalamic causes), spermatogenesis fails due to absent FSH stimulation of Sertoli cells. Menotrophin provides the FSH needed to restore sperm production, typically used alongside hCG (which provides LH activity). Treatment takes 3–12 months for meaningful improvement in sperm count." },
      { question: "What monitoring is required during menotrophin treatment?", answer: "Mandatory monitoring includes transvaginal ultrasound for follicle count and size (every 1–3 days during stimulation), serum oestradiol levels to assess response, and clinical assessment for OHSS symptoms. If ≥3 large follicles develop or oestradiol rises rapidly, the cycle is modified or cancelled to reduce multiple pregnancy and OHSS risk." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Menopur — licensed for infertility treatment in women and men with hypogonadotropic hypogonadism" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Menopur, Menogon — available for ART use under specialist supervision" },
      { region: "USA", agency: "FDA", status: "Approved", notes: "Menopur — approved for infertility (IVF) in women and male hypogonadotropic hypogonadism" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Menopur — licensed for infertility treatment" },
    ],
    expectTimeline: [
      { timeframe: "8–14 days", description: "Follicular development in women — stimulation cycle duration" },
      { timeframe: "3–12 months", description: "Improvement in sperm count in men with hypogonadotropic hypogonadism" },
    ],
    },

    {
      name: "Levothyroxine",
      slug: "levothyroxine",
      abbreviation: "LT4",
      aliases: ["t4", "eltroxin", "thyrodac", "synthroid", "euthyrox"],
      category: "hormonal",
      tagline: "Thyroid hormone — hypothyroidism replacement therapy",
      description: "Synthetic T4 (thyroxine) for thyroid hormone replacement. Converted to active T3 peripherally. Restores normal metabolism, energy, cardiac function, and cognitive performance in hypothyroid patients. The standard of care for primary and central hypothyroidism.",
      color: "#1B3A7A",
      vial: "Oral tablet",
      recon: "25mcg, 50mcg, 75mcg, 88mcg, 100mcg, 112mcg, 125mcg, 137mcg, 150mcg, 175mcg, 200mcg",
      startDose: "25–50mcg/day",
      targetDose: "1.6mcg/kg/day (typical adult)",
      frequency: "Once daily",
      route: "Oral (30–60 min before breakfast on empty stomach)",
      storage: "Room temperature, protect from light and moisture",
      benefits: "Resolves hypothyroid symptoms: fatigue, weight gain, cold intolerance, constipation, depression, cognitive slowing. Prevents cardiac complications of untreated hypothyroidism. Reduces goitre.",
      tips: "Take on an empty stomach 30–60 minutes before breakfast — calcium, iron, and food reduce absorption by up to 40%. Consistent dosing critical. TSH monitored every 6–8 weeks until stable, then annually.",
      sideEffects: "At therapeutic doses: well tolerated. Overdose/over-replacement: palpitations, weight loss, sweating, tremor, anxiety, bone loss, AF.",
      watchOut: "Narrow therapeutic window — over-replacement causes AF and osteoporosis. Interactions: calcium, iron, PPIs (all reduce absorption). Cardiac monitoring in elderly and cardiac patients before starting.",
      researchLevel: "Extensively Studied",
      tags: ["Hormonal", "Thyroid", "Hypothyroidism", "T4"],
      researchIndications: [
        { category: "Thyroid Disorders", effectiveness: "Most Effective", items: [
          { title: "Primary Hypothyroidism", description: "Standard of care. Normalises TSH, resolves all hypothyroid symptoms. Used lifelong." },
          { title: "Central Hypothyroidism", description: "TSH-insensitive dosing required (target free T4 in upper half of reference range)." },
          { title: "Thyroid Cancer Post-Surgery", description: "Suppressive doses used to suppress residual thyroid tissue and metastatic thyroid cancer." },
        ]},
      ],
      indianBrands: [
        { brand: "Thyrodac 25 MCG" },
        { brand: "Thyrodac 50 MCG" },
        { brand: "Thyrodac 100 MCG" },
        { brand: "Eltroxin 50 MCG" },
      ],
    ukBrands: [
      { brand: "Eltroxin 50mcg / 100mcg", manufacturer: "Concordia" },
      { brand: "Levothyroxine (generic)", notes: "Various manufacturers — NHS prescribing by brand recommended for consistency" },
    ],
    usBrands: [
      { brand: "Synthroid 25–300mcg", manufacturer: "AbbVie" },
      { brand: "Levoxyl 25–200mcg", manufacturer: "Pfizer" },
      { brand: "Tirosint 13–200mcg", manufacturer: "IBSA", notes: "Gelcap — no fillers" },
    ],
    canadaBrands: [
      { brand: "Synthroid 25–300mcg", manufacturer: "AbbVie" },
      { brand: "Eltroxin 50–200mcg", manufacturer: "Concordia" },
    ],
    
    overview: {
      whatIsIt: "Levothyroxine (L-T4) is synthetic thyroxine, identical to the hormone produced by the thyroid gland. It is the standard first-line treatment for all forms of hypothyroidism. The thyroid produces both T4 (thyroxine) and T3 (triiodothyronine); T4 is peripherally deiodinated to the more active T3. Levothyroxine replaces the body's T4 pool and relies on normal peripheral conversion.",
      keyBenefits: "Restores euthyroid state in primary, central, and post-surgical hypothyroidism. Long half-life (7 days) allows once-daily dosing and stable thyroid hormone levels. Highly consistent bioavailability when taken correctly. Available in precise microgram increments for fine dose titration. Suppressive high doses used post-thyroid cancer surgery to inhibit residual thyroid tissue.",
      mechanismOfAction: "Levothyroxine is absorbed from the small intestine and bound to thyroid-binding globulin (TBG) in plasma. Peripherally, deiodinase enzymes (DIO1, DIO2) convert T4 to active T3. T3 enters cells and binds thyroid hormone nuclear receptors (TRα, TRβ), regulating genes controlling metabolism, heart rate, thermogenesis, neurological development, and GI motility.",
    },
    pharmacokinetics: { peak: "2–4h (T4 serum peak)", halfLife: "7 days", cleared: "~4 weeks (steady state requires 4–6 weeks)" },
    researchProtocols: [
      { goal: "Hypothyroidism (initial)", dose: "25–50 mcg/day", frequency: "Once daily (30 min before breakfast)", route: "Oral" },
      { goal: "Hypothyroidism (maintenance)", dose: "1.6 mcg/kg/day (titrated by TSH)", frequency: "Once daily", route: "Oral" },
      { goal: "Thyroid Cancer Suppression", dose: "2–2.4 mcg/kg/day", frequency: "Once daily (target TSH <0.1 mU/L)", route: "Oral" },
    ],
    interactions: [
      { name: "Calcium carbonate, iron, antacids (reduce absorption — separate by 4h)", status: "timing" },
      { name: "Cholestyramine / colestipol (adsorb T4 in gut)", status: "caution" },
      { name: "Warfarin (T4 increases warfarin sensitivity)", status: "monitor" },
      { name: "Amiodarone (inhibits T4→T3 conversion, contains iodine)", status: "caution" },
      { name: "Rifampicin, phenytoin (increase T4 metabolism)", status: "caution" },
    ],
    sideEffectNotes: [
      "All side effects of levothyroxine are dose-related — essentially, over-replacement causes hyperthyroid symptoms",
      "Palpitations, tachycardia, atrial fibrillation — most serious at excess dose; higher risk in elderly",
      "Insomnia, anxiety, tremor — from excessive T3 derived from T4",
      "Weight loss and increased appetite at supraphysiological doses",
      "Osteoporosis — suppressive TSH levels over years increase bone turnover; DXA monitoring recommended in thyroid cancer patients",
    ],
    faq: [
      { question: "Why must levothyroxine be taken on an empty stomach?", answer: "Levothyroxine absorption is significantly reduced by food, calcium, iron, antacids, and coffee — all of which bind or compete with T4 in the small intestine. Take 30–60 minutes before any food or other medications for consistent absorption. If this is not practical, evening dosing (3+ hours after dinner) provides equivalent results according to studies." },
      { question: "How long does it take for levothyroxine to work?", answer: "TSH normalises within 4–8 weeks because T4 has a 7-day half-life and steady state takes ~5 half-lives (about 5 weeks). Symptom improvement (energy, mood, weight) typically parallels TSH normalisation at 6–8 weeks. Do not adjust dose more frequently than every 6–8 weeks. Measure TSH 6–8 weeks after any dose change." },
      { question: "Should I take T3 (liothyronine) in addition to levothyroxine?", answer: "Most patients do well on levothyroxine monotherapy. A minority of patients have suboptimal conversion of T4 to T3 (due to DIO2 polymorphism) and may benefit from combined T4/T3 therapy. The British Thyroid Association and American Thyroid Association endorse a trial of low-dose T3 (liothyronine) addition in patients persistently symptomatic on T4 monotherapy. This requires close monitoring due to T3's shorter half-life." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Synthroid, Levoxyl, Tirosint, Unithroid — primary hypothyroidism and thyroid cancer management" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Eltroxin, Levothyroxine (various generics) — first-line hypothyroidism treatment" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Thyronorm, Thyrox, Eltroxin — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Synthroid, Eltroxin — licensed for hypothyroidism" },
    ],
    expectTimeline: [
      { timeframe: "2 weeks", description: "Energy levels and mood begin improving; early TSH response" },
      { timeframe: "6–8 weeks", description: "TSH reaches new steady state; assess and adjust dose if needed" },
      { timeframe: "3–6 months", description: "Full symptomatic benefit: weight stabilisation, hair regrowth, cognitive normalisation" },
    ],
    },

    // ─── METABOLIC ────────────────────────────────────────────────────────────

    {
      name: "Atorvastatin",
      slug: "atorvastatin",
      abbreviation: "ATOR",
      aliases: ["lipitor", "atorvatin", "atoguard", "lipicure"],
      category: "metabolic",
      tagline: "HMG-CoA reductase inhibitor — LDL lowering & cardiovascular risk",
      description: "High-intensity statin. Inhibits HMG-CoA reductase, reducing hepatic cholesterol synthesis. Increases LDL receptor expression. Lowers LDL by 40–60% (dose-dependent). Also has pleiotropic anti-inflammatory and plaque-stabilising effects beyond lipid lowering.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "10mg, 20mg, 40mg, 80mg",
      startDose: "10–20mg/day",
      targetDose: "40–80mg/day",
      frequency: "Once daily (any time)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Reduces LDL by 40–60%. Decreases major adverse cardiovascular events (MACE) by ~35% in high-risk patients. Reduces stroke risk. Plaque-stabilising effect reduces ACS risk independent of LDL lowering.",
      tips: "Can be taken at any time of day (unlike older statins). Grapefruit juice increases plasma levels. Report muscle pain immediately — myopathy/rhabdomyolysis risk. Baseline LFTs before starting.",
      sideEffects: "Myalgia (3–5%), elevated liver transaminases, new-onset diabetes (modest risk), headache. Myopathy/rhabdomyolysis rare but serious.",
      watchOut: "Myopathy risk increases with high doses, gemfibrozil co-administration, CYP3A4 inhibitors (clarithromycin, itraconazole). Stop if CK > 10× ULN or severe muscle symptoms. Avoid in active liver disease.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "Statin", "Cholesterol", "Cardiovascular"],
      researchIndications: [
        { category: "Dyslipidaemia / Cardiovascular Risk", effectiveness: "Most Effective", items: [
          { title: "Primary Hypercholesterolaemia", description: "40–60% LDL reduction. First-line high-intensity statin for high cardiovascular risk patients." },
          { title: "Secondary Prevention (Post-MI/Stroke)", description: "PROVE-IT trial: 80mg atorvastatin reduces MACE vs 40mg pravastatin. Standard of care." },
          { title: "Primary Prevention (High Risk)", description: "ASCOT-LLA trial: 36% reduction in MI risk in hypertensive patients without prior CVD at 10mg/day." },
        ]},
      ],
      indianBrands: [
        { brand: "Atoguard 10" },
        { brand: "Atoguard 20" },
        { brand: "Atoguard 40" },
        { brand: "Lipicure 10" },
        { brand: "Atorvatin 10" },
        { brand: "Atoder 20" },
      ],
    ukBrands: [
      { brand: "Lipitor 10–80mg", manufacturer: "Pfizer" },
      { brand: "Atorvastatin (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Lipitor 10–80mg", manufacturer: "Pfizer" },
      { brand: "Atorvastatin (generic)", notes: "Widely available from multiple manufacturers" },
    ],
    canadaBrands: [
      { brand: "Lipitor 10–80mg", manufacturer: "Pfizer" },
      { brand: "Atorvastatin (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Atorvastatin is a synthetic HMG-CoA reductase inhibitor (statin) and the world's best-selling pharmaceutical of all time. Approved in 1996, it reduces LDL cholesterol by 37–51% at standard doses and lowers cardiovascular event risk (MI, stroke, CV death) by 25–35%. The most potent conventional statin per milligram.",
      keyBenefits: "Reduces LDL-C by 37–51% dose-dependently. Reduces major cardiovascular events by 25–35% (ASCOT-LLA trial). Also lowers triglycerides by 14–33% and raises HDL by 5–8%. Anti-inflammatory plaque-stabilising effects independent of lipid lowering (pleiotropic effects). Benefit demonstrated in primary and secondary prevention, in diabetics, and in the elderly.",
      mechanismOfAction: "Competitively inhibits HMG-CoA reductase — the rate-limiting enzyme in hepatic cholesterol synthesis. Reduced intracellular cholesterol upregulates LDL receptor expression on hepatocytes, increasing LDL clearance from plasma. Also reduces VLDL production (hence TG lowering) and has pleiotropic anti-inflammatory and plaque-stabilising effects through NF-κB and other pathways.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "14h (active metabolite: 20–30h)", cleared: "~72h" },
    researchProtocols: [
      { goal: "Primary Prevention (moderate risk)", dose: "10–20mg/day", frequency: "Once daily (any time of day)", route: "Oral" },
      { goal: "Primary Prevention (high risk) / Secondary Prevention", dose: "40–80mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Intensive Statin Therapy (post-ACS, very high risk)", dose: "80mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Strong CYP3A4 inhibitors (clarithromycin, itraconazole, HIV protease inhibitors) — increase statin exposure, myopathy risk", status: "avoid" },
      { name: "Cyclosporin (very high myopathy risk — contraindicated)", status: "avoid" },
      { name: "Fibrates, especially gemfibrozil (additive myopathy risk)", status: "caution" },
      { name: "Grapefruit juice (moderate CYP3A4 inhibition)", status: "caution" },
      { name: "Warfarin (atorvastatin modestly increases INR)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Myalgia (5–10%) — muscle aching without CK elevation; most common statin side effect; often dose-related",
      "Statin-associated muscle symptoms (SAMS) — spectrum from myalgia to rare rhabdomyolysis (<1 per 10,000)",
      "Elevated liver enzymes (transaminases) — clinically significant hepatotoxicity rare; check LFTs if symptomatic",
      "New-onset diabetes — small increase in risk (9–13% relative) at high doses over years; outweighed by cardiovascular benefit in most patients",
      "Cognitive effects — rare reports; case reports of memory issues, generally reversible on discontinuation",
    ],
    faq: [
      { question: "Does atorvastatin need to be taken at night?", answer: "No — atorvastatin can be taken at any time of day, unlike pravastatin or simvastatin which have shorter half-lives and are traditionally taken at night. Atorvastatin's 14-hour half-life (and active metabolite t½ of 20–30h) means it provides sustained inhibition regardless of dosing time. Take at the same time each day for consistency." },
      { question: "Can I stop atorvastatin if my cholesterol is normal?", answer: "Stopping statins is generally not recommended if they are managing cardiovascular risk — cholesterol will return to baseline within weeks. LDL targets, not just 'normal' reference ranges, guide statin therapy (e.g., <2.0 mmol/L for high-risk patients). If you are on a statin primarily for statin prevention with reassuringly low 10-year risk, discuss with your doctor — but stopping without guidance is inadvisable." },
      { question: "Is atorvastatin safe during pregnancy?", answer: "Statins are contraindicated in pregnancy (Category X). They inhibit a pathway critical for foetal development (cholesterol is essential for cell membranes and steroid hormones). Stop atorvastatin before planned conception, during pregnancy, and breastfeeding. An alternative lipid management approach during pregnancy should be discussed with your obstetrician." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lipitor (Pfizer); generic approved 2011. First-line for hypercholesterolaemia and CV prevention" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Lipitor; generic widely prescribed. NICE recommends 20mg for primary prevention, 80mg for secondary prevention" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Atorva, Lipicure, Storvas — widely prescribed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Lipitor; generic atorvastatin widely available" },
    ],
    expectTimeline: [
      { timeframe: "2 weeks", description: "Meaningful LDL reduction (30–40%) measurable" },
      { timeframe: "4–6 weeks", description: "Maximum lipid-lowering effect established at given dose" },
      { timeframe: "1–5 years", description: "Cardiovascular event risk reduction becomes measurable in trials (ongoing benefit)" },
    ],
    },

    {
      name: "Ezetimibe",
      slug: "ezetimibe",
      abbreviation: "EZE",
      aliases: ["ezetrol", "zetia", "vasfree", "ezemore"],
      category: "metabolic",
      tagline: "Cholesterol absorption inhibitor — add-on to statin therapy",
      description: "Ezetimibe inhibits the Niemann-Pick C1-Like 1 (NPC1L1) transporter in the small intestine, reducing cholesterol absorption by ~50%. When added to statin therapy, provides an additional 15–20% LDL reduction beyond the statin alone.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "10mg",
      startDose: "10mg/day",
      targetDose: "10mg/day",
      frequency: "Once daily (any time)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Reduces LDL by additional 15–20% when added to statin. IMPROVE-IT trial: ezetimibe + statin reduces cardiovascular events vs statin alone. Alternative when statin intolerance exists. No significant myopathy risk.",
      tips: "Can be combined with any statin. Take at any time. Bile acid sequestrants reduce absorption — take 2 hours before or 4 hours after. Also available in fixed-dose combination with simvastatin or atorvastatin.",
      sideEffects: "Generally well tolerated. Mild GI symptoms, arthralgias, myopathy (very rare — only when combined with statin).",
      watchOut: "Avoid in moderate to severe hepatic impairment. Monitor LFTs when combining with statin.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "Cholesterol", "NPC1L1", "Statin Adjunct"],
      researchIndications: [
        { category: "Dyslipidaemia", effectiveness: "Effective", items: [
          { title: "Statin Add-On Therapy", description: "IMPROVE-IT: ezetimibe + simvastatin reduced major cardiovascular events by 6.4% vs simvastatin alone over 7 years." },
          { title: "Statin Intolerance", description: "Provides meaningful LDL reduction as monotherapy or with low-dose statin in statin-intolerant patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Vasfree 10" },
        { brand: "Ezemore 10" },
      ],
    ukBrands: [
      { brand: "Ezetrol 10mg", manufacturer: "MSD" },
    ],
    usBrands: [
      { brand: "Zetia 10mg", manufacturer: "Organon" },
    ],
    canadaBrands: [
      { brand: "Ezetrol 10mg", manufacturer: "Organon" },
    ],
    
    overview: {
      whatIsIt: "Ezetimibe is a cholesterol absorption inhibitor that selectively blocks the Niemann-Pick C1-Like 1 (NPC1L1) transporter in the small intestine, reducing dietary and biliary cholesterol absorption by ~50%. Used as monotherapy or combined with statins for additional LDL reduction beyond what statins alone achieve.",
      keyBenefits: "Reduces LDL-C by an additional 18–25% on top of statin therapy. Well-tolerated with minimal side effects — distinct mechanism from statins means no myopathy or liver enzyme risks. Proven cardiovascular benefit in the IMPROVE-IT trial (+reduced CV events with simvastatin + ezetimibe vs simvastatin alone). Useful alternative for statin-intolerant patients. Can be combined with PCSK9 inhibitors.",
      mechanismOfAction: "Inhibits the NPC1L1 transporter expressed on enterocytes and hepatocyte bile canalicular membranes. NPC1L1 is the primary transporter for cholesterol uptake from the intestinal lumen. By blocking this transporter, ezetimibe reduces cholesterol delivery to the liver, which compensates by upregulating LDL receptors — reducing plasma LDL.",
    },
    pharmacokinetics: { peak: "4–12h", halfLife: "22h (active glucuronide)", cleared: "~7 days" },
    researchProtocols: [
      { goal: "LDL Lowering (add-on or monotherapy)", dose: "10mg/day", frequency: "Once daily (any time)", route: "Oral" },
    ],
    interactions: [
      { name: "Cholestyramine / bile acid sequestrants (reduce ezetimibe absorption by 55% — separate by 2h)", status: "timing" },
      { name: "Cyclosporin (increases ezetimibe exposure 12-fold — caution in transplant patients)", status: "caution" },
      { name: "Fibrates (slight increase in ezetimibe concentration)", status: "caution" },
    ],
    sideEffectNotes: [
      "Diarrhoea and GI discomfort — generally mild; 1–4% of patients",
      "Myopathy — rare; risk increased when combined with statins but far lower than statin monotherapy",
      "Elevated liver enzymes — uncommon; monitor if combining with high-dose statin",
    ],
    faq: [
      { question: "How much does ezetimibe reduce LDL on its own?", answer: "Ezetimibe monotherapy reduces LDL-C by approximately 18–25%. This is modest compared to high-intensity statins (40–55% reduction) but meaningful for statin-intolerant patients or those who cannot achieve targets on statin alone. The IMPROVE-IT trial showed that adding ezetimibe to simvastatin reduces cardiovascular events beyond statin alone, confirming that 'lower is better' for LDL." },
      { question: "Is ezetimibe effective for statin-intolerant patients?", answer: "Yes — ezetimibe is the preferred first alternative for patients who cannot tolerate statins due to myopathy or elevated liver enzymes. Its completely different mechanism means it does not share statin side effects. It can then be combined with bempedoic acid (another non-statin LDL-lowering agent) for greater effect." },
      { question: "When should ezetimibe be added to statin therapy?", answer: "Ezetimibe is typically added when a patient is on maximum tolerated statin dose but has not reached their LDL target. NICE guidance recommends adding ezetimibe 10mg before considering more expensive PCSK9 inhibitors. It is also used from initiation in very high-risk patients who need aggressive LDL reduction alongside high-intensity statin therapy." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Zetia — approved for primary hypercholesterolaemia and homozygous familial hypercholesterolaemia" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ezetrol — licensed; Vytorin (ezetimibe/simvastatin fixed-dose) also available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Ezentia, Statin-EZ combinations widely prescribed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Ezetrol — licensed for hypercholesterolaemia" },
    ],
    expectTimeline: [
      { timeframe: "2 weeks", description: "Initial 15–20% LDL reduction measurable" },
      { timeframe: "4–6 weeks", description: "Maximum effect established" },
    ],
    },

    {
      name: "Empagliflozin",
      slug: "empagliflozin",
      abbreviation: "EMPA",
      aliases: ["jardiance", "empaone", "empaneo", "empacip"],
      category: "metabolic",
      tagline: "SGLT-2 inhibitor — diabetes, heart failure & kidney protection",
      description: "Empagliflozin inhibits sodium-glucose cotransporter-2 (SGLT-2) in the renal proximal tubule, causing glucose excretion in urine. Beyond glucose lowering, it reduces cardiovascular mortality, hospitalisations for heart failure, and progression of chronic kidney disease — independently of diabetes status.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "10mg, 25mg",
      startDose: "10mg/day",
      targetDose: "10–25mg/day",
      frequency: "Once daily (morning)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Reduces HbA1c by 0.6–0.8%. Cardiovascular mortality reduction (EMPA-REG OUTCOME). Reduces hospitalisation for heart failure. Slows CKD progression. Weight loss (~2–3kg) and BP reduction as secondary benefits.",
      tips: "Take in the morning to avoid nocturia. Adequate hydration important. Genital hygiene key to prevent mycotic infections. Withhold before surgery or prolonged fasting (DKA risk).",
      sideEffects: "Genital mycotic infections (most common), UTIs, polyuria, volume depletion. Rare: DKA (including euglycaemic DKA). Fournier's gangrene (extremely rare).",
      watchOut: "Hold before surgery or prolonged fasting. Not for eGFR < 20 (for glucose lowering). Euglycaemic DKA — monitor ketones if symptomatic. Avoid dehydration.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "SGLT-2", "Diabetes", "Heart Failure", "CKD"],
      researchIndications: [
        { category: "Metabolic / Cardiovascular", effectiveness: "Most Effective", items: [
          { title: "Type 2 Diabetes + CV Risk", description: "EMPA-REG: 38% reduction in CV death, 35% reduction in heart failure hospitalisation vs placebo in T2DM with established CVD." },
          { title: "Heart Failure (HFrEF/HFpEF)", description: "EMPEROR-Reduced and EMPEROR-Preserved: reduces HF hospitalisation in both EF types regardless of diabetes status." },
          { title: "Chronic Kidney Disease", description: "EMPA-KIDNEY: 28% reduction in kidney disease progression or CV death in CKD patients (with or without diabetes)." },
        ]},
      ],
      indianBrands: [
        { brand: "Empaone 10" },
        { brand: "Empaone 25" },
        { brand: "Empaneo 10" },
        { brand: "Empacip 10" },
        { brand: "Jardiance 10" },
      ],
    ukBrands: [
      { brand: "Jardiance 10mg / 25mg", manufacturer: "Boehringer Ingelheim / Eli Lilly" },
    ],
    usBrands: [
      { brand: "Jardiance 10mg / 25mg", manufacturer: "Boehringer Ingelheim / Eli Lilly" },
    ],
    canadaBrands: [
      { brand: "Jardiance 10mg / 25mg", manufacturer: "Boehringer Ingelheim / Eli Lilly" },
    ],
    
    overview: {
      whatIsIt: "Empagliflozin is an SGLT2 (sodium-glucose cotransporter-2) inhibitor that blocks glucose reabsorption in the renal proximal tubule, causing glycosuria and lowering blood glucose. Beyond glucose control, it has profound cardiovascular and renal protective effects demonstrated in landmark outcome trials, making it a cornerstone of modern type 2 diabetes management.",
      keyBenefits: "Reduces HbA1c by 0.7–1.0% in type 2 diabetes. Reduces hospitalisations for heart failure by 35% (EMPA-REG OUTCOME). Reduces progression of diabetic kidney disease by 50% (EMPEROR-Preserved). Promotes weight loss of 2–3kg due to glycosuria. Lowers blood pressure by 3–4 mmHg systolic. Cardiorenal protective effects occur independently of glucose-lowering.",
      mechanismOfAction: "Competitively inhibits SGLT2 in the proximal tubule, preventing reabsorption of filtered glucose and sodium. This causes 60–80g/day of urinary glucose excretion (glycosuria), reducing blood glucose without insulin involvement. The associated natriuresis reduces plasma volume, blood pressure, and preload. Ketogenesis is mildly increased, which may contribute to cardioprotection.",
    },
    pharmacokinetics: { peak: "1.5h", halfLife: "12.4h", cleared: "~48h" },
    researchProtocols: [
      { goal: "Type 2 Diabetes / HF-reduced EF", dose: "10mg/day", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Heart Failure (HFpEF / HFrEF)", dose: "10mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "CKD (renal protection)", dose: "10mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Insulin / sulfonylureas (increased hypoglycaemia risk — reduce dose of insulin/SU)", status: "caution" },
      { name: "Loop diuretics (additive diuresis and volume depletion)", status: "caution" },
      { name: "ACE inhibitors/ARBs (additive renal benefit but monitor K+ and creatinine)", status: "caution" },
    ],
    sideEffectNotes: [
      "Urinary tract infections — 5–8%; due to glycosuria creating favourable environment for bacterial growth",
      "Genital mycotic infections (thrush) — 10–12% in women, 3–4% in men; related to urinary glucose",
      "Diabetic ketoacidosis (DKA) — rare but potentially euglycaemic DKA; withhold before surgery (sick day rules)",
      "Volume depletion/hypotension — especially in elderly or those on diuretics; ensure adequate hydration",
      "Fournier's gangrene — extremely rare necrotising fasciitis of genitoperineum; reported with SGLT2i class",
    ],
    faq: [
      { question: "Can empagliflozin be used without diabetes?", answer: "Yes — empagliflozin has received approval for heart failure with reduced ejection fraction (HFrEF) and heart failure with preserved ejection fraction (HFpEF) regardless of diabetes status. The EMPEROR-Reduced and EMPEROR-Preserved trials showed significant reduction in CV death and HF hospitalisations in non-diabetic patients. It is also approved for CKD regardless of diabetes status in some jurisdictions." },
      { question: "Should empagliflozin be stopped before surgery?", answer: "Yes — SGLT2 inhibitors should be withheld 24–72 hours before major surgery (some guidelines say 3 days). They increase the risk of euglycaemic DKA perioperatively, particularly in fasting patients. The SGLT2 inhibitor should be restarted after oral intake is re-established and the patient is clinically stable." },
      { question: "How does empagliflozin protect the heart and kidneys?", answer: "The cardioprotection and renoprotection appear to be largely independent of glucose lowering. Mechanisms include: osmotic/natriuretic effects reducing preload and afterload; renal tubuloglomerular feedback reducing intraglomerular pressure; metabolic shift towards ketone utilisation (which is a more efficient cardiac fuel); anti-inflammatory and anti-fibrotic effects; and haematocrit increases improving oxygen delivery." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Jardiance — T2DM, HFrEF, HFpEF, CKD. Also available as Synjardy (with metformin)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Jardiance — T2DM and heart failure. NICE TA recommended" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Jardiance, Empaglu — licensed for T2DM" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Jardiance — approved for T2DM, HFrEF, CKD" },
    ],
    expectTimeline: [
      { timeframe: "1 week", description: "Glycosuria established; blood glucose begins falling; weight loss starts" },
      { timeframe: "4–8 weeks", description: "Blood pressure reduction and HbA1c improvement measurable" },
      { timeframe: "6–12 months", description: "Cardiorenal protective effects accumulating; optimal HbA1c and weight benefit" },
    ],
    },

    {
      name: "Dapagliflozin",
      slug: "dapagliflozin",
      abbreviation: "DAPA",
      aliases: ["forxiga", "farxiga", "dapaziga", "dapasmart", "dapadoc"],
      category: "metabolic",
      tagline: "SGLT-2 inhibitor — diabetes, heart failure & kidney protection",
      description: "Dapagliflozin blocks SGLT-2 in the kidney, promoting urinary glucose excretion. Like empagliflozin, provides cardiovascular and renal protection beyond glucose lowering. Approved for T2DM, CKD, and heart failure with reduced ejection fraction.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "5mg, 10mg",
      startDose: "5–10mg/day",
      targetDose: "10mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "HbA1c reduction 0.5–0.9%. Cardiovascular and renal protection. DAPA-HF trial: 26% reduction in worsening HF or CV death. DAPA-CKD: 39% reduction in kidney failure progression.",
      tips: "Similar class to empagliflozin — same safety precautions apply. Hold before surgery. Morning dosing preferred. Maintain good genital hygiene.",
      sideEffects: "Genital infections, UTIs, polyuria, volume depletion, euglycaemic DKA.",
      watchOut: "Avoid in eGFR < 25 for glucose lowering. Hold perioperatively. DKA risk.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "SGLT-2", "Diabetes", "Heart Failure"],
      researchIndications: [
        { category: "Metabolic / Cardiovascular", effectiveness: "Most Effective", items: [
          { title: "Heart Failure (HFrEF)", description: "DAPA-HF: 26% RRR in worsening HF or CV death — first SGLT-2i approved for HF regardless of diabetes status." },
          { title: "CKD Progression", description: "DAPA-CKD: 39% reduction in sustained eGFR decline ≥50%, ESRD, or CV/renal death." },
          { title: "Type 2 Diabetes", description: "Reduces HbA1c, blood pressure, and body weight with cardiovascular benefit in T2DM patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Dapaziga 10" },
        { brand: "Dapasmart 10" },
        { brand: "Dapadoc 10" },
        { brand: "Forxiga 10" },
      ],
    ukBrands: [
      { brand: "Forxiga 5mg / 10mg", manufacturer: "AstraZeneca" },
    ],
    usBrands: [
      { brand: "Farxiga 5mg / 10mg", manufacturer: "AstraZeneca" },
    ],
    canadaBrands: [
      { brand: "Forxiga 5mg / 10mg", manufacturer: "AstraZeneca" },
    ],
    
    overview: {
      whatIsIt: "Dapagliflozin is an SGLT2 inhibitor with a broader range of approved indications than any other agent in its class, covering type 2 diabetes, type 1 diabetes (off-label in many countries), heart failure (HFrEF and HFpEF), and chronic kidney disease (CKD). Its cardiorenal outcome benefits are demonstrated in multiple large trials.",
      keyBenefits: "HbA1c reduction of 0.7–0.9% in T2DM. Reduces CV death or worsening HF by 26% in HFrEF (DAPA-HF). Reduces renal disease progression by 44% in CKD (DAPA-CKD). Weight loss of 2–3kg. Blood pressure reduction 3–5 mmHg systolic. Can be used in CKD to eGFR as low as 25 mL/min/1.73m² for HF/CKD indications.",
      mechanismOfAction: "Inhibits SGLT2 in renal proximal tubule, blocking glucose reabsorption and causing 70–80g/day glucosuria. The osmotic diuresis and natriuresis reduce preload and blood pressure. Upregulation of renal tubuloglomerular feedback reduces hyperfiltration and intraglomerular pressure. Metabolic and anti-inflammatory cardioprotective mechanisms shared across SGLT2i class.",
    },
    pharmacokinetics: { peak: "2h", halfLife: "12.9h", cleared: "~48h" },
    researchProtocols: [
      { goal: "Type 2 Diabetes", dose: "10mg/day", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Heart Failure (HFrEF/HFpEF)", dose: "10mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Chronic Kidney Disease", dose: "10mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Insulin / sulfonylureas (hypoglycaemia risk)", status: "caution" },
      { name: "Diuretics (additive volume depletion)", status: "caution" },
    ],
    sideEffectNotes: [
      "Urinary tract infections — 5–7%; women more affected",
      "Genital mycotic infections — common; manageable with antifungal treatment",
      "Volume depletion — especially in elderly or on loop diuretics",
      "Euglycaemic DKA — rare; withhold perioperatively",
      "Lower limb amputation — signal seen in CANVAS trial for canagliflozin; not consistently replicated with dapagliflozin but monitor in peripheral vascular disease",
    ],
    faq: [
      { question: "Can dapagliflozin be used in type 1 diabetes?", answer: "Dapagliflozin was approved as an adjunct to insulin in type 1 diabetes by the EMA (Forxiga) and some other regulatory agencies but FDA approval was rejected due to DKA risk. In clinical practice it is used off-label in T1DM in some countries. The risk of DKA is significantly higher in T1DM (where insulin is already deficient) and requires careful patient selection, ketone monitoring, and insulin dose adjustment." },
      { question: "Is dapagliflozin the same as empagliflozin?", answer: "Both are SGLT2 inhibitors with similar mechanisms and clinical effects. Key differences: dapagliflozin has the widest approved indications (including CKD down to eGFR 25 mL/min/1.73m²), while empagliflozin has more cardiovascular outcome data in acute HFpEF. In practice, choice is often based on local guidelines, cost, and available combinations. Both are acceptable first-choice agents." },
      { question: "What are the sick day rules for dapagliflozin?", answer: "Dapagliflozin (and all SGLT2i) should be stopped during illness, fasting, vomiting, reduced oral intake, dehydration, or perioperatively. This is because these states increase DKA risk — the combination of relative insulin deficiency, volume depletion, and SGLT2i-induced ketogenesis can trigger potentially life-threatening euglycaemic DKA. Restart once eating and drinking normally for 24+ hours." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Farxiga — T2DM, HFrEF, HFpEF, CKD" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Forxiga — T2DM, T1DM (adjunct), HFrEF, HFpEF, CKD" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Forxiga, Dapamac — licensed for T2DM" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Farxiga — T2DM, HF, CKD" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Glycosuria established; early blood glucose and weight reduction" },
      { timeframe: "6–12 weeks", description: "HbA1c improvement measurable; blood pressure reduction" },
      { timeframe: "12+ months", description: "Cardiorenal protective effects accumulating" },
    ],
    },

    {
      name: "Sitagliptin",
      slug: "sitagliptin",
      abbreviation: "SITA",
      aliases: ["januvia", "insgtra", "instra", "sitagliptin phosphate"],
      category: "metabolic",
      tagline: "DPP-4 inhibitor — type 2 diabetes glucose control",
      description: "Sitagliptin inhibits dipeptidyl peptidase-4 (DPP-4), prolonging the action of incretin hormones (GLP-1 and GIP). This enhances insulin secretion and reduces glucagon in a glucose-dependent manner, reducing HbA1c by 0.5–0.8% with very low hypoglycaemia risk.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "25mg, 50mg, 100mg",
      startDose: "100mg/day",
      targetDose: "100mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Glucose-dependent insulin release — low hypoglycaemia risk. Weight neutral. Well tolerated. Can be combined with metformin, sulfonylureas, or insulin. Renal dose adjustment required.",
      tips: "Take at same time each day, with or without food. Reduce dose to 50mg if eGFR 30–45; 25mg if eGFR < 30. Widely available as combination tablet with metformin.",
      sideEffects: "Generally well tolerated. Nasopharyngitis, upper respiratory tract infections. Rare: pancreatitis, joint pain, severe hypersensitivity.",
      watchOut: "Rare pancreatitis reports — stop if persistent abdominal pain. Dose reduce in renal impairment.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "DPP-4", "Diabetes", "Incretin"],
      researchIndications: [
        { category: "Type 2 Diabetes", effectiveness: "Effective", items: [
          { title: "HbA1c Reduction", description: "Monotherapy or add-on: 0.5–0.8% HbA1c reduction. Glucose-dependent action — minimal hypoglycaemia risk." },
          { title: "Combination with Metformin", description: "Most used combination in T2DM. Sitagliptin + metformin: HbA1c reduction of 1.8% vs 1.1% monotherapy." },
        ]},
      ],
      indianBrands: [
        { brand: "Insgtra 50" },
        { brand: "Insgtra 100" },
        { brand: "Januvia 100" },
      ],
    ukBrands: [
      { brand: "Januvia 25mg / 50mg / 100mg", manufacturer: "MSD" },
    ],
    usBrands: [
      { brand: "Januvia 25mg / 50mg / 100mg", manufacturer: "Merck" },
    ],
    canadaBrands: [
      { brand: "Januvia 25mg / 50mg / 100mg", manufacturer: "MSD" },
    ],
    
    overview: {
      whatIsIt: "Sitagliptin is the first DPP-4 (dipeptidyl peptidase-4) inhibitor approved for type 2 diabetes, launched in 2006. It prolongs the action of endogenous incretin hormones (GLP-1 and GIP) by blocking their degradation, enhancing insulin secretion in a glucose-dependent manner and reducing glucagon secretion.",
      keyBenefits: "HbA1c reduction of 0.6–0.8%. Weight-neutral (does not cause weight gain unlike sulfonylureas). Very low hypoglycaemia risk due to glucose-dependent insulin release. Well-tolerated with minimal GI side effects (advantage over GLP-1 analogues). Cardiovascular safety confirmed in the TECOS trial. Twice daily version (Janumet) combined with metformin widely used.",
      mechanismOfAction: "Inhibits DPP-4, the enzyme that cleaves and inactivates GLP-1 and GIP within 2 minutes of their release from gut L- and K-cells. By preserving these incretins, sitagliptin potentiates glucose-stimulated insulin secretion from pancreatic β-cells and suppresses glucagon from α-cells — both in a glucose-dependent manner (effects switch off at euglycaemia, preventing hypoglycaemia).",
    },
    pharmacokinetics: { peak: "1–4h", halfLife: "12.4h", cleared: "~48h" },
    researchProtocols: [
      { goal: "Type 2 Diabetes (normal renal function)", dose: "100mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Type 2 Diabetes (eGFR 30–45)", dose: "50mg/day", frequency: "Once daily (dose-reduced)", route: "Oral" },
      { goal: "Type 2 Diabetes (eGFR <30 or dialysis)", dose: "25mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Insulin / sulfonylureas (additive hypoglycaemia — reduce SU or insulin dose)", status: "caution" },
      { name: "Digoxin (sitagliptin marginally increases digoxin AUC by 11%)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Nasopharyngitis and upper respiratory tract infections — 5–6%; slightly higher than placebo",
      "Pancreatitis — rare but reported with DPP-4 class; stop if abdominal pain develops",
      "Joint pain (arthralgia) — severe and disabling arthralgia reported; FDA warning issued; usually resolves on discontinuation",
      "Urticaria and angioedema — rare hypersensitivity reactions",
    ],
    faq: [
      { question: "How does sitagliptin compare to metformin?", answer: "Sitagliptin has less HbA1c-lowering potency than metformin (0.6–0.8% vs 1.0–1.5%) and is more expensive. Metformin remains first-line for T2DM. Sitagliptin is preferred when metformin is contraindicated or not tolerated, and is effective when added to metformin. The combination (Janumet) is widely used and produces additive 1.2–1.6% HbA1c reduction." },
      { question: "Is sitagliptin safe in elderly patients with kidney disease?", answer: "Yes — sitagliptin can be used in CKD and elderly patients with dose adjustment (50mg for eGFR 30–45, 25mg for eGFR <30). It has low hypoglycaemia risk (important in elderly) and is weight-neutral. The TECOS trial showed no increased cardiovascular risk even in patients with established CV disease. Dose adjustment based on eGFR is mandatory." },
      { question: "Can sitagliptin cause pancreatitis?", answer: "The DPP-4 inhibitor class carries a class effect warning for pancreatitis. The absolute risk is very low (estimated 1–2 additional cases per 10,000 patient-years) and causality remains debated — a large meta-analysis did not find significantly increased pancreatitis risk. Patients with prior pancreatitis, gallstones, or heavy alcohol use should avoid sitagliptin and the class. Stop immediately if abdominal pain develops." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Januvia (sitagliptin), Janumet (sitagliptin/metformin)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Januvia, Janumet — licensed for T2DM" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Januvia, Zita, Istamet — widely used" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Januvia, Janumet — licensed for T2DM" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Postprandial glucose reductions evident" },
      { timeframe: "4–8 weeks", description: "HbA1c improvement measurable" },
      { timeframe: "3 months", description: "Full HbA1c response at given dose; reassess" },
    ],
    },

    {
      name: "Glimepiride",
      slug: "glimepiride",
      abbreviation: "GLIM",
      aliases: ["amaryl", "glimepiride 1mg", "glimith", "glibenclamide"],
      category: "metabolic",
      tagline: "Sulfonylurea — insulin secretagogue for type 2 diabetes",
      description: "Glimepiride is a third-generation sulfonylurea that stimulates insulin secretion by binding to ATP-sensitive potassium channels on pancreatic beta cells. Lower hypoglycaemia risk compared to earlier sulfonylureas (glibenclamide). Used alone or with other antidiabetics.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "1mg, 2mg, 4mg",
      startDose: "1–2mg/day",
      targetDose: "4–8mg/day",
      frequency: "Once daily (with breakfast)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective HbA1c reduction (1–2%). Lower hypoglycaemia risk than glibenclamide. Once-daily dosing improves adherence. Insulin-sparing effect. May have mild insulin-sensitising properties.",
      tips: "Take with first meal of the day. Start low and titrate every 1–2 weeks. Monitor glucose closely — hypoglycaemia risk especially if meal is delayed. Reduce dose in renal impairment.",
      sideEffects: "Hypoglycaemia (main risk), weight gain, GI upset. Rare: haematological (haemolytic anaemia, thrombocytopaenia).",
      watchOut: "Hypoglycaemia risk in elderly, renal impairment, irregular meal patterns. Avoid in sulfa allergy. Cross-reactive with sulfonamides.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "Sulfonylurea", "Diabetes", "Insulin Secretagogue"],
      researchIndications: [
        { category: "Type 2 Diabetes", effectiveness: "Most Effective", items: [
          { title: "HbA1c Lowering", description: "HbA1c reduction 1–2%. Effective monotherapy and add-on agent." },
          { title: "Insulin Combination", description: "Combination with basal insulin reduces insulin requirements and maintains glycaemic control." },
        ]},
      ],
      indianBrands: [
        { brand: "Glimith 1" },
        { brand: "Glimith 2" },
        { brand: "Glimith 4" },
        { brand: "Glizid 1" },
      ],
    ukBrands: [
      { brand: "Amaryl 1mg / 2mg / 3mg / 4mg", manufacturer: "Sanofi" },
      { brand: "Glimepiride (generic)", notes: "Available from multiple manufacturers" },
    ],
    usBrands: [
      { brand: "Amaryl 1mg / 2mg / 4mg", manufacturer: "Sanofi" },
      { brand: "Glimepiride (generic)", notes: "Available from multiple manufacturers" },
    ],
    canadaBrands: [
      { brand: "Amaryl 1mg / 2mg / 4mg", manufacturer: "Sanofi" },
    ],
    
    overview: {
      whatIsIt: "Glimepiride is a third-generation sulfonylurea that stimulates insulin secretion from pancreatic beta cells regardless of blood glucose levels. The most widely prescribed sulfonylurea globally, particularly in South Asia. Used for type 2 diabetes when lifestyle modification and metformin are insufficient.",
      keyBenefits: "Reduces HbA1c by 1.0–1.5% — among the most effective oral glucose-lowering agents. Lower risk of hypoglycaemia and weight gain than older sulfonylureas (glibenclamide/glyburide). Once-daily dosing improves adherence. Lower cardiovascular risk signal compared to older sulfonylureas. Inexpensive and widely available.",
      mechanismOfAction: "Binds SUR1 subunit of ATP-sensitive potassium (K-ATP) channels on pancreatic beta cells, closing them. This depolarises the cell membrane, triggering calcium influx and insulin exocytosis. Effect is independent of blood glucose concentration — insulin is released even when glucose is normal or low, explaining the hypoglycaemia risk. Also has mild insulin-sensitising effects at peripheral tissues.",
    },
    pharmacokinetics: { peak: "2–3h", halfLife: "5–8h", cleared: "24h" },
    researchProtocols: [
      { goal: "Type 2 Diabetes (initiation)", dose: "1–2mg/day", frequency: "Once daily (with breakfast)", route: "Oral" },
      { goal: "Type 2 Diabetes (maintenance)", dose: "4–6mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Type 2 Diabetes (maximum)", dose: "8mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Alcohol (increased hypoglycaemia + disulfiram-like reaction)", status: "caution" },
      { name: "NSAIDs, warfarin (protein displacement increases free drug)", status: "caution" },
      { name: "Beta-blockers (mask hypoglycaemia symptoms)", status: "caution" },
      { name: "Fluconazole / CYP2C9 inhibitors (increase glimepiride levels)", status: "caution" },
    ],
    sideEffectNotes: [
      "Hypoglycaemia — most important risk; highest in elderly, those with renal impairment, or skipping meals",
      "Weight gain — 1–2kg average; less than older sulfonylureas",
      "Nausea and GI upset — typically mild and transient",
      "Photosensitivity — sulfonylurea class effect; wear sun protection",
    ],
    faq: [
      { question: "When should glimepiride be taken?", answer: "Glimepiride should be taken with the first meal of the day (breakfast). Taking it before a meal ensures the insulin release coincides with the postprandial glucose rise, reducing hypoglycaemia risk. Never take on an empty stomach or skip a meal after taking glimepiride — this is the most common cause of hypoglycaemia." },
      { question: "How does glimepiride differ from glibenclamide (glyburide)?", answer: "Glimepiride is a third-generation sulfonylurea with a shorter duration of action, lower binding affinity for cardiac K-ATP channels (less cardiovascular risk signal), once-daily dosing, and lower hypoglycaemia risk compared to glibenclamide. Glibenclamide has a very long duration and active metabolites — particularly problematic in elderly and those with renal impairment. Glimepiride is generally preferred over glibenclamide for these reasons." },
      { question: "Will glimepiride cause me to need insulin eventually?", answer: "Type 2 diabetes is progressive due to ongoing beta cell failure over time. Sulfonylureas accelerate beta cell exhaustion by constantly stimulating insulin release. Most patients on sulfonylureas will eventually require additional therapy or insulin, typically within 5–10 years. This is a property of the underlying disease progression rather than glimepiride per se. Annual review of HbA1c and consideration of combination therapy is standard." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Amaryl — licensed for T2DM as monotherapy or combination therapy" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Generic glimepiride — widely prescribed for T2DM" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Amaryl, Glimy, Glisen — most commonly prescribed sulfonylurea in India" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Amaryl — licensed for T2DM" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Fasting and postprandial glucose reductions evident" },
      { timeframe: "3 months", description: "Full HbA1c response established" },
    ],
    },

    {
      name: "Semaglutide",
      slug: "semaglutide",
      abbreviation: "SEMA",
      aliases: ["ozempic", "wegovy", "rybelsus", "mounjaro-adjacent", "glp-1 agonist"],
      category: "metabolic",
      tagline: "GLP-1 receptor agonist — weight loss & diabetes",
      description: "Semaglutide is a long-acting GLP-1 receptor agonist. It suppresses appetite via central hypothalamic pathways, slows gastric emptying, and enhances glucose-dependent insulin secretion. Available as weekly subcutaneous injection (Ozempic/Wegovy) and daily oral tablet (Rybelsus).",
      color: "#059669",
      vial: "Subcutaneous injection (prefilled pen) / Oral tablet",
      recon: "0.25mg, 0.5mg, 1mg, 2mg/dose (inj.); 3mg, 7mg, 14mg (oral)",
      startDose: "0.25mg/week SC (dose-escalate over 4 weeks)",
      targetDose: "1–2.4mg/week (obesity); 1mg/week (T2DM)",
      frequency: "Once weekly SC; once daily oral",
      route: "Subcutaneous injection or oral",
      storage: "Refrigerate unused pen (2–8°C); in-use pen at room temp for 56 days",
      benefits: "Weight loss of 15–20% body weight (STEP trials). HbA1c reduction ~1.5%. Reduces major cardiovascular events (SUSTAIN-6, SELECT trial). Reduces appetite and cravings significantly.",
      tips: "Inject subcutaneously into abdomen, thigh, or upper arm — rotate sites. Oral version must be taken with max 120mL water ≥30 min before food/other drugs. Start at lowest dose to minimise nausea.",
      sideEffects: "Nausea (most common, improves with time), vomiting, diarrhoea, constipation, injection site reactions. Rare: pancreatitis, thyroid C-cell tumours in rodents (clinical significance uncertain).",
      watchOut: "Contraindicated in personal/family history of medullary thyroid carcinoma or MEN2. Pancreatitis — stop if severe abdominal pain. Hypoglycaemia risk only when combined with insulin/sulfonylureas.",
      researchLevel: "Extensively Studied",
      tags: ["Metabolic", "GLP-1", "Weight Loss", "Diabetes", "Obesity"],
      researchIndications: [
        { category: "Obesity / Metabolic", effectiveness: "Most Effective", items: [
          { title: "Chronic Weight Management", description: "STEP 1 trial: 14.9% weight loss vs 2.4% placebo at 68 weeks (2.4mg/week). Most effective pharmacotherapy for obesity." },
          { title: "Type 2 Diabetes", description: "SUSTAIN trials: ~1.5% HbA1c reduction, significant weight loss, low hypoglycaemia risk." },
          { title: "Cardiovascular Risk Reduction", description: "SELECT trial (2023): 20% reduction in major adverse cardiovascular events in overweight/obese patients with prior CVD — no diabetes required." },
        ]},
      ],
      indianBrands: [
        { brand: "Ozempic 0.25Pen" },
        { brand: "Ozempic 0.5Pen" },
        { brand: "Ozempic 1Pen" },
        { brand: "Rybelsus 7" },
        { brand: "Rybelsus 14" },
      ],
    ukBrands: [
      { brand: "Ozempic 0.25/0.5/1mg (injectable)", manufacturer: "Novo Nordisk", notes: "For T2DM" },
      { brand: "Wegovy 0.25–2.4mg (injectable)", manufacturer: "Novo Nordisk", notes: "For obesity" },
      { brand: "Rybelsus 3/7/14mg (oral)", manufacturer: "Novo Nordisk" },
    ],
    usBrands: [
      { brand: "Ozempic 0.25/0.5/1/2mg (injectable)", manufacturer: "Novo Nordisk", notes: "For T2DM" },
      { brand: "Wegovy 0.25–2.4mg (injectable)", manufacturer: "Novo Nordisk", notes: "For obesity" },
      { brand: "Rybelsus 3/7/14mg (oral)", manufacturer: "Novo Nordisk" },
    ],
    canadaBrands: [
      { brand: "Ozempic 0.25/0.5/1mg (injectable)", manufacturer: "Novo Nordisk" },
      { brand: "Wegovy 0.25–2.4mg (injectable)", manufacturer: "Novo Nordisk", notes: "For obesity" },
      { brand: "Rybelsus 3/7/14mg (oral)", manufacturer: "Novo Nordisk" },
    ],
    
    overview: {
      whatIsIt: "Semaglutide is a GLP-1 receptor agonist (GLP-1 RA) available as a weekly subcutaneous injection (Ozempic — T2DM; Wegovy — obesity) and as a daily oral tablet (Rybelsus). The first GLP-1 RA to demonstrate cardiovascular mortality reduction in a dedicated CVOT (SUSTAIN-6), and the first with an FDA-approved obesity indication proving superiority vs all prior obesity medications in magnitude of weight loss.",
      keyBenefits: "Reduces HbA1c by 1.5–2.0% in T2DM. Produces 12–17% body weight loss in obesity (STEP trials), exceeding all prior approved pharmacotherapies. Reduces major cardiovascular events (CV death, MI, stroke) by 26% in high-risk T2DM patients (SUSTAIN-6, SELECT). Reduces appetite and food cravings centrally. Once-weekly injection improves adherence dramatically versus daily agents.",
      mechanismOfAction: "Activates GLP-1 receptors in the pancreas, brain, GI tract, and cardiovascular system. Pancreatic: glucose-dependent insulin secretion and glucagon suppression. Brain: activates hypothalamic satiety centres, reducing appetite and food intake. GI: slows gastric emptying. Cardiovascular: direct protective effects on vasculature and reduced inflammation. Kidney: reduces albuminuria and slows CKD progression.",
    },
    pharmacokinetics: { peak: "1–3 days (SC)", halfLife: "~168h (7 days)", cleared: "5 weeks (full washout)" },
    researchProtocols: [
      { goal: "Type 2 Diabetes (Ozempic)", dose: "0.25mg/wk (4 wks), then 0.5mg/wk; escalate to 1mg or 2mg", frequency: "Once weekly SC", route: "Subcutaneous" },
      { goal: "Obesity / Overweight (Wegovy)", dose: "Escalate over 16 weeks to 2.4mg/wk", frequency: "Once weekly SC", route: "Subcutaneous" },
      { goal: "Type 2 Diabetes (Rybelsus oral)", dose: "3mg/day × 30 days, then 7mg/day, then 14mg/day", frequency: "Once daily (30 min before any food/drink)", route: "Oral" },
    ],
    interactions: [
      { name: "Insulin / sulfonylureas (increased hypoglycaemia — reduce dose)", status: "caution" },
      { name: "Oral medications with narrow therapeutic index (gastric emptying slowed — altered absorption)", status: "timing" },
      { name: "Warfarin (monitor INR — GI motility changes affect absorption)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Nausea, vomiting, diarrhoea — dose-dependent; most common at dose escalation; typically resolves over 4–8 weeks",
      "Decreased appetite — intended pharmacological effect; patients should maintain adequate nutrition",
      "Pancreatitis — rare; stop if persistent abdominal pain; do not use in personal/family history of medullary thyroid cancer or MEN2",
      "Injection site reactions — mild and transient",
      "Gallbladder disease — rapid weight loss increases gallstone risk; monitor for biliary symptoms",
      "Thyroid C-cell tumours — seen in rodents; human relevance uncertain; class warning",
    ],
    faq: [
      { question: "How does semaglutide cause weight loss?", answer: "Semaglutide activates GLP-1 receptors in the hypothalamus (especially the arcuate nucleus and area postrema), suppressing appetite and increasing satiety. It also slows gastric emptying, making meals feel more filling for longer. In the STEP trials, patients lost 14.9% of body weight on average on 2.4mg/week — with reduced cravings for foods, reduced portion sizes, and improved relationship with food reported." },
      { question: "Can semaglutide be used without diabetes?", answer: "Yes — Wegovy (semaglutide 2.4mg weekly) is FDA-approved for chronic weight management in adults with BMI ≥30, or BMI ≥27 with at least one weight-related comorbidity (hypertension, T2DM, dyslipidaemia). The SELECT trial showed cardiovascular event reduction with semaglutide in overweight/obese non-diabetic patients with CV disease." },
      { question: "What happens when semaglutide is stopped?", answer: "Weight regained typically begins within weeks of stopping. By 1 year off treatment, approximately two-thirds of lost weight is regained. This parallels findings from bariatric surgery studies — obesity is a chronic condition requiring long-term treatment. Cardiovascular risk markers also return towards baseline. Semaglutide is considered a long-term medication for obesity, not a short course." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Ozempic (T2DM, weekly SC), Wegovy (obesity, weekly SC), Rybelsus (T2DM, oral)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ozempic (T2DM), Wegovy (obesity) — NICE approved; Rybelsus licensed" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Ozempic approved for T2DM; supply constrained due to global demand" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Ozempic (T2DM), Wegovy (obesity), Rybelsus (oral) — all licensed" },
    ],
    expectTimeline: [
      { timeframe: "4 weeks", description: "Nausea at dose escalation; early appetite suppression and glucose reduction" },
      { timeframe: "12 weeks", description: "5–8% weight loss typical; HbA1c improvement measurable" },
      { timeframe: "68 weeks (STEP trial)", description: "Peak weight loss 14.9% average; maximum cardiometabolic benefit" },
    ],
    },

    // ─── CARDIOVASCULAR ───────────────────────────────────────────────────────

    {
      name: "Atenolol",
      slug: "atenolol",
      abbreviation: "ATEN",
      aliases: ["tenormin", "ateheal", "atenolix", "tenolol"],
      category: "cardiovascular",
      tagline: "Beta-1 selective blocker — hypertension, angina & arrhythmia",
      description: "Cardioselective beta-1 adrenoceptor blocker. Reduces heart rate, contractility, and renin release. Preferred over non-selective beta-blockers in patients with asthma or COPD (less beta-2 blockade). Used for hypertension, angina, arrhythmia, and post-MI protection.",
      color: "#DC2626",
      vial: "Oral tablet",
      recon: "25mg, 50mg, 100mg",
      startDose: "25–50mg/day",
      targetDose: "50–100mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective BP reduction. Reduces angina frequency and severity. Post-MI mortality reduction. Rate control in atrial fibrillation. Reduces performance anxiety symptoms (off-label).",
      tips: "Do not stop abruptly — taper to avoid rebound hypertension and angina. Monitor heart rate (target resting HR 55–65 in AF rate control). Less lipid-neutral than nebivolol.",
      sideEffects: "Bradycardia, fatigue, cold extremities, depression, sexual dysfunction, vivid dreams, weight gain.",
      watchOut: "Avoid in severe bradycardia, AV block, decompensated heart failure. Relative caution in asthma (still prefer over non-selective). Abrupt withdrawal dangerous in angina patients.",
      researchLevel: "Extensively Studied",
      tags: ["Cardiovascular", "Beta-Blocker", "Hypertension", "Angina"],
      researchIndications: [
        { category: "Cardiovascular", effectiveness: "Most Effective", items: [
          { title: "Hypertension", description: "Effective first-line antihypertensive; reduces systolic BP by 10–20mmHg. Best combined with diuretic." },
          { title: "Angina Pectoris", description: "Reduces angina episodes and GTN use by decreasing myocardial oxygen demand." },
          { title: "Post-MI Secondary Prevention", description: "BHAT trial: atenolol reduces sudden cardiac death and re-infarction post-MI." },
        ]},
      ],
      indianBrands: [
        { brand: "Ateheal 25" },
        { brand: "Ateheal 50" },
        { brand: "Atenolix 50" },
        { brand: "Tenolol 50" },
        { brand: "Betacard 50" },
      ],
    ukBrands: [
      { brand: "Tenormin 25mg / 50mg / 100mg", manufacturer: "AstraZeneca" },
      { brand: "Atenolol (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Tenormin 25mg / 50mg / 100mg", manufacturer: "AstraZeneca" },
      { brand: "Atenolol (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Tenormin 25mg / 50mg / 100mg", manufacturer: "AstraZeneca" },
      { brand: "Atenolol (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Atenolol is a cardioselective beta-1 adrenergic receptor blocker. First-generation beta-blocker with relative selectivity for cardiac beta-1 receptors over bronchial/vascular beta-2 receptors. Widely used for hypertension, angina, and tachyarrhythmias. Predominantly renally excreted, making it useful in patients with hepatic impairment.",
      keyBenefits: "Reduces heart rate and blood pressure. Effective for rate control in atrial fibrillation and supraventricular tachyarrhythmias. Proven angina prophylaxis. Once-daily dosing. Safer than non-selective beta-blockers in mild-moderate asthma (though still caution required). Water-soluble — less CNS penetration, fewer sleep disturbances than lipophilic beta-blockers (propranolol).",
      mechanismOfAction: "Selectively blocks beta-1 adrenergic receptors in the heart, reducing sinoatrial node rate (negative chronotropy) and atrioventricular node conduction (negative dromotropy), and reducing myocardial contractility (negative inotropy). This lowers heart rate, blood pressure, and myocardial oxygen demand. Cardioselectivity is dose-dependent — lost at higher doses.",
    },
    pharmacokinetics: { peak: "2–4h", halfLife: "6–9h", cleared: "24h" },
    researchProtocols: [
      { goal: "Hypertension", dose: "25–50mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Angina Pectoris", dose: "50–100mg/day", frequency: "Once or twice daily", route: "Oral" },
      { goal: "Arrhythmia (rate control)", dose: "50–100mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Verapamil / diltiazem (IV) — severe bradycardia and AV block risk", status: "avoid" },
      { name: "Clonidine (rebound hypertension if clonidine stopped while on beta-blocker)", status: "caution" },
      { name: "NSAIDs (reduce antihypertensive effect)", status: "caution" },
      { name: "Digoxin (additive AV node slowing)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Bradycardia and fatigue — most common; dose-related",
      "Cold extremities — peripheral vasoconstriction; less than propranolol",
      "Bronchospasm — risk even with cardioselective agents; avoid in severe asthma/COPD",
      "Masking hypoglycaemia symptoms — blunts tachycardia response to low blood sugar (caution in insulin-treated diabetes)",
      "Sleep disturbances less common than lipophilic beta-blockers (propranolol, metoprolol)",
    ],
    faq: [
      { question: "Can atenolol be used in asthma?", answer: "Atenolol is relatively cardioselective but this selectivity is lost at higher doses and is never absolute. All beta-blockers carry risk in asthma — atenolol is less risky than propranolol but should still be avoided in severe or uncontrolled asthma. In mild stable asthma where no alternative exists, atenolol at low doses with spirometry monitoring may be used under specialist supervision." },
      { question: "Can atenolol be stopped abruptly?", answer: "No — atenolol should never be stopped suddenly, particularly in patients with coronary artery disease. Abrupt withdrawal causes rebound tachycardia and hypertension due to upregulation of adrenergic receptors during beta-blockade. This can precipitate unstable angina or myocardial infarction. Always taper over 2–4 weeks." },
      { question: "How does atenolol differ from propranolol?", answer: "Atenolol is cardioselective (beta-1) and water-soluble. Propranolol is non-selective (beta-1 and beta-2) and lipophilic (fat-soluble). Key differences: atenolol causes fewer CNS side effects (less nightmares, depression, fatigue) due to poor brain penetration; propranolol is more effective for anxiety, tremor, migraine, and thyrotoxicosis due to central and beta-2 blocking effects. Propranolol is preferred for performance anxiety; atenolol for hypertension." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Tenormin — hypertension and angina; generic widely available" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Tenormin — widely prescribed; no longer first-line for uncomplicated hypertension per NICE (preferred: ACEI/ARB or CCB)" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Tenormin, Aten, Beta-1 — widely prescribed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Tenormin — licensed for hypertension and angina" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Heart rate and blood pressure begin falling" },
      { timeframe: "1–2 weeks", description: "Blood pressure reduction stabilises" },
      { timeframe: "4–6 weeks", description: "Full antihypertensive benefit established; reassess" },
    ],
    },

    {
      name: "Nebivolol",
      slug: "nebivolol",
      abbreviation: "NEB",
      aliases: ["bystolic", "nebimax", "nebiheal", "nebicar"],
      category: "cardiovascular",
      tagline: "Selective beta-1 blocker with NO release — hypertension",
      description: "Third-generation selective beta-1 blocker with additional nitric oxide (NO)-mediated vasodilatory activity. More metabolically neutral than older beta-blockers (no weight gain, less sexual dysfunction). Preferred choice in metabolic syndrome and sexual health-sensitive patients.",
      color: "#DC2626",
      vial: "Oral tablet",
      recon: "2.5mg, 5mg, 10mg",
      startDose: "2.5–5mg/day",
      targetDose: "5–10mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective BP reduction with vasodilatory benefit. Metabolically neutral — no glucose or lipid adverse effects. Lower sexual dysfunction risk than atenolol. Beneficial in heart failure (EF ≥35%).",
      tips: "Starting at 2.5mg avoids bradycardia in sensitive patients. Monitor heart rate. Metabolically advantageous in diabetic and dyslipidaemic patients.",
      sideEffects: "Bradycardia, headache, dizziness, fatigue. Less sexual dysfunction and metabolic effects than older beta-blockers.",
      watchOut: "Avoid in severe bradycardia, AV block, severe hepatic impairment (extensively metabolised). Do not stop abruptly.",
      researchLevel: "Extensively Studied",
      tags: ["Cardiovascular", "Beta-Blocker", "Hypertension", "Vasodilatory"],
      researchIndications: [
        { category: "Cardiovascular", effectiveness: "Most Effective", items: [
          { title: "Hypertension", description: "Effective as monotherapy or add-on antihypertensive. NO-mediated vasodilation improves endothelial function." },
          { title: "Heart Failure (Stable)", description: "SENIORS trial: nebivolol reduces HF hospitalisation in stable CHF patients ≥70 years." },
        ]},
      ],
      indianBrands: [
        { brand: "Nebimax 2.5" },
        { brand: "Nebimax 5" },
        { brand: "Nebiheal 5" },
      ],
    ukBrands: [
      { brand: "Nebilet 5mg / 10mg", manufacturer: "Menarini" },
    ],
    usBrands: [
      { brand: "Bystolic 2.5mg / 5mg / 10mg / 20mg", manufacturer: "Allergan / Forest" },
    ],
    canadaBrands: [
      { brand: "Not widely marketed", notes: "Not approved by Health Canada; limited availability" },
    ],
    
    overview: {
      whatIsIt: "Nebivolol is a highly cardioselective third-generation beta-1 blocker that uniquely promotes nitric oxide (NO) release from vascular endothelium via beta-3 receptor agonism. This dual mechanism — beta-1 blockade + vasodilation — gives nebivolol better tolerability, improved peripheral circulation, and a different haemodynamic profile than older beta-blockers.",
      keyBenefits: "Highly cardioselective (>200:1 beta-1:beta-2 selectivity). Vasodilation via NO release reduces peripheral vascular resistance — useful where cold hands/feet from older beta-blockers were a problem. No significant erectile dysfunction in clinical trials (unlike atenolol and metoprolol). Lower fatigue profile. Reduced metabolic side effects (less glucose and lipid impact).",
      mechanismOfAction: "Selectively blocks cardiac beta-1 receptors, reducing heart rate and blood pressure. Additionally acts as a beta-3 agonist on vascular endothelium, stimulating eNOS (endothelial nitric oxide synthase) to produce NO — causing vasodilation that reduces afterload and complements the heart-rate-slowing effect. The vasodilatory component distinguishes nebivolol from atenolol, bisoprolol, and metoprolol.",
    },
    pharmacokinetics: { peak: "1.5–4h", halfLife: "10–12h (fast metabolisers); 24h (slow metabolisers via CYP2D6)", cleared: "48h" },
    researchProtocols: [
      { goal: "Hypertension", dose: "5mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Heart Failure (SENIORS trial)", dose: "10mg/day (after titration from 1.25mg)", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Verapamil / diltiazem (additive AV block / bradycardia)", status: "avoid" },
      { name: "CYP2D6 inhibitors (fluoxetine, paroxetine) — increase nebivolol exposure significantly", status: "caution" },
      { name: "Clonidine (rebound hypertension on withdrawal)", status: "caution" },
    ],
    sideEffectNotes: [
      "Headache and dizziness — related to NO-mediated vasodilation at initiation",
      "Bradycardia — monitor heart rate, especially in elderly",
      "Fatigue — less than non-selective beta-blockers but present",
      "Better erectile function profile than atenolol in clinical trials",
    ],
    faq: [
      { question: "Is nebivolol better than other beta-blockers for hypertension?", answer: "Nebivolol has better tolerability in some areas — less erectile dysfunction, less peripheral vasoconstriction (cold hands), and potentially less metabolic impact on glucose and lipids than older agents like atenolol. However, all beta-blockers have modest antihypertensive efficacy and are now typically second- or third-line for uncomplicated hypertension. Nebivolol is preferred when a beta-blocker is specifically indicated (heart failure, angina, tachyarrhythmia) and tolerability is a concern." },
      { question: "Can nebivolol be used in heart failure?", answer: "Yes — the SENIORS trial demonstrated that nebivolol reduces all-cause mortality and CV hospitalisations in elderly patients with heart failure with reduced ejection fraction (HFrEF). Three beta-blockers have proven HF mortality benefit: bisoprolol, carvedilol, and nebivolol. The mechanism is reversal of chronic sympathetic activation. Initiation must be cautious — start at 1.25mg and titrate up slowly over weeks." },
      { question: "Why does nebivolol cause vasodilation when other beta-blockers don't?", answer: "Nebivolol uniquely has beta-3 agonist activity on vascular endothelial cells, stimulating endothelial nitric oxide synthase (eNOS) to produce nitric oxide (NO). NO causes smooth muscle relaxation and vasodilation, reducing peripheral resistance. This is distinct from beta-1 and beta-2 receptor effects and explains why nebivolol reduces afterload rather than increasing it (which older beta-blockers can do)." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Bystolic — licensed for hypertension" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Nebilet — licensed for hypertension and heart failure" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Nebicard, Nebilong — licensed for hypertension and heart failure" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Bystolic — licensed for hypertension" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Heart rate and blood pressure reduction begins" },
      { timeframe: "2–4 weeks", description: "Blood pressure control established at initiation dose" },
    ],
    },

    {
      name: "Ramipril",
      slug: "ramipril",
      abbreviation: "RAMI",
      aliases: ["altace", "ramicon", "ramismart", "ramiwick"],
      category: "cardiovascular",
      tagline: "ACE inhibitor — heart failure, hypertension & kidney protection",
      description: "Ramipril inhibits angiotensin-converting enzyme (ACE), blocking conversion of angiotensin I to angiotensin II. Reduces vasoconstriction, aldosterone secretion, and sodium retention. Reduces proteinuria and provides superior renal protection in diabetic nephropathy.",
      color: "#DC2626",
      vial: "Oral capsule/tablet",
      recon: "1.25mg, 2.5mg, 5mg, 10mg",
      startDose: "1.25–2.5mg/day",
      targetDose: "5–10mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Reduces hypertension, proteinuria, and heart failure mortality. HOPE trial: 22% reduction in MI, stroke, and CV death in high-risk patients. First-line for diabetic nephropathy. Reduces all-cause mortality post-MI.",
      tips: "Monitor potassium and renal function after starting and with each dose increase. Dry cough (up to 20% of patients) — switch to ARB if persistent. Avoid NSAIDs co-administration (reduces efficacy, increases renal risk).",
      sideEffects: "Dry cough (most common; class effect), hyperkalaemia, first-dose hypotension, angioedema (rare but serious), acute kidney injury in bilateral RAS.",
      watchOut: "Absolutely contraindicated in pregnancy. Angioedema — stop immediately. Bilateral renal artery stenosis. Avoid with potassium-sparing diuretics without monitoring.",
      researchLevel: "Extensively Studied",
      tags: ["Cardiovascular", "ACE Inhibitor", "Hypertension", "Heart Failure", "Renal Protection"],
      researchIndications: [
        { category: "Cardiovascular / Renal", effectiveness: "Most Effective", items: [
          { title: "High Cardiovascular Risk", description: "HOPE trial: 22% RRR in combined CV events (MI, stroke, CV death) in patients with established CVD or diabetes + CV risk factors." },
          { title: "Diabetic Nephropathy", description: "Reduces proteinuria and delays ESRD progression in T1DM and T2DM nephropathy." },
          { title: "Post-MI Heart Failure", description: "AIRE trial: 27% mortality reduction in patients with clinical heart failure post-MI." },
        ]},
      ],
      indianBrands: [
        { brand: "Ramicon 2.5" },
        { brand: "Ramicon 5" },
        { brand: "Ramismart 5" },
        { brand: "Ramiwick 5" },
      ],
    ukBrands: [
      { brand: "Altace 1.25–10mg", manufacturer: "Pfizer" },
      { brand: "Tritace 1.25–10mg", manufacturer: "Sanofi" },
    ],
    usBrands: [
      { brand: "Altace 1.25–10mg", manufacturer: "Pfizer / Monarch" },
      { brand: "Ramipril (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Altace 1.25–10mg", manufacturer: "Pfizer" },
      { brand: "Ramipril (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Ramipril is an ACE inhibitor (angiotensin-converting enzyme inhibitor) that blocks conversion of angiotensin I to angiotensin II, reducing vasoconstriction and aldosterone secretion. Demonstrated to reduce all-cause mortality, MI, and stroke in the landmark HOPE trial even in patients without heart failure — establishing ACE inhibitors as a standard secondary cardiovascular prevention therapy.",
      keyBenefits: "Reduces cardiovascular mortality, MI, and stroke in high-risk patients independent of blood pressure effect (HOPE trial). First-line for hypertension, heart failure with reduced EF, and diabetic nephropathy. Reduces progression of proteinuric chronic kidney disease. Renoprotective in diabetic nephropathy — slows microalbuminuria progression.",
      mechanismOfAction: "Ramipril is a prodrug converted hepatically to ramiprilat, which inhibits ACE. This blocks the cleavage of angiotensin I to angiotensin II — reducing vasoconstriction and aldosterone secretion (reducing salt/water retention). Also prevents bradykinin degradation (explaining the cough side effect). Net effect: vasodilation, reduced preload/afterload, lower blood pressure, and reduced cardiac and renal fibrosis.",
    },
    pharmacokinetics: { peak: "2–4h (ramiprilat)", halfLife: "15–17h (ramiprilat)", cleared: "~72h" },
    researchProtocols: [
      { goal: "Hypertension", dose: "2.5–5mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Heart Failure / Post-MI", dose: "2.5–10mg/day (titrated)", frequency: "Once to twice daily", route: "Oral" },
      { goal: "Secondary CV Prevention (HOPE protocol)", dose: "10mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Diabetic Nephropathy", dose: "5–10mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Potassium-sparing diuretics, potassium supplements (hyperkalaemia)", status: "caution" },
      { name: "NSAIDs (reduce antihypertensive effect; increase renal impairment risk)", status: "caution" },
      { name: "Lithium (ACEi reduce lithium clearance — toxicity risk)", status: "caution" },
      { name: "Aliskiren in diabetics (increased renal/cardiovascular risk — contraindicated)", status: "avoid" },
    ],
    sideEffectNotes: [
      "Dry persistent cough — bradykinin accumulation; class effect in 10–15% of patients; switch to ARB if intolerable",
      "Hyperkalaemia — monitor potassium, especially with concurrent potassium-sparing diuretics or renal impairment",
      "First-dose hypotension — particularly in volume-depleted or high-renin patients; start low, take at night",
      "Acute kidney injury — reversible, related to reduced glomerular perfusion pressure (particularly bilateral renal artery stenosis — absolute contraindication)",
      "Angioedema — rare (0.1–0.3%) but potentially life-threatening; typically occurs in first weeks; switch to ARB",
    ],
    faq: [
      { question: "Why do ACE inhibitors cause a cough?", answer: "ACE inhibitors block ACE, which normally degrades bradykinin (a potent bronchoconstrictor and inflammatory mediator). As bradykinin accumulates in the airways, it triggers a dry, persistent cough in 10–15% of patients. This is a class effect of all ACE inhibitors. The cough resolves within 1–4 weeks of stopping the ACE inhibitor. ARBs (losartan, ramipril alternative) do not cause cough." },
      { question: "Should I be worried if my creatinine rises slightly after starting ramipril?", answer: "A modest rise in creatinine (up to 20–30% above baseline) is expected and acceptable when starting an ACE inhibitor. It reflects reduced intraglomerular pressure (which is actually protective long-term for the kidney). Only stop if creatinine rises >30% above baseline or if hyperkalaemia develops. A rise of 10–20% with stable potassium is reassuring and indicates the drug is working as intended." },
      { question: "Can ramipril be taken during pregnancy?", answer: "ACE inhibitors are absolutely contraindicated in pregnancy, particularly in the second and third trimesters. They cause fetal hypotension, renal tubular dysgenesis, anuria, limb deformities, and oligohydramnios — a cluster known as ACE inhibitor fetopathy. Stop ramipril immediately if pregnancy occurs and switch to a pregnancy-safe antihypertensive (labetalol, nifedipine, methyldopa)." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Altace, Tritace — widely prescribed; NICE first-line for hypertension and heart failure" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Cardace, Ramace, Zorem — commonly prescribed" },
      { region: "USA", agency: "FDA", status: "Approved", notes: "Altace — heart failure, post-MI, CV risk reduction, hypertension" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Altace — licensed for hypertension, HF, and CV risk reduction" },
    ],
    expectTimeline: [
      { timeframe: "Hours", description: "Blood pressure begins falling after first dose" },
      { timeframe: "2–4 weeks", description: "Full antihypertensive effect established" },
      { timeframe: "Months–years", description: "Cardioprotective and renoprotective effects accumulate" },
    ],
    },

    {
      name: "Losartan",
      slug: "losartan",
      abbreviation: "LOS",
      aliases: ["cozaar", "cozartan", "cosart", "losafrench"],
      category: "cardiovascular",
      tagline: "ARB — hypertension, diabetic nephropathy & heart failure",
      description: "Losartan was the first ARB (angiotensin receptor blocker) approved. Selectively blocks the AT1 receptor, preventing angiotensin II-mediated vasoconstriction and aldosterone release. Preferred over ACE inhibitors when ACE inhibitor cough is intolerable. Also uricosuric — lowers serum uric acid.",
      color: "#DC2626",
      vial: "Oral tablet",
      recon: "25mg, 50mg, 100mg",
      startDose: "25–50mg/day",
      targetDose: "50–100mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective antihypertensive without ACE inhibitor cough. LIFE trial: superior stroke reduction vs atenolol in hypertension with LVH. Renal protection in T2DM nephropathy. Unique uricosuric property — lowers uric acid by ~15%.",
      tips: "Better tolerated than ACE inhibitors (no cough risk). Monitor renal function and potassium. Avoid NSAIDs. Uric acid-lowering effect is a bonus in hyperuricaemic/gout patients.",
      sideEffects: "Dizziness, hyperkalaemia, elevated creatinine. Angioedema much rarer than with ACE inhibitors. Generally very well tolerated.",
      watchOut: "Contraindicated in pregnancy. Bilateral renal artery stenosis. Avoid with ACE inhibitors (dual RAS blockade). Hyperkalaemia with potassium-sparing agents.",
      researchLevel: "Extensively Studied",
      tags: ["Cardiovascular", "ARB", "Hypertension", "Renal Protection"],
      researchIndications: [
        { category: "Cardiovascular / Renal", effectiveness: "Most Effective", items: [
          { title: "Hypertension with LVH", description: "LIFE trial: losartan reduced stroke risk by 25% vs atenolol in hypertension with LVH." },
          { title: "Diabetic Nephropathy (T2DM)", description: "RENAAL trial: 16% RRR in ESRD or doubling of creatinine in T2DM nephropathy." },
          { title: "ACE Inhibitor Cough Alternative", description: "First-choice switch for patients intolerant to ACE inhibitors due to dry cough." },
        ]},
      ],
      indianBrands: [
        { brand: "Cozartan 25" },
        { brand: "Cozartan 50" },
        { brand: "Cosart 50" },
        { brand: "Losafrench 50" },
      ],
    ukBrands: [
      { brand: "Cozaar 25mg / 50mg / 100mg", manufacturer: "MSD" },
      { brand: "Losartan (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Cozaar 25mg / 50mg / 100mg", manufacturer: "Merck" },
      { brand: "Losartan (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Cozaar 25mg / 50mg / 100mg", manufacturer: "MSD" },
    ],
    
    overview: {
      whatIsIt: "Losartan was the first angiotensin receptor blocker (ARB) approved, launched in 1995. It selectively blocks AT1 receptors for angiotensin II without affecting ACE or bradykinin, giving the same antihypertensive and cardioprotective benefits of ACE inhibitors without the cough side effect. Now generic and widely used as a first-line hypertension agent.",
      keyBenefits: "Equivalent antihypertensive efficacy to ACE inhibitors with significantly less cough (1–2% vs 10–15%). Proven renal protection in diabetic nephropathy (RENAAL trial) — reduced ESRD risk 16%. Reduces stroke in hypertension with LVH (LIFE trial) — superior to atenolol. Unique uricosuric effect lowers serum uric acid — beneficial in hypertensive patients with gout or hyperuricaemia.",
      mechanismOfAction: "Selectively blocks angiotensin II type 1 receptors (AT1), preventing vasoconstriction and aldosterone secretion from angiotensin II. Unlike ACE inhibitors, does not block ACE or bradykinin degradation — hence no accumulation of bradykinin and no cough. Reflects a more 'complete' block of angiotensin II effects (all sources of angiotensin II blocked, not just ACE-derived).",
    },
    pharmacokinetics: { peak: "3–4h (active metabolite EXP3174)", halfLife: "6–9h (parent); 6–9h (EXP3174)", cleared: "24h" },
    researchProtocols: [
      { goal: "Hypertension", dose: "50–100mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Diabetic Nephropathy", dose: "100mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Heart Failure (LV dysfunction)", dose: "50–150mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Potassium-sparing diuretics / potassium supplements (hyperkalaemia)", status: "caution" },
      { name: "NSAIDs (reduced antihypertensive effect, increased AKI risk)", status: "caution" },
      { name: "Lithium (reduced renal lithium clearance)", status: "caution" },
      { name: "ACE inhibitors concurrent (dual RAAS blockade — do not combine)", status: "avoid" },
      { name: "Aliskiren in diabetics (contraindicated)", status: "avoid" },
    ],
    sideEffectNotes: [
      "Hyperkalaemia — particularly with renal impairment, diabetes, or concurrent potassium-sparing diuretics",
      "Hypotension — first-dose effect; start at 25–50mg",
      "Dizziness — related to blood pressure lowering",
      "Angioedema — rare but reported; less than ACE inhibitors but cross-reactivity possible",
      "No cough — major advantage over ACE inhibitors",
    ],
    faq: [
      { question: "Can losartan be combined with an ACE inhibitor like ramipril?", answer: "No — combining two RAAS blockers (ACE inhibitor + ARB, or either with aliskiren) is contraindicated. Dual RAAS blockade produces no additional cardiovascular benefit and significantly increases risks of hypotension, hyperkalaemia, and acute kidney injury. This was confirmed in the ONTARGET trial — combination was more harmful than either agent alone." },
      { question: "Does losartan lower uric acid?", answer: "Yes — losartan uniquely among ARBs has a uricosuric effect, increasing renal uric acid excretion and lowering serum uric acid by approximately 15–20%. This is an off-target mechanism via inhibition of URAT1 (urate transporter). This makes losartan the preferred ARB in hypertensive patients with gout or hyperuricaemia. Other ARBs (olmesartan, valsartan) do not share this effect." },
      { question: "Is losartan safe during breastfeeding?", answer: "No — losartan and all ARBs are contraindicated in pregnancy and breastfeeding. In pregnancy they cause similar fetopathic effects to ACE inhibitors (fetal renal toxicity, oligohydramnios, limb deformities). Stop immediately if pregnancy is confirmed. During breastfeeding, ARBs should be avoided and alternatives (labetalol, nifedipine) used." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Cozaar — hypertension, diabetic nephropathy (T2DM with LVH)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Cozaar — widely prescribed; NICE first-line alternative to ACEI in hypertension" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Losar, Losacar, Repace — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Cozaar — licensed for hypertension and nephropathy" },
    ],
    expectTimeline: [
      { timeframe: "Hours", description: "Antihypertensive effect begins" },
      { timeframe: "3–6 weeks", description: "Full antihypertensive effect established" },
    ],
    },

    {
      name: "Olmesartan",
      slug: "olmesartan",
      abbreviation: "OLM",
      aliases: ["benicar", "olmecip", "olmezen", "olmezest"],
      category: "cardiovascular",
      tagline: "Potent ARB — hypertension & cardiovascular risk reduction",
      description: "Olmesartan is one of the most potent ARBs, with high affinity for the AT1 receptor and long duration of action. Provides sustained 24-hour blood pressure control. Demonstrated superior BP reduction vs other ARBs in comparative studies.",
      color: "#DC2626",
      vial: "Oral tablet",
      recon: "10mg, 20mg, 40mg",
      startDose: "10–20mg/day",
      targetDose: "20–40mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Potent and consistent 24-hour BP control. Well tolerated. Combines with amlodipine or hydrochlorothiazide in fixed-dose formulations for easier management. Reduces arterial stiffness.",
      tips: "Do not combine with ACE inhibitor. Avoid high-potassium diet unless monitored. Monitor renal function regularly.",
      sideEffects: "Dizziness, hyperkalaemia, elevated creatinine. Rare: sprue-like enteropathy with long-term use (severe diarrhoea, malabsorption) — stop drug if suspected.",
      watchOut: "Rare sprue-like enteropathy — investigate unexplained diarrhoea in long-term users. Contraindicated in pregnancy. Bilateral renal artery stenosis.",
      researchLevel: "Well Researched",
      tags: ["Cardiovascular", "ARB", "Hypertension"],
      researchIndications: [
        { category: "Cardiovascular", effectiveness: "Most Effective", items: [
          { title: "Hypertension", description: "Superior BP reduction vs losartan and valsartan in comparative trials. 24-hour sustained control." },
          { title: "Hypertension + CKD", description: "Renal-protective via AT1 blockade; reduces proteinuria in CKD patients with hypertension." },
        ]},
      ],
      indianBrands: [
        { brand: "Olmecip 10" },
        { brand: "Olmecip 20" },
        { brand: "Olmecip 40" },
        { brand: "Olmezen 20" },
        { brand: "Olmezest 20" },
      ],
    ukBrands: [
      { brand: "Olmetec 10mg / 20mg / 40mg", manufacturer: "Daiichi Sankyo" },
    ],
    usBrands: [
      { brand: "Benicar 5mg / 20mg / 40mg", manufacturer: "Daiichi Sankyo" },
    ],
    canadaBrands: [
      { brand: "Olmetec 10mg / 20mg / 40mg", manufacturer: "Daiichi Sankyo" },
    ],
    
    overview: {
      whatIsIt: "Olmesartan is an angiotensin receptor blocker (ARB) with one of the longest durations of action in its class. Delivered as an inactive prodrug (olmesartan medoxomil), hydrolysed to olmesartan at the intestinal wall during absorption. Known for potent and sustained AT1 receptor blockade.",
      keyBenefits: "Potent once-daily antihypertensive with 24-hour duration. Blood pressure reduction comparable to the best ARBs (similar to irbesartan and telmisartan). Fixed-dose combinations available with amlodipine and hydrochlorothiazide. Renoprotective in diabetic nephropathy (ROADMAP trial). Well-tolerated — no cough, minimal metabolic effects.",
      mechanismOfAction: "Olmesartan medoxomil is hydrolysed to olmesartan at the intestinal wall. Olmesartan selectively blocks AT1 angiotensin receptors with high affinity, preventing angiotensin II-mediated vasoconstriction, aldosterone release, and sympathetic activation. Unique slow dissociation from AT1 receptor contributes to sustained 24-hour effect.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "12–18h", cleared: "~72h" },
    researchProtocols: [
      { goal: "Hypertension (initial)", dose: "20mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Hypertension (maximum)", dose: "40mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Potassium-sparing diuretics (hyperkalaemia)", status: "caution" },
      { name: "NSAIDs (reduced antihypertensive effect)", status: "caution" },
      { name: "ACE inhibitors (dual RAAS — do not combine)", status: "avoid" },
      { name: "Colesevelam (reduces olmesartan absorption by 40%)", status: "timing" },
    ],
    sideEffectNotes: [
      "Sprue-like enteropathy — unique to olmesartan; rare but severe villous atrophy mimicking coeliac disease; FDA warning issued. If refractory diarrhoea, malabsorption, and weight loss develop after months-years of use, consider this diagnosis",
      "Hyperkalaemia — monitor in renal impairment",
      "Dizziness and hypotension — first-dose effect",
    ],
    faq: [
      { question: "What is the unique bowel side effect of olmesartan?", answer: "Olmesartan can rarely cause sprue-like enteropathy — a severe intestinal condition with villous atrophy (similar to coeliac disease) causing profuse watery diarrhoea, weight loss, and malnutrition. It is unique to olmesartan among ARBs and develops months to years after starting therapy. If these symptoms develop, stop olmesartan and perform gastroscopy with duodenal biopsy. Symptoms resolve completely on stopping the drug." },
      { question: "How does olmesartan compare to other ARBs?", answer: "Olmesartan produces larger blood pressure reductions than losartan (when compared in head-to-head studies) and its antihypertensive potency is comparable to irbesartan. Unlike losartan, it has no uricosuric effect. Unlike telmisartan, it lacks PPAR-gamma agonist activity. The unique sprue-like enteropathy is a disadvantage. Choice between ARBs is often driven by cost, combination products available, and individual tolerability." },
      { question: "Can olmesartan be used with amlodipine?", answer: "Yes — olmesartan + amlodipine fixed-dose combinations (e.g., Sevikar, Azor) are widely used and well-studied. The ACCOMPLISH trial showed that an ACEi + CCB combination was superior to an ACEi + diuretic combination for cardiovascular outcomes. By analogy, ARB + CCB combinations are preferred over ARB + diuretic for most patients." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Benicar — hypertension; Azor (with amlodipine); Tribenzor (triple combination)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Olmetec — hypertension; Sevikar (with amlodipine)" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Olmezest, Olvance — widely used" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Olmetec — licensed for hypertension" },
    ],
    expectTimeline: [
      { timeframe: "Hours", description: "Blood pressure reduction begins" },
      { timeframe: "2–4 weeks", description: "Full antihypertensive effect at given dose" },
    ],
    },

    {
      name: "Nifedipine (Extended Release)",
      slug: "nifedipine-er",
      abbreviation: "NIFE",
      aliases: ["adalat cc", "nifedipine xl", "niftas", "nipress", "procardia xl"],
      category: "cardiovascular",
      tagline: "Calcium channel blocker — hypertension & angina",
      description: "Nifedipine is a dihydropyridine calcium channel blocker. Extended-release formulation provides smooth, sustained vasodilation over 24 hours without the reflex tachycardia of immediate-release nifedipine. Reduces peripheral resistance and blood pressure.",
      color: "#DC2626",
      vial: "Oral extended-release tablet",
      recon: "30mg, 60mg, 90mg XL/CC",
      startDose: "30mg once daily",
      targetDose: "60–90mg once daily",
      frequency: "Once daily",
      route: "Oral (swallow whole, do not crush)",
      storage: "Room temperature, protect from light",
      benefits: "Effective antihypertensive and antianginal. Does not affect heart rate or conduction. Safe in AV block. Beneficial in Raynaud's phenomenon. Can be used in hypertension during pregnancy.",
      tips: "Swallow XL tablet whole — crushing destroys extended-release mechanism. Grapefruit juice increases plasma levels significantly — avoid. Lower-limb oedema can be reduced by combining with ACE inhibitor.",
      sideEffects: "Peripheral oedema (most common, dose-dependent), flushing, headache, palpitations. Gingival hyperplasia with long-term use.",
      watchOut: "Avoid immediate-release nifedipine for hypertension (reflex tachycardia, negative outcomes). Grapefruit juice — avoid. Oedema may be managed by switching to combination product.",
      researchLevel: "Extensively Studied",
      tags: ["Cardiovascular", "Calcium Channel Blocker", "Hypertension", "Angina"],
      researchIndications: [
        { category: "Cardiovascular", effectiveness: "Most Effective", items: [
          { title: "Hypertension", description: "Effective systolic BP reduction. Often added as 3rd agent when ACE/ARB + beta-blocker inadequate." },
          { title: "Prinzmetal's / Vasospastic Angina", description: "First-line for Prinzmetal's angina. Calcium channel blockade prevents coronary vasospasm." },
          { title: "Raynaud's Phenomenon", description: "Effective vasodilatory treatment reducing frequency and severity of Raynaud's episodes." },
        ]},
      ],
      indianBrands: [
        { brand: "Niftas 30" },
        { brand: "Niftas 60" },
        { brand: "Nipress 30" },
      ],
    ukBrands: [
      { brand: "Adalat LA 20mg / 30mg / 60mg", manufacturer: "Bayer" },
      { brand: "Nifedipine MR (generic)", notes: "Modified-release tablet" },
    ],
    usBrands: [
      { brand: "Procardia XL 30mg / 60mg / 90mg", manufacturer: "Pfizer" },
      { brand: "Adalat CC 30mg / 60mg / 90mg", manufacturer: "Bayer" },
    ],
    canadaBrands: [
      { brand: "Adalat XL 20mg / 30mg / 60mg", manufacturer: "Bayer" },
    ],
    
    overview: {
      whatIsIt: "Nifedipine is a dihydropyridine calcium channel blocker (CCB). The extended-release (ER/XL) formulation provides smooth 24-hour blood pressure control without the reflex tachycardia associated with immediate-release nifedipine. Approved for hypertension and angina; one of the most extensively studied antihypertensive drug classes globally.",
      keyBenefits: "Effective for hypertension (systolic reduction 10–15 mmHg), Raynaud's phenomenon, and stable angina. ER formulation prevents reflex tachycardia seen with IR nifedipine. Food does not affect absorption significantly. Particularly useful in hypertension complicating pregnancy (with medical supervision). No cough, no hyperkalaemia (unlike ACE/ARBs).",
      mechanismOfAction: "Blocks L-type voltage-gated calcium channels in vascular smooth muscle and cardiac muscle. In arterioles: reduces calcium influx → smooth muscle relaxation → vasodilation → reduced peripheral vascular resistance → blood pressure lowering. Reflex sympathetic activation (tachycardia) is minimised by the ER formulation's slow, sustained drug delivery.",
    },
    pharmacokinetics: { peak: "4–6h (ER formulation)", halfLife: "7h (ER provides 24-h sustained release)", cleared: "24h" },
    researchProtocols: [
      { goal: "Hypertension", dose: "30–60mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Angina (stable)", dose: "30–90mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Raynaud's Phenomenon", dose: "30–90mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Grapefruit juice (inhibits CYP3A4 — increases nifedipine levels significantly)", status: "avoid" },
      { name: "Cyclosporin (nifedipine increases cyclosporin levels)", status: "monitor" },
      { name: "Beta-blockers (generally safe, occasional additive hypotension)", status: "caution" },
      { name: "Rifampicin (strong CYP3A4 inducer — reduces nifedipine levels drastically)", status: "caution" },
    ],
    sideEffectNotes: [
      "Peripheral oedema (ankle swelling) — most common (5–15%); related to arteriolar dilation, not fluid retention; treat with elevation or switch to ACEI/ARB",
      "Headache and flushing — vasodilatory; usually resolve after 2–4 weeks",
      "Reflex tachycardia — minimal with ER formulation; main reason IR formulation is avoided",
      "Gingival hyperplasia — gum overgrowth with long-term use; requires dental hygiene",
    ],
    faq: [
      { question: "Can I take nifedipine if I drink grapefruit juice?", answer: "No — avoid grapefruit and grapefruit juice entirely with nifedipine. Grapefruit contains furanocoumarins that irreversibly inhibit CYP3A4 in the intestinal wall — the enzyme responsible for nifedipine metabolism. This can increase nifedipine blood levels by 2–3 fold, causing severe hypotension, flushing, and cardiovascular effects. Switch to orange juice or water." },
      { question: "Why is immediate-release nifedipine not recommended for hypertension?", answer: "Immediate-release nifedipine causes rapid, unpredictable blood pressure drops and significant reflex tachycardia (increased heart rate) as the sympathetic nervous system compensates for sudden vasodilation. This hemodynamic instability can trigger myocardial ischaemia, particularly in patients with pre-existing coronary artery disease. Extended-release nifedipine avoids this by providing slow, sustained blood level rises." },
      { question: "Is nifedipine safe in pregnancy?", answer: "Nifedipine ER is one of the preferred treatments for gestational hypertension and pre-eclampsia, and for hypertension in breastfeeding. It is a common second-line antihypertensive in pregnancy (after labetalol and methyldopa in UK guidelines). Avoid grapefruit interaction vigilantly during pregnancy. Do not use if concurrent magnesium sulphate is being used (rare but potentially severe additive hypotension)." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Procardia XL, Adalat CC — hypertension and chronic stable angina" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Adalat LA, Coracten XL — hypertension and angina; licensed for Raynaud's" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Adalat, Depin-E, Nicardia Retard — commonly used" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Adalat XL, Procardia XL — licensed for hypertension and angina" },
    ],
    expectTimeline: [
      { timeframe: "4–6 hours", description: "Peak blood pressure reduction after first ER dose" },
      { timeframe: "2–4 weeks", description: "Blood pressure control stabilised and headache/flushing side effects reducing" },
    ],
    },

    {
      name: "Furosemide",
      slug: "furosemide",
      abbreviation: "FURO",
      aliases: ["lasix", "frasix", "frusenex", "frusemide"],
      category: "cardiovascular",
      tagline: "Loop diuretic — heart failure, oedema & hypertension",
      description: "Furosemide inhibits the Na-K-2Cl cotransporter in the thick ascending limb of Henle, producing rapid, potent diuresis. First-line diuretic for acute pulmonary oedema, decompensated heart failure, and hypertension resistant to thiazides.",
      color: "#DC2626",
      vial: "Oral tablet / IV/IM injection",
      recon: "20mg, 40mg, 80mg tablets; 10mg/mL injection",
      startDose: "20–40mg/day",
      targetDose: "40–80mg/day (oral); up to 600mg in severe renal failure",
      frequency: "Once to twice daily (morning to prevent nocturia)",
      route: "Oral or IV",
      storage: "Room temperature; protect injection from light",
      benefits: "Rapid, potent diuresis. IV onset within 15–30 minutes. Effective for acute pulmonary oedema. Reduces fluid overload in CHF, cirrhosis, and nephrotic syndrome. Dose-titratable with wide therapeutic range.",
      tips: "Take in the morning to avoid nocturia. Monitor potassium — supplement or combine with potassium-sparing diuretic. Monitor renal function and electrolytes regularly.",
      sideEffects: "Hypokalaemia (most common), hyponatraemia, dehydration, prerenal azotaemia, ototoxicity (high IV doses), hyperuricaemia, hypocalcaemia.",
      watchOut: "Hypokalaemia can precipitate digoxin toxicity. Ototoxicity at high IV doses (avoid rapid infusion). Monitor electrolytes closely. Sulfonamide allergy — possible cross-reactivity.",
      researchLevel: "Extensively Studied",
      tags: ["Cardiovascular", "Loop Diuretic", "Heart Failure", "Oedema"],
      researchIndications: [
        { category: "Cardiovascular / Renal", effectiveness: "Most Effective", items: [
          { title: "Acute Pulmonary Oedema", description: "IV furosemide is first-line for acute decompensated HF with pulmonary oedema — rapid symptom relief." },
          { title: "Chronic Heart Failure", description: "Reduces symptoms of volume overload (dyspnoea, oedema, orthopnoea). Pivotal symptomatic therapy." },
          { title: "Resistant Hypertension", description: "Effective when thiazide diuretics fail, especially in CKD where thiazides lose efficacy (eGFR < 30)." },
        ]},
      ],
      indianBrands: [
        { brand: "Frasix 40" },
        { brand: "Frusenex 40" },
        { brand: "Frasix 20" },
      ],
    ukBrands: [
      { brand: "Lasix 20mg / 40mg / 500mg", manufacturer: "Sanofi" },
      { brand: "Furosemide (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Lasix 20mg / 40mg / 80mg", manufacturer: "Sanofi" },
      { brand: "Furosemide (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Lasix 20mg / 40mg / 80mg", manufacturer: "Sanofi" },
      { brand: "Furosemide (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Furosemide is a loop diuretic that inhibits the Na-K-2Cl cotransporter in the thick ascending loop of Henle. The most potent widely-used diuretic, producing a large sodium and water diuresis. First-line for acute pulmonary oedema, heart failure decongestive therapy, and oedema of any cause (renal, hepatic, cardiac).",
      keyBenefits: "Most potent oral diuretic available — produces 10–20% fractional sodium excretion at high doses (vs <5% for thiazides). Can be given IV for acute pulmonary oedema — onset within 5 minutes. Effective even when GFR <30 mL/min (unlike thiazides which fail at this level). Dose can be titrated over a very wide range (20mg to 2000mg daily in severe renal failure).",
      mechanismOfAction: "Inhibits NKCC2 (sodium-potassium-chloride cotransporter type 2) on the luminal surface of thick ascending loop of Henle cells. This blocks 25% of filtered sodium reabsorption — the highest-capacity reabsorption segment. The resulting sodium delivery to the collecting duct overwhelms distal reabsorption capacity, causing profound natriuresis and water diuresis. Also has venodilatory effect within minutes of IV administration (preload reduction).",
    },
    pharmacokinetics: { peak: "1–2h (oral); 30 min (IV)", halfLife: "1.5–2h", cleared: "8h" },
    researchProtocols: [
      { goal: "Heart Failure Oedema (initial)", dose: "40mg/day", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Heart Failure Oedema (resistant)", dose: "80–160mg/day", frequency: "Once or twice daily", route: "Oral" },
      { goal: "Acute Pulmonary Oedema", dose: "40–80mg IV bolus", frequency: "Once; repeat if needed", route: "Intravenous" },
    ],
    interactions: [
      { name: "NSAIDs (significantly reduce furosemide diuretic effect)", status: "caution" },
      { name: "Aminoglycosides (additive ototoxicity)", status: "caution" },
      { name: "Digoxin (hypokalaemia from furosemide increases digoxin toxicity risk)", status: "monitor" },
      { name: "ACE inhibitors / ARBs (first-dose hypotension with concomitant diuresis)", status: "caution" },
      { name: "Lithium (furosemide reduces lithium clearance)", status: "caution" },
    ],
    sideEffectNotes: [
      "Hypokalaemia — most important; monitor K+ regularly; supplement if K+ <3.5 mmol/L",
      "Hyponatraemia, hypomagnesaemia, hypocalcaemia — electrolyte monitoring essential",
      "Dehydration and pre-renal AKI — particularly in elderly; maintain hydration",
      "Ototoxicity — dose-related hearing loss/tinnitus; risk increased with rapid IV infusion or aminoglycoside combination",
      "Gout — hyperuricaemia from increased urate reabsorption (compensatory)",
      "Hyperglycaemia — mild; thiazide effect is stronger but loop diuretics have some impact",
    ],
    faq: [
      { question: "Why does furosemide need to be taken in the morning?", answer: "Furosemide produces diuresis within 1–2 hours of oral dosing lasting 4–6 hours. Taking it in the morning means the diuretic effect (frequent urination) occurs during waking hours, not at night (nocturia). Evening dosing causes nocturnal diuresis that disrupts sleep. If twice-daily dosing is needed, take at 6am and 2pm to avoid night-time diuresis." },
      { question: "What foods/supplements should I take with furosemide?", answer: "Furosemide causes potassium and magnesium wasting. Increase dietary potassium (bananas, oranges, potatoes, tomatoes) and/or take potassium supplements (potassium chloride 600–1200mg/day) as prescribed. Magnesium supplementation (300–400mg/day) may also be needed. Monitor electrolytes every 3–6 months in stable patients, more frequently when initiating or adjusting doses." },
      { question: "What is the difference between furosemide and hydrochlorothiazide?", answer: "Both are diuretics but at different nephron segments. Furosemide (loop diuretic) acts on the thick ascending loop of Henle — far more potent, works even in severe kidney disease. Hydrochlorothiazide (thiazide) acts on the distal convoluted tubule — less potent, loses effectiveness when GFR <30, but better for lowering blood pressure in mild hypertension. They can be combined for refractory oedema (furosemide + thiazide = powerful sequential nephron blockade)." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lasix — oedema from HF, hepatic or renal disease; hypertension" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Lasix — widely used for heart failure and oedema" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Lasix, Frusenex, Frusemide — widely available oral and IV" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Lasix — licensed for oedema and hypertension" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Diuresis begins (oral); 5 minutes (IV)" },
      { timeframe: "4–6 hours", description: "Duration of diuretic effect per dose" },
      { timeframe: "1–7 days", description: "Oedema resolution in acute heart failure decompensation" },
    ],
    },

    // ─── MENTAL HEALTH & SLEEP ────────────────────────────────────────────────

    {
      name: "Escitalopram",
      slug: "escitalopram",
      abbreviation: "ESC",
      aliases: ["lexapro", "lexaheal", "newcita", "escital", "citacan"],
      category: "mental-sleep",
      tagline: "SSRI — depression, anxiety & OCD",
      description: "Escitalopram is the S-enantiomer of citalopram — the most selective SSRI available, with minimal off-target receptor activity. Well-tolerated profile makes it a preferred first-line SSRI for depression, generalised anxiety disorder (GAD), and OCD. Lowest drug interaction potential among SSRIs.",
      color: "#6D28D9",
      vial: "Oral tablet",
      recon: "5mg, 10mg, 20mg",
      startDose: "10mg/day",
      targetDose: "10–20mg/day",
      frequency: "Once daily (morning or evening)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Well-tolerated SSRI with minimal drug interactions. Effective for depression, GAD, panic disorder, OCD. Full effect at 4–8 weeks. Fewer QTc concerns than citalopram at therapeutic doses.",
      tips: "Start at 10mg and review at 4 weeks before increasing. Do not stop abruptly — taper over 2–4 weeks. Evening dosing may help if insomnia is a concern. Takes 4–8 weeks for full antidepressant effect.",
      sideEffects: "Nausea (improves after 1–2 weeks), insomnia or somnolence, sexual dysfunction, dry mouth, increased sweating, weight gain with long-term use.",
      watchOut: "Serotonin syndrome risk with MAOIs, tramadol, triptans. QTc prolongation at high doses. Activation (restlessness, anxiety) in first 1–2 weeks — temporary. Suicidal ideation risk in young adults initially.",
      researchLevel: "Extensively Studied",
      tags: ["Mental Health", "SSRI", "Depression", "Anxiety"],
      researchIndications: [
        { category: "Psychiatric Disorders", effectiveness: "Most Effective", items: [
          { title: "Major Depressive Disorder", description: "CIPROX meta-analysis: escitalopram most efficacious and best-tolerated among 21 antidepressants." },
          { title: "Generalised Anxiety Disorder", description: "Effective first-line treatment for GAD — reduces HAM-A scores significantly vs placebo." },
          { title: "Panic Disorder", description: "Approved for panic disorder. Reduces frequency and severity of panic attacks." },
        ]},
      ],
      indianBrands: [
        { brand: "Lexaheal 10" },
        { brand: "Newcita 10" },
        { brand: "Escital 10" },
        { brand: "Citacan 10" },
      ],
    ukBrands: [
      { brand: "Cipralex 5mg / 10mg / 20mg", manufacturer: "Lundbeck" },
      { brand: "Escitalopram (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Lexapro 5mg / 10mg / 20mg", manufacturer: "Allergan / Forest" },
      { brand: "Escitalopram (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Cipralex 5mg / 10mg / 20mg", manufacturer: "Lundbeck" },
    ],
    
    overview: {
      whatIsIt: "Escitalopram is the S-enantiomer of citalopram and the most selective serotonin reuptake inhibitor (SSRI) available. Approved for major depressive disorder (MDD) and generalised anxiety disorder (GAD). Considered the reference SSRI for tolerability in head-to-head trials (STAR*D, Cipriani network meta-analysis).",
      keyBenefits: "Most selective SSRI — higher selectivity for the serotonin transporter than citalopram, sertraline, or fluoxetine, correlating with fewer off-target side effects. Proven efficacy in MDD (comparable to all SSRIs). Approved for GAD (one of few SSRIs with this specific indication). Once-daily dosing. Generic and widely available.",
      mechanismOfAction: "Selectively inhibits the serotonin reuptake transporter (SERT) in presynaptic terminals, increasing synaptic 5-HT concentration. The S-enantiomer has approximately 100-fold higher affinity for SERT than the R-enantiomer, which acts as a negative modulator — making escitalopram more potent per milligram than racemic citalopram. Receptor downregulation and neuroplasticity changes underlie the delayed therapeutic onset.",
    },
    pharmacokinetics: { peak: "4–5h", halfLife: "27–32h", cleared: "5–7 days (steady state)" },
    researchProtocols: [
      { goal: "Depression / GAD (initiation)", dose: "10mg/day", frequency: "Once daily (any time — morning or evening)", route: "Oral" },
      { goal: "Depression / GAD (increase after 2–4 weeks)", dose: "20mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs (serotonin syndrome — fatal; 14-day washout required)", status: "avoid" },
      { name: "Linezolid, methylene blue (serotonergic; avoid)", status: "avoid" },
      { name: "Tramadol, triptans, St John's Wort (serotonin syndrome risk)", status: "caution" },
      { name: "QTc-prolonging drugs (escitalopram dose-dependently prolongs QT)", status: "caution" },
      { name: "NSAIDs (increased GI bleeding risk via reduced platelet serotonin)", status: "caution" },
    ],
    sideEffectNotes: [
      "Nausea — most common at initiation; take with food; resolves within 1–2 weeks",
      "Sexual dysfunction — reduced libido, delayed ejaculation, anorgasmia (20–40% of patients); may persist; discuss options",
      "Insomnia or somnolence — timing adjustment (morning vs evening) often helps",
      "QTc prolongation — dose-related; avoid at 20mg in those with cardiac risk factors or concurrent QTc-prolonging drugs",
      "Discontinuation syndrome — do not stop abruptly; taper over 2–4 weeks; flu-like symptoms, 'electric shocks'",
    ],
    faq: [
      { question: "How long before escitalopram works?", answer: "Escitalopram takes 4–6 weeks for full antidepressant effect, though some improvements (sleep, anxiety) may be noted in the first 1–2 weeks. This delay reflects the time required for synaptic remodelling, receptor downregulation, and neuroplasticity changes (e.g., hippocampal neurogenesis). Do not judge response before 6–8 weeks at an adequate dose (10–20mg). Anxiety may briefly worsen in the first 1–2 weeks." },
      { question: "How do I stop escitalopram safely?", answer: "Never stop escitalopram abruptly. Taper the dose by 5mg every 2–4 weeks (e.g., 20→15→10→5mg→stop if available, or 20→10→stop over 4–8 weeks). This prevents discontinuation syndrome (FINISH symptoms: Flu-like illness, Irritability, Nausea, Insomnia, Sensory disturbances, Hyperarousal). If symptoms are severe on tapering, slow the taper further or consult your prescriber." },
      { question: "Is escitalopram better than sertraline or fluoxetine?", answer: "The Cipriani et al. 2018 network meta-analysis (Lancet) found escitalopram had the best combination of efficacy and acceptability (fewest discontinuations) among all 21 antidepressants studied. In practice, all SSRIs have comparable overall efficacy — individual response and tolerability vary. Escitalopram and sertraline are the recommended first-choice SSRIs per most guidelines (NICE, APA)." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lexapro — MDD (adults and adolescents ≥12), GAD (adults only)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Cipralex — MDD and GAD; generic widely available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Nexito, Stalopam, Rexipra — widely prescribed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Cipralex — MDD and GAD; generic available" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Sleep improvement and anxiety reduction may begin; nausea at initiation" },
      { timeframe: "4–6 weeks", description: "Significant mood improvement; assess for full response" },
      { timeframe: "3–6 months", description: "Continue for at least 6 months after remission to prevent relapse" },
    ],
    },

    {
      name: "Fluoxetine",
      slug: "fluoxetine",
      abbreviation: "FLX",
      aliases: ["prozac", "fludac", "prodep", "fluoxetine hcl"],
      category: "mental-sleep",
      tagline: "SSRI — depression, OCD, bulimia & PMDD",
      description: "Fluoxetine was the first SSRI approved (1987). Longest half-life of any SSRI (4–6 days; active metabolite norfluoxetine 4–16 days), making it the most forgiving for missed doses and providing a gradual washout. FDA-approved for MDD, OCD, panic disorder, bulimia nervosa, and PMDD.",
      color: "#6D28D9",
      vial: "Oral capsule/tablet",
      recon: "10mg, 20mg, 40mg, 60mg; 20mg/5mL liquid",
      startDose: "10–20mg/day",
      targetDose: "20–60mg/day",
      frequency: "Once daily (morning preferred — activating)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Long half-life reduces discontinuation syndrome risk. FDA-approved for bulimia nervosa. Weekly formulation available. Fewer sexual side effects than paroxetine. Longest track record of all SSRIs.",
      tips: "Morning dosing preferred — activating, may cause insomnia if taken at night. No taper needed due to long half-life. Strong CYP2D6 inhibitor — check for drug interactions before prescribing.",
      sideEffects: "Nausea, insomnia, anxiety/activation (especially at start), sexual dysfunction, weight changes.",
      watchOut: "Strong CYP2D6 inhibitor — multiple drug interactions (tamoxifen, TCAs, antipsychotics). Serotonin syndrome with MAOIs. Allow 5-week washout before starting MAOI.",
      researchLevel: "Extensively Studied",
      tags: ["Mental Health", "SSRI", "Depression", "OCD", "Bulimia"],
      researchIndications: [
        { category: "Psychiatric / Eating Disorders", effectiveness: "Most Effective", items: [
          { title: "Major Depressive Disorder", description: "Extensively studied; comparable efficacy to other SSRIs. Long half-life is practical advantage." },
          { title: "OCD", description: "At 40–60mg/day, effective for obsessive-compulsive disorder. Higher doses often required vs depression." },
          { title: "Bulimia Nervosa", description: "Only FDA-approved medication specifically for bulimia nervosa at 60mg/day. Reduces binge/purge cycles." },
        ]},
      ],
      indianBrands: [
        { brand: "Fludac 20" },
        { brand: "Fludac 40" },
        { brand: "Prodep 20" },
      ],
    ukBrands: [
      { brand: "Prozac 20mg / 60mg", manufacturer: "Eli Lilly" },
      { brand: "Oxactin 20mg", notes: "Generic" },
    ],
    usBrands: [
      { brand: "Prozac 10mg / 20mg / 40mg", manufacturer: "Eli Lilly" },
      { brand: "Sarafem 10mg / 20mg", manufacturer: "Allergan", notes: "For PMDD" },
      { brand: "Fluoxetine (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Prozac 10mg / 20mg", manufacturer: "Eli Lilly" },
      { brand: "Fluoxetine (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Fluoxetine was the first SSRI approved (1987, Prozac). The longest half-life of any SSRI (1–6 days including active metabolite norfluoxetine, t½ 4–16 days) — making it the most forgiving SSRI for missed doses and the safest to stop without tapering. Approved for MDD, OCD, panic disorder, bulimia nervosa, and bipolar depression (combined with olanzapine).",
      keyBenefits: "Extremely long half-life essentially self-tapers — no discontinuation syndrome. Weekly dosing formulation available (90mg). Proven in OCD, panic disorder, and bulimia nervosa (distinct approvals). Strong activating/energising profile — useful in atypical depression with hypersomnia. The most studied antidepressant in children and adolescents.",
      mechanismOfAction: "Selectively inhibits SERT with high affinity. The parent drug and active metabolite norfluoxetine both inhibit SERT, accounting for the extended effective half-life. Fluoxetine also has weak inhibitory activity at CYP2D6 and CYP3A4 — producing clinically significant drug interactions. Mildly activating due to minor 5-HT2C antagonism.",
    },
    pharmacokinetics: { peak: "6–8h", halfLife: "1–6 days (fluoxetine); 4–16 days (norfluoxetine)", cleared: "4–5 weeks (full elimination)" },
    researchProtocols: [
      { goal: "Depression / OCD / Panic (standard)", dose: "20mg/day", frequency: "Once daily (morning — activating)", route: "Oral" },
      { goal: "Depression / OCD (target, if needed)", dose: "40–60mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Bulimia Nervosa", dose: "60mg/day", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs (serotonin syndrome — 5-week washout after stopping fluoxetine before starting MAOI)", status: "avoid" },
      { name: "Tamoxifen (CYP2D6 inhibition reduces active metabolite endoxifen — reduce breast cancer protection)", status: "avoid" },
      { name: "TCA antidepressants (fluoxetine inhibits CYP2D6, raising TCA levels 4–10×)", status: "caution" },
      { name: "Tramadol, codeine (CYP2D6 inhibition reduces analgesic conversion to active form)", status: "caution" },
    ],
    sideEffectNotes: [
      "Insomnia and anxiety — activating profile; take in morning; avoid in evening",
      "Nausea — take with food; usually resolves in 1–2 weeks",
      "Sexual dysfunction — delayed orgasm, reduced libido (similar to all SSRIs)",
      "Weight changes — weight neutral initially; long-term use associated with modest weight gain",
      "No discontinuation syndrome — long half-life makes abrupt cessation safe",
    ],
    faq: [
      { question: "Why does fluoxetine not need tapering when stopped?", answer: "Fluoxetine has an exceptionally long half-life — 1–6 days for fluoxetine itself, and 4–16 days for its active metabolite norfluoxetine. This means the drug effectively self-tapers over 2–4 weeks, preventing the serotonergic withdrawal seen with shorter-acting SSRIs (paroxetine, citalopram). This makes fluoxetine uniquely safe to stop abruptly — though switching to a short-acting SSRI would then require tapering." },
      { question: "Can fluoxetine be used in children?", answer: "Yes — fluoxetine is the most evidence-supported and most commonly prescribed antidepressant for children and adolescents. It is FDA-approved for MDD in children ≥8 years and for OCD ≥7 years. All antidepressants carry a black box warning for increased suicidal ideation in children/adolescents in the first weeks; close monitoring in this period is mandatory. Fluoxetine's safety data in paediatric populations is more extensive than any other antidepressant." },
      { question: "Why should fluoxetine not be combined with tamoxifen?", answer: "Fluoxetine is a potent CYP2D6 inhibitor. Tamoxifen requires CYP2D6 to convert it to endoxifen, its active anti-cancer metabolite. When fluoxetine inhibits CYP2D6, endoxifen levels fall dramatically (by 50–75%), potentially reducing tamoxifen's efficacy against breast cancer. Women on tamoxifen should avoid fluoxetine and paroxetine — sertraline or citalopram are preferred SSRIs for depression in this context." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Prozac — MDD, OCD, panic disorder, bulimia nervosa, bipolar I depression (with olanzapine as Symbyax)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Prozac — MDD (including in children ≥8), OCD, bulimia nervosa" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Fludep, Flunil, Prozac — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Prozac — MDD, OCD, bulimia, panic disorder" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Activating effects, potential sleep disruption; take in morning" },
      { timeframe: "4–6 weeks", description: "Antidepressant effect emerging" },
      { timeframe: "8–12 weeks", description: "Full therapeutic benefit; assess at 12 weeks for OCD" },
    ],
    },

    {
      name: "Melatonin",
      slug: "melatonin",
      abbreviation: "MEL",
      aliases: ["melatonin 3mg", "melatonin 5mg", "melatonin 10mg", "circadin"],
      category: "mental-sleep",
      tagline: "Pineal hormone — sleep onset, jet lag & circadian rhythm",
      description: "Melatonin is the endogenous hormone that regulates the sleep-wake cycle via MT1 and MT2 receptors. Exogenous supplementation advances the circadian phase when taken in the evening, facilitating sleep onset and reset of circadian rhythm following jet lag or shift work.",
      color: "#6D28D9",
      vial: "Oral tablet / sublingual / gummy",
      recon: "0.5mg, 1mg, 3mg, 5mg, 10mg",
      startDose: "0.5–1mg",
      targetDose: "0.5–3mg (sleep; lower is often more effective); up to 10mg some protocols",
      frequency: "30–60 min before target bedtime",
      route: "Oral or sublingual",
      storage: "Room temperature, away from light",
      benefits: "Shortens sleep onset latency. Effective for jet lag — synchronises circadian rhythm to new time zone. Useful for shift workers and delayed sleep phase disorder. No next-day grogginess at low doses.",
      tips: "Start at the lowest effective dose (0.5–1mg) — higher doses do not improve effect and may disrupt sleep architecture. Take 30–60 min before bed. Avoid bright light after taking. Consistent bedtime enhances effectiveness.",
      sideEffects: "Drowsiness (desired), headache, dizziness at high doses. Dreams may be more vivid. Hypothermia risk at very high doses.",
      watchOut: "May worsen autoimmune conditions (immunomodulatory). Interactions with anticoagulants and immunosuppressants. Not for children routinely without medical guidance.",
      researchLevel: "Extensively Studied",
      tags: ["Mental Health", "Sleep", "Circadian", "Jet Lag"],
      researchIndications: [
        { category: "Sleep / Circadian", effectiveness: "Effective", items: [
          { title: "Sleep Onset Insomnia", description: "Reduces sleep onset latency by 7–12 minutes. Most effective in circadian-related sleep disorders." },
          { title: "Jet Lag", description: "Cochrane review: 0.5–5mg at target bedtime effectively reduces jet lag symptoms across time zones." },
          { title: "Delayed Sleep Phase Disorder", description: "Advancing bedtime + melatonin shifts circadian phase earlier in DSPD patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Restfine 3" },
        { brand: "Restfine 5" },
        { brand: "Sleepose 3" },
        { brand: "Melanocyl 3" },
      ],
    ukBrands: [
      { brand: "Circadin 2mg", manufacturer: "Neurim", notes: "Prescription for adults ≥55 years" },
      { brand: "Slenyto 1mg / 5mg", manufacturer: "Neurim", notes: "Paediatric (licensed for ASD/Smith-Magenis)" },
    ],
    usBrands: [
      { brand: "Natrol 1mg / 3mg / 5mg / 10mg", notes: "OTC dietary supplement — no Rx brand" },
      { brand: "ZzzQuil Pure Zzzs 1mg / 10mg", manufacturer: "P&G" },
      { brand: "Nature Made 3mg / 5mg / 10mg", notes: "OTC supplement" },
    ],
    canadaBrands: [
      { brand: "Natrol 1mg / 3mg / 5mg", notes: "OTC supplement" },
      { brand: "Jamieson 3mg / 5mg / 10mg", manufacturer: "Jamieson Wellness" },
    ],
    
    overview: {
      whatIsIt: "Melatonin is an endogenous pineal gland hormone that signals darkness and regulates circadian rhythm and the sleep-wake cycle. Exogenous melatonin is used to phase-shift the body clock for jet lag, shift work, and delayed sleep-wake phase disorder (DSWPD). It is the most widely used sleep aid globally and available OTC in many countries.",
      keyBenefits: "Shortens time to sleep onset by 7–12 minutes in jet lag and DSWPD. Phases-advances the circadian clock when taken 2–3 hours before desired bedtime. Extremely safe profile — no dependency, no hangover effect, no rebound insomnia. Lower doses (0.1–0.5mg) are often more effective than higher OTC doses (5–10mg) for sleep-onset timing. Useful for non-24-hour sleep-wake disorder in blind individuals.",
      mechanismOfAction: "Melatonin acts on MT1 and MT2 receptors in the suprachiasmatic nucleus (SCN — the master circadian clock) and other tissues. MT1 activation acutely inhibits SCN neuronal firing and promotes sleep. MT2 activation phase-shifts the circadian clock. Exogenous melatonin given 2–3 hours before natural dim-light melatonin onset (DLMO) advances the clock; given in morning it delays the clock.",
    },
    pharmacokinetics: { peak: "30–90 min (immediate-release)", halfLife: "20–50 min", cleared: "4–6h" },
    researchProtocols: [
      { goal: "Jet Lag (eastward travel)", dose: "0.5–3mg", frequency: "At bedtime (destination time) for 4–5 nights", route: "Oral" },
      { goal: "DSWPD (sleep phase delay)", dose: "0.1–0.5mg", frequency: "2–3 hours before desired sleep time (daily)", route: "Oral" },
      { goal: "Insomnia (older adults) — Circadin", dose: "2mg (prolonged release)", frequency: "Once nightly × 3 weeks (licenced UK use)", route: "Oral" },
    ],
    interactions: [
      { name: "Fluvoxamine (potently inhibits CYP1A2, increasing melatonin 17-fold)", status: "caution" },
      { name: "Caffeine (inhibits melatonin and disrupts circadian signalling)", status: "caution" },
      { name: "Sedatives/hypnotics (additive CNS depression)", status: "caution" },
      { name: "Warfarin (some reports of increased INR)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Daytime sleepiness — if taken too late; take at correct time relative to desired sleep",
      "Headache — mild; most common reported side effect",
      "Dizziness — rare",
      "No dependency or withdrawal — unlike benzodiazepines or Z-drugs",
    ],
    faq: [
      { question: "Is more melatonin better for sleep?", answer: "No — physiological melatonin secretion peaks at 0.1–0.3 mg equivalent plasma levels. Most research shows low doses (0.1–0.5mg) are more effective than high doses (5–10mg) for circadian phase-shifting. High doses (5–10mg) flood MT receptors, potentially causing receptor desensitisation and daytime grogginess. For sleep onset and jet lag, 0.5mg is often as effective as 5mg with fewer side effects." },
      { question: "When is the best time to take melatonin?", answer: "Timing matters more than dose. For advancing the sleep phase (going to sleep earlier), take 2–3 hours before your desired bedtime — this corresponds to 4–6 hours before your habitual (current late) bedtime. For jet lag after eastward travel, take melatonin at destination bedtime (10pm–midnight local time). For westward travel, timing is less critical. Avoid bright light in the hours after taking melatonin." },
      { question: "Is melatonin addictive or habit-forming?", answer: "No — melatonin does not affect GABA receptors (unlike benzodiazepines and Z-drugs), produces no tolerance or dependence, and causes no withdrawal syndrome on stopping. It is safe for longer-term use in circadian disorders. However, chronic high-dose use is not recommended as long-term effects on endogenous melatonin secretion are incompletely characterised." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Classified as dietary supplement (DSHEA); sold OTC at various doses without FDA approval as a drug" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Circadin 2mg prolonged-release — prescription-only for primary insomnia in adults ≥55. Lower doses available OTC since 2021" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available OTC at various doses" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Licensed as natural health product; OTC at doses up to 10mg for jet lag and insomnia" },
    ],
    expectTimeline: [
      { timeframe: "30–90 minutes", description: "Sleepiness onset after immediate-release dose" },
      { timeframe: "3–5 days", description: "Jet lag: circadian clock phase-shift established" },
      { timeframe: "2–4 weeks", description: "DSWPD: gradual advancement of sleep phase with consistent use" },
    ],
    },

    {
      name: "Eszopiclone",
      slug: "eszopiclone",
      abbreviation: "ESZ",
      aliases: ["lunesta", "hypnite", "topnite", "sleepose"],
      category: "mental-sleep",
      tagline: "Non-benzodiazepine hypnotic — sleep maintenance insomnia",
      description: "Eszopiclone is the active S-enantiomer of zopiclone. Binds to GABA-A receptors at the benzodiazepine site, enhancing GABAergic inhibition. Approved for 6-month use in clinical trials — the longest duration of any approved hypnotic. Particularly effective for sleep maintenance.",
      color: "#6D28D9",
      vial: "Oral tablet",
      recon: "1mg, 2mg, 3mg",
      startDose: "1–2mg at bedtime",
      targetDose: "2–3mg at bedtime",
      frequency: "Once nightly (immediately before bed)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Reduces sleep onset and improves sleep maintenance and total sleep time. Approved for longer-term use than most hypnotics. Less next-morning impairment than benzodiazepines.",
      tips: "Only take if you can dedicate 7–8 hours to sleep. Avoid alcohol. Metallic taste (bitter) — common and benign. Start at lowest dose in elderly (hepatic clearance reduced).",
      sideEffects: "Bitter/metallic taste (very common), dizziness, daytime drowsiness, headache, infection risk. Complex sleep behaviours (rare).",
      watchOut: "Physical and psychological dependence possible. Rebound insomnia on discontinuation — taper. Avoid in severe hepatic impairment. Driving impairment the next morning. Avoid with CYP3A4 inhibitors.",
      researchLevel: "Extensively Studied",
      tags: ["Mental Health", "Sleep", "Non-BZD Hypnotic", "Insomnia"],
      researchIndications: [
        { category: "Insomnia", effectiveness: "Most Effective", items: [
          { title: "Chronic Insomnia", description: "SLEEP MD trial: 6 months of nightly eszopiclone 3mg improved sleep onset, maintenance, and total sleep time vs placebo." },
          { title: "Sleep Maintenance Insomnia", description: "Particularly effective for middle-of-the-night and early morning awakenings." },
        ]},
      ],
      indianBrands: [
        { brand: "Hypnite 2" },
        { brand: "Hypnite 3" },
        { brand: "Topnite 2" },
      ],
    ukBrands: [
      { brand: "Not approved in UK", notes: "Zopiclone (the racemate) is used in the UK instead" },
    ],
    usBrands: [
      { brand: "Lunesta 1mg / 2mg / 3mg", manufacturer: "Jazz Pharmaceuticals / Sunovion" },
      { brand: "Eszopiclone (generic)", notes: "Available from multiple manufacturers" },
    ],
    canadaBrands: [
      { brand: "Not approved", notes: "Not licensed by Health Canada; zopiclone used instead" },
    ],
    
    overview: {
      whatIsIt: "Eszopiclone (Lunesta) is the S-enantiomer of zopiclone, a cyclopyrrolone non-benzodiazepine hypnotic (Z-drug). One of only two hypnotics FDA-approved without a time limit on duration of use. Approved for insomnia characterised by difficulty falling asleep and/or staying asleep.",
      keyBenefits: "Reduces sleep onset latency and wake-after-sleep-onset. Long clinical trials (6 months) showed sustained efficacy without tolerance development. Approved for 6+ months continuous use. Faster onset than oral controlled-release formulations of other hypnotics. Effective for both sleep onset and sleep maintenance insomnia.",
      mechanismOfAction: "Positive allosteric modulator at GABA-A receptors containing α1 and α2 subunits. Enhances chloride channel opening frequency in response to GABA, increasing inhibitory neurotransmission and producing sedation, anxiolysis, and muscle relaxation. The α1 subunit selectivity contributes to sedative-hypnotic effects; α2 contributes to anxiolysis.",
    },
    pharmacokinetics: { peak: "1h", halfLife: "6h", cleared: "24h" },
    researchProtocols: [
      { goal: "Insomnia — Sleep Onset + Maintenance", dose: "2mg at bedtime", frequency: "Once nightly (within 30 min of bedtime)", route: "Oral" },
      { goal: "Elderly patients (impaired metabolism)", dose: "1mg at bedtime", frequency: "Once nightly", route: "Oral" },
    ],
    interactions: [
      { name: "CNS depressants (alcohol, opioids, benzodiazepines — additive sedation and respiratory depression)", status: "avoid" },
      { name: "CYP3A4 inhibitors (ketoconazole, itraconazole — increase eszopiclone exposure 2-fold)", status: "caution" },
      { name: "Rifampicin (CYP3A4 inducer — reduces eszopiclone levels markedly)", status: "caution" },
    ],
    sideEffectNotes: [
      "Metallic or bitter taste (dysgeusia) — most distinctive side effect; reported in 17–34% of users; caused by eszopiclone itself",
      "Next-day drowsiness — dose-dependent; start at 1–2mg; caution driving next morning",
      "Complex sleep behaviours — rare: sleep-walking, sleep-driving, sleep-eating; FDA black box warning for Z-drug class",
      "Dependence and withdrawal — less than benzodiazepines but present with regular use; taper on discontinuation",
    ],
    faq: [
      { question: "Is eszopiclone safer than benzodiazepines for insomnia?", answer: "Eszopiclone and Z-drugs generally have faster offset and theoretically lower next-day impairment than long-acting benzodiazepines, but they act on the same GABA-A receptors and share similar risks. Dependence, tolerance, complex sleep behaviours, and withdrawal occur with all Z-drugs. They are not safer for driving impairment — the FDA has required strict warnings. Cognitive behavioural therapy for insomnia (CBT-I) is the recommended first-line treatment, with pharmacotherapy as short-term adjunct." },
      { question: "Why does eszopiclone cause a strange taste?", answer: "The metallic or bitter taste (dysgeusia) is a direct pharmacological effect of eszopiclone itself, not an excipient or formulation issue. It is reported in up to 34% of users and is one of the most distinctive side effects of this drug. It typically starts during sleep and is noticed on waking. It often improves after the first week and can be partially mitigated by rinsing the mouth with water upon waking. It is not a sign of harm." },
      { question: "Can I take eszopiclone long-term?", answer: "Eszopiclone is uniquely approved without a defined time limit (unlike many hypnotics). 6-month RCTs showed sustained efficacy without significant tolerance. However, dependence still develops with nightly use; most sleep specialists recommend intermittent dosing (3–4 nights per week) and combining with CBT-I to reduce reliance over time. Annual reassessment is recommended." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lunesta — Schedule IV controlled substance; approved for short- and long-term insomnia" },
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "The racemate (zopiclone) is licensed; eszopiclone is not separately licensed in UK" },
      { region: "India", agency: "CDSCO", status: "Not Approved", notes: "Zopiclone (racemate) is available; eszopiclone not separately licensed" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Zopiclone available; eszopiclone not separately approved" },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Sleep onset; take immediately before going to bed" },
      { timeframe: "6–7 hours", description: "Duration of hypnotic effect; ensure 8 hours available for sleep" },
    ],
    },

    {
      name: "Lamotrigine",
      slug: "lamotrigine",
      abbreviation: "LAM",
      aliases: ["lamictal", "lamigine", "lamosyn", "lamifil"],
      category: "mental-sleep",
      tagline: "Mood stabiliser & anticonvulsant — bipolar disorder & epilepsy",
      description: "Lamotrigine blocks voltage-gated sodium channels and inhibits glutamate release, stabilising neuronal membranes. Unique among mood stabilisers in preventing bipolar depression (not just mania). FDA-approved for bipolar I maintenance and adjunctive epilepsy.",
      color: "#6D28D9",
      vial: "Oral tablet / dispersible tablet",
      recon: "25mg, 50mg, 100mg, 150mg, 200mg",
      startDose: "25mg/day (must titrate slowly)",
      targetDose: "200–400mg/day (epilepsy); 200mg/day (bipolar)",
      frequency: "Once to twice daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Effective bipolar depression prevention (underserved therapeutic need). Anticonvulsant for partial and generalised seizures. Mood-stabilising without significant weight gain or sedation. Safe in pregnancy compared to valproate.",
      tips: "Must titrate slowly (every 2 weeks) to prevent Stevens-Johnson syndrome. With valproate: reduce lamotrigine dose by 50% (valproate doubles lamotrigine levels). With enzyme inducers (carbamazepine): double the target dose.",
      sideEffects: "Rash (requires slow titration), dizziness, headache, blurred vision, diplopia, ataxia, nausea. Stevens-Johnson syndrome (rare, titration-dependent).",
      watchOut: "SJS/TEN risk is directly related to rapid titration. Never rush titration. Discontinue at first sign of rash. Significant drug interactions with valproate and CYP inducers.",
      researchLevel: "Extensively Studied",
      tags: ["Mental Health", "Mood Stabiliser", "Bipolar", "Anticonvulsant"],
      researchIndications: [
        { category: "Psychiatric / Neurological", effectiveness: "Most Effective", items: [
          { title: "Bipolar I Maintenance (Depressive Episodes)", description: "ELAN studies: lamotrigine reduces frequency of bipolar depression episodes — the therapeutic gap left by lithium." },
          { title: "Partial Onset Seizures", description: "Effective adjunct and monotherapy for focal (partial) seizures in adults and children ≥2 years." },
          { title: "Generalised Tonic-Clonic Seizures", description: "Approved adjunct for primary generalised tonic-clonic seizures." },
        ]},
      ],
      indianBrands: [
        { brand: "Lamigine 25" },
        { brand: "Lamigine 100" },
        { brand: "Lamosyn 100" },
        { brand: "Lamifil 100" },
      ],
    ukBrands: [
      { brand: "Lamictal 2mg / 5mg / 25mg / 50mg / 100mg / 200mg", manufacturer: "GSK" },
      { brand: "Lamotrigine (generic)", notes: "Widely available — prescribe by brand for consistency" },
    ],
    usBrands: [
      { brand: "Lamictal 25mg / 100mg / 150mg / 200mg", manufacturer: "GSK" },
      { brand: "Lamictal XR 25–300mg", manufacturer: "GSK", notes: "Extended release" },
      { brand: "Lamotrigine (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Lamictal 25mg / 50mg / 100mg / 150mg / 200mg", manufacturer: "GSK" },
    ],
    
    overview: {
      whatIsIt: "Lamotrigine is a broad-spectrum antiepileptic drug (AED) that also has proven efficacy as a mood stabiliser in bipolar disorder, particularly for bipolar depression. Unique in that it does not cause weight gain, does not impair cognition, and is the preferred mood stabiliser in women of childbearing age among the established options.",
      keyBenefits: "Broad-spectrum AED: effective for focal, generalised, and absence seizures. Proven bipolar depression prophylaxis (superior to placebo in prevention of depressive episodes). Weight-neutral and cognitively well-tolerated. Approved in pregnancy (relatively, compared to valproate — still requires monitoring). Can be used as monotherapy.",
      mechanismOfAction: "Inhibits voltage-gated sodium channels in a use-dependent manner, stabilising neuronal membranes and reducing repetitive firing. Also inhibits high-voltage calcium channels. Together, these reduce excitatory neurotransmitter (glutamate, aspartate) release at presynaptic terminals. In bipolar disorder, these antiglutamatergic properties underlie its antidepressant and mood-stabilising effects.",
    },
    pharmacokinetics: { peak: "1.4–4.8h", halfLife: "25–33h (monotherapy); dramatically altered by enzyme inducers/inhibitors", cleared: "5–7 days (steady state)" },
    researchProtocols: [
      { goal: "Epilepsy (monotherapy)", dose: "100–200mg/day", frequency: "Once or twice daily", route: "Oral" },
      { goal: "Bipolar Depression (prophylaxis)", dose: "200mg/day (must be titrated very slowly)", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Valproate (inhibits lamotrigine glucuronidation — doubles lamotrigine levels; HALVE lamotrigine starting dose)", status: "caution" },
      { name: "Carbamazepine, phenytoin, phenobarbitone (enzyme inducers — DOUBLE lamotrigine dose needed)", status: "caution" },
      { name: "Oral contraceptives containing oestrogen (reduce lamotrigine by 50%; adjust dose during and between cycles)", status: "caution" },
    ],
    sideEffectNotes: [
      "Steven-Johnson Syndrome (SJS) / Toxic Epidermal Necrolysis (TEN) — rare but potentially fatal; highest risk if starting dose too high or titrating too fast, especially in children; stop immediately at any rash",
      "Headache, dizziness, diplopia (double vision) — dose-related; usually dose-dependent",
      "Insomnia — may need evening dose moved earlier",
      "Weight neutral — major advantage over valproate (which causes weight gain) and other mood stabilisers",
    ],
    faq: [
      { question: "Why does lamotrigine need to be increased so slowly?", answer: "Rapid titration of lamotrigine dramatically increases the risk of Stevens-Johnson syndrome (SJS), a potentially fatal skin reaction. Starting at 25mg/day (12.5mg if on valproate) and increasing by 25mg every 2 weeks to reach 100–200mg over 6–8 weeks substantially reduces SJS risk. Any rash developing during titration requires stopping the drug and urgent medical review — the rate of titration is the most important modifiable risk factor." },
      { question: "Is lamotrigine safe during pregnancy?", answer: "Lamotrigine is considered one of the safest antiepileptic drugs in pregnancy and is preferred over valproate (which has significant teratogenic risk — neural tube defects, developmental harm). However, it is not risk-free. The major concern is that oestrogen from pregnancy and oral contraceptives significantly reduces lamotrigine levels, requiring dose increases. Regular blood level monitoring in pregnancy is recommended. Always consult a neurologist for epilepsy management in pregnancy." },
      { question: "Can lamotrigine treat the manic phase of bipolar disorder?", answer: "No — lamotrigine is mainly effective for bipolar depression and prophylaxis. It has little to no efficacy for acute mania or hypomania — this is a key limitation. For acute mania, lithium, valproate, or an antipsychotic (quetiapine, olanzapine, haloperidol) is needed. Lamotrigine is often combined with one of these agents for comprehensive bipolar prophylaxis." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lamictal — epilepsy (partial and generalised), Lennox-Gastaut syndrome, bipolar I disorder (maintenance)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Lamictal — epilepsy and bipolar disorder; NICE recommended" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Lamitor, Lametec — licensed for epilepsy and bipolar disorder" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Lamictal — epilepsy and bipolar I disorder" },
    ],
    expectTimeline: [
      { timeframe: "6–8 weeks", description: "Therapeutic dose reached (slow titration); seizure/mood stabilisation begins" },
      { timeframe: "3–6 months", description: "Full mood stabilisation in bipolar disorder established" },
    ],
    },

    {
      name: "Carbamazepine",
      slug: "carbamazepine",
      abbreviation: "CBZ",
      aliases: ["tegretol", "tegrital", "encicarb", "carbamazepine cr"],
      category: "mental-sleep",
      tagline: "Anticonvulsant & mood stabiliser — epilepsy, bipolar & trigeminal neuralgia",
      description: "Carbamazepine blocks voltage-gated sodium channels, reducing neuronal excitability. Approved for focal and tonic-clonic seizures, trigeminal neuralgia, and bipolar disorder. Strong enzyme inducer — extensive drug interactions. HLA-B*1502 allele testing recommended in Asian patients before prescribing (SJS risk).",
      color: "#6D28D9",
      vial: "Oral tablet / CR tablet / liquid",
      recon: "100mg, 200mg, 400mg; 200mg/400mg CR",
      startDose: "100–200mg twice daily",
      targetDose: "800–1200mg/day",
      frequency: "Twice daily (CR formulation) or 3–4× daily (immediate release)",
      route: "Oral",
      storage: "Room temperature, protect from moisture",
      benefits: "Highly effective anticonvulsant for focal seizures. First-line for trigeminal neuralgia (tic douloureux) — dramatic pain relief. Mood-stabilising in bipolar disorder. Available as controlled-release for stable twice-daily dosing.",
      tips: "Monitor serum levels (therapeutic range 4–12 mcg/mL). Blood count and LFTs at baseline and every 3–6 months. Strong enzyme inducer — will reduce levels of many drugs including OCP, warfarin, and other anticonvulsants.",
      sideEffects: "Dizziness, diplopia, ataxia, sedation (especially at initiation), hyponatraemia (SIADH). Haematological: leucopaenia, agranulocytosis (rare). Serious: SJS/TEN.",
      watchOut: "HLA-B*1502 testing mandatory in patients of Asian descent — extremely high SJS risk. Avoid in AV block. Auto-induces its own metabolism — monitor levels. Multiple critical drug interactions.",
      researchLevel: "Extensively Studied",
      tags: ["Mental Health", "Anticonvulsant", "Bipolar", "Neuralgia"],
      researchIndications: [
        { category: "Neurological / Psychiatric", effectiveness: "Most Effective", items: [
          { title: "Focal (Partial) Seizures", description: "Long-established first-line agent for focal seizures. Comparable efficacy to newer agents with more monitoring needs." },
          { title: "Trigeminal Neuralgia", description: "First-line treatment — dramatically reduces frequency and severity of tic douloureux in 70–80% of patients." },
          { title: "Bipolar Disorder (Mania)", description: "Effective alternative to lithium for acute mania and bipolar maintenance in lithium-resistant patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Tegrital 100" },
        { brand: "Tegrital 200" },
        { brand: "Tegrital 400CR" },
        { brand: "Encicarb 200" },
      ],
    ukBrands: [
      { brand: "Tegretol 100mg / 200mg / 400mg", manufacturer: "Novartis" },
      { brand: "Carbagen SR 200mg / 400mg", manufacturer: "Actavis", notes: "Modified release" },
    ],
    usBrands: [
      { brand: "Tegretol 200mg / 400mg", manufacturer: "Novartis" },
      { brand: "Carbatrol 100mg / 200mg / 300mg ER", manufacturer: "UCB" },
      { brand: "Epitol 200mg", notes: "Generic brand" },
    ],
    canadaBrands: [
      { brand: "Tegretol 200mg / 400mg CR", manufacturer: "Novartis" },
    ],
    
    overview: {
      whatIsIt: "Carbamazepine is a tricyclic anticonvulsant and mood stabiliser approved for focal and generalised tonic-clonic seizures, trigeminal neuralgia (first-line), and bipolar disorder (particularly mania). One of the most widely used antiepileptic drugs globally with over 50 years of clinical experience.",
      keyBenefits: "Highly effective for focal (partial) seizures and tonic-clonic seizures. First-line treatment for trigeminal neuralgia — often provides dramatic relief. Effective for bipolar mania. Long experience base and relatively low cost. Available as extended-release (Tegretol CR) for smoother levels and fewer side effects.",
      mechanismOfAction: "Inhibits voltage-gated sodium channels in a use-dependent manner, stabilising hyperexcitable neuronal membranes. Also reduces polysynaptic responses. In trigeminal neuralgia, blocks ectopic discharge in trigeminal afferents. Potent enzyme inducer of CYP3A4, CYP2C9, and CYP1A2 — auto-induces its own metabolism over the first weeks of use.",
    },
    pharmacokinetics: { peak: "4–8h (standard); 8–12h (CR)", halfLife: "12–17h at steady state (initially 25–65h, shortens with auto-induction)", cleared: "3–5 days (steady state)" },
    researchProtocols: [
      { goal: "Epilepsy (initiation)", dose: "100–200mg twice daily", frequency: "Twice daily", route: "Oral" },
      { goal: "Epilepsy (maintenance)", dose: "400–1200mg/day", frequency: "Twice to three times daily", route: "Oral" },
      { goal: "Trigeminal Neuralgia", dose: "200–400mg twice daily (titrate to response)", frequency: "Twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Many — potent CYP3A4/2C9/1A2 inducer: reduces levels of OCP, warfarin, statins, antidepressants, antipsychotics, other AEDs, immunosuppressants", status: "caution" },
      { name: "Valproate (inhibits carbamazepine metabolism; 10,11-epoxide accumulation)", status: "caution" },
      { name: "MAOIs (serious adverse reactions — avoid combination)", status: "avoid" },
    ],
    sideEffectNotes: [
      "Diplopia, blurred vision, ataxia, dizziness — most common; dose-related; use CR formulation to reduce",
      "Hyponatraemia (SIADH) — common in elderly; monitor sodium in older patients",
      "Agranulocytosis and aplastic anaemia — rare but serious; FBC monitoring required",
      "Rash — 10% incidence; risk of SJS in HLA-B*1502 allele carriers (primarily Southeast Asian populations — genetic testing recommended before starting)",
      "Hepatotoxicity — monitor LFTs at baseline and periodically",
    ],
    faq: [
      { question: "Why does carbamazepine interact with so many drugs?", answer: "Carbamazepine is one of the most potent enzyme inducers among commonly prescribed drugs. It upregulates CYP3A4, CYP2C9, CYP1A2, and P-glycoprotein — accelerating the metabolism of an enormous range of drugs including oral contraceptives (pregnancy risk), warfarin (clotting risk), most statins, many antidepressants, and other antiepileptics. A complete medication review by a pharmacist or specialist is essential when starting carbamazepine." },
      { question: "Should I be tested for the HLA-B*1502 gene before taking carbamazepine?", answer: "Yes — if you are of Han Chinese, Thai, Filipino, Malaysian, or South Asian descent. The HLA-B*1502 allele dramatically increases the risk of carbamazepine-induced Stevens-Johnson syndrome (SJS) and toxic epidermal necrolysis (TEN), which are potentially fatal. This genetic test is now recommended by the FDA, EMA, and MHRA before initiating carbamazepine in at-risk populations. The HLA-A*3101 allele (more common in Northern Europeans and Japanese) is associated with a broader but less severe spectrum of hypersensitivity reactions." },
      { question: "Can carbamazepine affect my sodium levels?", answer: "Yes — carbamazepine stimulates ADH (antidiuretic hormone) secretion, causing inappropriate antidiuresis and hyponatraemia (low sodium) in a significant minority of patients, particularly the elderly. Symptoms include nausea, headache, confusion, and in severe cases seizures (paradoxically). Sodium should be checked at baseline and within 3–6 months of starting treatment, and again if symptoms suggestive of hyponatraemia develop." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Tegretol — epilepsy (partial, TC), trigeminal neuralgia, bipolar mania" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Tegretol — epilepsy, trigeminal neuralgia, bipolar disorder" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Tegrital, Tegral, Mazetol — widely used for epilepsy and trigeminal neuralgia" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Tegretol — epilepsy and trigeminal neuralgia; also bipolar" },
    ],
    expectTimeline: [
      { timeframe: "2–4 weeks", description: "Auto-induction completes; blood levels stabilise; adjust dose if needed" },
      { timeframe: "2–4 weeks (trigeminal neuralgia)", description: "Pain relief often dramatic within days of reaching effective dose" },
    ],
    },

    // ─── PAIN & MUSCULOSKELETAL ───────────────────────────────────────────────

    {
      name: "Meloxicam",
      slug: "meloxicam",
      abbreviation: "MELO",
      aliases: ["mobic", "melorise", "meloaxis", "meftal-spas-adjacent"],
      category: "pain",
      tagline: "Preferential COX-2 NSAID — arthritis & acute pain",
      description: "Meloxicam preferentially inhibits COX-2 over COX-1, providing anti-inflammatory, analgesic, and antipyretic effects with a lower GI side effect profile than non-selective NSAIDs. Once-daily dosing. Effective for osteoarthritis, rheumatoid arthritis, and acute musculoskeletal pain.",
      color: "#92400E",
      vial: "Oral tablet",
      recon: "7.5mg, 15mg",
      startDose: "7.5mg/day",
      targetDose: "15mg/day",
      frequency: "Once daily with food",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Once-daily dosing improves adherence. Better GI tolerability than ibuprofen or naproxen at equivalent doses. Effective for OA, RA, and ankylosing spondylitis.",
      tips: "Always take with food or milk. Use lowest effective dose for shortest duration. Gastroprotection (PPI) with long-term use. Avoid in last trimester of pregnancy.",
      sideEffects: "GI discomfort (less than non-selective NSAIDs), dyspepsia, diarrhoea, headache, dizziness, oedema, elevated BP.",
      watchOut: "CV risk increases with prolonged use — same class caution as all NSAIDs. Avoid in severe renal impairment. Avoid with warfarin. Not in last trimester of pregnancy (premature ductus closure).",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "NSAID", "Arthritis", "COX-2 Preferential"],
      researchIndications: [
        { category: "Pain & Inflammation", effectiveness: "Most Effective", items: [
          { title: "Osteoarthritis", description: "Comparable efficacy to diclofenac/naproxen with fewer GI adverse events in OA." },
          { title: "Rheumatoid Arthritis", description: "Effective add-on anti-inflammatory to DMARD therapy in RA." },
          { title: "Acute Musculoskeletal Pain", description: "Rapid pain relief in acute sprains, strains, and musculoskeletal injury." },
        ]},
      ],
      indianBrands: [
        { brand: "Melorise 7.5" },
        { brand: "Melorise 15" },
        { brand: "Meloaxis 7.5" },
      ],
    ukBrands: [
      { brand: "Mobic 7.5mg / 15mg", manufacturer: "Boehringer Ingelheim" },
      { brand: "Meloxicam (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Mobic 7.5mg / 15mg", manufacturer: "Boehringer Ingelheim" },
      { brand: "Vivlodex 5mg / 10mg", manufacturer: "Iroko", notes: "Lower dose capsule" },
    ],
    canadaBrands: [
      { brand: "Mobicox 7.5mg / 15mg", manufacturer: "Boehringer Ingelheim" },
    ],
    
    overview: {
      whatIsIt: "Meloxicam is a preferential COX-2 inhibitor NSAID (non-steroidal anti-inflammatory drug) with greater selectivity for COX-2 over COX-1 compared to traditional NSAIDs. Approved for osteoarthritis, rheumatoid arthritis, and ankylosing spondylitis. Once-daily dosing and lower GI toxicity than non-selective NSAIDs are its main advantages.",
      keyBenefits: "Once-daily dosing with 15–20 hour half-life. Lower GI side effect rate than ibuprofen, diclofenac, and naproxen in comparative trials. Effective analgesic and anti-inflammatory for chronic joint conditions. Long clinical experience. Available in oral and IM formulations.",
      mechanismOfAction: "Inhibits cyclooxygenase enzymes (COX-1 and COX-2) with approximately 10:1 selectivity for COX-2 at therapeutic doses. COX-2 inhibition reduces prostaglandin E2 production at inflammatory sites, decreasing inflammation, pain sensitisation, and fever. Some COX-1 inhibition occurs (less than naproxen or ibuprofen) but enough to reduce platelet TXA2 production.",
    },
    pharmacokinetics: { peak: "5–6h", halfLife: "15–20h", cleared: "~72h" },
    researchProtocols: [
      { goal: "Osteoarthritis", dose: "7.5mg/day (increase to 15mg if needed)", frequency: "Once daily with food", route: "Oral" },
      { goal: "Rheumatoid Arthritis / Ankylosing Spondylitis", dose: "15mg/day", frequency: "Once daily with food", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin / anticoagulants (increased bleeding risk)", status: "caution" },
      { name: "ACE inhibitors / ARBs / diuretics (NSAID reduces renal perfusion — AKI risk and reduced antihypertensive effect)", status: "caution" },
      { name: "Lithium (NSAIDs reduce renal lithium clearance — toxicity risk)", status: "caution" },
      { name: "Aspirin concurrent use (offsets gastroprotective benefit; additive GI toxicity)", status: "caution" },
    ],
    sideEffectNotes: [
      "GI effects (dyspepsia, nausea) — lower than traditional NSAIDs but present; take with food",
      "GI bleeding — lower risk than naproxen or ibuprofen but not zero; consider PPI co-prescription in high-risk patients",
      "Cardiovascular risk — all NSAIDs (including COX-2 preferential) increase CV risk; avoid in established cardiovascular disease if possible",
      "Renal impairment — reduce prostaglandin-dependent renal perfusion; avoid in advanced CKD",
      "Fluid retention and oedema",
    ],
    faq: [
      { question: "Is meloxicam safer than ibuprofen or naproxen?", answer: "Meloxicam has lower GI toxicity than traditional NSAIDs in comparative studies — fewer GI bleeds and ulcers. This is because its COX-2 preference spares more COX-1-dependent gastric mucosal protection. However, it is not as safe as specific COX-2 inhibitors (celecoxib, etoricoxib), and cardiovascular risk is similar to other NSAIDs. For most patients, the choice between NSAIDs is based on individual risk factors for GI versus cardiovascular complications." },
      { question: "Can meloxicam be taken long-term for arthritis?", answer: "Meloxicam can be used chronically for arthritis, but long-term NSAID use requires monitoring: blood pressure, renal function (creatinine/eGFR), and screening for GI symptoms. A PPI (omeprazole, esomeprazole) is recommended for GI protection if used regularly, especially in patients ≥65, on aspirin, or with prior peptic ulcer disease." },
      { question: "Can I take meloxicam with aspirin?", answer: "Low-dose aspirin (75–100mg) for cardiovascular protection can be taken with meloxicam, but this combination increases GI bleeding risk. Ibuprofen (not meloxicam, celecoxib) blocks aspirin's antiplatelet effect when taken together. PPI co-prescription is recommended whenever NSAIDs and low-dose aspirin are combined." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Mobic — osteoarthritis, rheumatoid arthritis; generic widely available" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Mobic, Mobicox — OA, RA, ankylosing spondylitis" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Mobizox, Melonex, Mefkind — widely prescribed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Mobicox — licensed for OA and RA" },
    ],
    expectTimeline: [
      { timeframe: "1–2 days", description: "Analgesic effect begins" },
      { timeframe: "1–2 weeks", description: "Full anti-inflammatory benefit for arthritis" },
    ],
    },

    {
      name: "Diclofenac",
      slug: "diclofenac",
      abbreviation: "DICL",
      aliases: ["voltaren", "zerodol", "voveran", "diclofenac sodium"],
      category: "pain",
      tagline: "Non-selective NSAID — versatile analgesic & anti-inflammatory",
      description: "Diclofenac is a phenylacetic acid NSAID that inhibits both COX-1 and COX-2. Available in multiple formulations: oral, topical gel, suppository, and injection. One of the most widely used NSAIDs globally — effective for acute pain, chronic arthritis, and topical musculoskeletal conditions.",
      color: "#92400E",
      vial: "Oral tablet / Topical gel / Suppository / IM injection",
      recon: "50mg, 75mg, 100mg tablet; 25mg/mL injection; 1% gel",
      startDose: "50mg twice daily (oral)",
      targetDose: "75–150mg/day in divided doses",
      frequency: "Two to three times daily",
      route: "Oral, topical, or IM injection",
      storage: "Room temperature",
      benefits: "Versatile — multiple routes of administration. Topical gel provides local effect with minimal systemic absorption. Effective acute pain management. Injectable form useful for severe musculoskeletal pain.",
      tips: "Take with food. Topical gel: apply 4× daily to affected area — effective for knee OA with minimal systemic effects. Enteric-coated tablets reduce but don't eliminate GI risk.",
      sideEffects: "GI irritation, dyspepsia, peptic ulceration, elevated liver enzymes (more than other NSAIDs), fluid retention, hypertension.",
      watchOut: "Higher hepatotoxicity risk than other NSAIDs — monitor LFTs. CV risk with prolonged use. Avoid with anticoagulants, other NSAIDs, and lithium.",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "NSAID", "Anti-inflammatory", "Topical"],
      researchIndications: [
        { category: "Pain & Inflammation", effectiveness: "Most Effective", items: [
          { title: "Musculoskeletal Pain", description: "IM/oral diclofenac provides rapid pain relief for acute muscle and joint injuries." },
          { title: "Osteoarthritis (Topical)", description: "1% topical gel: equivalent efficacy to oral NSAIDs for knee OA with substantially lower systemic side effects." },
          { title: "Postoperative Pain", description: "IV/IM diclofenac effective for moderate postoperative pain with opioid-sparing effects." },
        ]},
      ],
      indianBrands: [
        { brand: "Zerodol 50" },
        { brand: "Zerodol 100" },
        { brand: "Zerodol-SP" },
      ],
    ukBrands: [
      { brand: "Voltarol 25mg / 50mg tablets", manufacturer: "Haleon / GSK" },
      { brand: "Voltarol Emulgel 1% / 2.32%", manufacturer: "Haleon / GSK", notes: "Topical" },
      { brand: "Dicloflex 25mg / 50mg", manufacturer: "Dexcel" },
    ],
    usBrands: [
      { brand: "Voltaren 1% Gel", manufacturer: "GSK", notes: "OTC topical" },
      { brand: "Zipsor 25mg", manufacturer: "Depomed", notes: "Liquid-filled capsule" },
      { brand: "Zorvolex 18mg / 35mg", manufacturer: "Iroko", notes: "Low-dose submicron" },
      { brand: "Pennsaid 1.5% / 2% Solution", manufacturer: "Nuvo", notes: "Topical" },
    ],
    canadaBrands: [
      { brand: "Voltaren 25mg / 50mg", manufacturer: "GSK" },
      { brand: "Voltaren Emulgel 1%", manufacturer: "GSK", notes: "OTC topical" },
    ],
    
    overview: {
      whatIsIt: "Diclofenac is one of the most widely prescribed NSAIDs globally. Available as oral tablets, patches, topical gels, and ophthalmic drops. Moderately COX-2 selective. Used for a broad range of painful and inflammatory conditions including arthritis, acute musculoskeletal pain, and dysmenorrhoea.",
      keyBenefits: "Multiple formulations allow targeted delivery (topical gel has minimal systemic absorption — better GI and CV safety). Once-daily extended-release formulations available. Rapid onset for acute pain. Highly effective analgesic and anti-inflammatory. Topical diclofenac gel (Voltaren) proven equivalent to oral therapy for knee osteoarthritis.",
      mechanismOfAction: "Inhibits COX-1 and COX-2, with mild COX-2 selectivity at therapeutic doses, reducing prostaglandin synthesis. Also inhibits leukotriene synthesis and may have direct effects on arachidonic acid metabolism beyond COX inhibition. Topical gel achieves local tissue concentrations while minimising systemic exposure.",
    },
    pharmacokinetics: { peak: "2–3h (oral); 10–20h (topical)", halfLife: "1–2h (oral)", cleared: "8h (oral)" },
    researchProtocols: [
      { goal: "Pain / OA / RA (oral)", dose: "50mg three times daily or 75mg twice daily", frequency: "Two to three times daily with food", route: "Oral" },
      { goal: "Topical — OA knee", dose: "4g gel (1%)", frequency: "4× daily to affected joint", route: "Topical" },
      { goal: "Dysmenorrhoea", dose: "50mg three times daily during menses", frequency: "Three times daily", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (increased bleeding risk)", status: "caution" },
      { name: "Lithium (reduced renal clearance)", status: "caution" },
      { name: "ACE inhibitors / ARBs / diuretics (reduced efficacy + renal risk)", status: "caution" },
      { name: "Methotrexate (NSAIDs reduce MTX renal clearance — toxicity risk)", status: "caution" },
    ],
    sideEffectNotes: [
      "GI bleeding and ulceration — risk similar to or slightly higher than meloxicam; use PPI if risk factors",
      "Cardiovascular events — higher CV risk than some NSAIDs (similar to COX-2 inhibitors); avoid in CV disease",
      "Hepatotoxicity — diclofenac has higher liver enzyme elevation risk than other NSAIDs; monitor LFTs in prolonged use",
      "Topical: local skin reactions (rash, dryness at application site) — minimal systemic effects",
    ],
    faq: [
      { question: "Is topical diclofenac gel as effective as tablets?", answer: "For localised conditions (knee or hand osteoarthritis, acute musculoskeletal pain), topical 1% diclofenac gel produces local joint concentrations equivalent to oral diclofenac with far less systemic exposure — approximately 6–7% of the plasma levels seen with oral dosing. Multiple trials show equivalent efficacy to oral NSAIDs for knee OA with a substantially better GI and cardiovascular safety profile. Topical diclofenac is recommended as first-line NSAID therapy for knee OA by NICE." },
      { question: "Why does diclofenac have a liver toxicity concern?", answer: "Diclofenac undergoes extensive hepatic metabolism via CYP2C9 and produces reactive acyl glucuronide metabolites that can covalently bind to hepatic proteins, causing rare but potentially severe drug-induced liver injury (DILI). The risk is dose-dependent and increases with prolonged use. Monitor LFTs every 4–8 weeks in the first 6 months of regular use. Stop if ALT rises >3× upper limit of normal." },
      { question: "Can diclofenac be used for period pain?", answer: "Yes — diclofenac is effective for primary dysmenorrhoea (period pain). By reducing prostaglandin E2 and F2α production in the uterus, it reduces uterine cramping and pain. 50mg three times daily started at the onset of menstrual flow is a standard approach. Naproxen (500mg twice daily) is equally effective and is often preferred due to its longer half-life." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Voltaren (topical), Cambia, Zipsor — various formulations for pain and arthritis" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Voltarol — oral, topical, suppository; NICE first-line topical for knee OA" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Voveran, Diclogen, Diclomax — most widely prescribed NSAID in India" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Voltaren — oral and topical formulations licensed" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Oral analgesia begins" },
      { timeframe: "3–7 days", description: "Anti-inflammatory effect for arthritis" },
    ],
    },

    {
      name: "Naproxen",
      slug: "naproxen",
      abbreviation: "NAP",
      aliases: ["naprosyn", "aleve", "naxdom", "naprozen"],
      category: "pain",
      tagline: "Non-selective NSAID — long-acting pain & inflammation relief",
      description: "Naproxen is a propionic acid NSAID with a 12–17-hour half-life, allowing twice-daily dosing (compared to ibuprofen's 4–8-hour dosing). Has the most favourable cardiovascular safety profile among non-selective NSAIDs in head-to-head studies. Effective for arthritis, acute pain, dysmenorrhoea, and migraine.",
      color: "#92400E",
      vial: "Oral tablet / Sustained-release tablet",
      recon: "250mg, 375mg, 500mg; 750mg, 1000mg SR",
      startDose: "250–500mg twice daily",
      targetDose: "500–1000mg/day",
      frequency: "Twice daily (or once daily for SR formulation)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Long half-life allows convenient twice-daily dosing. Best CV safety profile among NSAIDs (PRECISION trial). Effective for dysmenorrhoea. SR formulation for once-daily use.",
      tips: "Take with food or milk. PRECISION trial showed lowest CV event rate among naproxen vs celecoxib and ibuprofen in arthritis patients. Concurrent PPI recommended for long-term use.",
      sideEffects: "GI discomfort, dyspepsia, peptic ulcer, fluid retention, renal impairment, headache.",
      watchOut: "Avoid in severe renal or hepatic impairment. CV risk with prolonged use (least of major NSAIDs). Avoid in last trimester of pregnancy.",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "NSAID", "Arthritis", "Dysmenorrhoea"],
      researchIndications: [
        { category: "Pain & Inflammation", effectiveness: "Most Effective", items: [
          { title: "Osteoarthritis / RA", description: "Effective long-acting anti-inflammatory for arthritis with favourable CV profile (PRECISION trial)." },
          { title: "Dysmenorrhoea", description: "Effective first-line for painful periods — reduces prostaglandin-mediated uterine cramping." },
          { title: "Acute Migraine", description: "Naproxen sodium 500mg effective for acute migraine with aura." },
        ]},
      ],
      indianBrands: [
        { brand: "Naprosyn 250" },
        { brand: "Naprosyn 500" },
        { brand: "Naxdom 500" },
        { brand: "Naprozen 500" },
      ],
    ukBrands: [
      { brand: "Naprosyn 250mg / 500mg", manufacturer: "Atnahs" },
      { brand: "Aleve 220mg", manufacturer: "Bayer", notes: "OTC" },
    ],
    usBrands: [
      { brand: "Aleve 220mg", manufacturer: "Bayer", notes: "OTC" },
      { brand: "Naprosyn 250mg / 375mg / 500mg", manufacturer: "Amneal" },
      { brand: "Anaprox DS 550mg", notes: "Naproxen sodium" },
    ],
    canadaBrands: [
      { brand: "Aleve 220mg", manufacturer: "Bayer", notes: "OTC" },
      { brand: "Naprosyn 250mg / 500mg", notes: "Rx" },
    ],
    
    overview: {
      whatIsIt: "Naproxen is a non-selective NSAID with one of the longest half-lives in its class, enabling twice-daily dosing for chronic pain and OTC single-tablet formulations. Notable for having the lowest cardiovascular risk among common NSAIDs (confirmed in multiple network meta-analyses), making it the preferred NSAID in patients with cardiovascular risk.",
      keyBenefits: "Lowest cardiovascular risk among common NSAIDs. Effective for arthritis, acute pain, migraine, dysmenorrhoea, and gout. OTC availability for acute pain management. Long half-life (12–17h) allows twice-daily dosing. Naproxen sodium formulation (Aleve, Anaprox) has faster onset.",
      mechanismOfAction: "Inhibits both COX-1 and COX-2 non-selectively. COX inhibition reduces prostaglandin synthesis, reducing inflammation, sensitisation of pain afferents, and fever. COX-1 inhibition reduces platelet thromboxane A2, providing antiplatelet effect — this may contribute to the relatively lower CV risk by partially mimicking aspirin's cardiovascular effects.",
    },
    pharmacokinetics: { peak: "2–4h", halfLife: "12–17h", cleared: "~5 days" },
    researchProtocols: [
      { goal: "OA / RA (chronic)", dose: "500mg twice daily", frequency: "Twice daily with food", route: "Oral" },
      { goal: "Acute Pain / Migraine / Dysmenorrhoea", dose: "500–550mg initial, then 250–275mg every 6–8h", frequency: "Variable — max 1250mg/day", route: "Oral" },
      { goal: "Acute Gout", dose: "750mg initial, then 500mg 8h later, then 500mg twice daily", frequency: "As per protocol × 5–7 days", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (increased bleeding risk)", status: "caution" },
      { name: "Lithium (reduced renal clearance)", status: "caution" },
      { name: "ACE inhibitors / ARBs (reduced antihypertensive effect, AKI risk)", status: "caution" },
      { name: "Low-dose aspirin (NSAIDs may reduce antiplatelet benefit — take aspirin 2h before naproxen)", status: "timing" },
    ],
    sideEffectNotes: [
      "GI irritation — take with food; PPI if high risk",
      "Fluid retention and oedema",
      "Renal impairment — reduce dose in CKD",
      "Lowest CV risk among NSAIDs — still avoid in recent MI or stroke",
    ],
    faq: [
      { question: "Is naproxen safer for the heart than ibuprofen or diclofenac?", answer: "Yes — naproxen has the best cardiovascular safety profile among common NSAIDs. Multiple meta-analyses show naproxen has significantly lower rates of cardiovascular events (MI, stroke, CV death) than diclofenac, celecoxib, and ibuprofen at comparable doses. This is likely related to naproxen's sustained platelet inhibition (mimicking low-dose aspirin) and its relatively lower COX-2 selectivity. It is the preferred NSAID in patients with cardiovascular risk factors who cannot avoid an NSAID." },
      { question: "Can I take naproxen with low-dose aspirin?", answer: "Naproxen (unlike ibuprofen) does not interfere with aspirin's antiplatelet effect when taken after aspirin, but this combination increases GI bleeding risk. If both are needed, take aspirin first (at least 2 hours before naproxen) to allow aspirin to act on platelets before naproxen competitively blocks its access to COX-1. PPI co-prescription is recommended." },
      { question: "Is naproxen effective for gout?", answer: "Yes — naproxen is an effective and commonly used treatment for acute gout flares. High-dose naproxen (750mg initially, then 500mg twice daily for 5–7 days) is recommended by NICE and EULAR guidelines. It provides rapid pain relief by reducing prostaglandin-mediated inflammation in the joint. It is not suitable for prevention of gout — allopurinol or febuxostat are used for urate-lowering prophylaxis." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Aleve (OTC), Naprosyn, Anaprox — OA, RA, acute pain, dysmenorrhoea, ankylosing spondylitis" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Naprosyn, Naproxen (generic) — OTC and Rx formulations available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Napryn, Anaprox — available; less commonly used than diclofenac" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Aleve (OTC), Naprosyn (Rx) — licensed for pain and arthritis" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Analgesic onset" },
      { timeframe: "2–7 days", description: "Anti-inflammatory benefit for arthritis or gout" },
    ],
    },

    {
      name: "Ibuprofen",
      slug: "ibuprofen",
      abbreviation: "IBU",
      aliases: ["brufen", "nicip", "advil", "ibuprofen 400"],
      category: "pain",
      tagline: "First-line OTC NSAID — pain, fever & inflammation",
      description: "Ibuprofen is the most widely used NSAID globally. Non-selective COX-1 and COX-2 inhibitor with analgesic, anti-inflammatory, and antipyretic properties. Short half-life requires 6–8-hourly dosing. First-line treatment for mild to moderate pain, fever, and inflammation.",
      color: "#92400E",
      vial: "Oral tablet / Liquid suspension",
      recon: "200mg, 400mg, 600mg, 800mg tablets; 100mg/5mL suspension",
      startDose: "200–400mg every 4–6 hours",
      targetDose: "400–600mg three times daily (anti-inflammatory dose)",
      frequency: "Every 4–8 hours as needed",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Rapid onset (30–60 min). Effective for broad range of pain. OTC availability. Well-tolerated short-term. Pediatric suspension available for fever in children.",
      tips: "Always take with food or milk. Do not exceed 1200mg/day OTC or 3200mg/day prescription. Avoid combining with aspirin (reduces aspirin's antiplatelet effect). Short-term use for least GI risk.",
      sideEffects: "GI irritation, dyspepsia, nausea, peptic ulceration, headache, dizziness, fluid retention, renal impairment.",
      watchOut: "Short-term: minimal risk if healthy. Long-term: GI bleeding, CV events, renal impairment. Avoid in peptic ulcer disease, renal failure, pregnancy (3rd trimester). Most CV-problematic NSAID in PRECISION trial.",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "NSAID", "OTC", "Fever", "Anti-inflammatory"],
      researchIndications: [
        { category: "Pain & Fever", effectiveness: "Most Effective", items: [
          { title: "Mild to Moderate Pain", description: "First-line OTC analgesic. Effective for headache, dental pain, musculoskeletal pain." },
          { title: "Fever", description: "Effective antipyretic, comparable to paracetamol. Preferred when anti-inflammatory effect also needed." },
          { title: "Dysmenorrhoea", description: "Most studied NSAID for primary dysmenorrhoea — reduces prostaglandin-mediated uterine cramping." },
        ]},
      ],
      indianBrands: [
        { brand: "Nicip 400" },
        { brand: "Nicip Plus" },
        { brand: "Brufen 400" },
        { brand: "Brufen 600" },
      ],
    ukBrands: [
      { brand: "Nurofen 200mg / 400mg", manufacturer: "Reckitt", notes: "OTC" },
      { brand: "Brufen 200mg / 400mg / 600mg", manufacturer: "Abbott" },
    ],
    usBrands: [
      { brand: "Advil 200mg", manufacturer: "Pfizer / Haleon", notes: "OTC" },
      { brand: "Motrin IB 200mg", manufacturer: "Johnson & Johnson", notes: "OTC" },
      { brand: "Caldolor 400–800mg IV", manufacturer: "Cumberland Pharma" },
    ],
    canadaBrands: [
      { brand: "Advil 200mg / 400mg", manufacturer: "Pfizer / Haleon", notes: "OTC" },
      { brand: "Motrin 200mg / 400mg", manufacturer: "Johnson & Johnson" },
    ],
    
    overview: {
      whatIsIt: "Ibuprofen is a non-selective COX inhibitor NSAID and one of the most widely used analgesics/anti-inflammatics globally. Available OTC in most countries at 200–400mg. The first NSAID approved by the FDA, with a broadly favourable safety profile at low doses and short-term use. Used for fever, mild-to-moderate pain, and inflammatory conditions.",
      keyBenefits: "Effective analgesic, antipyretic, and anti-inflammatory. OTC availability in most countries. Well-studied safety at OTC doses (200–400mg every 4–6 hours). Multiple formulations: tablets, capsules, liquid, IV, topical. Ibuprofen lysine (IV) is used in neonatology for patent ductus arteriosus closure. Reduces fever comparably to paracetamol.",
      mechanismOfAction: "Non-selectively inhibits COX-1 and COX-2, reducing prostaglandin synthesis throughout the body. Analgesic effect via reduced PGE2 sensitisation of peripheral nociceptors. Antipyretic effect via reduced hypothalamic prostaglandin E2 (which mediates fever). Anti-inflammatory via reduced prostaglandin-mediated vasodilation and oedema formation.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "1.8–3.5h", cleared: "8–12h" },
    researchProtocols: [
      { goal: "Acute Pain / Fever (OTC)", dose: "400mg every 4–6 hours", frequency: "Up to 3 times daily with food", route: "Oral" },
      { goal: "Arthritis (prescription dose)", dose: "1200–3200mg/day", frequency: "Three to four times daily with food", route: "Oral" },
      { goal: "Migraine (acute)", dose: "400–600mg", frequency: "Single dose; repeat after 4h if needed", route: "Oral" },
    ],
    interactions: [
      { name: "Aspirin (blocks antiplatelet effect — do not use regularly for CV protection if on aspirin)", status: "caution" },
      { name: "Warfarin (increased bleeding risk)", status: "caution" },
      { name: "ACE inhibitors / ARBs / diuretics (AKI risk, reduced antihypertensive effect)", status: "caution" },
      { name: "Lithium (reduced renal lithium clearance)", status: "caution" },
      { name: "Methotrexate (reduced renal MTX clearance — toxicity at high MTX doses)", status: "caution" },
    ],
    sideEffectNotes: [
      "GI irritation, nausea, peptic ulcer — take with food or milk; avoid on empty stomach",
      "Cardiovascular risk — at higher doses or long-term use; ibuprofen has intermediate CV risk among NSAIDs",
      "Renal impairment — prostaglandin-dependent perfusion reduced; avoid in dehydration",
      "Aspirin resistance — ibuprofen blocks aspirin's antiplatelet binding; take aspirin ≥8h before or 30 min after ibuprofen if both needed",
      "Masking fever in serious infection — monitor carefully",
    ],
    faq: [
      { question: "Is it safe to take ibuprofen every day for chronic pain?", answer: "Daily ibuprofen for chronic pain significantly increases risks of GI bleeding (up to 3× higher than non-use), cardiovascular events, and renal impairment. If daily analgesia is needed for chronic conditions, discuss alternatives: paracetamol (lower CV/GI risk), topical NSAIDs (minimal systemic exposure), or disease-modifying therapy. If NSAIDs must be used chronically, add a PPI and monitor renal function and blood pressure regularly." },
      { question: "Can ibuprofen reduce my aspirin's heart protection?", answer: "Yes — ibuprofen competitively binds COX-1 in platelets at the same site as aspirin, blocking aspirin's irreversible antiplatelet acetylation. If you take ibuprofen before aspirin (or simultaneously), the aspirin cannot bind — its CV protection is reduced. If you need both, take aspirin first, wait ≥30 minutes (ideally 1–2 hours), then take ibuprofen. This problem does not affect naproxen in the same way — naproxen is a better choice for concurrent use with aspirin." },
      { question: "Can I take ibuprofen with paracetamol?", answer: "Yes — ibuprofen and paracetamol have completely different mechanisms and can be safely combined at standard doses. This combination is more effective than either alone for moderate pain (evidence from dental and post-surgical pain trials). They can be taken simultaneously or alternated every 2–3 hours (e.g., paracetamol at 8am, ibuprofen at 10am) for continuous pain relief. Check that no other products you're taking contain paracetamol or NSAIDs." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Advil, Motrin (OTC and Rx); widely available 200–800mg" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Nurofen, Brufen — OTC up to 400mg; Rx up to 800mg; widely recommended" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Brufen, Combiflam (with paracetamol) — OTC and Rx" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Advil, Motrin — OTC 200mg; Rx higher doses" },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Analgesic and antipyretic effect begins" },
      { timeframe: "1–2 hours", description: "Peak effect for acute pain and fever" },
    ],
    },

    {
      name: "Tapentadol",
      slug: "tapentadol",
      abbreviation: "TAP",
      aliases: ["nucynta", "aspadol", "tapal", "tapenta", "tydol", "topcynta"],
      category: "pain",
      tagline: "Dual-mechanism opioid & NRI — moderate to severe pain",
      description: "Tapentadol has a unique dual mechanism: mu-opioid receptor agonism (like tramadol/morphine) combined with noradrenaline reuptake inhibition (like SNRIs). Provides analgesia comparable to strong opioids with a better tolerability profile (less nausea, constipation, and opioid-related adverse effects).",
      color: "#92400E",
      vial: "Oral tablet / Extended-release tablet",
      recon: "50mg, 75mg, 100mg IR; 50mg, 100mg, 150mg, 200mg, 250mg ER",
      startDose: "50mg every 4–6 hours (IR)",
      targetDose: "50–100mg every 4–6 hours (max 600mg/day)",
      frequency: "Every 4–6 hours (IR) or twice daily (ER)",
      route: "Oral",
      storage: "Room temperature; Schedule H1 controlled substance",
      benefits: "Effective for moderate to severe pain including neuropathic pain. Lower nausea/vomiting vs tramadol. Noradrenergic component enhances neuropathic pain coverage. Faster onset than ER opioids.",
      tips: "ER formulation should be taken whole — do not crush/chew. IR: onset within 30 min. Avoid with MAOIs (serotonin syndrome risk). Reduce dose in hepatic impairment.",
      sideEffects: "Nausea, dizziness, somnolence, constipation, dry mouth, headache. Less constipation than equianalgesic oxycodone.",
      watchOut: "Opioid dependence risk — use minimum effective dose for shortest duration. Serotonin syndrome risk with SSRIs/SNRIs/MAOIs. Respiratory depression at high doses. Do not crush ER tablets.",
      researchLevel: "Well Researched",
      tags: ["Pain", "Opioid", "NRI", "Neuropathic Pain", "Controlled"],
      researchIndications: [
        { category: "Pain Management", effectiveness: "Most Effective", items: [
          { title: "Moderate to Severe Pain", description: "IMMPACT trials: comparable analgesia to oxycodone with significantly lower nausea and constipation." },
          { title: "Diabetic Peripheral Neuropathy", description: "Effective for neuropathic pain component via noradrenaline reuptake inhibition." },
          { title: "Chronic Low Back Pain", description: "ER formulation effective for chronic low back pain in long-term studies (up to 15 weeks)." },
        ]},
      ],
      indianBrands: [
        { brand: "Aspadol 50" },
        { brand: "Aspadol 100" },
        { brand: "Tapal 50" },
        { brand: "Tapenta 50" },
        { brand: "Tydol 50" },
        { brand: "Topcynta 50" },
        { brand: "Tapaday 200" },
      ],
    ukBrands: [
      { brand: "Palexia IR 50mg / 75mg / 100mg", manufacturer: "Grünenthal" },
      { brand: "Palexia SR 50–250mg", manufacturer: "Grünenthal", notes: "Extended release" },
    ],
    usBrands: [
      { brand: "Nucynta 50mg / 75mg / 100mg", manufacturer: "Janssen" },
      { brand: "Nucynta ER 50–250mg", manufacturer: "Janssen", notes: "Extended release" },
    ],
    canadaBrands: [
      { brand: "Nucynta 50mg / 75mg / 100mg", manufacturer: "Janssen" },
      { brand: "Nucynta ER 50–250mg", manufacturer: "Janssen", notes: "Extended release" },
    ],
    
    overview: {
      whatIsIt: "Tapentadol is a centrally-acting analgesic with a dual mechanism: mu-opioid receptor (MOR) agonism and noradrenaline reuptake inhibition (NRI). Approved for moderate-to-severe acute and chronic pain including diabetic peripheral neuropathy. The NRI component provides analgesic benefit without requiring opioid receptor activation, allowing lower opioid activity with equivalent pain relief compared to traditional opioids.",
      keyBenefits: "Dual-mechanism reduces required opioid activity compared to pure MOR agonists (e.g., oxycodone). Lower rates of nausea/vomiting and constipation than equianalgesic oxycodone. Proven efficacy in diabetic peripheral neuropathic pain. Extended-release (ER) formulation for around-the-clock pain. Abuse-deterrent formulation available.",
      mechanismOfAction: "Acts simultaneously on mu-opioid receptors (producing analgesia, sedation, constipation) and inhibits the noradrenaline transporter (NET), increasing noradrenaline in descending pain modulation pathways (increasing inhibitory tone on pain transmission at the spinal cord dorsal horn). The NRI component acts synergistically with the opioid component, reducing the opioid dose needed.",
    },
    pharmacokinetics: { peak: "1.25h (IR); 3–6h (ER)", halfLife: "4h (IR); ~5h (ER)", cleared: "24h" },
    researchProtocols: [
      { goal: "Moderate-Severe Acute Pain (IR)", dose: "50–100mg every 4–6 hours", frequency: "Up to 5 times daily (max 700mg/day)", route: "Oral" },
      { goal: "Chronic Pain / Neuropathic Pain (ER)", dose: "50mg twice daily, titrate to 100–250mg twice daily", frequency: "Twice daily (every 12h)", route: "Oral" },
    ],
    interactions: [
      { name: "MAOIs (serotonin syndrome / noradrenergic crisis — avoid within 14 days)", status: "avoid" },
      { name: "SSRIs / SNRIs / TCAs (serotonin syndrome risk via NRI mechanism)", status: "caution" },
      { name: "CNS depressants, alcohol, benzodiazepines (additive respiratory depression)", status: "caution" },
      { name: "Other opioids (additive CNS and respiratory depression)", status: "caution" },
    ],
    sideEffectNotes: [
      "Nausea and vomiting — less than oxycodone; dose-related",
      "Constipation — less than traditional opioids; still present",
      "Somnolence and dizziness — common",
      "Respiratory depression — opioid class risk; caution in COPD",
      "Dependence and abuse potential — Schedule II (US), controlled drug",
    ],
    faq: [
      { question: "How does tapentadol differ from tramadol?", answer: "Both combine opioid and monoamine reuptake inhibition, but tramadol inhibits both noradrenaline AND serotonin reuptake (SNRI-like), while tapentadol only inhibits noradrenaline (NRI). Tramadol's serotonin component is a risk for serotonin syndrome, limits drug interactions, and is less predictable (serotonin recaptured depends on the opioid conversion). Tapentadol has less serotonin-related risk, stronger MOR activity, and more predictable pharmacokinetics. Both are less constipating than equivalent opioids." },
      { question: "Is tapentadol addictive?", answer: "Yes — tapentadol is a Schedule II controlled substance (US) / CD2 (UK) with real abuse and dependence potential. Its opioid component produces euphoria at higher doses and physical dependence with regular use. However, its dual mechanism allows equivalent pain relief with less MOR activation than pure opioids like oxycodone, which may reduce some aspects of addiction liability — though this has not been conclusively proven in clinical settings." },
      { question: "Can tapentadol treat nerve pain?", answer: "Yes — tapentadol ER is specifically approved for diabetic peripheral neuropathy (DPN) and is effective for other neuropathic pain conditions. The noradrenaline reuptake inhibition component is particularly important here — enhanced descending noradrenergic inhibition suppresses spinal cord pain transmission in neuropathic conditions. This mechanism is also used by duloxetine and pregabalin — making combination therapy less additive than combining two drugs with different NE/GABA mechanisms." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Nucynta IR and ER — Schedule II; moderate-severe acute pain, chronic MSK pain, diabetic neuropathy" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Palexia — CD2 controlled drug; moderate-severe pain" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Tydol, Tapenta — licensed; Schedule X drug" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Nucynta — Schedule I (Narcotic Control Regulations)" },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes (IR)", description: "Pain relief onset; 2–3 hours peak" },
      { timeframe: "1–3 days (ER)", description: "Steady-state blood levels established for chronic dosing" },
    ],
    },

    {
      name: "Etoricoxib",
      slug: "etoricoxib",
      abbreviation: "ETO",
      aliases: ["arcoxia", "nucoxia", "cobix", "etoricoxib 60"],
      category: "pain",
      tagline: "Selective COX-2 inhibitor — arthritis & acute gout",
      description: "Etoricoxib is a highly selective COX-2 inhibitor (coxib class). Provides anti-inflammatory and analgesic effects with significantly lower GI side effects than non-selective NSAIDs. Particularly effective for acute gout and approved for OA, RA, ankylosing spondylitis, and dysmenorrhoea.",
      color: "#92400E",
      vial: "Oral tablet",
      recon: "30mg, 60mg, 90mg, 120mg",
      startDose: "30–60mg/day",
      targetDose: "60–90mg/day (OA/RA); 120mg/day (acute gout — max 8 days)",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Once-daily dosing. Minimal GI side effects vs non-selective NSAIDs. First-line for acute gout attack (120mg/day for up to 8 days). Effective for chronic arthritis with good tolerability.",
      tips: "Use lowest effective dose. Acute gout: 120mg/day for ≤8 days is highly effective. Long-term: monitor BP (sodium retention). Not approved in USA but widely used in India, Europe, and Asia.",
      sideEffects: "Hypertension (dose-related sodium retention), oedema, dizziness, headache, dyspepsia (less than non-selective NSAIDs).",
      watchOut: "CV risk class effect — avoid in established CVD. Contraindicated in severe hypertension or uncontrolled BP. Avoid in sulfa allergy (coxib allergy cross-reactivity possible). Monitor renal function.",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "COX-2 Inhibitor", "Arthritis", "Gout"],
      researchIndications: [
        { category: "Pain & Rheumatology", effectiveness: "Most Effective", items: [
          { title: "Acute Gout", description: "120mg/day for ≤8 days: superior to indometacin in acute gout flares in RCTs." },
          { title: "Osteoarthritis", description: "Effective OA management with superior GI tolerability to non-selective NSAIDs." },
          { title: "Ankylosing Spondylitis", description: "Approved and effective for AS — reduces spinal inflammation and structural progression." },
        ]},
      ],
      indianBrands: [
        { brand: "Nucoxia 60" },
        { brand: "Nucoxia 90" },
        { brand: "Cobix 60" },
        { brand: "Celeheal 60" },
      ],
    ukBrands: [
      { brand: "Arcoxia 30mg / 60mg / 90mg / 120mg", manufacturer: "MSD" },
    ],
    usBrands: [
      { brand: "Not FDA approved", notes: "Etoricoxib is not licensed in the United States" },
    ],
    canadaBrands: [
      { brand: "Not approved", notes: "Not licensed by Health Canada" },
    ],
    
    overview: {
      whatIsIt: "Etoricoxib is a highly selective COX-2 inhibitor (coxib class), with approximately 100:1 COX-2:COX-1 selectivity. Approved for osteoarthritis, rheumatoid arthritis, ankylosing spondylitis, acute gout, and dental pain. Not approved in the USA due to CV safety concerns, but widely used in Europe, Asia, and India.",
      keyBenefits: "Highest COX-2 selectivity among available NSAIDs — minimal GI toxicity (comparable to placebo for endoscopic ulcers). Once-daily dosing (60–90mg). Effective for acute gout (comparable to colchicine/indomethacin). Effective for chronic inflammatory arthritis. No platelet inhibition (unlike naproxen/ibuprofen) — better for patients on anticoagulants.",
      mechanismOfAction: "Highly selective inhibition of COX-2, the inducible isoform expressed at inflammatory sites. Reduces PGE2 and TXA2 production at inflammatory sites with minimal inhibition of COX-1-mediated gastric mucosal prostaglandin production and platelet TXA2. The complete absence of antiplatelet effect increases thrombotic risk (unlike naproxen which has partial antiplatelet activity).",
    },
    pharmacokinetics: { peak: "1h", halfLife: "22h", cleared: "~5 days" },
    researchProtocols: [
      { goal: "Osteoarthritis", dose: "60mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Rheumatoid Arthritis / Ankylosing Spondylitis", dose: "90mg/day", frequency: "Once daily", route: "Oral" },
      { goal: "Acute Gout (maximum 8 days)", dose: "120mg/day", frequency: "Once daily (short course only)", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (additive bleeding risk — monitor INR)", status: "monitor" },
      { name: "ACE inhibitors / ARBs (reduced antihypertensive effect, AKI risk)", status: "caution" },
      { name: "Lithium (reduced renal clearance)", status: "caution" },
    ],
    sideEffectNotes: [
      "Cardiovascular risk — class effect of COX-2 inhibitors; associated with increased MI/stroke vs placebo and naproxen; avoid in established CV disease",
      "Hypertension — increases blood pressure; monitor BP",
      "Oedema — peripheral fluid retention",
      "GI — very low GI ulcer risk (major advantage); avoid in active GI disease anyway",
    ],
    faq: [
      { question: "Why is etoricoxib not approved in the USA?", answer: "The FDA did not approve etoricoxib based on cardiovascular safety concerns raised in the MEDAL programme and concerns about the adequacy of the cardiovascular outcomes data compared to naproxen. The EMA and MHRA have approved it, accepting the overall benefit-risk profile with appropriate contraindications (avoiding in CV disease). This regulatory divergence reflects different thresholds for acceptable CV risk." },
      { question: "Is etoricoxib better than colchicine for acute gout?", answer: "Head-to-head trials (EDGE studies) show etoricoxib 120mg is equally effective as indomethacin for acute gout and superior to colchicine in some measures of pain relief and tolerability (less GI side effects than colchicine). Etoricoxib is preferred when colchicine causes GI intolerance and in patients without cardiovascular contraindications. Use for maximum 8 days for acute gout." },
      { question: "Can I take etoricoxib if I am on a blood thinner?", answer: "Etoricoxib does not inhibit platelet aggregation (unlike naproxen or ibuprofen), so it does not directly increase bleeding risk via platelet inhibition. However, all NSAIDs can impair haemostasis indirectly via prostaglandin mechanisms. If you are on warfarin, monitor INR more closely when starting or stopping etoricoxib. If on direct oral anticoagulants (rivaroxaban, apixaban), additive bleeding risk exists; use the lowest effective dose of etoricoxib for the shortest time." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Arcoxia — OA, RA, ankylosing spondylitis, gout, acute dental pain" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Nucoxia, Etova, Coxitor — widely prescribed for arthritis and gout" },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Rejected by FDA; not available in the United States" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not approved in Canada" },
    ],
    expectTimeline: [
      { timeframe: "30–60 minutes", description: "Analgesic onset for acute pain and gout" },
      { timeframe: "1–2 weeks", description: "Full anti-inflammatory benefit for chronic arthritis" },
    ],
    },

    {
      name: "Baclofen",
      slug: "baclofen",
      abbreviation: "BAC",
      aliases: ["lioresal", "liofen", "baclosign", "baclof"],
      category: "pain",
      tagline: "GABA-B agonist — muscle spasm, spasticity & alcohol craving",
      description: "Baclofen is a GABA-B receptor agonist that inhibits monosynaptic and polysynaptic spinal reflexes, reducing muscle spasticity and spasm. Used for spasticity in multiple sclerosis, spinal cord injury, and cerebral palsy. Off-label: alcohol use disorder (high-dose baclofen reduces craving).",
      color: "#92400E",
      vial: "Oral tablet",
      recon: "10mg, 25mg",
      startDose: "5mg three times daily",
      targetDose: "40–80mg/day in divided doses",
      frequency: "Three to four times daily",
      route: "Oral (or intrathecal pump for severe spasticity)",
      storage: "Room temperature",
      benefits: "Effective for spasticity in MS and SCI. Reduces painful muscle spasms. Off-label alcohol use disorder treatment (high-dose 60–300mg/day). Does not cause muscle weakness at standard doses.",
      tips: "Titrate slowly (increase by 5mg every 3 days). Do not stop abruptly — severe withdrawal (seizures, hallucinations). Elderly: start at 5mg twice daily.",
      sideEffects: "Sedation, dizziness, weakness, nausea, confusion (especially in elderly), dry mouth. Withdrawal symptoms on abrupt cessation.",
      watchOut: "Abrupt withdrawal can cause life-threatening syndrome (hallucinations, seizures, hyperthermia). Avoid in epilepsy (lowers seizure threshold). Caution in renal impairment (renally excreted).",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "Muscle Relaxant", "Spasticity", "GABA-B", "Alcohol Craving"],
      researchIndications: [
        { category: "Musculoskeletal / Neurological", effectiveness: "Most Effective", items: [
          { title: "Spasticity (MS/SCI)", description: "Standard of care for spasticity in multiple sclerosis and spinal cord injury. Reduces tone and spasms." },
          { title: "Alcohol Use Disorder (Off-label)", description: "High-dose baclofen (60–300mg/day) reduces alcohol craving in AUD — multiple European trials." },
          { title: "Trigeminal Neuralgia (Adjunct)", description: "Adjunct to carbamazepine for refractory trigeminal neuralgia." },
        ]},
      ],
      indianBrands: [
        { brand: "Baclosign 10" },
        { brand: "Liofen 10" },
        { brand: "Baclof 10" },
      ],
    ukBrands: [
      { brand: "Lioresal 10mg / 25mg", manufacturer: "Novartis" },
      { brand: "Baclofen (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Lioresal 10mg / 20mg", manufacturer: "Novartis" },
      { brand: "Gablofen 0.05–2mg/ml (intrathecal)", manufacturer: "Piramal" },
      { brand: "Ozobax 1mg/ml oral solution", notes: "Generic brand" },
    ],
    canadaBrands: [
      { brand: "Lioresal 10mg / 25mg", manufacturer: "Novartis" },
      { brand: "Baclofen (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Baclofen is a GABA-B receptor agonist used as a centrally-acting muscle relaxant and antispastic agent. Approved for spasticity of spinal cord injury, multiple sclerosis, and other neurological conditions. Investigated and used off-label for alcohol use disorder. Intrathecal baclofen (via pump) is used for severe spasticity.",
      keyBenefits: "Reduces spasticity, clonus, and painful muscle spasms in MS, SCI, and cerebral palsy. Intrathecal pump delivery achieves very high efficacy with minimal CNS side effects for severe spasticity. Used off-label in alcohol use disorder — reduces alcohol craving and consumption in some patients (more evidence in France where it is licensed).",
      mechanismOfAction: "Acts as an agonist at GABA-B receptors, which are G-protein-coupled inhibitory receptors. Pre-synaptic GABA-B activation reduces glutamate and substance P release from afferent terminals in the spinal cord, reducing excitatory drive to motor neurons and decreasing spasticity. Post-synaptic GABA-B activation hyperpolarises neurons, reducing their firing. In the brain, GABA-B activation in reward circuits may reduce dopamine release, explaining the alcohol use disorder application.",
    },
    pharmacokinetics: { peak: "2h", halfLife: "3.5–4h", cleared: "~24h" },
    researchProtocols: [
      { goal: "Spasticity (initiation)", dose: "5mg three times daily", frequency: "Three times daily; increase by 5mg every 3 days", route: "Oral" },
      { goal: "Spasticity (maintenance)", dose: "30–60mg/day", frequency: "Three to four times daily", route: "Oral" },
      { goal: "Alcohol Use Disorder (off-label, French protocol)", dose: "30–80mg/day (titrated to individual response)", frequency: "Three times daily", route: "Oral" },
    ],
    interactions: [
      { name: "CNS depressants, alcohol, opioids (additive sedation and respiratory depression)", status: "caution" },
      { name: "Antihypertensives (additive blood pressure lowering)", status: "caution" },
      { name: "Tricyclic antidepressants (increased baclofen-related muscle hypotonia)", status: "caution" },
    ],
    sideEffectNotes: [
      "Sedation and drowsiness — most common; dose-dependent; take cautiously with CNS depressants",
      "Confusion and cognitive impairment — especially in elderly; start low and titrate slowly",
      "Nausea — take with food",
      "Muscle weakness — excessive at high doses",
      "NEVER stop abruptly — withdrawal seizures, hallucinations, rhabdomyolysis; always taper over weeks",
    ],
    faq: [
      { question: "Why is baclofen withdrawal so dangerous?", answer: "Abrupt cessation of baclofen causes severe withdrawal — hyperthermia, seizures, hallucinations, rhabdomyolysis, multi-organ failure, and death have been reported. This is because chronic baclofen use downregulates GABA-B receptors; sudden removal produces a hyperexcitatory state. Always taper baclofen slowly (reduce by 5–10mg per week) and never stop suddenly. Intrathecal pump failure is a medical emergency requiring urgent replacement or oral baclofen bridging." },
      { question: "Can baclofen treat alcohol dependence?", answer: "Baclofen shows promise for alcohol use disorder, particularly at higher doses (up to 80–300mg/day in some protocols). In France, baclofen is licensed for this indication at variable doses. The evidence is mixed in UK/US trials — high-dose protocols show benefit in some patients, particularly those with severe dependence. The mechanism involves GABA-B suppression of alcohol reward in the mesolimbic system. Use requires specialist supervision due to risk of oversedation at high doses." },
      { question: "How does intrathecal baclofen differ from oral baclofen?", answer: "Oral baclofen must cross the blood-brain barrier at high plasma concentrations to reach effective spinal cord levels — producing significant CNS side effects (sedation, confusion). Intrathecal delivery (via an implanted pump directly into the cerebrospinal fluid) achieves very high spinal concentrations at 1/100th the systemic dose, dramatically improving efficacy for severe spasticity with far fewer CNS side effects. Intrathecal baclofen is reserved for severe spasticity (MS, SCI, cerebral palsy) unresponsive to oral therapy." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Lioresal — spasticity (MS, SCI); intrathecal formulation also approved" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Lioresal — spasticity; intrathecal licensed for severe spasticity" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Lioresal, Baclopar — licensed for spasticity" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Lioresal — licensed for spasticity" },
    ],
    expectTimeline: [
      { timeframe: "1–2 hours", description: "Onset of muscle relaxant effect per dose" },
      { timeframe: "2–4 weeks", description: "Optimal antispastic dose established with gradual titration" },
    ],
    },

    // ─── ALLERGY & RESPIRATORY ────────────────────────────────────────────────

    {
      name: "Fexofenadine",
      slug: "fexofenadine",
      abbreviation: "FEX",
      aliases: ["allegra", "fexogra", "reactine-f", "telfast"],
      category: "allergy-respiratory",
      tagline: "Non-sedating antihistamine — allergic rhinitis & urticaria",
      description: "Fexofenadine is the active metabolite of terfenadine. Selective peripheral H1 receptor antagonist. Does not cross the blood-brain barrier — essentially non-sedating. No cardiac QTc prolongation (unlike terfenadine). Effective for allergic rhinitis, chronic idiopathic urticaria, and hay fever.",
      color: "#0E7490",
      vial: "Oral tablet",
      recon: "60mg, 120mg, 180mg",
      startDose: "120mg once daily (rhinitis); 180mg once daily (urticaria)",
      targetDose: "120–180mg/day",
      frequency: "Once or twice daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Non-sedating — safe for driving and operating machinery. No cardiac side effects. Long duration of action (24 hours with 180mg). Effective seasonal and perennial allergic rhinitis.",
      tips: "Take with water, not fruit juice (grapefruit/orange/apple juice reduces bioavailability by ~40%). Antacids reduce absorption — take 2 hours before or after antacid. 180mg dose effective for 24 hours.",
      sideEffects: "Headache, nausea, dizziness. Minimal sedation compared to first-generation antihistamines.",
      watchOut: "Fruit juices significantly reduce absorption — take with water only. Antacid interaction. Reduce dose in renal impairment.",
      researchLevel: "Extensively Studied",
      tags: ["Allergy", "Antihistamine", "Non-sedating", "Rhinitis"],
      researchIndications: [
        { category: "Allergy", effectiveness: "Most Effective", items: [
          { title: "Seasonal Allergic Rhinitis", description: "Comparable efficacy to cetirizine/loratadine without sedation. FDA-approved for seasonal AR." },
          { title: "Chronic Idiopathic Urticaria", description: "Reduces pruritus and wheal formation in CIU. 180mg effective for 24-hour control." },
        ]},
      ],
      indianBrands: [
        { brand: "Fexogra 120" },
        { brand: "Fexogra 180" },
        { brand: "Telfast 120" },
        { brand: "Allegra 120" },
      ],
    ukBrands: [
      { brand: "Telfast 120mg / 180mg", manufacturer: "Sanofi" },
      { brand: "Fexofenadine (generic)", notes: "OTC and Rx" },
    ],
    usBrands: [
      { brand: "Allegra 60mg / 120mg / 180mg", manufacturer: "Sanofi", notes: "OTC" },
      { brand: "Mucinex Allergy 180mg", notes: "OTC" },
    ],
    canadaBrands: [
      { brand: "Allegra 60mg / 120mg / 180mg", manufacturer: "Sanofi" },
    ],
    
    overview: {
      whatIsIt: "Fexofenadine is a second-generation non-sedating antihistamine (H1 receptor antagonist) and the active metabolite of terfenadine. Unlike first-generation antihistamines (diphenhydramine, chlorphenamine), it does not cross the blood-brain barrier and therefore causes minimal to no sedation. First-line for allergic rhinitis, urticaria, and seasonal allergies.",
      keyBenefits: "Non-sedating — does not impair cognitive function or driving. No anticholinergic side effects (dry mouth, constipation, urinary retention). No significant cardiac QTc prolongation. Once-daily (180mg) or twice-daily (60mg) dosing. OTC in many countries. Effective for both nasal and ocular allergy symptoms.",
      mechanismOfAction: "Selectively antagonises peripheral H1 histamine receptors, blocking histamine-mediated vasodilation, increased vascular permeability, bronchoconstriction, and neuronal sensitisation (itch, sneezing). Poor CNS penetration due to efflux by P-glycoprotein limits sedation. Does not possess anticholinergic or antidopaminergic activity.",
    },
    pharmacokinetics: { peak: "2.6h", halfLife: "14.4h", cleared: "~48h" },
    researchProtocols: [
      { goal: "Allergic Rhinitis / Urticaria (once daily)", dose: "180mg once daily", frequency: "Once daily", route: "Oral" },
      { goal: "Allergic Rhinitis / Urticaria (twice daily)", dose: "60mg twice daily", frequency: "Twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Ketoconazole / erythromycin (increase fexofenadine levels but no clinical toxicity)", status: "monitor" },
      { name: "Antacids (aluminium/magnesium hydroxide — reduce fexofenadine absorption by 40%; separate by 2h)", status: "timing" },
      { name: "Grapefruit, apple, orange juice (reduce absorption significantly — take with water)", status: "caution" },
    ],
    sideEffectNotes: [
      "Headache — most common (10–11%)",
      "Drowsiness — minimal; <10% at therapeutic doses; does not impair driving in controlled studies",
      "GI discomfort — nausea, dyspepsia, occasional diarrhoea",
      "No QTc prolongation at standard doses",
    ],
    faq: [
      { question: "Can I drive after taking fexofenadine?", answer: "Yes — fexofenadine is one of the least sedating antihistamines available. Controlled driving simulator studies show it does not impair reaction time, lane tracking, or cognitive performance at standard doses (60–180mg). This distinguishes it sharply from first-generation antihistamines like diphenhydramine and chlorphenamine, which substantially impair driving. However, if you feel any drowsiness on fexofenadine, do not drive." },
      { question: "Should fexofenadine be taken with or without food?", answer: "Take fexofenadine with water — not with fruit juice. Grapefruit juice, apple juice, and orange juice significantly reduce fexofenadine bioavailability by up to 36% via inhibition of organic anion-transporting polypeptides (OATPs) in the intestinal wall. This reduces the drug's effectiveness. Food has minimal effect, but drink plain water with the tablet for consistent absorption." },
      { question: "How does fexofenadine compare to cetirizine and loratadine?", answer: "All three are second-generation non-sedating antihistamines with similar efficacy. Cetirizine (Zyrtec) and loratadine (Claritin) can cause mild sedation in a minority. Fexofenadine has the best drowsiness profile. Cetirizine is often considered most effective for itch (urticaria). Loratadine is available OTC in the most countries. Fexofenadine is generally the safest choice for occupational settings requiring maximum alertness." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Allegra — OTC 60mg and 180mg; seasonal allergic rhinitis and urticaria" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Telfast — Rx and OTC; licensed for allergic rhinitis and urticaria" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Allegra, Histafree, Fexo — widely available OTC and Rx" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Allegra — OTC and Rx; licensed for seasonal allergic rhinitis and urticaria" },
    ],
    expectTimeline: [
      { timeframe: "1–3 hours", description: "Symptom relief begins (rhinitis, urticaria)" },
      { timeframe: "24 hours", description: "Once-daily 180mg dose maintains coverage" },
    ],
    },

    {
      name: "Levocetirizine",
      slug: "levocetirizine",
      abbreviation: "LCET",
      aliases: ["xyzal", "okacet", "cetcip", "alerid-levo"],
      category: "allergy-respiratory",
      tagline: "Non-sedating antihistamine — allergic rhinitis & urticaria",
      description: "Levocetirizine is the pharmacologically active R-enantiomer of cetirizine. High affinity for H1 receptors with a better side-effect profile than cetirizine (less sedating at equivalent antihistaminic doses). Once-daily evening dosing effective for 24 hours.",
      color: "#0E7490",
      vial: "Oral tablet / syrup",
      recon: "5mg tablet; 2.5mg/5mL syrup",
      startDose: "5mg/day",
      targetDose: "5mg/day (evening)",
      frequency: "Once daily (evening)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Highly potent H1 antihistamine. Evening dosing reduces any mild sedation to overnight. Effective for rhinitis, urticaria, and eczema pruritus. Syrup available for children.",
      tips: "Evening dosing exploits mild sedation for better sleep in allergic patients. Reduce dose to 2.5mg in renal impairment. Avoid alcohol (potentiates sedation).",
      sideEffects: "Somnolence (less than cetirizine), headache, dry mouth, fatigue.",
      watchOut: "Dose reduction required in renal impairment. Minimal anticholinergic effects. Avoid in end-stage renal failure.",
      researchLevel: "Extensively Studied",
      tags: ["Allergy", "Antihistamine", "Rhinitis", "Urticaria"],
      researchIndications: [
        { category: "Allergy", effectiveness: "Most Effective", items: [
          { title: "Allergic Rhinitis", description: "Effective first-line treatment for seasonal and perennial AR with once-daily dosing." },
          { title: "Chronic Urticaria", description: "Reduces wheal and flare response; effective for chronic spontaneous urticaria." },
        ]},
      ],
      indianBrands: [
        { brand: "Okacet 5" },
        { brand: "Cetcip 5" },
        { brand: "Alerid-L 5" },
      ],
    ukBrands: [
      { brand: "Xyzal 5mg", manufacturer: "UCB / Sanofi" },
      { brand: "Levocetirizine (generic)", notes: "Available OTC and Rx" },
    ],
    usBrands: [
      { brand: "Xyzal 5mg", manufacturer: "Chattem / Sanofi", notes: "OTC" },
      { brand: "Levocetirizine (generic)", notes: "Available OTC" },
    ],
    canadaBrands: [
      { brand: "Xyzal 5mg", notes: "Limited availability — cetirizine more commonly used" },
    ],
    
    overview: {
      whatIsIt: "Levocetirizine is the R-enantiomer of cetirizine and a highly potent second-generation H1 antihistamine. At half the dose of cetirizine (5mg vs 10mg), it provides comparable or superior efficacy with a marginally better sedation profile. Approved for allergic rhinitis and chronic idiopathic urticaria.",
      keyBenefits: "Highly potent H1 blocker — faster receptor binding onset than other second-generation antihistamines. Effective at lower dose than the racemate (5mg levocetirizine vs 10mg cetirizine). Lower sedation than cetirizine in some studies. Once-daily dosing. Proven efficacy for both seasonal and perennial allergic rhinitis.",
      mechanismOfAction: "Selectively inhibits peripheral H1 receptors with 2-fold higher affinity than racemic cetirizine (and zero activity of the competing S-enantiomer). Reduced CNS penetration compared to first-generation antihistamines due to P-glycoprotein-mediated efflux, limiting sedation. No anticholinergic, antidopaminergic, or antiserotinergic activity.",
    },
    pharmacokinetics: { peak: "0.9h", halfLife: "6–10h", cleared: "~48h" },
    researchProtocols: [
      { goal: "Allergic Rhinitis / Urticaria", dose: "5mg once daily (evening)", frequency: "Once daily", route: "Oral" },
      { goal: "Elderly or renal impairment", dose: "2.5mg once daily", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "CNS depressants, alcohol (additive sedation)", status: "caution" },
      { name: "Theophylline (levocetirizine slightly increases theophylline exposure)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Somnolence — 5–6% at 5mg; less than cetirizine",
      "Dry mouth — anticholinergic-sparing; minimal",
      "Headache",
      "Dose reduction required in renal impairment (reduced renal clearance)",
    ],
    faq: [
      { question: "Is levocetirizine better than cetirizine?", answer: "Levocetirizine is the active component of cetirizine — cetirizine is a 50:50 mix of R- and S-enantiomers. The R-enantiomer (levocetirizine) carries almost all the H1-blocking activity. In head-to-head trials, levocetirizine 5mg performs comparably to cetirizine 10mg with slightly less sedation. Cost is generally the deciding factor — cetirizine generics are cheaper, while levocetirizine is often more expensive. Both are effective choices." },
      { question: "When is the best time to take levocetirizine?", answer: "Levocetirizine is typically recommended in the evening because even the small risk of drowsiness is better tolerated at night, and evening dosing covers the early morning peak of histamine release (which exacerbates morning nasal symptoms in allergic rhinitis). However, it can be taken at any time of day. If no sedation occurs, morning dosing is equally valid." },
      { question: "Is levocetirizine safe for children?", answer: "Yes — levocetirizine is approved for children from 2 years of age in many countries (liquid formulation). The dose for children 2–5 years is 1.25mg once daily; 6–11 years is 2.5mg once daily. It is generally well-tolerated in paediatric populations with minimal sedation." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Xyzal — OTC 5mg; allergic rhinitis and urticaria" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Xyzal — Rx and OTC" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Levocet, Xyzal, Vozet — widely available OTC and Rx" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Xyzal — licensed OTC and Rx" },
    ],
    expectTimeline: [
      { timeframe: "1 hour", description: "Antihistamine effect onset" },
      { timeframe: "24 hours", description: "Once-daily dose covers full day" },
    ],
    },

    {
      name: "Montelukast",
      slug: "montelukast",
      abbreviation: "MONT",
      aliases: ["singulair", "montair", "montel", "montaz"],
      category: "allergy-respiratory",
      tagline: "Leukotriene receptor antagonist — asthma & allergic rhinitis",
      description: "Montelukast selectively blocks cysteinyl leukotriene receptors (CysLT1), preventing leukotriene-mediated bronchoconstriction, mucus secretion, and eosinophilic inflammation. Used as add-on or alternative therapy for mild persistent asthma and as add-on for allergic rhinitis.",
      color: "#0E7490",
      vial: "Oral tablet / chewable tablet / granules",
      recon: "4mg (paeds granules/chewable); 5mg chewable; 10mg tablet",
      startDose: "10mg/day (adults)",
      targetDose: "10mg/day",
      frequency: "Once daily (evening)",
      route: "Oral",
      storage: "Room temperature, protect from moisture",
      benefits: "Non-bronchodilator asthma control. Reduces asthma exacerbations. Dual benefit for co-existing allergic rhinitis. Paediatric formulations. Exercise-induced bronchoconstriction prevention.",
      tips: "Evening dosing recommended. Not for acute bronchospasm. FDA neuropsychiatric warning (2020): mood changes, depression, suicidal ideation — monitor. Safe long-term in most patients.",
      sideEffects: "Headache, abdominal pain. Neuropsychiatric effects (mood changes, nightmares, anxiety — FDA black box warning since 2020).",
      watchOut: "FDA black box warning for neuropsychiatric events. Discuss with patients before prescribing. Discontinue if psychiatric symptoms emerge.",
      researchLevel: "Extensively Studied",
      tags: ["Allergy", "Asthma", "Leukotriene", "Rhinitis"],
      researchIndications: [
        { category: "Respiratory / Allergy", effectiveness: "Effective", items: [
          { title: "Mild Persistent Asthma", description: "Alternative to low-dose ICS in mild asthma. Reduces exacerbations and improves lung function." },
          { title: "Allergic Rhinitis", description: "Add-on to antihistamines for persistent AR. Reduces nasal congestion via leukotriene blockade." },
          { title: "Exercise-Induced Bronchoconstriction", description: "Taken 2 hours before exercise prevents EIB in susceptible patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Montair 10" },
        { brand: "Montel 10" },
        { brand: "Montaz 10" },
        { brand: "Moncrew 10" },
      ],
    ukBrands: [
      { brand: "Singulair 4mg / 5mg / 10mg", manufacturer: "Organon" },
      { brand: "Montelukast (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Singulair 4mg / 5mg / 10mg", manufacturer: "Organon / Merck" },
      { brand: "Montelukast (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Singulair 4mg / 5mg / 10mg", manufacturer: "Organon" },
      { brand: "Montelukast (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Montelukast is a leukotriene receptor antagonist (LTRA) that blocks cysteinyl leukotriene type 1 (CysLT1) receptors. Approved for allergic rhinitis, asthma prophylaxis, and exercise-induced bronchoconstriction. Often used as add-on therapy when antihistamines or inhaled corticosteroids are insufficient, or as an alternative for patients who cannot use inhaled therapy.",
      keyBenefits: "Oral once-daily tablet — avoids inhaler technique issues. Effective for both rhinitis and asthma (combination indication). Reduces eosinophilic inflammation. Useful for exercise-induced bronchoconstriction (take 2 hours before exercise). No beta-agonist overuse concerns. Approved for children ≥2 years.",
      mechanismOfAction: "Selectively blocks CysLT1 receptors on airways, nasal mucosa, and mast cells, preventing leukotriene (LTC4, LTD4, LTE4) binding. Leukotrienes are produced during IgE-mediated reactions and promote bronchoconstriction, mucus secretion, oedema, and eosinophil recruitment. Blocking their receptor reduces airway hyperresponsiveness and nasal inflammation.",
    },
    pharmacokinetics: { peak: "3–4h", halfLife: "2.7–5.5h", cleared: "~24h" },
    researchProtocols: [
      { goal: "Allergic Rhinitis / Asthma (adults)", dose: "10mg once daily (evening)", frequency: "Once daily", route: "Oral" },
      { goal: "Children 6–14 years", dose: "5mg chewable tablet once daily", frequency: "Once daily (evening)", route: "Oral" },
      { goal: "Children 2–5 years", dose: "4mg once daily (granules or chewable)", frequency: "Once daily (evening)", route: "Oral" },
    ],
    interactions: [
      { name: "CYP3A4 / CYP2C8 inducers (rifampicin — reduce montelukast levels)", status: "caution" },
      { name: "Gemfibrozil (CYP2C8 inhibitor — increases montelukast levels)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Neuropsychiatric effects — FDA black box warning: agitation, aggression, depression, suicidal ideation, sleep disturbances; monitor especially in children",
      "Headache — most common",
      "Abdominal pain — particularly in children",
      "Upper respiratory infection — common but not causally established",
    ],
    faq: [
      { question: "Why does montelukast have a mental health warning?", answer: "The FDA added a black box warning to montelukast in 2020 due to reports of serious neuropsychiatric adverse events including depression, anxiety, sleep disturbances, agitation, suicidal thoughts, and completed suicides — particularly in children. The mechanism is not fully understood. The FDA recommends avoiding montelukast in patients with mild allergic rhinitis where alternative treatments are adequate, and discussing the risks before prescribing to any patient." },
      { question: "Should montelukast be taken in the morning or evening?", answer: "Montelukast is recommended to be taken in the evening (at bedtime) for asthma because asthma symptoms are typically worse overnight and the drug's peak plasma concentration at 3–4 hours aligns with the early morning airway deterioration. For allergic rhinitis alone, timing is less critical. Take at the same time each day for consistency." },
      { question: "Is montelukast effective for eczema?", answer: "Montelukast is not approved for eczema, and evidence for this use is modest. Some studies show modest reduction in itch in atopic dermatitis (particularly in patients with concurrent allergic rhinitis or asthma), but it is not a recommended treatment for eczema. Topical corticosteroids, calcineurin inhibitors, and JAK inhibitors are the evidence-based options for eczema." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Singulair (now generic) — asthma prophylaxis, exercise-induced bronchoconstriction, allergic rhinitis (seasonal and perennial)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Singulair — asthma and allergic rhinitis; black box warning applies" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Montair, Telekast, Singulair — widely prescribed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Singulair — licensed for asthma and allergic rhinitis" },
    ],
    expectTimeline: [
      { timeframe: "Days", description: "Early improvement in nasal and pulmonary symptoms" },
      { timeframe: "2–4 weeks", description: "Full benefit for allergic rhinitis" },
      { timeframe: "Continuous", description: "Asthma prophylaxis requires daily use; not for acute attacks" },
    ],
    },

    {
      name: "Salbutamol",
      slug: "salbutamol",
      abbreviation: "SAL",
      aliases: ["albuterol", "asthalin", "salbutamol inhaler", "ventolin"],
      category: "allergy-respiratory",
      tagline: "Short-acting beta-2 agonist — acute bronchospasm & COPD",
      description: "Salbutamol (albuterol) is a selective beta-2 adrenoreceptor agonist that relaxes bronchial smooth muscle, causing rapid bronchodilation. The most widely used rescue bronchodilator for asthma and COPD. Onset within 5 minutes, duration 4–6 hours.",
      color: "#0E7490",
      vial: "Metered dose inhaler / Nebuliser solution / Oral tablet / Injection",
      recon: "100mcg/puff MDI; 2.5mg/2.5mL nebuliser solution; 2mg, 4mg tablets",
      startDose: "100–200mcg (1–2 puffs) as needed",
      targetDose: "2–4 puffs for acute relief; nebuliser 2.5–5mg",
      frequency: "As needed for acute symptoms; 4–6 hourly if regular use required",
      route: "Inhaled (MDI/nebuliser) or oral",
      storage: "Room temperature; do not freeze MDI canister",
      benefits: "Rapid, reliable bronchodilation within 5 minutes. Duration 4–6 hours. Essential rescue inhaler for asthma. Safe in pregnancy. Also used for hyperkalemia (drives K+ into cells).",
      tips: "Shake MDI before use. Use spacer for better lung deposition. Rinse mouth after inhaled doses. If needing >2 rescue doses/week, step-up maintenance therapy required (uncontrolled asthma).",
      sideEffects: "Tremor, palpitations, tachycardia, headache, hypokalaemia at high doses (nebuliser). Paradoxical bronchospasm (rare).",
      watchOut: "Excessive use = inadequate asthma control — review maintenance therapy. Hypokalaemia with high-dose nebulisation. Tachycardia risk in cardiac patients.",
      researchLevel: "Extensively Studied",
      tags: ["Respiratory", "SABA", "Asthma", "COPD", "Bronchodilator"],
      researchIndications: [
        { category: "Respiratory", effectiveness: "Most Effective", items: [
          { title: "Acute Asthma Exacerbation", description: "First-line rescue bronchodilator. Delivers rapid relief within 5 minutes via inhaled route." },
          { title: "COPD Exacerbation", description: "Short-acting bronchodilator for acute COPD symptom relief — standard of care." },
          { title: "Exercise-Induced Bronchoconstriction", description: "2 puffs 15 minutes before exercise prevents EIB in susceptible individuals." },
        ]},
      ],
      indianBrands: [
        { brand: "Asthalin 100 MCG Inhaler" },
        { brand: "Asthalin Nebulising Solution" },
        { brand: "Asthalin 4Tablet" },
      ],
    ukBrands: [
      { brand: "Ventolin 100mcg Inhaler", manufacturer: "GSK" },
      { brand: "Salamol 100mcg Inhaler", manufacturer: "Teva" },
      { brand: "Airomir 100mcg Inhaler", manufacturer: "Teva" },
    ],
    usBrands: [
      { brand: "ProAir HFA 90mcg (albuterol)", manufacturer: "Teva", notes: "Called albuterol in the US" },
      { brand: "Ventolin HFA 90mcg", manufacturer: "GSK" },
      { brand: "Proventil HFA 90mcg", manufacturer: "Merck" },
    ],
    canadaBrands: [
      { brand: "Ventolin 100mcg Inhaler", manufacturer: "GSK" },
      { brand: "Airomir 100mcg Inhaler", manufacturer: "Teva" },
    ],
    
    overview: {
      whatIsIt: "Salbutamol (albuterol in the US) is a selective short-acting beta-2 adrenergic agonist (SABA) and the most widely used bronchodilator worldwide. Inhaled salbutamol is the first-line rescue therapy for acute asthma and COPD exacerbations. Also used intravenously for severe hyperkalaemia (drives K+ into cells).",
      keyBenefits: "Rapid onset (3–5 minutes) makes it the universal rescue inhaler for acute bronchospasm. 4–6 hour duration for PRN use. Safe in pregnancy. Available as MDI, nebuliser, oral tablet, and IV formulation. Essential medicine per WHO. Intravenous and nebulised forms used in ICU for severe asthma and hyperkalaemia.",
      mechanismOfAction: "Selectively agonises beta-2 adrenergic receptors in bronchial smooth muscle, activating adenylyl cyclase via Gs protein, increasing intracellular cAMP, activating PKA, and phosphorylating myosin light chain kinase — causing smooth muscle relaxation and bronchodilation. Also reduces mast cell mediator release. Beta-1 effects are minimal at therapeutic inhaled doses.",
    },
    pharmacokinetics: { peak: "5–15 min (inhaled)", halfLife: "3.8–6h", cleared: "~12h" },
    researchProtocols: [
      { goal: "Acute Asthma / COPD (PRN rescue)", dose: "100–200 mcg (1–2 puffs MDI)", frequency: "As needed (up to 4× daily); seek help if using >3× daily", route: "Inhaled (MDI)" },
      { goal: "Acute Severe Asthma (nebulised)", dose: "2.5–5mg in 2.5–3mL normal saline", frequency: "Every 20–30 min in acute setting", route: "Nebulisation" },
      { goal: "Hyperkalaemia (IV)", dose: "10–20mg over 15 min via nebuliser or 0.5mg IV", frequency: "Single dose; repeat once if needed", route: "IV or Nebulised" },
    ],
    interactions: [
      { name: "Non-selective beta-blockers (propranolol) — block bronchodilator effect and may cause severe bronchospasm", status: "avoid" },
      { name: "Digoxin (hypokalaemia from salbutamol increases digoxin toxicity)", status: "monitor" },
      { name: "Diuretics (additive hypokalaemia risk)", status: "monitor" },
      { name: "MAOIs (cardiovascular potentiation)", status: "caution" },
    ],
    sideEffectNotes: [
      "Tremor — dose-related; most common in overdose or nebuliser use",
      "Tachycardia and palpitations — beta-2 receptor stimulation (some cardiac beta-1 stimulation at high doses)",
      "Hypokalaemia — at high nebulised or IV doses; relevant in severe asthma/hyperkalaemia treatment",
      "Worsening oxygenation in some (early ventilation-perfusion mismatch with bronchodilation) — transient",
    ],
    faq: [
      { question: "Why is salbutamol a rescue inhaler and not a regular treatment?", answer: "Salbutamol is short-acting (duration 4–6 hours) and does not address the underlying airway inflammation in asthma. Regular reliance on salbutamol indicates inadequately controlled asthma — the inflammation persists and worsens. GINA guidelines recommend daily inhaled corticosteroids (ICS) as controller therapy once rescue inhaler use exceeds 2 days per week. Salbutamol treats symptoms; ICS treats the disease." },
      { question: "What is the correct inhaler technique for salbutamol MDI?", answer: "1. Remove cap and shake. 2. Exhale fully. 3. Place mouthpiece between teeth with lips sealed. 4. Begin inhaling slowly and simultaneously press the canister. 5. Continue to inhale slowly over 3–5 seconds. 6. Hold breath for 10 seconds. 7. Exhale slowly. A spacer device greatly improves lung deposition (especially in children, elderly, and during acute attacks) — always use one if available." },
      { question: "Can salbutamol lower potassium levels?", answer: "Yes — salbutamol activates Na/K-ATPase in muscle cells, driving K+ into cells and lowering plasma potassium. This effect is exploited therapeutically in emergency management of dangerous hyperkalaemia (>6.5 mmol/L) — 10–20mg nebulised salbutamol lowers potassium by 0.5–1.0 mmol/L within 30 minutes. In asthma, high-dose nebulised salbutamol can cause clinically significant hypokalaemia, particularly when combined with IV magnesium or steroids." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Ventolin HFA, ProAir HFA, Proventil HFA (as albuterol) — acute bronchospasm rescue" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ventolin, Salamol — essential respiratory medicine; first-line rescue inhaler" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Asthalin, Ventorlin, Salbetol — widely available MDI and nebuliser" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Ventolin — licensed for acute bronchospasm relief" },
    ],
    expectTimeline: [
      { timeframe: "3–5 minutes", description: "Onset of bronchodilation after inhalation" },
      { timeframe: "15–30 minutes", description: "Peak bronchodilator effect" },
      { timeframe: "4–6 hours", description: "Duration of effect per dose" },
    ],
    },

    {
      name: "Budesonide (Inhaler)",
      slug: "budesonide",
      abbreviation: "BUD",
      aliases: ["pulmicort", "budenol", "budechem", "rhinocort"],
      category: "allergy-respiratory",
      tagline: "Inhaled corticosteroid — asthma & allergic rhinitis maintenance",
      description: "Budesonide is a synthetic glucocorticoid with high topical anti-inflammatory activity in the airways. Administered inhaled, it provides local bronchial anti-inflammatory effect with minimal systemic absorption. First-choice inhaled corticosteroid (ICS) for persistent asthma maintenance therapy.",
      color: "#0E7490",
      vial: "Dry powder inhaler / MDI / Nebuliser suspension / Nasal spray",
      recon: "100mcg, 200mcg, 400mcg/dose (inhaler); 0.5mg/2mL nebuliser",
      startDose: "200mcg twice daily (mild asthma)",
      targetDose: "400–1600mcg/day depending on severity",
      frequency: "Twice daily (inhaler)",
      route: "Inhaled",
      storage: "Room temperature; protect DPI from moisture",
      benefits: "Highly effective asthma control — reduces exacerbations by 50–60%. Approved as safe in pregnancy (Category B). Low systemic side effects at standard doses. Available as nasal spray for allergic rhinitis.",
      tips: "Rinse mouth and throat with water after each dose (prevents oral candidiasis). Use spacer with MDI for improved deposition. Takes 2–4 weeks for full anti-inflammatory effect — not a rescue inhaler.",
      sideEffects: "Oral candidiasis (rinse mouth after use), dysphonia, mild HPA suppression at high doses, bruising in elderly.",
      watchOut: "Not for acute bronchospasm — use rescue SABA. High doses (>1600mcg/day) can cause adrenal suppression. Tuberculosis activation with immunosuppressive doses.",
      researchLevel: "Extensively Studied",
      tags: ["Respiratory", "ICS", "Asthma", "Corticosteroid"],
      researchIndications: [
        { category: "Respiratory", effectiveness: "Most Effective", items: [
          { title: "Persistent Asthma (Maintenance)", description: "First-line ICS for mild to moderate persistent asthma. Reduces exacerbations, improves lung function." },
          { title: "COPD with Frequent Exacerbations", description: "ICS-containing regimens reduce COPD exacerbation frequency in eosinophilic COPD." },
          { title: "Croup (Nebulised)", description: "Nebulised budesonide (2mg single dose) effective for moderate croup in children." },
        ]},
      ],
      indianBrands: [
        { brand: "Budenol 100 MCG Inhaler" },
        { brand: "Budenol 200 MCG Inhaler" },
        { brand: "Budechem 0.5Nebuliser" },
      ],
    ukBrands: [
      { brand: "Pulmicort 100/200/400mcg Turbohaler", manufacturer: "AstraZeneca" },
      { brand: "Budelin Novolizer 200mcg", manufacturer: "Meda" },
    ],
    usBrands: [
      { brand: "Pulmicort Flexhaler 90/180mcg", manufacturer: "AstraZeneca" },
      { brand: "Pulmicort Respules 0.25/0.5/1mg (nebuliser)", manufacturer: "AstraZeneca" },
    ],
    canadaBrands: [
      { brand: "Pulmicort Turbuhaler 100/200/400mcg", manufacturer: "AstraZeneca" },
    ],
    
    overview: {
      whatIsIt: "Budesonide is a synthetic glucocorticoid with high local anti-inflammatory potency and low systemic bioavailability (due to extensive first-pass hepatic metabolism). Available as inhaled (for asthma/COPD), nasal spray (for allergic rhinitis), oral capsules (for Crohn's disease, microscopic colitis), and rectal formulations. One of the most widely used inhaled corticosteroids globally.",
      keyBenefits: "High local potency with low systemic exposure (~80% hepatic first-pass inactivation). Inhaled budesonide with spacer is the most studied ICS in childhood asthma. Once-daily dosing available in some inhaler formulations (Pulmicort Turbuhaler). Oral budesonide is the preferred corticosteroid for Crohn's disease and collagenous colitis due to minimal systemic effects. Nasal spray highly effective for allergic rhinitis.",
      mechanismOfAction: "Binds glucocorticoid receptors (GRα), translocates to the nucleus, and upregulates anti-inflammatory genes (lipocortin-1/annexin-1) while downregulating pro-inflammatory cytokines (IL-4, IL-5, IL-13, TNF-α, eotaxin). Reduces eosinophilic infiltration, mast cell activation, and mucus hypersecretion. Locally administered forms achieve high airway concentrations with minimal HPA axis suppression.",
    },
    pharmacokinetics: { peak: "20–30 min (inhaled)", halfLife: "2.8h", cleared: "~12–24h (local anti-inflammatory effect outlasts plasma t½)" },
    researchProtocols: [
      { goal: "Asthma (low dose)", dose: "200–400 mcg/day (Turbuhaler)", frequency: "Once or twice daily", route: "Inhaled" },
      { goal: "Asthma (medium/high dose)", dose: "800–1600 mcg/day", frequency: "Twice daily", route: "Inhaled" },
      { goal: "Allergic Rhinitis (nasal)", dose: "128–256 mcg/day (1–2 sprays each nostril)", frequency: "Once daily (morning)", route: "Nasal" },
      { goal: "Crohn's Disease (oral)", dose: "9mg/day for 8 weeks, then taper", frequency: "Once daily", route: "Oral (modified release)" },
    ],
    interactions: [
      { name: "CYP3A4 inhibitors (ketoconazole, ritonavir) — increase systemic budesonide exposure", status: "caution" },
      { name: "Live vaccines (systemic steroids — oral budesonide at high doses)", status: "caution" },
    ],
    sideEffectNotes: [
      "Inhaled: oral candidiasis (thrush) — use spacer, rinse mouth after each dose; prevents this",
      "Inhaled: dysphonia (hoarseness) — related to local deposition on vocal cords",
      "HPA axis suppression — minimal at standard inhaled doses; relevant at high doses or oral therapy",
      "Nasal: minor local irritation, occasional nasal bleeding",
      "Oral (Crohn's): more systemic effects than inhaled but less than prednisolone",
    ],
    faq: [
      { question: "Why must I rinse my mouth after using a budesonide inhaler?", answer: "Inhaled budesonide deposits in the throat and mouth as well as the airways. Oral corticosteroid deposition promotes Candida albicans overgrowth, causing oral thrush (white patches, soreness). Rinsing with water and spitting (not swallowing) after each inhalation reduces oral and pharyngeal deposition. Using a spacer device with MDI further reduces throat deposition. These measures prevent oral candidiasis without reducing inhaler effectiveness." },
      { question: "Is inhaled budesonide safe for long-term use in children?", answer: "Yes — inhaled budesonide is the most studied ICS in children and is recommended as first-line controller therapy for persistent asthma in children ≥5 years. Long-term studies show minimal systemic effects at standard doses. There is a well-characterised but small effect on growth velocity (approximately 1cm reduction in adult height at low-medium doses in childhood), which must be weighed against the benefits of asthma control. Regular dose review to use the minimum effective dose is recommended." },
      { question: "How does oral budesonide differ from prednisolone for Crohn's disease?", answer: "Oral budesonide (Entocort, Budenofalk) is formulated as pH-dependent release capsules targeting the terminal ileum and right colon — the commonest sites of Crohn's disease. Approximately 80–90% undergoes first-pass hepatic metabolism, so systemic steroid effects (weight gain, glucose intolerance, adrenal suppression, osteoporosis) are far less than equivalent-effect prednisolone doses. For mild-moderate ileal/right colonic Crohn's, budesonide is preferred. For severe or extra-intestinal Crohn's, prednisolone is required." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Pulmicort (inhaled), Rhinocort (nasal), Entocort (oral Crohn's), Uceris (oral colitis)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Pulmicort, Rhinocort, Entocort — across all major formulations" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Budecort, Budesal — inhaled; Budenofalk oral — licensed" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Pulmicort, Rhinocort, Entocort — licensed across formulations" },
    ],
    expectTimeline: [
      { timeframe: "Immediate", description: "Bronchodilation (not immediate — no bronchodilator effect; see salbutamol); anti-inflammatory effect begins building" },
      { timeframe: "1–2 weeks", description: "Allergic rhinitis: symptom reduction begins" },
      { timeframe: "4–8 weeks", description: "Full asthma controller benefit; maximum symptom reduction" },
    ],
    },

    {
      name: "Low Dose Naltrexone",
      slug: "low-dose-naltrexone",
      abbreviation: "LDN",
      aliases: ["ldn", "nodict", "naltima", "nalsign", "naltrexone 1.5mg", "naltrexone 4.5mg"],
      category: "allergy-respiratory",
      tagline: "Opioid antagonist — immune modulation, autoimmune & fibromyalgia",
      description: "Low dose naltrexone (LDN: 1.5–4.5mg/night) works via a different mechanism than standard naltrexone. Brief nocturnal opioid receptor blockade upregulates endorphin and enkephalin production, modulating immune function. Used off-label for autoimmune conditions, fibromyalgia, Crohn's disease, and long COVID.",
      color: "#0E7490",
      vial: "Compounded capsule (requires pharmacist compounding of standard naltrexone tablets)",
      recon: "1mg, 1.5mg, 2mg, 3mg, 4.5mg (compounded)",
      startDose: "1.5mg at bedtime",
      targetDose: "3–4.5mg at bedtime",
      frequency: "Once nightly (10 PM–midnight)",
      route: "Oral",
      storage: "Room temperature; compounded formulations may have refrigeration requirements",
      benefits: "Immunomodulatory effects without immunosuppression. Reduces pain in fibromyalgia. Reduces inflammation in Crohn's disease. Emerging evidence in MS and long COVID. Very low side effect profile.",
      tips: "Take at bedtime (nocturnal opioid blockade maximises endorphin rebound). Start at 1.5mg and increase to 4.5mg over weeks. Avoid opioid medications (antagonism renders them ineffective). Requires compounded preparation.",
      sideEffects: "Vivid dreams/nightmares (common first 2–4 weeks, usually resolve), mild insomnia initially, mild GI symptoms.",
      watchOut: "Cannot use any opioid medications while on LDN. Autoimmune patients on immunosuppressants: discuss with physician before starting. Limited large RCT data.",
      researchLevel: "Limited Research",
      tags: ["Immune Modulation", "Fibromyalgia", "Autoimmune", "LDN", "Off-Label"],
      researchIndications: [
        { category: "Immune Modulation", effectiveness: "Moderate", items: [
          { title: "Fibromyalgia", description: "Small RCTs show reduction in pain scores and fatigue in fibromyalgia patients on 4.5mg nightly." },
          { title: "Crohn's Disease", description: "Paediatric and adult pilot RCTs: 4.5mg LDN induces remission in mild to moderate Crohn's." },
          { title: "Multiple Sclerosis", description: "Observational studies suggest improved quality of life and fatigue in MS. Large RCT pending." },
        ]},
      ],
      indianBrands: [
        { brand: "Nodict 50" },
        { brand: "Naltima 50" },
        { brand: "Nalsign 50" },
      ],
    ukBrands: [
      { brand: "LDN compounded (1.5–4.5mg)", notes: "Compounded from 50mg naltrexone (ReVia/Nalorex) by specialist pharmacies" },
    ],
    usBrands: [
      { brand: "LDN compounded (1.5–4.5mg)", notes: "Compounded from ReVia 50mg (DuraMed) or generic naltrexone" },
    ],
    canadaBrands: [
      { brand: "LDN compounded (1.5–4.5mg)", notes: "Compounded from ReVia (Bristol-Myers Squibb) by compounding pharmacies" },
    ],
    
    overview: {
      whatIsIt: "Low-dose naltrexone (LDN) uses naltrexone — an opioid receptor antagonist approved at full dose (50mg) for alcohol and opioid use disorder — at much lower doses (1.5–4.5mg/day). At these doses it produces transient opioid receptor blockade followed by compensatory upregulation and endorphin/enkephalin surge, proposed to modulate the immune system and provide anti-inflammatory effects. Used off-label for autoimmune conditions, fibromyalgia, and chronic pain.",
      keyBenefits: "Emerging evidence for fibromyalgia (pain reduction ~30% vs placebo in small RCTs). Open-label evidence in Crohn's disease, multiple sclerosis fatigue, and chronic overlapping pain conditions. Very low adverse effect profile at LDN doses. Inexpensive when compounded. May provide immunomodulatory benefit in autoimmune conditions by modulating TLR4 and microglial activity.",
      mechanismOfAction: "At low doses, transient mu-opioid receptor blockade (4–6 hours) is followed by rebound upregulation of opioid receptors and increased endogenous opioid production. Additionally, naltrexone at low concentrations antagonises TLR4 (toll-like receptor 4) on microglial and macrophage cells, reducing neuroinflammatory signalling. The combination of opioid upregulation and anti-neuroinflammatory effects may explain the analgesia and immune modulation observed.",
    },
    pharmacokinetics: { peak: "1h", halfLife: "4–13h", cleared: "24h" },
    researchProtocols: [
      { goal: "Fibromyalgia / Chronic Pain (LDN)", dose: "1.5–4.5mg/day", frequency: "Once daily (bedtime)", route: "Oral (compounded)" },
      { goal: "Autoimmune / Inflammatory (LDN)", dose: "4.5mg/day", frequency: "Once daily (bedtime)", route: "Oral (compounded)" },
    ],
    interactions: [
      { name: "Opioid analgesics (LDN blocks opioid receptors — reduced analgesia; avoid concurrent use)", status: "avoid" },
      { name: "Opioid use disorder medication (buprenorphine, methadone) — precipitates acute withdrawal", status: "avoid" },
      { name: "Immunosuppressants (theoretical interactions via immune modulation)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Vivid dreams and sleep disturbances — most common at initiation; typically resolves in 2–4 weeks; take in evening if problematic",
      "Mild nausea at initiation — resolves quickly",
      "Symptom flare at initiation — transient worsening; start at lower dose (1.5mg) and titrate",
    ],
    faq: [
      { question: "Is LDN available from regular pharmacies?", answer: "Standard naltrexone is available as 50mg tablets. LDN requires compounding to produce 1.5–4.5mg doses. Compounding pharmacies can prepare LDN as capsules, liquid, or tablets. It is not a licensed preparation — it is prescribed off-label and dispensed by compounding pharmacies. Regulatory oversight varies: in the UK, MHRA allows specials manufacturing; in the US, compounding pharmacies prepare it under state pharmacy laws." },
      { question: "What conditions have the best evidence for LDN?", answer: "The strongest small-trial evidence is for fibromyalgia (2 double-blind RCTs showing ~30% pain reduction), multiple sclerosis quality of life (1 RCT), and active Crohn's disease (pilot RCTs showing mucosal healing). Case series and observational data support use in CIRS, ME/CFS, and various autoimmune conditions. The evidence remains preliminary — large RCTs are lacking for most indications. LDN should be considered adjunctive, not primary therapy." },
      { question: "Can I take LDN if I need opioid pain medication?", answer: "No — naltrexone at any dose blocks opioid receptors. Taking LDN with opioid analgesics reduces their effectiveness and can precipitate withdrawal if opioid dependence exists. If you require opioids for pain, LDN cannot be used simultaneously. There must be a washout period (7 days from short-acting, up to 10 days from long-acting opioids) before starting any dose of naltrexone." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Full-dose naltrexone (Vivitrol, ReVia) approved for AUD/OUD. LDN is off-label; compounded by state-licensed pharmacies" },
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Naltrexone approved for AUD/OUD. LDN requires a specials manufacturing licence; prescribed off-label by physicians" },
      { region: "India", agency: "CDSCO", status: "Not Approved", notes: "Full-dose naltrexone approved for dependence; LDN not separately licensed" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Full-dose naltrexone approved; LDN requires compounding under pharmacist oversight" },
    ],
    expectTimeline: [
      { timeframe: "4–6 weeks", description: "Early symptomatic response in fibromyalgia or inflammatory conditions" },
      { timeframe: "3–6 months", description: "Full assessment of benefit — discontinue if no response by 3 months" },
    ],
    },

    // ─── GASTRO & LIVER ───────────────────────────────────────────────────────

    {
      name: "Esomeprazole",
      slug: "esomeprazole",
      abbreviation: "ESO",
      aliases: ["nexium", "esomi", "neksium", "esoheal"],
      category: "gastro",
      tagline: "PPI — GERD, peptic ulcer & H. pylori eradication",
      description: "Esomeprazole is the S-enantiomer of omeprazole — the most bioavailable PPI. Irreversibly inhibits the H+/K+-ATPase proton pump in gastric parietal cells, providing the most sustained acid suppression of all PPIs. First-line for GERD, Barrett's oesophagus, and H. pylori eradication triple therapy.",
      color: "#065F46",
      vial: "Oral capsule / IV injection",
      recon: "20mg, 40mg capsules",
      startDose: "20mg/day",
      targetDose: "40mg/day",
      frequency: "Once daily (30–60 min before breakfast)",
      route: "Oral or IV",
      storage: "Room temperature, dry place",
      benefits: "Most potent and sustained acid suppression among PPIs. Superior GERD healing rates vs omeprazole. IV form available for acute upper GI bleeding. Available OTC in many countries.",
      tips: "Take 30–60 minutes before meals for optimal efficacy. Do not crush or chew enteric-coated capsules — can open and sprinkle on soft food. IV dosing for inpatient ulcer management.",
      sideEffects: "Headache, nausea, diarrhoea. Long-term: hypomagnesaemia, reduced calcium absorption, increased C. difficile risk, possible B12 deficiency.",
      watchOut: "Long-term use (>1 year): hypomagnesaemia, fracture risk (osteoporosis), C. difficile. Reduces clopidogrel efficacy (CYP2C19 interaction) — use pantoprazole with clopidogrel instead.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "PPI", "GERD", "Acid Reflux", "H. pylori"],
      researchIndications: [
        { category: "Gastrointestinal", effectiveness: "Most Effective", items: [
          { title: "GERD / Oesophagitis", description: "Superior healing of erosive oesophagitis vs other PPIs at 4–8 weeks. First-line maintenance therapy." },
          { title: "H. pylori Eradication", description: "Component of triple/quadruple therapy for H. pylori eradication — acid suppression enhances antibiotic efficacy." },
          { title: "NSAID-Induced Gastropathy Prevention", description: "Esomeprazole 20mg/day prevents NSAID-related gastric ulcers in high-risk patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Esomi 20" },
        { brand: "Esomi 40" },
        { brand: "Neksium 40" },
        { brand: "Esoheal 40" },
      ],
    ukBrands: [
      { brand: "Nexium 20mg / 40mg", manufacturer: "AstraZeneca" },
      { brand: "Esomeprazole (generic)", notes: "Available OTC and Rx" },
    ],
    usBrands: [
      { brand: "Nexium 20mg / 40mg", manufacturer: "AstraZeneca" },
      { brand: "Nexium 24HR 20mg", manufacturer: "AstraZeneca", notes: "OTC" },
    ],
    canadaBrands: [
      { brand: "Nexium 20mg / 40mg", manufacturer: "AstraZeneca" },
    ],
    
    overview: {
      whatIsIt: "Esomeprazole is the S-enantiomer of omeprazole and a proton pump inhibitor (PPI) that irreversibly blocks the H+/K+-ATPase proton pump on the parietal cell, suppressing gastric acid production. First PPI approved with a dedicated once-daily IV formulation for GI bleeding. The most widely prescribed PPI by prescription volume in many countries.",
      keyBenefits: "More consistent acid suppression than omeprazole due to slower cytochrome P450 metabolism. Once-daily dosing before breakfast achieves 24-hour coverage. Heals erosive oesophagitis in 90%+ patients at 8 weeks. Reduces GI bleed risk with NSAIDs. IV formulation for hospitalised patients. Approved for H. pylori eradication as part of triple therapy.",
      mechanismOfAction: "Esomeprazole is a prodrug — absorbed and transported to parietal cell canaliculi where it is converted by acid to sulfenamide, which covalently binds (and irreversibly inhibits) cysteine residues on the H+/K+-ATPase (proton pump). New acid secretion requires synthesis of new pump molecules (24–48 hours). Inhibits basal and stimulated acid secretion regardless of stimulus (gastrin, histamine, acetylcholine).",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "1–1.5h (systemic, but gastric acid suppression lasts 24h)", cleared: "~24h (gastric effect)" },
    researchProtocols: [
      { goal: "GORD / Heartburn / Erosive Oesophagitis", dose: "20–40mg once daily", frequency: "Once daily (30–60 min before breakfast)", route: "Oral" },
      { goal: "H. pylori Eradication (triple therapy)", dose: "20mg twice daily + antibiotics × 7–14 days", frequency: "Twice daily", route: "Oral" },
      { goal: "NSAID Gastroprotection", dose: "20mg once daily", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Clopidogrel (PPIs reduce antiplatelet activation via CYP2C19 inhibition — esomeprazole most potent inhibitor; use pantoprazole instead)", status: "caution" },
      { name: "Methotrexate (PPIs reduce MTX renal excretion — toxicity risk at high doses)", status: "caution" },
      { name: "Ketoconazole, itraconazole (require gastric acid for absorption — reduced efficacy)", status: "caution" },
    ],
    sideEffectNotes: [
      "Generally very well tolerated — most common are headache and GI effects (nausea, diarrhoea)",
      "Hypomagnesaemia — with prolonged use (>1 year); check magnesium in long-term users",
      "Increased fracture risk — modest increase in hip/spine fractures with long-term high-dose use",
      "C. difficile colitis — reduced gastric acidity allows more C. difficile spore survival",
      "Vitamin B12 deficiency — long-term use reduces ileal B12 absorption",
    ],
    faq: [
      { question: "When is the best time to take esomeprazole?", answer: "Take esomeprazole 30–60 minutes before the first meal of the day (breakfast). PPIs are prodrugs activated by gastric acid in the parietal cell canaliculi — maximum conversion requires active pumps, which are maximally expressed when stimulated by the first meal. Taking a PPI on an empty stomach at other times (e.g., bedtime) significantly reduces its efficacy. If twice-daily dosing is prescribed, take 30 minutes before breakfast AND dinner." },
      { question: "Should I take a PPI long-term?", answer: "PPIs should be used at the lowest effective dose for the shortest necessary duration. They are appropriate long-term for Barrett's oesophagus, severe reflux disease, or as NSAID gastroprotection in high-risk patients. For uncomplicated heartburn or GORD, a step-down strategy (treat, then trial of stopping or dose reduction) is recommended. Annual review is advised. Do not stop PPIs abruptly for prolonged use — rebound acid hypersecretion for 2–4 weeks occurs." },
      { question: "Why is esomeprazole worse for clopidogrel than pantoprazole?", answer: "Esomeprazole and omeprazole potently inhibit CYP2C19 — the enzyme that converts clopidogrel to its active platelet-inhibiting metabolite. By inhibiting this enzyme, these PPIs reduce clopidogrel's antiplatelet efficacy by up to 47%, potentially increasing cardiovascular event risk in patients on dual antiplatelet therapy. Pantoprazole has minimal CYP2C19 inhibition and is the preferred PPI when clopidogrel must be co-prescribed." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Nexium — GORD, H. pylori eradication, Zollinger-Ellison syndrome; OTC 20mg" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Nexium — widely prescribed; OTC (Nexium Control 20mg) available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Nexium, Nexpro, Esomac — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Nexium — licensed for GORD and related conditions; OTC available" },
    ],
    expectTimeline: [
      { timeframe: "2–5 days", description: "Near-maximal acid suppression established at steady state" },
      { timeframe: "4–8 weeks", description: "Healing of erosive oesophagitis and symptom resolution" },
    ],
    },

    {
      name: "Omeprazole",
      slug: "omeprazole",
      abbreviation: "OMP",
      aliases: ["prilosec", "omeeforce", "lomac", "omez"],
      category: "gastro",
      tagline: "PPI — acid suppression, GERD & peptic ulcer",
      description: "Omeprazole was the first PPI approved (1989) and remains the most commonly used. Irreversible H+/K+-ATPase inhibitor. Widely available OTC and generic. Used for GERD, peptic ulcer disease, H. pylori eradication, and Zollinger-Ellison syndrome.",
      color: "#065F46",
      vial: "Oral capsule / tablet",
      recon: "10mg, 20mg, 40mg",
      startDose: "20mg/day",
      targetDose: "20–40mg/day",
      frequency: "Once daily (before breakfast)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Highly effective acid suppression. Widely available, affordable, and generic. OTC availability in most countries. Well-established long-term safety profile.",
      tips: "Take before breakfast for maximum efficacy. Same long-term cautions as all PPIs. CYP2C19 interaction with clopidogrel — consider alternative PPI.",
      sideEffects: "Headache, nausea, diarrhoea, abdominal pain. Long-term: same class concerns as esomeprazole.",
      watchOut: "Same interactions as esomeprazole. CYP2C19 interaction reduces clopidogrel efficacy. Long-term risk of hypomagnesaemia, fractures, and B12 deficiency.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "PPI", "GERD", "Peptic Ulcer"],
      researchIndications: [
        { category: "Gastrointestinal", effectiveness: "Most Effective", items: [
          { title: "GERD", description: "Standard treatment for gastro-oesophageal reflux disease. Symptom relief in 80–90% at 4 weeks." },
          { title: "Peptic Ulcer Disease", description: "Accelerates healing of gastric and duodenal ulcers. 4-week course heals >90% of duodenal ulcers." },
          { title: "H. pylori (Triple Therapy)", description: "PPI component of triple therapy — amoxicillin + clarithromycin + PPI for H. pylori eradication." },
        ]},
      ],
      indianBrands: [
        { brand: "Omeeforce 20" },
        { brand: "Omeeforce 40" },
        { brand: "Lomac 20" },
      ],
    ukBrands: [
      { brand: "Losec 10mg / 20mg / 40mg", manufacturer: "AstraZeneca" },
      { brand: "Omeprazole (generic)", notes: "Widely available OTC and Rx" },
    ],
    usBrands: [
      { brand: "Prilosec 10mg / 20mg / 40mg", manufacturer: "AstraZeneca" },
      { brand: "Prilosec OTC 20mg", notes: "OTC" },
      { brand: "Zegerid 20mg / 40mg", manufacturer: "Salix", notes: "With sodium bicarbonate" },
    ],
    canadaBrands: [
      { brand: "Losec 10mg / 20mg", manufacturer: "AstraZeneca" },
      { brand: "Omeprazole (generic)", notes: "Widely available" },
    ],
    
    overview: {
      whatIsIt: "Omeprazole was the first proton pump inhibitor (PPI) approved and has been the most widely prescribed PPI globally for decades. A racemate of R- and S-enantiomers (esomeprazole is the S-enantiomer). Approved for GORD, peptic ulcer disease, H. pylori eradication, and Zollinger-Ellison syndrome. Now widely available OTC.",
      keyBenefits: "Proven efficacy in healing peptic ulcers and reflux oesophagitis. First-line component of H. pylori triple therapy. Reduces GI bleeding in NSAID users. Available OTC in most countries. Very low cost as generic. Strong safety record over 35+ years of use.",
      mechanismOfAction: "Prodrug converted to active sulfenamide in parietal cell acid-secreting canaliculi. Irreversibly inhibits H+/K+-ATPase proton pump — new acid secretion requires new pump protein synthesis. Complete inhibition of all acid secretion pathways (histamine, gastrin, acetylcholine-mediated). More variable acid suppression than esomeprazole due to CYP2C19 polymorphism affecting metabolism.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "0.5–1h", cleared: "~24h (gastric effect persists)" },
    researchProtocols: [
      { goal: "GORD / Peptic Ulcer (standard)", dose: "20mg once daily", frequency: "Once daily (30–60 min before breakfast)", route: "Oral" },
      { goal: "H. pylori Eradication", dose: "20–40mg twice daily + amoxicillin + clarithromycin × 7–14 days", frequency: "Twice daily", route: "Oral" },
      { goal: "Zollinger-Ellison Syndrome", dose: "60mg/day (titrate upward)", frequency: "Once or twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Clopidogrel (CYP2C19 inhibition — use pantoprazole instead)", status: "caution" },
      { name: "Ketoconazole, itraconazole (require acid for absorption)", status: "caution" },
      { name: "Methotrexate at high doses (reduced renal clearance)", status: "caution" },
    ],
    sideEffectNotes: [
      "Well tolerated short-term — headache, diarrhoea, nausea most common",
      "Long-term: hypomagnesaemia, B12 deficiency, osteoporosis risk, C. difficile",
      "Rebound acid hypersecretion on stopping — taper after prolonged use",
    ],
    faq: [
      { question: "Can I take omeprazole as needed for heartburn?", answer: "PPIs including omeprazole work better as daily scheduled doses rather than on-demand, because they require 3–5 days to achieve maximum acid suppression at steady state. For occasional heartburn, antacids (calcium carbonate, gaviscon) or H2 blockers (famotidine) provide faster relief. OTC omeprazole (20mg) is labelled for a 14-day course for frequent heartburn — not for sporadic episodes." },
      { question: "Is it safe to take omeprazole every day?", answer: "Short-term use (weeks to months) for appropriate indications is safe and well-established. Long-term use (years) requires justification — appropriate for Barrett's oesophagus, severe GORD, and documented peptic ulcer disease. Annual review is recommended. Risks of prolonged use include magnesium depletion, B12 deficiency, modest fracture risk, and C. difficile susceptibility. Always use the minimum effective dose." },
      { question: "Does omeprazole interact with my heart medication?", answer: "Omeprazole interacts with clopidogrel (an antiplatelet medication commonly used after heart attack or stents). It inhibits CYP2C19, which activates clopidogrel — reducing its antiplatelet protection by up to 47%. If you are on clopidogrel and need a PPI for stomach protection, pantoprazole or rabeprazole are preferred as they have minimal CYP2C19 inhibition. Discuss this interaction with your cardiologist or GP." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Prilosec — OTC 20mg for heartburn; Rx for GORD, ulcers, H. pylori, ZES" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Losec, Omeprazole (generic) — widely prescribed; OTC Losec available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Omez, Ocid, Prilosec — most commonly prescribed PPI in India" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Losec — Rx and OTC versions available" },
    ],
    expectTimeline: [
      { timeframe: "2–5 days", description: "Near-maximal acid suppression established" },
      { timeframe: "4–8 weeks", description: "Ulcer healing and oesophagitis resolution" },
    ],
    },

    {
      name: "Famotidine",
      slug: "famotidine",
      abbreviation: "FAM",
      aliases: ["pepcid", "famocid", "famcimac"],
      category: "gastro",
      tagline: "H2 blocker — gastric acid reduction & GERD",
      description: "Famotidine is the most potent H2 (histamine-2) receptor antagonist. Reduces basal and stimulated gastric acid secretion by blocking parietal cell H2 receptors. Faster onset than PPIs for acute acid relief. Also gained attention during COVID-19 pandemic for potential antiviral properties.",
      color: "#065F46",
      vial: "Oral tablet / IV injection",
      recon: "10mg, 20mg, 40mg tablets",
      startDose: "20mg twice daily",
      targetDose: "40mg twice daily (peptic ulcer); 20mg twice daily (GERD)",
      frequency: "Twice daily",
      route: "Oral or IV",
      storage: "Room temperature",
      benefits: "Faster onset than PPIs for on-demand acid relief. Effective for GERD, peptic ulcer, and heartburn. Safe in pregnancy and renal disease (dose adjust). Available OTC at 10–20mg.",
      tips: "If using for nocturnal acid suppression, take before bedtime. OTC 10mg for heartburn relief. H2 blockers are better than PPIs for on-demand/PRN use.",
      sideEffects: "Headache, dizziness, constipation, diarrhoea. Generally very well tolerated.",
      watchOut: "Dose adjustment in renal impairment. Tolerance can develop with continued use (receptor upregulation). Less effective than PPIs for severe GERD or erosive oesophagitis.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "H2 Blocker", "GERD", "Acid Reflux"],
      researchIndications: [
        { category: "Gastrointestinal", effectiveness: "Effective", items: [
          { title: "Gastric / Duodenal Ulcer", description: "40mg at bedtime heals 80–90% of duodenal ulcers at 8 weeks. Less effective than PPIs for large ulcers." },
          { title: "GERD / Heartburn", description: "Effective for mild to moderate GERD. Faster onset than PPIs for PRN use." },
          { title: "Zollinger-Ellison Syndrome", description: "High-dose famotidine (up to 640mg/day) controls acid hypersecretion in ZES." },
        ]},
      ],
      indianBrands: [
        { brand: "Famocid 20" },
        { brand: "Famocid 40" },
        { brand: "Famcimac 20" },
      ],
    ukBrands: [
      { brand: "Pepcid 20mg / 40mg", manufacturer: "MSD" },
      { brand: "Famotidine (generic)", notes: "Available" },
    ],
    usBrands: [
      { brand: "Pepcid 10mg / 20mg", manufacturer: "Johnson & Johnson", notes: "OTC" },
      { brand: "Pepcid AC 10mg / 20mg", manufacturer: "J&J", notes: "OTC" },
    ],
    canadaBrands: [
      { brand: "Pepcid 10mg / 20mg / 40mg", manufacturer: "Janssen" },
    ],
    
    overview: {
      whatIsIt: "Famotidine is an H2 receptor antagonist (H2RA) that blocks histamine H2 receptors on gastric parietal cells, reducing acid secretion. Available OTC for heartburn and indigestion. Unlike PPIs, works within 1 hour and is useful for on-demand acid suppression. Investigated during COVID-19 pandemic for possible antiviral/immunomodulatory effects.",
      keyBenefits: "Faster onset than PPIs (1 hour vs 3–5 days for full PPI effect). More suitable for on-demand heartburn relief. Fewer drug interactions than PPIs (does not inhibit CYP2C19). Safe in pregnancy. OTC available at low cost. Does not cause rebound acid secretion on stopping (unlike PPIs). Useful for nocturnal acid breakthrough in patients on PPIs.",
      mechanismOfAction: "Competitively and reversibly blocks histamine at parietal cell H2 receptors, reducing histamine-stimulated acid secretion. As acid secretion can also be stimulated by gastrin and acetylcholine (which are not blocked by H2RA), famotidine is less complete an acid suppressor than PPIs but provides meaningful reduction (60–70% of basal and 32–94% of meal-stimulated acid). No effect on lower oesophageal sphincter pressure.",
    },
    pharmacokinetics: { peak: "1–3h", halfLife: "2.5–3.5h", cleared: "12h" },
    researchProtocols: [
      { goal: "GORD / Heartburn (OTC)", dose: "10–20mg as needed", frequency: "Up to twice daily (max 2 doses/day)", route: "Oral" },
      { goal: "Peptic Ulcer / GORD (Rx)", dose: "20–40mg twice daily", frequency: "Twice daily", route: "Oral" },
      { goal: "Nocturnal Acid Breakthrough (on PPI)", dose: "40mg at bedtime", frequency: "Once nightly (add-on to PPI)", route: "Oral" },
    ],
    interactions: [
      { name: "Ketoconazole, itraconazole, atazanavir (require acid for absorption — reduced efficacy)", status: "caution" },
    ],
    sideEffectNotes: [
      "Headache and dizziness — mild",
      "Constipation or diarrhoea — rare",
      "Thrombocytopenia — rare; class effect of H2 blockers",
      "No significant CYP450 interactions",
    ],
    faq: [
      { question: "Is famotidine better than omeprazole for heartburn?", answer: "For acute or on-demand heartburn relief, famotidine (H2RA) works faster (within 1 hour) than omeprazole (PPI, which takes days for maximum effect). For chronic GORD and erosive oesophagitis healing, PPIs are superior. The ideal approach for occasional heartburn: famotidine or antacids. For frequent heartburn (>2 days per week) or documented reflux disease: PPI daily therapy. They can be combined — PPI for daytime coverage, famotidine at bedtime for nocturnal acid." },
      { question: "Why might famotidine be added at bedtime even if I'm already taking a PPI?", answer: "PPIs are optimally taken before breakfast and primarily suppress daytime acid. Some patients experience nocturnal acid breakthrough — a phenomenon where overnight acid secretion escapes PPI suppression. Adding H2 blockers (famotidine 20–40mg) at bedtime provides additional overnight coverage. H2 blockers are preferred for this application as they do not require active pumps for efficacy and work better in the fasting nocturnal period." },
      { question: "Was famotidine used for COVID-19?", answer: "Famotidine gained attention during the COVID-19 pandemic after observational studies suggested hospitalised patients taking famotidine had lower severity. Laboratory data suggested it might inhibit SARS-CoV-2 proteases or modulate histamine signalling in COVID-19. However, subsequent randomised trials did not confirm significant clinical benefit, and famotidine is not recommended specifically for COVID-19 treatment. Interest in histamine involvement in Long COVID continues." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Pepcid — OTC 10–20mg for heartburn; Rx 20–40mg for ulcers and GORD" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Pepcid — OTC and Rx available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Famocid, Topcid — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Pepcid — OTC and Rx available" },
    ],
    expectTimeline: [
      { timeframe: "1 hour", description: "Onset of acid suppression" },
      { timeframe: "2–3 hours", description: "Peak acid suppression" },
      { timeframe: "12 hours", description: "Duration of effect per dose" },
    ],
    },

    {
      name: "Ondansetron",
      slug: "ondansetron",
      abbreviation: "OND",
      aliases: ["zofran", "onoff", "emeset", "zofer", "vominorm"],
      category: "gastro",
      tagline: "5-HT3 antagonist — chemotherapy & postoperative nausea",
      description: "Ondansetron selectively blocks serotonin 5-HT3 receptors in the chemoreceptor trigger zone and gut. The most widely used antiemetic globally. Gold standard for chemotherapy-induced nausea and vomiting (CINV) and postoperative nausea. Also used in gastroenteritis and pregnancy sickness.",
      color: "#065F46",
      vial: "Oral tablet / Oral dissolving tablet / IV/IM injection",
      recon: "4mg, 8mg, 16mg tablets; 4mg/2mL injection",
      startDose: "4–8mg",
      targetDose: "8mg (chemotherapy); 4mg (general nausea)",
      frequency: "Every 4–8 hours as needed; pre-chemotherapy: 8mg 30 min before + 8mg 8h later",
      route: "Oral, sublingual ODT, IV, or IM",
      storage: "Room temperature; protect injection from light",
      benefits: "Gold standard antiemetic. Rapid IV onset. ODT melts on tongue — useful when swallowing is difficult. Does not cause extrapyramidal side effects (unlike metoclopramide). Safe in pregnancy for morning sickness.",
      tips: "IV push should be diluted and given over >15 minutes — rapid IV associated with QTc prolongation and arrhythmia. ODT can be taken without water. 5-HT3 antagonists are most effective when given prophylactically.",
      sideEffects: "Headache, constipation, QTc prolongation (dose-dependent), dizziness. Serotonin syndrome risk with concurrent serotonergic agents.",
      watchOut: "QTc prolongation — avoid in long QT syndrome, hypokalaemia, hypomagnesaemia. Avoid rapid IV push. Serotonin syndrome risk with SSRIs/MAOIs.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "Antiemetic", "5-HT3", "Chemotherapy", "PONV"],
      researchIndications: [
        { category: "Nausea & Vomiting", effectiveness: "Most Effective", items: [
          { title: "Chemotherapy-Induced Nausea (CINV)", description: "Standard of care. Prevents acute CINV in 70–80% of patients receiving emetogenic chemotherapy." },
          { title: "Postoperative Nausea & Vomiting (PONV)", description: "Prophylactic 4mg IV reduces PONV incidence by ~25%. Preferred over droperidol for safety." },
          { title: "Acute Gastroenteritis", description: "Off-label: single 8mg dose reduces vomiting in gastroenteritis and allows oral rehydration." },
        ]},
      ],
      indianBrands: [
        { brand: "Onoff 4" },
        { brand: "Emeset 4" },
        { brand: "Zofer 4" },
        { brand: "Vominorm 8" },
        { brand: "Vomistop 4" },
      ],
    ukBrands: [
      { brand: "Zofran 4mg / 8mg", manufacturer: "Novartis" },
      { brand: "Ondansetron (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Zofran 4mg / 8mg", manufacturer: "Novartis" },
      { brand: "Zuplenz 4mg / 8mg oral film", manufacturer: "Par Pharmaceutical" },
    ],
    canadaBrands: [
      { brand: "Zofran 4mg / 8mg", manufacturer: "Novartis" },
    ],
    
    overview: {
      whatIsIt: "Ondansetron is a selective 5-HT3 receptor antagonist (setron) that blocks serotonin in the vagus nerve and chemoreceptor trigger zone (CTZ), preventing chemotherapy-induced, radiation-induced, and postoperative nausea and vomiting (CINV, RINV, PONV). Also used for nausea of pregnancy, gastroenteritis, and opioid-induced nausea.",
      keyBenefits: "Most effective antiemetic for highly emetogenic chemotherapy when combined with corticosteroids. Effective for PONV and pregnancy nausea. Available as oral, sublingual dissolving tablets, and IV formulations. No sedation or extrapyramidal side effects (advantage over metoclopramide, prochlorperazine). Ondansetron ODT melts on the tongue — useful when swallowing is difficult.",
      mechanismOfAction: "Selectively antagonises 5-HT3 receptors on vagal afferents in the GI tract and in the area postrema (chemoreceptor trigger zone). The vomiting reflex is initiated by serotonin release from enterochromaffin cells in the gut (triggered by chemotherapy, radiotherapy, anaesthetic agents). By blocking 5-HT3 receptors on these afferents, ondansetron prevents the vagal-CTZ-vomiting pathway from being activated.",
    },
    pharmacokinetics: { peak: "1.5–2h (oral)", halfLife: "3–6h", cleared: "24h" },
    researchProtocols: [
      { goal: "CINV Prevention (chemotherapy)", dose: "8mg IV before chemo, then 8mg orally every 8h × 2 days", frequency: "As per protocol", route: "IV then Oral" },
      { goal: "PONV (postoperative)", dose: "4mg IV at end of surgery", frequency: "Single dose (IV)", route: "IV" },
      { goal: "Acute Nausea / Vomiting (acute gastroenteritis, pregnancy)", dose: "4–8mg orally", frequency: "Every 4–8 hours (max 3 doses/day)", route: "Oral" },
    ],
    interactions: [
      { name: "QTc-prolonging drugs (ondansetron dose-dependently prolongs QTc — avoid combinations)", status: "caution" },
      { name: "Apomorphine (severe hypotension — absolutely contraindicated)", status: "avoid" },
      { name: "Tramadol, serotonergic drugs (serotonin syndrome risk)", status: "caution" },
    ],
    sideEffectNotes: [
      "Headache — most common (16–27%); due to 5-HT3 blockade in cerebral vasculature",
      "Constipation — GI 5-HT3 blockade reduces peristalsis",
      "QTc prolongation — dose-dependent; avoid IV doses >32mg; caution with cardiac disease",
      "Flushing, warm sensation — particularly with IV administration",
    ],
    faq: [
      { question: "Can ondansetron be used for morning sickness?", answer: "Ondansetron is used off-label for nausea and vomiting of pregnancy (NVP/hyperemesis gravidarum) when first-line treatments (vitamin B6, ginger, promethazine, doxylamine) fail. Evidence for safety in the first trimester has been controversial — a 2012 study suggested a small increase in oral cleft risk, but subsequent larger studies have not confirmed teratogenicity. ACOG guidelines consider it safe in the second and third trimesters for refractory hyperemesis. First-trimester use requires shared decision-making." },
      { question: "Why can't ondansetron be given with apomorphine?", answer: "The combination of ondansetron and apomorphine causes profound and potentially life-threatening hypotension. This interaction is absolute — apomorphine is a dopamine agonist used for Parkinson's disease, and the mechanism of the ondansetron + apomorphine hypotension is not fully elucidated but may involve cardiac 5-HT3 inhibition. All 5-HT3 antagonists (ondansetron, granisetron, palonosetron) are contraindicated with apomorphine." },
      { question: "How does ondansetron differ from metoclopramide for nausea?", answer: "Ondansetron blocks 5-HT3 receptors and has no dopamine antagonist activity — it causes no extrapyramidal side effects (tardive dyskinesia, dystonia, Parkinsonism) that are risks with metoclopramide. Metoclopramide also acts as a GI prokinetic by promoting gastric emptying (useful in gastroparesis) — ondansetron lacks this prokinetic effect. For pure antiemetic use without prokinetic need, ondansetron is preferred. For gastroparesis or post-operative GI atony, metoclopramide or domperidone is more appropriate." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Zofran — CINV, RINV, PONV; generic widely available" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Zofran — CINV and PONV; IV, oral, and ODT formulations" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Emeset, Zofran, Vomikind — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Zofran — licensed for CINV and PONV" },
    ],
    expectTimeline: [
      { timeframe: "30 minutes (IV)", description: "Full antiemetic effect" },
      { timeframe: "1–2 hours (oral)", description: "Peak antiemetic effect" },
    ],
    },

    {
      name: "Metronidazole",
      slug: "metronidazole",
      abbreviation: "MTZ",
      aliases: ["flagyl", "metrogyl", "metron", "flygyl"],
      category: "gastro",
      tagline: "Nitroimidazole antibiotic — anaerobic & protozoal infections",
      description: "Metronidazole is a nitroimidazole antibiotic activated intracellularly by anaerobic bacteria and protozoa. Disrupts DNA structure and function of susceptible organisms. Effective against anaerobes, Helicobacter pylori, Giardia, Entamoeba, Trichomonas, and Clostridioides difficile.",
      color: "#065F46",
      vial: "Oral tablet / IV infusion / Topical gel",
      recon: "200mg, 400mg, 500mg tablets; 500mg/100mL IV; 0.75% topical gel",
      startDose: "400mg twice daily (most infections)",
      targetDose: "400–500mg three times daily",
      frequency: "Two to three times daily",
      route: "Oral, IV, or topical",
      storage: "Room temperature; protect from light",
      benefits: "Excellent activity against anaerobes and protozoa. Bioavailability nearly 100% — IV bioequivalent to oral in non-emergency settings. Topical gel effective for rosacea and bacterial vaginosis.",
      tips: "Severe disulfiram-like reaction with alcohol — absolutely avoid alcohol during treatment and for 48 hours after. Metallic taste is common and harmless. Take with food to reduce nausea.",
      sideEffects: "Metallic taste (very common), nausea, disulfiram-like reaction with alcohol, peripheral neuropathy with prolonged use, seizures (rare, very high doses).",
      watchOut: "Disulfiram-like reaction with alcohol — avoid completely. Avoid in first trimester of pregnancy if possible. Peripheral neuropathy with prolonged use. Dose reduce in severe hepatic impairment.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "Antibiotic", "Antiparasitic", "Anaerobic", "H. pylori"],
      researchIndications: [
        { category: "Infections", effectiveness: "Most Effective", items: [
          { title: "Clostridioides difficile Colitis", description: "First-line for mild C. difficile infection. Oral metronidazole 500mg TID for 10–14 days." },
          { title: "H. pylori Eradication (Quadruple Therapy)", description: "Component of bismuth quadruple therapy for metronidazole-susceptible H. pylori." },
          { title: "Giardiasis / Amoebiasis", description: "First-line for Giardia lamblia and invasive Entamoeba histolytica infections." },
        ]},
      ],
      indianBrands: [
        { brand: "Flagyl 200" },
        { brand: "Flagyl 400" },
        { brand: "Metrogyl 400" },
        { brand: "Metron 500" },
        { brand: "Flygyl 400" },
      ],
    ukBrands: [
      { brand: "Flagyl 200mg / 400mg", manufacturer: "Sanofi" },
      { brand: "Anabact 0.75% Gel", notes: "Topical" },
      { brand: "Metrogel 0.75%", notes: "Topical — rosacea" },
    ],
    usBrands: [
      { brand: "Flagyl 250mg / 500mg", manufacturer: "Pfizer" },
      { brand: "MetroGel 0.75% / 1%", manufacturer: "Galderma", notes: "Topical" },
      { brand: "Noritate 1% Cream", manufacturer: "Dermik", notes: "Topical rosacea" },
    ],
    canadaBrands: [
      { brand: "Flagyl 250mg / 500mg", manufacturer: "Pfizer" },
      { brand: "MetroGel 0.75%", notes: "Topical" },
    ],
    
    overview: {
      whatIsIt: "Metronidazole is a nitroimidazole antibiotic and antiprotozoal agent effective against anaerobic bacteria and certain parasites. One of the most essential medicines globally — used for bacterial vaginosis, Clostridioides difficile, intra-abdominal infections, amoebiasis, Giardia, and Trichomonas vaginalis. Available oral, IV, and topical (gel for rosacea/BV).",
      keyBenefits: "Excellent anaerobic activity — penetrates biofilm and reaches bactericidal concentrations. Essential for C. difficile colitis (oral route achieves high luminal concentrations). Broad antiprotozoal spectrum. Effective for H. pylori eradication as part of combination regimens. Low cost and generic. Topical gel for rosacea with minimal systemic effects.",
      mechanismOfAction: "Metronidazole is a prodrug reduced by microbial nitroreductase enzymes (present in anaerobic and microaerophilic organisms) to reactive radical intermediates. These radicals cause oxidative DNA damage — single and double strand breaks — killing susceptible organisms. Aerobic organisms lack the low-redox enzymes to activate metronidazole, explaining its selectivity for anaerobes and protozoa.",
    },
    pharmacokinetics: { peak: "1–2h (oral)", halfLife: "6–8h", cleared: "24–48h" },
    researchProtocols: [
      { goal: "Bacterial Vaginosis", dose: "500mg twice daily × 7 days (or 2g single dose)", frequency: "Twice daily", route: "Oral" },
      { goal: "C. difficile Colitis (mild-moderate)", dose: "500mg three times daily × 10–14 days", frequency: "Three times daily", route: "Oral" },
      { goal: "Intra-abdominal Infections", dose: "500mg every 8h (IV or oral)", frequency: "Three times daily", route: "IV or Oral" },
      { goal: "Giardiasis / Trichomoniasis", dose: "2g single dose", frequency: "Single dose", route: "Oral" },
    ],
    interactions: [
      { name: "Alcohol (disulfiram-like reaction — nausea, flushing, tachycardia; avoid alcohol during and for 48h after course)", status: "avoid" },
      { name: "Warfarin (metronidazole inhibits warfarin metabolism — INR increases significantly)", status: "caution" },
      { name: "Lithium (reduced renal clearance — toxicity risk)", status: "caution" },
      { name: "Disulfiram (psychotic reactions and confusion — avoid combination)", status: "avoid" },
    ],
    sideEffectNotes: [
      "Nausea, metallic taste, and GI upset — dose-related; take with food",
      "Peripheral neuropathy — with prolonged use (>10 days); irreversible in severe cases; monitor",
      "CNS effects (dizziness, headache, ataxia) — at high doses or in renal impairment",
      "Disulfiram-like alcohol reaction — avoid alcohol during treatment and 48h after",
    ],
    faq: [
      { question: "Why can't I drink alcohol with metronidazole?", answer: "Metronidazole inhibits aldehyde dehydrogenase — the enzyme that metabolises acetaldehyde (the toxic intermediate of alcohol metabolism). This causes acetaldehyde accumulation, producing flushing, nausea, vomiting, headache, palpitations, and sweating — a disulfiram-like reaction. Avoid all alcohol (including mouthwash, sauces containing wine) during metronidazole treatment and for at least 48 hours after the last dose to allow the enzyme inhibition to resolve." },
      { question: "Is metronidazole still used for C. difficile?", answer: "Metronidazole remains an option for mild C. difficile infection but oral vancomycin and fidaxomicin have largely replaced it as preferred first-line therapies in current guidelines. The IDSA/SHEA guidelines recommend vancomycin or fidaxomicin for all non-severe C. diff cases in 2021 updated guidance, due to higher clinical cure rates and lower recurrence rates. Metronidazole may be used as a cost-driven alternative in low-resource settings or mild cases." },
      { question: "How long does metronidazole take to clear bacterial vaginosis?", answer: "Symptoms of BV (discharge, odour) typically improve within 2–3 days of starting metronidazole. The full 7-day course is required to ensure eradication of Gardnerella and anaerobic bacteria. A 2g single dose is effective but has a higher recurrence rate at 4 weeks compared to the 7-day course. Recurrence after initial treatment is common (30–50% within 3 months) — topical gel maintenance may be needed for recurrent BV." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Flagyl — BV, amoebiasis, trichomoniasis, anaerobic infections; Metrogel (topical rosacea)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Flagyl, Metronidazole (generic) — oral, IV, suppository, topical" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Flagyl, Metrogyl — widely available in multiple formulations" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Flagyl — oral, IV, and topical formulations licensed" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptom improvement in BV, giardiasis" },
      { timeframe: "7–10 days", description: "Full course for BV and C. difficile" },
    ],
    },

    {
      name: "Ursodeoxycholic Acid",
      slug: "ursodeoxycholic-acid",
      abbreviation: "UDCA",
      aliases: ["ursodiol", "actigall", "ursodec", "udiliv", "uriheal"],
      category: "gastro",
      tagline: "Bile acid — gallstone dissolution, liver disease & cholestasis",
      description: "Ursodeoxycholic acid (UDCA) is a hydrophilic bile acid that reduces the cholesterol saturation of bile, dissolving cholesterol gallstones and protecting hepatocytes from toxic bile acid effects. Approved for primary biliary cholangitis (PBC), cholesterol gallstone dissolution, and intrahepatic cholestasis of pregnancy.",
      color: "#065F46",
      vial: "Oral tablet / capsule",
      recon: "150mg, 300mg, 500mg",
      startDose: "10mg/kg/day",
      targetDose: "13–15mg/kg/day (PBC); 8–10mg/kg/day (gallstones)",
      frequency: "Two to three times daily (with meals)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Only disease-modifying treatment for primary biliary cholangitis. Reduces liver enzyme elevation, delays histological progression, and improves transplant-free survival in PBC. Dissolves small cholesterol gallstones. Safe in pregnancy for intrahepatic cholestasis.",
      tips: "Must be taken with meals for adequate bile acid recycling. Takes 6–24 months for gallstone dissolution. PBC: lifelong treatment — do not stop. Monitor LFTs every 3–6 months.",
      sideEffects: "Generally very well tolerated. Diarrhoea, nausea, abdominal discomfort (usually mild and resolves).",
      watchOut: "Not for pigment stones or calcified stones (only cholesterol stones). Calcified stones may worsen with UDCA. Avoid in complete biliary obstruction.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "Liver", "PBC", "Bile Acid", "Gallstones"],
      researchIndications: [
        { category: "Liver / Biliary", effectiveness: "Most Effective", items: [
          { title: "Primary Biliary Cholangitis (PBC)", description: "Standard of care — UDCA 13–15mg/kg/day normalises LFTs, improves survival, and delays disease progression in 60% of patients." },
          { title: "Intrahepatic Cholestasis of Pregnancy", description: "Reduces maternal bile acids and fetal risk. First-line treatment for ICP." },
          { title: "Cholesterol Gallstones", description: "Dissolves small (<5mm) radiolucent cholesterol stones in 50–70% of patients over 12–24 months." },
        ]},
      ],
      indianBrands: [
        { brand: "Ursodec 150" },
        { brand: "Ursodec 300" },
        { brand: "Uriheal 300" },
      ],
    ukBrands: [
      { brand: "Ursofalk 150mg / 250mg / 500mg", manufacturer: "Dr. Falk Pharma" },
      { brand: "Destolit 150mg", manufacturer: "Beacon Pharmaceuticals" },
    ],
    usBrands: [
      { brand: "Actigall 300mg", manufacturer: "Actavis" },
      { brand: "Urso 250mg / 500mg", manufacturer: "Aptalis Pharma" },
    ],
    canadaBrands: [
      { brand: "Urso 250mg / 500mg", manufacturer: "Axcan Pharma" },
      { brand: "Ursodiol (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Ursodeoxycholic acid (UDCA, ursodiol) is a naturally occurring secondary bile acid used to dissolve cholesterol gallstones and treat chronic cholestatic liver diseases, particularly primary biliary cholangitis (PBC) and intrahepatic cholestasis of pregnancy (ICP). It is the mainstay of treatment for PBC and the only pharmacological intervention proven to improve prognosis in this condition.",
      keyBenefits: "First-line for primary biliary cholangitis (PBC) — reduces liver enzyme levels, delays histological progression, and improves transplant-free survival. Safe in pregnancy for ICP — improves pruritus and normalises bile acids, reducing fetal risk. Can dissolve small non-calcified cholesterol gallstones. Well-tolerated with minimal side effects.",
      mechanismOfAction: "Replaces hydrophobic cytotoxic bile acids (cholic acid, chenodeoxycholic acid) with the hydrophilic, cytoprotective UDCA in the bile acid pool. Mechanisms include: biliary enrichment with UDCA reducing cholesterol saturation; stimulation of bile secretion (choleresis); protection of cholangiocytes from cytotoxic bile acids; immunomodulation (reduces aberrant MHC class I expression on biliary epithelium); and antiapoptotic effects in hepatocytes.",
    },
    pharmacokinetics: { peak: "1–3h", halfLife: "3.5–5.8 days (enterohepatic circulation)", cleared: "Days to weeks (recirculates continuously)" },
    researchProtocols: [
      { goal: "Primary Biliary Cholangitis (PBC)", dose: "13–15 mg/kg/day", frequency: "Once daily or divided doses (with meals)", route: "Oral" },
      { goal: "Intrahepatic Cholestasis of Pregnancy", dose: "10–15 mg/kg/day", frequency: "Twice daily", route: "Oral" },
      { goal: "Gallstone Dissolution", dose: "8–10 mg/kg/day", frequency: "Once daily (at bedtime)", route: "Oral" },
    ],
    interactions: [
      { name: "Cholestyramine, colestipol, antacids (adsorb UDCA in the gut — separate by 2 hours)", status: "timing" },
      { name: "Ciclosporin (UDCA may alter absorption — monitor levels)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Diarrhoea — dose-dependent; most common if taken on empty stomach; take with meals",
      "Nausea — mild; resolves with food",
      "Hair loss — rare; reported with long-term use",
      "Well tolerated in pregnancy — preferred pharmacotherapy for ICP",
    ],
    faq: [
      { question: "How long does UDCA treatment last for PBC?", answer: "Primary biliary cholangitis is a chronic progressive disease requiring lifelong UDCA therapy. Treatment is not curative — it slows progression. Biochemical response (normalisation of ALP and bilirubin) is assessed at 12 months. Non-responders may benefit from adding obeticholic acid (OCA). Liver transplantation remains the only definitive treatment for end-stage PBC. Never stop UDCA without specialist guidance as disease can accelerate." },
      { question: "Can UDCA dissolve all types of gallstones?", answer: "UDCA only dissolves pure cholesterol gallstones that are small (<10mm), non-calcified, and in a functioning gallbladder with a patent cystic duct. Pigment stones (bilirubin) and calcified stones do not respond. Success rates are approximately 50% over 6–24 months, with a high recurrence rate (50% within 5 years of stopping). Cholecystectomy (surgical removal) is generally preferred over dissolution for symptomatic gallstones." },
      { question: "Is UDCA safe in pregnancy?", answer: "Yes — UDCA is considered safe in pregnancy and is the recommended treatment for intrahepatic cholestasis of pregnancy (ICP). It significantly improves maternal pruritus and normalises maternal bile acid levels. The evidence for reduced fetal outcomes (stillbirth, preterm labour, respiratory distress) is supportive though not definitively proven in all studies. UDCA is not absorbed by the fetus in significant amounts. It is currently the standard of care for ICP in the UK, Europe, and USA." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Actigall (gallstone dissolution), Urso (PBC) — ursodiol; generic available" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ursofalk, Destolit — PBC, ICP, and gallstones (with dissolution criteria)" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Udiliv, Ursocol — licensed for cholestasis and liver disease" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Urso, Ursofalk — licensed for PBC and gallstone dissolution" },
    ],
    expectTimeline: [
      { timeframe: "3–6 months", description: "Liver enzymes begin normalising in PBC; pruritus improvement in ICP" },
      { timeframe: "12 months", description: "Biochemical response assessed for PBC — determines prognosis" },
      { timeframe: "1–2 years", description: "Gallstone dissolution (if appropriate candidates)" },
    ],
    },

    {
      name: "Prednisolone",
      slug: "prednisolone",
      abbreviation: "PRED",
      aliases: ["wysolone", "omnacortil", "predmet", "signapred"],
      category: "gastro",
      tagline: "Oral corticosteroid — anti-inflammatory & immunosuppressive",
      description: "Prednisolone is the active form of prednisone. A synthetic glucocorticoid with potent anti-inflammatory and immunosuppressive properties via glucocorticoid receptor binding. Widely used for inflammatory bowel disease, asthma exacerbations, severe allergic reactions, autoimmune conditions, and short-course anti-inflammatory treatment.",
      color: "#065F46",
      vial: "Oral tablet / soluble tablet",
      recon: "1mg, 2.5mg, 5mg, 10mg, 20mg, 25mg, 40mg",
      startDose: "5–60mg/day depending on indication",
      targetDose: "Indication-specific; taper to lowest effective dose",
      frequency: "Once daily (morning) or in divided doses for high-dose protocols",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Potent anti-inflammatory action. Effective for severe inflammatory and autoimmune conditions. Short-course use for asthma exacerbations, severe allergy, and IBD flares. Morning dosing minimises HPA suppression.",
      tips: "Morning dosing (8 AM) mimics cortisol peak and minimises HPA axis suppression. Take with food. Short courses (<3 weeks) can be stopped abruptly; longer courses must be tapered. Calcium/vitamin D supplementation for prolonged use.",
      sideEffects: "Weight gain, oedema, hyperglycaemia, insomnia, mood changes, osteoporosis (long-term), Cushingoid features, increased infection susceptibility.",
      watchOut: "Adrenal suppression with prolonged use — must taper. Hyperglycaemia in diabetics. Osteoporosis prevention critical for long-term use. Peptic ulcer risk — combine with PPI.",
      researchLevel: "Extensively Studied",
      tags: ["Gastro", "Corticosteroid", "Anti-inflammatory", "Immunosuppressive"],
      researchIndications: [
        { category: "Inflammatory / Autoimmune", effectiveness: "Most Effective", items: [
          { title: "IBD Flares (Crohn's / UC)", description: "Induces remission in acute IBD flares. 40mg/day tapered over 8 weeks standard regimen." },
          { title: "Asthma Exacerbation", description: "30–40mg/day for 5–7 days reduces hospital admission and speeds recovery in severe asthma exacerbations." },
          { title: "Inflammatory Conditions", description: "Rapid symptom relief in temporal arteritis, polymyalgia rheumatica, severe allergic reactions, and autoimmune hepatitis." },
        ]},
      ],
      indianBrands: [
        { brand: "Wysolone 5" },
        { brand: "Wysolone 10" },
        { brand: "Omnacortil 5" },
        { brand: "Omnacortil 20" },
        { brand: "Predmet 4" },
        { brand: "Signapred 5" },
      ],
    ukBrands: [
      { brand: "Deltacortril 2.5mg / 5mg", manufacturer: "Alliance Pharma" },
      { brand: "Prednisolone 1mg / 2.5mg / 5mg / 25mg (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Millipred 5mg", manufacturer: "Lannett" },
      { brand: "Orapred 15mg/5ml solution", manufacturer: "Shionogi" },
      { brand: "Veripred 20 20mg/5ml", manufacturer: "Hawthorn" },
    ],
    canadaBrands: [
      { brand: "Pediapred 5mg/5ml", manufacturer: "Pfizer" },
      { brand: "Prednisolone (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Prednisolone is a synthetic glucocorticoid and the active metabolite of prednisone. The most widely used systemic corticosteroid for anti-inflammatory and immunosuppressive therapy across a vast range of conditions including inflammatory bowel disease, asthma, autoimmune diseases, allergy, and cancer treatment. Available as oral tablets, soluble/dispersible tablets, and eye drops.",
      keyBenefits: "Rapid and broad-spectrum anti-inflammatory and immunosuppressive effects. Available in soluble formulations for children or those unable to swallow. Once-daily dosing (often morning) minimises HPA axis suppression. Proven efficacy in virtually every major inflammatory disease. Inexpensive and universally available.",
      mechanismOfAction: "Binds cytosolic glucocorticoid receptors (GRα), translocating to the nucleus where it transactivates anti-inflammatory genes (annexin-1, GILZ, MKP-1) and transrepresses pro-inflammatory transcription factors (NF-κB, AP-1). Reduces cytokine production (IL-1, IL-6, TNF-α), COX-2 expression, PGE2 synthesis, and lymphocyte/eosinophil trafficking. Also acts on membrane receptors for rapid non-genomic effects.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "2–4h (plasma); 18–36h (biological effect)", cleared: "24h" },
    researchProtocols: [
      { goal: "Acute Exacerbation / Short Course", dose: "40–60mg/day × 5–10 days", frequency: "Once daily (morning)", route: "Oral" },
      { goal: "Maintenance (autoimmune disease)", dose: "5–20mg/day", frequency: "Once daily (or alternate day)", route: "Oral" },
      { goal: "Inflammatory Bowel Disease (active)", dose: "20–40mg/day (taper over 6–8 weeks)", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "NSAIDs (additive GI toxicity — combined GI bleeding risk)", status: "caution" },
      { name: "Antidiabetic agents (hyperglycaemia — dose adjustments needed)", status: "caution" },
      { name: "Live vaccines (contraindicated at immunosuppressive doses ≥20mg/day for ≥2 weeks)", status: "avoid" },
      { name: "Rifampicin, phenytoin, carbamazepine (reduce prednisolone levels)", status: "caution" },
      { name: "Warfarin (variable — monitor INR closely)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Short courses (<2 weeks) — generally well tolerated; watch for glucose elevation in diabetics, mood changes",
      "Long-term use: weight gain (truncal obesity), moon face, hypertension, osteoporosis, cataracts, glucose intolerance, adrenal suppression, skin thinning, increased infection risk",
      "Adrenal suppression — if on >5mg/day for >3 weeks; never stop abruptly; sick day rules apply",
      "Psychological effects — euphoria, insomnia, mood swings, or depression",
    ],
    faq: [
      { question: "Can I stop prednisolone abruptly?", answer: "Never stop prednisolone abruptly if you have been taking it for more than 3 weeks at any dose, or at doses above physiological replacement (>7.5mg/day) for any duration. Abrupt withdrawal causes adrenal insufficiency — life-threatening low cortisol with shock, collapse, and hypoglycaemia. Always taper: reduce by 5–10mg every 1–2 weeks, slowing the taper as you approach 5–10mg/day. Carry a steroid alert card. Seek medical advice during illness (sick day rules: double dose if feverish or unwell)." },
      { question: "How does prednisolone affect blood sugar?", answer: "Prednisolone raises blood glucose through multiple mechanisms: increased hepatic gluconeogenesis, reduced insulin sensitivity, and impaired insulin secretion. This can unmask latent diabetes or significantly worsen existing diabetes. The glucose elevation is most pronounced 4–8 hours after the morning dose (postprandial effect). Blood glucose should be monitored in all patients starting prednisolone — especially if diabetic. May require initiation or escalation of antidiabetic therapy during steroid use." },
      { question: "How can I protect my bones while on long-term prednisolone?", answer: "Long-term corticosteroids (>3 months at prednisolone ≥5mg/day) significantly increase fracture risk — primarily vertebral and hip fractures — via reduced osteoblast activity and increased osteoclast activity. Preventive measures: calcium (1000–1500mg/day from diet and supplements) + vitamin D3 (800–1000 IU/day). If age >50 or at high fracture risk: add a bisphosphonate (alendronate, risedronate) unless contraindicated. Annual DXA bone density scans for those on long-term therapy." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Generic prednisolone, Orapred, Pediapred — broad anti-inflammatory and immunosuppressive indications" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Deltacortril, Prednisolone (generic) — licensed for extensive indications across specialties" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Wysolone, Omnacortil — widely prescribed across specialties" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Generic prednisolone — licensed for anti-inflammatory and immunosuppressive use" },
    ],
    expectTimeline: [
      { timeframe: "Hours–days", description: "Anti-inflammatory effect begins (cytokine and COX-2 suppression)" },
      { timeframe: "1–2 weeks", description: "Major inflammatory improvement in most conditions" },
      { timeframe: "Weeks–months", description: "Steroid-sparing agents initiated; prednisolone tapered" },
    ],
    },

    // ─── ANTIFUNGAL & ANTIVIRAL ───────────────────────────────────────────────

    {
      name: "Fluconazole",
      slug: "fluconazole",
      abbreviation: "FLUC",
      aliases: ["diflucan", "forcan", "fluxican", "fluconaz"],
      category: "antifungal",
      tagline: "Triazole antifungal — candidiasis, cryptococcosis & tinea",
      description: "Fluconazole inhibits fungal lanosterol 14-alpha-demethylase, blocking ergosterol synthesis and disrupting fungal cell membrane integrity. Active against Candida species (except C. krusei and most C. glabrata), Cryptococcus, and dermatophytes. Available as a single-dose or course treatment.",
      color: "#5B21B6",
      vial: "Oral capsule / tablet / IV infusion",
      recon: "50mg, 100mg, 150mg, 200mg capsules; 2mg/mL IV",
      startDose: "150mg single dose (vaginal candidiasis); 200mg loading + 100mg/day (systemic)",
      targetDose: "Indication-specific",
      frequency: "Once daily (or single dose for vaginal candidiasis)",
      route: "Oral or IV",
      storage: "Room temperature",
      benefits: "Single oral dose effective for vaginal candidiasis. High bioavailability (>90%) — oral as effective as IV for most indications. Long half-life (~30 hours) allows once-daily dosing. Penetrates CSF — effective for cryptococcal meningitis.",
      tips: "For vaginal thrush: single 150mg dose is curative in >85% of cases. For oropharyngeal candidiasis in immunosuppressed: 100–200mg/day for 7–14 days. Monitor LFTs with prolonged courses.",
      sideEffects: "Nausea, headache, diarrhoea, abdominal pain. Elevated LFTs with prolonged use. QTc prolongation. Drug interactions via CYP2C9/3A4 inhibition.",
      watchOut: "QTc prolongation — avoid with other QTc-prolonging drugs. Significant CYP interactions: increases warfarin, sulfonylurea, benzodiazepine levels. Hepatotoxicity with prolonged use.",
      researchLevel: "Extensively Studied",
      tags: ["Antifungal", "Candida", "Triazole", "Systemic Antifungal"],
      researchIndications: [
        { category: "Fungal Infections", effectiveness: "Most Effective", items: [
          { title: "Vaginal Candidiasis", description: "Single 150mg dose achieves >85% cure rate in uncomplicated vaginal thrush." },
          { title: "Oropharyngeal / Oesophageal Candidiasis", description: "First-line for Candida infections in immunocompromised patients." },
          { title: "Cryptococcal Meningitis (Maintenance)", description: "Maintenance therapy after amphotericin B induction in HIV-associated cryptococcal meningitis." },
        ]},
      ],
      indianBrands: [
        { brand: "Fluconaz 150" },
        { brand: "Forcan 150" },
        { brand: "Fluxican 150" },
      ],
    ukBrands: [
      { brand: "Diflucan 50mg / 150mg / 200mg", manufacturer: "Pfizer" },
      { brand: "Canesten Oral 150mg", manufacturer: "Bayer", notes: "OTC for vaginal thrush" },
    ],
    usBrands: [
      { brand: "Diflucan 50mg / 100mg / 150mg / 200mg", manufacturer: "Pfizer" },
      { brand: "Fluconazole (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Diflucan 50mg / 100mg / 150mg / 200mg", manufacturer: "Pfizer" },
      { brand: "Canesten Oral 150mg", manufacturer: "Bayer", notes: "OTC" },
    ],
    
    overview: {
      whatIsIt: "Fluconazole is a triazole antifungal that inhibits ergosterol synthesis in fungal cell membranes. The most widely used systemic antifungal globally — first-line for Candida infections (oropharyngeal, oesophageal, vaginal, invasive) and Cryptococcal meningitis (with flucytosine). Available as oral capsules, oral liquid, and IV formulation.",
      keyBenefits: "Excellent oral bioavailability (>90%) — oral therapy as effective as IV for most candidal infections. Single-dose (150mg) cures uncomplicated vulvovaginal candidiasis. Good CNS penetration (unlike itraconazole). Long half-life enables once-daily (or less frequent) dosing. Available as IV for critically ill patients who cannot tolerate oral therapy.",
      mechanismOfAction: "Inhibits fungal lanosterol 14α-demethylase (CYP51) — a cytochrome P450 enzyme essential for converting lanosterol to ergosterol, the primary sterol in fungal cell membranes. Ergosterol depletion disrupts membrane fluidity, permeability, and integrity, impairing fungal cell growth (fungistatic at low concentrations, fungicidal at higher concentrations).",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "30h", cleared: "5–6 days" },
    researchProtocols: [
      { goal: "Vulvovaginal Candidiasis (uncomplicated)", dose: "150mg single dose", frequency: "Single dose", route: "Oral" },
      { goal: "Oropharyngeal Candidiasis", dose: "200mg day 1, then 100mg/day × 7–14 days", frequency: "Once daily", route: "Oral" },
      { goal: "Cryptococcal Meningitis (consolidation)", dose: "400–800mg/day", frequency: "Once daily", route: "Oral/IV" },
    ],
    interactions: [
      { name: "Warfarin (potently inhibits CYP2C9 — INR increases dramatically; monitor)", status: "caution" },
      { name: "Statins (CYP3A4/2C9 inhibition — increases statin levels; myopathy risk)", status: "caution" },
      { name: "Sulfonylureas (increased hypoglycaemia risk)", status: "caution" },
      { name: "QTc-prolonging drugs (additive QT prolongation)", status: "caution" },
      { name: "Phenytoin (increases phenytoin levels significantly)", status: "caution" },
    ],
    sideEffectNotes: [
      "GI: nausea, abdominal discomfort, diarrhoea — take with food",
      "Headache",
      "Elevated liver enzymes — rare; monitor LFTs with prolonged use",
      "QTc prolongation — at high doses or with interacting drugs",
    ],
    faq: [
      { question: "How long does the single 150mg dose for thrush take to work?", answer: "A single 150mg fluconazole capsule for uncomplicated vulvovaginal candidiasis (thrush) produces symptom improvement within 24–48 hours in most women. Full resolution of discharge and itching typically occurs within 3–7 days. If symptoms persist beyond 7 days, a second dose may be taken after 3 days, or a longer topical/oral course considered. If recurrent thrush (≥4 episodes/year), a prophylactic fluconazole 150mg weekly for 6 months is used." },
      { question: "Can fluconazole interact with my blood thinning medication?", answer: "Yes — fluconazole is a potent CYP2C9 inhibitor. Warfarin (a CYP2C9 substrate) levels increase dramatically with even a single 150mg fluconazole dose — INR can double or more. Monitor INR closely if you take warfarin and need fluconazole. Direct oral anticoagulants (rivaroxaban, apixaban) are less affected but still have interactions. Inform your prescriber of all anticoagulant use before starting fluconazole." },
      { question: "Why doesn't fluconazole work for all fungal infections?", answer: "Fluconazole has limited activity against mould fungi (Aspergillus, Mucor) and some resistant Candida species — particularly Candida krusei (intrinsically resistant) and Candida glabrata (often resistant). It is not the drug of choice for invasive aspergillosis (voriconazole or liposomal amphotericin B are preferred) or for mucormycosis (liposomal amphotericin B). Species identification and antifungal susceptibility testing guide treatment in invasive fungal infections." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Diflucan — oral and IV; candidal infections, Cryptococcal meningitis" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Diflucan — oral and IV; licensed for candida, cryptococcosis" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Forcan, Zocon, Fluconac — widely available oral and IV" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Diflucan — licensed for candida and cryptococcal infections" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptom improvement for vaginal/oral candidiasis" },
      { timeframe: "7–14 days", description: "Full course completion for oropharyngeal candidiasis" },
    ],
    },

    {
      name: "Ketoconazole",
      slug: "ketoconazole",
      abbreviation: "KETO",
      aliases: ["nizoral", "ketomac", "ketocip", "ketoforce", "dermozole"],
      category: "antifungal",
      tagline: "Imidazole antifungal — topical tinea, seborrhoeic dermatitis & dandruff",
      description: "Ketoconazole inhibits ergosterol synthesis in fungal cell membranes. Oral systemic use is now largely superseded by safer azoles (fluconazole, itraconazole) due to hepatotoxicity and CYP interactions. Topical formulations remain first-line for seborrhoeic dermatitis, dandruff, and tinea infections.",
      color: "#5B21B6",
      vial: "Topical cream / shampoo; Oral tablet (limited use)",
      recon: "2% shampoo; 2% cream; 200mg oral tablet (restricted)",
      startDose: "Topical: apply once or twice daily; Shampoo: twice weekly",
      targetDose: "As directed by indication",
      frequency: "Topical: daily to twice weekly depending on formulation",
      route: "Topical (preferred) or oral (restricted)",
      storage: "Room temperature",
      benefits: "Highly effective topical antifungal for seborrhoeic dermatitis, dandruff, tinea versicolor, and dermatophytosis. 2% shampoo reduces scalp Malassezia — effective dandruff treatment. Anti-androgenic properties at oral doses (adrenal steroidogenesis inhibition).",
      tips: "Shampoo: leave on scalp for 3–5 minutes before rinsing. Cream: use for minimum 2–4 weeks for tinea. Oral ketoconazole: rarely used now due to hepatotoxicity — only consider if no alternative.",
      sideEffects: "Topical: mild irritation, burning, contact dermatitis. Oral: hepatotoxicity (black box warning), QTc prolongation, adrenal suppression, multiple CYP interactions.",
      watchOut: "Oral form: FDA black box warning for hepatotoxicity. Only use oral when benefits outweigh risks. Topical form is safe.",
      researchLevel: "Extensively Studied",
      tags: ["Antifungal", "Topical", "Dandruff", "Seborrhoeic Dermatitis", "Tinea"],
      researchIndications: [
        { category: "Fungal Skin Conditions", effectiveness: "Most Effective", items: [
          { title: "Seborrhoeic Dermatitis / Dandruff", description: "2% shampoo reduces scalp Malassezia and seborrhoeic dermatitis — effective as short-course and maintenance." },
          { title: "Tinea Versicolor", description: "Topical ketoconazole 2% cream or shampoo: highly effective for pityriasis versicolor." },
          { title: "Tinea Corporis / Pedis", description: "Effective topical treatment for ringworm and athlete's foot." },
        ]},
      ],
      indianBrands: [
        { brand: "Ketomac 2% Shampoo" },
        { brand: "Ketomac 2% Cream" },
        { brand: "Ketocip 2% Cream" },
        { brand: "Dermozole 2% Cream" },
      ],
    ukBrands: [
      { brand: "Nizoral 2% Shampoo", manufacturer: "Janssen", notes: "OTC for dandruff" },
      { brand: "Ketoconazole 200mg tablets", notes: "Rx — restricted use" },
    ],
    usBrands: [
      { brand: "Nizoral 1% / 2% Shampoo", manufacturer: "McNeil / Janssen" },
      { brand: "Extina 2% Foam", manufacturer: "Stiefel", notes: "Rx topical" },
      { brand: "Xolegel 2% Gel", manufacturer: "Stiefel" },
    ],
    canadaBrands: [
      { brand: "Nizoral 2% Shampoo", manufacturer: "Janssen", notes: "OTC" },
      { brand: "Nizoral 200mg tablets", manufacturer: "Janssen", notes: "Rx — restricted" },
    ],
    
    overview: {
      whatIsIt: "Ketoconazole is an imidazole antifungal — one of the first oral antifungals developed. Systemic oral use is now largely restricted due to serious hepatotoxicity concerns; oral ketoconazole is withdrawn in the UK and has a restricted indication in the USA (Cushing's syndrome). However, topical ketoconazole (shampoo, cream) is widely used for seborrhoeic dermatitis, pityriasis versicolor, and tinea infections.",
      keyBenefits: "Topical 2% shampoo/cream is highly effective for seborrhoeic dermatitis (dandruff), tinea versicolor, and tinea infections with excellent safety. Inhibits CYP17A1 at high doses — this mechanism is exploited in Cushing's syndrome treatment and studied in castration-resistant prostate cancer. Topical formulations available OTC.",
      mechanismOfAction: "Inhibits fungal lanosterol 14α-demethylase (CYP51), depleting ergosterol and disrupting fungal cell membrane integrity. At higher concentrations, inhibits mammalian CYP17A1 (17α-hydroxylase/17,20-lyase) — blocking adrenal and gonadal steroid synthesis. Oral doses also inhibit cortisol synthesis (exploited in Cushing's).",
    },
    pharmacokinetics: { peak: "1–2h (oral)", halfLife: "8h (oral); topical — minimal systemic absorption", cleared: "24–48h (oral)" },
    researchProtocols: [
      { goal: "Seborrhoeic Dermatitis (scalp)", dose: "2% shampoo — apply to scalp", frequency: "Twice weekly × 2–4 weeks; once weekly maintenance", route: "Topical" },
      { goal: "Tinea Versicolor / Corporis", dose: "2% cream", frequency: "Once daily × 2–4 weeks", route: "Topical" },
    ],
    interactions: [
      { name: "Multiple CYP3A4/2C9 interactions (oral ketoconazole is a potent inhibitor)", status: "caution" },
    ],
    sideEffectNotes: [
      "Topical: mild irritation, dryness, occasional contact allergy",
      "Oral (no longer recommended for routine fungal infections): hepatotoxicity — potentially fatal; adrenal insufficiency at high doses; multiple drug interactions",
    ],
    faq: [
      { question: "Is oral ketoconazole still prescribed?", answer: "Oral ketoconazole is rarely prescribed for fungal infections — it has been withdrawn from the UK market for this purpose and carries an FDA black box warning for severe hepatotoxicity. It retains a niche use for Cushing's syndrome (off-label) due to its adrenal steroidogenesis inhibition. Fluconazole, itraconazole, and voriconazole have replaced it for systemic fungal infections with far better safety profiles." },
      { question: "How does ketoconazole shampoo help dandruff?", answer: "Dandruff (seborrhoeic dermatitis) is largely caused by Malassezia furfur, a lipophilic yeast that colonises sebaceous areas of the scalp and face. Ketoconazole 2% shampoo kills Malassezia by disrupting its cell membrane ergosterol, rapidly reducing the fungal load. This reduces the inflammatory response that causes the characteristic scaling, itching, and redness. It is effective within 2–4 weeks of twice-weekly use." },
      { question: "Can ketoconazole shampoo cause hair loss?", answer: "No — ketoconazole shampoo does not cause hair loss and may actually reduce shedding associated with seborrhoeic dermatitis. There is limited but interesting evidence that topical ketoconazole has mild anti-androgenic effects at the hair follicle, potentially reducing DHT-mediated follicular miniaturisation. Some studies show marginal benefit for androgenic alopecia when combined with minoxidil, though this is not a mainstream indication." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Nizoral shampoo 1% (OTC), 2% (Rx); oral Ketoconazole — Cushing's only (black box hepatotoxicity)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Nizoral shampoo — OTC and Rx topical; oral withdrawn for fungal infections" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Nizoral, Ketocip — oral and topical available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Nizoral — topical approved; oral use restricted" },
    ],
    expectTimeline: [
      { timeframe: "2–4 weeks", description: "Seborrhoeic dermatitis and tinea infections clear with topical therapy" },
      { timeframe: "4–8 weeks", description: "Nail fungal infections (onychomycosis) require prolonged treatment; oral ketoconazole for Cushing's syndrome may take weeks to months for cortisol normalisation" },
    ],
    },

    {
      name: "Luliconazole",
      slug: "luliconazole",
      abbreviation: "LULI",
      aliases: ["lulifin", "luliconazole cream", "luliconazole 1%"],
      category: "antifungal",
      tagline: "Novel topical antifungal — tinea & onychomycosis",
      description: "Luliconazole is a novel imidazole antifungal with superior activity against dermatophytes compared to older topical antifungals. High keratin binding allows once-daily application with short treatment courses. Effective for tinea cruris (jock itch), tinea corporis, and tinea pedis.",
      color: "#5B21B6",
      vial: "Topical cream / solution",
      recon: "1% cream",
      startDose: "Apply once daily to affected area",
      targetDose: "Once daily for 1–2 weeks",
      frequency: "Once daily",
      route: "Topical",
      storage: "Room temperature",
      benefits: "Superior efficacy against dermatophytes. Once-daily application. Short treatment courses (7–14 days vs 4 weeks for older agents). High keratin affinity maintains therapeutic levels between applications.",
      tips: "Apply thin layer extending 2–3cm beyond the lesion border. Continue for full course even if symptoms improve. Do not use on face (unless directed) or in eyes.",
      sideEffects: "Application site reactions (erythema, burning, dryness) — mild and transient.",
      watchOut: "For external use only. Avoid contact with eyes and mucous membranes. Not studied extensively in pregnancy.",
      researchLevel: "Well Researched",
      tags: ["Antifungal", "Topical", "Dermatophyte", "Tinea"],
      researchIndications: [
        { category: "Tinea Infections", effectiveness: "Effective", items: [
          { title: "Tinea Cruris (Jock Itch)", description: "7-day once-daily application achieves ≥70% mycological cure in tinea cruris — superior to other topicals." },
          { title: "Tinea Pedis (Athlete's Foot)", description: "14-day luliconazole 1% effective for interdigital and moccasin-type tinea pedis." },
        ]},
      ],
      indianBrands: [
        { brand: "Lulifin 1% Cream" },
      ],
    ukBrands: [
      { brand: "Luzu 1% Cream", notes: "Available via specialist import" },
    ],
    usBrands: [
      { brand: "Luzu 1% Cream", manufacturer: "Valeant / Bausch Health" },
    ],
    canadaBrands: [
      { brand: "Not approved", notes: "Not licensed by Health Canada" },
    ],
    
    overview: {
      whatIsIt: "Luliconazole is a novel imidazole antifungal with the highest potency against dermatophytes (Trichophyton, Microsporum, Epidermophyton) among topical antifungals. Approved for tinea pedis (athlete's foot), tinea cruris (jock itch), and tinea corporis (ringworm). Once-daily application with a short treatment course.",
      keyBenefits: "Highest in vitro activity against dermatophytes among topical antifungals — MIC values 10–100× lower than other azoles. Once-daily application for 1–2 weeks (shorter than clotrimazole 4 weeks). Excellent skin penetration. Sustained fungicidal concentrations in skin for 1–2 weeks after stopping. Low systemic absorption.",
      mechanismOfAction: "Inhibits fungal lanosterol 14α-demethylase (CYP51), depleting ergosterol from dermatophyte cell membranes. The high lipophilicity of luliconazole enables deep penetration into the stratum corneum and nail plate, achieving concentrations far above MIC with sustained residual activity.",
    },
    pharmacokinetics: { peak: "Topical — local action; <1% systemic absorption", halfLife: "N/A (topical)", cleared: "Skin reservoir active for 1–2 weeks" },
    researchProtocols: [
      { goal: "Tinea Pedis (interdigital)", dose: "1% cream — apply once daily", frequency: "Once daily × 2 weeks", route: "Topical" },
      { goal: "Tinea Cruris / Corporis", dose: "1% cream — apply once daily", frequency: "Once daily × 1 week", route: "Topical" },
    ],
    interactions: [
      { name: "Minimal systemic interactions due to <1% absorption", status: "compatible" },
    ],
    sideEffectNotes: [
      "Application site reactions — mild erythema, burning, dryness (1–3%)",
      "Contact dermatitis — rare allergic reaction",
    ],
    faq: [
      { question: "Is luliconazole better than clotrimazole for athlete's foot?", answer: "Head-to-head trials show luliconazole achieves mycological cure rates comparable to bifonazole and terbinafine with a shorter treatment course. The main advantage is once-daily application for just 1–2 weeks versus clotrimazole's 4-week twice-daily regimen. Luliconazole's sustained antifungal activity in the skin reservoir means the drug continues working after the treatment course ends. For convenience and adherence, luliconazole is preferable; for cost, clotrimazole generics are cheaper." },
      { question: "How should luliconazole cream be applied?", answer: "Apply a thin layer to the entire affected area and 1–2cm surrounding skin once daily. For interdigital tinea pedis (between the toes), ensure cream penetrates the toe web spaces. Wash and thoroughly dry the affected area before applying. Continue for the full recommended duration even if symptoms resolve early — stopping too soon causes recurrence. Wash hands after applying (unless treating hands). Avoid eyes and mucous membranes." },
      { question: "Can luliconazole treat nail fungus (onychomycosis)?", answer: "Topical luliconazole cream is not approved for onychomycosis. Nail fungus requires either systemic therapy (oral terbinafine, itraconazole) or specialised topical nail lacquers (ciclopirox, amorolfine, efinaconazole, tavaborole) that penetrate the nail plate. Standard cream formulations do not penetrate the nail effectively. If nail involvement accompanies skin tinea, the skin infection should be treated with luliconazole cream while nail treatment is managed separately." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Luzu 1% cream — tinea pedis, cruris, corporis" },
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Not licensed in the UK; clotrimazole, terbinafine remain standard" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Lulibet, Lulifin, Luliwin — widely available for tinea infections" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not licensed in Canada" },
    ],
    expectTimeline: [
      { timeframe: "1–2 weeks", description: "Clinical improvement (itching, scaling reduces); mycological cure may lag" },
      { timeframe: "2–4 weeks", description: "Full mycological cure and resolution of tinea" },
    ],
    },

    {
      name: "Valacyclovir",
      slug: "valacyclovir",
      abbreviation: "VACV",
      aliases: ["valtrex", "valcivir", "valclovir", "valembic"],
      category: "antifungal",
      tagline: "Prodrug of acyclovir — herpes simplex, zoster & HSV suppression",
      description: "Valacyclovir is the L-valyl ester prodrug of acyclovir with 3–5× higher oral bioavailability. Converted to acyclovir in the intestinal wall and liver. Acyclovir is a guanosine analogue that inhibits viral DNA polymerase in HSV-1, HSV-2, and VZV. Effective for genital herpes treatment, suppression, and zoster.",
      color: "#5B21B6",
      vial: "Oral tablet",
      recon: "500mg, 1000mg",
      startDose: "500mg twice daily (HSV treatment/suppression); 1g three times daily (zoster)",
      targetDose: "Indication-specific",
      frequency: "Twice daily (HSV) or three times daily (zoster)",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Superior bioavailability vs acyclovir (55% vs 15–20%). Fewer tablets per day. Effective suppressive therapy for recurrent genital herpes — reduces transmission risk by 48%. Treats and shortens herpes zoster duration.",
      tips: "Start within 72 hours of zoster rash onset for maximum benefit. Suppressive therapy for genital herpes: 500mg/day continuously reduces outbreaks by 70–80%. Adequate hydration important to prevent crystalluria.",
      sideEffects: "Headache, nausea, abdominal pain. High doses in immunocompromised: neuropsychiatric symptoms, thrombotic microangiopathy.",
      watchOut: "Dose reduction required in renal impairment. TMA/HUS reported at very high doses in immunocompromised patients. Maintain adequate hydration.",
      researchLevel: "Extensively Studied",
      tags: ["Antiviral", "Herpes", "Zoster", "HSV Suppression"],
      researchIndications: [
        { category: "Viral Infections", effectiveness: "Most Effective", items: [
          { title: "Genital Herpes (Treatment)", description: "1g twice daily for 10 days (primary) or 500mg twice daily for 3 days (recurrence) — reduces outbreak duration." },
          { title: "Herpes Zoster (Shingles)", description: "1g three times daily for 7 days reduces pain duration and severity vs acyclovir." },
          { title: "HSV Suppressive Therapy", description: "500mg/day continuously: 70–80% reduction in recurrences; 48% reduction in transmission risk." },
        ]},
      ],
      indianBrands: [
        { brand: "Valcivir 500" },
        { brand: "Valcivir 1000" },
        { brand: "Valclovir 500" },
        { brand: "Valembic 500" },
        { brand: "Valaclovir 500" },
      ],
    ukBrands: [
      { brand: "Valtrex 500mg / 1000mg", manufacturer: "GSK" },
      { brand: "Valacyclovir (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Valtrex 500mg / 1000mg", manufacturer: "GSK" },
      { brand: "Valacyclovir (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Valtrex 500mg / 1000mg", manufacturer: "GSK" },
    ],
    
    overview: {
      whatIsIt: "Valacyclovir is an oral prodrug of acyclovir (valaciclovir in UK), designed to overcome acyclovir's poor oral bioavailability. After absorption, intestinal and hepatic esterases cleave the valyl ester, releasing acyclovir. This raises plasma acyclovir concentrations 3–5× higher than oral acyclovir — enabling less frequent dosing with equivalent antiviral efficacy. Approved for HSV-1/2 infections, herpes zoster, and suppressive therapy.",
      keyBenefits: "3× higher bioavailability than oral acyclovir enables once-daily suppressive dosing and twice-daily episodic treatment. Reduces herpes zoster duration and post-herpetic neuralgia severity when started within 72h. Reduces HSV-2 transmission to uninfected partners by 50% with daily suppressive therapy. Well tolerated. Approved for suppressive therapy in children ≥12 years (US) and adults.",
      mechanismOfAction: "Converted to acyclovir which is selectively phosphorylated by viral thymidine kinase in HSV/VZV-infected cells. The monophosphate is further phosphorylated to acyclovir triphosphate by cellular kinases — acting as a competitive inhibitor of viral DNA polymerase and as an obligate chain terminator. Uninfected cells cannot activate acyclovir efficiently — hence the excellent selectivity.",
    },
    pharmacokinetics: { peak: "1.5h (as acyclovir)", halfLife: "2.5–3.3h (acyclovir)", cleared: "~24h" },
    researchProtocols: [
      { goal: "Genital Herpes (episodic, primary)", dose: "1g twice daily × 7–10 days", frequency: "Twice daily", route: "Oral" },
      { goal: "Genital Herpes (suppressive)", dose: "500mg once daily", frequency: "Once daily (continuous)", route: "Oral" },
      { goal: "Herpes Zoster (shingles)", dose: "1g three times daily × 7 days", frequency: "Three times daily — start within 72h of rash", route: "Oral" },
      { goal: "Cold Sores (HSV-1 labialis)", dose: "2g twice daily × 1 day (start at prodrome)", frequency: "Twice daily × 1 day", route: "Oral" },
    ],
    interactions: [
      { name: "Probenecid and cimetidine (reduce renal tubular secretion of acyclovir — increase levels)", status: "monitor" },
      { name: "Nephrotoxic drugs (additive renal risk at high doses)", status: "caution" },
    ],
    sideEffectNotes: [
      "Nausea and headache — most common; take with food",
      "Renal impairment — dose reduction required; high doses cause acyclovir crystallisation in renal tubules; stay hydrated",
      "Thrombotic thrombocytopenic purpura (TTP)/haemolytic uraemic syndrome (HUS) — very rare; reported mainly in severely immunocompromised patients",
    ],
    faq: [
      { question: "How quickly should valacyclovir be taken for shingles?", answer: "Valacyclovir must be started within 72 hours of shingles (herpes zoster) rash onset for maximum benefit. Ideally within 24 hours. Starting within this window significantly reduces the severity and duration of the rash and pain, and most importantly reduces the risk of post-herpetic neuralgia (PHN) — the debilitating nerve pain that can persist for months or years after shingles resolves. Starting after 72 hours has less evidence of benefit for the acute episode." },
      { question: "Does daily valacyclovir prevent transmission of herpes to my partner?", answer: "Daily valacyclovir 500mg reduces the risk of HSV-2 transmission to an uninfected partner by approximately 50% in heterosexual couples. This is based on the NEJM 2004 trial — over 8 months, 3.6% of partners in the placebo group acquired HSV-2 vs 1.9% in the valacyclovir group. Combining daily valacyclovir with consistent condom use reduces transmission risk further (to approximately 1–2%)." },
      { question: "Can valacyclovir be used to prevent herpes recurrences?", answer: "Yes — daily suppressive valacyclovir (500mg or 1g daily depending on frequency of recurrences) significantly reduces the frequency and severity of HSV-1 and HSV-2 outbreaks. Most patients experience 70–80% reduction in recurrence frequency. Suppressive therapy is recommended for patients with ≥6 outbreaks per year or when recurrences significantly impact quality of life or relationships." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Valtrex — genital herpes (episodic/suppressive), herpes zoster, cold sores, HSV in HIV" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Valaciclovir — herpes zoster, genital herpes; generic widely available" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Valcivir, Valherp, Valtrex — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Valtrex — licensed for HSV and VZV infections" },
    ],
    expectTimeline: [
      { timeframe: "Within 72 hours of starting", description: "Shingles: rash progression halted; PHN risk significantly reduced" },
      { timeframe: "3–5 days", description: "Cold sore and genital herpes: episode shortened by 1–2 days" },
      { timeframe: "Ongoing", description: "Suppressive therapy: monthly reduction in recurrence frequency" },
    ],
    },

    {
      name: "Oseltamivir",
      slug: "oseltamivir",
      abbreviation: "OSEL",
      aliases: ["tamiflu", "antiflu", "oseltaflu"],
      category: "antifungal",
      tagline: "Neuraminidase inhibitor — influenza A & B treatment and prophylaxis",
      description: "Oseltamivir inhibits influenza neuraminidase, preventing release of viral progeny from infected cells and limiting viral spread. Effective against influenza A and B when started within 48 hours of symptom onset. Also indicated for post-exposure prophylaxis.",
      color: "#5B21B6",
      vial: "Oral capsule / suspension",
      recon: "30mg, 45mg, 75mg capsules; 12mg/mL suspension",
      startDose: "75mg twice daily (treatment) / 75mg once daily (prophylaxis)",
      targetDose: "75mg twice daily",
      frequency: "Twice daily for 5 days (treatment); once daily for 10 days (prophylaxis)",
      route: "Oral",
      storage: "Room temperature (capsules); refrigerate reconstituted suspension",
      benefits: "Reduces influenza duration by 1–2 days. Reduces complications (pneumonia, hospitalisation) in high-risk patients. Post-exposure prophylaxis effective within 48 hours of contact. Effective against H1N1 and H5N1 strains.",
      tips: "Start within 48 hours of symptom onset — efficacy significantly reduced if started later. Take with food to reduce nausea. Critically ill patients may require higher doses and longer courses.",
      sideEffects: "Nausea, vomiting (most common — take with food), headache, dizziness. Rare: neuropsychiatric events in children/adolescents.",
      watchOut: "Start within 48 hours for treatment benefit. Neuropsychiatric monitoring in paediatric patients. Dose reduce in renal impairment. Resistance emerging in some H1N1 strains.",
      researchLevel: "Extensively Studied",
      tags: ["Antiviral", "Influenza", "Neuraminidase", "Tamiflu"],
      researchIndications: [
        { category: "Influenza Treatment", effectiveness: "Effective", items: [
          { title: "Influenza A & B Treatment", description: "Reduces illness duration by 21 hours in otherwise healthy adults. Greater benefit in high-risk and hospitalised patients." },
          { title: "Post-Exposure Prophylaxis", description: "75mg/day for 10 days reduces influenza infection risk by 68–89% in household contacts." },
          { title: "Severe Influenza", description: "WHO recommends for all hospitalised influenza patients — reduces ICU admission and mortality." },
        ]},
      ],
      indianBrands: [
        { brand: "Antiflu 30" },
        { brand: "Antiflu 75" },
        { brand: "Oseltaflu 75" },
      ],
    ukBrands: [
      { brand: "Tamiflu 30mg / 45mg / 75mg", manufacturer: "Roche" },
      { brand: "Tamiflu 6mg/ml oral suspension", manufacturer: "Roche" },
    ],
    usBrands: [
      { brand: "Tamiflu 30mg / 45mg / 75mg", manufacturer: "Genentech / Roche" },
      { brand: "Oseltamivir (generic)", notes: "Available from multiple manufacturers" },
    ],
    canadaBrands: [
      { brand: "Tamiflu 30mg / 45mg / 75mg", manufacturer: "Roche" },
    ],
    
    overview: {
      whatIsIt: "Oseltamivir (Tamiflu) is a neuraminidase inhibitor antiviral approved for treatment and prophylaxis of influenza A and B in adults and children. It inhibits viral neuraminidase, preventing newly formed viral particles from being released from infected cells. Most effective when started within 48 hours of symptom onset.",
      keyBenefits: "Reduces influenza illness duration by 1–1.5 days when started within 48h. Reduces risk of complications (pneumonia, hospitalisation) in high-risk patients. Approved for post-exposure prophylaxis — prevents influenza in household contacts after exposure. Available as oral capsules and suspension. Essential medicine for pandemic preparedness (stockpiled globally for influenza pandemics).",
      mechanismOfAction: "Oseltamivir phosphate is a prodrug hydrolysed to oseltamivir carboxylate in the GI tract and liver. The active carboxylate competitively inhibits influenza neuraminidase — the enzyme that cleaves sialic acid from the cell surface, allowing newly formed viral particles to escape and infect new cells. By blocking viral release, spread within the respiratory tract is limited.",
    },
    pharmacokinetics: { peak: "3–4h (as carboxylate)", halfLife: "6–10h", cleared: "~48h" },
    researchProtocols: [
      { goal: "Influenza Treatment (adults)", dose: "75mg twice daily × 5 days", frequency: "Twice daily — start within 48h of symptom onset", route: "Oral" },
      { goal: "Post-Exposure Prophylaxis", dose: "75mg once daily × 10 days", frequency: "Once daily", route: "Oral" },
      { goal: "Seasonal Prophylaxis", dose: "75mg once daily (for outbreak duration)", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Live attenuated influenza vaccine (nasal) — avoid oseltamivir within 2 days before or after", status: "caution" },
      { name: "Probenecid (reduces renal oseltamivir clearance — increases levels)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Nausea and vomiting — most common (10–20%); take with food to reduce",
      "Headache",
      "Neuropsychiatric events (delirium, confusion, self-injury) — reported primarily in Japanese children; close monitoring recommended in children",
      "Resistance — H274Y mutation in H3N2 causes oseltamivir resistance; less common with current circulating strains",
    ],
    faq: [
      { question: "Does oseltamivir work if I start it after 48 hours?", answer: "The clinical benefit of oseltamivir is significantly reduced if started more than 48 hours after symptom onset. Most randomised trial data showing 1–1.5 day reduction in illness duration and complication prevention enrolled patients within 36–48 hours. For high-risk patients (elderly, immunocompromised, pregnant, severe illness), treatment may still be beneficial even when started later, based on observational data. For healthy adults with mild symptoms, delayed treatment provides minimal benefit." },
      { question: "Can oseltamivir prevent influenza in household contacts?", answer: "Yes — oseltamivir post-exposure prophylaxis (75mg once daily for 10 days after the last exposure) is approximately 90% effective at preventing influenza in household contacts exposed to a confirmed case. It is recommended for high-risk individuals (elderly, immunocompromised, pregnant, very young children) who are not vaccinated, or during outbreaks in care facilities. It does not replace influenza vaccination." },
      { question: "Why was oseltamivir controversial?", answer: "The BMJ and Cochrane Collaboration conducted extensive investigations revealing that Roche initially published only a subset of clinical trial data, and the unpublished data suggested oseltamivir's benefits were overstated. After publication of full clinical study reports, the Cochrane 2014 review found only modest reductions in illness duration (by ~21 hours) and questioned the complication reduction evidence. The controversy led to significant improvements in clinical trial data sharing requirements globally." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Tamiflu — treatment (≥2 weeks) and prophylaxis (≥1 year) of influenza A and B" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Tamiflu — treatment and prophylaxis; stockpiled for pandemic preparedness" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Tamiflu, Fluvir — licensed for influenza treatment and prophylaxis" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Tamiflu — licensed for influenza treatment and prophylaxis" },
    ],
    expectTimeline: [
      { timeframe: "1–2 days", description: "Reduced influenza symptoms severity; illness duration shortened by ~1 day" },
      { timeframe: "5 days", description: "Full treatment course; continue even if feeling better" },
    ],
    },

    {
      name: "Inosine Pranobex",
      slug: "inosine-pranobex",
      abbreviation: "IPNB",
      aliases: ["isoprinosine", "viropace", "imunovir", "inosine pranobex"],
      category: "antifungal",
      tagline: "Immunomodulator & antiviral — viral infections & immune enhancement",
      description: "Inosine pranobex is a purine derivative with dual immunomodulatory and antiviral properties. Enhances cellular and humoral immunity (T-lymphocyte function, NK cell activity), while inhibiting viral replication via interference with viral RNA translation. Used for subacute sclerosing panencephalitis, HPV, EBV, and recurrent herpes.",
      color: "#5B21B6",
      vial: "Oral tablet",
      recon: "500mg",
      startDose: "50mg/kg/day (typically 1500–3000mg/day in adults)",
      targetDose: "50–100mg/kg/day",
      frequency: "Three to four times daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "Enhances immune response against viral infections. Reduces recurrence of genital HPV/warts. Effective adjunct in recurrent herpes. Unique mechanism — immune-based antiviral approach.",
      tips: "Take with food. Causes transient uric acid elevation — adequate hydration important. Used in combination with conventional antivirals in severe viral infections.",
      sideEffects: "Elevated serum uric acid (may precipitate gout in susceptible individuals), mild GI symptoms.",
      watchOut: "Gout risk in hyperuricaemic patients. Avoid in severe renal failure. Avoid in patients on xanthine oxidase inhibitors without monitoring.",
      researchLevel: "Limited Research",
      tags: ["Antiviral", "Immunomodulator", "HPV", "Herpes", "Isoprinosine"],
      researchIndications: [
        { category: "Viral / Immune", effectiveness: "Moderate", items: [
          { title: "Genital HPV / Condylomata", description: "Reduces recurrence rate of genital warts and HPV-related lesions as adjunct to ablative therapy." },
          { title: "Subacute Sclerosing Panencephalitis", description: "Only drug with evidence of slowing SSPE progression — prolongs survival in this rare encephalitis." },
          { title: "Recurrent Herpes Labialis", description: "Reduces frequency of cold sore outbreaks in immunocompetent patients with recurrent HSV-1." },
        ]},
      ],
      indianBrands: [
        { brand: "Viropace 500" },
      ],
    ukBrands: [
      { brand: "Imunovir 500mg", manufacturer: "Newport Industries", notes: "Prescription — SSPE, mucocutaneous herpes" },
    ],
    usBrands: [
      { brand: "Not FDA approved", notes: "Not licensed in the United States" },
    ],
    canadaBrands: [
      { brand: "Not approved", notes: "Not licensed by Health Canada" },
    ],
    
    overview: {
      whatIsIt: "Inosine pranobex (isoprinosine, methisoprinol) is an immunostimulant and antiviral used for viral infections and immunodeficiency states. It combines inosine with p-acetamidobenzoic acid and dimethylaminoisopropanol in a 1:3 ratio. Approved in several countries for recurrent herpes simplex, genital warts (HPV), and as immunomodulatory adjunct therapy.",
      keyBenefits: "Enhances T-lymphocyte and NK cell function in viral infections. Reduces recurrence frequency in recurrent oral and genital herpes. Adjunct therapy for HPV-associated lesions (genital warts, cervical dysplasia). Studied in COVID-19 as an immunostimulant. Long safety record in Eastern European and Irish markets.",
      mechanismOfAction: "The inosine component is a natural purine nucleoside that supports T-lymphocyte differentiation and proliferation. The amine salt component modulates cytokine production. Together, they enhance cell-mediated immunity: increase IL-2 production, enhance T-helper and T-cytotoxic cell function, boost NK cell activity, and promote interferon production. The antiviral mechanism involves inhibiting viral RNA synthesis by providing inosine as a competitive alternative substrate.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "3.5h (metabolites excreted as uric acid)", cleared: "12–24h" },
    researchProtocols: [
      { goal: "Recurrent Herpes Simplex (treatment)", dose: "1g four times daily × 7–10 days", frequency: "Four times daily", route: "Oral" },
      { goal: "HPV / Genital Warts (adjunct)", dose: "1g three times daily × 14–28 days", frequency: "Three times daily", route: "Oral" },
      { goal: "Immunomodulation / Viral Infections", dose: "50mg/kg/day in divided doses", frequency: "Three to four times daily", route: "Oral" },
    ],
    interactions: [
      { name: "Allopurinol (both increase uric acid — gout risk in predisposed patients)", status: "caution" },
      { name: "Immunosuppressants (theoretical immune function antagonism)", status: "caution" },
    ],
    sideEffectNotes: [
      "Elevated uric acid — inosine metabolised to uric acid; avoid in gout or hyperuricaemia",
      "Nausea and GI discomfort — take with food",
      "Generally well tolerated",
    ],
    faq: [
      { question: "Is inosine pranobex effective for genital warts?", answer: "Inosine pranobex has been used as an adjunct to physical treatments (cryotherapy, laser, excision) for genital warts (HPV condylomata) in countries where it is licensed. Evidence from clinical trials is generally positive but heterogeneous in quality. It is thought to enhance cellular immunity against HPV, reducing recurrence after physical treatment. It is not a primary treatment on its own but is considered a useful adjunct in Europe and India." },
      { question: "Can inosine pranobex be used for recurrent cold sores?", answer: "Yes — inosine pranobex is used for recurrent HSV-1 (cold sores/labialis) and HSV-2 (genital herpes) in countries where it is licensed. It appears to reduce the frequency and severity of recurrences through immune stimulation. Evidence is more modest than for valacyclovir suppressive therapy, but it provides an alternative particularly in patients who prefer immunostimulant approaches or have side effects from antivirals." },
      { question: "Why is inosine pranobex not available everywhere?", answer: "Inosine pranobex was approved in several countries (Ireland, UK — through a named patient/specials route, Eastern Europe, India, South America) before modern rigorous trial standards. Many regulatory agencies (FDA, EMA for new approvals) require larger Phase 3 trials demonstrating efficacy and safety that have not been conducted for this older compound. It remains available where it was historically licensed but has not received new major market approvals." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Not licensed as a standard medicine; available as a named patient product or special in some cases" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Imunovir, Isoprinosine — licensed for herpes and viral infections" },
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Not FDA-approved; available as research compound or in imported products" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Not licensed; available through compassionate access" },
    ],
    expectTimeline: [
      { timeframe: "7–14 days", description: "Active viral infection episodes shorter/milder" },
      { timeframe: "1–3 months", description: "Immunostimulant benefit for recurrence reduction" },
    ],
    },

    // ─── ANTIBIOTICS & ANTIPARASITIC (additions) ─────────────────────────────

    {
      name: "Amoxicillin + Clavulanic Acid",
      slug: "amoxicillin-clavulanate",
      abbreviation: "AUGM",
      aliases: ["augmentin", "augmine", "amoxyclav", "amoxicillin-clavulanate"],
      category: "antibiotic",
      tagline: "Beta-lactam + inhibitor — broad-spectrum respiratory & urinary infections",
      description: "Fixed-dose combination of amoxicillin with clavulanic acid (a beta-lactamase inhibitor). Clavulanate inhibits bacterial beta-lactamase enzymes, restoring amoxicillin activity against resistant organisms including MRSA-adjacent Staph, H. influenzae, E. coli, and Klebsiella. Broader spectrum than amoxicillin alone.",
      color: "#166534",
      vial: "Oral tablet",
      recon: "375mg (250/125mg), 625mg (500/125mg), 1000mg (875/125mg)",
      startDose: "625mg twice daily",
      targetDose: "625mg three times daily or 1000mg twice daily",
      frequency: "Two to three times daily",
      route: "Oral",
      storage: "Room temperature; refrigerate reconstituted suspension",
      benefits: "Covers beta-lactamase-producing organisms that amoxicillin misses. Effective for URTI, LRTI, UTI, skin/soft tissue, and dental infections. Well-absorbed orally.",
      tips: "Take with food — significantly reduces GI side effects. Clavulanic acid causes GI upset (nausea, diarrhoea) — the most common reason patients discontinue. XR (extended-release) formulation available for ABRS.",
      sideEffects: "Diarrhoea, nausea, vomiting (more than amoxicillin alone). Candida superinfection. Hepatotoxicity (rare).",
      watchOut: "Hepatotoxicity risk (mainly clavulanic acid component) — monitor if prolonged use or liver disease. Penicillin allergy cross-reactivity. C. difficile risk with prolonged use.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Beta-Lactam", "Augmentin", "Respiratory", "UTI"],
      researchIndications: [
        { category: "Bacterial Infections", effectiveness: "Most Effective", items: [
          { title: "Community-Acquired Pneumonia", description: "First-line for mild to moderate CAP caused by typical and atypical organisms (with macrolide)." },
          { title: "Acute Bacterial Rhinosinusitis", description: "Recommended for moderate/severe ABRS or treatment failure after initial observation." },
          { title: "Skin & Soft Tissue Infections", description: "Covers MSSA, Streptococcus, and anaerobes in polymicrobial SSTIs." },
        ]},
      ],
      indianBrands: [
        { brand: "Augmine 375" },
        { brand: "Augmine 625" },
        { brand: "Augmine 1000" },
        { brand: "Augmed 625" },
        { brand: "Augpen 625" },
        { brand: "Joyclav 625" },
      ],
    ukBrands: [
      { brand: "Augmentin 375mg / 625mg", manufacturer: "GSK" },
      { brand: "Co-amoxiclav (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Augmentin 250mg / 500mg / 875mg", manufacturer: "GSK" },
      { brand: "Augmentin XR 1000mg ER", manufacturer: "GSK" },
    ],
    canadaBrands: [
      { brand: "Clavulin 125mg / 250mg / 500mg", manufacturer: "GSK" },
    ],
    
    overview: {
      whatIsIt: "Amoxicillin-clavulanate (co-amoxiclav, Augmentin) combines amoxicillin (a broad-spectrum aminopenicillin) with clavulanic acid (a beta-lactamase inhibitor) to protect amoxicillin from destruction by beta-lactamase-producing bacteria. This extends coverage to include most beta-lactamase-producing organisms including Staphylococcus aureus, H. influenzae, Moraxella, and Gram-negative bacilli.",
      keyBenefits: "Broad-spectrum coverage including community-acquired beta-lactamase-producing organisms. First-line for many respiratory, dental, skin, and urinary tract infections. Available in multiple formulations (oral, IV). Oral bioavailability >90%. Lower rates of Clostridioides difficile compared to fluoroquinolones. Paediatric suspension widely used.",
      mechanismOfAction: "Amoxicillin inhibits transpeptidase enzymes (penicillin-binding proteins) in the bacterial cell wall synthesis pathway, causing bactericidal lysis. Clavulanic acid is a beta-lactam that binds irreversibly to beta-lactamase enzymes (which would otherwise destroy amoxicillin), protecting amoxicillin from degradation and restoring its activity against beta-lactamase-producing organisms.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "Amoxicillin: 1–1.5h; Clavulanic acid: 1h", cleared: "8h" },
    researchProtocols: [
      { goal: "Respiratory Infections (community-acquired)", dose: "625mg (500/125mg) three times daily or 1g (875/125mg) twice daily", frequency: "Twice or three times daily × 5–7 days", route: "Oral" },
      { goal: "Dental / Skin / Soft Tissue Infections", dose: "625mg three times daily × 5–7 days", frequency: "Three times daily", route: "Oral" },
      { goal: "Urinary Tract Infections", dose: "375–625mg three times daily × 3–7 days", frequency: "Three times daily", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (increased INR — penicillin class effect)", status: "monitor" },
      { name: "Methotrexate (reduced renal clearance)", status: "caution" },
      { name: "Oral contraceptives (historically reported reduced efficacy — not confirmed in trials)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Diarrhoea — most common (20–30% with higher-dose regimens); take with food",
      "Nausea — clavulanic acid component contributes significantly",
      "Hepatotoxicity — cholestatic jaundice with clavulanic acid component; rare but more common than amoxicillin alone; avoid in hepatic impairment",
      "Rash — 5–10%; ampicillin/amoxicillin rash (maculopapular) in EBV mononucleosis (not true allergy)",
    ],
    faq: [
      { question: "Why is co-amoxiclav (Augmentin) used instead of amoxicillin alone?", answer: "Many bacteria (particularly Staphylococcus aureus, H. influenzae, Moraxella catarrhalis, and many Gram-negative bacteria) produce beta-lactamase enzymes that destroy amoxicillin. Clavulanic acid inhibits these enzymes, restoring amoxicillin's activity. Co-amoxiclav is therefore prescribed when the infecting organism is likely to be beta-lactamase-producing — for example, recurrent or failed amoxicillin courses, dental infections, skin and soft tissue infections, and community-acquired pneumonia." },
      { question: "How can I reduce diarrhoea from amoxicillin-clavulanate?", answer: "Always take with food — this reduces nausea and GI side effects. Clavulanic acid stimulates GI motility directly, causing diarrhoea. Probiotic supplementation (Lactobacillus acidophilus, Saccharomyces boulardii) taken simultaneously with the antibiotic course reduces antibiotic-associated diarrhoea. If diarrhoea is severe or bloody, stop and seek medical review for C. difficile testing." },
      { question: "Can amoxicillin-clavulanate treat MRSA?", answer: "No — MRSA has altered penicillin-binding proteins (PBP2a, encoded by mecA gene) that do not bind beta-lactams. Clavulanic acid cannot overcome this resistance mechanism. For MRSA skin infections, oral trimethoprim-sulfamethoxazole (TMP-SMX) or doxycycline are preferred. For serious MRSA infections, IV vancomycin or daptomycin are required." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Augmentin — respiratory, ear, skin, and urinary infections; multiple formulations" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Augmentin — first-line for many community infections; widely prescribed" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Augmentin, Moxikind-CV, Clavam — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Clavulin, Apo-Amoxi-Clav — licensed for respiratory and other infections" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptomatic improvement in most bacterial infections" },
      { timeframe: "5–7 days", description: "Full treatment course for most infections; continue full course" },
    ],
    },

    {
      name: "Ciprofloxacin",
      slug: "ciprofloxacin",
      abbreviation: "CIP",
      aliases: ["ciprobay", "cyflox", "ciprofloxacin 500", "cifran"],
      category: "antibiotic",
      tagline: "Fluoroquinolone — gram-negative UTI, GI & systemic infections",
      description: "Ciprofloxacin is a second-generation fluoroquinolone that inhibits DNA gyrase and topoisomerase IV, disrupting bacterial DNA replication. Excellent gram-negative coverage. Oral bioavailability nearly 80% — effective oral option for systemic infections. Used for UTI, GI infections, RTIs, and anthrax prophylaxis.",
      color: "#166534",
      vial: "Oral tablet / IV infusion / Eye drops",
      recon: "250mg, 500mg, 750mg tablets; 2mg/mL IV",
      startDose: "250–500mg twice daily (UTI); 500–750mg twice daily (systemic)",
      targetDose: "500–750mg twice daily",
      frequency: "Twice daily",
      route: "Oral or IV",
      storage: "Room temperature; protect from light",
      benefits: "Broad gram-negative activity (Pseudomonas coverage). High oral bioavailability allows IV-to-oral switch. Effective for traveller's diarrhoea. Anthrax prophylaxis (post-exposure).",
      tips: "Avoid with antacids, iron, calcium — reduce absorption by 50%. Take 2 hours before or 6 hours after. Avoid in children and adolescents if possible (cartilage toxicity in animal studies — rare in humans).",
      sideEffects: "GI upset, headache, dizziness, photosensitivity. Class: QTc prolongation, tendinopathy/tendon rupture (Achilles), peripheral neuropathy, CNS effects (rare).",
      watchOut: "Tendinopathy risk — especially with concurrent corticosteroids in elderly. QTc prolongation. Avoid in myasthenia gravis. Resistance emerging in community UTIs.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Fluoroquinolone", "UTI", "Gram-Negative"],
      researchIndications: [
        { category: "Bacterial Infections", effectiveness: "Most Effective", items: [
          { title: "Complicated UTI / Pyelonephritis", description: "First-line oral treatment for complicated UTI and pyelonephritis (where resistance rates permit)." },
          { title: "Traveller's Diarrhoea", description: "750mg single dose effective for moderate to severe traveller's diarrhoea." },
          { title: "Pseudomonal Infections", description: "One of few oral antibiotics with reliable Pseudomonas aeruginosa activity." },
        ]},
      ],
      indianBrands: [
        { brand: "Cyflox 250" },
        { brand: "Cyflox 500" },
        { brand: "Cifran 500" },
      ],
    ukBrands: [
      { brand: "Ciproxin 250mg / 500mg / 750mg", manufacturer: "Bayer" },
      { brand: "Ciprofloxacin (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Cipro 250mg / 500mg / 750mg", manufacturer: "Bayer" },
      { brand: "Cipro XR 500mg / 1000mg ER", manufacturer: "Bayer" },
    ],
    canadaBrands: [
      { brand: "Cipro 250mg / 500mg / 750mg", manufacturer: "Bayer" },
    ],
    
    overview: {
      whatIsIt: "Ciprofloxacin is a second-generation fluoroquinolone antibiotic with broad-spectrum activity covering most Gram-negative bacteria, some Gram-positives (limited MRSA activity), and atypicals. Widely used for urinary tract infections, GI infections, respiratory infections, and bone/joint infections. Available oral and IV.",
      keyBenefits: "Very high oral bioavailability (~70–80%) — IV-equivalent oral dosing for most infections. Excellent tissue penetration including bone, prostate, and lungs. Activity against Pseudomonas aeruginosa (unusual for oral antibiotics). Covers enteric pathogens (Salmonella, Shigella, E. coli, Campylobacter). Rapid bactericidal activity via dual DNA gyrase and topoisomerase IV inhibition.",
      mechanismOfAction: "Inhibits bacterial DNA gyrase (topoisomerase II) and topoisomerase IV — enzymes essential for DNA replication, transcription, repair, and decatenation. Inhibiting these enzymes creates double-strand DNA breaks that are rapidly lethal to bacterial cells. The dual target mechanism reduces the probability of resistance (mutation in one target is insufficient).",
    },
    pharmacokinetics: { peak: "1–2h (oral)", halfLife: "4h", cleared: "24h" },
    researchProtocols: [
      { goal: "Uncomplicated UTI", dose: "250–500mg twice daily × 3–7 days", frequency: "Twice daily", route: "Oral" },
      { goal: "Complicated UTI / Pyelonephritis", dose: "500mg twice daily × 7–14 days", frequency: "Twice daily", route: "Oral" },
      { goal: "Respiratory / GI Infections", dose: "500–750mg twice daily × 5–10 days", frequency: "Twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Antacids, iron, calcium, zinc (chelate ciprofloxacin — reduce absorption by >90%; separate by 2h)", status: "timing" },
      { name: "Warfarin (CYP1A2 inhibition — INR increases; monitor)", status: "caution" },
      { name: "Theophylline (CYP1A2 inhibition — theophylline toxicity risk)", status: "caution" },
      { name: "QTc-prolonging drugs (additive QT prolongation)", status: "caution" },
    ],
    sideEffectNotes: [
      "Tendinopathy and tendon rupture — especially Achilles tendon; risk in elderly, on corticosteroids, or with renal impairment; FDA black box warning",
      "Peripheral neuropathy — potentially irreversible; stop immediately if tingling/numbness develops",
      "CNS effects (dizziness, insomnia, seizures, psychiatric) — black box warning",
      "QTc prolongation — avoid in cardiac arrhythmia",
      "C. difficile colitis — risk with any broad-spectrum antibiotic",
      "Photosensitivity — avoid excessive sun exposure",
    ],
    faq: [
      { question: "Why are fluoroquinolones like ciprofloxacin now restricted?", answer: "Regulatory agencies (FDA, EMA) have issued progressively stronger warnings about fluoroquinolones since 2008. FDA black box warnings cover tendon damage/rupture, peripheral neuropathy, CNS effects, and worsening myasthenia gravis. In 2016–2019, the FDA and EMA recommended restricting fluoroquinolones to infections with no alternative — particularly urinary tract infections (where nitrofurantoin or trimethoprim are safer first-line). The cumulative risk of serious, potentially irreversible side effects has driven this restriction." },
      { question: "Can I take ciprofloxacin with milk or antacids?", answer: "No — dairy products (milk, yoghurt) contain calcium that chelates ciprofloxacin in the GI tract, reducing absorption by 40–60%. Antacids (aluminium/magnesium hydroxide), iron supplements, zinc, and calcium supplements reduce ciprofloxacin bioavailability by up to 90%. Take ciprofloxacin at least 2 hours before or 6 hours after any of these products. Take with plain water on an empty stomach or with a light non-dairy meal." },
      { question: "What are the signs of ciprofloxacin tendon damage?", answer: "Warning signs include sudden pain, swelling, or tenderness in any tendon — most commonly the Achilles tendon (behind the heel) but also shoulder, hand, biceps, and thigh tendons. If you develop any of these symptoms, stop ciprofloxacin immediately and contact your doctor. Continuing the antibiotic after tendon pain begins significantly increases the risk of complete tendon rupture, which may require surgery. Risk is highest in patients >60 years, on corticosteroids, or with CKD." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Cipro — multiple indications; use restricted to infections without suitable alternatives per FDA 2016 guidance" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ciprofloxacin — EMA recommended restriction in 2018; second-line for uncomplicated UTI" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Ciplox, Cifran — widely prescribed; concerns about overuse and resistance" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Cipro — licensed with black box warnings similar to FDA" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptomatic improvement in UTI and GI infections" },
      { timeframe: "5–14 days", description: "Full course completion for complicated infections" },
    ],
    },

    {
      name: "Levofloxacin",
      slug: "levofloxacin",
      abbreviation: "LEVO",
      aliases: ["levaquin", "levoflox", "levofloxacin 500"],
      category: "antibiotic",
      tagline: "Respiratory fluoroquinolone — CAP, sinusitis & atypical infections",
      description: "Levofloxacin is the active L-isomer of ofloxacin. Third-generation fluoroquinolone with enhanced gram-positive coverage vs ciprofloxacin (including S. pneumoniae) while maintaining gram-negative activity. Called a 'respiratory quinolone' — preferred for community-acquired pneumonia when atypical coverage needed.",
      color: "#166534",
      vial: "Oral tablet / IV infusion",
      recon: "250mg, 500mg, 750mg tablets",
      startDose: "500mg once daily",
      targetDose: "500–750mg once daily",
      frequency: "Once daily",
      route: "Oral or IV",
      storage: "Room temperature",
      benefits: "Once-daily dosing (vs ciprofloxacin twice daily). Superior gram-positive coverage. Covers atypicals (Mycoplasma, Chlamydophila, Legionella). First-line CAP with penicillin allergy. Active against multi-drug-resistant TB (off-label).",
      tips: "Same food/drug interactions as ciprofloxacin. Avoid antacids. Once-daily dosing improves adherence vs twice-daily fluoroquinolones.",
      sideEffects: "Same class warnings as ciprofloxacin — tendinopathy, QTc prolongation, peripheral neuropathy, CNS effects. GI upset.",
      watchOut: "Same fluoroquinolone class warnings. Reserve for when no safer alternative exists — fluoroquinolones should not be first-line for simple infections.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Fluoroquinolone", "Respiratory", "CAP"],
      researchIndications: [
        { category: "Respiratory Infections", effectiveness: "Most Effective", items: [
          { title: "Community-Acquired Pneumonia", description: "Monotherapy for CAP — covers typical and atypical pathogens. 5-day 750mg course non-inferior to 10-day 500mg." },
          { title: "Acute Bacterial Sinusitis", description: "Effective for ABRS when first-line agents (amoxicillin-clavulanate) fail or allergy present." },
          { title: "Complicated UTI / Pyelonephritis", description: "750mg once daily for 5 days — non-inferior to 10-day conventional regimens." },
        ]},
      ],
      indianBrands: [
        { brand: "Levoflox 250" },
        { brand: "Levoflox 500" },
        { brand: "Levoflox 750" },
      ],
    ukBrands: [
      { brand: "Tavanic 250mg / 500mg", manufacturer: "Sanofi" },
      { brand: "Levofloxacin (generic)", notes: "Widely available" },
    ],
    usBrands: [
      { brand: "Levaquin 250mg / 500mg / 750mg", manufacturer: "Janssen", notes: "Brand discontinued; generics widely available" },
      { brand: "Levofloxacin (generic)", notes: "Multiple manufacturers" },
    ],
    canadaBrands: [
      { brand: "Levaquin 250mg / 500mg / 750mg", manufacturer: "Janssen" },
      { brand: "Levofloxacin (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Levofloxacin is the L-isomer (active enantiomer) of ofloxacin and a third-generation fluoroquinolone with expanded activity against Gram-positive organisms (including Streptococcus pneumoniae) and atypicals (Legionella, Mycoplasma, Chlamydia) compared to ciprofloxacin. First-line for community-acquired pneumonia and a key drug in TB regimens (reserve agent).",
      keyBenefits: "First-line for community-acquired pneumonia — covers all typical and atypical pathogens in a single drug. Once-daily dosing (long 6–8h half-life). Excellent oral bioavailability (~99%). Preferred over ciprofloxacin for Gram-positive respiratory pathogens. Key component of WHO-recommended TB treatment regimens (as a backbone drug in MDR-TB).",
      mechanismOfAction: "Inhibits DNA gyrase and topoisomerase IV — dual mechanism identical to ciprofloxacin but with greater Gram-positive affinity due to higher topoisomerase IV inhibitory potency. More active against S. pneumoniae, Staphylococci, and Streptococci than ciprofloxacin. Rapid bactericidal activity.",
    },
    pharmacokinetics: { peak: "1–2h", halfLife: "6–8h", cleared: "24–48h" },
    researchProtocols: [
      { goal: "Community-Acquired Pneumonia (outpatient)", dose: "500mg once daily × 7–10 days", frequency: "Once daily", route: "Oral" },
      { goal: "Community-Acquired Pneumonia (severe/inpatient)", dose: "750mg once daily × 5 days", frequency: "Once daily", route: "Oral or IV" },
      { goal: "Complicated UTI / Pyelonephritis", dose: "250–500mg once daily × 7–10 days", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Antacids, iron, calcium (chelation — reduce absorption; separate by 2h)", status: "timing" },
      { name: "Warfarin (CYP1A2 inhibition — INR elevation)", status: "monitor" },
      { name: "QTc-prolonging drugs (additive)", status: "caution" },
      { name: "NSAIDs (increased seizure risk at high doses)", status: "caution" },
    ],
    sideEffectNotes: [
      "Tendinopathy/tendon rupture — Achilles tendon risk; FDA/EMA black box warning",
      "Peripheral neuropathy — potentially irreversible; stop at first signs",
      "QTc prolongation — avoid in arrhythmia, hypokalaemia",
      "Hyperglycaemia/hypoglycaemia — in diabetic patients on antidiabetics",
      "Photosensitivity — strong; use sun protection",
    ],
    faq: [
      { question: "Is levofloxacin better than ciprofloxacin for pneumonia?", answer: "Yes — levofloxacin is preferred over ciprofloxacin for community-acquired pneumonia because it has better coverage of Streptococcus pneumoniae (the most common CAP pathogen) and equivalent coverage of atypicals (Legionella, Mycoplasma, Chlamydia). Ciprofloxacin has poor pneumococcal coverage. Both fluoroquinolones are considered respiratory quinolones, but levofloxacin is the preferred option for this indication in most guidelines." },
      { question: "How is levofloxacin used in tuberculosis treatment?", answer: "Levofloxacin is a Group A drug in WHO guidelines for multidrug-resistant TB (MDR-TB) — the highest priority class based on evidence. It replaces first-line agents like rifampicin or isoniazid in MDR-TB regimens. Doses for TB are higher (750–1000mg/day) than for standard infections. Fluoroquinolone resistance in TB is a growing concern, underscoring the importance of susceptibility testing." },
      { question: "Can levofloxacin cause blood sugar problems?", answer: "Yes — levofloxacin and other fluoroquinolones can cause dysglycaemia (both hypoglycaemia and hyperglycaemia), particularly in diabetic patients on antidiabetic medications. The mechanism involves inhibition of pancreatic KATP channels. Diabetic patients should monitor blood glucose more closely during levofloxacin courses. Severe hypoglycaemia (sometimes requiring hospitalisation) has been reported." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Levaquin — CAP, HAP, UTI, skin infections, anthrax (post-exposure); generic available" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Tavanic — CAP, complicated UTI, skin infections; black box warnings apply" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Levoflox, Levomac, Tavanic — widely used" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Levaquin — licensed with fluoroquinolone class warnings" },
    ],
    expectTimeline: [
      { timeframe: "48–72 hours", description: "Fever and symptom improvement in pneumonia" },
      { timeframe: "5–10 days", description: "Full treatment course; do not stop early" },
    ],
    },

    {
      name: "Cephalexin",
      slug: "cephalexin",
      abbreviation: "CEPH",
      aliases: ["keflex", "sporidex", "phexin", "cephalexin 500"],
      category: "antibiotic",
      tagline: "First-generation cephalosporin — skin, soft tissue & strep infections",
      description: "Cephalexin is a first-generation cephalosporin that inhibits cell wall synthesis by binding penicillin-binding proteins. Active against gram-positive cocci (S. aureus MSSA, S. pyogenes) and some gram-negative (E. coli, Klebsiella, Proteus). First-line for skin and soft tissue infections, streptococcal pharyngitis (penicillin alternative), and uncomplicated UTI.",
      color: "#166534",
      vial: "Oral capsule / tablet / liquid",
      recon: "250mg, 500mg, 1000mg capsules",
      startDose: "500mg twice daily (skin); 1–4g/day (depending on infection severity)",
      targetDose: "500mg four times daily (standard)",
      frequency: "Two to four times daily",
      route: "Oral",
      storage: "Room temperature; refrigerate liquid",
      benefits: "Reliable activity against MSSA and Streptococcus. Excellent safety profile. Available as liquid for children. Low cost and widely available. Preferred penicillin-allergic alternative for SSTI.",
      tips: "Not active against MRSA — use clindamycin or TMP-SMX for suspected MRSA. Take with or without food. Complete the full course. UTI: 500mg twice daily for 7–14 days.",
      sideEffects: "GI upset (nausea, diarrhoea), headache. Hypersensitivity rash. C. difficile risk (lower than broad-spectrum agents).",
      watchOut: "5–10% cross-reactivity with penicillin allergy in true IgE-mediated allergy. Not effective against MRSA, Enterococcus, or most anaerobes.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Cephalosporin", "SSTI", "Skin Infection"],
      researchIndications: [
        { category: "Bacterial Infections", effectiveness: "Most Effective", items: [
          { title: "Skin & Soft Tissue Infections", description: "First-line for non-purulent cellulitis (Streptococcus/MSSA); 500mg QID for 5–7 days." },
          { title: "Streptococcal Pharyngitis", description: "10-day course — approved penicillin alternative with comparable strep eradication rates." },
          { title: "Uncomplicated UTI", description: "Effective for E. coli and Klebsiella UTI where local resistance rates permit." },
        ]},
      ],
      indianBrands: [
        { brand: "Sporidex 250" },
        { brand: "Sporidex 500" },
        { brand: "Phexin 250" },
        { brand: "Phexin 500" },
        { brand: "Cephalexin 500" },
      ],
    ukBrands: [
      { brand: "Keflex 250mg / 500mg", manufacturer: "Flynn Pharma" },
      { brand: "Ceporex 125mg / 250mg / 500mg", notes: "Legacy brand" },
    ],
    usBrands: [
      { brand: "Keflex 250mg / 333mg / 500mg / 750mg", manufacturer: "Shionogi" },
      { brand: "Cephalexin (generic)", notes: "Widely available" },
    ],
    canadaBrands: [
      { brand: "Keflex 250mg / 500mg", manufacturer: "Takeda" },
      { brand: "Cephalexin (generic)", notes: "Available from multiple manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Cephalexin is a first-generation cephalosporin antibiotic with excellent activity against Gram-positive organisms (MSSA, Streptococcus) and modest Gram-negative coverage. The most widely prescribed oral cephalosporin for skin, soft tissue, and minor respiratory infections. Available in capsules and suspension.",
      keyBenefits: "Excellent activity against MSSA (methicillin-sensitive Staphylococcus aureus) and Streptococcal species — first-line for cellulitis, impetigo, and folliculitis. Safe in penicillin allergy (3–5% cross-reactivity with true penicillin allergy). Well tolerated and inexpensive. Safe in pregnancy (Category B). Used for surgical prophylaxis in orthopaedic procedures.",
      mechanismOfAction: "Inhibits bacterial cell wall synthesis by binding to PBPs (penicillin-binding proteins), preventing cross-linking of peptidoglycan chains. Bactericidal. Resistant to some beta-lactamases but not extended-spectrum beta-lactamases (ESBLs). First-generation cephalosporins have better Gram-positive coverage than second/third-generation at the cost of Gram-negative breadth.",
    },
    pharmacokinetics: { peak: "1h", halfLife: "0.9–1.2h", cleared: "8h" },
    researchProtocols: [
      { goal: "Skin/Soft Tissue Infections (cellulitis, impetigo)", dose: "500mg four times daily × 5–7 days", frequency: "Four times daily", route: "Oral" },
      { goal: "Streptococcal Pharyngitis", dose: "500mg twice daily × 10 days", frequency: "Twice daily", route: "Oral" },
      { goal: "UTI (uncomplicated, Gram-positive)", dose: "250–500mg four times daily × 3–7 days", frequency: "Four times daily", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (minor INR increase — monitor)", status: "monitor" },
      { name: "Probenecid (reduces renal tubular secretion — increases levels)", status: "monitor" },
    ],
    sideEffectNotes: [
      "GI effects (diarrhoea, nausea) — take with food",
      "Rash — cross-reactivity with penicillin allergy is 3–5%; avoid in anaphylaxis-level penicillin allergy",
      "C. difficile — lower risk than broad-spectrum antibiotics",
    ],
    faq: [
      { question: "Can cephalexin treat MRSA?", answer: "No — cephalexin and all cephalosporins are inactive against MRSA (methicillin-resistant Staphylococcus aureus). MRSA has acquired PBP2a (mecA-encoded) which does not bind beta-lactams. For MRSA skin infections, trimethoprim-sulfamethoxazole, doxycycline, or clindamycin are the oral alternatives. For serious MRSA infections, IV vancomycin or daptomycin are required." },
      { question: "If I'm allergic to penicillin, can I take cephalexin?", answer: "The cross-reactivity between penicillins and cephalosporins (estimated 3–5%) is much lower than historically feared. For most types of penicillin reactions (rash, minor reactions), cephalosporins including cephalexin are safe. The exception is prior penicillin anaphylaxis — in this case, avoid all cephalosporins without allergy specialist assessment. The side-chain similarity between penicillins and cephalosporins determines cross-reactivity — amoxicillin-allergic patients have higher risk with certain cephalosporins (cefadroxil, cefprozil)." },
      { question: "How does cephalexin compare to amoxicillin?", answer: "For Streptococcal infections (pharyngitis, impetigo, cellulitis), cephalexin and amoxicillin have similar efficacy. Cephalexin covers MSSA better than amoxicillin (important for cellulitis where S. aureus is common). Amoxicillin has better coverage of Gram-negative organisms relevant to UTIs. Neither covers MRSA. Cephalexin is preferred for skin infections in most guidelines when MRSA is unlikely." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Keflex — skin, respiratory, UTI, bone infections; generic widely available" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ceporex — licensed for skin and soft tissue, respiratory, UTI" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Cefalexin, Sporidex — widely available" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Keflex, generic cephalexin — licensed for various bacterial infections" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptomatic improvement in skin and soft tissue infections" },
      { timeframe: "5–10 days", description: "Full course completion" },
    ],
    },

    {
      name: "Cefixime",
      slug: "cefixime",
      abbreviation: "CEFI",
      aliases: ["suprax", "cefixime 200", "johncef"],
      category: "antibiotic",
      tagline: "Third-generation cephalosporin — UTI, gonorrhoea & typhoid",
      description: "Cefixime is an oral third-generation cephalosporin with excellent gram-negative coverage but limited gram-positive activity. Active against most Enterobacteriaceae, Neisseria gonorrhoeae, and Haemophilus influenzae. Preferred for uncomplicated UTI, gonorrhoea (where sensitivity permits), and typhoid fever step-down.",
      color: "#166534",
      vial: "Oral tablet / capsule / suspension",
      recon: "100mg, 200mg, 400mg",
      startDose: "200mg twice daily or 400mg once daily",
      targetDose: "400mg/day",
      frequency: "Once or twice daily",
      route: "Oral",
      storage: "Room temperature; refrigerate reconstituted suspension",
      benefits: "Oral third-generation cephalosporin — unique position for moderate-severity gram-negative infections. Covers most UTI pathogens. Effective step-down for typhoid after IV ceftriaxone. Used for gonorrhoea (with azithromycin).",
      tips: "Take with or without food. For gonorrhoea: single 400mg dose + azithromycin 1g (dual therapy). For UTI: 200mg twice daily for 3–7 days.",
      sideEffects: "GI upset, diarrhoea (loose stools more common than with first-gen cephalosporins), headache.",
      watchOut: "Limited gram-positive activity — not for Staph infections. Avoid as empiric monotherapy for gonorrhoea in areas with fluoroquinolone resistance patterns — check local guidelines.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Cephalosporin", "UTI", "Gonorrhoea"],
      researchIndications: [
        { category: "Bacterial Infections", effectiveness: "Most Effective", items: [
          { title: "Uncomplicated UTI", description: "Highly effective for gram-negative UTIs (E. coli, Klebsiella) in community settings." },
          { title: "Gonorrhoea", description: "400mg single dose + azithromycin 1g for uncomplicated gonococcal infection (where susceptible)." },
          { title: "Typhoid Fever (Step-Down)", description: "Oral step-down therapy after IV treatment. 200mg twice daily for 14 days." },
        ]},
      ],
      indianBrands: [
        { brand: "Johncef 100" },
        { brand: "Johncef 200" },
        { brand: "Cefixime 200" },
      ],
    ukBrands: [
      { brand: "Suprax 200mg / 400mg", manufacturer: "Sanofi" },
    ],
    usBrands: [
      { brand: "Suprax 400mg", manufacturer: "Lupin" },
      { brand: "Suprax 100mg/5ml suspension", manufacturer: "Lupin" },
    ],
    canadaBrands: [
      { brand: "Not commercially marketed", notes: "Not widely available in Canada; use cephalexin or amoxicillin instead" },
    ],
    
    overview: {
      whatIsIt: "Cefixime is an oral third-generation cephalosporin with excellent coverage of Gram-negative bacteria including H. influenzae, Moraxella catarrhalis, E. coli, and Klebsiella. Previously first-line for uncomplicated gonorrhoea; now second-line due to resistance. First-line for typhoid fever treatment in outpatient settings in many countries.",
      keyBenefits: "Only oral third-generation cephalosporin widely available — covers most Gram-negative enteric pathogens. Once or twice-daily dosing. Effective for typhoid fever (Salmonella typhi — highly relevant in South Asia). Good urinary tract concentrations. Used for respiratory infections due to H. influenzae/Moraxella.",
      mechanismOfAction: "Binds PBPs (penicillin-binding proteins) in Gram-negative bacteria with higher affinity than first/second-generation cephalosporins. Stable against most common beta-lactamases but susceptible to ESBLs. Bactericidal activity against susceptible organisms via cell wall synthesis inhibition.",
    },
    pharmacokinetics: { peak: "2–6h", halfLife: "3–4h", cleared: "24h" },
    researchProtocols: [
      { goal: "Typhoid Fever", dose: "20mg/kg/day (max 400mg)", frequency: "Once or twice daily × 14 days", route: "Oral" },
      { goal: "Gonorrhoea (now second-line)", dose: "400mg single dose (with azithromycin)", frequency: "Single dose", route: "Oral" },
      { goal: "Respiratory / UTI Infections", dose: "400mg once daily or 200mg twice daily × 5–10 days", frequency: "Once or twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "Warfarin (some INR increase)", status: "monitor" },
      { name: "Carbamazepine (cefixime may increase carbamazepine levels)", status: "monitor" },
    ],
    sideEffectNotes: [
      "Diarrhoea — most common (6–16%); take with food",
      "Nausea and abdominal discomfort",
      "Rash — 1–2%; cross-reactivity with penicillin allergy (same as other cephalosporins)",
    ],
    faq: [
      { question: "Is cefixime still used for gonorrhoea?", answer: "Cefixime 400mg single dose was previously recommended for uncomplicated gonorrhoea, but rising resistance (particularly in Asia and Europe) has relegated it to a secondary option. Current WHO and CDC guidelines recommend injectable ceftriaxone 500mg–1g as first-line for gonorrhoea due to superior efficacy and lower resistance rates. If ceftriaxone is unavailable, cefixime with azithromycin combination is used. Susceptibility testing is recommended." },
      { question: "How effective is cefixime for typhoid fever?", answer: "Cefixime is the preferred oral antibiotic for uncomplicated typhoid fever in outpatient settings in South Asia and other endemic regions. A 14-day course achieves cure rates of approximately 90%. It is more effective than older first-line agents (chloramphenicol, ampicillin, TMP-SMX) in areas with high resistance. For complicated or severe typhoid, IV ceftriaxone remains the gold standard." },
      { question: "Can children take cefixime?", answer: "Yes — cefixime is approved for children ≥6 months (oral suspension). The dose is 8mg/kg/day as a single dose or 4mg/kg twice daily. It is used in children for otitis media, pharyngitis, UTI, and typhoid fever. The cherry-flavoured oral suspension improves palatability for children. Dose adjustment is required if eGFR <20 mL/min." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Suprax — otitis media, pharyngitis, uncomplicated UTI, gonorrhoea (secondary)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Generic cefixime — respiratory and urinary infections; not commonly used" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Taxim-O, Cefix, Zifi — one of the most prescribed oral antibiotics in India (typhoid, UTI, respiratory)" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Suprax — licensed for various bacterial infections" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Fever subsidence in typhoid and respiratory infections" },
      { timeframe: "14 days", description: "Full typhoid treatment course; 5–7 days for other infections" },
    ],
    },

    {
      name: "Mebendazole",
      slug: "mebendazole",
      abbreviation: "MBZ",
      aliases: ["vermox", "mebex", "mebendazole 100"],
      category: "antibiotic",
      tagline: "Antihelminthic — intestinal worm infections",
      description: "Mebendazole inhibits microtubule polymerisation in susceptible helminths, impairing glucose uptake and causing worm death. Active against roundworm, whipworm, hookworm, pinworm, and many tapeworm species. Minimal systemic absorption — acts locally in the gut.",
      color: "#166534",
      vial: "Oral tablet / chewable tablet",
      recon: "100mg tablet",
      startDose: "100mg single dose (pinworm); 100mg twice daily × 3 days (roundworm/whipworm)",
      targetDose: "Indication-specific",
      frequency: "Single dose to three-day courses depending on parasite",
      route: "Oral (may be chewed or swallowed)",
      storage: "Room temperature",
      benefits: "Broad antihelminthic spectrum. Very low systemic absorption — minimal systemic side effects. Single dose effective for pinworm (highly prevalent in children). Repeat treatment after 2 weeks for reinfection prevention.",
      tips: "For pinworm: treat all household members simultaneously. Repeat dose at 2 weeks to catch hatched eggs. Can be taken with or without food. Fatty meals marginally increase absorption (not clinically significant).",
      sideEffects: "Generally well tolerated. Abdominal pain, diarrhoea, nausea during heavy worm load treatment (dying worms). Systemic side effects rare due to low absorption.",
      watchOut: "Avoid in first trimester of pregnancy. Rare: transient LFT elevation with prolonged high-dose use. Not effective against protozoal infections.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Antihelminthic", "Worm", "Pinworm", "Roundworm"],
      researchIndications: [
        { category: "Parasitic Infections", effectiveness: "Most Effective", items: [
          { title: "Enterobiasis (Pinworm)", description: "Single 100mg dose: >90% cure rate. Repeat at 2 weeks. Treat all household contacts simultaneously." },
          { title: "Ascariasis (Roundworm)", description: "100mg twice daily for 3 days achieves >95% cure in ascariasis." },
          { title: "Trichuriasis (Whipworm)", description: "3-day course: 68–90% cure in trichuriasis. Higher cure rates than single-dose regimens." },
        ]},
      ],
      indianBrands: [
        { brand: "Mebex 100" },
        { brand: "Mebex Suspension" },
      ],
    ukBrands: [
      { brand: "Vermox 100mg", manufacturer: "McNeil", notes: "OTC and Rx" },
    ],
    usBrands: [
      { brand: "Emverm 100mg", manufacturer: "Amneal" },
      { brand: "Vermox 100mg", manufacturer: "McNeil" },
    ],
    canadaBrands: [
      { brand: "Not approved by Health Canada", notes: "Compassionate access may be available; albendazole used as alternative" },
    ],
    
    overview: {
      whatIsIt: "Mebendazole is a benzimidazole anthelmintic effective against most gastrointestinal helminths (intestinal worms) including roundworm, hookworm, whipworm, enterobiasis (pinworm/threadworm), and strongyloidiasis. Available OTC in many countries as a single 100mg tablet for threadworm. Investigated as an anticancer agent (repurposing research).",
      keyBenefits: "Broad-spectrum anthelmintic covering most common intestinal worm infections. Single 100mg tablet (OTC) for threadworm — simplest treatment available. Well tolerated with minimal side effects (low systemic absorption). Effective in single-dose regimens for threadworm and ascariasis. WHO essential medicine for mass deworming programmes.",
      mechanismOfAction: "Selectively inhibits beta-tubulin polymerisation in helminths, disrupting microtubule assembly and impairing glucose uptake and cellular transport. This causes depletion of helminth glycogen stores and failure of cytoskeletal integrity — leading to paralysis and death of adult worms over 1–3 days. Worms are then expelled in faeces. Has poor systemic absorption, confining activity to the GI lumen.",
    },
    pharmacokinetics: { peak: "2–4h (plasma peak modest due to low absorption)", halfLife: "3–6h (systemically absorbed fraction)", cleared: "24–48h" },
    researchProtocols: [
      { goal: "Enterobiasis (threadworm/pinworm)", dose: "100mg single dose; repeat after 2 weeks", frequency: "Single dose × 2 (2 weeks apart)", route: "Oral" },
      { goal: "Ascariasis / Hookworm / Trichuriasis", dose: "100mg twice daily × 3 days (or 500mg single dose)", frequency: "Twice daily × 3 days", route: "Oral" },
    ],
    interactions: [
      { name: "Cimetidine (increases mebendazole plasma levels — possible benefit in systemic helminth infections)", status: "monitor" },
      { name: "Metronidazole concurrent use (Stevens-Johnson syndrome — do not combine)", status: "avoid" },
    ],
    sideEffectNotes: [
      "GI effects — abdominal pain, diarrhoea at high doses or heavy worm burden (dying worms in the gut)",
      "Generally very well tolerated at OTC doses",
      "Contraindicated in pregnancy (first trimester) — teratogenic in high doses in animal studies",
    ],
    faq: [
      { question: "Why does the whole family need to be treated for threadworm?", answer: "Threadworm (Enterobius vermicularis) spreads through ingestion of microscopic eggs deposited around the anus by the female worm at night. These eggs contaminate hands, bedding, and surfaces and are easily inhaled or ingested. In households, all members are typically reinfected from each other. All household members should be treated simultaneously with mebendazole 100mg and the dose repeated 2 weeks later to kill newly hatched worms. Rigorous hygiene (washing hands, cutting nails, changing bedding) is equally important." },
      { question: "Can mebendazole be taken during pregnancy?", answer: "Mebendazole is contraindicated in the first trimester due to theoretical teratogenicity (observed in high-dose animal studies). In the second and third trimesters, it may be used when the benefits outweigh risks — for example, in mass deworming programmes in endemic areas where hookworm infection causes significant anaemia. Discuss with your doctor if pregnant and requiring deworming." },
      { question: "Is mebendazole being studied as a cancer treatment?", answer: "Yes — mebendazole has attracted significant research interest as a potential anticancer agent. Its anti-tubulin mechanism disrupts microtubule assembly in tumour cells similarly to taxol/vinca alkaloids. Case reports, preclinical studies, and some early trials suggest activity in brain cancer (glioblastoma), thyroid cancer, and colorectal cancer. Clinical trials are ongoing. This is currently a repurposing research area — mebendazole is not an approved cancer therapy." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Emverm — approved for enterobiasis, ascariasis, hookworm, trichuriasis" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Ovex — OTC 100mg for threadworm; Vermox Rx for other helminths" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Mebex, Wormin — widely available OTC" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Vermox — licensed for intestinal nematodes" },
    ],
    expectTimeline: [
      { timeframe: "1–3 days", description: "Worm mortality; worms expelled over 3–5 days" },
      { timeframe: "2 weeks", description: "Second dose for threadworm (kills newly hatched worms)" },
    ],
    },

    {
      name: "Fenbendazole",
      slug: "fenbendazole",
      abbreviation: "FBZ",
      aliases: ["panacur", "fenbendazole 222mg", "fenben"],
      category: "antibiotic",
      tagline: "Veterinary antihelminthic — human off-label & experimental anti-cancer",
      description: "Fenbendazole is a benzimidazole antihelminthic primarily used in veterinary medicine. In humans, it has been used off-label for intestinal helminth infections. Recently gained attention for potential anticancer properties — inhibits microtubule polymerisation in cancer cells (similar to vincristine mechanism). The 'Joe Tippens protocol' popularised its cancer use despite limited clinical evidence.",
      color: "#166534",
      vial: "Oral granules / powder / tablet",
      recon: "222mg (222mg granule packets; 150mg tablets in some formulations)",
      startDose: "222mg/day × 3 days/week (typical human off-label protocol)",
      targetDose: "222mg three days per week with 4 days off",
      frequency: "3 days on / 4 days off weekly cycle (off-label cancer protocol)",
      route: "Oral",
      storage: "Room temperature; store in dry place",
      benefits: "Antihelminthic activity against intestinal nematodes. Off-label: tubulin-disrupting mechanism with preclinical evidence in cancer cell lines. Low cost and wide availability.",
      tips: "Off-label cancer use has no Phase III trial support — preclinical and anecdotal data only. Take with food containing fat for better absorption. Widely used in animal medicine — same compound, different labelling.",
      sideEffects: "Generally well tolerated in short-course antihelminthic use. Occasional GI upset. Liver enzyme elevation possible with prolonged use — monitor LFTs.",
      watchOut: "No clinical trial evidence for cancer treatment. Not a substitute for evidence-based oncology. Monitor LFTs with prolonged use. Not FDA-approved for human use.",
      researchLevel: "Early Research",
      tags: ["Antihelminthic", "Off-Label", "Benzimidazole", "Experimental"],
      researchIndications: [
        { category: "Experimental / Antihelminthic", effectiveness: "Limited", items: [
          { title: "Intestinal Nematodes (Off-Label)", description: "Effective against many intestinal helminths. Lower evidence base in humans than mebendazole/albendazole." },
          { title: "Preclinical Anticancer Activity", description: "In vitro and mouse model data show disruption of tubulin polymerisation in cancer cells. No clinical RCT data yet." },
        ]},
      ],
      indianBrands: [
        { brand: "Fenbendazole 222" },
      ],
    ukBrands: [
      { brand: "No licensed human brand", notes: "Veterinary product only (Panacur); human use is off-label" },
    ],
    usBrands: [
      { brand: "No licensed human brand", notes: "Veterinary product only (Panacur); human use is off-label" },
    ],
    canadaBrands: [
      { brand: "No licensed human brand", notes: "Veterinary product only (Panacur)" },
    ],
    
    overview: {
      whatIsIt: "Fenbendazole is a veterinary benzimidazole anthelmintic widely used in livestock and companion animals for gastrointestinal parasites. Not licensed for human use in most countries, but has attracted intense public interest as an anticancer repurposing candidate following anecdotal case reports (the 'Joe Tippens story'). Chemically similar to mebendazole and albendazole.",
      keyBenefits: "Established veterinary antiparasitic. Anecdotally reported to have anticancer effects in humans via anti-tubulin, Wnt pathway inhibition, and p53 stabilisation mechanisms. Extremely inexpensive. High safety margin in veterinary use. Actively studied in cancer research — preclinical data in multiple cancer types is encouraging. Used off-label by some cancer patients alongside conventional treatment.",
      mechanismOfAction: "Inhibits beta-tubulin polymerisation (same mechanism as mebendazole and albendazole). In cancer models: disrupts microtubule dynamics in tumour cells, activates p53 tumour suppressor protein, inhibits the Wnt/β-catenin signalling pathway, reduces glucose uptake (GLUT4 degradation), inhibits VEGF, and promotes apoptosis. Preclinical data shows anticancer activity in colorectal, lung, pancreatic, and other cancers.",
    },
    pharmacokinetics: { peak: "2–3h (veterinary data; human PK limited)", halfLife: "Unknown (human); animal ~22h", cleared: "Unknown (human)" },
    researchProtocols: [
      { goal: "Off-label cancer protocol (anecdotal/observational)", dose: "222mg three times per week (fasted)", frequency: "Three days on, four days off (popular protocol)", route: "Oral" },
    ],
    interactions: [
      { name: "Limited data — theoretically: metronidazole (avoid per mebendazole data)", status: "caution" },
    ],
    sideEffectNotes: [
      "Liver enzyme elevation — mild and reversible; hepatotoxicity risk at higher doses",
      "GI effects — nausea, abdominal discomfort",
      "Generally well tolerated in anecdotal human reports at veterinary-scale doses",
    ],
    faq: [
      { question: "Did fenbendazole really cure cancer in the Joe Tippens case?", answer: "Joe Tippens reported dramatic remission of stage 4 small-cell lung cancer while using fenbendazole (along with other supplements including vitamin E succinate and curcumin). This case generated viral interest globally. However, a single anecdotal report cannot establish causation — spontaneous remissions occur rarely in cancer, and concurrent treatments or misdiagnosis may explain the outcome. Fenbendazole is not an approved cancer treatment, and clinical trial evidence in humans is currently lacking. Preclinical research is promising but not yet clinically validated." },
      { question: "Is fenbendazole safe for human consumption?", answer: "Fenbendazole has not been formally safety-tested in humans. Veterinary data shows wide safety margins in mammals. Anecdotal human reports suggest tolerability at commonly used doses (222mg 3×/week). However, formal pharmacokinetic, safety, and efficacy data in humans is absent. Liver function tests should be monitored. It should not be used as a replacement for proven cancer therapies — only as a potential adjunct with full disclosure to your oncologist." },
      { question: "How does fenbendazole compare to mebendazole as a cancer research compound?", answer: "Mebendazole has more human safety and pharmacokinetic data since it is a licensed human medicine. Both have similar mechanisms — beta-tubulin inhibition, p53 activation, Wnt pathway effects. Mebendazole is often preferred in clinical trials and case reports due to better characterised human pharmacology. Fenbendazole has attracted more attention due to the Joe Tippens case. Some researchers argue fenbendazole may have unique properties beyond shared mechanisms. Both are being actively studied in cancer repurposing research." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Not Approved", notes: "Veterinary use only (Panacur, Safe-Guard); not licensed for human use" },
      { region: "UK", agency: "MHRA", status: "Not Approved", notes: "Veterinary medicine only; Panacur is licensed in animals" },
      { region: "India", agency: "CDSCO", status: "Not Approved", notes: "Available as veterinary product; used off-label by some cancer patients" },
      { region: "Canada", agency: "Health Canada", status: "Not Approved", notes: "Veterinary use only; not licensed for human therapy" },
    ],
    expectTimeline: [
      { timeframe: "Unknown", description: "No validated human clinical timeline; ongoing research may clarify" },
      { timeframe: "3–6 months (antiparasitic use)", description: "For conventional antiparasitic indications, 3–5 day courses are used with repeat cycles every 3–4 weeks; cancer repurposing protocols typically span months and are monitored by an oncologist" },
    ],
    },

    // ─── MISCELLANEOUS / SUPPORT ──────────────────────────────────────────────

    {
      name: "Vitamin B12 Injection",
      slug: "vitamin-b12-injection",
      abbreviation: "B12",
      aliases: ["cyanocobalamin injection", "methylcobalamin injection", "healvital", "astymin"],
      category: "hormonal",
      tagline: "Essential vitamin injection — B12 deficiency & neurological support",
      description: "Parenteral vitamin B12 (as cyanocobalamin or methylcobalamin) bypasses intestinal absorption and is indicated for B12 deficiency due to pernicious anaemia, malabsorption, or strict vegan diet. Essential for DNA synthesis, myelin formation, and neurological function.",
      color: "#1B3A7A",
      vial: "Injection (IM or SC)",
      recon: "500mcg/mL, 1000mcg/mL",
      startDose: "1000mcg IM daily for 7 days (loading)",
      targetDose: "1000mcg IM monthly (maintenance)",
      frequency: "Daily × 7 days loading, then monthly maintenance",
      route: "Intramuscular or subcutaneous injection",
      storage: "Protect from light; room temperature",
      benefits: "Rapid correction of B12 deficiency. Neurological symptom improvement (neuropathy, cognitive impairment). Corrects megaloblastic anaemia. Essential in pernicious anaemia where oral absorption impossible.",
      tips: "Oral B12 (high-dose 1000mcg/day) is effective for most deficiencies including pernicious anaemia (via passive diffusion). Injection preferred when rapid correction needed or malabsorption confirmed. Monitor CBC and reticulocyte count.",
      sideEffects: "Injection site pain. Rare: hypokalaemia during correction (red cells take up K+). Acne in some individuals.",
      watchOut: "Hypokalaemia risk during rapid correction of severe deficiency — monitor potassium. Very large doses (not therapeutic).",
      researchLevel: "Extensively Studied",
      tags: ["Support", "Vitamin", "B12", "Neuropathy", "Anaemia"],
      researchIndications: [
        { category: "Nutritional Deficiency", effectiveness: "Most Effective", items: [
          { title: "Pernicious Anaemia", description: "IM B12 bypasses gastric intrinsic factor requirement — restores haematological and neurological parameters." },
          { title: "B12 Deficiency Neuropathy", description: "Neurological recovery (neuropathy, subacute combined degeneration) with early IM B12 treatment." },
          { title: "Vegan / Malabsorption B12 Deficiency", description: "Corrects dietary deficiency in vegans and malabsorption syndromes (coeliac, Crohn's, post-gastrectomy)." },
        ]},
      ],
      indianBrands: [
        { brand: "Healvital 500 MCG Injection" },
        { brand: "Healvital 1000 MCG Injection" },
        { brand: "Astymin 1000 MCG Injection" },
      ],
    ukBrands: [
      { brand: "Hydroxocobalamin 1mg/ml Injection (Cytamen)", manufacturer: "Archimedes" },
      { brand: "Cobalin-H 1mg/ml Injection", notes: "Available from various NHS suppliers" },
    ],
    usBrands: [
      { brand: "Cyanocobalamin 1000mcg/ml Injection (generic)", notes: "Multiple manufacturers" },
      { brand: "Nascobal 500mcg/spray nasal gel", manufacturer: "Par Pharmaceutical" },
    ],
    canadaBrands: [
      { brand: "Cyanocobalamin 1000mcg/ml Injection", notes: "Generic — multiple manufacturers" },
      { brand: "Hydroxocobalamin 1mg/ml", notes: "Available from compounding pharmacies" },
    ],
    
    overview: {
      whatIsIt: "Vitamin B12 injection (hydroxocobalamin or cyanocobalamin intramuscularly or subcutaneously) is the definitive treatment for vitamin B12 deficiency, particularly pernicious anaemia and other states where oral B12 absorption is impaired. Used when the gut cannot absorb oral B12 (lack of intrinsic factor, post-gastrectomy, ileal disease, malabsorption syndromes).",
      keyBenefits: "Bypasses gut absorption entirely — essential when B12 deficiency is due to malabsorption. Hydroxocobalamin (preferred in UK) is retained in the body longer than cyanocobalamin. Rapidly corrects B12 deficiency and associated megaloblastic anaemia, neurological symptoms, and elevated homocysteine. Prevents irreversible subacute combined degeneration of the spinal cord if given before neurological damage is established.",
      mechanismOfAction: "B12 (cobalamin) is a cofactor for two essential enzymes: methionine synthase (converts homocysteine to methionine, required for DNA synthesis and myelin maintenance) and methylmalonyl-CoA mutase (converts methylmalonyl-CoA to succinyl-CoA, essential for fatty acid and myelin synthesis). Deficiency impairs DNA synthesis (megaloblastic anaemia) and myelin production (neurological symptoms). IM B12 repletes these pathways directly.",
    },
    pharmacokinetics: { peak: "1–2h (IM peak)", halfLife: "~6 days (hydroxocobalamin); ~1 day (cyanocobalamin)", cleared: "Stored in liver; released over months" },
    researchProtocols: [
      { goal: "B12 Deficiency — Loading (pernicious anaemia / neurological involvement)", dose: "1mg IM on alternate days for 2 weeks (UK protocol)", frequency: "Alternate days × 6 doses then every 3 months", route: "Intramuscular" },
      { goal: "B12 Deficiency — Maintenance (non-neurological)", dose: "1mg IM every 3 months", frequency: "Every 3 months (lifelong in pernicious anaemia)", route: "Intramuscular" },
    ],
    interactions: [
      { name: "Chloramphenicol (may impair haematopoietic response to B12)", status: "caution" },
    ],
    sideEffectNotes: [
      "Injection site pain and redness — transient; rotate sites",
      "Hypokalaemia — potassium can drop acutely during haematopoietic recovery; monitor K+ in severe anaemia",
      "Very rarely: anaphylaxis (test dose in sensitive patients)",
    ],
    faq: [
      { question: "Can oral B12 replace injections?", answer: "For most B12 deficient patients without absorption problems, oral B12 (1000–2000 mcg/day) is as effective as injections — high-dose oral B12 is absorbed by passive diffusion (1% of dose) even without intrinsic factor. However, for pernicious anaemia (autoimmune destruction of intrinsic factor), strict vegans with known non-compliance, or those with severe GI malabsorption, injections provide more reliable and controllable repletion. The UK uses injections as the primary treatment for pernicious anaemia; high-dose oral supplementation is an acceptable alternative in some international guidelines." },
      { question: "How quickly do B12 injections improve symptoms?", answer: "Haematological improvement begins rapidly — reticulocyte count rises within 3–5 days, haemoglobin improves over 4–8 weeks. Neurological symptoms improve more slowly and incompletely — partial recovery occurs over 3–6 months with consistent treatment. Irreversible neurological damage (subacute combined degeneration) does not reverse but progression halts. Fatigue and cognitive function typically improve within 1–3 months." },
      { question: "Is B12 injection safe for everyone?", answer: "B12 injections are very safe for most people. Contraindications are rare: known allergy to cobalt or hydroxocobalamin (very uncommon). Hydroxocobalamin is also used as an antidote for cyanide poisoning at much higher doses. Cyanocobalamin is avoided in tobacco amblyopia and Leber's disease (optic atrophy — conditions where cyanide detoxification is impaired). Otherwise, B12 is water-soluble and excess is excreted — toxicity from injections is not a practical concern." },
    ],
    regulatoryStatus: [
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Hydroxocobalamin 1mg/1mL injection — pernicious anaemia, B12 deficiency; cyanide poisoning antidote (Cyanokit at higher dose)" },
      { region: "USA", agency: "FDA", status: "Approved", notes: "Cyanocobalamin injection (standard) and hydroxocobalamin (Cyanokit — cyanide poisoning); cyanocobalamin for B12 deficiency" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Mecobalamin and cyanocobalamin injections available; widely used" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Cyanocobalamin injection — licensed for pernicious anaemia and B12 deficiency" },
    ],
    expectTimeline: [
      { timeframe: "3–7 days", description: "Energy improvement begins; reticulocyte response (haematological)" },
      { timeframe: "4–8 weeks", description: "Haemoglobin normalisation" },
      { timeframe: "3–6 months", description: "Neurological symptom partial resolution" },
    ],
    },

    {
      name: "Lidocaine",
      slug: "lidocaine",
      abbreviation: "LIDO",
      aliases: ["xylocaine", "lignoheal", "lignocan", "lidocaine hcl"],
      category: "pain",
      tagline: "Local anaesthetic — pain relief, topical anaesthesia & arrhythmia",
      description: "Lidocaine is the most widely used local anaesthetic. Blocks voltage-gated sodium channels in neuronal membranes, preventing action potential propagation. Used for local/regional anaesthesia (injection), topical anaesthesia (gel, spray), IV antiarrhythmic (ventricular arrhythmia), and IV infusion for chronic pain.",
      color: "#92400E",
      vial: "Injection / Topical gel / Spray / IV infusion",
      recon: "1%, 2% injection; 5% gel; 10% spray; 2% viscous solution",
      startDose: "1–2% solution for local infiltration; topical: as needed",
      targetDose: "Max infiltration dose: 3–4.5mg/kg (without adrenaline); 7mg/kg (with adrenaline)",
      frequency: "As needed for local procedures; IV infusion for arrhythmia/pain",
      route: "Injection, topical, or IV",
      storage: "Room temperature; protect from light",
      benefits: "Rapid onset of local anaesthesia (2–5 minutes). Wide safety margin at local doses. Topical formulations for urethral catheterisation, GI endoscopy, oral mucosal anaesthesia. IV lidocaine for ventricular tachycardia and chronic neuropathic pain.",
      tips: "Always aspirate before injecting to avoid inadvertent IV injection. Maximum safe dose is critical — calculate by patient weight. Topical: 2% viscous for oral anaesthesia; 2.5% gel for urethral use.",
      sideEffects: "Local: rare at standard doses. CNS toxicity at excessive doses: tinnitus, perioral tingling, dizziness, seizures. Cardiovascular toxicity: bradycardia, arrhythmia (rare at local doses).",
      watchOut: "Systemic toxicity if inadvertently injected IV or maximum dose exceeded — CNS and cardiovascular collapse. Lipid emulsion (Intralipid) is antidote. Avoid with class I antiarrhythmics.",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "Local Anaesthetic", "Topical", "Arrhythmia"],
      researchIndications: [
        { category: "Anaesthesia / Pain", effectiveness: "Most Effective", items: [
          { title: "Local / Regional Anaesthesia", description: "Gold-standard local anaesthetic for minor surgery, dental procedures, and regional nerve blocks." },
          { title: "Topical Anaesthesia", description: "Gel and spray formulations for urethral, oral, and mucosal anaesthesia during procedures." },
          { title: "Ventricular Arrhythmia (IV)", description: "IV lidocaine second-line for ventricular tachycardia refractory to amiodarone." },
        ]},
      ],
      indianBrands: [
        { brand: "Lignoheal 2% Injection" },
        { brand: "Lignocan 2% Injection" },
        { brand: "Xylocaine 2% Injection" },
        { brand: "Xylocaine 10% Spray" },
      ],
    ukBrands: [
      { brand: "Xylocaine 1% / 2% Injection", manufacturer: "AstraZeneca" },
      { brand: "EMLA Cream 2.5% (lidocaine / prilocaine)", manufacturer: "AstraZeneca", notes: "Topical anaesthetic" },
    ],
    usBrands: [
      { brand: "Xylocaine 0.5–2% Injection", manufacturer: "AstraZeneca" },
      { brand: "EMLA Cream 2.5%", manufacturer: "Noven", notes: "Topical" },
      { brand: "LMX4 4% Topical Cream", manufacturer: "Ferndale" },
    ],
    canadaBrands: [
      { brand: "Xylocaine 1% / 2%", manufacturer: "AstraZeneca" },
      { brand: "EMLA Cream 2.5%", manufacturer: "AstraZeneca", notes: "Topical anaesthetic" },
    ],
    
    overview: {
      whatIsIt: "Lidocaine (lignocaine) is a local anaesthetic and class Ib antiarrhythmic agent. Used topically, infiltrated subcutaneously, epidurally, intrathecally, and intravenously depending on indication. One of the most widely used local anaesthetics in dentistry and minor surgical procedures. IV lidocaine is used for ventricular arrhythmias and increasingly as an analgesic adjunct.",
      keyBenefits: "Rapid onset (2–5 min) and moderate duration (1–2 hours) for infiltration. Versatile — topical, infiltration, nerve block, epidural, spinal, IV use. IV infusion has analgesic and anti-inflammatory effects useful in perioperative pain and chronic pain. Class Ib mechanism provides post-MI ventricular arrhythmia control. Available in gel, spray, cream (EMLA mixture), patch, and injection.",
      mechanismOfAction: "Blocks voltage-gated sodium channels (Nav1.7, Nav1.8) in a use-dependent manner — channels are blocked in their open and inactivated states. This prevents action potential propagation in sensory nerves (local anaesthesia) and cardiac Na channels (antiarrhythmic). More selective for activated (depolarised) channels — hence use-dependence and greater effect at fast heart rates in arrhythmia.",
    },
    pharmacokinetics: { peak: "5 min (IV); 20–30 min (infiltration)", halfLife: "1.5–2h", cleared: "8–12h" },
    researchProtocols: [
      { goal: "Local Infiltration Anaesthesia", dose: "1–2% solution, max 3–4.5mg/kg (7mg/kg with adrenaline)", frequency: "Single infiltration per procedure", route: "Subcutaneous / submucosal" },
      { goal: "IV Lidocaine for Arrhythmia", dose: "1–1.5mg/kg IV bolus, then 1–4mg/min infusion", frequency: "Bolus followed by continuous infusion", route: "Intravenous" },
      { goal: "Perioperative IV Analgesia", dose: "1.5mg/kg IV bolus at induction, then 1.5mg/kg/h infusion intraoperatively", frequency: "Continuous intraoperative infusion", route: "Intravenous" },
    ],
    interactions: [
      { name: "Class I antiarrhythmics (additive sodium channel blockade — additive cardiac toxicity)", status: "caution" },
      { name: "Beta-blockers (reduce lidocaine clearance via reduced hepatic blood flow)", status: "monitor" },
      { name: "Cimetidine (reduces lidocaine hepatic clearance)", status: "caution" },
    ],
    sideEffectNotes: [
      "CNS toxicity (at elevated plasma levels) — initial: perioral tingling, metallic taste, dizziness, tinnitus; then: seizures, respiratory arrest",
      "Cardiovascular toxicity — bradycardia, hypotension, cardiac arrest at high plasma concentrations",
      "Allergic reactions — true allergy rare (amide class has very low true allergy rate); preservative-related allergy more common",
      "Methaemoglobinaemia — with topical large-area application of high concentrations in infants",
    ],
    faq: [
      { question: "What are the signs of lidocaine toxicity?", answer: "Lidocaine toxicity (local anaesthetic systemic toxicity, LAST) occurs if too much is absorbed or injected intravascularly. Early signs: perioral tingling, metallic taste, tinnitus, dizziness, visual disturbances, confusion. Later: muscle twitching, seizures. Cardiovascular: hypotension, bradycardia, ventricular arrhythmias, cardiac arrest. If LAST is suspected, stop injection immediately, secure airway, and administer 20% intralipid emulsion (Intralipid) IV — the lipid rescues cardiac lidocaine toxicity." },
      { question: "Why is lidocaine combined with adrenaline for dental injections?", answer: "Adding adrenaline (epinephrine) to lidocaine causes local vasoconstriction, slowing systemic absorption of lidocaine. This extends the duration of local anaesthesia (from ~1h to ~2–3h), allows a higher safe total dose (3mg/kg without vs 7mg/kg with adrenaline), reduces bleeding in the operative field, and prolongs the window for dental procedures. The adrenaline concentration is very low (typically 1:80,000–1:200,000) — systemic cardiovascular effects are minimal in healthy patients." },
      { question: "Can lidocaine be used as an infusion for chronic pain?", answer: "IV lidocaine infusions are increasingly used as an analgesic modality for neuropathic pain, fibromyalgia, complex regional pain syndrome, and cancer pain. The anti-inflammatory and sodium channel effects may provide analgesia beyond local anaesthesia duration. Protocols vary (typically 1.5–5mg/kg over 30–60 minutes). Evidence is strongest for neuropathic pain and refractory pain conditions. Requires cardiac monitoring during infusion due to arrhythmia risk." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Multiple formulations — local anaesthesia, dental, IV antiarrhythmic, topical" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Xylocaine — all major formulations licensed; WHO essential medicine" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Xylocaine, Lignox — widely used in all settings" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Xylocaine — local anaesthesia and IV antiarrhythmic" },
    ],
    expectTimeline: [
      { timeframe: "2–5 minutes", description: "Onset of local anaesthesia (infiltration)" },
      { timeframe: "1–2 hours", description: "Duration of anaesthesia (without adrenaline)" },
    ],
    },
  


    // ─── METABOLIC (additional) ───────────────────────────────────────────────

    {
      name: "Bempedoic Acid",
      slug: "bempedoic-acid",
      abbreviation: "BEM",
      aliases: ["nexletol", "esperion", "bempedoic acid 180mg"],
      category: "metabolic",
      tagline: "ACL inhibitor — LDL lowering for statin-intolerant patients",
      description: "Bempedoic acid inhibits ATP citrate lyase (ACL), an enzyme upstream of HMG-CoA reductase in the cholesterol synthesis pathway. Requires activation by ACSVL1 enzyme present in the liver but absent in skeletal muscle — explaining its low myopathy risk. Approved as adjunct to diet and maximally tolerated statins for LDL lowering, particularly useful in statin-intolerant patients.",
      color: "#059669",
      vial: "Oral tablet",
      recon: "180mg",
      startDose: "180mg/day",
      targetDose: "180mg/day",
      frequency: "Once daily",
      route: "Oral",
      storage: "Room temperature",
      benefits: "~18% LDL reduction as monotherapy; ~28% reduction added to ezetimibe. Minimal myopathy risk (not activated in muscle). Effective for statin-intolerant patients. CLEAR Outcomes trial: reduced major adverse cardiovascular events by 13% vs placebo over 3.4 years.",
      tips: "Not activated in skeletal muscle — exceptionally low myopathy risk. Monitor uric acid (can elevate by 1.5 mg/dL). Monitor gout-prone patients. Available as combination tablet with ezetimibe (NEXLIZET/NUSTENDI).",
      sideEffects: "Gout/hyperuricaemia (most clinically important), elevated LFTs, muscle spasms. Generally well tolerated.",
      watchOut: "Avoid in severe hepatic impairment. Uric acid elevation — avoid in gout or high uric acid. Concomitant statin dose may need monitoring. Not yet widely available in India — primarily US/Europe.",
      researchLevel: "Well Researched",
      tags: ["Metabolic", "Cholesterol", "ACL Inhibitor", "Statin Intolerance"],
      researchIndications: [
        { category: "Dyslipidaemia", effectiveness: "Effective", items: [
          { title: "Statin-Intolerant Patients", description: "18% LDL reduction without myopathy risk — key differentiator from statins. Approved for patients who cannot tolerate statins." },
          { title: "LDL Reduction as Add-On", description: "Combined with ezetimibe (CLEAR Serenity): 36% LDL reduction, superior to monotherapy." },
          { title: "Cardiovascular Event Reduction", description: "CLEAR Outcomes: 13% RRR in MACE (MI, stroke, CV death, coronary revascularisation) vs placebo in high-risk patients." },
        ]},
      ],
      indianBrands: [
        { brand: "Bempedoic Acid 180", notes: "Limited availability in India; primarily available through import/specialty channels" },
      ],
    ukBrands: [
      { brand: "Nilemdo 180mg", manufacturer: "Daiichi Sankyo" },
    ],
    usBrands: [
      { brand: "Nexletol 180mg", manufacturer: "Esperion Therapeutics" },
    ],
    canadaBrands: [
      { brand: "Nilemdo 180mg", manufacturer: "Daiichi Sankyo", notes: "Recently approved" },
    ],
    
    overview: {
      whatIsIt: "Bempedoic acid is a first-in-class ATP-citrate lyase (ACL) inhibitor that reduces hepatic cholesterol synthesis upstream of HMG-CoA reductase (the statin target). Unlike statins, bempedoic acid is a prodrug that is only activated in the liver — bypassing skeletal muscle activation and avoiding the myopathy associated with statins. Approved as an adjunct to statins or as an alternative in statin-intolerant patients.",
      keyBenefits: "Reduces LDL-C by 17–25% as monotherapy, and additional 17–24% on top of maximally tolerated statin. No myopathy — muscle-sparing mechanism makes it the ideal agent for statin-intolerant patients. Proven cardiovascular outcome reduction in the CLEAR Outcomes trial (primary prevention) — 13% relative risk reduction in CV events. Fixed-dose combination with ezetimibe (Nexlizet/Nustendi) provides 38% LDL reduction.",
      mechanismOfAction: "Bempedoic acid is activated to ETC-1002-CoA by very-long-chain acyl-CoA synthetase-1 (ACSVL1) — an enzyme highly expressed in liver but absent in skeletal muscle. ETC-1002-CoA inhibits ATP-citrate lyase (ACL), which converts citrate to acetyl-CoA — the substrate for cholesterol and fatty acid synthesis in hepatocytes. Reduced hepatic cholesterol upregulates LDLR expression, increasing LDL clearance from plasma. The liver-specific activation eliminates skeletal muscle risk.",
    },
    pharmacokinetics: { peak: "3.5h", halfLife: "21h (ETC-1002-CoA active metabolite)", cleared: "~5 days" },
    researchProtocols: [
      { goal: "LDL Reduction (statin-intolerant or add-on)", dose: "180mg once daily", frequency: "Once daily", route: "Oral" },
      { goal: "Combined with Ezetimibe (Nexlizet/Nustendi)", dose: "180mg/10mg once daily", frequency: "Once daily", route: "Oral" },
    ],
    interactions: [
      { name: "Simvastatin >20mg / Pravastatin >40mg (bempedoic acid increases statin exposure via OATP1B1/1B3 inhibition)", status: "caution" },
      { name: "Gout — increases serum uric acid by ~1.5 mg/dL via uricosuric transport inhibition", status: "caution" },
    ],
    sideEffectNotes: [
      "Elevated uric acid — gout risk; contraindicated if active gout; use caution in hyperuricaemia",
      "Elevated liver enzymes — generally mild and transient",
      "Tendon rupture — small excess signal vs placebo in trials; monitor tendons",
      "Upper respiratory tract infection, anaemia — observed in trials",
    ],
    faq: [
      { question: "Who should take bempedoic acid instead of a statin?", answer: "Bempedoic acid is specifically designed for patients with statin intolerance — typically from statin-associated muscle symptoms (SAMS). Since it is not activated in skeletal muscle, it does not cause myopathy. It is approved as an adjunct to diet and maximally tolerated statin therapy in adults with primary hyperlipidaemia or mixed dyslipidaemia who require additional LDL reduction, and as an alternative to a statin when statins are not tolerated." },
      { question: "Can bempedoic acid be used with statins?", answer: "Yes — bempedoic acid is used as an add-on to maximally tolerated statin therapy in patients who have not reached LDL targets. Combined with a statin, it provides an additional 17–24% LDL reduction. The fixed-dose combination with ezetimibe (Nexlizet) can be added to moderate-intensity statin for a total of ~38% additional LDL reduction beyond the statin alone. Note: bempedoic acid inhibits OATP1B1/1B3 transporters, increasing simvastatin and pravastatin levels — dose caps apply (simvastatin ≤20mg, pravastatin ≤40mg)." },
      { question: "Has bempedoic acid been proven to reduce heart attacks?", answer: "Yes — the CLEAR Outcomes trial (2022, NEJM) randomised 13,970 statin-intolerant patients to bempedoic acid 180mg or placebo. Bempedoic acid significantly reduced the primary endpoint of major adverse cardiovascular events (MACE) — 13.6% vs 15.3% (HR 0.87) — the first non-statin, non-PCSK9 inhibitor to show cardiovascular outcome benefit in a large primary prevention trial." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Nexletol (bempedoic acid alone), Nexlizet (with ezetimibe) — hyperlipidaemia adjunct to diet/statins" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Nilemdo (bempedoic acid), Nustendi (with ezetimibe) — licensed 2020" },
      { region: "India", agency: "CDSCO", status: "Not Approved", notes: "Not yet approved in India" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Nilemdo — licensed for hypercholesterolaemia in adults" },
    ],
    expectTimeline: [
      { timeframe: "2 weeks", description: "Meaningful LDL reduction measurable" },
      { timeframe: "4–8 weeks", description: "Full LDL-lowering effect established" },
    ],
    },

    // ─── PAIN & MUSCULOSKELETAL (additional) ─────────────────────────────────

    {
      name: "Ketorolac",
      slug: "ketorolac",
      abbreviation: "KTR",
      aliases: ["toradol", "ketoforce", "ketorolac tromethamine", "xt-oll"],
      category: "pain",
      tagline: "Potent parenteral NSAID — short-term moderate to severe pain",
      description: "Ketorolac is the most potent NSAID available by injection, with analgesic efficacy comparable to morphine for acute pain. Inhibits COX-1 and COX-2, reducing prostaglandin synthesis. Available as IM/IV injection and short-term oral tablets. Strictly limited to 5 days maximum due to cumulative GI and renal toxicity.",
      color: "#92400E",
      vial: "IM/IV injection; Oral tablet",
      recon: "30mg/mL injection (1mL, 2mL ampoules); 10mg oral tablet",
      startDose: "30mg IM/IV single dose (or 10mg oral)",
      targetDose: "30mg IM/IV every 6 hours (max 120mg/day); oral 10mg QID",
      frequency: "Every 6 hours (max 5 days total including any oral)",
      route: "IM, IV, or oral",
      storage: "Room temperature; protect from light",
      benefits: "Opioid-sparing analgesic — achieves morphine-equivalent pain relief without respiratory depression or addiction risk. Rapid onset (30 min IM). Effective for postoperative pain, renal colic, musculoskeletal pain. No sedation.",
      tips: "Maximum 5 days total treatment (any route combined). Oral use as step-down only, not new initiation. IV injection should be given over >15 seconds. Use lowest effective dose. Consider PPI co-prescription.",
      sideEffects: "GI bleeding (significant risk with >5 days), renal impairment, pain at injection site, headache, dizziness, drowsiness.",
      watchOut: "Strict 5-day limit — risk of serious GI bleeding and acute kidney injury beyond this. Avoid in elderly, patients with renal impairment, or peptic ulcer history. Contraindicated with other NSAIDs, aspirin, anticoagulants.",
      researchLevel: "Extensively Studied",
      tags: ["Pain", "NSAID", "Parenteral", "Postoperative", "Opioid-Sparing"],
      researchIndications: [
        { category: "Acute Pain Management", effectiveness: "Most Effective", items: [
          { title: "Postoperative Pain", description: "Ketorolac 30mg IM achieves comparable analgesia to morphine 12mg IM with better tolerability profile and no respiratory depression." },
          { title: "Renal Colic", description: "Effective as IV/IM monotherapy for renal colic — comparable to opioids in pain scores and often preferred first-line." },
          { title: "Acute Musculoskeletal Pain", description: "IM ketorolac provides rapid, potent pain relief for severe acute musculoskeletal injuries where oral NSAIDs insufficient." },
        ]},
      ],
      indianBrands: [
        { brand: "Ketoforce 30Injection" },
        { brand: "Ketanov 30Injection" },
        { brand: "Ketorolac 10Tablet" },
      ],
    ukBrands: [
      { brand: "Toradol 10mg tablets / 30mg/ml injection", manufacturer: "Roche" },
      { brand: "Acular 0.5% Eye Drops", manufacturer: "Allergan", notes: "Topical ophthalmic" },
    ],
    usBrands: [
      { brand: "Toradol 10mg / 30mg/ml injection", manufacturer: "Roche" },
      { brand: "Sprix 15.75mg nasal spray", manufacturer: "Luitpold" },
      { brand: "Acular 0.5% Eye Drops", manufacturer: "Allergan" },
    ],
    canadaBrands: [
      { brand: "Toradol 10mg / 30mg/ml injection", manufacturer: "Roche" },
    ],
    
    overview: {
      whatIsIt: "Ketorolac (ketorolac tromethamine) is a potent non-selective NSAID available in oral, IM/IV injection, and ophthalmic formulations. Notable for IV/IM use providing opioid-sparing analgesia for moderate-to-severe pain. Has the most potent analgesic effect among parenteral NSAIDs. Ophthalmic ketorolac is used for ocular inflammation and pain.",
      keyBenefits: "Potent analgesic comparable to morphine for post-surgical pain without opioid addiction risk. Reduces opioid requirements by 25–50% when used as part of multimodal analgesia. Useful for renal colic (IV/IM) — prostaglandins mediate ureteric smooth muscle contraction, so COX inhibition provides specific relief. Ophthalmic drops for cataract surgery inflammation. Available as OTC oral in some countries (low dose).",
      mechanismOfAction: "Non-selectively inhibits COX-1 and COX-2, reducing prostaglandin synthesis. The potent analgesic effect (ranked the most potent non-selective NSAID for analgesia) arises from central and peripheral COX inhibition. For renal colic, prostaglandin E2 mediates ureteric contraction around stones — COX inhibition relaxes the ureter and reduces spasm.",
    },
    pharmacokinetics: { peak: "30–60 min (IM); 5 min (IV)", halfLife: "5–6h", cleared: "24h" },
    researchProtocols: [
      { goal: "Acute Moderate-Severe Pain (IM/IV — first dose)", dose: "30mg IM or IV", frequency: "Every 6 hours (max 5 days total)", route: "Intramuscular or IV" },
      { goal: "Acute Pain (oral continuation)", dose: "10mg every 4–6 hours", frequency: "Up to 4 times daily (max 5 days combined oral + parenteral)", route: "Oral" },
      { goal: "Renal Colic (IV/IM)", dose: "30mg IV/IM single dose", frequency: "Single dose (repeat once if needed)", route: "IV or Intramuscular" },
    ],
    interactions: [
      { name: "Other NSAIDs (additive GI and renal toxicity — do not combine)", status: "avoid" },
      { name: "Warfarin (significantly increased bleeding risk)", status: "caution" },
      { name: "ACE inhibitors / ARBs / diuretics (AKI risk with all NSAIDs; more significant with parenteral ketorolac)", status: "caution" },
      { name: "Lithium (reduced clearance)", status: "caution" },
    ],
    sideEffectNotes: [
      "Maximum 5-day total course — longer use produces unacceptable GI and renal toxicity",
      "GI bleeding — highest risk of any NSAID at parenteral doses; limit duration strictly",
      "Renal impairment — dose-reduce in CKD; avoid in severe CKD",
      "Inhibits platelet aggregation — important consideration in surgical settings (stop before surgery)",
      "Contraindicated in pregnancy (third trimester) — premature closure of ductus arteriosus",
    ],
    faq: [
      { question: "Why is ketorolac limited to 5 days?", answer: "Ketorolac has the most potent anti-prostaglandin activity among available NSAIDs — which makes it an effective analgesic but also increases GI and renal toxicity with prolonged use. Clinical trials established that GI complications (bleeding, perforation) increase steeply beyond 5 days of use. This strict 5-day limit is regulatory and clinical — the drug should be used as a bridge to oral analgesics or opioids, not as ongoing therapy. Parenteral days and oral continuation days count together." },
      { question: "How does ketorolac compare to morphine for pain?", answer: "Single doses of ketorolac 30mg IM provide analgesia comparable to morphine 10mg IM in studies of post-surgical and acute pain. The advantage: no opioid side effects (sedation, respiratory depression, nausea, addiction risk). The disadvantage: strict 5-day limit and NSAID toxicity profile. In multimodal analgesia protocols, ketorolac + opioid provides better pain control than either alone with lower opioid doses (opioid-sparing effect)." },
      { question: "Is ketorolac effective for kidney stone pain?", answer: "Yes — ketorolac is highly effective for renal colic. Ureteric spasm around a kidney stone is largely prostaglandin-mediated, and IV/IM ketorolac directly targets this mechanism. Multiple trials show ketorolac is as effective as IV pethidine (meperidine) for acute renal colic with fewer side effects. A single 30mg IV dose is typically sufficient for initial pain control, followed by oral NSAIDs as maintenance. It also promotes ureteric relaxation, which may aid stone passage." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Toradol — IM/IV and oral (max 5 days); ophthalmic (Acular)" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Toradol — short-term IM/IV and oral; ophthalmic ketorolac licensed" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Ketanov, Ketoforce — injection and oral; widely used" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Toradol — IM/IV short-term analgesia and oral" },
    ],
    expectTimeline: [
      { timeframe: "15–30 minutes (IV/IM)", description: "Onset of analgesia" },
      { timeframe: "1–2 hours", description: "Peak analgesic effect" },
    ],
    },

    // ─── ALLERGY & RESPIRATORY (additional) ─────────────────────────────────

    {
      name: "Formoterol + Budesonide",
      slug: "formoterol-budesonide",
      abbreviation: "F+B",
      aliases: ["symbicort", "foracort", "formoterol budesonide inhaler", "ics laba combo"],
      category: "allergy-respiratory",
      tagline: "ICS + LABA combination — asthma & COPD maintenance",
      description: "Fixed-dose combination of budesonide (inhaled corticosteroid) and formoterol (long-acting beta-2 agonist). Provides both anti-inflammatory control (ICS) and sustained bronchodilation (LABA). Formoterol has rapid onset (like SABA) allowing use as both maintenance and reliever therapy (SMART strategy). First-line for moderate to severe persistent asthma.",
      color: "#0E7490",
      vial: "Dry powder inhaler / MDI",
      recon: "Budesonide 160mcg + Formoterol 4.5mcg (Symbicort 160/4.5); 80/4.5; 320/9 per actuation",
      startDose: "Budesonide 160mcg + Formoterol 4.5mcg — 1–2 inhalations twice daily",
      targetDose: "1–2 inhalations twice daily (maintenance); additional doses PRN (SMART)",
      frequency: "Twice daily maintenance (+ PRN for SMART strategy)",
      route: "Inhaled",
      storage: "Room temperature, protect DPI from moisture",
      benefits: "Single inhaler for both maintenance and relief (SMART strategy reduces overall ICS burden and exacerbations). Rapid onset of formoterol — faster than salmeterol. Superior exacerbation reduction vs separate ICS + LABA inhalers in many trials. GINA preferred regimen for Steps 3–5.",
      tips: "SMART strategy: use as both regular twice-daily dose AND as reliever (up to 6–8 extra inhalations PRN). Rinse mouth after use (oral candidiasis prevention). Do not exceed maximum daily doses.",
      sideEffects: "Oral candidiasis (rinse mouth after), dysphonia, tremor, palpitations. Systemic corticosteroid effects at high doses.",
      watchOut: "LABA alone contraindicated without ICS in asthma (increased mortality risk) — always use in combination. Rinse mouth after use. Same cardiac monitoring as other LABAs.",
      researchLevel: "Extensively Studied",
      tags: ["Respiratory", "ICS/LABA", "Asthma", "COPD", "SMART"],
      researchIndications: [
        { category: "Respiratory", effectiveness: "Most Effective", items: [
          { title: "Moderate-Severe Persistent Asthma", description: "GINA-preferred Step 3–5 treatment. Reduces exacerbations by 30–50% vs ICS alone." },
          { title: "SMART Therapy (Maintenance + Reliever)", description: "Single inhaler strategy: budesonide/formoterol as both regular and rescue reduces severe exacerbations 26% vs fixed-dose ICS/LABA + SABA." },
          { title: "COPD (Moderate-Severe)", description: "Reduces COPD exacerbation frequency and improves quality of life in eosinophilic COPD." },
        ]},
      ],
      indianBrands: [
        { brand: "Foracort 100 Inhaler" },
        { brand: "Foracort 200 Inhaler" },
        { brand: "Foracort 400 Inhaler" },
        { brand: "Symbicort 160/4.5 Inhaler" },
      ],
    ukBrands: [
      { brand: "Symbicort 80/4.5mcg / 160/4.5mcg Turbohaler", manufacturer: "AstraZeneca" },
      { brand: "DuoResp Spiromax 160/4.5mcg", manufacturer: "Teva" },
      { brand: "Fobumix Easyhaler 80/4.5mcg / 160/4.5mcg", manufacturer: "Orion" },
    ],
    usBrands: [
      { brand: "Symbicort 80/4.5mcg / 160/4.5mcg Inhaler", manufacturer: "AstraZeneca" },
      { brand: "Breyna 80/4.5mcg / 160/4.5mcg", manufacturer: "Viatris / Mylan", notes: "Authorised generic" },
    ],
    canadaBrands: [
      { brand: "Symbicort 100/6mcg / 200/6mcg Turbuhaler", manufacturer: "AstraZeneca" },
    ],
    
    overview: {
      whatIsIt: "Formoterol-budesonide is a fixed-dose combination inhaler pairing formoterol (long-acting beta-2 agonist, LABA) with budesonide (inhaled corticosteroid, ICS). Available as Symbicort in most countries. Notably, this combination can be used as both regular maintenance therapy AND as-needed reliever therapy (SMART strategy) — the only ICS/LABA combination approved for this dual role.",
      keyBenefits: "SMART (Single Maintenance And Reliever Therapy) strategy — using Symbicort for both regular and as-needed doses significantly reduces severe exacerbations vs SABA-based reliever strategies. Formoterol's rapid onset (similar to salbutamol) enables reliable as-needed use. Simplifies inhaler regimen. Proven superior to separate ICS + SABA in exacerbation prevention. Turbuhaler provides reliable dose delivery.",
      mechanismOfAction: "Formoterol: long-acting selective beta-2 agonist producing bronchial smooth muscle relaxation for ≥12 hours, with rapid onset (3–5 min — similar to salbutamol). Budesonide: inhaled corticosteroid suppressing airway eosinophilic inflammation, cytokine production, and mucus hypersecretion. Together: formoterol provides bronchodilation while budesonide addresses underlying inflammation — each as-needed dose provides both rescue bronchodilation and an anti-inflammatory dose.",
    },
    pharmacokinetics: { peak: "10 min (formoterol bronchodilation); 20–30 min (budesonide anti-inflammatory)", halfLife: "Formoterol: 10h; Budesonide: 2.8h", cleared: "24h" },
    researchProtocols: [
      { goal: "Asthma Maintenance (SMART)", dose: "200/6 mcg (budesonide/formoterol) 2 puffs twice daily + as needed", frequency: "Twice daily regular + PRN (max 8 puffs/day total)", route: "Inhaled" },
      { goal: "COPD Maintenance", dose: "400/12 mcg twice daily", frequency: "Twice daily", route: "Inhaled" },
    ],
    interactions: [
      { name: "Beta-blockers (antagonise formoterol bronchodilation — avoid non-selective beta-blockers)", status: "avoid" },
      { name: "CYP3A4 inhibitors (ketoconazole) — increase budesonide systemic exposure", status: "caution" },
      { name: "QTc-prolonging drugs (formoterol mildly prolongs QTc at high doses)", status: "caution" },
    ],
    sideEffectNotes: [
      "Oral candidiasis — rinse mouth after every use (including as-needed doses)",
      "Tremor and palpitations — formoterol component at high as-needed use",
      "Hoarseness — budesonide local deposition",
      "Hypokalaemia — high-dose LABA at high frequency of as-needed use",
    ],
    faq: [
      { question: "What is SMART therapy and why is it preferred?", answer: "SMART (Single Maintenance And Reliever Therapy) uses Symbicort (budesonide/formoterol) for both regular maintenance AND as-needed use — replacing the traditional 'ICS + separate salbutamol' approach. Each as-needed puff delivers both a bronchodilator (formoterol — fast-acting) AND anti-inflammatory corticosteroid (budesonide) directly when inflammation is most active. GINA guidelines now recommend ICS-formoterol as the preferred reliever strategy over salbutamol alone for step 3–5 asthma, having been shown to reduce severe exacerbations and asthma-related deaths." },
      { question: "Can Symbicort replace my salbutamol inhaler?", answer: "Yes — under SMART strategy, budesonide/formoterol MDI or Turbuhaler replaces your separate salbutamol reliever. Formoterol's rapid onset (3–5 minutes) makes it as effective as salbutamol for acute symptoms. You use the same inhaler for both regular doses (morning and evening) and any as-needed doses during the day. If you need ≥4 reliever doses on a single day, this indicates worsening asthma — seek medical review. Maximum total daily doses are capped (typically 8–12 inhalations depending on formulation)." },
      { question: "Is formoterol-budesonide used for COPD?", answer: "Yes — Symbicort is approved for COPD as a maintenance therapy. In COPD, budesonide reduces exacerbation frequency in patients with ≥2 exacerbations per year and blood eosinophil count ≥300 cells/µL (or ≥100 cells/µL with history of frequent exacerbations). Formoterol provides bronchodilation. However, COPD management also requires long-acting muscarinic antagonists (LAMAs like tiotropium) which are not in Symbicort — triple therapy (ICS + LABA + LAMA) is the standard for moderate-severe COPD." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Symbicort 80/4.5 and 160/4.5 mcg — asthma and COPD; MDI formulation" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Symbicort Turbuhaler — asthma and COPD; SMART strategy licensed by MHRA" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Symbicort, Forair-FB — licensed for asthma and COPD" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Symbicort — asthma and COPD; SMART approach" },
    ],
    expectTimeline: [
      { timeframe: "3–5 minutes", description: "Bronchodilation from formoterol (as needed)" },
      { timeframe: "2–4 weeks", description: "Improved asthma control with regular use" },
      { timeframe: "3 months", description: "Exacerbation reduction benefit established" },
    ],
    },

    {
      name: "Salmeterol + Fluticasone",
      slug: "salmeterol-fluticasone",
      abbreviation: "S+F",
      aliases: ["seretide", "seroflo", "advair", "airflusal", "salmeterol fluticasone inhaler"],
      category: "allergy-respiratory",
      tagline: "ICS + LABA combination — asthma & COPD maintenance",
      description: "Fixed-dose combination of fluticasone propionate (inhaled corticosteroid) and salmeterol (long-acting beta-2 agonist). Fluticasone provides potent anti-inflammatory control; salmeterol provides 12-hour bronchodilation. Unlike formoterol, salmeterol has slow onset — not suitable for rescue use. Standard Step 3–5 asthma and COPD maintenance therapy.",
      color: "#0E7490",
      vial: "Dry powder inhaler (Accuhaler) / MDI",
      recon: "Fluticasone 100/250/500mcg + Salmeterol 50mcg per dose",
      startDose: "Fluticasone 100mcg + Salmeterol 50mcg — 1 inhalation twice daily",
      targetDose: "Fluticasone 250–500mcg + Salmeterol 50mcg twice daily",
      frequency: "Twice daily (morning and evening)",
      route: "Inhaled",
      storage: "Room temperature, dry place",
      benefits: "Effective long-term asthma control. Reduces exacerbations. Fluticasone is one of the most potent ICS — small doses achieve good control. Standard WHO/GINA-recommended combination. Also reduces COPD exacerbations.",
      tips: "Salmeterol has slow onset (~20 minutes) — NEVER use as rescue inhaler. Always have a separate fast-acting SABA (salbutamol) as rescue. Rinse mouth after use. Take at consistent times daily.",
      sideEffects: "Oral candidiasis (rinse after use), dysphonia, adrenal suppression at high ICS doses, tremor, palpitations from salmeterol.",
      watchOut: "Salmeterol is SLOW onset — cannot be used as rescue. Strict requirement for SABA rescue alongside. LABA without ICS contraindicated in asthma. GINA now prefers budesonide/formoterol SMART over fluticasone/salmeterol for SMART-eligible patients.",
      researchLevel: "Extensively Studied",
      tags: ["Respiratory", "ICS/LABA", "Asthma", "COPD"],
      researchIndications: [
        { category: "Respiratory", effectiveness: "Most Effective", items: [
          { title: "Moderate-Severe Asthma Maintenance", description: "GOAL trial: fluticasone/salmeterol achieves well-controlled asthma in significantly more patients than fluticasone monotherapy." },
          { title: "COPD — Exacerbation Prevention", description: "TORCH trial: fluticasone/salmeterol reduces COPD exacerbation rate by 25% and improves lung function vs placebo." },
          { title: "Step-Up from ICS Monotherapy", description: "Adding salmeterol to fluticasone (or stepping up dose) achieves better asthma control than doubling ICS dose alone." },
        ]},
      ],
      indianBrands: [
        { brand: "Seroflo 50/100 Inhaler" },
        { brand: "Seroflo 50/250 Inhaler" },
        { brand: "Seroflo 50/500 Inhaler" },
        { brand: "Airflusal 50/250 Inhaler" },
        { brand: "Seretide 50/100 Accuhaler" },
      ],
    ukBrands: [
      { brand: "Seretide 50/25mcg / 125/25mcg / 250/25mcg Evohaler", manufacturer: "GSK" },
      { brand: "Seretide 100/50mcg / 250/50mcg / 500/50mcg Accuhaler", manufacturer: "GSK" },
      { brand: "AirFluSal Forspiro 50/500mcg", manufacturer: "Sandoz" },
    ],
    usBrands: [
      { brand: "Advair HFA 45/21mcg / 115/21mcg / 230/21mcg Inhaler", manufacturer: "GSK" },
      { brand: "Advair Diskus 100/50mcg / 250/50mcg / 500/50mcg", manufacturer: "GSK" },
      { brand: "AirDuo RespiClick 55/14mcg / 113/14mcg / 232/14mcg", manufacturer: "Teva" },
    ],
    canadaBrands: [
      { brand: "Advair 125/25mcg / 250/25mcg Inhaler", manufacturer: "GSK" },
      { brand: "Advair Diskus 100/50mcg / 250/50mcg / 500/50mcg", manufacturer: "GSK" },
    ],
    
    overview: {
      whatIsIt: "Salmeterol-fluticasone (Seretide/Advair) is a fixed-dose ICS/LABA combination pairing fluticasone propionate (inhaled corticosteroid) with salmeterol (long-acting beta-2 agonist). First ICS/LABA combination to demonstrate reduced exacerbation rates in both asthma and COPD. Available as MDI (Evohaler) and dry powder (Accuhaler/Diskus).",
      keyBenefits: "First ICS/LABA combination approved and extensively studied. Proven exacerbation reduction in asthma and COPD (TRISTAN, GOAL, INSPIRE trials). Fluticasone propionate provides potent anti-inflammatory control. Twice-daily dosing. Widely available and familiar to healthcare providers. Available in multiple strengths for step-up/step-down dose adjustment.",
      mechanismOfAction: "Salmeterol: highly lipophilic LABA that anchors in the membrane near beta-2 receptors and acts as a 'pharmacological anchor' for prolonged bronchodilation (12h). Slower onset than formoterol — not suitable as a reliever. Fluticasone propionate: very high corticosteroid receptor affinity and potent anti-inflammatory activity. Together: sustained bronchodilation and inflammation control — synergistic interaction as steroids upregulate beta-2 receptor expression.",
    },
    pharmacokinetics: { peak: "Salmeterol: 10–20 min; Fluticasone: 1–2h (anti-inflammatory)", halfLife: "Salmeterol: 5.5h; Fluticasone: 8h", cleared: "24h" },
    researchProtocols: [
      { goal: "Asthma Maintenance (adults)", dose: "25/125 or 25/250 mcg MDI (2 puffs twice daily)", frequency: "Twice daily", route: "Inhaled" },
      { goal: "COPD Maintenance", dose: "50/500 mcg Accuhaler twice daily", frequency: "Twice daily", route: "Inhaled" },
    ],
    interactions: [
      { name: "Beta-blockers (block salmeterol bronchodilation)", status: "avoid" },
      { name: "CYP3A4 inhibitors (ritonavir, ketoconazole) — increase fluticasone systemic absorption → Cushing's risk", status: "caution" },
    ],
    sideEffectNotes: [
      "Oral candidiasis — rinse mouth after each dose",
      "Hoarseness — fluticasone local effect",
      "Salmeterol cardiovascular effects (palpitations, tachycardia) — at high doses",
      "IMPORTANT: salmeterol must always be used with an ICS — never as monotherapy (increased asthma mortality risk with LABA monotherapy)",
    ],
    faq: [
      { question: "Why can't salmeterol be used alone (without a steroid)?", answer: "LABA (long-acting beta-2 agonist) monotherapy in asthma is associated with increased severe asthma exacerbations and asthma-related deaths — demonstrated in the SMART trial and confirmed by subsequent meta-analyses. The mechanism is that LABAs bronchodilate without addressing airway inflammation, potentially masking worsening inflammation. All regulatory agencies mandate that LABAs must only be prescribed with an ICS in asthma. Seretide/Advair as a fixed-dose combination prevents inadvertent LABA monotherapy." },
      { question: "Can Seretide be used as a reliever inhaler?", answer: "No — salmeterol has a slower onset (10–20 minutes) than formoterol (3–5 minutes) or salbutamol (3 minutes). It is not suitable as an acute reliever. Seretide is a maintenance inhaler only — patients also need a separate salbutamol or formoterol-containing reliever for acute symptoms. This is a key disadvantage compared to Symbicort/budesonide-formoterol which can be used for SMART therapy." },
      { question: "Is Seretide or Symbicort better for asthma?", answer: "Both are ICS/LABA combinations with comparable long-term efficacy in asthma control. The key differences: Symbicort (budesonide/formoterol) can be used as a reliever (SMART strategy) due to formoterol's rapid onset — this has been shown to reduce severe exacerbations more effectively than Seretide + salbutamol. GINA guidelines now recommend ICS-formoterol-based SMART therapy as preferred over ICS/salmeterol + SABA regimens. Seretide remains effective and is preferred by some patients and providers due to familiarity." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Advair Diskus and HFA — asthma (≥4 years) and COPD" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Seretide — asthma and COPD; Evohaler (MDI) and Accuhaler (DPI)" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Seroflo, Seretide — widely available for asthma and COPD" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Advair — asthma and COPD" },
    ],
    expectTimeline: [
      { timeframe: "10–20 minutes", description: "Salmeterol bronchodilation onset" },
      { timeframe: "2–4 weeks", description: "Improved asthma symptom control" },
      { timeframe: "3 months", description: "Exacerbation reduction benefit established" },
    ],
    },

    // ─── ANTIBIOTICS & ANTIPARASITIC (additional) ────────────────────────────

    {
      name: "Fosfomycin",
      slug: "fosfomycin",
      abbreviation: "FOSF",
      aliases: ["monurol", "fosfocin", "fosfomycin trometamol", "fosfomycin tromethamine"],
      category: "antibiotic",
      tagline: "Phosphonic antibiotic — single-dose uncomplicated UTI",
      description: "Fosfomycin inhibits MurA, the enzyme catalysing the first step of bacterial cell wall peptidoglycan synthesis. Its unique mechanism means there is no cross-resistance with other antibiotic classes. Available as a 3g single-dose oral sachet (as trometamol/tromethamine salt) for uncomplicated UTI. Particularly valuable for multi-drug resistant UTI organisms including ESBL-producing E. coli.",
      color: "#166534",
      vial: "Oral granules / sachet; IV injection (hospital use)",
      recon: "3g oral sachet (fosfomycin trometamol); 8g/40mL IV (fosfomycin sodium)",
      startDose: "3g single dose (uncomplicated UTI in women)",
      targetDose: "3g every 48–72 hours (complicated UTI — 3 doses total)",
      frequency: "Single dose (uncomplicated); every 48h × 3 (complicated)",
      route: "Oral (sachet dissolved in water) or IV",
      storage: "Room temperature; dissolve in 90–120mL water just before use",
      benefits: "Single-dose therapy for uncomplicated cystitis — maximum adherence. Active against most UTI pathogens including ESBL-producing strains. No cross-resistance with other classes. Safe in pregnancy (trimester-dependent). Covers Enterococcus faecalis (unlike many standard antibiotics).",
      tips: "Dissolve sachet in 90–120mL of water. Take on empty stomach. Single dose is sufficient for uncomplicated female UTI. For male UTI or complicated cases, repeat every 48 hours for 3 doses.",
      sideEffects: "Diarrhoea, nausea, headache, vaginitis. Generally very well tolerated. GI effects mild.",
      watchOut: "Avoid in severe renal impairment (renal excretion). Not for upper UTI (pyelonephritis) with standard single dose. May cause false-positive glucose urine tests.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "UTI", "Single Dose", "ESBL", "Phosphonic Acid"],
      researchIndications: [
        { category: "Urinary Tract Infection", effectiveness: "Most Effective", items: [
          { title: "Uncomplicated Female UTI", description: "3g single dose equivalent to 5-day nitrofurantoin or 7-day TMP-SMX for uncomplicated lower UTI — EAU/IDSA guideline recommended alternative." },
          { title: "MDR / ESBL-Producing UTI", description: "One of few oral antibiotics with reliable activity against ESBL-producing E. coli and Klebsiella — critical role in MDR UTI management." },
          { title: "Enterococcal UTI", description: "Active against E. faecalis UTI — covers a gap left by most first-line UTI antibiotics." },
        ]},
      ],
      indianBrands: [
        { brand: "Fosfomycin 3 GM Sachet" },
        { brand: "Cystopen 3 GM" },
        { brand: "Fosfocin 3 GM Sachet" },
      ],
    ukBrands: [
      { brand: "Monuril 3g sachet", manufacturer: "Zambon" },
    ],
    usBrands: [
      { brand: "Monurol 3g sachet", manufacturer: "Forest Laboratories" },
    ],
    canadaBrands: [
      { brand: "Limited availability", notes: "Not widely licensed; access through Health Canada Special Access Programme" },
    ],
    
    overview: {
      whatIsIt: "Fosfomycin is a phosphonic acid antibiotic with a unique mechanism of action (inhibits UDP-N-acetylglucosamine enolpyruvyl transferase, MurA) — first-in-class for its target. Available as oral trometamol (for urinary tract infections) and IV disodium salt (for serious systemic infections). Single 3g oral sachet provides 48-hour urinary bactericidal concentrations for uncomplicated UTI.",
      keyBenefits: "Single 3g oral dose for uncomplicated UTI — simplest antibiotic regimen available. Active against multi-drug resistant organisms including ESBL-producing E. coli and VRE. Minimal impact on gut microbiome (narrow spectrum in urinary tract). Safe in pregnancy for UTI treatment. IV form used in severe MDR bacterial infections as part of combination therapy.",
      mechanismOfAction: "Inhibits MurA (UDP-N-acetylglucosamine enolpyruvyl transferase), the first step in peptidoglycan biosynthesis — a target not shared with any other antibiotic class. This unique mechanism provides activity against many organisms resistant to all other classes. Achieves very high concentrations in urine (up to 1000× plasma levels), contributing to its UTI efficacy from a single dose.",
    },
    pharmacokinetics: { peak: "2–2.5h (oral)", halfLife: "5.7h", cleared: "48h (urinary concentrations maintained)" },
    researchProtocols: [
      { goal: "Uncomplicated UTI (women)", dose: "3g sachet dissolved in water — single dose", frequency: "Single dose", route: "Oral" },
      { goal: "Recurrent/Complicated UTI", dose: "3g sachet every 48–72h × 3 doses", frequency: "Every 48–72 hours × 3 doses", route: "Oral" },
    ],
    interactions: [
      { name: "Metoclopramide (increases GI transit, reducing fosfomycin absorption)", status: "caution" },
      { name: "No significant CYP450 interactions", status: "compatible" },
    ],
    sideEffectNotes: [
      "Diarrhoea — most common; usually mild",
      "Nausea",
      "Headache",
      "Generally very well tolerated at single oral doses",
    ],
    faq: [
      { question: "How does a single dose of fosfomycin work for UTI?", answer: "Fosfomycin's pharmacokinetic properties make the single 3g dose strategy viable for uncomplicated UTIs. After oral absorption, fosfomycin is rapidly excreted unchanged in urine — achieving concentrations of 1000–2000 mg/L in urine within 2 hours, far above the MIC for E. coli and other common uropathogens. These concentrations are maintained for 24–48 hours, providing sustained bactericidal activity despite the single oral dose." },
      { question: "Can fosfomycin treat ESBL-producing bacteria?", answer: "Yes — fosfomycin retains activity against many ESBL (extended-spectrum beta-lactamase)-producing Enterobacteriaceae. Its unique mechanism (MurA inhibition) is unaffected by beta-lactamases or other resistance mechanisms common in MDR organisms. It is increasingly important for treating difficult-to-treat UTIs caused by ESBL-positive E. coli and Klebsiella. Susceptibility testing is still recommended as fosfomycin resistance does occur." },
      { question: "Is fosfomycin safe during pregnancy?", answer: "Yes — fosfomycin trometamol (oral) is considered safe in pregnancy and is a preferred treatment for uncomplicated UTIs in pregnant women (bacteriuria and cystitis) in multiple guidelines. It does not penetrate the placenta significantly and has not been associated with teratogenicity. It is particularly useful as an alternative to nitrofurantoin (avoid in late pregnancy) and trimethoprim (avoid in first trimester)." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Monurol — single 3g dose for uncomplicated UTI in women" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Monurol — licensed for uncomplicated UTI; IV formulation (Fomicyt) for MDR infections" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Fosfocin, Fosfos — oral sachet available for UTI" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Monurol — licensed for uncomplicated UTI" },
    ],
    expectTimeline: [
      { timeframe: "24–48 hours", description: "Symptomatic improvement from UTI" },
      { timeframe: "48 hours", description: "Full UTI treatment course from single dose" },
    ],
    },

    {
      name: "Albendazole",
      slug: "albendazole",
      abbreviation: "ABZ",
      aliases: ["zentel", "albenza", "albendazole 400mg", "alwormin"],
      category: "antibiotic",
      tagline: "Broad-spectrum antihelminthic — worm infections & cysts",
      description: "Albendazole inhibits microtubule polymerisation in helminths, disrupting glucose uptake and causing worm death. Broader spectrum than mebendazole and better systemic bioavailability (useful for tissue-invasive and extraintestinal infections). Active against roundworm, hookworm, whipworm, tapeworm, and importantly, cystic echinococcosis (hydatid disease) and neurocysticercosis.",
      color: "#166534",
      vial: "Oral tablet / chewable tablet",
      recon: "200mg, 400mg",
      startDose: "400mg single dose (most intestinal worms)",
      targetDose: "400mg/day × 3–5 days (hookworm/strongyloides); 400mg twice daily × 28-day cycles (hydatid/neurocysticercosis)",
      frequency: "Single dose to 28-day cycles depending on indication",
      route: "Oral (take with fatty meal to increase absorption)",
      storage: "Room temperature",
      benefits: "Broader spectrum and better systemic absorption than mebendazole. Essential for tissue-invasive helminth infections (echinococcosis, neurocysticercosis). Single 400mg dose curative for most soil-transmitted helminths. WHO Essential Medicine.",
      tips: "For intestinal infections: single dose. For tissue-invasive infections (hydatid, NCC): take with fatty food to maximise absorption. Cycles of 28 days on, 14 days off for hydatid disease.",
      sideEffects: "Abdominal pain, nausea, headache (common with intestinal treatment). Liver enzyme elevation, bone marrow suppression (rare, with long-term use). CNS effects with neurocysticercosis treatment (inflammatory response).",
      watchOut: "Hepatotoxicity and bone marrow suppression with prolonged courses — monitor LFTs and CBC in hydatid treatment. Caution in pregnancy (teratogenic in animals). NCC treatment requires anti-inflammatory coverage (steroids) to manage inflammation from dying cysts.",
      researchLevel: "Extensively Studied",
      tags: ["Antibiotic", "Antihelminthic", "Worm", "Hydatid", "Neurocysticercosis"],
      researchIndications: [
        { category: "Parasitic Infections", effectiveness: "Most Effective", items: [
          { title: "Soil-Transmitted Helminths", description: "Single 400mg dose: >90% cure for ascariasis; effective for hookworm, whipworm, and pinworm." },
          { title: "Neurocysticercosis", description: "400mg twice daily × 8–30 days (with steroids): reduces cyst number and epilepsy risk in NCC." },
          { title: "Cystic Echinococcosis (Hydatid)", description: "28-day cycles reduce cyst size and prevent recurrence after surgery. Adjunct to surgical/PAIR procedures." },
        ]},
      ],
      indianBrands: [
        { brand: "Zentel 200" },
        { brand: "Zentel 400" },
        { brand: "Alwormin 400" },
      ],
    ukBrands: [
      { brand: "Zentel 200mg / 400mg", manufacturer: "GSK", notes: "Specialist use — neurocysticercosis, echinococcosis" },
    ],
    usBrands: [
      { brand: "Albenza 200mg", manufacturer: "Amedra Pharmaceuticals" },
    ],
    canadaBrands: [
      { brand: "Not commercially available", notes: "Access via Health Canada Special Access Programme" },
    ],
    
    overview: {
      whatIsIt: "Albendazole is a broad-spectrum benzimidazole anthelmintic with systemic activity — unlike mebendazole which remains largely in the GI lumen. It is absorbed and distributed systemically, making it effective against tissue helminths (hydatid disease, neurocysticercosis, toxocariasis) as well as intestinal worms. An essential WHO medicine and cornerstone of mass deworming programmes globally.",
      keyBenefits: "Systemic distribution enables treatment of tissue-invasive helminth infections (hydatid cysts, neurocysticercosis, larva migrans). Effective against all major intestinal nematodes. Active against Giardia (off-label). Excellent safety profile in mass deworming campaigns (1.5 billion doses annually through WHO programmes). Once-daily dosing.",
      mechanismOfAction: "Albendazole is a prodrug converted by hepatic metabolism to albendazole sulfoxide (the active metabolite), which inhibits beta-tubulin polymerisation in helminths — disrupting microtubule assembly, glucose uptake, and energy metabolism. Higher systemic bioavailability than mebendazole enables activity in tissues beyond the GI lumen.",
    },
    pharmacokinetics: { peak: "2–5h (albendazole sulfoxide)", halfLife: "8–12h (sulfoxide)", cleared: "~48h" },
    researchProtocols: [
      { goal: "Intestinal Helminths (roundworm, hookworm, whipworm)", dose: "400mg single dose", frequency: "Single dose", route: "Oral" },
      { goal: "Hydatid Disease (Echinococcus)", dose: "400mg twice daily × 28 days (cycle with 14-day break × 3 cycles)", frequency: "Twice daily (with fatty meal)", route: "Oral" },
      { goal: "Neurocysticercosis (Taenia solium)", dose: "400mg twice daily × 8–30 days (with corticosteroids)", frequency: "Twice daily", route: "Oral" },
    ],
    interactions: [
      { name: "High-fat meals (increase albendazole sulfoxide absorption 3–5× — take with fatty food for systemic infections)", status: "timing" },
      { name: "Dexamethasone (increases albendazole sulfoxide levels — used therapeutically in neurocysticercosis)", status: "monitor" },
      { name: "Cimetidine (increases albendazole sulfoxide — higher systemic levels)", status: "monitor" },
    ],
    sideEffectNotes: [
      "GI effects (nausea, abdominal pain) — particularly at higher doses",
      "Elevated liver enzymes — monitor LFTs during treatment of systemic infections (hydatid, NCC)",
      "Alopecia (hair loss) — with prolonged systemic dosing (hydatid treatment)",
      "Bone marrow suppression — rare; with prolonged use; monitor FBC",
      "Teratogenic — avoid in pregnancy (first trimester); use effective contraception",
    ],
    faq: [
      { question: "Should albendazole be taken with food?", answer: "It depends on the indication. For intestinal parasites (threadworm, roundworm), albendazole can be taken fasted — minimal absorption is needed for luminal efficacy. For systemic helminth infections (hydatid cysts, neurocysticercosis, toxocariasis), take with a high-fat meal — fatty food increases albendazole sulfoxide (active metabolite) absorption 3–5 fold, greatly increasing systemic concentrations needed to reach tissue-invasive parasites." },
      { question: "What is neurocysticercosis and how does albendazole help?", answer: "Neurocysticercosis is caused by Taenia solium (pork tapeworm) larvae invading brain tissue — the most common cause of adult-onset epilepsy in endemic regions (Latin America, South Asia, sub-Saharan Africa). Albendazole kills the larvae (cysticerci) over weeks. Treatment is given with corticosteroids (dexamethasone or prednisolone) to suppress the inflammatory response to dying larvae, which could otherwise cause cerebral oedema and worsening seizures. Anticonvulsants manage seizures during and after treatment." },
      { question: "Can albendazole treat Giardia?", answer: "Albendazole has some activity against Giardia lamblia in clinical studies — equivalent to metronidazole in some trials. It is not the first-line treatment (metronidazole or tinidazole are preferred), but is an alternative particularly in mass deworming settings where a single drug treats multiple parasites. Albendazole 400mg/day for 5 days achieves good Giardia eradication rates." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Albenza — neurocysticercosis and hydatid disease; off-label for intestinal worms" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Eskazole — hydatid disease and neurocysticercosis; mebendazole preferred for intestinal worms" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Zentel, Albendazole — widely available; mass deworming programme drug" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Albenza — hydatid disease and neurocysticercosis" },
    ],
    expectTimeline: [
      { timeframe: "1–3 days", description: "Intestinal worm mortality (single-dose regimens)" },
      { timeframe: "3–6 months", description: "Hydatid cyst reduction with repeated treatment cycles" },
    ],
    },

    // ─── MISCELLANEOUS / SUPPORT ──────────────────────────────────────────────

    {
      name: "Sodium Bicarbonate Injection",
      slug: "sodium-bicarbonate-injection",
      abbreviation: "NaHCO3",
      aliases: ["sodium bicarb", "soda bicarbonate injection", "8.4% sodium bicarbonate"],
      category: "pain",
      tagline: "Alkalinising agent — acidosis, overdose & injection pH buffering",
      description: "Sodium bicarbonate provides bicarbonate ions to buffer systemic and local acidosis. Used intravenously for metabolic acidosis (DKA, cardiac arrest), as a buffer in local anaesthetic injections (reducing injection pain and speeding onset), and as urinary alkaliniser for drug overdose management (aspirin, TCAs) and uric acid stone prevention.",
      color: "#92400E",
      vial: "IV injection / Oral tablet",
      recon: "8.4% solution (1 mEq/mL); 4.2% solution (0.5 mEq/mL); 500mg, 600mg oral tablets",
      startDose: "IV: 1–2 mEq/kg for acute acidosis; Local buffering: 1mL 8.4% per 9mL lidocaine",
      targetDose: "Titrated to blood pH/bicarbonate",
      frequency: "As needed for acute management; oral 1–3 times daily for chronic indications",
      route: "IV infusion or oral",
      storage: "Room temperature; do not use if cloudy or precipitate present",
      benefits: "Corrects metabolic acidosis rapidly IV. Buffers local anaesthetic — reduces injection site pain by 80% and speeds onset. Alkalinises urine for aspirin/TCA overdose. Prevents uric acid kidney stones. Reduces DKA acidosis burden alongside insulin.",
      tips: "IV: give slowly (rapid IV causes hyponatraemia, hypokalaemia, paradoxical CNS acidosis). Local anaesthetic buffering: 1mL 8.4% NaHCO3 to 9mL lidocaine reduces injection pain significantly. Oral: take 1–2 hours after meals.",
      sideEffects: "Metabolic alkalosis (if over-administered), hyponatraemia, hypokalaemia, CO2 gas evolution (do not mix with calcium). Tissue necrosis if extravasation of 8.4% solution.",
      watchOut: "Do not use 8.4% solution in neonates (hyperosmolality). Avoid mixing with calcium (precipitation). Monitor blood pH and electrolytes carefully during IV therapy.",
      researchLevel: "Extensively Studied",
      tags: ["Support", "Alkalinising Agent", "Acidosis", "Overdose", "Injection Buffering"],
      researchIndications: [
        { category: "Emergency / Support", effectiveness: "Most Effective", items: [
          { title: "Metabolic Acidosis", description: "IV sodium bicarbonate corrects metabolic acidosis in DKA, lactic acidosis, and cardiac arrest (when pH < 7.1)." },
          { title: "Local Anaesthetic Buffering", description: "Adding 8.4% NaHCO3 to lidocaine raises pH to physiological — reduces injection pain by 80% and shortens onset time." },
          { title: "Aspirin/TCA Overdose (Urinary Alkalinisation)", description: "IV sodium bicarbonate alkalinises urine, trapping ionised aspirin/TCA and increasing renal elimination." },
        ]},
      ],
      indianBrands: [
        { brand: "Sodium Bicarbonate 8.4% Injection" },
        { brand: "Sodium Bicarbonate 4.2% Injection" },
        { brand: "Sodium Bicarbonate 500Tablet" },
      ],
    ukBrands: [
      { brand: "Sodium Bicarbonate 8.4% Intravenous Infusion (generic)", notes: "NHS-supplied from multiple manufacturers" },
    ],
    usBrands: [
      { brand: "Sodium Bicarbonate 8.4% Injection (generic)", notes: "Various manufacturers including Hospira" },
      { brand: "Neut (4.2% neutralising additive)", manufacturer: "ICU Medical" },
    ],
    canadaBrands: [
      { brand: "Sodium Bicarbonate Injection (generic)", notes: "Available from various manufacturers" },
    ],
    
    overview: {
      whatIsIt: "Sodium bicarbonate injection is an IV formulation used to correct metabolic acidosis in critical care settings. Also used as a urinary alkalinising agent (oral or IV) to prevent uric acid and cystine kidney stone formation, and to treat aspirin toxicity by alkalinising the blood and enhancing renal salicylate excretion.",
      keyBenefits: "Rapidly corrects severe metabolic acidosis in critical care. Essential for hyperkalaemia management (temporarily shifts K+ into cells). Used in aspirin (salicylate) overdose to trap salicylate in urine and plasma. Urinary alkalinisation prevents uric acid stone formation. IV bicarbonate is life-saving in specific acidotic emergencies.",
      mechanismOfAction: "Bicarbonate (HCO3−) is the body's primary extracellular buffer. Exogenous bicarbonate combines with hydrogen ions to form carbonic acid, which dissociates to CO2 (exhaled) and water — directly neutralising acidosis. Also shifts K+ into cells (in hyperkalaemia) by restoring normal pH-dependent membrane transport. Alkalinises urine, increasing ionisation of weak acids (salicylates, uric acid) — trapping them in urine and preventing reabsorption.",
    },
    pharmacokinetics: { peak: "Immediate (IV)", halfLife: "Variable (depends on respiratory compensation)", cleared: "Renal excretion; CO2 via exhalation" },
    researchProtocols: [
      { goal: "Severe Metabolic Acidosis (ICU)", dose: "1–2 mmol/kg IV (50–100 mmol, 50–100mL of 8.4% soln)", frequency: "Slow IV infusion over 30–60 min; repeat per ABG", route: "Intravenous" },
      { goal: "Aspirin Overdose — Urinary Alkalinisation", dose: "1–2 mmol/kg then infusion to maintain urine pH >7.5", frequency: "Continuous infusion", route: "Intravenous" },
      { goal: "Uric Acid Stone Prevention (oral)", dose: "1–4g orally", frequency: "Two to four times daily (titrate urine pH 6.5–7.5)", route: "Oral" },
    ],
    interactions: [
      { name: "Calcium-containing solutions (bicarbonate precipitates with calcium — never mix IV)", status: "avoid" },
      { name: "Lithium (alkalinisation increases renal lithium clearance — lower lithium levels)", status: "caution" },
      { name: "Many acidic drugs (IV bicarbonate will precipitate with acidic drugs — flush line between)", status: "caution" },
    ],
    sideEffectNotes: [
      "Metabolic alkalosis — from over-correction; CO2 CO2 retention in hypoventilating patients",
      "Hypokalaemia — bicarbonate shifts K+ intracellularly; monitor K+ closely",
      "Hypernatraemia — sodium load with large-volume IV bicarbonate",
      "Fluid overload — particularly in HF patients",
      "Tissue necrosis if extravasation (8.4% solution is hyperosmolar)",
    ],
    faq: [
      { question: "When is IV sodium bicarbonate used in emergencies?", answer: "IV sodium bicarbonate is used for: (1) Severe metabolic acidosis with pH <7.1–7.15 (especially lactic acidosis or DKA that is not responding to other treatment); (2) Hyperkalaemia — bicarbonate shifts K+ into cells; (3) Tricyclic antidepressant overdose — alkalinises sodium channel drug; (4) Aspirin overdose — urinary alkalinisation traps salicylate. It is NOT routinely used in cardiac arrest (historically used but now avoided except in specific toxicological causes)." },
      { question: "Why is sodium bicarbonate not routinely used in cardiac arrest?", answer: "Historical cardiac arrest protocols included routine sodium bicarbonate. Subsequent evidence showed this is harmful — bicarbonate generates CO2 which worsens intracellular acidosis in ischaemic cells, causes paradoxical CSF acidosis, and causes hyperosmolality and hypernatraemia. Current ACLS guidelines recommend sodium bicarbonate only for specific reversible causes of cardiac arrest: hyperkalaemia, TCA overdose, or hypermagnesaemia." },
      { question: "Can oral sodium bicarbonate be used for heartburn?", answer: "Oral sodium bicarbonate (baking soda) rapidly neutralises gastric acid and provides quick heartburn relief — onset within minutes. However, it generates CO2 gas (causing belching), provides only short-duration relief (1–2 hours), and provides a significant sodium load — problematic for people with hypertension, heart failure, or CKD. For regular heartburn, antacids (calcium carbonate) or H2 blockers (famotidine) are preferable. Never use sodium bicarbonate as a long-term heartburn treatment." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Sodium bicarbonate injection — metabolic acidosis, urinary alkalinisation" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Sodium bicarbonate 8.4% injection — critical care acidosis management; WHO essential medicine" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Sodium bicarbonate injection widely available for IV use" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Sodium bicarbonate injection — licensed for acidosis and urinary alkalinisation" },
    ],
    expectTimeline: [
      { timeframe: "Minutes (IV)", description: "Immediate pH correction; monitor ABG and electrolytes" },
      { timeframe: "Continuous monitoring", description: "ICU use requires frequent ABG-guided dosing" },
    ],
    },

  // ─── MISC / COMPOUNDING SUPPORT ──────────────────────────────────────────

  {
    name: "Bacteriostatic Water",
    slug: "bacteriostatic-water",
    abbreviation: "BW",
    aliases: ["bac water", "bacteriostatic water for injection", "bact water"],
    category: "hormonal",
    tagline: "Sterile bacteriostatic diluent — for reconstituting injectable peptides & hormones",
    description: "Bacteriostatic water for injection is sterile water containing 0.9% benzyl alcohol as a preservative (bacteriostat). Used as a multi-dose diluent for reconstituting lyophilised (freeze-dried) peptides, growth hormone, HCG, and other injectables. The benzyl alcohol prevents bacterial growth in the vial over multiple draws. Standard diluent for peptide and hormone reconstitution protocols.",
    color: "#0369A1",
    vial: "Multi-dose vial (5mL, 10mL, 30mL)",
    recon: "N/A — IS the diluent. Use as directed by each compound's reconstitution guide.",
    startDose: "Volume as required for target concentration (see compound-specific guides)",
    targetDose: "Compound-specific (e.g., 1mL BW per 5mg peptide = 5mg/mL stock)",
    frequency: "Used at time of reconstitution",
    route: "Subcutaneous or IM injection (as vehicle for reconstituted compound)",
    storage: "Room temperature prior to opening; refrigerate after opening (max 28 days); discard if cloudy or precipitate",
    benefits: "Multi-dose stability — benzyl alcohol preserves reconstituted peptides/hormones for up to 28 days refrigerated. Standard for GH (somatropin), HCG, IGF-1, BPC-157, TB-500, Melanotan II, and most lyophilised research peptides. Does not affect peptide potency.",
    tips: "Always inject BW into the vial slowly by directing stream along the glass wall — never inject directly onto the lyophilised powder (causes denaturation). Swirl gently; do not shake. Use an insulin syringe for precise small-volume dosing. Refrigerate after first use; use within 28 days.",
    sideEffects: "Benzyl alcohol: toxic in neonates (gasping syndrome) — never use in neonates or infants. Generally well tolerated in adults at the small volumes used.",
    watchOut: "Contraindicated in neonates (benzyl alcohol toxicity). Never use regular sterile water (not bacteriostatic) for multi-dose vials — bacterial contamination risk. Do not freeze reconstituted product. Use within 28 days of reconstitution.",
    researchLevel: "Foundational",
    tags: ["Compounding", "Diluent", "Reconstitution", "Peptide", "GH"],
    researchIndications: [
      { category: "Compounding / Reconstitution Support", effectiveness: "Effective", items: [
        { title: "Peptide Reconstitution", description: "Standard diluent for all lyophilised research peptides (BPC-157, TB-500, CJC-1295, Ipamorelin, etc.). Maintains multi-dose stability for up to 28 days refrigerated." },
        { title: "Hormone Reconstitution", description: "Used for HCG (human chorionic gonadotropin), somatropin (growth hormone), and IGF-1 reconstitution. Extends vial usability compared to sterile water." },
        { title: "Multi-Use Vial Safety", description: "0.9% benzyl alcohol preservative prevents bacterial growth across multiple needle entries into the same vial — essential for multi-dose peptide protocols." },
      ]},
    ],
    indianBrands: [
      { brand: "Bacteriostatic Water 10 ML Vial" },
      { brand: "Bac Water 30 ML Vial" },
    ],
    ukBrands: [
      { brand: "Bacteriostatic Water for Injections (generic)", notes: "NHS-issued; various manufacturers" },
    ],
    usBrands: [
      { brand: "Bacteriostatic Water for Injection 0.9% Benzyl Alcohol (generic)", notes: "Pfizer, Hospira, and others" },
    ],
    canadaBrands: [
      { brand: "Bacteriostatic Water for Injection (generic)", notes: "Available from compounding pharmacies and medical suppliers" },
    ],
  
    overview: {
      whatIsIt: "Bacteriostatic water for injection (BWFI) is sterile water containing 0.9% benzyl alcohol as a bacteriostatic preservative. It is used as a diluent for reconstituting lyophilised (freeze-dried) injectable medications and peptides for multiple-use vials. The benzyl alcohol preservative prevents microbial growth when the vial is punctured multiple times — enabling multi-dose use over 28 days when refrigerated.",
      keyBenefits: "Enables multi-dose reconstitution — a single vial can be used for multiple injections over 28 days with refrigeration, unlike sterile water for injection (SWFI) which allows single use only. Reduces cost per injection (fewer vials needed). Essential for peptide and hormone preparation — HGH, peptides, BPC-157 and other compounds are typically reconstituted with BWFI for repeated dosing.",
      mechanismOfAction: "Benzyl alcohol inhibits microbial growth (bacteriostatic, not bactericidal) by disrupting bacterial membrane function and inhibiting cellular respiration. At the 0.9% concentration in BWFI, it prevents contamination after needle puncture without adversely affecting the pharmacological properties of reconstituted drugs. It does not have therapeutic activity itself.",
    },
    pharmacokinetics: { peak: "N/A (diluent, not therapeutic)", halfLife: "N/A", cleared: "N/A" },
    researchProtocols: [
      { goal: "Peptide Reconstitution", dose: "Volume per vial as specified by compound (typically 1–2mL per mg)", frequency: "Reconstitute once; use over 28 days refrigerated", route: "Used as reconstitution diluent" },
    ],
    interactions: [
      { name: "Neonates — benzyl alcohol toxic to newborns at cumulative doses; BWFI is contraindicated in neonates under 4 weeks", status: "avoid" },
    ],
    sideEffectNotes: [
      "Benzyl alcohol toxicity in neonates — 'gasping syndrome' leading to metabolic acidosis, CNS depression, death; never use BWFI in neonates",
      "Injection site discomfort — benzyl alcohol can cause mild burning on injection",
      "Hypersensitivity to benzyl alcohol — rare",
    ],
    faq: [
      { question: "What is the difference between bacteriostatic water and sterile water for injection?", answer: "Sterile water for injection (SWFI) contains no preservative — once opened and punctured, it must be used immediately or discarded. Bacteriostatic water (BWFI) contains 0.9% benzyl alcohol, which prevents bacterial growth after puncture, allowing the vial to be used multiple times over 28 days when refrigerated. For single-use injections, SWFI is appropriate and cheaper. For peptides that require multiple small doses (e.g., daily or several times weekly), BWFI is standard practice to reduce waste and cost." },
      { question: "How long does reconstituted peptide last with bacteriostatic water?", answer: "Most reconstituted peptides stored in BWFI at 2–8°C (refrigerator) maintain stability and bacteriostasis for up to 28 days. After 28 days, benzyl alcohol's bacteriostatic effect may be insufficient and the peptide may have degraded. Some peptides (BPC-157, Ipamorelin) are more stable than others. Always store reconstituted vials upright in the refrigerator, protected from light. Discard if solution becomes turbid or develops visible particles." },
      { question: "Can I use tap water or sterile saline to reconstitute peptides?", answer: "No — never use tap water (non-sterile, contains minerals and bacteria) or standard saline for long-term multi-dose reconstitution. Tap water risks contamination and infection. 0.9% saline can be used as an alternative diluent for some peptides, but is not bacteriostatic — multi-dose use requires BWFI. Normal saline is appropriate as a carrier for peptide injections administered in a clinical setting but not for multi-dose home reconstitution vials." },
    ],
    regulatoryStatus: [
      { region: "USA", agency: "FDA", status: "Approved", notes: "Bacteriostatic water for injection — approved as a pharmaceutical diluent; multiple manufacturers" },
      { region: "UK", agency: "MHRA", status: "Approved", notes: "Bacteriostatic water for injection — licensed as sterile diluent for injectables" },
      { region: "India", agency: "CDSCO", status: "Approved", notes: "Available from pharmaceutical manufacturers as sterile diluent" },
      { region: "Canada", agency: "Health Canada", status: "Approved", notes: "Bacteriostatic water for injection — licensed diluent for injectable medications" },
    ],
    expectTimeline: [
      { timeframe: "N/A", description: "BWFI is a diluent — the timeline depends on the reconstituted therapeutic compound" },
      { timeframe: "Immediate (preparation)", description: "Once opened, a vial of bacteriostatic water can be reused over 28 days; effects from the drug reconstituted within it begin according to that drug's own pharmacokinetic profile" },
    ],
    },

];
