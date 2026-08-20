import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";


/**
 * Test runner configuration.
 *
 * - `tests/unit`        pure functions, no IO (node env)
 * - `tests/integration` service layer with mocked transport/database (node env)
 * - `tests/dom`         browser-dependent helpers (per-file `@vitest-environment happy-dom`)
 * - `tests/e2e`         Playwright flows, run separately via `bun run test:e2e`
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    testTimeout: 15_000,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/services/**"],
    },
  },
});
