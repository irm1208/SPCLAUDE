import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTicketMessageFormData,
  MAX_TICKET_IMAGE_BYTES,
  validateTicketFiles,
} from "./TicketAttachments";

function ticketFile(size: number, type = "image/png"): File {
  const file = Object.create(File.prototype) as File;
  Object.defineProperties(file, {
    size: { value: size },
    type: { value: type },
    name: { value: "photo.png" },
  });
  return file;
}

describe("validateTicketFiles", () => {
  it("accepts five supported images at the 20 MB limit", () => {
    const files = Array.from({ length: 5 }, () => ticketFile(MAX_TICKET_IMAGE_BYTES));
    assert.equal(validateTicketFiles(files), null);
  });

  it("rejects excess files, oversize images, and unsupported MIME types", () => {
    assert.match(
      validateTicketFiles(Array.from({ length: 6 }, () => ticketFile(10))) ?? "",
      /5 images/i,
    );
    assert.match(validateTicketFiles([ticketFile(MAX_TICKET_IMAGE_BYTES + 1)]) ?? "", /20 MB/i);
    assert.match(validateTicketFiles([ticketFile(10, "image/svg+xml")]) ?? "", /supported image/i);
  });
});

describe("buildTicketMessageFormData", () => {
  it("preserves the selected text field and appends every image", () => {
    const first = new File(["one"], "one.png", { type: "image/png" });
    const second = new File(["two"], "two.jpg", { type: "image/jpeg" });

    for (const textField of ["body", "description", "message"] as const) {
      const form = buildTicketMessageFormData(textField, "ticket text", [first, second]);
      assert.equal(form.get(textField), "ticket text");
      assert.equal(form.getAll("files").length, 2);
      assert.equal(form.get("files"), first);
      assert.equal(form.get("description") === "ticket text", textField === "description");
    }
  });
});