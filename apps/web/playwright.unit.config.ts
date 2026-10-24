import { defineConfig } from "@playwright/test"

/**
 * Unit tests for pure functions in src (spec/development.md#Web Unit Tests).
 * No web server, API, or browser is started.
 */
export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
})
