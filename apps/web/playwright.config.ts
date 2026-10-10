import { defineConfig, devices } from "@playwright/test"

/**
 * E2E tests run the real stack: Next.js (API mode) → Go API → MySQL
 * (spec/development.md#E2E Tests).
 *
 * The API runs on its own port against a dedicated database (`adadd_e2e` by
 * default), so a local development API on :8080 is never touched. Before the
 * API starts, the development seed (apps/api/cmd/seed) loads Users, Years,
 * and Sponsorship Menus. Tests create their own companies with unique names,
 * so they do not depend on a fresh database.
 */

const apiPort = process.env.E2E_API_PORT ?? "18080"
const webPort = process.env.E2E_WEB_PORT ?? "3100"
const apiBaseUrl = `http://127.0.0.1:${apiPort}`
const webBaseUrl = `http://127.0.0.1:${webPort}`

const apiEnvironment = {
  APP_ENV: "development",
  APP_PORT: apiPort,
  DB_HOST: process.env.E2E_DB_HOST ?? "127.0.0.1",
  DB_PORT: process.env.E2E_DB_PORT ?? "3306",
  DB_USER: process.env.E2E_DB_USER ?? "adadd",
  DB_PASSWORD: process.env.E2E_DB_PASSWORD ?? "adadd_password",
  DB_NAME: process.env.E2E_DB_NAME ?? "adadd_e2e",
  DEV_AUTH_ENABLED: "true",
  MIGRATE_ON_START: "true",
  MIGRATIONS_PATH: "./migrations",
  // Set explicitly so a local apps/api/.env can never enable Slack mentions.
  SLACK_BOT_TOKEN: "",
  SLACK_CHANNEL_ID: "",
  GOOGLE_CLIENT_ID: "",
}

const webEnvironment = {
  NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  NEXT_PUBLIC_DEV_AUTH_ENABLED: "true",
}

export default defineConfig({
  testDir: "./e2e",
  // Tests share one database and the active Year, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: webBaseUrl,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "go run ./cmd/seed && go run ./cmd/server",
      cwd: "../api",
      url: `${apiBaseUrl}/health`,
      env: apiEnvironment,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npm run start -- -p ${webPort}`,
      url: webBaseUrl,
      env: webEnvironment,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
