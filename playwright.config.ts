import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const isCi = !!process.env.CI;
const baseURL = process.env.BASE_URL ?? 'https://automationintesting.online';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,

  reporter: isCi
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never' }],
      ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/api/**'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/api/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/api/**'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: ['**/api/**', '**/visual/**'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testIgnore: ['**/api/**', '**/visual/**'],
    },
    {
      // pure API tests, no browser
      name: 'api',
      testMatch: ['**/api/**/*.spec.ts', '**/regression/api/**/*.spec.ts'],
      use: {
        baseURL,
      },
    },
  ],
});