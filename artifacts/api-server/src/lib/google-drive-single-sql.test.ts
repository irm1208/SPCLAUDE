import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uploadSingleSqlBackup } from "./google-drive-single-sql";

let dir: string;
let path: string;
const name = "S&PBACKUP-2026-10-24_12-00-00.SQL";
const bytes = Buffer.alloc(256 * 1024 + 17, 45);
const session = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=private-session";
const metadata = { id: "saved", name, size: String(bytes.length), md5Checksum: createHash("md5").update(bytes).digest("hex") };
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "single-sql-test-"));
  path = join(dir, name);
  await writeFile(path, bytes, { mode: 0o600 });
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
function dependencies() {
  return {
    startUpload: vi.fn(async () => session),
    findExisting: vi.fn(async () => [] as typeof metadata[]),
    getFile: vi.fn(async () => ({ ...metadata })),
    request: vi.fn(async (_url: string, _headers: Record<string, string>, _body?: Buffer) => Response.json({ id: "saved" })),
    sleep: vi.fn(async () => {}),
    chunkSize: 256 * 1024,
  };
}
it("uploads raw chunks directly into one file, handles 308 and verifies its exact checksum", async () => {
  const deps = dependencies();
  deps.request.mockResolvedValueOnce(new Response(null, { status: 308, headers: { range: "bytes=0-262143" } }));
  await expect(uploadSingleSqlBackup(path, name, deps)).resolves.toEqual(metadata);
  expect(deps.request).toHaveBeenCalledTimes(2);
  expect(deps.request.mock.calls[0][1]["Content-Range"]).toBe(`bytes 0-262143/${bytes.length}`);
  expect(Buffer.concat(deps.request.mock.calls.map(call => call[2]!))).toEqual(bytes);
  expect(deps.getFile).toHaveBeenCalledWith("saved");
  expect(await readFile(path)).toEqual(bytes);
});
it("queries acknowledged progress after an interrupted request before resending", async () => {
  const deps = dependencies();
  deps.request.mockRejectedValueOnce(new Error(`socket error ${session}`));
  deps.request.mockResolvedValueOnce(new Response(null, { status: 308, headers: { range: "bytes=0-262143" } }));
  await expect(uploadSingleSqlBackup(path, name, deps)).resolves.toEqual(metadata);
  expect(deps.request.mock.calls[1][1]["Content-Range"]).toBe(`bytes */${bytes.length}`);
  expect(deps.request.mock.calls[1][2]).toBeUndefined();
  expect(deps.request.mock.calls[2][1]["Content-Range"]).toBe(`bytes 262144-${bytes.length - 1}/${bytes.length}`);
});
it("recovers a completed upload when the last response was lost", async () => {
  const deps = dependencies();
  deps.request.mockRejectedValueOnce(new Error("connection lost"));
  await expect(uploadSingleSqlBackup(path, name, deps)).resolves.toEqual(metadata);
  expect(deps.request.mock.calls[1][2]).toBeUndefined();
});
it("reuses an existing verified identical backup without uploading again", async () => {
  const deps = dependencies();
  deps.findExisting.mockResolvedValue([metadata]);
  await expect(uploadSingleSqlBackup(path, name, deps)).resolves.toEqual(metadata);
  expect(deps.startUpload).not.toHaveBeenCalled();
});
it("rejects same-name conflicts without overwriting or deleting anything", async () => {
  const deps = dependencies();
  deps.findExisting.mockResolvedValue([{ ...metadata, md5Checksum: "wrong" }]);
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/conflict/i);
  expect(deps.startUpload).not.toHaveBeenCalled();
  expect(await readFile(path)).toEqual(bytes);
});
it.each(["size", "md5Checksum", "name", "trashed"])("rejects an unverified remote %s and retains local SQL", async field => {
  const deps = dependencies();
  deps.getFile.mockResolvedValue({ ...metadata, [field]: field === "trashed" ? true : "wrong" });
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/verification/i);
  expect(await readFile(path)).toEqual(bytes);
});
it.each([
  "https://www.googleapis.com.evil.example/upload/drive/v3/files?upload_id=x",
  "http://www.googleapis.com/upload/drive/v3/files?upload_id=x",
  "https://www.googleapis.com:8443/upload/drive/v3/files?upload_id=x",
  "https://www.googleapis.com/other?upload_id=x",
])("rejects an unsafe session destination without leaking it", async url => {
  const deps = dependencies();
  deps.startUpload.mockResolvedValue(url);
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow("Invalid Google Drive upload destination");
  expect(deps.request).not.toHaveBeenCalled();
});
it("bounds stalled progress retries and never exposes session URLs in errors", async () => {
  const deps = dependencies();
  deps.request.mockRejectedValue(new Error(`secret URL: ${session}`));
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/^Google Drive SQL upload did not complete after retries$/);
  expect(deps.request.mock.calls.length).toBeLessThanOrEqual(6);
});
it("rejects impossible or regressed acknowledgements", async () => {
  const deps = dependencies();
  deps.request.mockResolvedValueOnce(new Response(null, { status: 308, headers: { range: "bytes=0-999999" } }));
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/progress/i);
});
it("recovers from a temporary server failure using a status query", async () => {
  const deps = dependencies();
  deps.request.mockResolvedValueOnce(new Response(null, { status: 503 }));
  await expect(uploadSingleSqlBackup(path, name, deps)).resolves.toEqual(metadata);
  expect(deps.request.mock.calls[1][1]["Content-Range"]).toBe(`bytes */${bytes.length}`);
});
it("does not leak a session URL returned in a permanent error response", async () => {
  const deps = dependencies();
  deps.request.mockResolvedValueOnce(new Response(session, { status: 403 }));
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/^Google Drive SQL upload rejected \(HTTP 403\); local file retained$/);
});
it("never succeeds if the local source changes while it is being uploaded", async () => {
  const deps = dependencies();
  deps.request.mockImplementationOnce(async () => {
    await writeFile(path, Buffer.concat([bytes, Buffer.from("changed")]));
    return Response.json({ id: "saved" });
  });
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/changed during upload/i);
});
it("rejects missing acknowledgements after previously committed bytes", async () => {
  const deps = dependencies();
  deps.request.mockResolvedValueOnce(new Response(null, { status: 308, headers: { range: "bytes=0-262143" } }));
  deps.request.mockResolvedValueOnce(new Response(null, { status: 308 }));
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/progress/i);
});
it("does not create an empty SQL backup", async () => {
  const deps = dependencies();
  await writeFile(path, "");
  await expect(uploadSingleSqlBackup(path, name, deps)).rejects.toThrow(/non-empty/i);
  expect(deps.startUpload).not.toHaveBeenCalled();
});
it("routes scheduled plain SQL uploads to the single-file transport", async () => {
  const source = await readFile(new URL("./google-drive-backup.ts", import.meta.url), "utf8");
  expect(source).toMatch(/return uploadSingleSqlBackup\(filePath, fileName,/);
});
