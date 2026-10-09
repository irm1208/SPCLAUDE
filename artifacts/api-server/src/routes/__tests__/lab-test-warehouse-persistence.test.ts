import { describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => ({
  selectedRows: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  extracted: null as Record<string, unknown> | null,
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const select = () => {
    const builder: Record<string, unknown> = {
      from() { return builder; },
      where() { return builder; },
      limit() { return builder; },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(mockState.selectedRows).then(resolve, reject);
      },
    };
    return builder;
  };
  const db = {
    select,
    insert: () => ({
      values(values: Record<string, unknown>) {
        mockState.inserts.push(values);
        return { returning: async () => [{ ...values, id: 42 }] };
      },
    }),
    update: () => ({
      set(values: Record<string, unknown>) {
        mockState.updates.push(values);
        const result = Promise.resolve([{ ...(mockState.selectedRows[0] ?? {}), ...values, id: 42 }]);
        return { where: () => Object.assign(result, { returning: () => result }) };
      },
    }),
  };
  return { ...schema, db, pool: {} };
});

vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (_req: unknown, _res: unknown) => true,
}));

vi.mock("../../lib/gemini-lab-extract", () => ({
  extractCoADataFromAnyUrl: vi.fn(),
  extractCoADataFromBuffer: vi.fn(async () => mockState.extracted),
  extractCoADataFromBuffers: vi.fn(),
  isAdminBulkImportUrl: vi.fn(),
  isBulkImportAllowedUrl: vi.fn(),
  resolvePreviewInfo: vi.fn(),
  downloadLabFile: vi.fn(),
  batchJob: {},
  resetBatchJob: vi.fn(),
  bulkImportJob: {},
  resetBulkImportJob: vi.fn(),
  isUzorakUrl: vi.fn(),
  resolveUzorakPreviewType: vi.fn(),
  resolveUzorakPreviewBytes: vi.fn(),
}));

vi.mock("../../lib/lab-cert-storage", () => ({
  prepareCertificateBase64: vi.fn(),
  prepareCertificateForStorage: vi.fn(),
}));

import labTestsRouter from "../lab-tests";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(labTestsRouter);
  return app;
}

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server: Server = await new Promise(resolve => {
    const value = buildApp().listen(0, () => resolve(value));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("lab-test warehouse persistence", () => {
  it("persists a derived US warehouse without altering the submitted batch code", async () => {
    mockState.selectedRows = [];
    mockState.inserts.length = 0;
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/lab-tests/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://example.test/coa/1",
          peptideName: "SS-31",
          batchCode: "US-SS50-0831",
        }),
      });
      expect(response.status).toBe(200);
      expect(mockState.inserts[0]).toMatchObject({
        batchCode: "US-SS50-0831",
        warehouse: "US",
      });
    });
  });

  it("derives UK on admin edits and clears warehouse when a batch code is unprefixed", async () => {
    mockState.selectedRows = [{
      id: 42,
      peptideName: "Semaglutide 10mg",
      supplier: "Uther",
      batchCode: "US-OZ10-0612",
    }];
    mockState.updates.length = 0;
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/lab-tests/42`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchCode: "UK-OZ10-0612" }),
      });
      expect(response.status).toBe(200);
      expect(mockState.updates[0]).toMatchObject({
        batchCode: "UK-OZ10-0612",
        warehouse: "UK",
      });
    });

    mockState.selectedRows = [{
      id: 42,
      peptideName: "SS-31 50mg",
      supplier: "Uther",
      batchCode: "UK-SS50-0831",
    }];
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/lab-tests/42`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchCode: "SS50-0831" }),
      });
      expect(response.status).toBe(200);
      expect(mockState.updates.at(-1)).toMatchObject({
        batchCode: "SS50-0831",
        warehouse: null,
      });
    });
  });

  it("derives warehouse again when an admin re-extract changes the batch code", async () => {
    mockState.selectedRows = [{
      id: 42,
      url: null,
      pdfBlob: Buffer.from("test").toString("base64"),
      supplier: "Uther",
      peptideName: "SS-31 50mg",
      batchCode: "US-SS50-0831",
    }];
    mockState.extracted = {
      batchCode: "UK-SS50-0831",
      compoundName: "SS-31 50mg",
      purityPct: null,
      mgAmount: null,
      massUnit: "mg",
      endotoxinEuMg: null,
      sterilityPass: null,
      heavyMetalAs: null,
      heavyMetalCd: null,
      heavyMetalPb: null,
      heavyMetalHg: null,
      testDate: null,
      testType: null,
      productCategory: null,
      blendComponents: null,
    };
    mockState.updates.length = 0;
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/lab-tests/42/extract`, {
        method: "POST",
      });
      expect(response.status).toBe(200);
      expect(mockState.updates[0]).toMatchObject({
        batchCode: "UK-SS50-0831",
        warehouse: "UK",
      });
    });
    mockState.extracted = null;
  });
});
