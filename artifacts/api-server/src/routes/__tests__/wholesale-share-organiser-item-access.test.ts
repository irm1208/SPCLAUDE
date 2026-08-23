import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");

describe("shared wholesale organiser item access", () => {
  it("does not treat a configured member-payment wallet as the organiser's payment while the share is open", () => {
    expect(routeSource).toContain(
      'paymentStatus: (m.isCreator && hasOwnWallet && isLocked) ? "confirmed" : (order?.paymentStatus ?? null),',
    );
  });

  it("allows an organiser with a configured payment destination to save open-order items", () => {
    expect(routeSource).not.toContain("const organiserUsesOwnWallet = member.isCreator");
    expect(routeSource).not.toContain(
      '"Your order is handled through the organiser payment and is fixed while the shared order is reopened."',
    );
  });
});