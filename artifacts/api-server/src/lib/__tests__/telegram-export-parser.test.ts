import { describe, expect, it } from "vitest";
import { formatTelegramExportForAi } from "../telegram-export-parser";

describe("Telegram export formatting for bulk tracking", () => {
  it("turns timestamped messages into ordered, labelled blocks", () => {
    const input = [
      "[25/08/2026 05:14] - TRACK-ONE",
      "Recipient: Example Person",
      "Example Street",
      "[25/08/2026 05:16] - TRACK-TWO",
      "The second tracking number is at the top of this message.",
    ].join("\n");

    const formatted = formatTelegramExportForAi(input);

    expect(formatted).toContain("Telegram message 1 [25/08/2026 05:14]");
    expect(formatted).toContain("Telegram message 2 [25/08/2026 05:16]");
    expect(formatted.indexOf("TRACK-ONE")).toBeLessThan(formatted.indexOf("TRACK-TWO"));
    expect(formatted).toContain("Every timestamped block is one Telegram message");
  });

  it("recognises Telegram exports that include a sender after the timestamp", () => {
    const input = [
      "[25/08/2026 05:09] Vendor: TRACK-ONE",
      "Recipient: Example Person",
      "[25/08/2026 05:10] Vendor: TRACK-TWO",
      "Recipient: Another Example",
    ].join("\n");

    const formatted = formatTelegramExportForAi(input);

    expect(formatted).toContain("Telegram message 1 [25/08/2026 05:09]");
    expect(formatted).toContain("Telegram message 2 [25/08/2026 05:10]");
    expect(formatted).not.toContain("Vendor:");
  });
});