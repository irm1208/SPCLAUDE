-- Fix: BP40-0127 (BPC-157) mgAmount corrected from 40 → 45.53
-- Root cause: Gemini was extracting mg_amount from the "Sample: bpc 40mg" label
-- instead of the Results table "BPC-157 | 45.53 mg".
-- Verified: id=244, batch_code='BP40-0127', peptide_name='BPC-157', purity_pct=99.672
UPDATE lab_tests SET mg_amount = 45.53 WHERE batch_code = 'BP40-0127';
