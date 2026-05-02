import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '.env.test') });

export const AUTH_STATE = path.resolve(__dirname, 'playwright/.auth/owner.json');

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,   // tests share real DB state — run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-PR',
  },

  globalSetup:    './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE,
        viewport: { width: 1440, height: 900 },
      },
      dependencies: ['setup'],
    },
  ],
});
