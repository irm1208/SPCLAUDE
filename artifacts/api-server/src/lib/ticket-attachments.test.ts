import { describe, expect, it } from "vitest";
import {
  canViewTicketAttachment,
  MAX_TICKET_IMAGE_BYTES,
  validateTicketImageBatch,
} from "./ticket-attachments";

const validImage = {
  size: 1024,
  reportedMimeType: "image/jpeg",
  detectedMimeType: "image/jpeg",
};

describe("validateTicketImageBatch", () => {
  it("allows five verified images at the per-file size limit", () => {
    const files = Array.from({ length: 5 }, () => ({
      ...validImage,
      size: MAX_TICKET_IMAGE_BYTES,
    }));

    expect(validateTicketImageBatch(files)).toBeNull();
  });

  it("rejects more than five files and images larger than 20 MiB", () => {
    expect(validateTicketImageBatch(Array.from({ length: 6 }, () => validImage)))
      .toMatch(/5 images/i);
    expect(validateTicketImageBatch([{
      ...validImage,
      size: MAX_TICKET_IMAGE_BYTES + 1,
    }])).toMatch(/20 MB/i);
  });

  it("rejects non-image, unknown, and MIME/signature-mismatched content", () => {
    expect(validateTicketImageBatch([{
      ...validImage,
      reportedMimeType: "image/svg+xml",
      detectedMimeType: "image/svg+xml",
    }])).toMatch(/supported image/i);
    expect(validateTicketImageBatch([{
      ...validImage,
      detectedMimeType: null,
    }])).toMatch(/verify|supported image/i);
    expect(validateTicketImageBatch([{
      ...validImage,
      detectedMimeType: "image/png",
    }])).toMatch(/match/i);
  });

  it("rejects empty images", () => {
    expect(validateTicketImageBatch([{ ...validImage, size: 0 }]))
      .toMatch(/empty/i);
  });
});

describe("canViewTicketAttachment", () => {
  const ticket = {
    accountUsername: "customer",
    groupBuyOrganiserUsername: "organiser-a",
  };

  it("allows only the customer owner, an admin, or the owning organiser", () => {
    expect(canViewTicketAttachment({ role: "customer", username: "customer" }, ticket)).toBe(true);
    expect(canViewTicketAttachment({ role: "admin" }, ticket)).toBe(true);
    expect(canViewTicketAttachment({ role: "organiser", username: "organiser-a" }, ticket)).toBe(true);
    expect(canViewTicketAttachment({ role: "customer", username: "other" }, ticket)).toBe(false);
    expect(canViewTicketAttachment({ role: "organiser", username: "organiser-b" }, ticket)).toBe(false);
  });
});