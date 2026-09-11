import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vial Shop seller details", () => {
  it("renders the selected seller panel inline with the selected row", () => {
    const source = readFileSync(new URL("./VialShopTab.tsx", import.meta.url), "utf8");
    const sellersList = source.slice(
      source.indexOf('{sellers.map(s => ('),
      source.indexOf("{sellers.length === 0"),
    );

    expect(sellersList).toContain("selectedId === s.id &&");
    expect(sellersList).toContain("<SellerDetailPanel");
  });

  it("includes the admin seller password form contract", () => {
    const source = readFileSync(new URL("./VialShopTab.tsx", import.meta.url), "utf8");

    expect(source).toContain("Set new password");
    expect(source).toContain('type="password"');
    expect(source).toContain('autoComplete="new-password"');
    expect(source).toContain('minLength={8}');
    expect(source).toContain("/admin/vial/sellers/${sellerId}/password");
    expect(source).toContain('method: "PUT"');
    expect(source).toContain('"x-admin-secret": secret');
    expect(source).toContain("JSON.stringify({ newPassword: passwordNew })");
    expect(source).toContain('useEffect(() => {');
    expect(source).toContain('setPasswordNew("");');
    expect(source).toContain('}, [seller.id]);');
    expect(source).toContain('passwordAbortRef.current = null;\n    setPasswordSaving(false);');
    expect(source).toContain('disabled={passwordSaving}');
    expect(source).toContain('id="seller-password-new"');
    expect(source).toContain('htmlFor="seller-password-new"');
    expect(source).toContain('id="seller-password-confirm"');
    expect(source).toContain('htmlFor="seller-password-confirm"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('Password must be at least 8 characters.');
    expect(source).toContain('Failed to update seller password — please try again.');
    expect(source).toContain('res.status === 400');
    expect(source).toContain('const sellerId = seller.id;');
    expect(source).toContain('new AbortController()');
    expect(source).toContain('signal: passwordAbortController.signal');
    expect(source).toContain('AbortError');
    expect(source).toContain('passwordAbortRef.current !== passwordAbortController');
    expect(source).toContain('if (passwordAbortRef.current === passwordAbortController) {\n        passwordAbortRef.current = null;\n        setPasswordSaving(false);');
  });
});