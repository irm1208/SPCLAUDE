export interface ProtocolSummary {
  dose: string;
  freq: string;
  route?: string;
  timing?: string;
  cycle?: string;
  breakBetween?: string;
}

export const PROTOCOL_LOOKUP: Record<string, ProtocolSummary> = {
  "Semaglutide": {
    dose: "0.25 mg weekly for 4 weeks, then 0.5 mg weekly; escalate every 4 weeks to target dose of 1–2 mg",
    freq: "Once weekly",
    route: "Abdomen, thigh, or upper arm — rotate sites each week",
    timing: "Same day each week, any time of day",
    cycle: "Continuous therapy — effects reverse upon discontinuation",
    breakBetween: "No cycling required — designed for continuous long-term use"
  },
  "Tirzepatide": {
    dose: "2.5 mg weekly for 4 weeks, then increase by 2.5 mg every 4 weeks to target 10–15 mg",
    freq: "Once weekly",
    route: "Abdomen, thigh, or upper arm — rotate sites weekly",
    timing: "Same day each week, any time of day",
    cycle: "Continuous therapy",
    breakBetween: "No cycling required"
  },
  "Retatrutide": {
    dose: "Start 0.5mg weekly (clinical practice) or 1mg weekly (trial protocol), escalate every 4 weeks to target 8–12mg",
    freq: "Once weekly",
    route: "Abdomen, thigh, upper arm — rotate weekly to prevent lipodystrophy",
    timing: "Any time of day, maintain same day each week for consistency",
    cycle: "Continuous therapy — effects reverse upon discontinuation",
    breakBetween: "No cycling required — designed for continuous use"
  },
  "Cagrilintide": {
    dose: "0.3 mg weekly for 4 weeks, escalating to 2.4 mg; consider CagriSema combination",
    freq: "Once weekly",
    route: "Abdomen, thigh, or upper arm — rotate sites",
    timing: "Same day each week",
    cycle: "Continuous therapy",
    breakBetween: "No cycling required"
  },
  "Mazdutide": {
    dose: "3 mg weekly, escalating to 6–9 mg over 8–12 weeks",
    freq: "Once weekly",
    route: "Abdomen, thigh, or upper arm",
    timing: "Same day each week",
    cycle: "Continuous therapy",
    breakBetween: "No cycling required"
  },
  "Survodutide": {
    dose: "2.4 mg weekly, escalating to 4.8 mg then 9.6 mg every 4 weeks as tolerated",
    freq: "Once weekly",
    route: "Abdomen, thigh, or upper arm",
    timing: "Same day each week",
    cycle: "Continuous therapy",
    breakBetween: "No cycling required"
  },
  "BPC-157": {
    dose: "250 mcg once or twice daily; for injury recovery up to 500 mcg daily total",
    freq: "Daily (once or split twice daily)",
    route: "Subcutaneously near injury site for musculoskeletal; oral for GI issues",
    timing: "Any time of day; oral BPC-157 best taken on empty stomach",
    cycle: "4–12 weeks for injury protocols; can be used indefinitely for gut health",
    breakBetween: "No mandatory break — excellent long-term safety profile"
  },
  "TB-500": {
    dose: "Loading: 2–4 mg twice weekly for 4–6 weeks. Maintenance: 2–4 mg once weekly",
    freq: "Twice weekly (loading) → once weekly (maintenance)",
    route: "Subcutaneous anywhere; IM for faster absorption",
    timing: "Post-workout or before sleep; consistent days each week",
    cycle: "Typically 8–12 weeks total (6 loading + maintenance)",
    breakBetween: "4–6 weeks off after a complete cycle"
  },
  "Fragment 176-191": {
    dose: "250–500 mcg daily, split or single dose fasted",
    freq: "Daily, fasted",
    route: "Any subcutaneous site — abdomen most practical",
    timing: "30–60 minutes before fasted exercise for maximum effect",
    cycle: "12–16 weeks on",
    breakBetween: "4–6 weeks off"
  },
  "CJC-1295": {
    dose: "100 mcg CJC-1295 (no DAC) combined with 100 mcg Ipamorelin",
    freq: "2–3× daily, fasted (or once nightly for sleep protocol)",
    route: "Subcutaneous — abdomen most convenient",
    timing: "Fasted state (2 hours after food); take nightly dose 30 min before sleep",
    cycle: "12 weeks on",
    breakBetween: "4 weeks off to prevent desensitisation"
  },
  "Ipamorelin": {
    dose: "100 mcg combined with 100 mcg CJC-1295 (no DAC)",
    freq: "2–3× daily, fasted",
    route: "Subcutaneous — abdomen",
    timing: "30–60 min after food has cleared; final dose 30 min before sleep",
    cycle: "12 weeks on",
    breakBetween: "4 weeks off"
  },
  "GHRP-6": {
    dose: "100 mcg GHRP-6 + 100 mcg CJC-1295",
    freq: "2–3× daily, fasted",
    route: "Subcutaneous",
    timing: "Fasted state; prepare for hunger 30–60 min after each injection",
    cycle: "12 weeks on",
    breakBetween: "4 weeks off"
  },
  "GHRP-2": {
    dose: "100 mcg GHRP-2 + 100 mcg CJC-1295",
    freq: "2–3× daily, fasted",
    route: "Subcutaneous",
    timing: "Fasted state",
    cycle: "12 weeks on",
    breakBetween: "4 weeks off"
  },
  "Tesamorelin": {
    dose: "1 mg daily, with option to increase to 2 mg after 4 weeks",
    freq: "Once daily before sleep",
    route: "Abdomen — rotate sites",
    timing: "30 minutes before sleep, in a fasted or low-carb state",
    cycle: "26 weeks with clinical monitoring",
    breakBetween: "8 weeks off between cycles"
  },
  "Semax": {
    dose: "200–300 mcg intranasal once daily in the morning",
    freq: "Once or twice daily",
    route: "Intranasal (preferred); subcutaneous as alternative",
    timing: "Morning — no later than early afternoon due to stimulatory effects",
    cycle: "4–8 weeks on",
    breakBetween: "2–4 weeks off"
  },
  "Selank": {
    dose: "250 mcg intranasal as needed or once daily",
    freq: "As needed or daily",
    route: "Intranasal preferred",
    timing: "Morning for daily use; 30 min before stressor for situational use",
    cycle: "4–8 weeks daily use, or as needed",
    breakBetween: "2–4 weeks off for daily protocols"
  },
  "Melanotan II": {
    dose: "Start at 100 mcg daily, increasing by 100 mcg every 3–5 days to 250–500 mcg; maintain 2–3× weekly",
    freq: "Daily (loading) → every 2–3 days (maintenance)",
    route: "Any subcutaneous site — abdomen most practical",
    timing: "30 minutes before sleep to minimise nausea",
    cycle: "2–4 weeks loading, then indefinite maintenance",
    breakBetween: "No mandatory break for maintenance; stop if skin concerns arise"
  },
  "Melanotan I": {
    dose: "500 mcg daily during loading (2–4 weeks), then 500 mcg every 2–3 days for maintenance",
    freq: "Daily (loading) → every 2–3 days (maintenance)",
    route: "Subcutaneous",
    timing: "Before sleep",
    cycle: "2–4 weeks loading then indefinite maintenance",
    breakBetween: "Stop if skin concerns arise"
  },
  "Testosterone Enanthate (TRT)": {
    dose: "100 mg/week (or 50 mg twice weekly for more stable levels)",
    freq: "Once or twice weekly",
    route: "Glute, quad, or deltoid — rotate each injection",
    timing: "Any consistent time of day",
    cycle: "Indefinite (ongoing TRT)",
    breakBetween: "Not applicable — continuous replacement therapy"
  },
  "Testosterone Cypionate (TRT)": {
    dose: "100 mg/week to start, titrate to symptom response and labs",
    freq: "Once weekly (or split twice weekly)",
    route: "Glute, quad, or deltoid — rotate sites",
    timing: "Consistent day(s) each week",
    cycle: "Indefinite",
    breakBetween: "Not applicable"
  },
  "Testosterone Enanthate (AAS)": {
    dose: "300–500 mg/week split into two equal injections",
    freq: "Twice weekly (e.g. Mon/Thu)",
    route: "Glute or quad — rotate each injection",
    timing: "Consistent days each week",
    cycle: "10–16 weeks",
    breakBetween: "Equal time off to cycle length (minimum)"
  },
  "Testosterone Propionate": {
    dose: "100 mg EOD (every other day)",
    freq: "Every other day IM",
    route: "Glute or deltoid — strictly rotate",
    timing: "EOD on a fixed schedule",
    cycle: "8–12 weeks",
    breakBetween: "Equal to cycle length minimum"
  },
  "Nandrolone Decanoate": {
    dose: "300–400 mg/week alongside 400–500 mg/week testosterone enanthate",
    freq: "Once or twice weekly IM",
    route: "Glute — rotate left/right",
    timing: "Same days as testosterone injections",
    cycle: "10–16 weeks",
    breakBetween: "Minimum equal time off — nandrolone suppresses for weeks post-cycle"
  },
  "Boldenone Undecylenate": {
    dose: "400 mg/week + testosterone base",
    freq: "Once weekly IM",
    route: "Glute — convenient for once-weekly dosing",
    timing: "Same day each week",
    cycle: "14–20 weeks",
    breakBetween: "Equal time off including clearance period"
  },
  "Trenbolone Acetate": {
    dose: "50 mg EOD (200 mg/week) as starting dose to assess tolerance",
    freq: "Every other day IM",
    route: "Glute — rotate left/right each injection",
    timing: "EOD schedule — consistent days",
    cycle: "8–10 weeks maximum",
    breakBetween: "Minimum equal to cycle length"
  },
  "Oxandrolone": {
    dose: "40 mg/day (20 mg morning + 20 mg evening) for men; 5–10 mg/day for women",
    freq: "Twice daily oral",
    route: "N/A (oral)",
    timing: "With food — morning and evening",
    cycle: "6–8 weeks",
    breakBetween: "4–8 weeks minimum off-cycle"
  },
  "Methandrostenolone": {
    dose: "30 mg/day split into 3 × 10 mg doses",
    freq: "3× daily oral (every ~5 hours)",
    route: "N/A (oral)",
    timing: "With food — spread across the day",
    cycle: "4–6 weeks",
    breakBetween: "8–12 weeks minimum off-cycle"
  },
  "Stanozolol": {
    dose: "25–40 mg/day (split morning and evening)",
    freq: "Twice daily oral",
    route: "N/A (oral)",
    timing: "With food",
    cycle: "6–8 weeks",
    breakBetween: "8–12 weeks minimum"
  },
  "Turinabol": {
    dose: "40 mg/day (20 mg morning + 20 mg evening)",
    freq: "Twice daily oral",
    route: "N/A (oral)",
    timing: "With food",
    cycle: "6–8 weeks",
    breakBetween: "Equal time off minimum"
  },
  "Ostarine": {
    dose: "15–20 mg/day, once daily",
    freq: "Once daily oral",
    route: "N/A (oral)",
    timing: "Morning, with or without food",
    cycle: "8–12 weeks",
    breakBetween: "4–8 weeks off (natural recovery) or mini-PCT"
  },
  "LGD-4033": {
    dose: "5 mg/day to start, optionally increase to 10 mg/day at week 4 if well tolerated",
    freq: "Once daily oral",
    route: "N/A (oral)",
    timing: "Morning",
    cycle: "8–10 weeks",
    breakBetween: "4–6 weeks natural recovery or 4-week PCT"
  },
  "RAD-140": {
    dose: "10 mg/day once daily",
    freq: "Once daily oral",
    route: "N/A (oral)",
    timing: "Morning with or without food",
    cycle: "6–8 weeks",
    breakBetween: "6–8 weeks including PCT and recovery"
  },
  "Cardarine": {
    dose: "10 mg/day, taken 1–2 hours before training",
    freq: "Once daily oral",
    route: "N/A (oral)",
    timing: "Pre-training",
    cycle: "8–12 weeks",
    breakBetween: "8–12 weeks off"
  },
  "Ibutamoren": {
    dose: "10–25 mg before bed",
    freq: "Once nightly",
    route: "N/A (oral)",
    timing: "30–60 minutes before sleep",
    cycle: "12–52 weeks (can be used long-term)",
    breakBetween: "Optional — not required as no hormonal suppression"
  },
  "Anastrozole": {
    dose: "0.25–0.5mg to 0.5–1mg",
    freq: "Every other day to daily (based on bloodwork)",
    route: "Oral"
  },
  "Tamoxifen": {
    dose: "40 mg/day × 2 weeks, then 20 mg/day × 4 weeks (standard PCT)",
    freq: "Once daily oral",
    route: "N/A (oral)",
    timing: "Start 2 weeks after last long-ester injection",
    cycle: "4–6 weeks PCT",
    breakBetween: "N/A — PCT is the break"
  },
  "Clomiphene": {
    dose: "12.5–25mg to 25–50mg daily or every other day",
    freq: "Daily or every other day",
    route: "Oral"
  },
  "Tadalafil": {
    dose: "10mg PRN or 2.5mg daily to 20mg PRN or 5mg daily",
    freq: "As needed or once daily",
    route: "Oral"
  },
  "HCG": {
    dose: "250 IU SC twice weekly on injection days",
    freq: "Twice weekly subcutaneous injection",
    route: "Subcutaneous — lower abdomen, inner thigh",
    timing: "On the same days as AAS injections",
    cycle: "Concurrent with AAS cycle",
    breakBetween: "Stop HCG; start SERM PCT"
  },
  "Enclomiphene": {
    dose: "12.5–25 mg once daily",
    freq: "Once daily oral",
    route: "N/A — oral tablet/capsule",
    timing: "Same time each day — morning preferred",
    cycle: "Ongoing or 6–26 weeks depending on goal",
    breakBetween: "Monitor and reassess at 3-month intervals"
  },
  "Glutathione": {
    dose: "600 mg IV 3× per week",
    freq: "Three times weekly",
    route: "IV: antecubital vein. IM: gluteal or deltoid",
    timing: "Post-exercise or morning administration",
    cycle: "4–12 weeks, then maintenance 1× weekly",
    breakBetween: "Optional — continuous maintenance dosing is common"
  },
  "Hexarelin": {
    dose: "100 mcg per injection",
    freq: "Twice daily (AM and bedtime)",
    route: "Subcutaneous — abdomen or thigh",
    timing: "Fasted — 20–30 min before meals",
    cycle: "8–16 weeks",
    breakBetween: "4 weeks minimum between cycles"
  },
  "HMG": {
    dose: "75 IU SC, 3× per week",
    freq: "Three times weekly (Mon/Wed/Fri)",
    route: "Subcutaneous — lower abdomen or thigh",
    timing: "Same days as HCG — administer as separate injections",
    cycle: "3–6 months, extend if semen analysis improving",
    breakBetween: "Ongoing until fertility goals achieved"
  },
  "NAD+": {
    dose: "500 mg in 250 ml 0.9% NaCl",
    freq: "Once daily (loading) then weekly",
    route: "IV — antecubital vein or IV cannula",
    timing: "Morning — avoid afternoon/evening due to energy effects",
    cycle: "5–10 day loading course, then monthly",
    breakBetween: "Monthly infusions or as directed"
  },
  "Oxytocin Acetate": {
    dose: "20 IU intranasal (2 sprays per nostril)",
    freq: "As needed or twice daily",
    route: "Intranasal — 1 spray per nostril (sniff gently)",
    timing: "15–20 minutes before desired effect",
    cycle: "As needed or 2–4 weeks",
    breakBetween: "1–2 weeks between extended courses"
  },
  "P21": {
    dose: "100–200 mcg intranasal daily",
    freq: "Once daily (morning)",
    route: "Intranasal — nasal atomiser device recommended",
    timing: "Morning on waking — cognitive peptides benefit from morning administration",
    cycle: "4–12 weeks",
    breakBetween: "2–4 weeks between cycles"
  },
  "PE 22-28": {
    dose: "100–200 mcg intranasal daily",
    freq: "Once daily (morning)",
    route: "Intranasal — nasal atomiser",
    timing: "Morning for cognitive benefit; evening for mood support (user preference)",
    cycle: "4–8 weeks",
    breakBetween: "2–4 weeks between cycles"
  },
  "Pinealon": {
    dose: "100–200 mcg intranasal daily",
    freq: "Once daily",
    route: "Intranasal — nasal atomiser or drops",
    timing: "Morning for cognitive focus; evening for sleep and circadian support",
    cycle: "10–30 days",
    breakBetween: "Quarterly courses with breaks in between"
  },
  "PT-141": {
    dose: "0.5–1 mg SC (titrate from low)",
    freq: "As needed; max once per 72 hours",
    route: "Abdomen or thigh — subcutaneous",
    timing: "45–60 minutes before sexual activity",
    cycle: "As needed",
    breakBetween: "Minimum 72 hours between doses"
  },
  "Epitalon": {
    dose: "5 mg SC once daily",
    freq: "Daily for 10–20 consecutive days",
    route: "Abdomen — subcutaneous",
    timing: "Morning or early afternoon",
    cycle: "10–20 days",
    breakBetween: "3–6 months between courses"
  },
  "Mots-C": {
    dose: "5 mg SC",
    freq: "Daily or 5× per week",
    route: "Abdomen or thigh — subcutaneous",
    timing: "30–60 min before training; morning on rest days",
    cycle: "4–8 weeks",
    breakBetween: "2–4 weeks"
  },
  "5-Amino-1MQ": {
    dose: "50 mg once daily; may increase to 100 mg after 2–4 weeks",
    freq: "Once daily",
    route: "Oral — no injection",
    timing: "Morning with or without food",
    cycle: "8–12 weeks",
    breakBetween: "4 weeks"
  },
  "Adalank": {
    dose: "200 mcg once daily; titrate to 200–500 mcg as tolerated",
    freq: "1–2× daily",
    route: "Subcutaneous (abdomen or thigh) or intranasal",
    timing: "Morning; second dose mid-afternoon if twice daily",
    cycle: "2–4 weeks",
    breakBetween: "1–2 weeks"
  },
  "AHK-Cu (Copper Tripeptide-3)": {
    dose: "0.3–1% solution applied to scalp twice daily",
    freq: "1–2× daily",
    route: "Topical — scalp application",
    timing: "Morning and evening application; leave on scalp",
    cycle: "12–24 weeks minimum continuous use",
    breakBetween: "No cycling required for topical use"
  },
  "AOD-9604": {
    dose: "250 mcg SC once daily, fasted",
    freq: "Once daily",
    route: "Abdomen — subcutaneous, rotate sites",
    timing: "30–60 minutes before breakfast for maximum lipolytic window",
    cycle: "8–12 weeks",
    breakBetween: "4–6 weeks"
  },
  "Ara 290": {
    dose: "4 mg SC once daily; may increase to 8 mg if tolerated",
    freq: "Once daily for 28 days",
    route: "Anterior thigh or abdomen — subcutaneous",
    timing: "Morning injection; consistent daily timing",
    cycle: "28 days",
    breakBetween: "14 days minimum"
  },
  "Bioglutide": {
    dose: "Per clinical trial protocol",
    freq: "Once daily oral",
    route: "Oral — no injection",
    timing: "Consistent daily timing — morning preferred",
    cycle: "Continuous therapy",
    breakBetween: "None — continuous therapy"
  },
  "Bromantane": {
    dose: "50 mg once daily in the morning; may increase to 100 mg after 1–2 weeks",
    freq: "Once daily",
    route: "Oral — no injection",
    timing: "Morning with or without food; avoid evening dosing",
    cycle: "4–8 weeks",
    breakBetween: "2–4 weeks"
  },
  "Cardiogen": {
    dose: "1 mg SC once daily",
    freq: "Daily for 10-day cycle",
    route: "Abdomen or thigh — subcutaneous",
    timing: "Morning injection",
    cycle: "10 days",
    breakBetween: "3–6 months"
  },
  "Cartalax": {
    dose: "100 mcg (1 capsule) once daily",
    freq: "Once daily",
    route: "Oral — no injection",
    timing: "Morning with water",
    cycle: "4–8 weeks",
    breakBetween: "4 weeks"
  },
  "Cerebrolysin": {
    dose: "10 mL IV once daily initially; increase to 20–30 mL for neurological indications",
    freq: "Daily for 10–20 day course",
    route: "IV drip (diluted in 100 mL saline) or IM injection",
    timing: "Morning administration; infuse over 30–60 minutes",
    cycle: "10–20 days",
    breakBetween: "3–6 months"
  },
  "CJC-1295 with DAC": {
    dose: "1 mg SC once weekly; may increase to 2 mg after 4 weeks",
    freq: "Once weekly, same day each week",
    route: "Abdomen or thigh — rotate sites weekly",
    timing: "Any time of day — not meal-dependent (unlike no-DAC)",
    cycle: "8–12 weeks",
    breakBetween: "4 weeks"
  },
  "CJC-1295 + Ipamorelin Protocol": {
    dose: "100 mcg of each peptide, drawn into one syringe",
    freq: "Once daily at bedtime initially; add morning fasted dose after 1–2 weeks",
    route: "Abdomen — subcutaneous; rotate sites",
    timing: "Always inject fasted (2+ hours post-meal); bedtime is the highest-priority injection",
    cycle: "8–12 weeks",
    breakBetween: "4 weeks"
  },
  "Cyclic Glycine-Proline": {
    dose: "Per available research protocols (emerging data)",
    freq: "Daily oral",
    route: "Oral — no injection",
    timing: "Morning with water",
    cycle: "8–12 weeks",
    breakBetween: "4 weeks"
  },
  "DSIP": {
    dose: "100 mcg SC, 30 minutes before sleep",
    freq: "Nightly; cycle 5 on / 2 off",
    route: "Abdomen — subcutaneous",
    timing: "30 minutes before bedtime",
    cycle: "3–4 weeks",
    breakBetween: "1–2 weeks"
  },
  "Fat Blaster": {
    dose: "1 mL IM or SC, 1–3 times per week",
    freq: "1–3× per week",
    route: "IM (gluteal or deltoid) or SC (abdomen)",
    timing: "Morning before workout or with breakfast",
    cycle: "8–12 weeks",
    breakBetween: "2–4 weeks"
  },
  "Follistatin 344": {
    dose: "50 mcg SC daily; may increase to 100 mcg after 2 weeks",
    freq: "Daily",
    route: "Abdomen — subcutaneous",
    timing: "Pre-workout or morning",
    cycle: "4–6 weeks",
    breakBetween: "4 weeks"
  },
  "GHK-Cu": {
    dose: "1% topical serum applied to face and scalp; or 200 mcg SC for systemic effects",
    freq: "Topical: once or twice daily. Injectable: 3–5× per week.",
    route: "Topical: face, scalp, body areas of concern. Injectable: abdomen SC.",
    timing: "Topical evening application preferred; injectable morning",
    cycle: "12 weeks minimum",
    breakBetween: "No cycling required for topical; 4-week breaks for injectable"
  },
  "Glow Protocol": {
    dose: "Per blend vial (verify individual component doses)",
    freq: "3–5× per week",
    route: "Abdomen or thigh — subcutaneous; rotate sites",
    timing: "Morning or evening — consistent timing",
    cycle: "12 weeks",
    breakBetween: "4 weeks"
  },
  "HGH (Somatropin)": {
    dose: "1 IU SC daily; increase by 0.5 IU every 2–4 weeks to target",
    freq: "Daily (or 5×/week)",
    route: "Abdomen — subcutaneous; rotate sites daily",
    timing: "Bedtime (preferred for GH pulse synergy) or morning fasted",
    cycle: "12–24 weeks",
    breakBetween: "4–8 weeks"
  },
  "IGF-1 LR3": {
    dose: "20–40 mcg post-workout initially; increase cautiously to 80–100 mcg",
    freq: "Once daily post-workout or post-meal",
    route: "SC abdomen or IM in trained muscle group",
    timing: "ALWAYS post-workout or with food — never fasted",
    cycle: "4 weeks",
    breakBetween: "4 weeks minimum"
  },
  "Kisspeptin": {
    dose: "100 mcg SC every 90 minutes (pulsatile); or 250 mcg twice daily for research",
    freq: "Pulsatile — every 90 min OR twice daily",
    route: "Abdomen — subcutaneous; rotate",
    timing: "Pulsatile protocol: pump or manual timing. Twice-daily: morning and evening.",
    cycle: "4–8 weeks",
    breakBetween: "2–4 weeks"
  },
  "K-Low Protocol": {
    dose: "Per blend vial instructions",
    freq: "3–5× per week",
    route: "Abdomen — subcutaneous",
    timing: "Morning or evening — consistent",
    cycle: "12 weeks",
    breakBetween: "4 weeks"
  },
  "KPV": {
    dose: "200 mcg SC twice daily; or oral formulation for gut-specific use",
    freq: "1–2× daily",
    route: "Abdomen — subcutaneous; or oral capsule",
    timing: "Morning and evening",
    cycle: "4–6 weeks",
    breakBetween: "2 weeks"
  },
  "L-Carnitine": {
    dose: "1 g oral daily or 500 mg IM 3× per week",
    freq: "Daily (oral) or 3× per week (injectable)",
    route: "IM (gluteal or deltoid) or IV infusion",
    timing: "30–60 min pre-workout or with meals",
    cycle: "12 weeks or continuous",
    breakBetween: "No cycling required for established supplementation"
  },
  "Lipo-C": {
    dose: "1 mL IM injection",
    freq: "1–3× per week",
    route: "IM (gluteal or deltoid) preferred; SC (abdomen) acceptable",
    timing: "Morning — consistent day-of-week scheduling",
    cycle: "8–12 weeks",
    breakBetween: "4 weeks"
  },
  "NA-Semax Amidate": {
    dose: "100 mcg intranasal once daily; may increase to 200–300 mcg twice daily",
    freq: "Once or twice daily",
    route: "Intranasal (nasal spray) or SC abdomen",
    timing: "Morning; second dose no later than early afternoon",
    cycle: "2–4 weeks",
    breakBetween: "1–2 weeks"
  },
  "Omberacetam": {
    dose: "10 mg once or twice daily; may increase to 20–30 mg after 2 weeks",
    freq: "1–2× daily",
    route: "Oral tablet or intranasal (in saline)",
    timing: "Morning and noon; avoid evening dosing",
    cycle: "6–8 weeks",
    breakBetween: "4 weeks"
  },
  "PEG-MGF": {
    dose: "200 mcg SC post-workout; 200 mcg on rest day",
    freq: "2× per week",
    route: "Abdomen or near trained muscle — subcutaneous",
    timing: "Post-workout (within 1 hour); second dose 3–4 days later",
    cycle: "4–6 weeks",
    breakBetween: "4 weeks"
  },
  "PNC-27": {
    dose: "Research protocol only — not for human use",
    freq: "Research only",
    route: "Research only",
    timing: "Research only",
    cycle: "Research only",
    breakBetween: "Research only"
  },
  "Prostamax": {
    dose: "200 mcg oral daily",
    freq: "Once daily",
    route: "Oral — no injection",
    timing: "Morning with water",
    cycle: "10–30 days",
    breakBetween: "Per Khavinson protocol"
  },
  "Sermorelin": {
    dose: "200 mcg SC at bedtime; increase to 300 mcg after 4 weeks if well tolerated",
    freq: "Once daily at bedtime",
    route: "Abdomen — subcutaneous; rotate sites",
    timing: "At bedtime, 2+ hours after last meal",
    cycle: "3–6 months continuous",
    breakBetween: "4–6 weeks every 6 months"
  },
  "SNAP-8": {
    dose: "4% topical solution applied to target areas",
    freq: "Twice daily (morning and evening)",
    route: "Topical — face target areas (crow's feet, forehead, glabella)",
    timing: "Morning and evening skincare routine",
    cycle: "Ongoing — continuous use for maintenance",
    breakBetween: "No cycling — continuous use required"
  },
  "SS-31": {
    dose: "1 mg SC daily; may increase to 2–4 mg based on tolerance",
    freq: "Daily or 5× per week",
    route: "Abdomen — subcutaneous; rotate sites",
    timing: "Morning injection",
    cycle: "4–8 weeks",
    breakBetween: "2–4 weeks"
  },
  "Testagen": {
    dose: "200 mcg oral once daily",
    freq: "Once daily",
    route: "Oral — no injection",
    timing: "Morning with water",
    cycle: "10–30 days",
    breakBetween: "Per Khavinson protocol"
  },
  "Thymosin Alpha-1": {
    dose: "1.6 mg SC twice weekly (Mon and Thu)",
    freq: "2× per week",
    route: "Abdomen, thigh, or upper arm — subcutaneous; rotate sites",
    timing: "Any time of day — consistent twice-weekly dosing",
    cycle: "4 weeks (immune support) to 12 months (hepatitis treatment)",
    breakBetween: "Per indication — chronic hepatitis: continuous therapy"
  },
  "Thymosin Beta-4": {
    dose: "500 mcg SC 3× per week initially; increase to 1–2 mg as needed",
    freq: "3–5× per week",
    route: "Abdomen or thigh — subcutaneous; rotate",
    timing: "Morning or pre-workout",
    cycle: "8–12 weeks",
    breakBetween: "4 weeks"
  },
  "VIP": {
    dose: "50 mcg intranasal 4× daily (CIRS protocol) or 25 mcg SC once daily",
    freq: "4× daily intranasal or once daily SC",
    route: "Intranasal (nasal spray) or SC abdomen",
    timing: "Intranasal: every 6 hours. SC: morning.",
    cycle: "Ongoing per CIRS protocol; 4–8 weeks general",
    breakBetween: "Per protocol guidance"
  },
  "Wolverine Stack": {
    dose: "250 mcg BPC-157 + 500 mcg TB-500 in one syringe, once daily",
    freq: "Once daily (or BPC-157 daily + TB-500 3× per week separately)",
    route: "SC as close to injury as safely possible; rotate sites",
    timing: "Morning — consistent daily timing for acute injury protocol",
    cycle: "4–12 weeks",
    breakBetween: "4 weeks"
  },
  "Eloralintide": {
    dose: "1 mg SC weekly × 4 weeks → 2–3 mg × 4 weeks → titrate by 1–2 mg every 4 weeks to target (3–9 mg based on Phase 2)",
    freq: "Once weekly",
    route: "Abdomen or thigh — subcutaneous, rotate sites weekly",
    timing: "Any consistent day of the week. Note: ~2-week half-life means steady-state takes 6–8 weeks — do not judge response before this.",
    cycle: "Ongoing (not typically cycled — metabolic therapy)",
    breakBetween: "Not routinely cycled; consult healthcare provider if taking planned breaks"
  },
  "Sildenafil": {
    dose: "25–50mg to 100mg",
    freq: "As needed (30–60 min before activity)",
    route: "Oral"
  },
  "Vardenafil": {
    dose: "10mg to 20mg",
    freq: "As needed (25–60 min before activity)",
    route: "Oral"
  },
  "Dapoxetine": {
    dose: "30mg to 60mg",
    freq: "1–3 hours before sexual activity",
    route: "Oral"
  },
  "Modafinil": {
    dose: "100mg to 200mg",
    freq: "Once daily (morning) or prior to shift",
    route: "Oral"
  },
  "Armodafinil": {
    dose: "50–75mg to 150mg",
    freq: "Once daily (morning)",
    route: "Oral"
  },
  "Tretinoin": {
    dose: "0.025% every other night to 0.05–0.1% nightly",
    freq: "Once nightly (after skin acclimatisation)",
    route: "Topical"
  },
  "Isotretinoin": {
    dose: "0.5mg/kg/day to 1mg/kg/day (target cumulative dose 120–150mg/kg)",
    freq: "Once or twice daily with food",
    route: "Oral"
  },
  "Azelaic Acid": {
    dose: "10% or 15% twice daily to 20% twice daily (for hyperpigmentation)",
    freq: "Twice daily (morning and evening)",
    route: "Topical"
  },
  "Finasteride": {
    dose: "1mg to 1mg daily",
    freq: "Once daily (same time)",
    route: "Oral"
  },
  "Dutasteride": {
    dose: "0.5mg to 0.5mg daily",
    freq: "Once daily",
    route: "Oral"
  },
  "Minoxidil (Topical)": {
    dose: "5% solution or foam — 1ml applied to scalp to 5% solution or foam — 1ml twice daily",
    freq: "Twice daily (morning and evening)",
    route: "Topical (scalp)"
  },
  "Minoxidil (Oral / LDOM)": {
    dose: "0.5mg once daily (men); 0.25mg once daily (women) to 2.5mg once daily (men); 0.5–1mg once daily (women)",
    freq: "Once daily (same time each day)",
    route: "Oral"
  },
  "Human Chorionic Gonadotropin (HCG)": {
    dose: "250–500 IU to 500–1000 IU",
    freq: "2–3x per week (concurrent TRT) or EOD during PCT",
    route: "Subcutaneous or intramuscular injection"
  },
  "Cabergoline": {
    dose: "0.25mg to 0.5–1mg twice weekly",
    freq: "Twice weekly (not daily)",
    route: "Oral"
  },
  "Exemestane": {
    dose: "12.5mg to 25mg",
    freq: "Daily with food or every other day",
    route: "Oral"
  },
  "Metformin": {
    dose: "500mg to 1500–2000mg/day",
    freq: "Twice or thrice daily with meals",
    route: "Oral"
  },
  "Propranolol": {
    dose: "10–20mg to 40–80mg",
    freq: "Two to three times daily (immediate release)",
    route: "Oral"
  },
  "Telmisartan": {
    dose: "20–40mg to 80mg",
    freq: "Once daily",
    route: "Oral"
  },
  "Rosuvastatin": {
    dose: "5–10mg to 20–40mg",
    freq: "Once daily (any time, preferably evening)",
    route: "Oral"
  },
  "Sertraline": {
    dose: "25–50mg to 50–200mg",
    freq: "Once daily (morning or evening)",
    route: "Oral"
  },
  "Bupropion": {
    dose: "150mg XL to 300mg XL",
    freq: "Once daily (XL formulation)",
    route: "Oral"
  },
  "Buspirone": {
    dose: "5mg to 15–30mg/day (in divided doses)",
    freq: "Two to three times daily",
    route: "Oral"
  },
  "Zopiclone": {
    dose: "3.75–7.5mg to 7.5mg",
    freq: "Once nightly (immediately before bed)",
    route: "Oral"
  },
  "Gabapentin": {
    dose: "300mg to 900–1800mg/day (in divided doses)",
    freq: "Three times daily",
    route: "Oral"
  },
  "Pregabalin": {
    dose: "75mg to 150–300mg/day (in divided doses)",
    freq: "Twice or three times daily",
    route: "Oral"
  },
  "Ivermectin": {
    dose: "150–200 mcg/kg (single dose) to 150–200 mcg/kg for parasitic infections",
    freq: "Single dose or once weekly/monthly (depending on indication)",
    route: "Oral (topical for scabies)"
  },
  "Azithromycin": {
    dose: "500mg to 500mg day 1, then 250mg days 2–5",
    freq: "Once daily (due to long half-life)",
    route: "Oral"
  },
  "Doxycycline": {
    dose: "100mg to 100mg twice daily",
    freq: "Twice daily",
    route: "Oral"
  },
  "Amoxicillin": {
    dose: "250–500mg to 500mg",
    freq: "Three times daily (or twice daily for 875mg)",
    route: "Oral"
  },
  "Bacteriostatic Water": {
    dose: "Volume as required for target concentration (see compound-specific guides) to Compound-specific (e.g., 1mL BW per 5mg peptide = 5mg/mL stock)",
    freq: "Used at time of reconstitution",
    route: "Subcutaneous or IM injection (as vehicle for reconstituted compound)"
  }
};

export function findProtocol(compoundName: string): ProtocolSummary | null {
  const norm = compoundName.toLowerCase().trim();
  const keys = Object.keys(PROTOCOL_LOOKUP);
  const exact = keys.find(k => k.toLowerCase() === norm);
  if (exact) return PROTOCOL_LOOKUP[exact];
  const partial = keys.find(k => norm.includes(k.toLowerCase()) || k.toLowerCase().includes(norm));
  return partial ? PROTOCOL_LOOKUP[partial] : null;
}

export function formatProtocolForSage(name: string, p: ProtocolSummary): string {
  const lines = ["[PROTOCOL: " + name + "]"];
  lines.push("  Dose: " + p.dose);
  lines.push("  Frequency: " + p.freq);
  if (p.route) lines.push("  Route/Site: " + p.route);
  if (p.timing) lines.push("  Timing: " + p.timing);
  if (p.cycle) lines.push("  Cycle: " + p.cycle);
  if (p.breakBetween) lines.push("  Break: " + p.breakBetween);
  return lines.join("\n");
}