import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // These three are node:test suites (run with `node --test`), not Vitest suites;
    // without this exclusion Vitest reports "No test suite found" for each of them.
    exclude: [
      "**/node_modules/**",
      "src/routes/reshipper-fulfilment-contract.test.ts",
      "src/routes/__tests__/organiser-fulfilment-routing-contract.test.ts",
      "src/lib/customer-refund-contract.test.ts",
    ],
    globals: false,
  },
});
