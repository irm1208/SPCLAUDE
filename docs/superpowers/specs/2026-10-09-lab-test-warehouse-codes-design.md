# Lab-test warehouse codes

## Goal

Capture the warehouse encoded in lab-test batch codes without changing the
underlying compound, nominal dose, or original batch code. For example,
`US-SS50-0831` identifies the US warehouse and the existing `SS50` product
prefix (SS-31, 50mg).

## Approved behavior

- Recognize only a leading `US-` or `UK-`, case-insensitively, as a warehouse.
- Derive warehouse from the batch code rather than asking the AI to infer it.
- Preserve the full batch code exactly as extracted or entered.
- Ignore the recognized warehouse prefix only when matching the remaining code
  against known product/dose prefixes. This keeps codes such as
  `US-SS50-0831` matched to the existing SS-31 50mg mapping.
- Store warehouse as a separate nullable field on each lab-test record.
- Return warehouse in extraction results and show it in extraction review and
  admin lab-test views.
- Derive warehouse on the server when records are created or updated, including
  automatic extraction, so client-provided values cannot become stale.
- Leave unrecognized or unprefixed codes unchanged and warehouse unset.
- For existing rows with a null warehouse field, derive the display value from
  their batch code; do not rewrite historical batch codes.

## Data flow

1. Shared extraction parses the raw batch code and adds the derived warehouse
   to its result. The organiser-specific extraction response applies the same
   deterministic derivation.
2. Frontend extraction/review surfaces display the detected warehouse beside
   the batch code.
3. Lab-test create, edit, import, and re-extraction paths persist warehouse
   from the final batch code.
4. Admin list responses expose the saved value, with a batch-code-derived
   fallback for existing records.
5. Product-name resolution and lab-report prefix matching remove only a
   recognized leading warehouse prefix before checking existing prefix tables.
   The raw code remains untouched in storage and display.

## Failure handling

Unknown prefixes produce no warehouse label and do not prevent saving a lab
test. They are not guessed from the compound name, supplier, or dose. A
recognized warehouse prefix with an unknown product prefix still records the
warehouse while leaving product resolution unchanged.

## Verification

- Unit tests cover US and UK extraction, case handling, unprefixed/unknown
  codes, warehouse stripping for product matching, and dose-boundary safety.
- Tests verify `US-SS50-0831` resolves to the SS-31 50mg mapping while retaining
  the full batch code and records `US` separately; the UK form behaves the
  same.
- API tests cover extraction output and persisted values for create/update and
  automatic re-extraction paths.
- Frontend checks confirm extraction review and admin records display the
  warehouse without confusing it with measured lab potency.

## Scope limits

Only `US` and `UK` warehouse prefixes are supported by this change. No
warehouse is inferred from other code formats, and no historical batch-code
rewrites are performed.
