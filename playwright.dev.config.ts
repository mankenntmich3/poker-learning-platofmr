import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/development',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/development', open: 'never' }]],
  use: { baseURL: 'http://localhost:3100', actionTimeout: 20_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'development-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm db:setup && pnpm db:migrate && pnpm db:seed && pnpm dev --port 3100',
    url: 'http://localhost:3100/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NODE_ENV: 'development', APP_ORIGIN: 'http://127.0.0.1:3100', DATABASE_URL: '', DATA_DIR: '.data/dev-e2e-postgres' },
  },
});
