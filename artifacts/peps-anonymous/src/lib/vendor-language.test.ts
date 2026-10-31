import { afterEach, expect, it } from "vitest";
import { getVendorLanguage, setVendorLanguage, vendorTranslate } from "./vendor-language";
afterEach(() => setVendorLanguage("en"));
it("switches UI labels while retaining unrecognised product and customer data", () => {
  setVendorLanguage("zh");
  expect(getVendorLanguage()).toBe("zh");
  expect(vendorTranslate("Orders")).toBe("订单");
  expect(vendorTranslate("RT10")).toBe("RT10");
  expect(vendorTranslate("Benjamin Bateman")).toBe("Benjamin Bateman");
  expect(vendorTranslate("Export 3 selected")).toBe("导出已选的 3 个订单");
  expect(vendorTranslate("Orders", "en")).toBe("Orders");
  setVendorLanguage("en");
  expect(vendorTranslate("Orders")).toBe("Orders");
});
