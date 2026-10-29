import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3211',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1512, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      process.env.E2E_PRODUCTION === 'true'
        ? 'DATA_PATH=.data/e2e-workspace.json AI_MODE=demo APP_PUBLIC=false APP_PASSWORD= SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= npx next start --hostname 127.0.0.1 --port 3211'
        : 'NEXT_DIST_DIR=.next-e2e DATA_PATH=.data/e2e-workspace.json AI_MODE=demo APP_PUBLIC=false APP_PASSWORD= SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= npx next dev --hostname 127.0.0.1 --port 3211',
    url: 'http://127.0.0.1:3211/api/status',
    reuseExistingServer: false,
    timeout: 90000,
  },
});
