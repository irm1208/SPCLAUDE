import { CoaError } from "./coa-rules";

type ExportRow = { status: string; member: string; client: string; sample: string; manufacturer: string; batch: string };
/** Deliberately excludes payment evidence and staff-only notes. */
export function paidCoaTxt(rows: ExportRow[]) {
  const paid = rows.filter(r => ["paid", "processing", "completed"].includes(r.status));
  if (!paid.length) throw new CoaError("No paid COA requests match these filters.", 404);
  const line = (value: unknown) => String(value ?? "").replace(/[\r\n\u2028\u2029]+/g, " ").trim();
  return paid.map((r, i) => [
    `COA ${i + 1}`, `@${line(r.member).replace(/^@+/, "")}`,
    `Client: ${line(r.client)}`, `Sample: ${line(r.sample)}`,
    `Manufacturer: ${line(r.manufacturer)}`, `Batch: ${line(r.batch)}`,
  ].join("\n")).join("\n\n") + "\n";
}
