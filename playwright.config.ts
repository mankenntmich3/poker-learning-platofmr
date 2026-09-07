import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1',
    url: 'http://localhost:3000/api/health',
    timeout: 120_000,
    reuseExistingServer: false,
    // An existing app or an inherited deployment database must never receive test users.
    env: { APP_ORIGIN: 'http://localhost:3000', ALLOW_LOCAL_DB: '1', DATA_DIR: '.data/e2e-postgres', DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
  },
});
