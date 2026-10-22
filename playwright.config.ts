import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const DB = path.resolve(__dirname, ".data", "e2e.json");

/**
 * Smoke tests run against the two production builds in demo mode.
 * Build first (`pnpm build`); the servers below start themselves.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { trace: "retain-on-failure" },
  projects: [{ name: "mobile-customer", use: { ...devices["Pixel 7"], channel: "chrome", baseURL: "http://localhost:3000" } }],
  webServer: [
    { command: "pnpm --filter @blip/customer start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000, env: { DEMO_DB_PATH: DB, ALLOW_DEMO: "1" } },
    { command: "pnpm --filter @blip/admin start", url: "http://localhost:3001/login", reuseExistingServer: true, timeout: 120_000, env: { DEMO_DB_PATH: DB, ALLOW_DEMO: "1" } },
  ],
});
