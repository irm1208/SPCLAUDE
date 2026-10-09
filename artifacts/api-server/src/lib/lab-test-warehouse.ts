export type LabTestWarehouse = "US" | "UK";

export interface ParsedLabTestBatchCode {
  warehouse: LabTestWarehouse | null;
  productBatchCode: string | null;
}

/** Extracts a recognized warehouse only from the beginning of a batch code. */
export function parseLabTestBatchCode(
  batchCode: string | null | undefined,
): ParsedLabTestBatchCode {
  const trimmed = batchCode?.trim() ?? "";
  const match = /^(US|UK)-(.*)$/i.exec(trimmed);
  if (!match) {
    return { warehouse: null, productBatchCode: trimmed || null };
  }
  return {
    warehouse: match[1].toUpperCase() as LabTestWarehouse,
    productBatchCode: match[2].trim() || null,
  };
}
